create table if not exists public.mailing_link_clicks (
  token text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id uuid not null references public.mailing_campaigns(id) on delete cascade,
  recipient_id uuid not null references public.mailing_recipients(id) on delete cascade,
  button_index smallint not null check (button_index >= 0),
  label text not null,
  destination_url text not null,
  click_count integer not null default 0 check (click_count >= 0),
  last_clicked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mailing_link_clicks_campaign_idx
  on public.mailing_link_clicks(campaign_id);

create index if not exists mailing_link_clicks_recipient_idx
  on public.mailing_link_clicks(recipient_id);

alter table public.mailing_link_clicks enable row level security;

drop policy if exists "mailing_link_clicks_select_own" on public.mailing_link_clicks;
create policy "mailing_link_clicks_select_own"
on public.mailing_link_clicks
for select
to authenticated
using (owner_id = auth.uid());

grant select on public.mailing_link_clicks to authenticated;
grant select, insert, update, delete on public.mailing_link_clicks to service_role;
