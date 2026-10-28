-- Run once as project owner after admin-access.sql and product-editing.sql.
-- This grants a protected operation; it does not delete any products.
begin;
alter table public.products enable row level security;
revoke delete on public.products from public, anon, authenticated;
grant delete on public.products to authenticated;

create policy "Product deletion requires store admin"
  on public.products as restrictive for delete to authenticated
  using (exists (select 1 from public.store_admins where user_id = (select auth.uid())));
create policy "Store admins can delete products"
  on public.products for delete to authenticated
  using (exists (select 1 from public.store_admins where user_id = (select auth.uid())));
create policy "Anonymous users cannot delete products"
  on public.products as restrictive for delete to anon using (false);
commit;
