import test from "node:test";
import assert from "node:assert/strict";
import { addItem, addDesignItems, changeQuantity, itemKey, readCart } from "./cart.ts";

const product = { id: "1", slug: "shirt", name: "Shirt", price: 25, stock: 3 };

test("adding merges the same size and limits total stock across sizes", () => {
  let items = addItem([], product, "S");
  items = addItem(items, product, "S");
  items = addItem(items, product, "M");
  assert.deepEqual(items.map(({ size, quantity }) => ({ size, quantity })), [
    { size: "S", quantity: 2 }, { size: "M", quantity: 1 },
  ]);
  assert.equal(addItem(items, product, "L"), items);
});

test("quantity changes cannot exceed shared stock or accept invalid quantities", () => {
  const items = addItem(addItem([], product, "S"), product, "M");
  const key = itemKey(items[0]);
  assert.equal(changeQuantity(items, key, 3), items);
  for (const invalid of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(changeQuantity(items, key, invalid), items);
  }
  const changed = changeQuantity(items, key, 2);
  assert.equal(changed[0].quantity, 2);
  assert.equal(changed[1].quantity, 1);
  assert.equal(items[0].quantity, 1);
});

test("saved carts restore safely and reject malformed or excessive quantities", () => {
  const items = addItem([], product, null);
  assert.deepEqual(readCart(JSON.stringify(items)), items);
  assert.deepEqual(readCart("invalid JSON"), []);
  assert.deepEqual(readCart('{"items":[]}'), []);
  assert.deepEqual(readCart(JSON.stringify([null, {}, { ...items[0], quantity: 99 }])), []);
  assert.deepEqual(readCart(JSON.stringify([items[0], items[0]])), items);
});

test('size limits are independent and ready-made/custom lines share each size', () => {
  const sized = { ...product, stock: 5, sizeStock: { S: 1, M: 4, L: 0 } };
  let items = addItem([], sized, 'S');
  assert.equal(addItem(items, sized, 'S'), items);
  assert.equal(addItem(items, sized, 'L'), items);
  assert.equal(addItem(items, sized, 'unknown'), items);
  assert.equal(addItem(items, sized, null), items);
  items = addItem(items, sized, 'M');
  assert.equal(items.length, 2);
  const custom = { ...sized, customization: { designId: '12345678-1234-1234-1234-123456789012', colour: 'Black', sides: ['front'], printPricePerSide: 5 } };
  assert.equal(addDesignItems(items, custom, { S: 1 }), items);
  items = addDesignItems(items, custom, { M: 2 });
  assert.equal(changeQuantity(items, itemKey(items[1]), 3), items);
  assert.equal(changeQuantity(items, itemKey(items[1]), 2)[1].quantity, 2);
  assert.deepEqual(readCart(JSON.stringify(items)), items);
});

test('stored carts reject invalid or exceeded size quantities', () => {
  const item = { ...product, stock: 5, size: 'S', quantity: 2, sizeStock: { S: 1, M: 4 } };
  assert.deepEqual(readCart(JSON.stringify([item])), []);
  assert.deepEqual(readCart(JSON.stringify([{ ...item, sizeStock: { S: -1 } }])), []);
});
