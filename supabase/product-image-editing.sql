-- Run once as project owner after product-editing.sql and product-design-images.sql.
begin;

grant select (image_url, design_images) on public.products to authenticated;
grant update (image_url, design_images) on public.products to authenticated;
-- The existing restrictive products UPDATE policy continues to require admin membership.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products'
    and policyname = 'Product updates require store admin' and permissive = 'RESTRICTIVE') then
    raise exception 'Run product-editing.sql first';
  end if;
end $$;

-- Separate bucket: existing photos and storage settings are left intact.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('admin-product-images', 'admin-product-images', true, 5242880, array['image/webp'])
on conflict (id) do nothing;
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'admin-product-images'
    and public = true and file_size_limit = 5242880 and allowed_mime_types = array['image/webp']::text[]) then
    raise exception 'Existing admin-product-images bucket has unexpected settings; review before proceeding';
  end if;
end $$;

create policy "Admins upload product photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'admin-product-images'
    and name ~ '^products/[A-Za-z0-9-]+/[0-9a-f-]{36}\.webp$'
    and exists (select 1 from public.store_admins where user_id = (select auth.uid())));

-- Guard against older broad upload policies. Other buckets are unaffected.
create policy "Product photo uploads require admin"
  on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'admin-product-images' or (
    name ~ '^products/[A-Za-z0-9-]+/[0-9a-f-]{36}\.webp$'
    and exists (select 1 from public.store_admins where user_id = (select auth.uid()))));
create policy "Anonymous users cannot upload product photos"
  on storage.objects as restrictive for insert to anon
  with check (bucket_id <> 'admin-product-images');

-- Immutable objects prevent overwriting/deleting a photo currently used by a product,
-- including through older broad policies. Trusted operators can manage unused files.
create policy "Product photo objects cannot be overwritten"
  on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'admin-product-images')
  with check (bucket_id <> 'admin-product-images');
create policy "Product photo objects cannot be deleted by app users"
  on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'admin-product-images');

commit;
