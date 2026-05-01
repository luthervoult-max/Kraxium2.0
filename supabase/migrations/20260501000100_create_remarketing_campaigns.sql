create extension if not exists pgcrypto;

create table if not exists public.remarketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  flow_id uuid references public.flows(id) on delete set null,
  name text not null,
  message text not null,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'ready', 'sending', 'sent', 'paused', 'failed')),
  audience_count integer not null default 0 check (audience_count >= 0),
  sent_count integer not null default 0 check (sent_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  last_prepared_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.remarketing_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.remarketing_campaigns(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid not null references public.telegram_leads(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  flow_id uuid references public.flows(id) on delete set null,
  telegram_chat_id text not null,
  rendered_message text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, lead_id)
);

create index if not exists remarketing_campaigns_owner_updated_idx
  on public.remarketing_campaigns(owner_id, updated_at desc);

create index if not exists remarketing_campaigns_owner_status_idx
  on public.remarketing_campaigns(owner_id, status);

create index if not exists remarketing_campaign_recipients_campaign_status_idx
  on public.remarketing_campaign_recipients(campaign_id, status);

create index if not exists remarketing_campaign_recipients_owner_lead_idx
  on public.remarketing_campaign_recipients(owner_id, lead_id);

create or replace function public.set_remarketing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists remarketing_campaigns_set_updated_at on public.remarketing_campaigns;
create trigger remarketing_campaigns_set_updated_at
before update on public.remarketing_campaigns
for each row
execute function public.set_remarketing_updated_at();

drop trigger if exists remarketing_campaign_recipients_set_updated_at on public.remarketing_campaign_recipients;
create trigger remarketing_campaign_recipients_set_updated_at
before update on public.remarketing_campaign_recipients
for each row
execute function public.set_remarketing_updated_at();

alter table public.remarketing_campaigns enable row level security;
alter table public.remarketing_campaign_recipients enable row level security;

drop policy if exists "remarketing_campaigns_select_own" on public.remarketing_campaigns;
create policy "remarketing_campaigns_select_own"
on public.remarketing_campaigns
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "remarketing_campaign_recipients_select_own" on public.remarketing_campaign_recipients;
create policy "remarketing_campaign_recipients_select_own"
on public.remarketing_campaign_recipients
for select
to authenticated
using (owner_id = auth.uid());

grant select on public.remarketing_campaigns to authenticated;
grant select on public.remarketing_campaign_recipients to authenticated;

-- Writes and Telegram sends are intentionally server-side only through Supabase service role functions.
