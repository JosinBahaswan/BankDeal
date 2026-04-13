-- DealBank production schema (Supabase/PostgreSQL)
-- Generated: 2026-04-13

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_type_enum') then
    create type public.user_type_enum as enum ('dealmaker', 'contractor', 'realtor', 'admin');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'rate_type_enum') then
    create type public.rate_type_enum as enum ('hourly', 'project', 'both');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_tier_enum') then
    create type public.subscription_tier_enum as enum ('basic', 'pro');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'listing_status_enum') then
    create type public.listing_status_enum as enum ('active', 'under_contract', 'closed', 'withdrawn');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contract_template_enum') then
    create type public.contract_template_enum as enum ('assignment', 'cash_purchase', 'joint_venture');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'contract_status_enum') then
    create type public.contract_status_enum as enum ('draft', 'sent', 'partially_signed', 'fully_executed', 'voided');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'signature_method_enum') then
    create type public.signature_method_enum as enum ('typed', 'drawn');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_outcome_enum') then
    create type public.call_outcome_enum as enum (
      'No Answer',
      'Left Voicemail',
      'Callback Scheduled',
      'Not Interested',
      'Wrong Number',
      'Deal Potential',
      'Offer Sent'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sequence_status_enum') then
    create type public.sequence_status_enum as enum ('active', 'paused', 'draft');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'sequence_step_type_enum') then
    create type public.sequence_step_type_enum as enum ('sms', 'email', 'task');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status_enum') then
    create type public.subscription_status_enum as enum ('active', 'past_due', 'canceled', 'trialing');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'credit_pack_tier_enum') then
    create type public.credit_pack_tier_enum as enum ('starter', 'growth', 'pro');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'platform_fee_status_enum') then
    create type public.platform_fee_status_enum as enum ('pending', 'disbursed', 'disputed');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  password_hash text not null,
  type public.user_type_enum not null,
  company text,
  phone text,
  is_active boolean not null default true,
  email_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  last_login timestamptz,
  constraint users_email_unique unique (email)
);

create table if not exists public.contractor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  years_experience integer,
  license_number text,
  city text,
  service_radius integer,
  rate_type public.rate_type_enum,
  rate_amount numeric(10,2),
  bio text,
  is_licensed boolean default false,
  is_insured boolean default false,
  is_bonded boolean default false,
  subscription_tier public.subscription_tier_enum not null default 'basic',
  verified_badge boolean not null default false,
  rating numeric(3,2),
  total_jobs integer not null default 0,
  created_at timestamptz not null default now(),
  constraint contractor_profiles_user_unique unique (user_id),
  constraint contractor_profiles_years_chk check (years_experience is null or years_experience >= 0),
  constraint contractor_profiles_radius_chk check (service_radius is null or service_radius >= 0),
  constraint contractor_profiles_rate_chk check (rate_amount is null or rate_amount >= 0),
  constraint contractor_profiles_rating_chk check (rating is null or (rating >= 0 and rating <= 5)),
  constraint contractor_profiles_jobs_chk check (total_jobs >= 0)
);

create table if not exists public.contractor_trades (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractor_profiles(id) on delete cascade,
  trade text not null,
  constraint contractor_trades_unique unique (contractor_id, trade)
);

create table if not exists public.realtor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  dre_license text,
  brokerage text,
  avg_days_to_close integer,
  deals_per_year integer,
  bio text,
  commission_split numeric(4,2) not null default 25.00,
  created_at timestamptz not null default now(),
  constraint realtor_profiles_user_unique unique (user_id),
  constraint realtor_profiles_days_chk check (avg_days_to_close is null or avg_days_to_close >= 0),
  constraint realtor_profiles_deals_chk check (deals_per_year is null or deals_per_year >= 0),
  constraint realtor_profiles_split_chk check (commission_split >= 0 and commission_split <= 100)
);

create table if not exists public.realtor_markets (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.realtor_profiles(id) on delete cascade,
  city text not null,
  constraint realtor_markets_unique unique (realtor_id, city)
);

create table if not exists public.realtor_specialties (
  id uuid primary key default gen_random_uuid(),
  realtor_id uuid not null references public.realtor_profiles(id) on delete cascade,
  specialty text not null,
  constraint realtor_specialties_unique unique (realtor_id, specialty)
);

