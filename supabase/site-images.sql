-- Run once as project owner after admin-access.sql.
-- Public website artwork only. Never put customer designs or private files here.
begin;
create table public.store_site_images (
  slot text primary key check (slot in ('home-hero','tshirts','hoodies','jerseys','equipment','custom-apparel','about')),
  image_path text,
  alt_text text not null default '' check (length(alt_text)<=160 and alt_text !~ '[[:cntrl:]]'),
  version bigint not null default 0 check (version>=0),
  updated_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  check (image_path is null or (image_path ~ ('^site/' || slot || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$') and length(trim(alt_text))>0))
);
insert into public.store_site_images(slot) values('home-hero'),('tshirts'),('hoodies'),('jerseys'),('equipment'),('custom-apparel'),('about');
alter table public.store_site_images enable row level security;
revoke all on public.store_site_images from public,anon,authenticated;
grant select(slot,image_path,alt_text,version) on public.store_site_images to anon,authenticated;
create policy "Public website image reads" on public.store_site_images for select to anon,authenticated using(true);

create function public.store_can_manage_site_images()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.store_admins a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function public.store_can_manage_site_images() from public,anon,authenticated;
grant execute on function public.store_can_manage_site_images() to authenticated;

create function public.store_admin_set_site_image(p_slot text,p_expected_version bigint,p_path text,p_alt text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.store_can_manage_site_images() then raise exception 'Admin access required'; end if;
  if p_alt is null or length(p_alt)>160 or p_alt ~ '[[:cntrl:]]' then raise exception 'Invalid description'; end if;
  if p_path is not null and (length(trim(p_alt))=0 or not exists (
    select 1 from storage.objects where bucket_id='store-site-images' and name=p_path
  )) then raise exception 'Uploaded image required'; end if;
  update public.store_site_images set image_path=p_path,alt_text=case when p_path is null then '' else trim(p_alt) end,
    version=version+1,updated_at=now(),updated_by=auth.uid()
    where slot=p_slot and version=p_expected_version;
  if not found then raise exception 'Image changed or slot unavailable; refresh'; end if;
end $$;
revoke all on function public.store_admin_set_site_image(text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.store_admin_set_site_image(text,bigint,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('store-site-images','store-site-images',true,5242880,array['image/webp'])
on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from storage.buckets where id='store-site-images' and public=true
    and file_size_limit=5242880 and allowed_mime_types=array['image/webp']::text[]) then
    raise exception 'Existing site image bucket has unexpected settings';
  end if;
end $$;

create policy "Admins upload website images" on storage.objects for insert to authenticated
with check(bucket_id='store-site-images' and public.store_can_manage_site_images()
  and name ~ '^site/(home-hero|tshirts|hoodies|jerseys|equipment|custom-apparel|about)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$');
create policy "Website image uploads require confirmed admin" on storage.objects as restrictive for insert to authenticated
with check(bucket_id<>'store-site-images' or (public.store_can_manage_site_images()
  and name ~ '^site/(home-hero|tshirts|hoodies|jerseys|equipment|custom-apparel|about)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'));
create policy "Anonymous website image upload denial" on storage.objects as restrictive for insert to anon
with check(bucket_id<>'store-site-images');
create policy "Website images cannot be overwritten" on storage.objects as restrictive for update to anon,authenticated
using(bucket_id<>'store-site-images') with check(bucket_id<>'store-site-images');
create policy "Website images cannot be deleted" on storage.objects as restrictive for delete to anon,authenticated
using(bucket_id<>'store-site-images');
commit;
