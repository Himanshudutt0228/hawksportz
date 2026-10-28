-- Run once as project owner after product-creation.sql and product-editing.sql.
-- Existing products are not assigned to audience groups automatically.
begin;
do $$ begin
  if not exists(select 1 from pg_policies where schemaname='public' and tablename='products'
    and policyname='Product updates require store admin' and permissive='RESTRICTIVE')
    or not exists(select 1 from pg_policies where schemaname='public' and tablename='products'
    and policyname='Product creation requires store admin' and permissive='RESTRICTIVE') then
    raise exception 'Apply product-editing.sql and product-creation.sql first';
  end if;
end $$;
alter table public.products add column custom_audiences text[] not null default '{}';
alter table public.products add constraint products_custom_audiences_valid check (
  cardinality(custom_audiences)<=6 and array_position(custom_audiences,null) is null
  and custom_audiences <@ array['business','schools','teams','clubs','hospitality','events']::text[]
  and (cardinality(custom_audiences)=0 or (category is not null and category in ('tshirts','hoodies','jerseys') and customizable is distinct from false))
);
grant select(custom_audiences) on public.products to anon,authenticated;
grant insert(custom_audiences),update(custom_audiences) on public.products to authenticated;
create function public.store_is_custom_product_admin()
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.store_admins a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function public.store_is_custom_product_admin() from public,anon,authenticated;
grant execute on function public.store_is_custom_product_admin() to authenticated;
create policy "Custom product inserts require confirmed admin" on public.products as restrictive for insert to authenticated
  with check((select public.store_is_custom_product_admin()));
create policy "Custom product updates require confirmed admin" on public.products as restrictive for update to authenticated
  using((select public.store_is_custom_product_admin())) with check((select public.store_is_custom_product_admin()));
commit;
