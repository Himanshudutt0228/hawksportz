-- Run after product-size-stock.sql as project owner. Tests the database trigger
-- on a temporary table, without altering real products or inventory. Rolls back.
begin;
create temporary table inventory_validation_test (
  stock bigint, sizes jsonb, size text, stock_by_size jsonb
) on commit drop;
create trigger test_size_stock before insert or update on inventory_validation_test
  for each row execute function public.validate_product_size_stock();

insert into inventory_validation_test (stock, sizes, stock_by_size)
values (999, '["S","M"]', '{"S":1,"M":3}');
do $$
declare
  bad_counts jsonb;
  rejected boolean;
begin
  if (select stock from inventory_validation_test) <> 4 then
    raise exception 'Total was not derived from the size counts';
  end if;
  update inventory_validation_test set stock = 999;
  if (select stock from inventory_validation_test) <> 4 then
    raise exception 'A submitted total overrode the size counts';
  end if;
  foreach bad_counts in array array[
    'null'::jsonb, '{}'::jsonb, '{"S":1}'::jsonb, '{"S":1,"L":3}'::jsonb,
    '{"S":-1,"M":3}'::jsonb, '{"S":1.5,"M":3}'::jsonb,
    '{"S":"1","M":3}'::jsonb, '{"S":999999999,"M":1}'::jsonb
  ] loop
    rejected := false;
    begin
      insert into inventory_validation_test (stock, sizes, stock_by_size)
      values (1, '["S","M"]', bad_counts);
    exception when raise_exception then rejected := true;
    end;
    if not rejected then raise exception 'Invalid inventory was accepted: %', bad_counts; end if;
  end loop;
  rejected := false;
  begin
    update inventory_validation_test set stock_by_size = null;
  exception when raise_exception then rejected := true;
  end;
  if not rejected then raise exception 'Configured size inventory reverted to shared stock'; end if;
end $$;
rollback;
-- This verifies trigger validation only. Live admin/customer/anonymous/revoked
-- role checks against the real products table are still required separately.
