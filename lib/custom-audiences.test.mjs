import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {readCustomAudiences,isCustomAudience} from './custom-audiences.ts';

test('multiple audiences are allowlisted and deduplicated without granting privileges',()=>{
  const form=new FormData();form.append('custom_audiences','business');form.append('custom_audiences','teams');form.append('custom_audiences','teams');
  assert.deepEqual(readCustomAudiences(form),['business','teams']);
  form.append('custom_audiences','admin');assert.equal(readCustomAudiences(form),null);
  assert.equal(isCustomAudience('__proto__'),false);assert.equal(isCustomAudience(['teams']),false);
});
test('actual audience migration enforces group eligibility and confirmed admin writes',async()=>{
  const db=new PGlite();
  const admin='00000000-0000-0000-0000-000000000001';
  const customer='00000000-0000-0000-0000-000000000002';
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated;
      create table public.products(id bigint primary key,category text,customizable boolean,name text);
      alter table public.products enable row level security;
      grant select on public.products to anon,authenticated;
      grant update(name,customizable),insert(id,category,customizable,name) on public.products to authenticated;
      create policy "Product updates require store admin" on public.products as restrictive for update to authenticated using(true) with check(true);
      create policy "Product creation requires store admin" on public.products as restrictive for insert to authenticated with check(true);
      create policy legacy_all on public.products for all to anon,authenticated using(true) with check(true);
      insert into auth.users values('${admin}',now()),('${customer}',now());
      insert into public.products values(1,'tshirts',true,'Shirt'),(2,'equipment',false,'Ball');`);
    await db.exec(readFileSync(new URL('../supabase/admin-access.sql',import.meta.url),'utf8'));
    await db.exec(`insert into public.store_admins(user_id) values('${admin}')`);
    await db.exec(readFileSync(new URL('../supabase/product-custom-audiences.sql',import.meta.url),'utf8'));
    assert.deepEqual((await db.query('select custom_audiences from public.products where id=1')).rows[0].custom_audiences,[]);
    const role=async(user,work)=>{await db.exec(`set role authenticated;set request.jwt.claim.sub='${user}'`);try{await work();}finally{await db.exec('reset role');}};
    await role(admin,async()=>{
      await db.exec("update public.products set custom_audiences=array['business','teams'] where id=1");
      await assert.rejects(db.exec("update public.products set custom_audiences=array['admin'] where id=1"),/check constraint/);
      await assert.rejects(db.exec("update public.products set custom_audiences=array['teams'] where id=2"),/check constraint/);
      await assert.rejects(db.exec("update public.products set customizable=false where id=1"),/check constraint/);
    });
    assert.equal((await db.query("select id from public.products where custom_audiences @> array['teams']")).rows.length,1);
    await db.exec(readFileSync(new URL('../supabase/headwear-customization.sql',import.meta.url),'utf8'));
    await db.exec("insert into public.products(id,category,customizable,name) values(3,'hats',true,'Hat')");
    await role(admin,async()=>{await db.exec("update public.products set custom_audiences=array['teams'] where id=3");});
    await db.exec(readFileSync(new URL('../supabase/sweatshirt-customization.sql',import.meta.url),'utf8'));
    await db.exec("insert into public.products(id,category,customizable,name) values(5,'sweatshirts',true,'Sweatshirt')");
    await role(admin,async()=>{await db.exec("update public.products set custom_audiences=array['teams'] where id=5");});
    await role(customer,async()=>{
      assert.equal((await db.query("update public.products set custom_audiences=array['schools'] where id=5 returning id")).rows.length,0);
      assert.equal((await db.query("update public.products set custom_audiences=array['schools'] where id=1 returning id")).rows.length,0);
      await assert.rejects(db.exec("insert into public.products(id,category,customizable,custom_audiences) values(4,'tshirts',true,array['teams'])"),/row-level security/);
    });
    await db.exec(`update auth.users set email_confirmed_at=null where id='${admin}'`);
    await role(admin,async()=>{assert.equal((await db.query("update public.products set custom_audiences='{}' where id=1 returning id")).rows.length,0);});
    await db.exec(`update auth.users set email_confirmed_at=now() where id='${admin}';delete from public.store_admins where user_id='${admin}'`);
    await role(admin,async()=>{assert.equal((await db.query("update public.products set custom_audiences='{}' where id=1 returning id")).rows.length,0);});
    await db.exec('set role anon');await assert.rejects(db.exec("update public.products set custom_audiences='{}' where id=1"),/permission denied/);
  } finally{await db.close();}
});