create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  address text not null,
  arv numeric(12,2),
  offer_pct numeric(5,2) default 60,
  offer_price numeric(12,2),
  stage text not null default 'Analyzing',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  beds integer,
  baths numeric(4,1),
  sqft integer,
  year_built integer,
  property_type text,
  last_sale_price numeric(12,2),

  reno_kitchen numeric(10,2) not null default 0,
  reno_bathrooms numeric(10,2) not null default 0,
  reno_flooring numeric(10,2) not null default 0,
  reno_paint numeric(10,2) not null default 0,
  reno_hvac numeric(10,2) not null default 0,
  reno_plumbing numeric(10,2) not null default 0,
  reno_electrical numeric(10,2) not null default 0,
  reno_roof numeric(10,2) not null default 0,
  reno_windows numeric(10,2) not null default 0,
  reno_landscaping numeric(10,2) not null default 0,
  reno_foundation numeric(10,2) not null default 0,
  reno_misc numeric(10,2) not null default 0,

  hm_rate numeric(5,2),
  hm_months integer,
  hm_points numeric(5,2),

  hold_months integer,
  hold_monthly numeric(10,2),
  insurance_annual numeric(10,2),

  agent_fee_pct numeric(5,2),
  closing_cost_pct numeric(5,2),

  total_reno numeric(12,2),
  total_hm numeric(12,2),
  total_holding numeric(12,2),
  total_selling numeric(12,2),
  all_in_cost numeric(12,2),
  net_profit numeric(12,2),
  roi numeric(8,2),

  constraint deals_stage_chk check (stage in ('Analyzing', 'Under Contract', 'Renovating', 'Listing', 'Selling', 'Closed')),
  constraint deals_offer_pct_chk check (offer_pct is null or (offer_pct >= 0 and offer_pct <= 100)),
  constraint deals_arv_chk check (arv is null or arv >= 0),
  constraint deals_offer_price_chk check (offer_price is null or offer_price >= 0),
  constraint deals_beds_chk check (beds is null or beds >= 0),
  constraint deals_baths_chk check (baths is null or baths >= 0),
  constraint deals_sqft_chk check (sqft is null or sqft >= 0),
  constraint deals_year_chk check (year_built is null or year_built >= 1700),
  constraint deals_last_sale_chk check (last_sale_price is null or last_sale_price >= 0),
  constraint deals_reno_kitchen_chk check (reno_kitchen >= 0),
  constraint deals_reno_bathrooms_chk check (reno_bathrooms >= 0),
  constraint deals_reno_flooring_chk check (reno_flooring >= 0),
  constraint deals_reno_paint_chk check (reno_paint >= 0),
  constraint deals_reno_hvac_chk check (reno_hvac >= 0),
  constraint deals_reno_plumbing_chk check (reno_plumbing >= 0),
  constraint deals_reno_electrical_chk check (reno_electrical >= 0),
  constraint deals_reno_roof_chk check (reno_roof >= 0),
  constraint deals_reno_windows_chk check (reno_windows >= 0),
  constraint deals_reno_landscaping_chk check (reno_landscaping >= 0),
  constraint deals_reno_foundation_chk check (reno_foundation >= 0),
  constraint deals_reno_misc_chk check (reno_misc >= 0),
  constraint deals_hm_rate_chk check (hm_rate is null or (hm_rate >= 0 and hm_rate <= 100)),
  constraint deals_hm_months_chk check (hm_months is null or hm_months >= 0),
  constraint deals_hm_points_chk check (hm_points is null or (hm_points >= 0 and hm_points <= 100)),
  constraint deals_hold_months_chk check (hold_months is null or hold_months >= 0),
  constraint deals_hold_monthly_chk check (hold_monthly is null or hold_monthly >= 0),
  constraint deals_insurance_chk check (insurance_annual is null or insurance_annual >= 0),
  constraint deals_agent_fee_chk check (agent_fee_pct is null or (agent_fee_pct >= 0 and agent_fee_pct <= 100)),
  constraint deals_closing_fee_chk check (closing_cost_pct is null or (closing_cost_pct >= 0 and closing_cost_pct <= 100)),
  constraint deals_total_reno_chk check (total_reno is null or total_reno >= 0),
  constraint deals_total_hm_chk check (total_hm is null or total_hm >= 0),
  constraint deals_total_holding_chk check (total_holding is null or total_holding >= 0),
  constraint deals_total_selling_chk check (total_selling is null or total_selling >= 0),
  constraint deals_all_in_chk check (all_in_cost is null or all_in_cost >= 0)
);

create table if not exists public.deal_comps (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  address text,
  sqft integer,
  beds integer,
  baths numeric(4,1),
  sale_price numeric(12,2),
  days_ago integer,
  comp_order integer,
  constraint deal_comps_order_unique unique (deal_id, comp_order),
  constraint deal_comps_sqft_chk check (sqft is null or sqft >= 0),
  constraint deal_comps_beds_chk check (beds is null or beds >= 0),
  constraint deal_comps_baths_chk check (baths is null or baths >= 0),
  constraint deal_comps_price_chk check (sale_price is null or sale_price >= 0),
  constraint deal_comps_days_chk check (days_ago is null or days_ago >= 0),
  constraint deal_comps_order_chk check (comp_order is null or (comp_order >= 1 and comp_order <= 3))
);

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  seller_id uuid not null references public.users(id) on delete cascade,
  address text not null,
  city text,
  state text,
  zip text,
  beds integer,
  baths numeric(4,1),
  sqft integer,
  year_built integer,
  arv numeric(12,2),
  asking_price numeric(12,2),
  assignment_fee numeric(12,2),
  reno_estimate numeric(12,2),
  equity numeric(12,2),
  roi numeric(8,2),
  deal_type text,
  condition text,
  description text,
  highlights text[] not null default '{}',
  status public.listing_status_enum not null default 'active',
  days_on_market integer not null default 0,
  view_count integer not null default 0,
  save_count integer not null default 0,
  published_at timestamptz not null default now(),
  closed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint marketplace_beds_chk check (beds is null or beds >= 0),
  constraint marketplace_baths_chk check (baths is null or baths >= 0),
  constraint marketplace_sqft_chk check (sqft is null or sqft >= 0),
  constraint marketplace_year_chk check (year_built is null or year_built >= 1700),
  constraint marketplace_arv_chk check (arv is null or arv >= 0),
  constraint marketplace_ask_chk check (asking_price is null or asking_price >= 0),
  constraint marketplace_fee_chk check (assignment_fee is null or assignment_fee >= 0),
  constraint marketplace_reno_chk check (reno_estimate is null or reno_estimate >= 0),
  constraint marketplace_equity_chk check (equity is null or equity >= 0),
  constraint marketplace_deal_type_chk check (deal_type is null or deal_type in ('wholesale', 'fix_and_flip', 'buy_and_hold', 'novations', 'wholetail', 'rental')),
  constraint marketplace_condition_chk check (condition is null or condition in ('excellent', 'good', 'fair', 'rough')),
  constraint marketplace_dom_chk check (days_on_market >= 0),
  constraint marketplace_views_chk check (view_count >= 0),
  constraint marketplace_saves_chk check (save_count >= 0)
);

