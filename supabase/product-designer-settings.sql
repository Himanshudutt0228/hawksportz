-- Run once after the existing admin/product migrations.
begin;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products'
    and policyname = 'Product updates require store admin' and permissive = 'RESTRICTIVE') then
    raise exception 'Run product-editing.sql first';
  end if;
end $$;
grant update (customizable) on public.products to authenticated;
-- Preserve legacy eligibility in future imports; forms supply an explicit flag.
alter table public.products alter column customizable drop not null;
alter table public.products alter column customizable drop default;

-- Restore the specific older T-shirt identified during this issue. Do not
-- enable unrelated products that may have intentionally been disabled.
update public.products set customizable = true
where id::text = '1' and category = 'tshirts' and customizable = false;
commit;
