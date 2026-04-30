create extension if not exists pgcrypto;

alter table public.bots
  add column if not exists telegram_bot_id text;

alter table public.bots
  add column if not exists telegram_username text;

alter table public.bots
  add column if not exists telegram_first_name text;

alter table public.bots
  add column if not exists telegram_can_join_groups boolean;

alter table public.bots
  add column if not exists telegram_can_read_all_group_messages boolean;

alter table public.bots
  add column if not exists telegram_supports_inline_queries boolean;

alter table public.bots
  add column if not exists connection_status text not null default 'inactive';

alter table public.bots
  add column if not exists connected_at timestamptz;

alter table public.bots
  add column if not exists last_update_at timestamptz;

alter table public.bots
  add column if not exists webhook_last_error text;

alter table public.bots
  drop constraint if exists bots_connection_status_check;

alter table public.bots
  add constraint bots_connection_status_check
  check (connection_status in ('active', 'inactive', 'error'));

drop index if exists public.bots_owner_telegram_bot_id_idx;

alter table public.bots
  drop constraint if exists bots_owner_telegram_bot_id_unique;

alter table public.bots
  add constraint bots_owner_telegram_bot_id_unique
  unique (owner_id, telegram_bot_id);

create table if not exists public.bot_secrets (
  bot_id uuid primary key references public.bots(id) on delete cascade,
  telegram_token text not null,
  webhook_secret text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.bot_secrets (bot_id, telegram_token, webhook_secret)
select
  id,
  telegram_token,
  encode(gen_random_bytes(24), 'hex')
from public.bots
where telegram_token is not null
  and telegram_token <> ''
on conflict (bot_id) do nothing;

update public.bots
set telegram_token = null
where telegram_token is not null;

create or replace function public.set_bot_secrets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bot_secrets_set_updated_at on public.bot_secrets;
create trigger bot_secrets_set_updated_at
before update on public.bot_secrets
for each row
execute function public.set_bot_secrets_updated_at();

alter table public.bot_secrets enable row level security;

-- Intentionally no browser RLS policies: only Supabase service role functions can read/write bot secrets.
