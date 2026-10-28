-- Run in SQL Editor after admin-access.sql. All temporary grants are rolled back.
-- Requires at least one email-confirmed account. No users are created or deleted.
begin;

do $$
declare test_user uuid;
begin
  select id into test_user from auth.users
  where email_confirmed_at is not null order by created_at limit 1;
  if test_user is null then
    raise exception 'A confirmed test account is required';
  end if;
  insert into public.store_admins (user_id) values (test_user)
    on conflict (user_id) do nothing;
  perform set_config('request.jwt.claim.sub', test_user::text, true);
end $$;

set local role authenticated;
do $$
begin
  if (select count(*) from public.store_admins) <> 1 then
    raise exception 'Admin must see exactly their own membership';
  end if;

  begin
    insert into public.store_admins (user_id) values (auth.uid());
    raise exception 'SECURITY FAILURE: authenticated insert succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.store_admins set user_id = auth.uid();
    raise exception 'SECURITY FAILURE: authenticated update succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.store_admins;
    raise exception 'SECURITY FAILURE: authenticated delete succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    truncate public.store_admins;
    raise exception 'SECURITY FAILURE: authenticated truncate succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- A different identity must not be able to see the test administrator's membership.
select set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
set local role authenticated;
do $$
begin
  if exists (select 1 from public.store_admins) then
    raise exception 'SECURITY FAILURE: another user can read admin membership';
  end if;
end $$;
reset role;

set local role anon;
do $$
begin
  begin
    perform user_id from public.store_admins;
    raise exception 'SECURITY FAILURE: anonymous select succeeded';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.store_admins (user_id) values (gen_random_uuid());
    raise exception 'SECURITY FAILURE: anonymous insert succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

rollback;
-- Successful completion means the assertions passed. No membership changes persist.
