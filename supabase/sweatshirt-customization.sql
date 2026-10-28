-- Run after headwear-customization.sql (and its prerequisites). No records or access rules are changed.
begin;
alter table public.products drop constraint products_custom_audiences_valid;
alter table public.products add constraint products_custom_audiences_valid check (
  cardinality(custom_audiences)<=6 and array_position(custom_audiences,null) is null
  and custom_audiences <@ array['business','schools','teams','clubs','hospitality','events']::text[]
  and (cardinality(custom_audiences)=0 or (category is not null and category in ('tshirts','hoodies','jerseys','hats','beanies','sweatshirts') and customizable is distinct from false))
);
commit;
