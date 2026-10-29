import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { PGlite } from '@electric-sql/pglite';
import * as admin from './admin-orders.ts';
import * as checkout from './checkout.ts';
import * as contact from './store-contact.ts';
import { timingSafeEqual } from 'node:crypto';

function load(path, modules, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  }, ...globals });
  return exports;
}
const content = load('./order-email-content.ts', { './admin-orders': admin, './checkout': checkout, './store-contact': contact });
const id = '10000000-0000-0000-0000-000000000001';
const snapshot = { id, kind: 'payment_confirmed', email: 'buyer@example.test', method: 'pickup',
  items: [{ name: '<script>test</script>', size: 'M', quantity: 2, unit_cents: 100 }], subtotal: 200, shipping: 0, tax: 0, total: 200 };

test('test-labelled plain text uses purchased totals and does not expose private links', () => {
  const body = content.orderEmailContent(snapshot);
  assert.match(body.subject, /^\[TEST\]/);
  assert.match(body.text, /\$2\.00/);
  assert.equal(body.html, undefined);
  assert.equal(body.reply_to, contact.storeContactEmail);
  assert.doesNotMatch(body.text, /https?:|access_hash|stripe/);
  assert.match(content.orderEmailContent({ ...snapshot, kind: 'ready_for_pickup' }).text, /222 Bankside Drive/);
  assert.throws(() => content.orderEmailContent({ ...snapshot, email: 'a@example.test\r\nBcc:x@example.test' }));
});

function server({ status = 200, fail = false, enabled = true } = {}) {
  const calls = [], requests = [];
  const job = { id, lease_token: id, snapshot, request_body: null };
  let claimed = false;
  const db = { rpc: async (name, args) => {
    calls.push([name,args]);
    if (name === 'store_email_claim') { const data = claimed ? [] : [job]; claimed = true; return { data }; }
    if (name === 'store_email_prepare') return { data: args.p_body };
    return {};
  } };
  const env = { ORDER_EMAILS_ENABLED: String(enabled), RESEND_API_KEY: 're_fixture', ORDER_EMAIL_FROM: 'accounts@hawksportz.ca', ORDER_EMAIL_WORKER_SECRET: 'x'.repeat(32) };
  const api = load('./order-email-server.ts', { 'server-only': {}, 'node:crypto': { timingSafeEqual },
    './checkout-server': { orderDatabase: () => db }, './order-email-content': content }, {
    process: { env }, Buffer, AbortSignal,
    fetch: async (url, options) => { requests.push([url, options]); if (fail) throw new Error('timeout'); return new Response(JSON.stringify({ id: 'provider_fixture' }), { status }); },
  });
  return { api, calls, requests };
}
test('worker authentication fails closed and disabled dispatch does not claim jobs', async () => {
  const { api, calls } = server({ enabled: false });
  assert.equal(api.emailWorkerAuthorized(null), false);
  assert.equal(api.emailWorkerAuthorized('Bearer wrong'), false);
  assert.equal(api.emailWorkerAuthorized(`Bearer ${'x'.repeat(32)}`), true);
  await api.sendOrderEmails();
  assert.equal(calls.length, 0);
});
test('request is frozen before sending with stable key and acceptance is acknowledged', async () => {
  const { api, calls, requests } = server();
  assert.equal((await api.sendOrderEmails()).accepted, 1);
  assert.equal(calls[1][0], 'store_email_prepare');
  assert.equal(requests[0][1].headers['Idempotency-Key'], `order-email/${id}`);
  assert.equal(calls[2][1].p_provider_id, 'provider_fixture');
});
test('timeouts and rate limits retry while invalid credentials require review', async () => {
  for (const options of [{ fail: true }, { status: 429 }, { status: 500 }, { status: 401 }]) {
    const { api, calls } = server(options);
    await api.sendOrderEmails();
    const finish = calls.find(([name]) => name === 'store_email_finish')[1];
    assert.equal(finish.p_provider_id, null);
    assert.equal(finish.p_review, options.status === 401);
  }
});

