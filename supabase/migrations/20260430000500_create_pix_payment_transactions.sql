create table if not exists public.pix_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid references public.bots(id) on delete set null,
  flow_id uuid references public.flows(id) on delete set null,
  lead_id uuid references public.telegram_leads(id) on delete set null,
  node_id text not null,
  node_type text not null default 'PX',
  provider text not null check (provider in ('mercado_pago', 'pushinpay', 'syncpay')),
  provider_payment_id text,
  external_reference text not null unique,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'canceled', 'failed')),
  provider_status text,
  pix_code text,
  qr_code_base64 text,
  ticket_url text,
  plan_name text,
  telegram_chat_id text,
  expires_at timestamptz,
  paid_at timestamptz,
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pix_payment_transactions_owner_idx
  on public.pix_payment_transactions(owner_id);

create index if not exists pix_payment_transactions_provider_payment_idx
  on public.pix_payment_transactions(provider, provider_payment_id);

create index if not exists pix_payment_transactions_flow_idx
  on public.pix_payment_transactions(flow_id);

create index if not exists pix_payment_transactions_lead_idx
  on public.pix_payment_transactions(lead_id);

create index if not exists pix_payment_transactions_pending_expiry_idx
  on public.pix_payment_transactions(expires_at)
  where status = 'pending';

drop trigger if exists pix_payment_transactions_set_updated_at
  on public.pix_payment_transactions;
create trigger pix_payment_transactions_set_updated_at
before update on public.pix_payment_transactions
for each row
execute function public.set_updated_at();

alter table public.pix_payment_transactions enable row level security;

drop policy if exists "pix_payment_transactions_select_own" on public.pix_payment_transactions;
create policy "pix_payment_transactions_select_own"
on public.pix_payment_transactions
for select
to authenticated
using (owner_id = auth.uid());

grant select on public.pix_payment_transactions to authenticated;
grant select, insert, update, delete on public.pix_payment_transactions to service_role;

-- Escrita fica apenas no backend com service role. Credenciais nunca sao salvas aqui.
