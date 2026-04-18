-- Mobile + legal compliance + partner tracking hardening
-- Generated: 2026-04-18

create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  app_version text,
  device_id text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobile_push_tokens_token_chk check (length(token) >= 16),
  constraint mobile_push_tokens_platform_chk check (platform in ('ios', 'android', 'web', 'unknown')),
  constraint mobile_push_tokens_unique unique (user_id, token)
);

create index if not exists idx_mobile_push_tokens_user_seen
  on public.mobile_push_tokens (user_id, last_seen_at desc);

create index if not exists idx_mobile_push_tokens_token
  on public.mobile_push_tokens (token);

drop trigger if exists tr_mobile_push_tokens_updated_at on public.mobile_push_tokens;
create trigger tr_mobile_push_tokens_updated_at
before update on public.mobile_push_tokens
for each row
execute function public.touch_updated_at();

create table if not exists public.cslb_license_cache (
  license_number text primary key,
  valid boolean not null,
  status text,
  legal_name text,
  classification text,
  expires_on date,
  source text not null default 'unknown',
  last_verified_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cslb_cache_license_chk check (license_number ~ '^[A-Z0-9-]{4,20}$')
);

create index if not exists idx_cslb_license_cache_verified
  on public.cslb_license_cache (last_verified_at desc);

drop trigger if exists tr_cslb_license_cache_updated_at on public.cslb_license_cache;
create trigger tr_cslb_license_cache_updated_at
before update on public.cslb_license_cache
for each row
execute function public.touch_updated_at();

create table if not exists public.cslb_verification_attempts (
  id uuid primary key default gen_random_uuid(),
  license_number text not null,
  user_id uuid references public.users(id) on delete set null,
  request_ip inet,
  source text,
  success boolean not null default false,
  valid boolean,
  status text,
  message text,
  response_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint cslb_attempts_license_chk check (license_number ~ '^[A-Z0-9-]{4,20}$')
);

create index if not exists idx_cslb_attempts_license_created
  on public.cslb_verification_attempts (license_number, created_at desc);

create index if not exists idx_cslb_attempts_user_created
  on public.cslb_verification_attempts (user_id, created_at desc);

create table if not exists public.realtor_commission_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  realtor_user_id uuid not null references public.users(id) on delete cascade,
  dealmaker_user_id uuid references public.users(id) on delete set null,
  sale_price numeric(12,2) not null,
  gross_commission numeric(12,2) not null,
  realtor_split_pct numeric(5,2) not null,
  dealbank_split_pct numeric(5,2) not null,
  realtor_net numeric(12,2) not null,
  dealbank_net numeric(12,2) not null,
  status text not null default 'pending',
  compliance_note text,
  reviewer_user_id uuid references public.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint realtor_commission_reviews_unique unique (listing_id, realtor_user_id),
  constraint realtor_commission_reviews_status_chk check (status in ('pending', 'approved', 'needs_revision', 'rejected')),
  constraint realtor_commission_reviews_sale_chk check (sale_price >= 0),
  constraint realtor_commission_reviews_gross_chk check (gross_commission >= 0),
  constraint realtor_commission_reviews_realtor_pct_chk check (realtor_split_pct >= 0 and realtor_split_pct <= 100),
  constraint realtor_commission_reviews_dealbank_pct_chk check (dealbank_split_pct >= 0 and dealbank_split_pct <= 100),
  constraint realtor_commission_reviews_realtor_net_chk check (realtor_net >= 0),
  constraint realtor_commission_reviews_dealbank_net_chk check (dealbank_net >= 0)
);

create index if not exists idx_realtor_commission_reviews_realtor_status
  on public.realtor_commission_reviews (realtor_user_id, status, requested_at desc);

create index if not exists idx_realtor_commission_reviews_status
  on public.realtor_commission_reviews (status, requested_at desc);

create index if not exists idx_realtor_commission_reviews_listing
  on public.realtor_commission_reviews (listing_id);

drop trigger if exists tr_realtor_commission_reviews_updated_at on public.realtor_commission_reviews;
create trigger tr_realtor_commission_reviews_updated_at
before update on public.realtor_commission_reviews
for each row
execute function public.touch_updated_at();

create table if not exists public.partner_referral_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  partner_id text not null,
  partner_type text not null default 'software',
  action text not null default 'click',
  referral_id text,
  placement text,
  source_tab text,
  campaign text,
  target_url text,
  utm_params jsonb not null default '{}'::jsonb,
  request_ip inet,
  user_agent text,
  referer text,
  created_at timestamptz not null default now(),
  constraint partner_referral_events_action_chk check (action in ('impression', 'click')),
  constraint partner_referral_events_partner_id_chk check (length(partner_id) >= 2)
);

create index if not exists idx_partner_referral_events_partner_action
  on public.partner_referral_events (partner_id, action, created_at desc);

