-- Run once as project owner after order-management.sql.
-- Leaves admin RLS and checkout grants unchanged. Never matches orders by email.
begin;
create function public.store_customer_orders(p_order_id uuid default null, p_page integer default 1)
returns table (
  id uuid, paid_at timestamptz, delivery_method text, items jsonb,
  subtotal_cents bigint, shipping_cents integer, tax_cents bigint, total_cents bigint,
  fulfilment_status text, fulfilment_updated_at timestamptz
)
language plpgsql stable security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null or not exists (
    select 1 from auth.users u where u.id=v_user and u.email_confirmed_at is not null
  ) then raise exception 'Confirmed account required'; end if;
  if p_page is null or p_page < 1 or p_page > 100000 then
    raise exception 'Invalid page';
  end if;
  return query
    select o.id,o.paid_at,o.delivery_method,o.items,o.subtotal_cents,o.shipping_cents,
      o.tax_cents,o.total_cents,o.fulfilment_status,o.fulfilment_updated_at
    from public.store_orders o
    where o.user_id=v_user and o.status='paid' and (p_order_id is null or o.id=p_order_id)
    order by o.paid_at desc,o.id desc
    limit 26 offset (case when p_order_id is null then (p_page-1)*25 else 0 end);
end;
$$;
revoke all on function public.store_customer_orders(uuid,integer) from public,anon,authenticated;
grant execute on function public.store_customer_orders(uuid,integer) to authenticated;
create index store_orders_customer_paid_recent on public.store_orders (user_id,paid_at desc,id desc) where status='paid';
commit;
