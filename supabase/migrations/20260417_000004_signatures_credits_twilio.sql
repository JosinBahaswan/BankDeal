-- Signature IP + credits consumption + Twilio call logging support
-- Generated: 2026-04-17

alter table public.contract_signatures
  alter column signer_ip drop not null;

alter table public.call_logs
  add column if not exists twilio_call_sid text,
  add column if not exists twilio_parent_call_sid text,
  add column if not exists twilio_status text,
  add column if not exists from_number text,
  add column if not exists to_number text,
  add column if not exists recording_sid text,
  add column if not exists recording_url text,
  add column if not exists recording_status text,
  add column if not exists recording_duration_sec integer,
  add column if not exists transcription_sid text,
  add column if not exists transcription_status text,
  add column if not exists transcription_text text,
  add column if not exists raw_payload jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'call_logs_recording_duration_chk'
      and conrelid = 'public.call_logs'::regclass
  ) then
    alter table public.call_logs
      add constraint call_logs_recording_duration_chk
      check (recording_duration_sec is null or recording_duration_sec >= 0);
  end if;
end $$;

create unique index if not exists uq_call_logs_twilio_call_sid
  on public.call_logs (twilio_call_sid)
  where twilio_call_sid is not null;

create index if not exists idx_call_logs_recording_sid
  on public.call_logs (recording_sid)
  where recording_sid is not null;

create index if not exists idx_call_logs_transcription_sid
  on public.call_logs (transcription_sid)
  where transcription_sid is not null;

create or replace function public.consume_data_credits(p_credits integer)
returns table (
  consumed integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed integer := coalesce(p_credits, 0);
  v_row record;
  v_take integer;
  v_consumed integer := 0;
  v_remaining integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if v_needed <= 0 then
    raise exception 'Credits to consume must be greater than zero';
  end if;

  for v_row in
    select id, credits_remaining
    from public.credit_purchases
    where user_id = auth.uid()
      and credits_remaining > 0
    order by purchased_at asc, id asc
    for update
  loop
    exit when v_needed <= 0;

    v_take := least(v_row.credits_remaining, v_needed);

    update public.credit_purchases
    set credits_remaining = credits_remaining - v_take
    where id = v_row.id;

    v_needed := v_needed - v_take;
    v_consumed := v_consumed + v_take;
  end loop;

  if v_needed > 0 then
    raise exception 'Insufficient data credits';
  end if;

  select coalesce(sum(credits_remaining), 0)
    into v_remaining
  from public.credit_purchases
  where user_id = auth.uid();

  return query
  select v_consumed, v_remaining;
end;
$$;

revoke all on function public.consume_data_credits(integer) from public;
grant execute on function public.consume_data_credits(integer) to authenticated;
