-- Run once as project owner after order-management.sql.
-- No backfill: only future paid/status transitions enqueue messages.
begin;
create table public.store_order_emails (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id),
  kind text not null check (kind in ('payment_confirmed','ready_for_pickup','shipped')),
  snapshot jsonb not null,
  request_body jsonb,
  state text not null default 'pending' check (state in ('pending','accepted','review')),
  attempts integer not null default 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  provider_id text,
  accepted_at timestamptz,
  unique(order_id,kind)
);
alter table public.store_order_emails enable row level security;
revoke all on public.store_order_emails from public,anon,authenticated,service_role;

create function public.store_enqueue_order_email()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_kind text;
begin
  if new.status <> 'paid' then return new; end if;
  if old.status is distinct from 'paid' then v_kind := 'payment_confirmed';
  elsif new.fulfilment_status is distinct from old.fulfilment_status
    and new.fulfilment_status in ('ready_for_pickup','shipped') then v_kind := new.fulfilment_status;
  else return new; end if;
  insert into public.store_order_emails(order_id,kind,snapshot)
  values(new.id,v_kind,jsonb_build_object('id',new.id,'kind',v_kind,
    'email',new.customer_details->>'email','method',new.delivery_method,'items',new.items,
    'subtotal',new.subtotal_cents,'shipping',new.shipping_cents,'tax',new.tax_cents,'total',new.total_cents))
  on conflict(order_id,kind) do nothing;
  return new;
end $$;
revoke all on function public.store_enqueue_order_email() from public,anon,authenticated,service_role;
create trigger store_order_email_transition after update of status,fulfilment_status on public.store_orders
  for each row execute function public.store_enqueue_order_email();

create function public.store_email_claim(p_order_id uuid default null)
returns setof public.store_order_emails language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  -- Stop ambiguous retries before Resend's 24-hour idempotency window expires.
  update public.store_order_emails set state='review'
    where state='pending' and (attempts>=20 or first_attempt_at<now()-interval '23 hours')
      and (lease_until is null or lease_until<now());
  select e.id into v_id from public.store_order_emails e
    where e.state='pending' and e.next_attempt_at<=now()
      and (p_order_id is null or e.order_id=p_order_id)
      and (e.lease_until is null or e.lease_until<now())
      -- Keep the payment confirmation ahead of fulfilment emails.
      and (e.kind='payment_confirmed' or not exists (
        select 1 from public.store_order_emails prior where prior.order_id=e.order_id
        and prior.kind='payment_confirmed' and prior.state<>'accepted'))
    order by e.next_attempt_at,e.id for update skip locked limit 1;
  if v_id is null then return; end if;
  return query update public.store_order_emails set lease_token=gen_random_uuid(),
    lease_until=now()+interval '2 minutes',first_attempt_at=coalesce(first_attempt_at,now()),attempts=attempts+1
    where id=v_id returning *;
end $$;

create function public.store_email_prepare(p_id uuid,p_token uuid,p_body jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_body jsonb;
begin
  update public.store_order_emails set request_body=coalesce(request_body,p_body)
    where id=p_id and lease_token=p_token and lease_until>now() and state='pending'
    returning request_body into v_body;
  return v_body;
end $$;

create function public.store_email_finish(p_id uuid,p_token uuid,p_provider_id text,p_review boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  update public.store_order_emails set
    state=case when p_provider_id is not null then 'accepted' when p_review then 'review' else 'pending' end,
    provider_id=p_provider_id,accepted_at=case when p_provider_id is not null then now() else null end,
    next_attempt_at=now()+interval '5 minutes',lease_until=null,lease_token=null
    where id=p_id and lease_token=p_token and state='pending';
end $$;

create function public.store_admin_email_status(p_order_id uuid)
returns table(kind text,state text,accepted_at timestamptz) language plpgsql security definer set search_path='' as $$
begin
  if not public.store_is_order_admin() then raise exception 'Admin access required'; end if;
  return query select e.kind,e.state,e.accepted_at from public.store_order_emails e where e.order_id=p_order_id;
end $$;
revoke all on function public.store_email_claim(uuid),public.store_email_prepare(uuid,uuid,jsonb),
  public.store_email_finish(uuid,uuid,text,boolean),public.store_admin_email_status(uuid) from public,anon,authenticated;
grant execute on function public.store_email_claim(uuid),public.store_email_prepare(uuid,uuid,jsonb),
  public.store_email_finish(uuid,uuid,text,boolean) to service_role;
grant execute on function public.store_admin_email_status(uuid) to authenticated;
commit;
