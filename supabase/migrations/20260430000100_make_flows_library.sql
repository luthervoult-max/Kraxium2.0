alter table public.flows
  add column if not exists created_at timestamptz not null default now();

alter table public.flows
  add column if not exists status text not null default 'active';

alter table public.flows
  alter column bot_id drop not null;

alter table public.flows
  drop constraint if exists flows_bot_id_fkey;

alter table public.flows
  add constraint flows_bot_id_fkey
  foreign key (bot_id)
  references public.bots(id)
  on delete set null;

alter table public.flows
  drop constraint if exists flows_status_check;

alter table public.flows
  add constraint flows_status_check
  check (status in ('active', 'paused', 'draft'));

alter table public.flows
  drop constraint if exists flows_bot_id_key;

drop index if exists public.flows_bot_id_key;
drop index if exists public.flows_one_active_per_bot_idx;

update public.flows
set status = 'active'
where status is null;

create unique index flows_one_active_per_bot_idx
  on public.flows(bot_id)
  where bot_id is not null and status = 'active';

create index if not exists flows_owner_status_idx
  on public.flows(owner_id, status);

create index if not exists flows_owner_updated_idx
  on public.flows(owner_id, updated_at desc);

create or replace function public.set_flows_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists flows_set_updated_at on public.flows;
create trigger flows_set_updated_at
before update on public.flows
for each row
execute function public.set_flows_updated_at();

alter table public.flows enable row level security;

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
