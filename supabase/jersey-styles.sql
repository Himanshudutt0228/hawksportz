-- Run after product-styles.sql. Preserves existing products and access rules.
begin;
alter table public.products drop constraint products_garment_style_valid;
alter table public.products add constraint products_garment_style_valid check (
  garment_style is null or
  (category is not null and ((category in ('tshirts','jerseys') and garment_style in ('short-sleeve','long-sleeve'))
    or (category='hoodies' and garment_style in ('pullover','zip-up'))))
);
commit;
