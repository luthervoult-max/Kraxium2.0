create extension if not exists pgcrypto;

create table if not exists public.payment_gateway_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('mercado_pago', 'stripe', 'pushinpay', 'syncpay')),
  status text not null default 'connected' check (status in ('connected', 'pending_oauth', 'error')),
  scope text not null default 'global' check (scope in ('global', 'specific')),
  flow_ids uuid[] not null default '{}'::uuid[],
  public_config jsonb not null default '{}'::jsonb,
  credentials_encrypted text,
  credentials_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, provider)
);

create index if not exists payment_gateway_connections_owner_idx
  on public.payment_gateway_connections(owner_id);

drop trigger if exists payment_gateway_connections_set_updated_at
  on public.payment_gateway_connections;
create trigger payment_gateway_connections_set_updated_at
before update on public.payment_gateway_connections
for each row
execute function public.set_updated_at();

alter table public.payment_gateway_connections enable row level security;

drop policy if exists "payment_gateway_connections_select_own" on public.payment_gateway_connections;
create policy "payment_gateway_connections_select_own"
on public.payment_gateway_connections
for select
to authenticated
using (owner_id = auth.uid());

-- Writes are intentionally server-side only through Supabase service role.
