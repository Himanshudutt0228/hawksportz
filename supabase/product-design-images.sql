-- Run in Supabase SQL Editor. Every new or updated product must have four photos.
-- No photos are invented or duplicated to fill missing views.
begin;

alter table public.products add column if not exists design_images jsonb;
alter table public.products alter column design_images set default '{}'::jsonb;

-- Preserve existing front photos while moving them into the four-view structure.
update public.products
set design_images = coalesce(design_images, '{}'::jsonb) || jsonb_build_object('front', image_url)
where (design_images is null or (jsonb_typeof(design_images) = 'object' and not (design_images ? 'front')))
  and image_url is not null and btrim(image_url) <> '';

create or replace function public.product_has_four_images(images jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(images) = 'object' then (
    select count(*) = 4 and count(distinct (value #>> '{}')) = 4
      and bool_and(jsonb_typeof(value) = 'string'
        and (value #>> '{}') ~ '^(https://[^/[:space:]]+[^[:space:]]*|/[^/[:space:]][^[:space:]]*)$')
    from jsonb_each(images)
    where key in ('front', 'back', 'left', 'right')
  ) else false end;
$$;

-- The check immediately applies to INSERTs and UPDATEs. Existing incomplete rows
-- remain readable so their real missing photos can be supplied without losing products.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_four_images_required'
    and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_four_images_required
      check (public.product_has_four_images(design_images)) not valid;
  end if;
end $$;

commit;

-- Set design_images to four actual, distinct product-photo URLs in Table Editor:
-- {"front":"https://.../front.jpg","back":"https://.../back.jpg",
--  "left":"https://.../left.jpg","right":"https://.../right.jpg"}
-- All four values must be provided together when creating/updating a product.

-- Find existing products which still need real photos:
select id, name from public.products where not public.product_has_four_images(design_images);

-- After fixing every existing product, run this to validate the entire table:
-- alter table public.products validate constraint products_four_images_required;
