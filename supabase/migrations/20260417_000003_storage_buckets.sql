-- Storage bucket setup + policies
-- Generated: 2026-04-17

alter table public.contractor_profiles
  add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contracts',
  'contracts',
  false,
  52428800,
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'contractor-photos',
  'contractor-photos',
  false,
  15728640,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.path_uuid_segment(path text, segment_index integer)
returns uuid
language plpgsql
immutable
as $$
declare
  segment text;
begin
  segment := split_part(path, '/', segment_index);
  if segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return segment::uuid;
  end if;
  return null;
end;
$$;

drop policy if exists contracts_bucket_select_related on storage.objects;
create policy contracts_bucket_select_related on storage.objects
for select
using (
  bucket_id = 'contracts'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and c.creator_id = auth.uid()
    )
    or exists (
      select 1
      from public.contract_parties cp
      join public.contracts c on c.id = cp.contract_id
      join public.users u on u.id = auth.uid()
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and lower(cp.email) = lower(u.email)
    )
  )
);

drop policy if exists contracts_bucket_insert_owner_or_admin on storage.objects;
create policy contracts_bucket_insert_owner_or_admin on storage.objects
for insert
with check (
  bucket_id = 'contracts'
  and coalesce((storage.foldername(storage.objects.name))[1], '') in ('contracts', 'signatures')
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and c.creator_id = auth.uid()
    )
  )
);

drop policy if exists contracts_bucket_update_owner_or_admin on storage.objects;
create policy contracts_bucket_update_owner_or_admin on storage.objects
for update
using (
  bucket_id = 'contracts'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and c.creator_id = auth.uid()
    )
  )
)
with check (
  bucket_id = 'contracts'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and c.creator_id = auth.uid()
    )
  )
);

drop policy if exists contracts_bucket_delete_owner_or_admin on storage.objects;
create policy contracts_bucket_delete_owner_or_admin on storage.objects
for delete
using (
  bucket_id = 'contracts'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.contracts c
      where c.id = public.path_uuid_segment(storage.objects.name, 2)
        and c.creator_id = auth.uid()
    )
  )
);

drop policy if exists contractor_photos_select_authed on storage.objects;
create policy contractor_photos_select_authed on storage.objects
for select
using (
  bucket_id = 'contractor-photos'
  and (auth.uid() is not null or public.is_admin())
);

drop policy if exists contractor_photos_insert_owner_or_admin on storage.objects;
create policy contractor_photos_insert_owner_or_admin on storage.objects
for insert
with check (
  bucket_id = 'contractor-photos'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'profiles'
      and coalesce((storage.foldername(storage.objects.name))[2], '') = auth.uid()::text
    )
  )
);

drop policy if exists contractor_photos_update_owner_or_admin on storage.objects;
create policy contractor_photos_update_owner_or_admin on storage.objects
for update
using (
  bucket_id = 'contractor-photos'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'profiles'
      and coalesce((storage.foldername(storage.objects.name))[2], '') = auth.uid()::text
    )
  )
)
with check (
  bucket_id = 'contractor-photos'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'profiles'
      and coalesce((storage.foldername(storage.objects.name))[2], '') = auth.uid()::text
    )
  )
);

drop policy if exists contractor_photos_delete_owner_or_admin on storage.objects;
create policy contractor_photos_delete_owner_or_admin on storage.objects
for delete
using (
  bucket_id = 'contractor-photos'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'profiles'
      and coalesce((storage.foldername(storage.objects.name))[2], '') = auth.uid()::text
    )
  )
);
