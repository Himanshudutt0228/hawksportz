-- Run as project owner after product-creation.sql and product-editing.sql.
-- Adds collection styles without changing existing product assignments.
begin;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='products'
    and policyname='Product updates require store admin' and permissive='RESTRICTIVE')
    or not exists(select 1 from pg_policies where schemaname='public' and tablename='products'
    and policyname='Product creation requires store admin' and permissive='RESTRICTIVE') then
    raise exception 'Apply product-editing.sql and product-creation.sql first';
  end if;
end $$;
alter table public.products add column garment_style text;
alter table public.products add constraint products_garment_style_valid check (
  garment_style is null or
  (category is not null and ((category='tshirts' and garment_style in ('short-sleeve','long-sleeve'))
    or (category='hoodies' and garment_style in ('pullover','zip-up'))))
);
create function public.store_is_product_style_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.store_admins a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function public.store_is_product_style_admin() from public,anon,authenticated;
grant execute on function public.store_is_product_style_admin() to authenticated;
create policy "Product style inserts require confirmed admin" on public.products as restrictive for insert to authenticated
  with check((select public.store_is_product_style_admin()));
create policy "Product style updates require confirmed admin" on public.products as restrictive for update to authenticated
  using((select public.store_is_product_style_admin())) with check((select public.store_is_product_style_admin()));
grant select(garment_style) on public.products to anon,authenticated;
grant insert(garment_style),update(garment_style) on public.products to authenticated;
commit;
