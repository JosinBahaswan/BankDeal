-- eSign + Stripe production hardening
-- Generated: 2026-04-18

alter table public.contract_signatures
  add column if not exists signer_user_id uuid references public.users(id) on delete set null,
  add column if not exists signature_algorithm text,
  add column if not exists signature_payload text,
  add column if not exists signature_value text,
  add column if not exists signing_cert_fingerprint text,
  add column if not exists signing_cert_pem text,
  add column if not exists server_signed_at timestamptz;

create table if not exists public.contract_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  recipient_email text not null,
  recipient_name text,
  recipient_role text not null default 'signer',
  channel text not null default 'email',
  status text not null default 'pending',
  attempt_count integer not null default 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz not null default now(),
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contract_delivery_attempts_status_chk check (status in ('pending', 'processing', 'delivered', 'failed')),
  constraint contract_delivery_attempts_attempt_count_chk check (attempt_count >= 0),
  constraint contract_delivery_attempts_unique_recipient unique (contract_id, recipient_email, recipient_role, channel)
);

create index if not exists idx_contract_delivery_attempts_next_retry
  on public.contract_delivery_attempts(next_retry_at)
  where status in ('pending', 'failed');

create index if not exists idx_contract_delivery_attempts_contract
  on public.contract_delivery_attempts(contract_id);

drop trigger if exists tr_contract_delivery_attempts_updated_at on public.contract_delivery_attempts;
create trigger tr_contract_delivery_attempts_updated_at
before update on public.contract_delivery_attempts
for each row
execute function public.touch_updated_at();

create table if not exists public.contract_title_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  title_company_email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  last_accessed_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_contract_title_portal_tokens_contract
  on public.contract_title_portal_tokens(contract_id);

create index if not exists idx_contract_title_portal_tokens_expires
  on public.contract_title_portal_tokens(expires_at);

create table if not exists public.lead_pull_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  candidate_count integer not null default 0,
  credits_consumed integer not null default 0,
  credits_remaining integer not null default 0,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint lead_pull_audit_candidate_chk check (candidate_count >= 0),
  constraint lead_pull_audit_consumed_chk check (credits_consumed >= 0),
  constraint lead_pull_audit_remaining_chk check (credits_remaining >= 0)
);

create index if not exists idx_lead_pull_audit_user_created
  on public.lead_pull_audit_logs(user_id, created_at desc);

alter table public.contract_delivery_attempts enable row level security;
alter table public.contract_title_portal_tokens enable row level security;
alter table public.lead_pull_audit_logs enable row level security;

-- contract_delivery_attempts

drop policy if exists contract_delivery_attempts_select_owner_or_admin on public.contract_delivery_attempts;
create policy contract_delivery_attempts_select_owner_or_admin on public.contract_delivery_attempts
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_delivery_attempts.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_delivery_attempts_insert_admin on public.contract_delivery_attempts;
create policy contract_delivery_attempts_insert_admin on public.contract_delivery_attempts
for insert
with check (public.is_admin());

drop policy if exists contract_delivery_attempts_update_admin on public.contract_delivery_attempts;
create policy contract_delivery_attempts_update_admin on public.contract_delivery_attempts
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists contract_delivery_attempts_delete_admin on public.contract_delivery_attempts;
create policy contract_delivery_attempts_delete_admin on public.contract_delivery_attempts
for delete
using (public.is_admin());

-- contract_title_portal_tokens

drop policy if exists contract_title_portal_tokens_select_owner_or_admin on public.contract_title_portal_tokens;
create policy contract_title_portal_tokens_select_owner_or_admin on public.contract_title_portal_tokens
for select
using (
  public.is_admin() or
  exists (
    select 1
    from public.contracts c
    where c.id = contract_title_portal_tokens.contract_id
      and c.creator_id = auth.uid()
  )
);

drop policy if exists contract_title_portal_tokens_insert_admin on public.contract_title_portal_tokens;
create policy contract_title_portal_tokens_insert_admin on public.contract_title_portal_tokens
for insert
with check (public.is_admin());

drop policy if exists contract_title_portal_tokens_update_admin on public.contract_title_portal_tokens;
create policy contract_title_portal_tokens_update_admin on public.contract_title_portal_tokens
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists contract_title_portal_tokens_delete_admin on public.contract_title_portal_tokens;
create policy contract_title_portal_tokens_delete_admin on public.contract_title_portal_tokens
for delete
using (public.is_admin());

-- lead_pull_audit_logs

drop policy if exists lead_pull_audit_logs_select_owner_or_admin on public.lead_pull_audit_logs;
create policy lead_pull_audit_logs_select_owner_or_admin on public.lead_pull_audit_logs
for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists lead_pull_audit_logs_insert_owner_or_admin on public.lead_pull_audit_logs;
create policy lead_pull_audit_logs_insert_owner_or_admin on public.lead_pull_audit_logs
for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists lead_pull_audit_logs_update_admin on public.lead_pull_audit_logs;
create policy lead_pull_audit_logs_update_admin on public.lead_pull_audit_logs
for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists lead_pull_audit_logs_delete_admin on public.lead_pull_audit_logs;
create policy lead_pull_audit_logs_delete_admin on public.lead_pull_audit_logs
for delete
using (public.is_admin());
