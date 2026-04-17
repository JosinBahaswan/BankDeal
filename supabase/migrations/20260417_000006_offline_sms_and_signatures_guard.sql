-- Offline pipeline + SMS dispatch queue + signature delete guard
-- Generated: 2026-04-17

alter table public.leads
  add column if not exists listing_id uuid references public.marketplace_listings(id) on delete set null;

create unique index if not exists uq_leads_owner_listing
  on public.leads (owner_id, listing_id)
  where listing_id is not null;

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

-- Ensure immutable signature rows cannot be deleted even if permissive delete policies are introduced later.
drop policy if exists contract_signatures_delete_owner_or_admin on public.contract_signatures;
drop policy if exists contract_signatures_delete_forbidden on public.contract_signatures;
create policy contract_signatures_delete_forbidden on public.contract_signatures
as restrictive
for delete
using (false);
