create extension if not exists pgcrypto;

create table if not exists public.webhook_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'pix_generation_error',
      'gateway_pix_unstable',
      'bot_start_error',
      'bot_unstable',
      'transaction_generated',
      'transaction_approved'
    )
  ),
  target_url text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'error')),
  provider_hint text not null default 'generic',
  last_sent_at timestamptz,
  last_status_code integer,
  last_error text,
  failure_count integer not null default 0 check (failure_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, event_type)
);

create table if not exists public.webhook_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subscription_id uuid not null references public.webhook_subscriptions(id) on delete cascade,
  event_type text not null,
  dedupe_key text,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('success', 'failed', 'skipped')),
  status_code integer,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists webhook_subscriptions_owner_idx
  on public.webhook_subscriptions(owner_id);

create index if not exists webhook_subscriptions_owner_status_idx
  on public.webhook_subscriptions(owner_id, status);

create index if not exists webhook_delivery_logs_owner_created_idx
  on public.webhook_delivery_logs(owner_id, created_at desc);

create index if not exists webhook_delivery_logs_subscription_created_idx
  on public.webhook_delivery_logs(subscription_id, created_at desc);

create unique index if not exists webhook_delivery_logs_subscription_dedupe_idx
  on public.webhook_delivery_logs(subscription_id, event_type, dedupe_key)
  where dedupe_key is not null and status = 'success';

drop trigger if exists webhook_subscriptions_set_updated_at
  on public.webhook_subscriptions;
create trigger webhook_subscriptions_set_updated_at
before update on public.webhook_subscriptions
for each row
execute function public.set_updated_at();

alter table public.webhook_subscriptions enable row level security;
alter table public.webhook_delivery_logs enable row level security;

drop policy if exists "webhook_subscriptions_select_own" on public.webhook_subscriptions;
create policy "webhook_subscriptions_select_own"
on public.webhook_subscriptions
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "webhook_delivery_logs_select_own" on public.webhook_delivery_logs;
create policy "webhook_delivery_logs_select_own"
on public.webhook_delivery_logs
for select
to authenticated
using (owner_id = auth.uid());

grant select on public.webhook_subscriptions to authenticated;
grant select on public.webhook_delivery_logs to authenticated;
grant select, insert, update, delete on public.webhook_subscriptions to service_role;
grant select, insert, update, delete on public.webhook_delivery_logs to service_role;

-- Escrita fica apenas pelo backend com service role. URLs podem conter tokens do app externo.