create table if not exists public.marketplace_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  saved_at timestamptz not null default now(),
  constraint marketplace_saves_unique unique (user_id, listing_id)
);

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  template_type public.contract_template_enum not null,
  name text not null,
  description text,
  form_fields jsonb not null default '[]'::jsonb,
  clauses jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals(id) on delete set null,
  creator_id uuid not null references public.users(id) on delete cascade,
  template public.contract_template_enum not null,
  status public.contract_status_enum not null default 'draft',
  title text,
  fee_amount numeric(12,2),
  fee_pct numeric(5,2) not null default 1.50,
  pdf_url text,
  created_at timestamptz not null default now(),
  executed_at timestamptz,
  constraint contracts_fee_amount_chk check (fee_amount is null or fee_amount >= 0),
  constraint contracts_fee_pct_chk check (fee_pct >= 0 and fee_pct <= 100)
);

create table if not exists public.contract_parties (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  role text not null,
  name text,
  email text,
  phone text,
  party_order integer,
  constraint contract_parties_order_unique unique (contract_id, party_order),
  constraint contract_parties_order_chk check (party_order is null or party_order > 0)
);

create table if not exists public.contract_form_values (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  field_key text not null,
  field_value text,
  constraint contract_form_values_unique unique (contract_id, field_key)
);

create table if not exists public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  party_id uuid references public.contract_parties(id) on delete set null,
  signer_name text not null,
  signer_email text not null,
  signer_ip inet not null,
  signed_at timestamptz not null default now(),
  sig_method public.signature_method_enum not null,
  sig_image_url text,
  doc_hash text not null,
  party_role text,
  constraint contract_signatures_party_unique unique (contract_id, party_id)
);

create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references public.users(id) on delete cascade,
  lead_name text,
  phone text,
  address text,
  outcome public.call_outcome_enum,
  notes text,
  duration_sec integer,
  called_at timestamptz not null default now(),
  constraint call_logs_duration_chk check (duration_sec is null or duration_sec >= 0)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text,
  phone text,
  address text,
  equity numeric(12,2),
  avm_value numeric(12,2),
  status text,
  lead_type text,
  tags text[] not null default '{}',
  source text,
  added_at timestamptz not null default now(),
  last_contacted timestamptz,
  constraint leads_equity_chk check (equity is null or equity >= 0),
  constraint leads_avm_chk check (avm_value is null or avm_value >= 0)
);

create table if not exists public.sms_sequences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  status public.sequence_status_enum not null default 'draft',
  lead_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint sms_sequences_lead_count_chk check (lead_count >= 0)
);

create table if not exists public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.sms_sequences(id) on delete cascade,
  step_order integer not null,
  day_offset integer not null,
  type public.sequence_step_type_enum not null,
  message text,
  constraint sequence_steps_unique unique (sequence_id, step_order),
  constraint sequence_steps_order_chk check (step_order > 0),
  constraint sequence_steps_day_offset_chk check (day_offset >= 0)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plan text not null,
  price_monthly numeric(8,2) not null,
  stripe_sub_id text,
  status public.subscription_status_enum not null,
  started_at timestamptz not null default now(),
  next_billing timestamptz,
  canceled_at timestamptz,
  constraint subscriptions_price_chk check (price_monthly >= 0)
);

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pack_tier public.credit_pack_tier_enum not null,
  credits_purchased integer not null,
  credits_remaining integer not null,
  amount_paid numeric(8,2) not null,
  stripe_payment_id text,
  purchased_at timestamptz not null default now(),
  constraint credit_purchases_purchased_chk check (credits_purchased >= 0),
  constraint credit_purchases_remaining_chk check (credits_remaining >= 0 and credits_remaining <= credits_purchased),
  constraint credit_purchases_amount_chk check (amount_paid >= 0)
);

create table if not exists public.platform_fees (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  assignment_fee numeric(12,2) not null,
  fee_amount numeric(12,2) not null,
  wholesaler_net numeric(12,2) not null,
  status public.platform_fee_status_enum not null default 'pending',
  stripe_transfer_id text,
  closed_at timestamptz,
  constraint platform_fees_assignment_chk check (assignment_fee >= 0),
  constraint platform_fees_fee_chk check (fee_amount >= 0),
  constraint platform_fees_net_chk check (wholesaler_net >= 0)
);