test('dispatch endpoint denies unauthenticated callers before accessing the queue', async () => {
  let dispatched = 0;
  const route = load('../app/api/internal/order-emails/route.ts', {
    '@/lib/order-email-server': {
      emailWorkerAuthorized: value => value === 'Bearer fixture', orderEmailsConfigured: () => true,
      sendOrderEmails: async () => { dispatched++; return { configured: true, accepted: 0 }; },
    },
  }, { Response });
  assert.equal((await route.POST(new Request('http://localhost/api/internal/order-emails', { method:'POST' }))).status,401);
  assert.equal(dispatched,0);
  const result = await route.POST(new Request('http://localhost/api/internal/order-emails', {
    method:'POST',headers:{ authorization:'Bearer fixture' },
  }));
  assert.equal(result.status,200);
  assert.equal(result.headers.get('cache-control'),'private, no-store');
  assert.equal(dispatched,1);
});

test('actual email migration protects data, deduplicates transitions and recovers leases safely', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role;
      create table public.products(id bigint primary key,stock bigint);`);
    for (const file of ['admin-access.sql','checkout.sql','order-management.sql','order-emails.sql']) {
      await db.exec(readFileSync(new URL('../supabase/' + file, import.meta.url),'utf8'));
    }
    await db.query(`insert into public.store_orders(id,access_hash,status,delivery_method,request_lines,items,subtotal_cents,shipping_cents,customer_details)
      values($1,repeat('a',64),'open','pickup','[]','[]',200,0,'{"email":"buyer@example.test"}')`, [id]);
    assert.equal((await db.query('select * from public.store_order_emails')).rows.length, 0);
    await db.exec(`update public.store_orders set status='paid',total_cents=200,tax_cents=0;
      update public.store_orders set status='paid';
      update public.store_orders set fulfilment_status='ready_for_pickup';`);
    assert.equal((await db.query('select * from public.store_order_emails')).rows.length, 2);
    for (const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.store_order_emails'), /permission denied/);
      await assert.rejects(db.query('select public.store_email_claim(null)'), /permission denied/);
      await assert.rejects(db.query(`select public.store_email_prepare($1,$1,'{}')`,[id]), /permission denied/);
      await assert.rejects(db.query('select public.store_email_finish($1,$1,null,false)',[id]), /permission denied/);
      await assert.rejects(db.query('select * from public.store_admin_email_status($1)',[id]), /permission denied|Admin access required/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const job = (await db.query('select * from public.store_email_claim(null)')).rows[0];
    assert.equal(job.kind, 'payment_confirmed');
    assert.equal((await db.query('select * from public.store_email_claim(null)')).rows.length, 0);
    const prepare = async body => (await db.query('select public.store_email_prepare($1,$2,$3) as body',[job.id, job.lease_token,body])).rows[0].body;
    assert.deepEqual(await prepare({ text: 'original' }), { text: 'original' });
    assert.deepEqual(await prepare({ text: 'changed' }), { text: 'original' });
    await db.query('select public.store_email_finish($1,$2,$3,false)',[job.id,id,'forged']);
    await db.exec('reset role');
    assert.equal((await db.query('select state from public.store_order_emails where id=$1',[job.id])).rows[0].state,'pending');
    await db.exec("update public.store_order_emails set lease_until=now()-interval '1 minute'");
    const retried = (await db.query('select * from public.store_email_claim(null)')).rows[0];
    assert.equal(retried.id,job.id);
    assert.notEqual(retried.lease_token,job.lease_token);
    assert.deepEqual(retried.request_body,{ text:'original' });
    await db.query('select public.store_email_finish($1,$2,$3,false)',[job.id,retried.lease_token,'accepted']);
    assert.equal((await db.query('select * from public.store_email_claim(null)')).rows[0].kind,'ready_for_pickup');
    await db.exec("update public.store_order_emails set lease_until=null,first_attempt_at=now()-interval '24 hours' where state='pending'");
    assert.equal((await db.query('select * from public.store_email_claim(null)')).rows.length,0);
    assert.equal((await db.query("select state from public.store_order_emails where kind='ready_for_pickup'")).rows[0].state,'review');
  } finally { await db.close(); }
});

test('design approval email uses test labelling and the persisted recipient without private receipt links',()=>{
 const body=content.orderEmailContent({...snapshot,kind:'design_approved'});
 assert.match(body.subject,/^\[TEST\].*approved/);assert.match(body.text,/owner has reviewed and approved/);
 assert.match(body.text,/does not authorize production/);assert.deepEqual(JSON.parse(JSON.stringify(body.to)),['buyer@example.test']);
 assert.doesNotMatch(body.text,/https?:|hawk-order-access/);
});
