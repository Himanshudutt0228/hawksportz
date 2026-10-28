import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const admin='00000000-0000-0000-0000-000000000001';
const customer='00000000-0000-0000-0000-000000000002';
const unconfirmed='00000000-0000-0000-0000-000000000003';
const path='site/home-hero/10000000-0000-0000-0000-000000000001.webp';
test('actual website image migration protects writes and storage under legacy broad policies',async t=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth,storage to anon,authenticated;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      create policy legacy_broad on storage.objects for all to anon,authenticated using(true) with check(true);
      insert into auth.users values('${admin}',now()),('${customer}',now()),('${unconfirmed}',null);`);
    for(const file of ['admin-access.sql','site-images.sql']) await db.exec(readFileSync(new URL('../supabase/'+file,import.meta.url),'utf8'));
    await db.exec(`insert into public.store_admins(user_id) values('${admin}'),('${unconfirmed}');`);
    const role=async(name,user,work)=>{
      await db.exec(`set role ${name}; set request.jwt.claim.sub='${user??''}';`);
      try { await work(); } finally { await db.exec('reset role'); }
    };
    const upload=(name=path)=>db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['store-site-images',name]);
    const save=(version=0,file=path,slot='home-hero',alt='Team apparel')=>db.query('select public.store_admin_set_site_image($1,$2,$3,$4)',[slot,version,file,alt]);
    await t.test('public reads expose display fields only, never writes or actor information',async()=>{
      for(const [name,user] of [['anon',null],['authenticated',customer],['authenticated',admin]]) await role(name,user,async()=>{
        assert.equal((await db.query('select slot,image_path,alt_text,version from public.store_site_images')).rows.length,7);
        await assert.rejects(db.query('select updated_by from public.store_site_images'),/permission denied/);
        await assert.rejects(db.query("update public.store_site_images set alt_text='forged'"),/permission denied/);
        await assert.rejects(db.query('delete from public.store_site_images'),/permission denied/);
        await assert.rejects(db.query("insert into public.store_site_images(slot) values('other')"),/permission denied/);
      });
    });
    await t.test('anonymous, customer and unconfirmed accounts cannot upload or call save',async()=>{
      for(const [name,user] of [['anon',null],['authenticated',customer],['authenticated',unconfirmed]]) await role(name,user,async()=>{
        await assert.rejects(upload(),/row-level security/);
        await assert.rejects(save(),/permission denied|Admin access required/);
      });
    });
    await t.test('admin can upload and save only existing immutable assets for their correct slot',async()=>{
      await role('authenticated',admin,async()=>{
        await assert.rejects(upload('site/unknown/not-an-image.svg'),/row-level security/);
        await upload();
        await save();
        await assert.rejects(save(),/Image changed/);
        await assert.rejects(save(1,'https://attacker.test/image.webp'),/Uploaded image required/);
        await assert.rejects(save(0,path,'about'),/check constraint/);
        await assert.rejects(save(1,path,'home-hero','bad\ntext'),/Invalid description/);
        const before=(await db.query('select image_path,version from public.store_site_images where slot=$1',['home-hero'])).rows[0];
        assert.equal(before.image_path,path); assert.equal(before.version,1);
        assert.equal((await db.query('update storage.objects set name=$1 where name=$2 returning id',['changed',path])).rows.length,0);
        assert.equal((await db.query('delete from storage.objects where name=$1 returning id',[path])).rows.length,0);
        await save(1,null);
        const cleared=(await db.query('select image_path,alt_text,version from public.store_site_images where slot=$1',['home-hero'])).rows[0];
        assert.equal(cleared.image_path,null); assert.equal(cleared.alt_text,''); assert.equal(cleared.version,2);
      });
      assert.equal((await db.query('select updated_by from public.store_site_images where slot=$1',['home-hero'])).rows[0].updated_by,admin);
    });
    await t.test('revoked admins lose upload and save access immediately',async()=>{
      await db.exec(`delete from public.store_admins where user_id='${admin}'`);
      await role('authenticated',admin,async()=>{
        await assert.rejects(upload(),/row-level security/);
        await assert.rejects(save(2),/Admin access required/);
      });
    });
    await t.test('restrictions do not change unrelated buckets',async()=>{
      await role('authenticated',customer,async()=>{
        await db.query("insert into storage.objects(bucket_id,name) values('unrelated','example')");
        assert.equal((await db.query("update storage.objects set name='other' where bucket_id='unrelated' returning id")).rows.length,1);
        await assert.rejects(db.query("update storage.objects set bucket_id='store-site-images' where bucket_id='unrelated'"),/row-level security/);
        assert.equal((await db.query("delete from storage.objects where bucket_id='unrelated' returning id")).rows.length,1);
      });
    });
    await t.test('audience-card migration preserves existing slots and protects the six new uploads',async()=>{
      await db.exec(readFileSync(new URL('../supabase/custom-apparel-cards.sql',import.meta.url),'utf8'));
      assert.equal((await db.query('select slot from public.store_site_images')).rows.length,13);
      const newPath='site/audience-business/10000000-0000-0000-0000-000000000002.webp';
      await role('authenticated',customer,async()=>{
        await assert.rejects(upload(newPath),/row-level security/);
        await assert.rejects(save(0,newPath,'audience-business'),/Admin access required/);
      });
      await db.exec(`insert into public.store_admins(user_id) values('${admin}')`);
      await role('authenticated',admin,async()=>{
        await upload(newPath);await save(0,newPath,'audience-business');
        await assert.rejects(save(0,newPath,'audience-schools'),/check constraint/);
      });
    });
  } finally { await db.close(); }
});
