-- Run after product-editing.sql as project owner. Everything is rolled back.
-- Requires a confirmed account and a product. Failure requires ROLLBACK before retry.
begin;
do $$
declare test_user uuid;
begin
  select id into test_user from auth.users where email_confirmed_at is not null order by created_at limit 1;
  if test_user is null or not exists (select 1 from public.products) then
    raise exception 'A confirmed account and product are required';
  end if;
  perform set_config('request.jwt.claim.sub', test_user::text, true);
  delete from public.store_admins where user_id = test_user;
end $$;

set local role authenticated;
do $$
declare affected integer;
begin
  update public.products set name = name;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'SECURITY FAILURE: customer updated products'; end if;
end $$;
reset role;

insert into public.store_admins (user_id) values (auth.uid());
set local role authenticated;
do $$
declare affected integer;
begin
  update public.products set name = name where id = (select id from public.products order by id limit 1);
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin could not update product'; end if;
  begin
    update public.products set slug = slug;
    raise exception 'SECURITY FAILURE: admin changed non-editable column';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

delete from public.store_admins where user_id = auth.uid();
set local role authenticated;
do $$
declare affected integer;
begin
  update public.products set name = name;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'SECURITY FAILURE: revoked admin updated products'; end if;
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    update public.products set name = name;
    raise exception 'SECURITY FAILURE: anonymous update permitted';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
