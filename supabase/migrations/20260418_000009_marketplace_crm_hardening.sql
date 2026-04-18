-- Marketplace + CRM production hardening
-- Generated: 2026-04-18

-- Ensure legacy environments always have sms_dispatches, even if prior migration was skipped.
create table if not exists public.sms_dispatches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  sequence_id uuid not null references public.sms_sequences(id) on delete cascade,
  step_id uuid not null references public.sequence_steps(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  to_phone text,
  lead_name text,
  body text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'queued',
  provider_sid text,
  error_message text,
  created_at timestamptz not null default now(),
  constraint sms_dispatches_status_chk check (status in ('queued', 'sent', 'failed')),
  constraint sms_dispatches_unique unique (sequence_id, step_id, lead_id)
);

create index if not exists idx_sms_dispatches_owner_status_due
  on public.sms_dispatches (owner_id, status, scheduled_for);

create index if not exists idx_sms_dispatches_sequence_due
  on public.sms_dispatches (sequence_id, status, scheduled_for);

alter table public.sms_dispatches enable row level security;

drop policy if exists sms_dispatches_select_owner_or_admin on public.sms_dispatches;
create policy sms_dispatches_select_owner_or_admin on public.sms_dispatches
for select
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_dispatches_insert_owner_or_admin on public.sms_dispatches;
create policy sms_dispatches_insert_owner_or_admin on public.sms_dispatches
for insert
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_dispatches_update_owner_or_admin on public.sms_dispatches;
create policy sms_dispatches_update_owner_or_admin on public.sms_dispatches
for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_dispatches_delete_owner_or_admin on public.sms_dispatches;
create policy sms_dispatches_delete_owner_or_admin on public.sms_dispatches
for delete
using (owner_id = auth.uid() or public.is_admin());

-- Buyer network persisted in DB (not frontend mock).
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

create table if not exists public.marketplace_listing_matches (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id uuid not null references public.marketplace_buyer_profiles(id) on delete cascade,
  match_score numeric(6,2) not null default 0,
  match_reason jsonb not null default '{}'::jsonb,
  status text not null default 'candidate',
  matched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_listing_matches_status_chk check (status in ('candidate', 'contacted', 'interested', 'declined', 'won')),
  constraint marketplace_listing_matches_unique unique (listing_id, buyer_id)
);

create table if not exists public.marketplace_listing_views (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  viewer_user_id uuid not null references public.users(id) on delete cascade,
  view_date date not null default current_date,
  viewed_at timestamptz not null default now(),
  constraint marketplace_listing_views_unique unique (listing_id, viewer_user_id, view_date)
);

create index if not exists idx_marketplace_buyer_profiles_active
  on public.marketplace_buyer_profiles (is_active, is_verified);

create index if not exists idx_marketplace_buyer_markets_city_state
  on public.marketplace_buyer_markets (lower(city), lower(coalesce(state, 'ca')));

create index if not exists idx_marketplace_listing_matches_listing_score
  on public.marketplace_listing_matches (listing_id, match_score desc);

create index if not exists idx_marketplace_listing_matches_buyer
  on public.marketplace_listing_matches (buyer_id, status);

create index if not exists idx_marketplace_listing_views_listing_date
  on public.marketplace_listing_views (listing_id, view_date desc);

create index if not exists idx_marketplace_listing_views_viewer
  on public.marketplace_listing_views (viewer_user_id, viewed_at desc);

drop trigger if exists tr_marketplace_buyer_profiles_updated_at on public.marketplace_buyer_profiles;
create trigger tr_marketplace_buyer_profiles_updated_at
before update on public.marketplace_buyer_profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists tr_marketplace_listing_matches_updated_at on public.marketplace_listing_matches;
create trigger tr_marketplace_listing_matches_updated_at
before update on public.marketplace_listing_matches
for each row
execute function public.touch_updated_at();

alter table public.marketplace_buyer_profiles enable row level security;
alter table public.marketplace_buyer_markets enable row level security;
alter table public.marketplace_listing_matches enable row level security;
alter table public.marketplace_listing_views enable row level security;

-- buyer profiles policies
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

-- buyer markets policies
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

