import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const customer = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const admin = '00000000-0000-0000-0000-000000000003';
const orderId = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('customer order migration enforces ownership without weakening admin or checkout access', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table public.products(id bigint primary key,stock bigint);
      insert into auth.users values('${customer}',now()),('${other}',now()),('${admin}',now());`);
    for (const file of ['admin-access.sql', 'checkout.sql', 'order-management.sql', 'customer-orders.sql']) {
      await db.exec(readFileSync(new URL('../supabase/' + file, import.meta.url), 'utf8'));
    }
    await db.query('insert into public.store_admins(user_id) values($1)', [admin]);
    for (let n = 1; n <= 30; n++) {
      await db.query(`insert into public.store_orders(id,user_id,access_hash,status,delivery_method,request_lines,
        items,subtotal_cents,shipping_cents,tax_cents,total_cents,paid_at,customer_details)
        values($1,$2,repeat('a',64),$3,'pickup','[]','[{"id":"1","name":"Shirt","size":"M","quantity":1,"unit_cents":100}]',100,0,0,100,'2026-10-28','{"email":"same@example.invalid"}')`,
      [orderId(n), n <= 27 ? customer : n === 28 ? other : n === 29 ? null : customer, n === 30 ? 'open' : 'paid']);
    }
    const role = async (name, user, work) => {
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user ?? '']);
      await db.exec(`set role ${name}`);
      try { await work(); } finally { await db.exec('reset role'); }
    };
    const read = (id = null, page = 1) => db.query('select * from public.store_customer_orders($1,$2)', [id, page]);
    await t.test('only own paid orders; foreign, guest, unpaid and missing IDs all return empty', async () => {
      await role('authenticated', customer, async () => {
        const first = (await read()).rows;
        assert.equal(first.length, 26);
        assert.equal(first[0].id, orderId(27));
        const second = (await read(null, 2)).rows;
        assert.deepEqual(second.map(row => row.id), [orderId(2), orderId(1)]);
        assert.equal((await read(orderId(1))).rows[0].items[0].name, 'Shirt');
        for (const n of [28, 29, 30, 99]) assert.equal((await read(orderId(n))).rows.length, 0);
        for (const field of ['access_hash', 'stripe_session_id', 'user_id', 'request_lines', 'customer_details', 'fulfilment_updated_by']) {
          assert.equal(Object.hasOwn(first[0], field), false);
        }
        for (const page of [0, -1, 100001, null]) await assert.rejects(read(null, page), /Invalid page/);
      });
      await role('authenticated', other, async () => {
        assert.deepEqual((await read()).rows.map(row => row.id), [orderId(28)]);
        assert.equal((await read(orderId(1))).rows.length, 0);
      });
    });
    await t.test('anonymous, missing identity and unconfirmed accounts cannot use the RPC', async () => {
      await role('anon', customer, async () => { await assert.rejects(read(), /permission denied/); });
      await role('authenticated', null, async () => { await assert.rejects(read(), /Confirmed account required/); });
      await db.query('update auth.users set email_confirmed_at=null where id=$1', [customer]);
      await role('authenticated', customer, async () => { await assert.rejects(read(), /Confirmed account required/); });
      await db.query('update auth.users set email_confirmed_at=now() where id=$1', [customer]);
    });
    await t.test('direct reads, writes, secrets and admin actions stay protected', async () => {
      await role('authenticated', customer, async () => {
        assert.equal((await db.query('select id,customer_details from public.store_orders')).rows.length, 0);
        await assert.rejects(db.query('select access_hash from public.store_orders'), /permission denied/);
        await assert.rejects(db.query("update public.store_orders set fulfilment_status='picked_up'"), /permission denied/);
        await assert.rejects(db.query('delete from public.store_orders'), /permission denied/);
        await assert.rejects(db.query("select public.store_admin_fulfil_order($1,'unfulfilled','ready_for_pickup')", [orderId(1)]), /Admin access required/);
        await assert.rejects(db.query("select public.store_checkout_bind($1,repeat('a',64),'cs_test')", [orderId(1)]), /permission denied/);
      });
      await role('authenticated', admin, async () => {
        assert.equal((await db.query('select id from public.store_orders')).rows.length, 30);
        assert.equal((await read()).rows.length, 0);
        await db.query("select public.store_admin_fulfil_order($1,'unfulfilled','ready_for_pickup')", [orderId(1)]);
      });
      await role('authenticated', customer, async () => {
        assert.equal((await read(orderId(1))).rows[0].fulfilment_status, 'ready_for_pickup');
      });
      await role('service_role', null, async () => {
        assert.equal((await db.query('select access_hash from public.store_orders')).rows.length, 30);
      });
    });
  } finally { await db.close(); }
});
