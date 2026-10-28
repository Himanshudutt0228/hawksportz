-- Run once as project owner after product-size-stock.sql.
-- Sandbox order storage and atomic stock reservations. No real payments are made.
begin;
create table public.store_orders (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete set null,
  access_hash text not null check (access_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'creating' check (status in ('creating','open','paid','expired')),
  delivery_method text not null check (delivery_method in ('shipping','pickup')),
  request_lines jsonb not null,
  items jsonb not null,
  subtotal_cents bigint not null check (subtotal_cents between 0 and 99999999),
  shipping_cents integer not null check (shipping_cents in (0,899)),
  tax_cents bigint,
  total_cents bigint,
  stripe_session_id text unique,
  customer_details jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.store_orders enable row level security;
revoke all on public.store_orders from public, anon, authenticated;
grant select, insert, update on public.store_orders to service_role;
create index store_orders_guest_recent on public.store_orders (access_hash, created_at desc);
create index store_orders_user_recent on public.store_orders (user_id, created_at desc);

create function public.store_checkout_start(p_order_id uuid, p_access_hash text, p_user_id uuid, p_lines jsonb, p_method text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order public.store_orders%rowtype;
  v_product public.products%rowtype;
  v_line jsonb;
  v_sizes jsonb;
  v_next_stock jsonb;
  v_items jsonb := '[]'::jsonb;
  v_size text;
  v_quantity integer;
  v_used bigint;
  v_price bigint;
  v_subtotal bigint := 0;
  v_seen integer := 0;
begin
  if p_access_hash is null or p_access_hash !~ '^[0-9a-f]{64}$' or p_order_id is null
    or p_method is null or p_method not in ('shipping','pickup') then raise exception 'Invalid request'; end if;
  if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Invalid cart'; end if;
  if jsonb_array_length(p_lines) < 1 or jsonb_array_length(p_lines) > 20 then raise exception 'Invalid cart'; end if;
  for v_line in select value from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(v_line) is distinct from 'object' or coalesce(v_line->>'id','') !~ '^[1-9][0-9]{0,18}$'
      or jsonb_typeof(v_line->'quantity') is distinct from 'number' or (v_line->>'quantity') !~ '^[1-9][0-9]?$'
      or not (v_line ? 'size') or (v_line->'size' <> 'null'::jsonb and
        (jsonb_typeof(v_line->'size') is distinct from 'string' or length(v_line->>'size') not between 1 and 40))
      or v_line ? 'customization' then raise exception 'Invalid cart line'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_lines)) <>
     (select count(distinct (value->>'id',value->>'size')) from jsonb_array_elements(p_lines)) then
    raise exception 'Duplicate cart line';
  end if;
  -- Serialize requests for a browser, then lock products in a consistent order.
  perform pg_advisory_xact_lock(hashtextextended(p_access_hash, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_order_id::text, 1));
  select * into v_order from public.store_orders where id = p_order_id for update;
  if found then
    if v_order.access_hash <> p_access_hash or v_order.request_lines <> p_lines or
      v_order.delivery_method <> p_method or v_order.user_id is distinct from p_user_id then
      raise exception 'Checkout request does not match';
    end if;
    if v_order.status not in ('creating','open') then raise exception 'Checkout already finished'; end if;
    return to_jsonb(v_order) || jsonb_build_object('session_expires_at',extract(epoch from v_order.created_at + interval '1 hour')::bigint);
  end if;
  -- A repeat click/reload for the same cart resumes its existing reservation.
  select * into v_order from public.store_orders where access_hash = p_access_hash
    and request_lines = p_lines and delivery_method = p_method and user_id is not distinct from p_user_id
    and status in ('creating','open') order by created_at desc limit 1 for update;
  if found then
    return to_jsonb(v_order) || jsonb_build_object('session_expires_at',extract(epoch from v_order.created_at + interval '1 hour')::bigint);
  end if;
  if (select count(*) from public.store_orders where access_hash = p_access_hash and created_at > now() - interval '30 minutes') >= 5 then
    raise exception 'Too many checkout attempts';
  end if;

  for v_product in select * from public.products where id::text in
    (select value->>'id' from jsonb_array_elements(p_lines)) order by id for update loop
    v_seen := v_seen + 1;
    v_sizes := to_jsonb(v_product)->'sizes';
    if jsonb_typeof(v_sizes) is distinct from 'array' then
      v_sizes := case when jsonb_typeof(to_jsonb(v_product)->'size') = 'string'
        then jsonb_build_array(to_jsonb(v_product)->>'size') else '[]'::jsonb end;
    end if;
    if v_product.category in ('tshirts','hoodies','jerseys') and jsonb_array_length(v_sizes) = 0 then
      raise exception 'Clothing sizes unavailable';
    end if;
    if v_product.price is null or v_product.price < 0 or v_product.price * 100 <> trunc(v_product.price * 100)
      or v_product.price * 100 > 99999999 then raise exception 'Invalid product price'; end if;
    v_price := (v_product.price * 100)::bigint;
    v_used := 0;
    v_next_stock := v_product.stock_by_size;
    for v_line in select value from jsonb_array_elements(p_lines) where value->>'id' = v_product.id::text loop
      v_size := v_line->>'size';
      v_quantity := (v_line->>'quantity')::integer;
      if (jsonb_array_length(v_sizes) > 0 and (v_size is null or not (v_sizes ? v_size)))
        or (jsonb_array_length(v_sizes) = 0 and v_size is not null) then raise exception 'Size unavailable'; end if;
      if v_next_stock is not null then
        if v_size is null or jsonb_typeof(v_next_stock) is distinct from 'object' or
          not (v_next_stock ? v_size) or (v_next_stock->>v_size)::bigint < v_quantity then raise exception 'Size sold out'; end if;
        v_next_stock := jsonb_set(v_next_stock,array[v_size],to_jsonb((v_next_stock->>v_size)::bigint-v_quantity));
      end if;
      v_used := v_used + v_quantity;
      v_subtotal := v_subtotal + v_price * v_quantity;
      v_items := v_items || jsonb_build_array(jsonb_build_object('id',v_product.id::text,'name',v_product.name,
        'slug',v_product.slug,'size',v_size,'quantity',v_quantity,'unit_cents',v_price));
    end loop;
    if v_product.stock is null or v_product.stock < v_used then raise exception 'Product sold out'; end if;
    update public.products set stock = stock - v_used, stock_by_size = v_next_stock where id = v_product.id;
  end loop;
  if v_seen <> (select count(distinct value->>'id') from jsonb_array_elements(p_lines)) then raise exception 'Product unavailable'; end if;
  if v_subtotal + 899 > 99999999 then raise exception 'Order total too large'; end if;
  insert into public.store_orders(id,user_id,access_hash,delivery_method,request_lines,items,subtotal_cents,shipping_cents)
    values(p_order_id,p_user_id,p_access_hash,p_method,p_lines,v_items,v_subtotal,case when p_method='shipping' then 899 else 0 end)
    returning * into v_order;
  return to_jsonb(v_order) || jsonb_build_object('session_expires_at',extract(epoch from v_order.created_at + interval '1 hour')::bigint);
end;
$$;

create function public.store_checkout_bind(p_order_id uuid, p_access_hash text, p_session_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_order public.store_orders%rowtype;
begin
  select * into v_order from public.store_orders where id=p_order_id for update;
  if not found or p_access_hash is null or v_order.access_hash <> p_access_hash or p_session_id is null or p_session_id !~ '^cs_test_' then raise exception 'Invalid checkout'; end if;
  if v_order.stripe_session_id is not null and v_order.stripe_session_id <> p_session_id then raise exception 'Session mismatch'; end if;
  update public.store_orders set stripe_session_id=p_session_id,
    status=case when status='creating' then 'open' else status end where id=p_order_id;
end;
$$;

create function public.store_checkout_settle(p_order_id uuid, p_session_id text, p_state text, p_subtotal bigint,
  p_shipping bigint, p_tax bigint, p_total bigint, p_currency text, p_customer jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_order public.store_orders%rowtype;
  v_product public.products%rowtype;
  v_line jsonb;
  v_map jsonb;
  v_add bigint;
begin
  select * into v_order from public.store_orders where id=p_order_id for update;
  if not found or p_session_id is null or p_session_id !~ '^cs_test_' or p_state is null or p_state not in ('paid','expired') then raise exception 'Invalid order event'; end if;
  if v_order.stripe_session_id is not null and v_order.stripe_session_id <> p_session_id then raise exception 'Session mismatch'; end if;
  if v_order.status='paid' then return; end if;
  if v_order.status='expired' then
    if p_state='expired' then return; end if;
    raise exception 'Paid event requires manual review after stock release';
  end if;
  if p_state='paid' then
    if p_currency is distinct from 'cad' or p_subtotal is distinct from v_order.subtotal_cents
      or p_shipping is distinct from v_order.shipping_cents or p_tax is null or p_tax < 0
      or p_total is distinct from p_subtotal + p_shipping + p_tax then raise exception 'Payment amount mismatch'; end if;
    if v_order.delivery_method='shipping' and (p_customer->'shipping'->'address'->>'country') is distinct from 'CA' then
      raise exception 'Delivery address must be in Canada';
    end if;
    update public.store_orders set status='paid',stripe_session_id=p_session_id,tax_cents=p_tax,total_cents=p_total,
      customer_details=p_customer,paid_at=now() where id=p_order_id;
  else
    -- Release only after Stripe confirms expiration, never merely on a timer or
    -- cancel-page visit. Repeat/out-of-order events cannot restore stock twice.
    for v_product in select * from public.products where id::text in
      (select value->>'id' from jsonb_array_elements(v_order.items)) order by id for update loop
      v_map:=v_product.stock_by_size; v_add:=0;
      for v_line in select value from jsonb_array_elements(v_order.items) where value->>'id'=v_product.id::text loop
        v_add:=v_add+(v_line->>'quantity')::bigint;
        if v_map is not null then
          if not (v_map ? (v_line->>'size')) then raise exception 'Inventory changed; review release'; end if;
          v_map:=jsonb_set(v_map,array[v_line->>'size'],to_jsonb((v_map->>(v_line->>'size'))::bigint+(v_line->>'quantity')::bigint));
        end if;
      end loop;
      update public.products set stock=stock+v_add,stock_by_size=v_map where id=v_product.id;
    end loop;
    update public.store_orders set status='expired',stripe_session_id=p_session_id where id=p_order_id;
  end if;
end;
$$;

revoke all on function public.store_checkout_start(uuid,text,uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.store_checkout_bind(uuid,text,text) from public, anon, authenticated;
revoke all on function public.store_checkout_settle(uuid,text,text,bigint,bigint,bigint,bigint,text,jsonb) from public, anon, authenticated;
grant execute on function public.store_checkout_start(uuid,text,uuid,jsonb,text) to service_role;
grant execute on function public.store_checkout_bind(uuid,text,text) to service_role;
grant execute on function public.store_checkout_settle(uuid,text,text,bigint,bigint,bigint,bigint,text,jsonb) to service_role;
commit;
