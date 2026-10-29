import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const id = '10000000-0000-0000-0000-000000000001';

function setup({ denied = false, status = 'paid', missingOrder = false, orderError = null } = {}) {
  const reads = [];
  const designs = { design: { id: 'design-1' } };
  const supabase = {
    from(table) {
      reads.push(table);
      let query = {};
      query.select = () => query;
      query.eq = () => query;
      query.maybeSingle = async () => table === 'store_orders'
        ? { data: missingOrder ? null : { status }, error: orderError }
        : { data: { designs }, error: null };
      return query;
    },
  };
  const modules = {
    '@/lib/auth/admin': { requireAdmin: async () => {
      if (denied) throw new Error('admin required');
      return { supabase };
    } },
    '@/lib/admin-orders': { validOrderId: value => value === id },
  };
  const code = ts.transpileModule(readFileSync(new URL('../app/api/admin/orders/[id]/designs/route.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, Request, Response, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  } });
  return { get: value => exports.GET(new Request('https://example.test'), { params: Promise.resolve({ id: value }) }), reads, designs };
}

test('design download requires admin before database access', async () => {
  const current = setup({ denied: true });
  await assert.rejects(current.get(id), /admin required/);
  assert.deepEqual(current.reads, []);
});

test('design download hides missing and unpaid orders before reading design snapshots', async () => {
  for (const options of [{ status: 'open' }, { status: 'expired' }, { missingOrder: true }]) {
    const current = setup(options);
    const response = await current.get(id);
    assert.equal(response.status, 404);
    assert.deepEqual(current.reads, ['store_orders']);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
  }
});

test('design download fails closed if paid status cannot be checked', async () => {
  const current = setup({ orderError: { message: 'private database error' } });
  const response = await current.get(id);
  assert.equal(response.status, 503);
  assert.deepEqual(current.reads, ['store_orders']);
  assert.doesNotMatch(await response.text(), /private database error/);
});

test('paid admin design download returns a private JSON attachment', async () => {
  const current = setup();
  const response = await current.get(id);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), current.designs);
  assert.match(response.headers.get('content-disposition'), /attachment/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(current.reads, ['store_orders', 'store_order_designs']);
});

test('malformed order IDs are not queried', async () => {
  const current = setup();
  assert.equal((await current.get('../invalid')).status, 404);
  assert.deepEqual(current.reads, []);
});