create index if not exists idx_partner_referral_events_referral_id
  on public.partner_referral_events (referral_id);

create index if not exists idx_partner_referral_events_user_created
  on public.partner_referral_events (user_id, created_at desc);

alter table public.mobile_push_tokens enable row level security;
alter table public.cslb_license_cache enable row level security;
alter table public.cslb_verification_attempts enable row level security;
alter table public.realtor_commission_reviews enable row level security;
alter table public.partner_referral_events enable row level security;

-- mobile_push_tokens

drop policy if exists mobile_push_tokens_select_owner_or_admin on public.mobile_push_tokens;
create policy mobile_push_tokens_select_owner_or_admin on public.mobile_push_tokens
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists mobile_push_tokens_insert_owner_or_admin on public.mobile_push_tokens;
create policy mobile_push_tokens_insert_owner_or_admin on public.mobile_push_tokens
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists mobile_push_tokens_update_owner_or_admin on public.mobile_push_tokens;
create policy mobile_push_tokens_update_owner_or_admin on public.mobile_push_tokens
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists mobile_push_tokens_delete_owner_or_admin on public.mobile_push_tokens;
create policy mobile_push_tokens_delete_owner_or_admin on public.mobile_push_tokens
for delete
using (user_id = auth.uid() or public.is_admin());

-- cslb cache + attempts

drop policy if exists cslb_license_cache_select_authed_or_admin on public.cslb_license_cache;
create policy cslb_license_cache_select_authed_or_admin on public.cslb_license_cache
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists cslb_license_cache_insert_admin on public.cslb_license_cache;
create policy cslb_license_cache_insert_admin on public.cslb_license_cache
for insert
with check (public.is_admin());

drop policy if exists cslb_license_cache_update_admin on public.cslb_license_cache;
create policy cslb_license_cache_update_admin on public.cslb_license_cache
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists cslb_license_cache_delete_admin on public.cslb_license_cache;
create policy cslb_license_cache_delete_admin on public.cslb_license_cache
for delete
using (public.is_admin());

drop policy if exists cslb_verification_attempts_select_admin on public.cslb_verification_attempts;
create policy cslb_verification_attempts_select_admin on public.cslb_verification_attempts
for select
using (public.is_admin());

drop policy if exists cslb_verification_attempts_insert_admin on public.cslb_verification_attempts;
create policy cslb_verification_attempts_insert_admin on public.cslb_verification_attempts
for insert
with check (public.is_admin());

drop policy if exists cslb_verification_attempts_update_admin on public.cslb_verification_attempts;
create policy cslb_verification_attempts_update_admin on public.cslb_verification_attempts
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists cslb_verification_attempts_delete_admin on public.cslb_verification_attempts;
create policy cslb_verification_attempts_delete_admin on public.cslb_verification_attempts
for delete
using (public.is_admin());

-- realtor commission reviews

drop policy if exists realtor_commission_reviews_select_policy on public.realtor_commission_reviews;
create policy realtor_commission_reviews_select_policy on public.realtor_commission_reviews
for select
using (
  public.is_admin()
  or realtor_user_id = auth.uid()
  or dealmaker_user_id = auth.uid()
);

drop policy if exists realtor_commission_reviews_insert_policy on public.realtor_commission_reviews;
create policy realtor_commission_reviews_insert_policy on public.realtor_commission_reviews
for insert
with check (public.is_admin() or realtor_user_id = auth.uid());

drop policy if exists realtor_commission_reviews_update_policy on public.realtor_commission_reviews;
create policy realtor_commission_reviews_update_policy on public.realtor_commission_reviews
for update
using (public.is_admin() or realtor_user_id = auth.uid())
with check (public.is_admin() or realtor_user_id = auth.uid());

drop policy if exists realtor_commission_reviews_delete_admin on public.realtor_commission_reviews;
create policy realtor_commission_reviews_delete_admin on public.realtor_commission_reviews
for delete
using (public.is_admin());

-- partner_referral_events

drop policy if exists partner_referral_events_select_policy on public.partner_referral_events;
create policy partner_referral_events_select_policy on public.partner_referral_events
for select
using (public.is_admin() or user_id = auth.uid());

drop policy if exists partner_referral_events_insert_owner_or_admin on public.partner_referral_events;
create policy partner_referral_events_insert_owner_or_admin on public.partner_referral_events
for insert
with check (public.is_admin() or user_id = auth.uid());

drop policy if exists partner_referral_events_update_admin on public.partner_referral_events;
create policy partner_referral_events_update_admin on public.partner_referral_events
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists partner_referral_events_delete_admin on public.partner_referral_events;
create policy partner_referral_events_delete_admin on public.partner_referral_events
for delete
using (public.is_admin());

