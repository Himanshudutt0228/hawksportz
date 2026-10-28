import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSizeStock, stockForSize } from './product-stock.ts';

test('inventory parsing preserves legacy stock and fails closed on malformed configured stock', () => {
  assert.equal(readSizeStock(null), null);
  assert.deepEqual(readSizeStock({ S: 1, M: 0 }), { S: 1, M: 0 });
  for (const input of [[], 'invalid', { S: -1 }, { S: 1.5 }, { S: '3' }]) assert.deepEqual(readSizeStock(input), {});
  assert.equal(stockForSize({ stock: 4 }, 'S'), 4);
  assert.equal(stockForSize({ stock: 4, sizeStock: {} }, 'S'), 0);
  assert.equal(stockForSize({ stock: 4, sizeStock: { S: 8 } }, 'S'), 4);
  assert.equal(stockForSize({ stock: 4, sizeStock: {} }, 'constructor'), 0);
});