create table if not exists public.contractor_job_leads (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractor_profiles(id) on delete set null,
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  created_by uuid not null references public.users(id) on delete cascade,
  trade_required text not null,
  city text,
  budget_min numeric(10,2),
  budget_max numeric(10,2),
  notes text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint contractor_job_leads_budget_min_chk check (budget_min is null or budget_min >= 0),
  constraint contractor_job_leads_budget_max_chk check (budget_max is null or budget_max >= 0),
  constraint contractor_job_leads_budget_pair_chk check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index if not exists idx_users_email on public.users(email);

create index if not exists idx_contractor_profiles_user_id on public.contractor_profiles(user_id);
create index if not exists idx_contractor_trades_contractor_id on public.contractor_trades(contractor_id);
create index if not exists idx_contractor_trades_trade on public.contractor_trades(trade);

create index if not exists idx_realtor_profiles_user_id on public.realtor_profiles(user_id);
create index if not exists idx_realtor_markets_realtor_id on public.realtor_markets(realtor_id);
create index if not exists idx_realtor_markets_city on public.realtor_markets(city);
create index if not exists idx_realtor_specialties_realtor_id on public.realtor_specialties(realtor_id);

create index if not exists idx_deals_user_stage on public.deals(user_id, stage);
create index if not exists idx_deal_comps_deal_id on public.deal_comps(deal_id);

create index if not exists idx_marketplace_listings_status_city on public.marketplace_listings(status, city);
create index if not exists idx_marketplace_listings_seller_id on public.marketplace_listings(seller_id);
create index if not exists idx_marketplace_saves_user_id on public.marketplace_saves(user_id);
create index if not exists idx_marketplace_saves_listing_id on public.marketplace_saves(listing_id);

create index if not exists idx_contracts_status_creator on public.contracts(status, creator_id);
create index if not exists idx_contracts_deal_id on public.contracts(deal_id);
create index if not exists idx_contract_parties_contract_id on public.contract_parties(contract_id);
create index if not exists idx_contract_form_values_contract_id on public.contract_form_values(contract_id);
create index if not exists idx_contract_signatures_contract_id on public.contract_signatures(contract_id);
create index if not exists idx_contract_signatures_signed_at on public.contract_signatures(signed_at);

create index if not exists idx_call_logs_caller_called_at on public.call_logs(caller_id, called_at desc);
create index if not exists idx_leads_owner_status on public.leads(owner_id, status);

create index if not exists idx_sms_sequences_owner_id on public.sms_sequences(owner_id);
create index if not exists idx_sequence_steps_sequence_id on public.sequence_steps(sequence_id);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_credit_purchases_user_id on public.credit_purchases(user_id);
create index if not exists idx_platform_fees_contract_id on public.platform_fees(contract_id);
create index if not exists idx_platform_fees_listing_id on public.platform_fees(listing_id);
create unique index if not exists uq_platform_fees_contract_id on public.platform_fees(contract_id) where contract_id is not null;

create index if not exists idx_contractor_job_leads_contractor_id on public.contractor_job_leads(contractor_id);
create index if not exists idx_contractor_job_leads_trade_required on public.contractor_job_leads(trade_required);

-- ---------------------------------------------------------------------------
-- UTILITY FUNCTIONS + TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_deals_updated_at on public.deals;
create trigger tr_deals_updated_at
before update on public.deals
for each row
execute function public.touch_updated_at();

drop trigger if exists tr_marketplace_listings_updated_at on public.marketplace_listings;
create trigger tr_marketplace_listings_updated_at
before update on public.marketplace_listings
for each row
execute function public.touch_updated_at();

create or replace function public.prevent_contract_signature_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'contract_signatures rows are immutable';
end;
$$;

drop trigger if exists tr_contract_signatures_no_update on public.contract_signatures;
create trigger tr_contract_signatures_no_update
before update on public.contract_signatures
for each row
execute function public.prevent_contract_signature_mutation();

drop trigger if exists tr_contract_signatures_no_delete on public.contract_signatures;
create trigger tr_contract_signatures_no_delete
before delete on public.contract_signatures
for each row
execute function public.prevent_contract_signature_mutation();

-- ---------------------------------------------------------------------------
-- DEAL MATH FUNCTIONS
-- ---------------------------------------------------------------------------
create or replace function public.calculate_offer(
  arv numeric,
  pct numeric,
  reno_total numeric,
  soft_total numeric,
  hm_rate numeric,
  hm_months integer,
  hm_points numeric
) returns numeric
language plpgsql
as $$
declare
  hm_mult numeric;
begin
  hm_mult := 1 + (coalesce(hm_rate, 0) / 100) * (coalesce(hm_months, 0) / 12.0) + (coalesce(hm_points, 0) / 100);
  return greatest(0, round(((coalesce(arv, 0) * coalesce(pct, 0) / 100) - coalesce(reno_total, 0) - coalesce(soft_total, 0)) / nullif(hm_mult, 0)));
end;
$$;

create or replace function public.calculate_profit_roi(
  arv numeric,
  offer_price numeric,
  reno_total numeric,
  total_hm numeric,
  total_holding numeric,
  total_selling numeric
) returns table (
  net_profit numeric,
  roi numeric,
  all_in_cost numeric
)
language plpgsql
as $$
declare
  v_all_in numeric;
  v_profit numeric;
  v_roi numeric;
begin
  v_all_in := coalesce(offer_price, 0) + coalesce(reno_total, 0) + coalesce(total_hm, 0) + coalesce(total_holding, 0) + coalesce(total_selling, 0);
  v_profit := coalesce(arv, 0) - v_all_in;
  v_roi := case when v_all_in > 0 then (v_profit / v_all_in) * 100 else 0 end;

  return query select v_profit, v_roi, v_all_in;
end;
$$;

create or replace function public.calculate_wholesale_fee_math(
  contract_price numeric,
  assignment_fee numeric
) returns table (
  buyer_total numeric,
  wholesaler_net numeric,
  dealbank_fee numeric
)
language plpgsql
as $$
begin
  return query
  select
    coalesce(contract_price, 0) + coalesce(assignment_fee, 0),
    round(coalesce(assignment_fee, 0) * 0.985, 2),
    round(coalesce(assignment_fee, 0) * 0.015, 2);
end;
$$;

create or replace function public.handle_contract_fee_on_execution()
returns trigger
language plpgsql
as $$
declare
  v_listing_id uuid;
  v_assignment_fee numeric;
  v_fee numeric;
  v_net numeric;
begin
  if new.status <> 'fully_executed' then
    return new;
  end if;

  if old.status = 'fully_executed' then
    return new;
  end if;

  if new.template <> 'assignment' then
    return new;
  end if;

  v_assignment_fee := coalesce(new.fee_amount, 0);
  if v_assignment_fee <= 0 then
    return new;
  end if;

  v_fee := round(v_assignment_fee * coalesce(new.fee_pct, 1.5) / 100, 2);
  v_net := greatest(0, round(v_assignment_fee - v_fee, 2));

  if new.deal_id is not null then
    select ml.id
      into v_listing_id
    from public.marketplace_listings ml
    where ml.deal_id = new.deal_id
    order by ml.published_at desc
    limit 1;
  end if;

  insert into public.platform_fees (
    contract_id,
    listing_id,
    assignment_fee,
    fee_amount,
    wholesaler_net,
    status,
    closed_at
  )
  values (
    new.id,
    v_listing_id,
    v_assignment_fee,
    v_fee,
    v_net,
    'pending',
    now()
  )
  on conflict (contract_id) do nothing;

  return new;
end;
$$;

drop trigger if exists tr_contracts_platform_fee on public.contracts;
create trigger tr_contracts_platform_fee
after update of status on public.contracts
for each row
execute function public.handle_contract_fee_on_execution();

create or replace function public.recompute_deal_kpis(p_deal_id uuid)
returns void
language plpgsql
as $$
declare
  d record;
  v_reno numeric;
  v_hm numeric;
  v_holding numeric;
  v_selling numeric;
  v_all_in numeric;
  v_profit numeric;
  v_roi numeric;
  v_offer numeric;
begin
  select * into d from public.deals where id = p_deal_id;
  if not found then
    raise exception 'Deal % not found', p_deal_id;
  end if;

  v_reno := coalesce(d.reno_kitchen,0) + coalesce(d.reno_bathrooms,0) + coalesce(d.reno_flooring,0) + coalesce(d.reno_paint,0)
          + coalesce(d.reno_hvac,0) + coalesce(d.reno_plumbing,0) + coalesce(d.reno_electrical,0) + coalesce(d.reno_roof,0)
          + coalesce(d.reno_windows,0) + coalesce(d.reno_landscaping,0) + coalesce(d.reno_foundation,0) + coalesce(d.reno_misc,0);

  v_holding := (coalesce(d.hold_monthly,0) * coalesce(d.hold_months,0)) + coalesce(d.insurance_annual,0);
  v_selling := (coalesce(d.arv,0) * coalesce(d.agent_fee_pct,0) / 100) + (coalesce(d.arv,0) * coalesce(d.closing_cost_pct,0) / 100);

  v_offer := public.calculate_offer(d.arv, d.offer_pct, v_reno, (v_holding + v_selling), d.hm_rate, d.hm_months, d.hm_points);
  v_hm := coalesce(v_offer,0) * (coalesce(d.hm_rate,0) / 100) * (coalesce(d.hm_months,0) / 12.0)
        + coalesce(v_offer,0) * (coalesce(d.hm_points,0) / 100);

  v_all_in := coalesce(v_offer,0) + v_reno + v_hm + v_holding + v_selling;
  v_profit := coalesce(d.arv,0) - v_all_in;
  v_roi := case when v_all_in > 0 then (v_profit / v_all_in) * 100 else 0 end;

  update public.deals
  set
    offer_price = v_offer,
    total_reno = v_reno,
    total_hm = v_hm,
    total_holding = v_holding,
    total_selling = v_selling,
    all_in_cost = v_all_in,
    net_profit = v_profit,
    roi = v_roi,
    updated_at = now()
  where id = p_deal_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- ADMIN HELPER
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.type = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.contractor_profiles enable row level security;
alter table public.contractor_trades enable row level security;
alter table public.realtor_profiles enable row level security;
alter table public.realtor_markets enable row level security;
alter table public.realtor_specialties enable row level security;
alter table public.deals enable row level security;
alter table public.deal_comps enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_saves enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_parties enable row level security;
alter table public.contract_form_values enable row level security;
alter table public.contract_signatures enable row level security;
alter table public.call_logs enable row level security;
alter table public.leads enable row level security;
alter table public.sms_sequences enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.subscriptions enable row level security;
alter table public.credit_purchases enable row level security;
alter table public.platform_fees enable row level security;
alter table public.contractor_job_leads enable row level security;

-- users
drop policy if exists users_select_self_or_admin on public.users;
create policy users_select_self_or_admin on public.users
for select
using (id = auth.uid() or public.is_admin());

drop policy if exists users_insert_self_or_admin on public.users;
create policy users_insert_self_or_admin on public.users
for insert
with check (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self_or_admin on public.users;
create policy users_update_self_or_admin on public.users
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists users_delete_admin on public.users;
create policy users_delete_admin on public.users
for delete
using (public.is_admin());

-- contractor_profiles
drop policy if exists contractor_profiles_select_all_authed on public.contractor_profiles;
create policy contractor_profiles_select_all_authed on public.contractor_profiles
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists contractor_profiles_insert_owner_or_admin on public.contractor_profiles;
create policy contractor_profiles_insert_owner_or_admin on public.contractor_profiles
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists contractor_profiles_update_owner_or_admin on public.contractor_profiles;
create policy contractor_profiles_update_owner_or_admin on public.contractor_profiles
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists contractor_profiles_delete_owner_or_admin on public.contractor_profiles;
create policy contractor_profiles_delete_owner_or_admin on public.contractor_profiles
for delete
using (user_id = auth.uid() or public.is_admin());

-- contractor_trades
drop policy if exists contractor_trades_select_all_authed on public.contractor_trades;
create policy contractor_trades_select_all_authed on public.contractor_trades
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists contractor_trades_insert_owner_or_admin on public.contractor_trades;
create policy contractor_trades_insert_owner_or_admin on public.contractor_trades
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contractor_profiles cp
    where cp.id = contractor_trades.contractor_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists contractor_trades_update_owner_or_admin on public.contractor_trades;
create policy contractor_trades_update_owner_or_admin on public.contractor_trades
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.contractor_profiles cp
    where cp.id = contractor_trades.contractor_id
      and cp.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contractor_profiles cp
    where cp.id = contractor_trades.contractor_id
      and cp.user_id = auth.uid()
  )
);

