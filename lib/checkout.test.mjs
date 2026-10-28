import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCheckout, safeStripeUrl } from './checkout.ts';
import { consumePurchasedItems } from './cart.ts';
import { limitedBody } from './request-body.ts';

const request = { requestId: '00000000-0000-0000-0000-000000000001', method: 'shipping',
  items: [{ id: '1', size: 'M', quantity: 2, price: 0 }] };

test('checkout only accepts bounded ready-made lines and never takes browser prices/fees', () => {
  assert.deepEqual(parseCheckout({ ...request, shipping: 0, tax: 0 }), { requestId: request.requestId,
    method: 'shipping', lines: [{ id: '1', size: 'M', quantity: 2 }] });
  for (const items of [[], [...request.items, ...request.items], [{ id: '1', size: 'M', quantity: 100 }],
    [{ id: '1', size: 'M', quantity: -1 }], [{ id: '1', size: null, quantity: 1, customization: {} }]]) {
    assert.equal(parseCheckout({ ...request, items }), null);
  }
  assert.equal(parseCheckout({ ...request, method: 'free' }), null);
});

test('payment redirects allow only the actual HTTPS Stripe checkout host', () => {
  assert.equal(safeStripeUrl('https://checkout.stripe.com/c/pay/example'), true);
  for (const url of ['https://checkout.stripe.com.evil.example/', 'https://evil.example/', 'javascript:alert(1)',
    'http://checkout.stripe.com/', 'https://user@checkout.stripe.com/', 'https://checkout.stripe.com:444/']) assert.equal(safeStripeUrl(url), false);
});

test('paid-cart updates retain extra quantities, other sizes and custom designs', () => {
  const cart = [{ id: '1', size: 'M', quantity: 4 }, { id: '1', size: 'L', quantity: 1 },
    { id: '1', size: 'M', quantity: 2, customization: { designId: 'custom' } }];
  assert.deepEqual(consumePurchasedItems(cart, [{ id: '1', size: 'M', quantity: 2 }]).map(item => item.quantity), [2, 1, 2]);
});

test('request reading bounds bytes even without a Content-Length header', async () => {
  assert.equal(await limitedBody(new Request('http://localhost', { method: 'POST', body: 'abc' }), 3), 'abc');
  await assert.rejects(limitedBody(new Request('http://localhost', { method: 'POST', body: 'abcd' }), 3), /large/);
});
