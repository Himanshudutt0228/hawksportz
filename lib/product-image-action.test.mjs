import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validProductId } from './admin-product.ts';
import { prepareProductPhoto } from './product-photo-upload.ts';

const source = readFileSync(new URL('../app/admin/products/[id]/image-actions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sides = ['front', 'back', 'left', 'right'];

function loadAction({ authorize, supabase }) {
  const exports = {};
  const modules = {
    'node:crypto': { randomUUID: () => '00000000-0000-0000-0000-000000000001' },
    'next/cache': { revalidatePath() {} },
    '@/lib/auth/admin': { requireAdmin: authorize ?? (async () => ({ supabase })) },
    '@/lib/admin-product': { validProductId },
    '@/lib/design': { designSides: sides, productViewImages: product => product.design_images },
    '@/lib/product-photo-upload': { prepareProductPhoto },
  };
  vm.runInNewContext(compiled, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected module ${name}`);
    return modules[name];
  }, File, Buffer, Set, JSON });
  return exports.updateProductImages;
}

test('direct image-save invocation fails before any data access for a non-admin', async () => {
  const action = loadAction({ authorize: async () => { throw new Error('Access denied'); } });
  await assert.rejects(action('1', {}, new FormData()), /Access denied/);
});

test('corrupt uploads never reach storage or a product update', async () => {
  let writes = 0;
  const supabase = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 1,
      image_url: 'https://example.test/front.webp', design_images: Object.fromEntries(sides.map(side => [side, `https://example.test/${side}.webp`])) } }) }) }),
      update: () => { writes++; throw new Error('Unexpected update'); } }),
    storage: { from: () => { writes++; throw new Error('Unexpected upload'); } },
  };
  const form = new FormData();
  form.set('front', new File(['not an image'], 'test.png', { type: 'image/png' }));
  const result = await loadAction({ supabase })('1', {}, form);
  assert.match(result.error, /could not be read/);
  assert.equal(writes, 0);
});