drop policy if exists contractor_trades_delete_owner_or_admin on public.contractor_trades;
create policy contractor_trades_delete_owner_or_admin on public.contractor_trades
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.contractor_profiles cp
    where cp.id = contractor_trades.contractor_id
      and cp.user_id = auth.uid()
  )
);

-- realtor profiles/taxonomy
drop policy if exists realtor_profiles_select_all_authed on public.realtor_profiles;
create policy realtor_profiles_select_all_authed on public.realtor_profiles
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists realtor_profiles_insert_owner_or_admin on public.realtor_profiles;
create policy realtor_profiles_insert_owner_or_admin on public.realtor_profiles
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists realtor_profiles_update_owner_or_admin on public.realtor_profiles;
create policy realtor_profiles_update_owner_or_admin on public.realtor_profiles
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists realtor_profiles_delete_owner_or_admin on public.realtor_profiles;
create policy realtor_profiles_delete_owner_or_admin on public.realtor_profiles
for delete
using (user_id = auth.uid() or public.is_admin());

drop policy if exists realtor_markets_select_all_authed on public.realtor_markets;
create policy realtor_markets_select_all_authed on public.realtor_markets
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists realtor_markets_insert_owner_or_admin on public.realtor_markets;
create policy realtor_markets_insert_owner_or_admin on public.realtor_markets
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_markets.realtor_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists realtor_markets_update_owner_or_admin on public.realtor_markets;
create policy realtor_markets_update_owner_or_admin on public.realtor_markets
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_markets.realtor_id
      and rp.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_markets.realtor_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists realtor_markets_delete_owner_or_admin on public.realtor_markets;
