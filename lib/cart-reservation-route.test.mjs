import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { limitedBody } from './request-body.ts';

const code = ts.transpileModule(readFileSync(new URL('../app/api/cart/products/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup({ hash = null, fail = false } = {}) {
  const calls = [];
  const query = {};
  for (const method of ['select', 'eq', 'in', 'order']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
  query.limit = async () => fail ? { error: {} } : { data: [{ id: 'private-order', items: [{ id: '1', size: 'M', quantity: 1, name: 'Shirt', slug: 'shirt', unit_cents: 100 }] }] };
  const modules = {
    '@/lib/supabase': { supabase: { from: () => ({ select: () => ({ in: async () => ({ data: [] }) }) }) } },
    '@/lib/checkout-server': { guestOrderHash: async () => hash, orderDatabase: () => {
      calls.push(['privileged']); return { from: name => { calls.push(['from', name]); return query; } };
    } },
    '@/lib/request-body': { limitedBody }, '@/lib/product-sizes': {}, '@/lib/design': {},
    '@/lib/custom-pricing': {}, '@/lib/product-stock': {}, '@/lib/print-pricing': {},
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Response, require: name => modules[name] });
  return { post: exports.POST, calls };
}
const request = () => new Request('http://localhost/api/cart/products', { method: 'POST', body: JSON.stringify({ ids: [], access_hash: 'forged', user_id: 'forged', pendingOrders: [{ id: 'forged' }] }) });

test('request claims cannot grant pending-order access without the receipt cookie', async () => {
  const { post, calls } = setup();
  const response = await post(request());
  assert.deepEqual(await response.json(), { products: [], pendingOrders: [] });
  assert.equal(calls.length, 0);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('pending orders are filtered by server cookie hash and return only recovery fields', async () => {
  const { post, calls } = setup({ hash: 'verified-cookie-hash' });
  const response = await post(request());
  assert.deepEqual(await response.json(), { products: [], pendingOrders: [
    { id: 'private-order', lines: [{ id: '1', size: 'M', quantity: 1, name: 'Shirt', slug: 'shirt', unitCents: 100 }] },
  ] });
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'access_hash' && call[2] === 'verified-cookie-hash'));
  const statuses = calls.find(call => call[0] === 'in');
  assert.equal(JSON.stringify(statuses[2]), JSON.stringify(['creating', 'open']));
});

test('reservation lookup failure fails closed instead of deleting reserved cart items', async () => {
  const { post } = setup({ hash: 'verified-cookie-hash', fail: true });
  assert.equal((await post(request())).status, 503);
});
