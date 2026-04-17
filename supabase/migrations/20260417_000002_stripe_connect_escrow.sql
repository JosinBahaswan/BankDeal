-- Stripe Connect + earnest money escrow support
-- Generated: 2026-04-17

do $$
begin
  if not exists (select 1 from pg_type where typname = 'escrow_status_enum') then
    create type public.escrow_status_enum as enum ('pending', 'funded', 'released', 'failed', 'refunded', 'canceled');
  end if;
end $$;

create table if not exists public.connect_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_account_id text not null unique,
  account_type text not null default 'express',
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  onboarding_completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connect_accounts_user_unique unique (user_id)
);

create table if not exists public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  payer_user_id uuid not null references public.users(id) on delete restrict,
  beneficiary_user_id uuid not null references public.users(id) on delete restrict,
  created_by uuid not null references public.users(id) on delete restrict,
  amount numeric(12,2) not null,
  currency text not null default 'usd',
  platform_fee_rate numeric(5,2) not null default 1.50,
  platform_fee_amount numeric(12,2) not null default 0,
  beneficiary_amount numeric(12,2) not null default 0,
  status public.escrow_status_enum not null default 'pending',
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  transfer_group text,
  payment_method_type text,
  release_notes text,
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint escrow_transactions_amount_chk check (amount > 0),
  constraint escrow_transactions_fee_rate_chk check (platform_fee_rate >= 0 and platform_fee_rate <= 100),
  constraint escrow_transactions_platform_fee_chk check (platform_fee_amount >= 0),
  constraint escrow_transactions_beneficiary_amount_chk check (beneficiary_amount >= 0),
  constraint escrow_transactions_currency_chk check (char_length(currency) between 3 and 10)
);

create table if not exists public.escrow_disbursements (
  id uuid primary key default gen_random_uuid(),
  escrow_id uuid not null references public.escrow_transactions(id) on delete cascade,
  beneficiary_user_id uuid not null references public.users(id) on delete restrict,
  released_by uuid not null references public.users(id) on delete restrict,
  connected_account_id text not null,
  transfer_amount numeric(12,2) not null,
  platform_fee_amount numeric(12,2) not null default 0,
  currency text not null default 'usd',
  stripe_transfer_id text unique,
  status text not null default 'succeeded',
  transfer_failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  released_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint escrow_disbursements_amount_chk check (transfer_amount >= 0),
  constraint escrow_disbursements_fee_chk check (platform_fee_amount >= 0),
  constraint escrow_disbursements_currency_chk check (char_length(currency) between 3 and 10)
);

create index if not exists idx_connect_accounts_user_id on public.connect_accounts(user_id);
create index if not exists idx_connect_accounts_stripe_account_id on public.connect_accounts(stripe_account_id);

create index if not exists idx_escrow_transactions_contract_id on public.escrow_transactions(contract_id);
create index if not exists idx_escrow_transactions_payer_user_id on public.escrow_transactions(payer_user_id);
create index if not exists idx_escrow_transactions_beneficiary_user_id on public.escrow_transactions(beneficiary_user_id);
create index if not exists idx_escrow_transactions_created_by on public.escrow_transactions(created_by);
create index if not exists idx_escrow_transactions_status on public.escrow_transactions(status);
create index if not exists idx_escrow_transactions_payment_intent_id on public.escrow_transactions(stripe_payment_intent_id);

create index if not exists idx_escrow_disbursements_escrow_id on public.escrow_disbursements(escrow_id);
create index if not exists idx_escrow_disbursements_beneficiary_user_id on public.escrow_disbursements(beneficiary_user_id);
create index if not exists idx_escrow_disbursements_released_at on public.escrow_disbursements(released_at desc);

drop trigger if exists tr_connect_accounts_updated_at on public.connect_accounts;
create trigger tr_connect_accounts_updated_at
before update on public.connect_accounts
for each row
execute function public.touch_updated_at();

drop trigger if exists tr_escrow_transactions_updated_at on public.escrow_transactions;
create trigger tr_escrow_transactions_updated_at
before update on public.escrow_transactions
for each row
execute function public.touch_updated_at();

alter table public.connect_accounts enable row level security;
alter table public.escrow_transactions enable row level security;
alter table public.escrow_disbursements enable row level security;

drop policy if exists connect_accounts_select_owner_or_admin on public.connect_accounts;
create policy connect_accounts_select_owner_or_admin on public.connect_accounts
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists connect_accounts_insert_owner_or_admin on public.connect_accounts;
create policy connect_accounts_insert_owner_or_admin on public.connect_accounts
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists connect_accounts_update_owner_or_admin on public.connect_accounts;
create policy connect_accounts_update_owner_or_admin on public.connect_accounts
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists connect_accounts_delete_admin on public.connect_accounts;
create policy connect_accounts_delete_admin on public.connect_accounts
for delete
using (public.is_admin());

drop policy if exists escrow_transactions_select_related_or_admin on public.escrow_transactions;
create policy escrow_transactions_select_related_or_admin on public.escrow_transactions
for select
using (
  public.is_admin()
  or payer_user_id = auth.uid()
  or beneficiary_user_id = auth.uid()
  or created_by = auth.uid()
);

drop policy if exists escrow_transactions_insert_dealmaker_or_admin on public.escrow_transactions;
create policy escrow_transactions_insert_dealmaker_or_admin on public.escrow_transactions
for insert
with check (
  public.is_admin()
  or (
    created_by = auth.uid()
    and exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.type = 'dealmaker'
    )
  )
);

drop policy if exists escrow_transactions_update_creator_or_admin on public.escrow_transactions;
create policy escrow_transactions_update_creator_or_admin on public.escrow_transactions
for update
using (public.is_admin() or created_by = auth.uid())
with check (public.is_admin() or created_by = auth.uid());

drop policy if exists escrow_transactions_delete_admin on public.escrow_transactions;
create policy escrow_transactions_delete_admin on public.escrow_transactions
for delete
using (public.is_admin());

drop policy if exists escrow_disbursements_select_related_or_admin on public.escrow_disbursements;
create policy escrow_disbursements_select_related_or_admin on public.escrow_disbursements
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.escrow_transactions et
    where et.id = escrow_disbursements.escrow_id
      and (
        et.payer_user_id = auth.uid()
        or et.beneficiary_user_id = auth.uid()
        or et.created_by = auth.uid()
      )
  )
);

drop policy if exists escrow_disbursements_insert_admin on public.escrow_disbursements;
create policy escrow_disbursements_insert_admin on public.escrow_disbursements
for insert
with check (public.is_admin());

drop policy if exists escrow_disbursements_update_admin on public.escrow_disbursements;
create policy escrow_disbursements_update_admin on public.escrow_disbursements
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists escrow_disbursements_delete_admin on public.escrow_disbursements;
create policy escrow_disbursements_delete_admin on public.escrow_disbursements
for delete
using (public.is_admin());
