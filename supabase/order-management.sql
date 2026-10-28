-- Run once as project owner after admin-access.sql and checkout.sql.
-- Adds fulfilment only; never changes payments, reservations or inventory.
begin;

alter table public.store_orders
  add column fulfilment_status text not null default 'unfulfilled'
    check (fulfilment_status in ('unfulfilled','ready_for_pickup','picked_up','shipped')),
  add column fulfilment_updated_at timestamptz,
  add column fulfilment_updated_by uuid references auth.users(id) on delete set null;

alter table public.store_orders enable row level security;
-- Retain the checkout server's existing grants. App users get selected reads
-- under admin RLS, never direct order writes or receipt-cookie/session secrets.
revoke all on public.store_orders from public, anon, authenticated;
do $$
declare v_column text;
begin
  for v_column in select attname from pg_attribute
    where attrelid='public.store_orders'::regclass and attnum>0 and not attisdropped
  loop
    execute format('revoke select (%I), insert (%I), update (%I), references (%I) on public.store_orders from public, anon, authenticated',
      v_column,v_column,v_column,v_column);
  end loop;
end $$;
grant select (id,status,delivery_method,items,subtotal_cents,shipping_cents,tax_cents,total_cents,
  customer_details,created_at,paid_at,fulfilment_status,fulfilment_updated_at)
  on public.store_orders to authenticated;

create function public.store_is_order_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.store_admins a join auth.users u on u.id=a.user_id
    where a.user_id=(select auth.uid()) and u.email_confirmed_at is not null);
$$;
revoke all on function public.store_is_order_admin() from public, anon, authenticated;
grant execute on function public.store_is_order_admin() to authenticated;

create policy "Order reads require store admin" on public.store_orders
  as restrictive for select to authenticated
  using ((select public.store_is_order_admin()));
create policy "Store admins can read orders" on public.store_orders
  for select to authenticated
  using ((select public.store_is_order_admin()));
create policy "Anonymous order reads denied" on public.store_orders
  as restrictive for select to anon using (false);

create function public.store_admin_fulfil_order(p_order_id uuid, p_expected_status text, p_next_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.store_orders%rowtype; v_actor uuid := auth.uid();
begin
  if v_actor is null or not public.store_is_order_admin() then
    raise exception 'Admin access required';
  end if;
  select * into v_order from public.store_orders where id=p_order_id for update;
  if not found or v_order.status <> 'paid' then raise exception 'Paid order required'; end if;
  if p_expected_status is distinct from v_order.fulfilment_status then raise exception 'Order changed; refresh'; end if;
  if p_next_status is null or not (
    (v_order.delivery_method='shipping' and v_order.fulfilment_status='unfulfilled' and p_next_status='shipped') or
    (v_order.delivery_method='pickup' and v_order.fulfilment_status='unfulfilled' and p_next_status='ready_for_pickup') or
    (v_order.delivery_method='pickup' and v_order.fulfilment_status='ready_for_pickup' and p_next_status='picked_up')
  ) then raise exception 'Invalid fulfilment change'; end if;
  update public.store_orders set fulfilment_status=p_next_status, fulfilment_updated_at=now(), fulfilment_updated_by=v_actor
    where id=p_order_id;
end;
$$;
revoke all on function public.store_admin_fulfil_order(uuid,text,text) from public, anon, authenticated;
grant execute on function public.store_admin_fulfil_order(uuid,text,text) to authenticated;

create index store_orders_paid_recent on public.store_orders (paid_at desc, id desc) where status='paid';
commit;
