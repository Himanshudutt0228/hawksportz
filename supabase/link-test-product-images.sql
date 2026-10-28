-- TEST DATA ONLY: link the three newest image uploads to the existing test T-shirt.
-- Since these are test copies of the same photo, upload order assigns back/left/right.
-- Run in the Supabase SQL Editor for this project. This updates product ID 1 only.
-- It keeps the existing front image and changes no other product fields.

with settings as (
  select 'https://kmvnqympemtivxxlmcvu.supabase.co/storage/v1/object/public/product-images/'::text as base_url
), target as (
  select p.id, coalesce(p.design_images ->> 'front', p.image_url) as front_url
  from public.products p
  where p.id = 1
), uploads as (
  select
    s.base_url || replace(replace(replace(replace(o.name, '%', '%25'), '#', '%23'), '?', '%3F'), ' ', '%20') as url,
    row_number() over (order by o.created_at desc, o.name) as position
  from storage.objects o
  cross join settings s
  cross join target t
  where o.bucket_id = 'product-images'
    and o.name ~* '\.(jpg|jpeg|png|webp)$'
    and s.base_url || replace(replace(replace(replace(o.name, '%', '%25'), '#', '%23'), '?', '%3F'), ' ', '%20') <> t.front_url
  order by o.created_at desc, o.name
  limit 3
), views as (
  select t.id, jsonb_build_object(
    'front', t.front_url,
    'back', (select url from uploads where position = 1),
    'left', (select url from uploads where position = 2),
    'right', (select url from uploads where position = 3)
  ) as images
  from target t cross join settings s
  where t.front_url like s.base_url || '%'
    and (select count(*) from uploads) = 3
)
update public.products p
set design_images = v.images
from views v
where p.id = v.id
returning p.id, p.name, p.design_images;

-- One returned row means the four test images were linked.
-- No returned rows means the product/front image or three additional uploads were not found.
