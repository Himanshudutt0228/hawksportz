-- Run after order-emails.sql, custom-checkout.sql and production-review.sql.
-- Safe to rerun. No backfill of previously reviewed designs or emails.
begin;
alter table public.store_order_designs add column if not exists approved_at timestamptz;
alter table public.store_order_designs add column if not exists approved_by uuid references auth.users(id);
revoke update on public.store_order_designs from public, anon, authenticated;
alter table public.store_order_emails drop constraint if exists store_order_emails_kind_check;
alter table public.store_order_emails add constraint store_order_emails_kind_check
  check (kind in ('payment_confirmed','ready_for_pickup','shipped','design_approved'));

create or replace function public.store_admin_approve_design(p_order_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid := auth.uid(); v_order public.store_orders%rowtype;
begin
  if v_actor is null or not public.store_is_order_admin() then raise exception 'Admin access required'; end if;
  select * into v_order from public.store_orders where id=p_order_id for update;
  if not found or v_order.status <> 'paid' then raise exception 'Paid order required'; end if;
  if not exists(select 1 from public.store_order_designs where order_id=p_order_id and reviewed_at is not null) then
    raise exception 'Review the custom design first';
  end if;
  update public.store_order_designs set approved_at=now(),approved_by=v_actor
    where order_id=p_order_id and approved_at is null;
  if not found then return; end if;
  -- Approval and its notification commit together; retries never duplicate the email.
  insert into public.store_order_emails(order_id,kind,snapshot)
  values(p_order_id,'design_approved',jsonb_build_object('id',p_order_id,'kind','design_approved',
    'email',v_order.customer_details->>'email','method',v_order.delivery_method,'items',v_order.items,
    'subtotal',v_order.subtotal_cents,'shipping',v_order.shipping_cents,'tax',v_order.tax_cents,'total',v_order.total_cents))
  on conflict(order_id,kind) do nothing;
end;
$$;
revoke all on function public.store_admin_approve_design(uuid) from public,anon,authenticated;
grant execute on function public.store_admin_approve_design(uuid) to authenticated;
commit;
