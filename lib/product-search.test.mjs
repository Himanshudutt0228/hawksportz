import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as search from './product-search.ts';

function setup({ data = [], error = null, fail = false } = {}) {
  const calls = [];
  const builder = {};
  for (const method of ['select','ilike','order']) builder[method] = (...args) => { calls.push([method,...args]); return builder; };
  builder.range = async (...args) => { calls.push(['range',...args]); if (fail) throw new Error('private network error'); return { data, error }; };
  const modules = {
    'react/jsx-runtime': jsx,
    'next/link': { default: ({ children, ...props }) => jsx.jsx('a', { children,...props }) },
    '@/components/ProductSearchForm': { default: () => null },
    '@/components/ProductCard': { default: ({ name }) => jsx.jsx('article',{ children: name }) },
    '@/components/DismissibleNotice': { default: ({ children }) => jsx.jsx('p', { role:'alert',children }) },
    '@/lib/supabase': { supabase: { from: table => { calls.push(['from',table]); return builder; } } },
    '@/lib/design': { productViewImages: () => ({}) }, '@/lib/product-search': search,
  };
  const code = ts.transpileModule(readFileSync(new URL('../app/search/page.tsx',import.meta.url),'utf8'), {
    compilerOptions: { module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code,{ exports,require: name => { if (!(name in modules)) throw new Error(name); return modules[name]; } });
  return { calls, render: async params => renderToStaticMarkup(await exports.default({ searchParams:Promise.resolve(params) })) };
}

test('empty and invalid terms do not issue catalog queries; pagination is bounded', async () => {
  for (const q of [undefined,'   ',['one','two'],'x'.repeat(81),'*','a\u0000b']) {
    const current = setup();
    await current.render({ q });
    assert.equal(current.calls.length,0);
  }
  assert.equal(search.parseProductSearch({ q:'  Shirt   blue  ' }).query,'Shirt blue');
  for (const page of ['0','-1','1000','3oops',['2']]) assert.equal(search.parseProductSearch({ q:'shirt',page }).page,1);
});

test('search uses a single safe name filter and fetches one extra row for pagination', async () => {
  const current = setup({ data:Array.from({ length:25 },(_,i) => ({ id:i,name:`Shirt ${i}`,price:10 })) });
  const query = '50%_\\",name.neq.null';
  const html = await current.render({ q:query,page:'2' });
  assert.deepEqual(current.calls,[['from','products'],['select','id,name,price,slug,image_url,design_images'],
    ['ilike','name',search.productSearchPattern(query)],['order','id'],['range',24,48]]);
  assert.equal((html.match(/<article/g) ?? []).length,24);
  assert.match(html,/Next/); assert.match(html,/Previous/);
  assert.equal(search.productSearchPattern('50%_\\'),'%50\\%\\_\\\\%');
  const href = search.productSearchHref('shirts & hats?',2);
  const url = new URL(href,'http://localhost');
  assert.equal(url.searchParams.get('q'),'shirts & hats?');
  assert.equal(url.searchParams.get('page'),'2');
});

test('query text is escaped and provider failures are distinguished from no matches', async () => {
  const html = await setup().render({ q:'<script>alert(1)</script>' });
  assert.match(html,/&lt;script&gt;/);
  assert.doesNotMatch(html,/<script>/);
  assert.match(html,/No products found/);
  for (const options of [{ error:{ message:'private database error' } },{ fail:true }]) {
    const failed = await setup(options).render({ q:'shirt' });
    assert.match(failed,/Unable to search products/);
    assert.doesNotMatch(failed,/private|No products found/);
  }
});
