import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const admin = '00000000-0000-0000-0000-000000000001';
const customer = '00000000-0000-0000-0000-000000000002';
const pickup = '10000000-0000-0000-0000-000000000001';
const shipping = '10000000-0000-0000-0000-000000000002';
const unpaid = '10000000-0000-0000-0000-000000000003';

test('actual order-management migration enforces private reads and fulfilment boundaries', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table public.products(id bigint primary key,stock bigint);
      insert into auth.users values('${admin}',now()),('${customer}',now());`);
    for (const filename of ['admin-access.sql', 'checkout.sql']) {
      await db.exec(readFileSync(new URL('../supabase/' + filename, import.meta.url), 'utf8'));
    }
    await db.exec(`grant select,update on public.store_orders to authenticated;
      grant select(access_hash) on public.store_orders to authenticated;
      create policy legacy_allow_orders on public.store_orders for all to authenticated using(true) with check(true);`);
    await db.exec(readFileSync(new URL('../supabase/order-management.sql', import.meta.url), 'utf8'));
    await db.exec(readFileSync(new URL('../supabase/customer-orders.sql', import.meta.url), 'utf8'));
    await db.exec(`insert into public.store_admins(user_id) values('${admin}');
      insert into public.store_orders(id,access_hash,status,delivery_method,request_lines,items,subtotal_cents,shipping_cents,total_cents,paid_at)
      values('${pickup}',repeat('a',64),'paid','pickup','[]','[]',100,0,100,now()),
      ('${shipping}',repeat('a',64),'paid','shipping','[]','[]',100,899,999,now()),
      ('${unpaid}',repeat('a',64),'open','pickup','[]','[]',100,0,null,null);`);
    const role = async (name, user, work) => {
      await db.exec(`set role ${name}; set request.jwt.claim.sub='${user ?? ''}';`);
      try { await work(); } finally { await db.exec('reset role'); }
    };
    const change = (id, expected, next) => db.query('select public.store_admin_fulfil_order($1,$2,$3)', [id,expected,next]);

    await t.test('customer and anonymous cannot read orders or alter fulfilment', async () => {
      await role('anon', null, async () => {
        await assert.rejects(db.query('select id from public.store_orders'), /permission denied/);
        await assert.rejects(change(pickup, 'unfulfilled','ready_for_pickup'), /permission denied/);
      });
      await role('authenticated', customer, async () => {
        assert.equal((await db.query('select id,customer_details from public.store_orders')).rows.length, 0);
        await assert.rejects(change(pickup,'unfulfilled','ready_for_pickup'), /Admin access required/);
      });
    });
    await t.test('admin reads approved fields but not receipt secrets or direct writes', async () => {
      await role('authenticated', admin, async () => {
        assert.equal((await db.query('select id,total_cents,customer_details from public.store_orders')).rows.length, 3);
        for (const column of ['access_hash','stripe_session_id','request_lines','user_id']) {
          await assert.rejects(db.query('select ' + column + ' from public.store_orders'), /permission denied/);
        }
        await assert.rejects(db.query("update public.store_orders set status='paid'"), /permission denied/);
        await assert.rejects(db.query("update public.store_orders set fulfilment_status='shipped'"), /permission denied/);
        await assert.rejects(db.query('delete from public.store_orders'), /permission denied/);
        await assert.rejects(db.query('insert into public.store_orders(id) values($1)',[unpaid]), /permission denied/);
      });
    });
    await t.test('only forward, paid, method-compatible transitions succeed and record the actor', async () => {
      await role('authenticated', admin, async () => {
        await assert.rejects(change(unpaid,'unfulfilled','ready_for_pickup'), /Paid order required/);
        await assert.rejects(change(pickup,'unfulfilled','picked_up'), /Invalid fulfilment change/);
        await assert.rejects(change(shipping,'unfulfilled','ready_for_pickup'), /Invalid fulfilment change/);
        await change(pickup,'unfulfilled','ready_for_pickup');
        await assert.rejects(change(pickup,'unfulfilled','ready_for_pickup'), /Order changed/);
        await change(pickup,'ready_for_pickup','picked_up');
        await assert.rejects(change(pickup,'picked_up','unfulfilled'), /Invalid fulfilment change/);
        await change(shipping,'unfulfilled','shipped');
      });
      const result = (await db.query('select status,fulfilment_status,fulfilment_updated_by,fulfilment_updated_at,total_cents from public.store_orders where id=$1',[pickup])).rows[0];
      assert.equal(result.status,'paid');
      assert.equal(result.fulfilment_status,'picked_up');
      assert.equal(result.fulfilment_updated_by,admin);
      assert.ok(result.fulfilment_updated_at);
      assert.equal(result.total_cents,100);
    });
    await t.test('revocation and unconfirmed account deny both direct RPC and private reads', async () => {
      await db.exec(`delete from public.store_admins where user_id='${admin}';`);
      await role('authenticated',admin,async () => {
        assert.equal((await db.query('select id from public.store_orders')).rows.length,0);
        await assert.rejects(change(unpaid,'unfulfilled','ready_for_pickup'), /Admin access required/);
      });
      await db.exec(`insert into public.store_admins(user_id) values('${admin}'); update auth.users set email_confirmed_at=null where id='${admin}';`);
      await role('authenticated',admin,async () => {
        assert.equal((await db.query('select id from public.store_orders')).rows.length,0);
        await assert.rejects(change(unpaid,'unfulfilled','ready_for_pickup'), /Admin access required/);
      });
    });
  } finally { await db.close(); }
});
