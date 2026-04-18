-- Marketplace buyer network baseline seed

-- Safety bootstrap: this seed can run on environments that have not yet applied
-- the marketplace CRM migration. Definitions are aligned with migration 000009.
create extension if not exists pgcrypto;

create table if not exists public.marketplace_buyer_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  company_name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  deal_types text[] not null default '{}',
  financing_types text[] not null default '{}',
  buy_box_min numeric(12,2),
  buy_box_max numeric(12,2),
  max_days_on_market integer,
  monthly_capacity integer,
  close_time_days integer,
  notes text,
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_buyer_buybox_min_chk check (buy_box_min is null or buy_box_min >= 0),
  constraint marketplace_buyer_buybox_max_chk check (buy_box_max is null or buy_box_max >= 0),
  constraint marketplace_buyer_buybox_pair_chk check (buy_box_min is null or buy_box_max is null or buy_box_max >= buy_box_min),
  constraint marketplace_buyer_dom_chk check (max_days_on_market is null or max_days_on_market >= 0),
  constraint marketplace_buyer_capacity_chk check (monthly_capacity is null or monthly_capacity >= 0),
  constraint marketplace_buyer_close_time_chk check (close_time_days is null or close_time_days >= 0)
);

create table if not exists public.marketplace_buyer_markets (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.marketplace_buyer_profiles(id) on delete cascade,
  city text not null,
  state text,
  created_at timestamptz not null default now(),
  constraint marketplace_buyer_markets_unique unique (buyer_id, city, state)
);

create index if not exists idx_marketplace_buyer_profiles_active
  on public.marketplace_buyer_profiles (is_active, is_verified);

create index if not exists idx_marketplace_buyer_markets_city_state
  on public.marketplace_buyer_markets (lower(city), lower(coalesce(state, 'ca')));

do $$
begin
  if to_regprocedure('public.touch_updated_at()') is not null then
    execute 'drop trigger if exists tr_marketplace_buyer_profiles_updated_at on public.marketplace_buyer_profiles';
    execute 'create trigger tr_marketplace_buyer_profiles_updated_at before update on public.marketplace_buyer_profiles for each row execute function public.touch_updated_at()';
  end if;
end $$;

alter table public.marketplace_buyer_profiles enable row level security;
alter table public.marketplace_buyer_markets enable row level security;

drop policy if exists marketplace_buyer_profiles_select_policy on public.marketplace_buyer_profiles;
create policy marketplace_buyer_profiles_select_policy on public.marketplace_buyer_profiles
for select
using (
  public.is_admin()
  or user_id = auth.uid()
  or (is_active = true and auth.uid() is not null)
);

drop policy if exists marketplace_buyer_profiles_insert_owner_or_admin on public.marketplace_buyer_profiles;
create policy marketplace_buyer_profiles_insert_owner_or_admin on public.marketplace_buyer_profiles
for insert
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists marketplace_buyer_profiles_update_owner_or_admin on public.marketplace_buyer_profiles;
create policy marketplace_buyer_profiles_update_owner_or_admin on public.marketplace_buyer_profiles
for update
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists marketplace_buyer_profiles_delete_owner_or_admin on public.marketplace_buyer_profiles;
create policy marketplace_buyer_profiles_delete_owner_or_admin on public.marketplace_buyer_profiles
for delete
using (public.is_admin() or user_id = auth.uid());

drop policy if exists marketplace_buyer_markets_select_policy on public.marketplace_buyer_markets;
create policy marketplace_buyer_markets_select_policy on public.marketplace_buyer_markets
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_buyer_markets.buyer_id
      and (bp.user_id = auth.uid() or (bp.is_active = true and auth.uid() is not null))
  )
);

drop policy if exists marketplace_buyer_markets_insert_owner_or_admin on public.marketplace_buyer_markets;
create policy marketplace_buyer_markets_insert_owner_or_admin on public.marketplace_buyer_markets
for insert
with check (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_buyer_markets.buyer_id
      and bp.user_id = auth.uid()
  )
);

drop policy if exists marketplace_buyer_markets_update_owner_or_admin on public.marketplace_buyer_markets;
create policy marketplace_buyer_markets_update_owner_or_admin on public.marketplace_buyer_markets
for update
using (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_buyer_markets.buyer_id
      and bp.user_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_buyer_markets.buyer_id
      and bp.user_id = auth.uid()
  )
);

drop policy if exists marketplace_buyer_markets_delete_owner_or_admin on public.marketplace_buyer_markets;
create policy marketplace_buyer_markets_delete_owner_or_admin on public.marketplace_buyer_markets
for delete
using (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_buyer_markets.buyer_id
      and bp.user_id = auth.uid()
  )
);

