import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validProductId } from './admin-product.ts';

const source = readFileSync(new URL('../app/admin/products/[id]/delete-actions.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup({ denied = false, error = null, missing = false } = {}) {
  const calls = [];
  const supabase = { from: table => {
    assert.equal(table, 'products');
    return { delete: () => ({ eq: (field, id) => {
      calls.push({ field, id });
      return { select: () => ({ maybeSingle: async () => ({ data: missing || error ? null : { id }, error }) }) };
    } }) };
  } };
  const modules = {
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect: url => { throw new Error(`REDIRECT:${url}`); } },
    '@/lib/auth/admin': { requireAdmin: async () => { if (denied) throw new Error('Access denied'); return { supabase }; } },
    '@/lib/admin-product': { validProductId },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  } });
  return { action: exports.deleteProduct, calls };
}
function confirmation() { const form = new FormData(); form.set('confirmDelete', 'delete'); return form; }

test('direct deletion requires current admin access', async () => {
  const { action, calls } = setup({ denied: true });
  await assert.rejects(action('1', {}, confirmation()), /Access denied/);
  assert.equal(calls.length, 0);
});

test('missing confirmation or malformed identifiers cannot delete anything', async () => {
  const { action, calls } = setup();
  assert.ok((await action('1', {}, new FormData())).error);
  assert.ok((await action('../admin', {}, confirmation())).error);
  assert.equal(calls.length, 0);
});

test('confirmed deletion targets only the bound product ID and redirects on success', async () => {
  const { action, calls } = setup();
  const form = confirmation(); form.set('id', '999');
  await assert.rejects(action('1', {}, form), /REDIRECT:\/admin\?deleted=1/);
  assert.deepEqual(calls, [{ field: 'id', id: '1' }]);
});

test('missing products and database failures do not report a successful deletion', async () => {
  for (const options of [{ missing: true }, { error: { code: '42501' } }, { error: { code: '23503' } }]) {
    const { action } = setup(options);
    const result = await action('1', {}, confirmation());
    assert.ok(result.error);
    assert.equal(result.message, undefined);
  }
});
