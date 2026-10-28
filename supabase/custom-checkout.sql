-- Run after checkout.sql and subsequent order migrations. Test payments only.
begin;
create table if not exists public.store_order_designs (
  order_id uuid primary key references public.store_orders(id) on delete cascade,
  designs jsonb not null check (jsonb_typeof(designs) = 'object')
);
alter table public.store_order_designs enable row level security;
revoke all on public.store_order_designs from public, anon, authenticated;
grant select, insert on public.store_order_designs to service_role;
grant select on public.store_order_designs to authenticated;
drop policy if exists "Admins read test designs" on public.store_order_designs;
create policy "Admins read test designs" on public.store_order_designs for select to authenticated
  using ((select public.store_is_order_admin()));
drop policy if exists "Design reads require admin" on public.store_order_designs;
create policy "Design reads require admin" on public.store_order_designs as restrictive for select to authenticated
  using ((select public.store_is_order_admin()));
create or replace function public.store_custom_checkout_start(p_order_id uuid, p_access_hash text, p_user_id uuid, p_lines jsonb, p_method text, p_designs jsonb)
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
  v_design jsonb;
  v_meta jsonb;
  v_base bigint;
  v_side text;
  v_print_size text;
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
      or (v_line ? 'customization' and (coalesce(v_line->'customization'->>'designId','') !~ '^[0-9a-fA-F-]{36}$' or not (p_designs ? (v_line->'customization'->>'designId')))) then raise exception 'Invalid cart line'; end if;
  end loop;
  if (select count(*) from jsonb_array_elements(p_lines)) <>
     (select count(distinct (value->>'id',value->>'size',value->'customization'->>'designId')) from jsonb_array_elements(p_lines)) then
    raise exception 'Duplicate cart line';
  end if;
  if jsonb_typeof(p_designs) is distinct from 'object' or pg_column_size(p_designs) > 25165824 then raise exception 'Invalid designs'; end if;
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
    if (select designs from public.store_order_designs where order_id=v_order.id) is distinct from p_designs then raise exception 'Design mismatch'; end if;
    return to_jsonb(v_order) || jsonb_build_object('session_expires_at',extract(epoch from v_order.created_at + interval '1 hour')::bigint);
  end if;
  -- A repeat click/reload for the same cart resumes its existing reservation.
  select * into v_order from public.store_orders where access_hash = p_access_hash
    and request_lines = p_lines and delivery_method = p_method and user_id is not distinct from p_user_id
    and status in ('creating','open') order by created_at desc limit 1 for update;
  if found then
    if (select designs from public.store_order_designs where order_id=v_order.id) is distinct from p_designs then raise exception 'Design mismatch'; end if;
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
      v_price := (v_product.price * 100)::bigint;
      v_meta := null;
      if v_line ? 'customization' then
        v_design := p_designs->(v_line->'customization'->>'designId');
        if (v_design->>'productId') is distinct from v_product.id::text
          or (v_design->>'version') is distinct from '3'
          or v_product.customizable is false
          or (v_product.category in ('hats','beanies','sweatshirts') and v_product.customizable is distinct from true)
          then raise exception 'Custom product unavailable'; end if;
        v_base := (v_product.price * 100)::bigint;
        if v_base is null or jsonb_typeof(v_design->'layers') is distinct from 'array' or jsonb_array_length(v_design->'layers') not between 1 and 30
          then raise exception 'Invalid custom design'; end if;
        v_price := v_base;
        for v_side in select distinct value->>'side' from jsonb_array_elements(v_design->'layers') loop
          if v_side is null or v_side not in ('front','back','left','right') then raise exception 'Invalid print side'; end if;
          v_print_size := v_design->'printSizes'->>v_side;
          if v_print_size is null or v_print_size not in ('pocket','large') then raise exception 'Invalid print size'; end if;
          if v_product.category in ('hats','beanies') and (v_side <> 'front' or v_print_size <> 'pocket') then raise exception 'Invalid headwear print'; end if;
          v_price := v_price + case when v_side in ('left','right') or v_print_size='pocket' then 250 else 500 end;
        end loop;
        v_meta := jsonb_build_object('designId',v_design->>'id','colour',v_design->>'colour',
          'sides',(select jsonb_agg(side) from (select distinct value->>'side' as side from jsonb_array_elements(v_design->'layers')) sides),
          'printSizes',v_design->'printSizes','printPricePerSide',0,
          'additionalComments',left(coalesce(v_design->>'additionalComments',''),255));
      end if;
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
        'slug',v_product.slug,'size',v_size,'quantity',v_quantity,'unit_cents',v_price) || case when v_meta is null then '{}'::jsonb else jsonb_build_object('customization',v_meta) end);
    end loop;
    if v_product.stock is null or v_product.stock < v_used then raise exception 'Product sold out'; end if;
    update public.products set stock = stock - v_used, stock_by_size = v_next_stock where id = v_product.id;
  end loop;
  if v_seen <> (select count(distinct value->>'id') from jsonb_array_elements(p_lines)) then raise exception 'Product unavailable'; end if;
  if v_subtotal + 899 > 99999999 then raise exception 'Order total too large'; end if;
  insert into public.store_orders(id,user_id,access_hash,delivery_method,request_lines,items,subtotal_cents,shipping_cents)
    values(p_order_id,p_user_id,p_access_hash,p_method,p_lines,v_items,v_subtotal,case when p_method='shipping' then 899 else 0 end)
    returning * into v_order;
  insert into public.store_order_designs(order_id,designs) values(v_order.id,p_designs);
  return to_jsonb(v_order) || jsonb_build_object('session_expires_at',extract(epoch from v_order.created_at + interval '1 hour')::bigint);
end;
$$;

revoke all on function public.store_custom_checkout_start(uuid,text,uuid,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.store_custom_checkout_start(uuid,text,uuid,jsonb,text,jsonb) to service_role;
commit;
