-- Property images bucket + policies
-- Generated: 2026-04-17

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  false,
  26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'image/heic']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists property_images_select_owner_or_admin on storage.objects;
create policy property_images_select_owner_or_admin on storage.objects
for select
using (
  bucket_id = 'property-images'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.deals d
      where d.id = public.path_uuid_segment(storage.objects.name, 2)
        and d.user_id = auth.uid()
    )
  )
);

drop policy if exists property_images_insert_owner_or_admin on storage.objects;
create policy property_images_insert_owner_or_admin on storage.objects
for insert
with check (
  bucket_id = 'property-images'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'deals'
      and exists (
        select 1
        from public.deals d
        where d.id = public.path_uuid_segment(storage.objects.name, 2)
          and d.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists property_images_update_owner_or_admin on storage.objects;
create policy property_images_update_owner_or_admin on storage.objects
for update
using (
  bucket_id = 'property-images'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'deals'
      and exists (
        select 1
        from public.deals d
        where d.id = public.path_uuid_segment(storage.objects.name, 2)
          and d.user_id = auth.uid()
      )
    )
  )
)
with check (
  bucket_id = 'property-images'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'deals'
      and exists (
        select 1
        from public.deals d
        where d.id = public.path_uuid_segment(storage.objects.name, 2)
          and d.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists property_images_delete_owner_or_admin on storage.objects;
create policy property_images_delete_owner_or_admin on storage.objects
for delete
using (
  bucket_id = 'property-images'
  and (
    public.is_admin()
    or (
      coalesce((storage.foldername(storage.objects.name))[1], '') = 'deals'
      and exists (
        select 1
        from public.deals d
        where d.id = public.path_uuid_segment(storage.objects.name, 2)
          and d.user_id = auth.uid()
      )
    )
  )
);
