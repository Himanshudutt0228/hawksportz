import test from "node:test";
import assert from "node:assert/strict";
import { refreshCart } from "./cart-refresh.ts";

const item = { id: "1", slug: "shirt", name: "Shirt", price: 25, stock: 20, size: "M", quantity: 4 };
const product = { id: "1", slug: "shirt", name: "Shirt", price: 30, stock: 2, sizes: ["M"], requiresSize: true };

test("refresh updates current price and caps quantity to available stock", () => {
  const result = refreshCart([item], [product], ["1"]);
  assert.equal(result.items[0].quantity, 2);
  assert.equal(result.items[0].price, 30);
  assert.equal(result.items[0].stock, 2);
  assert.equal(result.messages.length, 2);
});

test("removed products, sold out stock and unavailable sizes are removed with explanations", () => {
  for (const products of [[], [{ ...product, stock: 0 }], [{ ...product, sizes: ["L"] }]]) {
    const result = refreshCart([item], products, ["1"]);
    assert.equal(result.items.length, 0);
    assert.equal(result.messages.length, 1);
  }
});

test("stock is shared across sizes and quantities added during the request are preserved", () => {
  const other = { ...item, size: "L", quantity: 2 };
  const concurrent = { ...item, id: "2" };
  const result = refreshCart([{ ...item, quantity: 1 }, other, concurrent], [{ ...product, sizes: ["M", "L"] }], ["1"]);
  assert.deepEqual(result.items.map((entry) => entry.quantity), [1, 1, 4]);
  assert.equal(result.items[2], concurrent);
});

test("unchanged products produce no messages and missing sizes never become orderable", () => {
  const current = { ...product, price: 25, stock: 20 };
  assert.deepEqual(refreshCart([item], [current], ["1"]).messages, []);
  assert.equal(refreshCart([{ ...item, size: null }], [current], ["1"]).items.length, 0);
});

test('refresh reduces only the affected size and retains the new size inventory', () => {
  const current = { ...product, stock: 10, sizes: ['M', 'L'], sizeStock: { M: 1, L: 9 } };
  const result = refreshCart([item, { ...item, size: 'L', quantity: 3 }], [current], ['1']);
  assert.deepEqual(result.items.map(entry => entry.quantity), [1, 3]);
  assert.deepEqual(result.items[0].sizeStock, { M: 1, L: 9 });
  assert.ok(result.messages.some(message => message.includes('(M): quantity reduced to 1')));
});

test('a sold-out size is removed even when other sizes have stock', () => {
  const result = refreshCart([item], [{ ...product, stock: 20, sizeStock: { M: 0, L: 20 } }], ['1']);
  assert.equal(result.items.length, 0);
});

test('own pending reservation preserves the last size through refresh and reload', () => {
  const pending = [{ id: 'order', lines: [{ id: '1', size: 'M', quantity: 1 }] }];
  const current = { ...product, stock: 0, sizeStock: { M: 0 }, price: 25 };
  const result = refreshCart([{ ...item, quantity: 1 }], [current], ['1'], pending);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].quantity, 1);
  assert.equal(result.items[0].stock, 1);
  assert.deepEqual(result.items[0].sizeStock, { M: 1 });
  assert.deepEqual(result.messages, []);
  const repeated = refreshCart(result.items, [current], ['1'], pending);
  assert.deepEqual(repeated.items, result.items);
});

test('reservations do not supply other sizes, missing products or expired holds', () => {
  const pending = [{ id: 'order', lines: [{ id: '1', size: 'L', quantity: 1 }] }];
  const current = { ...product, stock: 0, sizeStock: { M: 0, L: 0 } };
  assert.equal(refreshCart([item], [current], ['1'], pending).items.length, 0);
  assert.equal(refreshCart([item], [], ['1'], pending).items.length, 0);
  assert.equal(refreshCart([item], [], ['1'], [{ id: 'order', lines: [{ id: '1', size: 'M', quantity: 1 }] }]).items.length, 1);
  assert.equal(refreshCart([item], [current], ['1'], []).items.length, 0);
});

test('missing cart lines restore from verified unpaid snapshots and retain reserved price', () => {
  const pending = [{ id: 'order', lines: [{ id: '1', size: 'M', quantity: 1, name: 'Shirt', slug: 'shirt', unitCents: 100 }] }];
  const current = { ...product, stock: 0, sizeStock: { M: 0 }, price: 5 };
  const restored = refreshCart([], [current], ['1'], pending);
  assert.equal(restored.items.length, 1);
  assert.equal(restored.items[0].price, 1);
  assert.equal(restored.items[0].quantity, 1);
  assert.deepEqual(refreshCart(restored.items, [current], ['1'], pending).items, restored.items);
});
