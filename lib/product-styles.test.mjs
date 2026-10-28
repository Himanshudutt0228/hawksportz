import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {readProductStyle} from './product-styles.ts';

test('styles reject mismatched categories, malformed filters and unknown values',()=>{
  assert.equal(readProductStyle('tshirts','short-sleeve'),'short-sleeve');
  assert.equal(readProductStyle('hoodies','zip-up'),'zip-up');
  assert.equal(readProductStyle('jerseys','long-sleeve'),'long-sleeve');
  assert.equal(readProductStyle('tshirts',undefined),null);
  for(const [category,value] of [['tshirts','zip-up'],['hoodies','long-sleeve'],['hats','pullover'],['tshirts',['short-sleeve']],['tshirts','__proto__']])assert.equal(readProductStyle(category,value),undefined);
});

test('actual style migration limits writes to confirmed admins and validates category',async()=>{
  const db=new PGlite();
  const admin='00000000-0000-0000-0000-000000000001', customer='00000000-0000-0000-0000-000000000002';
  try{
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;
      create table public.products(id bigint primary key,category text,name text);
      alter table public.products enable row level security;
      grant select on public.products to anon,authenticated;
      grant update(name),insert(id,category,name) on public.products to authenticated;
      create policy "Product updates require store admin" on public.products as restrictive for update to authenticated using(true) with check(true);
      create policy "Product creation requires store admin" on public.products as restrictive for insert to authenticated with check(true);
      create policy legacy_all on public.products for all to anon,authenticated using(true) with check(true);
      insert into auth.users values('${admin}',now()),('${customer}',now());
      insert into public.products values(1,'tshirts','Shirt'),(2,'hoodies','Hoodie'),(3,'hats','Hat');`);
    await db.exec(readFileSync(new URL('../supabase/admin-access.sql',import.meta.url),'utf8'));
    await db.exec(`insert into public.store_admins(user_id) values('${admin}')`);
    await db.exec(readFileSync(new URL('../supabase/product-styles.sql',import.meta.url),'utf8'));
    await db.exec("insert into public.products values(4,'jerseys','Jersey',null)");
    await db.exec(readFileSync(new URL('../supabase/jersey-styles.sql',import.meta.url),'utf8'));
    const role=async(user,work)=>{await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}'`);try{await work();}finally{await db.exec('reset role');}};
    await role(admin,async()=>{
      await db.exec("update public.products set garment_style='short-sleeve' where id=1");
      await db.exec("update public.products set garment_style='zip-up' where id=2");
      await db.exec("update public.products set garment_style='long-sleeve' where id=4");
      await assert.rejects(db.exec("update public.products set garment_style='zip-up' where id=4"),/check constraint/);
      for(const id of [1,3])await assert.rejects(db.exec(`update public.products set garment_style='pullover' where id=${id}`),/check constraint/);
      await assert.rejects(db.exec("update public.products set garment_style='__proto__' where id=1"),/check constraint/);
    });
    await role(customer,async()=>{
      assert.equal((await db.query("update public.products set garment_style='long-sleeve' where id=1 returning id")).rows.length,0);
      await assert.rejects(db.exec("insert into public.products(id,category,garment_style) values(5,'tshirts','long-sleeve')"),/row-level security/);
    });
    await db.exec(`update auth.users set email_confirmed_at=null where id='${admin}'`);
    await role(admin,async()=>assert.equal((await db.query("update public.products set garment_style=null where id=1 returning id")).rows.length,0));
    await db.exec(`update auth.users set email_confirmed_at=now() where id='${admin}';delete from public.store_admins where user_id='${admin}'`);
    await role(admin,async()=>assert.equal((await db.query("update public.products set garment_style=null where id=1 returning id")).rows.length,0));
    await db.exec('set role anon');await assert.rejects(db.exec("update public.products set garment_style=null where id=1"),/permission denied/);
  }finally{await db.close();}
});