create or replace function public.submit_realtor_commission_review(
  p_listing_id uuid
)
returns table (
  review_id uuid,
  review_status text,
  requested_at timestamptz,
  realtor_net numeric,
  dealbank_net numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_listing_seller_id uuid;
  v_listing_status text;
  v_listing_asking_price numeric;
  v_listing_city text;
  v_market_authorized boolean := false;
  v_split_pct numeric;
  v_realtor_pct numeric;
  v_gross numeric;
  v_realtor_net numeric;
  v_dealbank_net numeric;
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_uid
  ) then
    raise exception 'User profile not found';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_uid
      and u.type = 'realtor'::public.user_type_enum
  ) then
    raise exception 'Only realtor users can submit commission compliance reviews';
  end if;

  if not exists (
    select 1
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  ) then
    raise exception 'Listing not found';
  end if;

  v_listing_seller_id := (
    select ml.seller_id
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  );

  v_listing_status := (
    select ml.status::text
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  );

  v_listing_asking_price := (
    select ml.asking_price
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  );

  v_listing_city := (
    select ml.city
    from public.marketplace_listings ml
    where ml.id = p_listing_id
  );

  if v_listing_status <> 'closed' then
    raise exception 'Only closed listings can be submitted for compliance review';
  end if;

  v_market_authorized := exists (
    select 1
    from public.realtor_profiles rp
    join public.realtor_markets rm on rm.realtor_id = rp.id
    where rp.user_id = v_uid
      and lower(rm.city) = lower(coalesce(v_listing_city, ''))
  );

  if not v_market_authorized then
    raise exception 'Realtor is not authorized for this listing market';
  end if;

  v_split_pct := (
    select rp.commission_split
    from public.realtor_profiles rp
    where rp.user_id = v_uid
  );

  v_split_pct := greatest(0, least(100, coalesce(v_split_pct, 25)));
  v_realtor_pct := 100 - v_split_pct;
  v_gross := round(coalesce(v_listing_asking_price, 0) * 0.025, 2);
  v_realtor_net := round(v_gross * (v_realtor_pct / 100), 2);
  v_dealbank_net := round(v_gross - v_realtor_net, 2);

  return query
  insert into public.realtor_commission_reviews (
    listing_id,
    realtor_user_id,
    dealmaker_user_id,
    sale_price,
    gross_commission,
    realtor_split_pct,
    dealbank_split_pct,
    realtor_net,
    dealbank_net,
    status,
    compliance_note,
    reviewer_user_id,
    requested_at,
    reviewed_at,
    created_at,
    updated_at
  )
  values (
    p_listing_id,
    v_uid,
    v_listing_seller_id,
    round(coalesce(v_listing_asking_price, 0), 2),
    v_gross,
    v_realtor_pct,
    v_split_pct,
    v_realtor_net,
    v_dealbank_net,
    'pending',
    null,
    null,
    now(),
    null,
    now(),
    now()
  )
  on conflict (listing_id, realtor_user_id)
  do update set
    sale_price = excluded.sale_price,
    gross_commission = excluded.gross_commission,
    realtor_split_pct = excluded.realtor_split_pct,
    dealbank_split_pct = excluded.dealbank_split_pct,
    realtor_net = excluded.realtor_net,
    dealbank_net = excluded.dealbank_net,
    status = 'pending',
    compliance_note = null,
    reviewer_user_id = null,
    requested_at = now(),
    reviewed_at = null,
    updated_at = now()
  returning
    id,
    status,
    requested_at,
    realtor_net,
    dealbank_net;
end;
$$;

create or replace function public.review_realtor_commission_review(
  p_review_id uuid,
  p_status text,
  p_note text default ''
)
returns table (
  review_id uuid,
  review_status text,
  reviewed_at timestamptz,
  reviewer_user_id uuid,
  compliance_note text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_status text := lower(trim(coalesce(p_status, '')));
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  if not public.is_admin() then
    raise exception 'Only admin users can review commission compliance';
  end if;

  if v_status not in ('approved', 'needs_revision', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  return query
  update public.realtor_commission_reviews
  set
    status = v_status,
    compliance_note = nullif(trim(coalesce(p_note, '')), ''),
    reviewer_user_id = v_uid,
    reviewed_at = now(),
    updated_at = now()
  where id = p_review_id
  returning
    id,
    status,
    reviewed_at,
    reviewer_user_id,
    compliance_note;

  if not found then
    raise exception 'Commission review record not found';
  end if;
end;
$$;

revoke all on function public.submit_realtor_commission_review(uuid) from public;
grant execute on function public.submit_realtor_commission_review(uuid) to authenticated;
grant execute on function public.submit_realtor_commission_review(uuid) to service_role;

revoke all on function public.review_realtor_commission_review(uuid, text, text) from public;
grant execute on function public.review_realtor_commission_review(uuid, text, text) to authenticated;
grant execute on function public.review_realtor_commission_review(uuid, text, text) to service_role;
