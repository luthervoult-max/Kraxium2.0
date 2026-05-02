create extension if not exists pgcrypto;

create table if not exists public.mailing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  name text not null,
  message text not null,
  recipient_group text not null default 'all' check (
    recipient_group in (
      'all',
      'vip',
      'new',
      'expired',
      'pending',
      'downsell',
      'upsell',
      'mailing',
      'recurring',
      'packages',
      'tg_premium',
      'order_bump'
    )
  ),
  filters jsonb not null default '{}'::jsonb,
  button_config jsonb not null default '[]'::jsonb,
  media_path text,
  media_mime text,
  media_name text,
  audio_path text,
  audio_mime text,
  audio_name text,
  schedule_enabled boolean not null default false,
  scheduled_at timestamptz,
  recurrence_enabled boolean not null default false,
  recurrence_interval_hours integer not null default 0 check (recurrence_interval_hours >= 0),
  status text not null default 'draft' check (
    status in ('draft', 'ready', 'scheduled', 'sending', 'sent', 'paused', 'failed', 'canceled')
  ),
  audience_count integer not null default 0 check (audience_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mailing_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.mailing_campaigns(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed', 'canceled')),
  audience_count integer not null default 0 check (audience_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mailing_recipients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.mailing_campaigns(id) on delete cascade,
  run_id uuid not null references public.mailing_runs(id) on delete cascade,
  lead_id uuid not null references public.telegram_leads(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  telegram_chat_id text not null,
  rendered_message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, lead_id)
);

create index if not exists mailing_campaigns_owner_updated_idx
  on public.mailing_campaigns(owner_id, updated_at desc);

create index if not exists mailing_campaigns_owner_bot_status_idx
  on public.mailing_campaigns(owner_id, bot_id, status);

create index if not exists mailing_campaigns_dispatch_idx
  on public.mailing_campaigns(status, next_run_at)
  where status in ('scheduled', 'sending');

create index if not exists mailing_runs_owner_campaign_idx
  on public.mailing_runs(owner_id, campaign_id, created_at desc);

create index if not exists mailing_runs_owner_bot_created_idx
  on public.mailing_runs(owner_id, bot_id, created_at desc);

create index if not exists mailing_recipients_owner_campaign_idx
  on public.mailing_recipients(owner_id, campaign_id);

create index if not exists mailing_recipients_run_status_idx
  on public.mailing_recipients(run_id, status);

drop trigger if exists mailing_campaigns_set_updated_at on public.mailing_campaigns;
create trigger mailing_campaigns_set_updated_at
before update on public.mailing_campaigns
for each row
execute function public.set_updated_at();

drop trigger if exists mailing_runs_set_updated_at on public.mailing_runs;
create trigger mailing_runs_set_updated_at
before update on public.mailing_runs
for each row
execute function public.set_updated_at();

drop trigger if exists mailing_recipients_set_updated_at on public.mailing_recipients;
create trigger mailing_recipients_set_updated_at
before update on public.mailing_recipients
for each row
execute function public.set_updated_at();

alter table public.mailing_campaigns enable row level security;
alter table public.mailing_runs enable row level security;
alter table public.mailing_recipients enable row level security;

drop policy if exists "mailing_campaigns_select_own" on public.mailing_campaigns;
create policy "mailing_campaigns_select_own"
on public.mailing_campaigns
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "mailing_runs_select_own" on public.mailing_runs;
create policy "mailing_runs_select_own"
on public.mailing_runs
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "mailing_recipients_select_own" on public.mailing_recipients;
create policy "mailing_recipients_select_own"
on public.mailing_recipients
for select
to authenticated
using (owner_id = auth.uid());

grant select on public.mailing_campaigns to authenticated;
grant select on public.mailing_runs to authenticated;
grant select on public.mailing_recipients to authenticated;

grant select, insert, update, delete on public.mailing_campaigns to service_role;
grant select, insert, update, delete on public.mailing_runs to service_role;
grant select, insert, update, delete on public.mailing_recipients to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mailing-assets',
  'mailing-assets',
  false,
  26214400,
  array['image/png', 'image/jpeg', 'video/mp4', 'audio/ogg']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "mailing_assets_select_own" on storage.objects;
create policy "mailing_assets_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'mailing-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "mailing_assets_insert_own" on storage.objects;
create policy "mailing_assets_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'mailing-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "mailing_assets_update_own" on storage.objects;
create policy "mailing_assets_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'mailing-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'mailing-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "mailing_assets_delete_own" on storage.objects;
create policy "mailing_assets_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'mailing-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
