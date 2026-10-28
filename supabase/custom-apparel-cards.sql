-- Run once as owner after site-images.sql. Adds six editable audience cards; keeps existing images.
begin;
alter table public.store_site_images drop constraint store_site_images_slot_check;
alter table public.store_site_images add constraint store_site_images_slot_check check (slot in ('home-hero','tshirts','hoodies','jerseys','equipment','custom-apparel','about','audience-business','audience-schools','audience-teams','audience-clubs','audience-hospitality','audience-events'));
insert into public.store_site_images(slot) values('audience-business'),('audience-schools'),('audience-teams'),('audience-clubs'),('audience-hospitality'),('audience-events') on conflict(slot) do nothing;
drop policy "Admins upload website images" on storage.objects;
drop policy "Website image uploads require confirmed admin" on storage.objects;
create policy "Admins upload website images" on storage.objects for insert to authenticated
with check(bucket_id='store-site-images' and public.store_can_manage_site_images()
  and name ~ '^site/(home-hero|tshirts|hoodies|jerseys|equipment|custom-apparel|about|audience-business|audience-schools|audience-teams|audience-clubs|audience-hospitality|audience-events)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$');
create policy "Website image uploads require confirmed admin" on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'store-site-images' or (public.store_can_manage_site_images()
  and name ~ '^site/(home-hero|tshirts|hoodies|jerseys|equipment|custom-apparel|about|audience-business|audience-schools|audience-teams|audience-clubs|audience-hospitality|audience-events)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'));
commit;
