-- Run once as project owner after admin-access.sql. No admin is granted here.
begin;

alter table public.products enable row level security;

-- Remove broad and column-level update grants before allowing only these fields.
revoke update on public.products from public, anon, authenticated;
do $$
declare column_name text;
begin
  for column_name in select attname from pg_attribute
    where attrelid = 'public.products'::regclass and attnum > 0 and not attisdropped
  loop
    execute format('revoke update (%I) on public.products from public, anon, authenticated', column_name);
  end loop;
end $$;
grant update (name, description, price, stock) on public.products to authenticated;

-- A restrictive rule also constrains any older permissive UPDATE/ALL policies.
create policy "Product updates require store admin"
  on public.products as restrictive for update to authenticated
  using (exists (select 1 from public.store_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.store_admins where user_id = (select auth.uid())));

create policy "Store admins can update products"
  on public.products for update to authenticated
  using (exists (select 1 from public.store_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.store_admins where user_id = (select auth.uid())));

create policy "Store admins can read products"
  on public.products for select to authenticated
  using (exists (select 1 from public.store_admins where user_id = (select auth.uid())));
grant select (id, name, description, price, stock, slug, category) on public.products to authenticated;

commit;
-- Existing storefront SELECT policies are preserved. INSERT/DELETE permissions
-- are outside this migration's scope and still require a separate live audit.
