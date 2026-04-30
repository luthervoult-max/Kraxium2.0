create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role text default 'user',
  created_at timestamptz default now()
);

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  telegram_token text,
  webhook_url text,
  webhook_enabled boolean default false,
  notifications_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bot_id uuid references public.bots(id) on delete set null,
  name text not null default 'Sem nome',
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  status text not null default 'active' check (status in ('active', 'paused', 'draft'))
);

create index if not exists bots_owner_idx
  on public.bots(owner_id);

create index if not exists flows_owner_status_idx
  on public.flows(owner_id, status);

create index if not exists flows_owner_updated_idx
  on public.flows(owner_id, updated_at desc);

create unique index if not exists flows_one_active_per_bot_idx
  on public.flows(bot_id)
  where bot_id is not null and status = 'active';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bots_set_updated_at on public.bots;
create trigger bots_set_updated_at
before update on public.bots
for each row
execute function public.set_updated_at();

drop trigger if exists flows_set_updated_at on public.flows;
create trigger flows_set_updated_at
before update on public.flows
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, email, full_name, avatar_url)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name'),
  raw_user_meta_data->>'avatar_url'
from auth.users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.flows enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "bots_select_own" on public.bots;
create policy "bots_select_own"
on public.bots
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "bots_insert_own" on public.bots;
create policy "bots_insert_own"
on public.bots
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "bots_update_own" on public.bots;
create policy "bots_update_own"
on public.bots
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "bots_delete_own" on public.bots;
create policy "bots_delete_own"
on public.bots
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "flows_select_own" on public.flows;
create policy "flows_select_own"
on public.flows
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "flows_insert_own" on public.flows;
create policy "flows_insert_own"
on public.flows
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "flows_update_own" on public.flows;
create policy "flows_update_own"
on public.flows
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "flows_delete_own" on public.flows;
create policy "flows_delete_own"
on public.flows
for delete
to authenticated
using (owner_id = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.bots to authenticated;
grant select, insert, update, delete on public.flows to authenticated;