-- listing matches policies
drop policy if exists marketplace_listing_matches_select_policy on public.marketplace_listing_matches;
create policy marketplace_listing_matches_select_policy on public.marketplace_listing_matches
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_matches.listing_id
      and ml.seller_id = auth.uid()
  )
  or exists (
    select 1
    from public.marketplace_buyer_profiles bp
    where bp.id = marketplace_listing_matches.buyer_id
      and bp.user_id = auth.uid()
  )
);

drop policy if exists marketplace_listing_matches_write_admin on public.marketplace_listing_matches;
create policy marketplace_listing_matches_write_admin on public.marketplace_listing_matches
for all
using (public.is_admin())
with check (public.is_admin());

-- listing views policies
drop policy if exists marketplace_listing_views_select_policy on public.marketplace_listing_views;
create policy marketplace_listing_views_select_policy on public.marketplace_listing_views
for select
using (
  public.is_admin()
  or viewer_user_id = auth.uid()
  or exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = marketplace_listing_views.listing_id
      and ml.seller_id = auth.uid()
  )
);

drop policy if exists marketplace_listing_views_insert_policy on public.marketplace_listing_views;
create policy marketplace_listing_views_insert_policy on public.marketplace_listing_views
for insert
with check (public.is_admin() or viewer_user_id = auth.uid());

drop policy if exists marketplace_listing_views_update_admin on public.marketplace_listing_views;
create policy marketplace_listing_views_update_admin on public.marketplace_listing_views
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists marketplace_listing_views_delete_admin on public.marketplace_listing_views;
create policy marketplace_listing_views_delete_admin on public.marketplace_listing_views
for delete
using (public.is_admin());

create or replace function public.marketplace_days_on_market(
  p_published_at timestamptz,
  p_closed_at timestamptz default null
)
returns integer
language sql
stable
set search_path = public
as $$
  select greatest(
    0,
    floor(extract(epoch from (coalesce(p_closed_at, now()) - coalesce(p_published_at, now()))) / 86400)::int
  );
$$;

create or replace function public.increment_marketplace_listing_view(
  p_listing_id uuid
)
returns table (
  view_count integer,
  save_count integer,
  days_on_market integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.type is not null
  ) then
    raise exception 'User profile not found';
  end if;

  if not exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  ) then
    raise exception 'Listing not found';
  end if;

  if not (
    public.is_admin()
    or exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = p_listing_id
        and ml.seller_id = auth.uid()
    )
    or exists (
      select 1
      from public.marketplace_listings ml
      join public.users u on u.id = auth.uid()
      where ml.id = p_listing_id
        and ml.status = 'active'
        and u.type in ('dealmaker'::public.user_type_enum, 'contractor'::public.user_type_enum)
    )
    or exists (
      select 1
      from public.marketplace_listings ml
      join public.users u on u.id = auth.uid()
      where ml.id = p_listing_id
        and ml.status = 'active'
        and u.type = 'realtor'::public.user_type_enum
        and exists (
          select 1
          from public.realtor_profiles rp
          join public.realtor_markets rm on rm.realtor_id = rp.id
          where rp.user_id = auth.uid()
            and lower(rm.city) = lower(coalesce(ml.city, ''))
        )
    )
  ) then
    raise exception 'Not authorized to view this listing';
  end if;

  insert into public.marketplace_listing_views (
    listing_id,
    viewer_user_id,
    view_date,
    viewed_at
  )
  values (
    p_listing_id,
    auth.uid(),
    current_date,
    now()
  )
  on conflict (listing_id, viewer_user_id, view_date) do nothing;

  update public.marketplace_listings ml
  set
    view_count = (
      select count(*)::integer
      from public.marketplace_listing_views lv
      where lv.listing_id = ml.id
    ),
    updated_at = now(),
    days_on_market = public.marketplace_days_on_market(
      ml.published_at,
      case when ml.status = 'closed' then ml.closed_at else null end
    )
  where ml.id = p_listing_id;

  return query
  select
    ml.view_count,
    ml.save_count,
    public.marketplace_days_on_market(
      ml.published_at,
      case when ml.status = 'closed' then ml.closed_at else null end
    ) as days_on_market
  from public.marketplace_listings ml
  where ml.id = p_listing_id;
end;
$$;

