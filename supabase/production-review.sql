-- Run after custom-checkout.sql and order-management.sql. Safe to rerun.
begin;
alter table public.store_order_designs add column if not exists reviewed_at timestamptz;
alter table public.store_order_designs add column if not exists reviewed_by uuid references auth.users(id);
-- Reviews can only be written through the protected function, never direct browser updates.
revoke update on public.store_order_designs from public, anon, authenticated;
create or replace function public.store_admin_check_design(p_order_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_actor uuid := auth.uid(); v_status text;
begin
  if v_actor is null or not public.store_is_order_admin() then raise exception 'Admin access required'; end if;
  select status into v_status from public.store_orders where id=p_order_id for update;
  if v_status is distinct from 'paid' then raise exception 'Paid order required'; end if;
  update public.store_order_designs set reviewed_at=now(), reviewed_by=v_actor
    where order_id=p_order_id and reviewed_at is null;
  if not found and not exists(select 1 from public.store_order_designs where order_id=p_order_id and reviewed_at is not null) then
    raise exception 'Custom design required';
  end if;
end;
$$;
revoke all on function public.store_admin_check_design(uuid) from public, anon, authenticated;
grant execute on function public.store_admin_check_design(uuid) to authenticated;
commit;