create policy realtor_markets_delete_owner_or_admin on public.realtor_markets
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_markets.realtor_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists realtor_specialties_select_all_authed on public.realtor_specialties;
create policy realtor_specialties_select_all_authed on public.realtor_specialties
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists realtor_specialties_insert_owner_or_admin on public.realtor_specialties;
create policy realtor_specialties_insert_owner_or_admin on public.realtor_specialties
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_specialties.realtor_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists realtor_specialties_update_owner_or_admin on public.realtor_specialties;
create policy realtor_specialties_update_owner_or_admin on public.realtor_specialties
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_specialties.realtor_id
      and rp.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_specialties.realtor_id
      and rp.user_id = auth.uid()
  )
);

drop policy if exists realtor_specialties_delete_owner_or_admin on public.realtor_specialties;
create policy realtor_specialties_delete_owner_or_admin on public.realtor_specialties
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.realtor_profiles rp
    where rp.id = realtor_specialties.realtor_id
      and rp.user_id = auth.uid()
  )
);

-- deals + comps
drop policy if exists deals_select_owner_or_admin on public.deals;
create policy deals_select_owner_or_admin on public.deals
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists deals_insert_owner_or_admin on public.deals;
create policy deals_insert_owner_or_admin on public.deals
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists deals_update_owner_or_admin on public.deals;
create policy deals_update_owner_or_admin on public.deals
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists deals_delete_owner_or_admin on public.deals;
create policy deals_delete_owner_or_admin on public.deals
for delete
using (user_id = auth.uid() or public.is_admin());

drop policy if exists deal_comps_select_owner_or_admin on public.deal_comps;
create policy deal_comps_select_owner_or_admin on public.deal_comps
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.deals d
    where d.id = deal_comps.deal_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists deal_comps_insert_owner_or_admin on public.deal_comps;
create policy deal_comps_insert_owner_or_admin on public.deal_comps
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.deals d
    where d.id = deal_comps.deal_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists deal_comps_update_owner_or_admin on public.deal_comps;
create policy deal_comps_update_owner_or_admin on public.deal_comps
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.deals d
    where d.id = deal_comps.deal_id
      and d.user_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.deals d
    where d.id = deal_comps.deal_id
      and d.user_id = auth.uid()
  )
);

drop policy if exists deal_comps_delete_owner_or_admin on public.deal_comps;
create policy deal_comps_delete_owner_or_admin on public.deal_comps
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.deals d
    where d.id = deal_comps.deal_id
      and d.user_id = auth.uid()
  )
);

-- marketplace listings
drop policy if exists marketplace_listings_select_policy on public.marketplace_listings;
create policy marketplace_listings_select_policy on public.marketplace_listings
for select
using (
  public.is_admin()
  or seller_id = auth.uid()
  or (
    status = 'active'
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.type in ('dealmaker', 'contractor')
    )
  )
  or (
    status = 'active'
    and exists (
      select 1
      from public.users u
      join public.realtor_profiles rp on rp.user_id = u.id
      join public.realtor_markets rm on rm.realtor_id = rp.id
      where u.id = auth.uid()
        and u.type = 'realtor'
        and lower(rm.city) = lower(marketplace_listings.city)
    )
  )
);

drop policy if exists marketplace_listings_insert_owner_or_admin on public.marketplace_listings;
create policy marketplace_listings_insert_owner_or_admin on public.marketplace_listings
for insert
with check (
  public.is_admin()
  or (
    seller_id = auth.uid()
    and exists (
      select 1 from public.users u where u.id = auth.uid() and u.type = 'dealmaker'
    )
  )
);

drop policy if exists marketplace_listings_update_owner_or_admin on public.marketplace_listings;
create policy marketplace_listings_update_owner_or_admin on public.marketplace_listings
for update
using (seller_id = auth.uid() or public.is_admin())
with check (seller_id = auth.uid() or public.is_admin());