create or replace function public.refresh_marketplace_listing_matches(
  p_listing_id uuid,
  p_limit integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  ) then
    raise exception 'Listing not found';
  end if;

  if not (
    public.is_admin()
    or exists (
      select 1
      from public.marketplace_listings ml
      where ml.id = p_listing_id
        and ml.seller_id = auth.uid()
    )
  ) then
    raise exception 'Only listing owner or admin can refresh buyer matches';
  end if;

  return (
    with listing as (
      select
        ml.status::text as listing_status,
        ml.asking_price,
        ml.deal_type::text as deal_type,
        ml.published_at,
        ml.closed_at,
        ml.city,
        ml.state
      from public.marketplace_listings ml
      where ml.id = p_listing_id
    ),
    buyer_candidates as (
    select
      bp.id as buyer_id,
      (
        case
          when l.asking_price is null then 20
          when bp.buy_box_min is null and bp.buy_box_max is null then 20
          when (bp.buy_box_min is null or l.asking_price >= bp.buy_box_min)
            and (bp.buy_box_max is null or l.asking_price <= bp.buy_box_max)
            then 40
          else 5
        end
        + case
            when coalesce(array_length(bp.deal_types, 1), 0) = 0 then 12
            when l.deal_type is not null and l.deal_type = any(bp.deal_types) then 22
            else 0
          end
        + case
            when coalesce(array_length(bp.financing_types, 1), 0) = 0 then 6
            when 'cash' = any(bp.financing_types) then 10
            else 4
          end
        + case
            when bp.max_days_on_market is null then 8
            when public.marketplace_days_on_market(
              l.published_at,
              case when l.listing_status = 'closed' then l.closed_at else null end
            ) <= bp.max_days_on_market then 14
            else 0
          end
        + case when bp.is_verified then 8 else 0 end
        + least(10, greatest(0, coalesce(bp.monthly_capacity, 0)))
      )::numeric(6,2) as match_score,
      jsonb_build_object(
        'city', l.city,
        'deal_type', l.deal_type,
        'listing_price', l.asking_price,
        'buyer_buy_box_min', bp.buy_box_min,
        'buyer_buy_box_max', bp.buy_box_max,
        'buyer_verified', bp.is_verified,
        'financing_types', bp.financing_types
      ) as match_reason
    from listing l
    join public.marketplace_buyer_profiles bp on true
    where bp.is_active = true
      and (
        not exists (
          select 1
          from public.marketplace_buyer_markets bm
          where bm.buyer_id = bp.id
        )
        or exists (
          select 1
          from public.marketplace_buyer_markets bm
          where bm.buyer_id = bp.id
            and lower(bm.city) = lower(coalesce(l.city, ''))
            and lower(coalesce(bm.state, 'ca')) = lower(coalesce(l.state, 'ca'))
        )
      )
    order by match_score desc, bp.is_verified desc, bp.monthly_capacity desc nulls last, bp.created_at asc
    limit least(100, greatest(1, coalesce(p_limit, 30)))
    ),
    upserted as (
      insert into public.marketplace_listing_matches (
        listing_id,
        buyer_id,
        match_score,
        match_reason,
        status,
        matched_at,
        updated_at
      )
      select
        p_listing_id,
        buyer_id,
        match_score,
        match_reason,
        'candidate',
        now(),
        now()
      from buyer_candidates
      on conflict (listing_id, buyer_id)
      do update set
        match_score = excluded.match_score,
        match_reason = excluded.match_reason,
        matched_at = now(),
        updated_at = now()
      returning 1
    )
    select count(*)::integer
    from upserted
  );
end;
$$;

revoke all on function public.increment_marketplace_listing_view(uuid) from public;
grant execute on function public.increment_marketplace_listing_view(uuid) to authenticated;
grant execute on function public.increment_marketplace_listing_view(uuid) to service_role;

revoke all on function public.refresh_marketplace_listing_matches(uuid, integer) from public;
grant execute on function public.refresh_marketplace_listing_matches(uuid, integer) to authenticated;
grant execute on function public.refresh_marketplace_listing_matches(uuid, integer) to service_role;

-- Backfill existing listing days in case stale values were persisted.
update public.marketplace_listings
set days_on_market = public.marketplace_days_on_market(
  published_at,
  case when status = 'closed' then closed_at else null end
)
where true;
