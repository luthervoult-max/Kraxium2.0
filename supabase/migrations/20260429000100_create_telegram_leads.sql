create extension if not exists pgcrypto;

create table if not exists public.telegram_leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  flow_id uuid references public.flows(id) on delete set null,
  telegram_user_id text not null,
  telegram_chat_id text,
  display_name text,
  first_name text,
  last_name text,
  username text,
  phone text,
  email text,
  sales_code text,
  plan_name text,
  status text not null default 'novo' check (status in ('novo', 'pendente', 'pago', 'bloqueado')),
  start_count integer not null default 0 check (start_count >= 0),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_node_id text,
  last_node_label text,
  last_node_type text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, bot_id, telegram_user_id)
);

create table if not exists public.lead_flow_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  lead_id uuid not null references public.telegram_leads(id) on delete cascade,
  bot_id uuid not null references public.bots(id) on delete cascade,
  flow_id uuid references public.flows(id) on delete set null,
  event_type text not null check (
    event_type in ('start', 'node_enter', 'node_success', 'node_error', 'payment', 'payment_generated', 'payment_confirmed', 'blocked', 'message', 'handoff')
  ),
  node_id text,
  node_label text,
  node_type text,
  status text check (status is null or status in ('success', 'error', 'skipped', 'pending')),
  message text,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists telegram_leads_owner_last_seen_idx
  on public.telegram_leads(owner_id, last_seen_at desc);

create index if not exists telegram_leads_owner_status_idx
  on public.telegram_leads(owner_id, status);

create index if not exists telegram_leads_owner_bot_idx
  on public.telegram_leads(owner_id, bot_id);

create index if not exists telegram_leads_owner_flow_idx
  on public.telegram_leads(owner_id, flow_id);

create index if not exists telegram_leads_owner_search_idx
  on public.telegram_leads(owner_id, telegram_user_id, telegram_chat_id, username);

create index if not exists lead_flow_events_lead_time_idx
  on public.lead_flow_events(lead_id, occurred_at desc);

create index if not exists lead_flow_events_owner_bot_time_idx
  on public.lead_flow_events(owner_id, bot_id, occurred_at desc);

create or replace function public.set_telegram_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists telegram_leads_set_updated_at on public.telegram_leads;
create trigger telegram_leads_set_updated_at
before update on public.telegram_leads
for each row
execute function public.set_telegram_leads_updated_at();

alter table public.telegram_leads enable row level security;
alter table public.lead_flow_events enable row level security;

drop policy if exists "telegram_leads_select_own" on public.telegram_leads;
create policy "telegram_leads_select_own"
on public.telegram_leads
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "lead_flow_events_select_own" on public.lead_flow_events;
create policy "lead_flow_events_select_own"
on public.lead_flow_events
for select
to authenticated
using (owner_id = auth.uid());

-- Writes are intentionally not opened to the browser client.
-- The Telegram bot backend should write with the Supabase service role key.
