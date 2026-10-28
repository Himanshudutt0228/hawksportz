import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import { createProductSlug, readNewProduct } from './admin-product.ts';
import { prepareProductPhoto } from './product-photo-upload.ts';

const source = readFileSync(new URL('../app/admin/products/new/actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sides = ['front', 'back', 'left', 'right'];

function setup({ denied = false, insertError = null, collisionOnce = false } = {}) {
  const writes = [];
  let serial = 0;
  const supabase = {
    from: () => ({
      insert: values => {
        writes.push({ insert: values });
        const error = collisionOnce && writes.filter(write => write.insert).length === 1 ? { code: '23505' } : insertError;
        return { select: () => ({ single: async () => ({ data: error ? null : { id: 12 }, error }) }) };
      },
    }),
    storage: { from: () => ({ upload: async path => { writes.push({ upload: path }); return {}; },
      getPublicUrl: path => ({ data: { publicUrl: `https://example.test/${path}` } }) }) },
  };
  const modules = {
    'node:crypto': { randomUUID: () => `generated-${++serial}` },
    'next/cache': { revalidatePath() {} },
    'next/navigation': { redirect: path => { throw new Error(`REDIRECT:${path}`); } },
    '@/lib/auth/admin': { requireAdmin: async () => { if (denied) throw new Error('Access denied'); return { supabase }; } },
    '@/lib/admin-product': { readNewProduct, createProductSlug },
    '@/lib/design': { designSides: sides },
    '@/lib/product-photo-upload': { prepareProductPhoto },
  };
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  }, File, Buffer });
  return { action: exports.createProduct, writes };
}

async function form() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: 'Team jersey', description: '', price: '30', stock: '999', 'stock:S': '2', 'stock:M': '3', slug: 'team-jersey', category: 'jerseys', sizes: 'S, M', colours: 'Black', id: '1', role: 'admin' })) data.set(key, value);
  const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: 'red' } }).png().toBuffer();
  for (const side of sides) data.set(side, new File([image], `${side}.png`, { type: 'image/png' }));
  return data;
}

test('direct unauthorized creation cannot upload or insert', async () => {
  const { action, writes } = setup({ denied: true });
  await assert.rejects(action({}, await form()), /Access denied/);
  assert.equal(writes.length, 0);
});

test('missing photos fail without uploading or inserting', async () => {
  const missing = setup();
  const data = await form(); data.delete('right');
  assert.match((await missing.action({}, data)).error, /four product views/);
  assert.equal(missing.writes.length, 0);
});

test('successful creation links every uploaded view without submitted privilege or ID fields', async () => {
  const { action, writes } = setup();
  await assert.rejects(action({}, await form()), /REDIRECT:\/admin\/products\/12\?created=1/);
  const uploads = writes.filter(write => write.upload);
  assert.equal(uploads.length, 4);
  const record = writes.find(write => write.insert).insert;
  assert.equal(record.id, undefined);
  assert.equal(record.role, undefined);
  assert.equal(record.stock, 5);
  assert.deepEqual(record.stock_by_size, { S: 2, M: 3 });
  assert.match(record.slug, /^team-jersey-generated-/);
  assert.notEqual(record.slug, 'team-jersey');
  assert.equal(record.image_url, record.design_images.front);
  assert.equal(new Set(Object.values(record.design_images)).size, 4);
});

test('automatic URL collision retries without reuploading photos', async () => {
  const { action, writes } = setup({ collisionOnce: true });
  await assert.rejects(action({}, await form()), /REDIRECT:/);
  assert.equal(writes.filter(write => write.upload).length, 4);
  const records = writes.filter(write => write.insert);
  assert.equal(records.length, 2);
  assert.notEqual(records[0].insert.slug, records[1].insert.slug);
});

test('persistent unique conflicts stop after bounded retries', async () => {
  const { action } = setup({ insertError: { code: '23505' } });
  assert.match((await action({}, await form())).error, /could not be created/);
});

test('known database rejections identify setup problems without exposing raw row details',async()=>{
  for(const [code,message,expected] of [
    ['23514','constraint "products_custom_audiences_valid" secret row details',/headwear-customization.sql/],
    ['23514','constraint "products_four_images_required" secret row details',/four distinct product photos/],
    ['23514','constraint "products_category_check" secret row details',/allowed categories/],
    ['22P02','secret row details',/database category type/],
    ['42501','secret row details',/database denied access/],
  ]){
    const {action}=setup({insertError:{code,message}});
    const result=await action({},await form());
    assert.match(result.error,expected);assert.doesNotMatch(result.error,/secret row details/);
  }
});