insert into public.marketplace_buyer_profiles (
  id,
  company_name,
  contact_name,
  contact_email,
  contact_phone,
  deal_types,
  financing_types,
  buy_box_min,
  buy_box_max,
  max_days_on_market,
  monthly_capacity,
  close_time_days,
  is_verified,
  is_active
) values
  ('10000000-0000-0000-0000-000000000001', 'Pacific Equity Group', 'Leah Carter', 'acquisitions@pacificequity.group', '+1-916-555-5101', '{fix_and_flip,wholesale}', '{cash}', 120000, 380000, 35, 10, 12, true, true),
  ('10000000-0000-0000-0000-000000000002', 'Central Valley Investments', 'Jordan Lee', 'team@cvinvestments.io', '+1-916-555-5102', '{wholesale,fix_and_flip}', '{cash,hard_money}', 90000, 280000, 30, 7, 14, true, true),
  ('10000000-0000-0000-0000-000000000003', 'Bay Area Cash Buyers', 'Noah Patel', 'offers@baycashbuyers.com', '+1-916-555-5103', '{fix_and_flip,buy_and_hold}', '{cash}', 250000, 600000, 45, 6, 10, true, true),
  ('10000000-0000-0000-0000-000000000004', 'Independent Buyer - T. Williams', 'T. Williams', 'twilliams@independentbuyer.co', '+1-916-555-5104', '{fix_and_flip}', '{cash,hard_money}', 150000, 320000, 25, 3, 11, true, true),
  ('10000000-0000-0000-0000-000000000005', 'Golden State Deal Makers', 'Olivia Ramos', 'ops@goldendealmakers.com', '+1-916-555-5105', '{wholesale,fix_and_flip,buy_and_hold}', '{cash,hard_money}', 100000, 500000, 50, 15, 12, false, true),
  ('10000000-0000-0000-0000-000000000006', 'Redwood Capital Partners', 'Mason Gray', 'buybox@redwoodcapitalpartners.com', '+1-916-555-5106', '{fix_and_flip}', '{cash}', 180000, 450000, 40, 8, 13, true, true),
  ('10000000-0000-0000-0000-000000000007', 'Delta Turnkey Holdings', 'Avery Kim', 'acq@deltaturnkey.com', '+1-916-555-5107', '{buy_and_hold,wholesale}', '{hard_money}', 110000, 300000, 55, 5, 16, true, true),
  ('10000000-0000-0000-0000-000000000008', 'Sierra Equity Buyers', 'Ethan Brooks', 'offers@sierraequitybuyers.com', '+1-916-555-5108', '{wholesale,wholetail}', '{cash,hard_money}', 130000, 340000, 32, 4, 12, true, true),
  ('10000000-0000-0000-0000-000000000009', 'NorCal Fast Close Fund', 'Mia Adams', 'deals@ncfastclose.fund', '+1-916-555-5109', '{wholesale,fix_and_flip}', '{cash}', 140000, 360000, 28, 9, 9, true, true),
  ('10000000-0000-0000-0000-000000000010', 'Valley Rental Portfolio Group', 'Lucas Evans', 'inbox@vrpgroup.net', '+1-916-555-5110', '{buy_and_hold,rental}', '{cash,hard_money}', 95000, 275000, 60, 6, 18, true, true),
  ('10000000-0000-0000-0000-000000000011', 'Metro Distressed Assets', 'Harper Diaz', 'offers@metrodistressedassets.com', '+1-916-555-5111', '{fix_and_flip,wholesale}', '{cash}', 160000, 420000, 30, 6, 11, true, true),
  ('10000000-0000-0000-0000-000000000012', 'Rapid Assign Buyers Co', 'Elijah Scott', 'support@rapidassignbuyers.com', '+1-916-555-5112', '{wholesale}', '{cash,hard_money}', 100000, 260000, 20, 5, 8, false, true)
on conflict (id) do nothing;

insert into public.marketplace_buyer_markets (
  buyer_id,
  city,
  state
) values
  ('10000000-0000-0000-0000-000000000001', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000001', 'Stockton', 'CA'),
  ('10000000-0000-0000-0000-000000000001', 'Modesto', 'CA'),
  ('10000000-0000-0000-0000-000000000002', 'Fresno', 'CA'),
  ('10000000-0000-0000-0000-000000000002', 'Bakersfield', 'CA'),
  ('10000000-0000-0000-0000-000000000002', 'Visalia', 'CA'),
  ('10000000-0000-0000-0000-000000000003', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000003', 'San Jose', 'CA'),
  ('10000000-0000-0000-0000-000000000003', 'Oakland', 'CA'),
  ('10000000-0000-0000-0000-000000000004', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000005', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000005', 'Fresno', 'CA'),
  ('10000000-0000-0000-0000-000000000005', 'Bakersfield', 'CA'),
  ('10000000-0000-0000-0000-000000000005', 'Stockton', 'CA'),
  ('10000000-0000-0000-0000-000000000006', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000006', 'Roseville', 'CA'),
  ('10000000-0000-0000-0000-000000000006', 'Elk Grove', 'CA'),
  ('10000000-0000-0000-0000-000000000007', 'Stockton', 'CA'),
  ('10000000-0000-0000-0000-000000000007', 'Lodi', 'CA'),
  ('10000000-0000-0000-0000-000000000007', 'Tracy', 'CA'),
  ('10000000-0000-0000-0000-000000000008', 'Fresno', 'CA'),
  ('10000000-0000-0000-0000-000000000008', 'Clovis', 'CA'),
  ('10000000-0000-0000-0000-000000000008', 'Madera', 'CA'),
  ('10000000-0000-0000-0000-000000000009', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000009', 'Elk Grove', 'CA'),
  ('10000000-0000-0000-0000-000000000010', 'Fresno', 'CA'),
  ('10000000-0000-0000-0000-000000000010', 'Bakersfield', 'CA'),
  ('10000000-0000-0000-0000-000000000011', 'Sacramento', 'CA'),
  ('10000000-0000-0000-0000-000000000011', 'Stockton', 'CA'),
  ('10000000-0000-0000-0000-000000000012', 'Modesto', 'CA'),
  ('10000000-0000-0000-0000-000000000012', 'Sacramento', 'CA')
on conflict do nothing;
