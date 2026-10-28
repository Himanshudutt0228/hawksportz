import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { readProductEdit, validProductId } from './admin-product.ts';
import { productSizes } from './product-sizes.ts';
import { readProductStyle } from './product-styles.ts';

const source = readFileSync(new URL('../app/admin/products/[id]/actions.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function setup(denied = false) {
  const writes = [];
  const supabase = { from: () => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1, category:'tshirts', sizes: ['S', 'M'] } }) }) }),
    update: value => { writes.push(value); return { eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: 1 } }) }) }) }; },
  }) };
  const modules = {
    'next/cache': { revalidatePath() {} },
    '@/lib/auth/admin': { requireAdmin: async () => { if (denied) throw new Error('Access denied'); return { supabase }; } },
    '@/lib/admin-product': { readProductEdit, validProductId },
    '@/lib/product-sizes': { productSizes },
    '@/lib/product-styles': { readProductStyle },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  } });
  return { action: exports.updateProduct, writes };
}

function form() {
  const data = new FormData();
  for (const [name, value] of Object.entries({ name: 'Shirt', description: '', price: '20', stock: '999', sizes: 'L', 'stock:S': '2', 'stock:M': '3', 'stock:L': '100' })) data.set(name, value);
  return data;
}

test('direct stock-save invocation rechecks admin access before reading or writing', async () => {
  const { action, writes } = setup(true);
  await assert.rejects(action('1', {}, form()), /Access denied/);
  assert.equal(writes.length, 0);
});

test('style save uses the trusted category and rejects a forged category and hoodie style',async()=>{
  const {action,writes}=setup();
  const invalid=form();invalid.set('category','hoodies');invalid.set('garment_style','zip-up');
  assert.ok((await action('1',{},invalid)).error);assert.equal(writes.length,0);
  const valid=form();valid.set('garment_style','long-sleeve');
  assert.equal((await action('1',{},valid)).message,'Product saved.');
  assert.equal(writes[0].garment_style,'long-sleeve');assert.equal(writes[0].category,undefined);
});

test('stock save uses database sizes and ignores forged total/size-list fields', async () => {
  const { action, writes } = setup();
  assert.equal((await action('1', {}, form())).message, 'Product saved.');
  assert.deepEqual(structuredClone(writes), [{ name: 'Shirt', description: '', price: 20, stock: 5, stock_by_size: { S: 2, M: 3 } }]);
  const missing = form(); missing.delete('stock:S');
  assert.ok((await action('1', {}, missing)).error);
  assert.equal(writes.length, 1);
});