drop policy if exists marketplace_listings_delete_owner_or_admin on public.marketplace_listings;
create policy marketplace_listings_delete_owner_or_admin on public.marketplace_listings
for delete
using (seller_id = auth.uid() or public.is_admin());

-- marketplace saves
drop policy if exists marketplace_saves_select_owner_or_admin on public.marketplace_saves;
create policy marketplace_saves_select_owner_or_admin on public.marketplace_saves
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists marketplace_saves_insert_owner_or_admin on public.marketplace_saves;
create policy marketplace_saves_insert_owner_or_admin on public.marketplace_saves
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists marketplace_saves_delete_owner_or_admin on public.marketplace_saves;
create policy marketplace_saves_delete_owner_or_admin on public.marketplace_saves
for delete
using (user_id = auth.uid() or public.is_admin());

-- contract templates
drop policy if exists contract_templates_select_all_authed on public.contract_templates;
create policy contract_templates_select_all_authed on public.contract_templates
for select
using (auth.uid() is not null or public.is_admin());

drop policy if exists contract_templates_admin_write on public.contract_templates;
create policy contract_templates_admin_write on public.contract_templates
for all
using (public.is_admin())
with check (public.is_admin());

-- contracts
drop policy if exists contracts_select_owner_or_admin on public.contracts;
create policy contracts_select_owner_or_admin on public.contracts
for select
using (creator_id = auth.uid() or public.is_admin());

drop policy if exists contracts_insert_owner_or_admin on public.contracts;
create policy contracts_insert_owner_or_admin on public.contracts
for insert
with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists contracts_update_owner_or_admin on public.contracts;
create policy contracts_update_owner_or_admin on public.contracts
for update
using (creator_id = auth.uid() or public.is_admin())
with check (creator_id = auth.uid() or public.is_admin());

drop policy if exists contracts_delete_admin on public.contracts;
create policy contracts_delete_admin on public.contracts
for delete
using (public.is_admin());

-- contract parties
drop policy if exists contract_parties_select_owner_or_admin on public.contract_parties;
create policy contract_parties_select_owner_or_admin on public.contract_parties
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_parties.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_parties_insert_owner_or_admin on public.contract_parties;
create policy contract_parties_insert_owner_or_admin on public.contract_parties
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_parties.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_parties_update_owner_or_admin on public.contract_parties;
create policy contract_parties_update_owner_or_admin on public.contract_parties
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_parties.contract_id
      and c.creator_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_parties.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_parties_delete_owner_or_admin on public.contract_parties;
create policy contract_parties_delete_owner_or_admin on public.contract_parties
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_parties.contract_id
      and c.creator_id = auth.uid()
  )
);

-- contract form values
drop policy if exists contract_form_values_select_owner_or_admin on public.contract_form_values;
create policy contract_form_values_select_owner_or_admin on public.contract_form_values
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_form_values.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_form_values_insert_owner_or_admin on public.contract_form_values;
create policy contract_form_values_insert_owner_or_admin on public.contract_form_values
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_form_values.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_form_values_update_owner_or_admin on public.contract_form_values;
create policy contract_form_values_update_owner_or_admin on public.contract_form_values
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_form_values.contract_id
      and c.creator_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_form_values.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_form_values_delete_owner_or_admin on public.contract_form_values;
create policy contract_form_values_delete_owner_or_admin on public.contract_form_values
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_form_values.contract_id
      and c.creator_id = auth.uid()
  )
);

-- contract signatures: immutable, no update/delete policies
drop policy if exists contract_signatures_select_owner_or_admin on public.contract_signatures;
create policy contract_signatures_select_owner_or_admin on public.contract_signatures
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_signatures.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_signatures_insert_owner_or_admin on public.contract_signatures;
create policy contract_signatures_insert_owner_or_admin on public.contract_signatures
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_signatures.contract_id
      and c.creator_id = auth.uid()
  )
);

-- call logs
drop policy if exists call_logs_select_owner_or_admin on public.call_logs;
create policy call_logs_select_owner_or_admin on public.call_logs
for select
using (caller_id = auth.uid() or public.is_admin());

drop policy if exists call_logs_insert_owner_or_admin on public.call_logs;
create policy call_logs_insert_owner_or_admin on public.call_logs
for insert
with check (caller_id = auth.uid() or public.is_admin());

drop policy if exists call_logs_update_owner_or_admin on public.call_logs;
create policy call_logs_update_owner_or_admin on public.call_logs
for update
using (caller_id = auth.uid() or public.is_admin())
with check (caller_id = auth.uid() or public.is_admin());

drop policy if exists call_logs_delete_owner_or_admin on public.call_logs;
create policy call_logs_delete_owner_or_admin on public.call_logs
for delete
using (caller_id = auth.uid() or public.is_admin());

-- leads
drop policy if exists leads_select_owner_or_admin on public.leads;
create policy leads_select_owner_or_admin on public.leads
for select
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists leads_insert_owner_or_admin on public.leads;
create policy leads_insert_owner_or_admin on public.leads
for insert
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists leads_update_owner_or_admin on public.leads;
create policy leads_update_owner_or_admin on public.leads
for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists leads_delete_owner_or_admin on public.leads;
create policy leads_delete_owner_or_admin on public.leads
for delete
using (owner_id = auth.uid() or public.is_admin());

