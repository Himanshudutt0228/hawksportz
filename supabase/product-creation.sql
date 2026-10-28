-- Run once as project owner after product-editing.sql and product-image-editing.sql.
begin;
alter table public.products enable row level security;
alter table public.products add column if not exists sizes text[] default '{}';
alter table public.products add column if not exists colours text[] default '{}';
-- Legacy catalog rows were eligible unless explicitly disabled. Preserve that
-- behavior when introducing this optional field; new forms send an explicit flag.
alter table public.products add column if not exists customizable boolean;

-- Confirm array-compatible catalog fields instead of silently changing existing types.
do $$
declare field record;
begin
  for field in select attname, atttypid from pg_attribute
    where attrelid = 'public.products'::regclass and attname in ('sizes', 'colours') and not attisdropped
  loop
    if field.atttypid not in ('text[]'::regtype, 'jsonb'::regtype, 'json'::regtype) then
      raise exception 'Unexpected type for products.%; review the existing schema', field.attname;
    end if;
  end loop;
end $$;

-- Enforce unique product URLs even when two admins submit simultaneously.
create unique index if not exists products_admin_slug_unique on public.products (slug);

revoke insert on public.products from public, anon, authenticated;
do $$
declare
  column_name text;
  sequence_name text;
begin
  for column_name in select attname from pg_attribute
    where attrelid = 'public.products'::regclass and attnum > 0 and not attisdropped
  loop
    execute format('revoke insert (%I) on public.products from public, anon, authenticated', column_name);
  end loop;
  sequence_name := pg_get_serial_sequence('public.products', 'id');
  if sequence_name is not null then
    execute format('grant usage on sequence %s to authenticated', sequence_name);
  end if;
end $$;
grant insert (name, description, price, stock, slug, category, sizes, colours, customizable, image_url, design_images)
  on public.products to authenticated;
grant select (sizes, colours, customizable) on public.products to authenticated;

create policy "Product creation requires store admin"
  on public.products as restrictive for insert to authenticated
  with check (exists (select 1 from public.store_admins where user_id = (select auth.uid())));
create policy "Store admins can create products"
  on public.products for insert to authenticated
  with check (exists (select 1 from public.store_admins where user_id = (select auth.uid())));
create policy "Anonymous users cannot create products"
  on public.products as restrictive for insert to anon with check (false);

commit;
-- Existing duplicate slugs cause the unique-index step to fail and roll back.
-- Review duplicates with the operator; do not delete or rename products automatically.
