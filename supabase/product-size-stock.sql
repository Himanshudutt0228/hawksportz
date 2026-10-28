-- Run once after product-editing.sql and product-creation.sql.
begin;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products'
    and policyname = 'Product creation requires store admin' and permissive = 'RESTRICTIVE') then
    raise exception 'Run product-creation.sql first, then retry this script';
  end if;
end $$;

alter table public.products add column if not exists stock_by_size jsonb;
-- Null preserves legacy shared totals without inventing size quantities.
grant select (stock_by_size) on public.products to anon, authenticated;
grant insert (stock_by_size), update (stock_by_size) on public.products to authenticated;

create or replace function public.validate_product_size_stock()
returns trigger language plpgsql set search_path = '' as $$
declare
  size_list jsonb;
  entry record;
  total bigint := 0;
  size_count integer;
begin
  size_list := to_jsonb(new) -> 'sizes';
  if size_list is null or jsonb_typeof(size_list) <> 'array' then
    if jsonb_typeof(to_jsonb(new) -> 'size') = 'string' then
      size_list := jsonb_build_array(to_jsonb(new) ->> 'size');
    else size_list := '[]'::jsonb;
    end if;
  end if;
  select count(distinct value) into size_count from jsonb_array_elements_text(size_list);
  if new.stock_by_size is null then
    if tg_op = 'INSERT' and size_count > 0 then
      raise exception 'Enter stock for every size';
    end if;
    if tg_op = 'UPDATE' then
      if old.stock_by_size is not null and size_count > 0 then
        raise exception 'Size stock cannot be reset to shared stock';
      end if;
    end if;
    return new;
  end if;
  if jsonb_typeof(new.stock_by_size) <> 'object' then
    raise exception 'Size stock must be an object';
  end if;
  if size_count = 0 or size_count > 30 or
    (select count(*) from jsonb_object_keys(new.stock_by_size)) <> size_count then
    raise exception 'Enter stock for every available size';
  end if;
  for entry in select key, value from jsonb_each(new.stock_by_size) loop
    if length(entry.key) = 0 or length(entry.key) > 40 or not (size_list ? entry.key)
      or jsonb_typeof(entry.value) <> 'number' or entry.value::text !~ '^[0-9]{1,9}$' then
      raise exception 'Invalid size or stock count';
    end if;
    total := total + entry.value::text::bigint;
  end loop;
  if total > 999999999 then raise exception 'Stock total is too large'; end if;
  new.stock := total;
  return new;
end;
$$;
revoke all on function public.validate_product_size_stock() from public, anon, authenticated;
create trigger products_validate_size_stock before insert or update on public.products
  for each row execute function public.validate_product_size_stock();
commit;
