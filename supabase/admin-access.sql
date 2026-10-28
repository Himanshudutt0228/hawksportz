-- Run once in the Supabase SQL Editor as the project owner.
-- This creates the permission table; it does not grant anyone admin access.
begin;

create table public.store_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.store_admins enable row level security;

-- Customers may check only their own membership. They cannot change membership.
revoke all on table public.store_admins from public, anon, authenticated;
grant select (user_id) on table public.store_admins to authenticated;

create policy "Users can read their own admin membership"
  on public.store_admins for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.store_admins is
  'Admin membership managed only by trusted project operators, never by public sign-up.';

commit;