-- sequences
drop policy if exists sms_sequences_select_owner_or_admin on public.sms_sequences;
create policy sms_sequences_select_owner_or_admin on public.sms_sequences
for select
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_sequences_insert_owner_or_admin on public.sms_sequences;
create policy sms_sequences_insert_owner_or_admin on public.sms_sequences
for insert
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_sequences_update_owner_or_admin on public.sms_sequences;
create policy sms_sequences_update_owner_or_admin on public.sms_sequences
for update
using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists sms_sequences_delete_owner_or_admin on public.sms_sequences;
create policy sms_sequences_delete_owner_or_admin on public.sms_sequences
for delete
using (owner_id = auth.uid() or public.is_admin());

drop policy if exists sequence_steps_select_owner_or_admin on public.sequence_steps;
create policy sequence_steps_select_owner_or_admin on public.sequence_steps
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.sms_sequences s
    where s.id = sequence_steps.sequence_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists sequence_steps_insert_owner_or_admin on public.sequence_steps;
create policy sequence_steps_insert_owner_or_admin on public.sequence_steps
for insert
with check (
  public.is_admin() or
  exists (
    select 1
    from public.sms_sequences s
    where s.id = sequence_steps.sequence_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists sequence_steps_update_owner_or_admin on public.sequence_steps;
create policy sequence_steps_update_owner_or_admin on public.sequence_steps
for update
using (
  public.is_admin() or
  exists (
    select 1
    from public.sms_sequences s
    where s.id = sequence_steps.sequence_id
      and s.owner_id = auth.uid()
  )
)
with check (
  public.is_admin() or
  exists (
    select 1
    from public.sms_sequences s
    where s.id = sequence_steps.sequence_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists sequence_steps_delete_owner_or_admin on public.sequence_steps;
create policy sequence_steps_delete_owner_or_admin on public.sequence_steps
for delete
using (
  public.is_admin() or
  exists (
    select 1
    from public.sms_sequences s
    where s.id = sequence_steps.sequence_id
      and s.owner_id = auth.uid()
  )
);

-- subscriptions + credits
drop policy if exists subscriptions_select_owner_or_admin on public.subscriptions;
create policy subscriptions_select_owner_or_admin on public.subscriptions
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists subscriptions_insert_owner_or_admin on public.subscriptions;
create policy subscriptions_insert_owner_or_admin on public.subscriptions
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists subscriptions_update_owner_or_admin on public.subscriptions;
create policy subscriptions_update_owner_or_admin on public.subscriptions
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists subscriptions_delete_admin on public.subscriptions;
create policy subscriptions_delete_admin on public.subscriptions
for delete
using (public.is_admin());

drop policy if exists credit_purchases_select_owner_or_admin on public.credit_purchases;
create policy credit_purchases_select_owner_or_admin on public.credit_purchases
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists credit_purchases_insert_owner_or_admin on public.credit_purchases;
create policy credit_purchases_insert_owner_or_admin on public.credit_purchases
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists credit_purchases_update_owner_or_admin on public.credit_purchases;
create policy credit_purchases_update_owner_or_admin on public.credit_purchases
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists credit_purchases_delete_admin on public.credit_purchases;
create policy credit_purchases_delete_admin on public.credit_purchases
for delete
using (public.is_admin());

-- platform fees
drop policy if exists platform_fees_select_related_or_admin on public.platform_fees;
create policy platform_fees_select_related_or_admin on public.platform_fees
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = platform_fees.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists platform_fees_insert_admin on public.platform_fees;
create policy platform_fees_insert_admin on public.platform_fees
for insert
with check (public.is_admin());

drop policy if exists platform_fees_update_admin on public.platform_fees;
create policy platform_fees_update_admin on public.platform_fees
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists platform_fees_delete_admin on public.platform_fees;
create policy platform_fees_delete_admin on public.platform_fees
for delete
using (public.is_admin());

-- contractor job leads (contractor sees only relevant trade)
drop policy if exists contractor_job_leads_select_relevant on public.contractor_job_leads;
create policy contractor_job_leads_select_relevant on public.contractor_job_leads
for select
using (
  public.is_admin()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.contractor_profiles cp
    join public.contractor_trades ct on ct.contractor_id = cp.id
    where cp.user_id = auth.uid()
      and (contractor_job_leads.contractor_id is null or contractor_job_leads.contractor_id = cp.id)
      and (contractor_job_leads.city is null or lower(contractor_job_leads.city) = lower(cp.city))
      and lower(ct.trade) = lower(contractor_job_leads.trade_required)
  )
);

drop policy if exists contractor_job_leads_insert_dealmaker_or_admin on public.contractor_job_leads;
create policy contractor_job_leads_insert_dealmaker_or_admin on public.contractor_job_leads
for insert
with check (
  public.is_admin()
  or (
    created_by = auth.uid()
    and exists (
      select 1 from public.users u where u.id = auth.uid() and u.type = 'dealmaker'
    )
  )
);

drop policy if exists contractor_job_leads_update_owner_or_relevant_or_admin on public.contractor_job_leads;
create policy contractor_job_leads_update_owner_or_relevant_or_admin on public.contractor_job_leads
for update
using (
  public.is_admin()
  or created_by = auth.uid()
  or exists (
    select 1
    from public.contractor_profiles cp
    join public.contractor_trades ct on ct.contractor_id = cp.id
    where cp.user_id = auth.uid()
      and (contractor_job_leads.contractor_id is null or contractor_job_leads.contractor_id = cp.id)
      and (contractor_job_leads.city is null or lower(contractor_job_leads.city) = lower(cp.city))
      and lower(ct.trade) = lower(contractor_job_leads.trade_required)
  )
)
with check (
  public.is_admin() or created_by = auth.uid()
);

drop policy if exists contractor_job_leads_delete_owner_or_admin on public.contractor_job_leads;
create policy contractor_job_leads_delete_owner_or_admin on public.contractor_job_leads
for delete
using (public.is_admin() or created_by = auth.uid());
