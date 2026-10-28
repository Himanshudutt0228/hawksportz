import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as orderHelpers from './admin-orders.ts';
import * as checkout from './checkout.ts';

const id = '10000000-0000-0000-0000-000000000001';
function load(path, modules) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error('Unexpected module ' + name);
    return modules[name];
  } });
  return exports;
}
function setup({ user = { email_confirmed_at: '2026-10-28' }, authError = null, data = [], error = null } = {}) {
  const calls = [];
  const client = { auth: { getUser: async () => ({ data: { user }, error: authError }) },
    rpc: async (name, params) => { calls.push([name, params]); return { data, error }; } };
  const navigation = { redirect: path => { throw new Error('redirect:' + path); }, notFound: () => { throw new Error('not-found'); } };
  const customer = load('./customer-orders.ts', {
    'server-only': {}, 'next/navigation': navigation,
    '@/lib/auth/server': { createAuthClient: async () => client }, '@/lib/admin-orders': orderHelpers,
  });
  const modules = { 'react/jsx-runtime': jsx, 'next/navigation': navigation,
    'next/link': { default: ({ href, children, ...props }) => jsx.jsx('a', { href, children, ...props }) },
    '@/components/DismissibleNotice': { default: ({ children }) => jsx.jsx('p', { role: 'alert', children }) },
    '@/lib/customer-orders': customer, '@/lib/admin-orders': orderHelpers, '@/lib/checkout': checkout };
  return { calls, list: load('../app/account/orders/page.tsx', modules).default,
    detail: load('../app/account/orders/[id]/page.tsx', modules).default };
}
const props = { searchParams: Promise.resolve({}), params: Promise.resolve({ id }) };
const order = { id, paid_at: '2026-10-28T12:00:00Z', delivery_method: 'pickup',
  items: [{ id: '1', name: '<Shirt>', size: 'M', quantity: 2, unit_cents: 100 }],
  subtotal_cents: 200, shipping_cents: 0, tax_cents: 0, total_cents: 200,
  fulfilment_status: 'ready_for_pickup', fulfilment_updated_at: '2026-10-28T13:00:00Z' };

test('every customer order page verifies confirmed identity before reading orders', async () => {
  for (const options of [{ user: null }, { user: {} }, { authError: {} }]) {
    const current = setup(options);
    await assert.rejects(current.list(props), /redirect:\/sign-in/);
    await assert.rejects(current.detail(props), /redirect:\/sign-in/);
    assert.equal(current.calls.length, 0);
  }
});
test('customer detail validates ID, hides missing orders and handles database failures', async () => {
  const current = setup();
  await assert.rejects(current.detail({ params: Promise.resolve({ id: '../secret' }) }), /not-found/);
  assert.equal(current.calls.length, 0);
  await assert.rejects(current.detail(props), /not-found/);
  const failed = setup({ error: { message: 'secret database information' } });
  const html = renderToStaticMarkup(await failed.detail(props));
  assert.match(html, /Unable to load your order/);
  assert.doesNotMatch(html, /secret database information|Payment confirmed/);
});
test('purchased snapshot, totals and current fulfilment are rendered without mutation controls', async () => {
  const current = setup({ data: [order] });
  const html = renderToStaticMarkup(await current.detail(props));
  assert.match(html, /Ready for pickup/);
  assert.match(html, /&lt;Shirt&gt;/);
  assert.match(html, /2\.00/);
  assert.match(html, /arrange a pickup time/);
  assert.doesNotMatch(html, /<form|Mark shipped|Mark ready|secret/);
  assert.deepEqual(JSON.parse(JSON.stringify(current.calls)), [['store_customer_orders', { p_order_id: id }]]);
  for (const status of ['shipped', 'picked_up', 'unfulfilled']) {
    const state = setup({ data: [{ ...order, fulfilment_status: status }] });
    const output = renderToStaticMarkup(await state.detail(props));
    assert.match(output, new RegExp(status === 'shipped' ? 'Shipped' : status === 'picked_up' ? 'Picked up' : 'Preparing your order'));
    if (status === 'picked_up') assert.doesNotMatch(output, /arrange a pickup time/);
  }
});
test('order list bounds pagination, shows empty and error states and never accepts user identity', async () => {
  for (const page of ['0', '-1', '100001', '1junk', ['2']]) {
    const current = setup();
    const html = renderToStaticMarkup(await current.list({ searchParams: Promise.resolve({ page, user_id: 'forged' }) }));
    assert.match(html, /No paid orders/);
    assert.deepEqual(JSON.parse(JSON.stringify(current.calls)), [['store_customer_orders', { p_page: 1 }]]);
  }
  const current = setup({ data: Array.from({ length: 26 }, (_, n) => ({ ...order, id: `${id.slice(0, -2)}${String(n).padStart(2, '0')}` })) });
  const html = renderToStaticMarkup(await current.list({ searchParams: Promise.resolve({ page: '2' }) }));
  assert.match(html, /Previous/); assert.match(html, /Next/);
  assert.equal((html.match(/href="\/account\/orders\/100/g) ?? []).length, 25);
  const failed = setup({ error: { message: 'secret' } });
  const failure = renderToStaticMarkup(await failed.list(props));
  assert.match(failure, /Unable to load your orders/);
  assert.doesNotMatch(failure, /No paid orders|secret/);
});
