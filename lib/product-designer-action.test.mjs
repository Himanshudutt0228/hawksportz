import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validProductId } from './admin-product.ts';
import { readCustomAudiences } from './custom-audiences.ts';

const source = readFileSync(new URL('../app/admin/products/[id]/designer-actions.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(denied = false) {
  const writes = [];
  let categories;
  const supabase = { from: () => ({ update: value => {
    writes.push(value);
    return { eq: () => ({ in: (_, values) => { categories = values; return { select: () => ({ maybeSingle: async () => ({ data: { id: 1 } }) }) }; } }) };
  } }) };
  const modules = {
    'next/cache': { revalidatePath() {} },
    '@/lib/auth/admin': { requireAdmin: async () => { if (denied) throw new Error('Access denied'); return { supabase }; } },
    '@/lib/admin-product': { validProductId },
    '@/lib/custom-audiences': { readCustomAudiences },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  } });
  return { action: exports.updateDesignerAvailability, writes, categories: () => categories };
}

test('designer settings require current admin access on direct invocation', async () => {
  const { action, writes } = setup(true);
  await assert.rejects(action('1', {}, new FormData()), /Access denied/);
  assert.equal(writes.length, 0);
});

test('designer settings change only eligibility and restrict updates to clothing', async () => {
  const { action, writes, categories } = setup();
  const data = new FormData(); data.set('customizable', 'on'); data.set('stock', '999');
  assert.equal((await action('1', {}, data)).message, 'Designer availability saved.');
  assert.deepEqual(JSON.parse(JSON.stringify(writes)), [{ customizable: true,custom_audiences:[] }]);
  assert.deepEqual(Array.from(categories()), ['tshirts', 'hoodies', 'jerseys', 'hats', 'beanies', 'sweatshirts']);
  assert.equal((await action('1', {}, new FormData())).message, 'Designer availability saved.');
  assert.deepEqual(JSON.parse(JSON.stringify(writes[1])), { customizable: false,custom_audiences:[] });
  data.set('customizable', 'admin');
  assert.ok((await action('1', {}, data)).error);
  assert.equal(writes.length, 2);
});

test('designer settings accept several audiences and reject forged audience keys',async()=>{
  const current=setup();const data=new FormData();data.set('customizable','on');
  data.append('custom_audiences','business');data.append('custom_audiences','teams');
  assert.ok((await current.action('1',{},data)).message);
  assert.deepEqual(JSON.parse(JSON.stringify(current.writes[0])),{customizable:true,custom_audiences:['business','teams']});
  data.append('custom_audiences','admin');assert.ok((await current.action('1',{},data)).error);
  assert.equal(current.writes.length,1);
});
