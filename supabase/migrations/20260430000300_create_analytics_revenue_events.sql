create extension if not exists pgcrypto;

alter table public.lead_flow_events
  drop constraint if exists lead_flow_events_event_type_check;

alter table public.lead_flow_events
  add constraint lead_flow_events_event_type_check
  check (
    event_type in (
      'start',
      'node_enter',
      'node_success',
      'node_error',
      'payment',
      'payment_generated',
      'payment_confirmed',
      'blocked',
      'message',
      'handoff'
    )
  );

alter table public.telegram_leads
  add column if not exists source text;

alter table public.telegram_leads
  add column if not exists campaign text;

alter table public.telegram_leads
  add column if not exists utm_source text;

alter table public.telegram_leads
  add column if not exists utm_medium text;

alter table public.telegram_leads
  add column if not exists utm_campaign text;

alter table public.telegram_leads
  add column if not exists utm_content text;

alter table public.telegram_leads
  add column if not exists utm_term text;

alter table public.telegram_leads
  add column if not exists device_type text;

alter table public.telegram_leads
  add column if not exists country text;

alter table public.telegram_leads
  add column if not exists region text;

alter table public.telegram_leads
  add column if not exists city text;

create table if not exists public.analytics_revenue_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid references public.bots(id) on delete set null,
  flow_id uuid references public.flows(id) on delete set null,
  lead_id uuid references public.telegram_leads(id) on delete set null,
  event_type text not null check (
    event_type in (
      'payment_generated',
      'payment_confirmed',
      'refund',
      'upsell',
      'downsell',
      'order_bump',
      'recovery'
    )
  ),
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null default 'BRL',
  gateway text,
  plan_name text,
  sales_code text,
  source text,
  campaign text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists analytics_revenue_events_owner_time_idx
  on public.analytics_revenue_events(owner_id, occurred_at desc);

create index if not exists analytics_revenue_events_owner_bot_idx
  on public.analytics_revenue_events(owner_id, bot_id, occurred_at desc);

create index if not exists analytics_revenue_events_owner_flow_idx
  on public.analytics_revenue_events(owner_id, flow_id, occurred_at desc);

create index if not exists analytics_revenue_events_owner_type_idx
  on public.analytics_revenue_events(owner_id, event_type, occurred_at desc);

create index if not exists telegram_leads_owner_source_idx
  on public.telegram_leads(owner_id, source);

create index if not exists telegram_leads_owner_campaign_idx
  on public.telegram_leads(owner_id, campaign);

alter table public.analytics_revenue_events enable row level security;

drop policy if exists "analytics_revenue_events_select_own" on public.analytics_revenue_events;
create policy "analytics_revenue_events_select_own"
on public.analytics_revenue_events
for select
to authenticated
using (owner_id = auth.uid());

-- Writes are intentionally server-side only through Supabase service role.
