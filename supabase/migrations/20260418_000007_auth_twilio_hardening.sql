-- Auth + Twilio production hardening
-- Generated: 2026-04-18

alter table public.users
  alter column password_hash drop not null;

update public.users
set password_hash = null
where password_hash = 'supabase_auth_managed';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_password_hash_bcrypt_chk'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_password_hash_bcrypt_chk
      check (
        password_hash is null
        or password_hash ~ '^\\$2[abxy]?\\$[0-9]{2}\\$[./A-Za-z0-9]{53}$'
      );
  end if;
end $$;

create or replace function public.guard_users_password_hash()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.password_hash is not null then
      raise exception 'password_hash is server-managed for authenticated clients';
    end if;

    return new;
  end if;

  if new.password_hash is distinct from old.password_hash then
    raise exception 'password_hash is server-managed for authenticated clients';
  end if;

  return new;
end;
$$;

drop trigger if exists tr_users_guard_password_hash on public.users;
create trigger tr_users_guard_password_hash
before insert or update on public.users
for each row
execute function public.guard_users_password_hash();

-- Keep webhook upserts resilient when executed through service role contexts.
drop policy if exists call_logs_select_owner_or_admin on public.call_logs;
create policy call_logs_select_owner_or_admin on public.call_logs
for select
using (
  caller_id = auth.uid()
  or public.is_admin()
  or auth.role() = 'service_role'
);

drop policy if exists call_logs_insert_owner_or_admin on public.call_logs;
create policy call_logs_insert_owner_or_admin on public.call_logs
for insert
with check (
  caller_id = auth.uid()
  or public.is_admin()
  or auth.role() = 'service_role'
);

drop policy if exists call_logs_update_owner_or_admin on public.call_logs;
create policy call_logs_update_owner_or_admin on public.call_logs
for update
using (
  caller_id = auth.uid()
  or public.is_admin()
  or auth.role() = 'service_role'
)
with check (
  caller_id = auth.uid()
  or public.is_admin()
  or auth.role() = 'service_role'
);

drop policy if exists call_logs_delete_owner_or_admin on public.call_logs;
create policy call_logs_delete_owner_or_admin on public.call_logs
for delete
using (
  caller_id = auth.uid()
  or public.is_admin()
  or auth.role() = 'service_role'
);
