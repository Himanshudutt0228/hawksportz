import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProductSlug, readProductEdit, readNewProduct, validProductId } from './admin-product.ts';

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: ' Jersey ', description: 'Team jersey', price: '29.95', stock: '12', 'stock:S': '5', 'stock:M': '7', ...overrides })) data.set(key, value);
  return data;
}

test('all menu categories are available for creation without enabling unsupported custom templates',()=>{
  for(const category of ['tshirts','hoodies','jerseys','beanies','hats','sweatshirts','equipment']){
    const data=form({category,sizes:'S, M',colours:''});
    assert.equal(readNewProduct(data)?.category,category);
    if(category==='equipment'){
      data.set('customizable','on');assert.equal(readNewProduct(data),null);
    } else {
      data.set('customizable','on');assert.equal(readNewProduct(data)?.customizable,true);
    }
  }
  assert.equal(readNewProduct(form({category:'tshirts',sizes:'S, M',colours:'',garment_style:'short-sleeve'}))?.garment_style,'short-sleeve');
  assert.equal(readNewProduct(form({category:'tshirts',sizes:'S, M',colours:'',garment_style:'zip-up'})),null);
});

test('product edits accept zero values and allow only the four editable fields', () => {
  assert.deepEqual(readProductEdit(form({ price: '0', stock: '0', is_admin: 'true', slug: 'changed' })),
    { name: 'Jersey', description: 'Team jersey', price: 0, stock: 0 });
});

test('rejects invalid prices, fractional stock, excessive text, and file input', () => {
  for (const price of ['-1', '1.001', 'NaN', 'Infinity', '1e3', '', '10000000']) assert.equal(readProductEdit(form({ price })), null);
  for (const stock of ['-1', '1.5', '', '1000000000']) assert.equal(readProductEdit(form({ stock })), null);
  for (const overrides of [{ name: ' ' }, { name: 'x'.repeat(201) }, { description: 'x'.repeat(10001) }]) assert.equal(readProductEdit(form(overrides)), null);
  const data = form();
  data.set('name', new Blob(['name']), 'name.txt');
  assert.equal(readProductEdit(data), null);
});

test('product identifiers reject malformed database filters and paths', () => {
  assert.equal(validProductId('1'), true);
  assert.equal(validProductId('00000000-0000-0000-0000-000000000001'), true);
  for (const id of ['0', '-1', '1 OR TRUE', '../admin', '1,2', '', null]) assert.equal(validProductId(id), false);
});

test('new products normalize lists without accepting extra privilege or ID fields', () => {
  const result = readNewProduct(form({ slug: 'team-jersey', category: 'jerseys', sizes: 'S, M, S', colours: 'Black, White', customizable: 'on', id: '1', role: 'admin' }));
  assert.deepEqual(result, { name: 'Jersey', description: 'Team jersey', price: 29.95, stock: 12,
    stock_by_size: { S: 5, M: 7 }, category: 'jerseys', sizes: ['S', 'M'], colours: ['Black', 'White'], customizable: true, custom_audiences:[] });
});

test('new products reject unknown categories, missing clothing sizes, invalid toggles and excessive lists', () => {
  const defaults = { slug: 'team-jersey', category: 'jerseys', sizes: 'S, M', colours: '' };
  for (const overrides of [{ category: 'other' },
    { sizes: '' }, { sizes: 'x'.repeat(41) }, { colours: Array.from({ length: 31 }, (_, i) => `Colour ${i}`).join(',') },
    { customizable: 'admin' }, { category: 'equipment', customizable: 'on' }]) {
    assert.equal(readNewProduct(form({ ...defaults, ...overrides })), null);
  }
  assert.equal(readNewProduct(form({ ...defaults, category: 'equipment', sizes: '' })).customizable, false);
});

test('automatic URLs handle accents, symbols, long names and non-Latin names safely', () => {
  const suffix = '00000000-0000-0000-0000-000000000001';
  for (const name of ['Café Team Jersey', '../Admin? #Shirt', 'x'.repeat(200), '球衣', '---']) {
    const slug = createProductSlug(name, suffix);
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(slug.length <= 100);
    assert.ok(slug.endsWith(suffix));
  }
  assert.equal(createProductSlug('Café Team Jersey', suffix), `cafe-team-jersey-${suffix}`);
  const data = form({ slug: '../ignored', category: 'jerseys', sizes: 'S', colours: '' });
  assert.equal(readNewProduct(data).slug, undefined);
});

test('size quantities derive the total and reject missing, fractional, negative and excessive stock', () => {
  const result = readProductEdit(form({ stock: '999', 'stock:S': '0', 'stock:M': '3', 'stock:unlisted': '100' }), ['S', 'M']);
  assert.equal(result.stock, 3);
  assert.deepEqual(result.stock_by_size, { S: 0, M: 3 });
  for (const value of ['', '-1', '1.5', 'NaN', '1000000000']) {
    assert.equal(readProductEdit(form({ 'stock:S': value }), ['S', 'M']), null);
  }
  const missing = form(); missing.delete('stock:S');
  assert.equal(readProductEdit(missing, ['S', 'M']), null);
  assert.equal(readProductEdit(form({ 'stock:S': '999999999', 'stock:M': '1' }), ['S', 'M']), null);
  assert.equal(readProductEdit(form(), []).stock_by_size, null);
});
