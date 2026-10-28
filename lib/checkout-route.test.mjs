import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { parseCheckout, pickupInstructions, pickupLocation, safeStripeUrl } from './checkout.ts';
import { limitedBody } from './request-body.ts';

const code = ts.transpileModule(readFileSync(new URL('../app/api/checkout/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const id = '00000000-0000-0000-0000-000000000001';
function setup(enabled = true, taxMode = 'automatic', customDesign = null) {
  const calls = []; let sessionParams, customerParams;
  const modules = {
    '@/lib/custom-checkout': { checkoutDesign: value => value && customDesign && value.id === customDesign.id ? customDesign : null },
    '@/lib/auth/server': { authSiteUrl: () => 'http://localhost:3000', createAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
    '@/lib/checkout-server': { sandboxCheckoutReady: () => enabled, sandboxTaxMode: () => taxMode, guestOrderHash: async () => 'a'.repeat(64),
      orderDatabase: () => ({ from: () => ({ select: () => ({ in: async () => ({ data: [{ id: 1 }] }) }) }), rpc: async (name, values) => { calls.push({ name, values });
        return (name === 'store_checkout_start' || name === 'store_custom_checkout_start') ? { data: { id, items: [{ name: 'Shirt', size: 'M', quantity: 1, unit_cents: 2500 }], shipping_cents: values.p_method === 'shipping' ? 899 : 0, session_expires_at: 2000000000 } } : {};
      } }), checkoutStripe: () => ({ customers: { create: async params => { customerParams = params; return { id: 'cus_test' }; } },
        checkout: { sessions: { create: async params => { sessionParams = params; return { id: 'cs_test_example', livemode: false, url: 'https://checkout.stripe.com/c/pay/example' }; } } } }) },
    '@/lib/checkout': { parseCheckout, pickupInstructions, pickupLocation, safeStripeUrl },
    '@/lib/request-body': { limitedBody },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Response, require: name => { if (!(name in modules)) throw new Error(`Unexpected module ${name}`); return modules[name]; } });
  return { post: exports.POST, calls, session: () => sessionParams, customer: () => customerParams };
}
function request(method = 'shipping', origin = 'http://localhost:3000', extra = {}) {
  return new Request('http://localhost:3000/api/checkout', { method: 'POST', headers: { origin },
    body: JSON.stringify({ requestId: id, method, items: [{ id: '1', size: 'M', quantity: 1, price: 0 }], ...extra }) });
}

test('disabled checkout and cross-origin requests perform no privileged work', async () => {
  const disabled = setup(false);
  assert.equal((await disabled.post(request())).status, 503);
  assert.equal(disabled.calls.length, 0);
  const enabled = setup();
  assert.equal((await enabled.post(request('shipping', 'https://evil.example'))).status, 403);
  assert.equal(enabled.calls.length, 0);
});

test('checkout uses database prices, allows a guest, and binds session before returning Stripe URL', async () => {
  const { post, calls, session } = setup();
  const response = await post(request('shipping', undefined, { userId: 'forged', shipping: 0 }));
  assert.equal(response.status, 200);
  assert.equal(calls[0].values.p_user_id, null);
  assert.equal(calls[0].values.p_lines[0].price, undefined);
  assert.equal(session().line_items[0].price_data.unit_amount, 2500);
  assert.equal(session().shipping_options[0].shipping_rate_data.fixed_amount.amount, 899);
  assert.equal(session().automatic_tax.enabled, true);
  assert.equal(calls[1].name, 'store_checkout_bind');
});

test('pickup uses the store tax location without asking customers for a delivery address', async () => {
  const { post, session, customer } = setup();
  assert.equal((await post(request('pickup'))).status, 200);
  assert.equal(customer().shipping.address.postal_code, 'N2N 3E5');
  assert.equal(session().shipping_address_collection, undefined);
  assert.equal(session().shipping_options[0].shipping_rate_data.fixed_amount.amount, 0);
});

test('sandbox no-tax policy is server-controlled and ignores browser tax settings', async () => {
  const { post, session } = setup(true, 'sandbox_no_tax');
  assert.equal((await post(request('shipping', undefined, { tax_mode: 'automatic', tax: 999 }))).status, 200);
  assert.equal(session().automatic_tax.enabled, false);
  assert.equal(session().metadata.tax_mode, 'sandbox_no_tax');
  assert.equal(session().shipping_options[0].shipping_rate_data.fixed_amount.amount, 899);
});


test('custom checkout saves only server-validated snapshots and rejects missing artwork before reservation', async () => {
  const designId = '00000000-0000-0000-0000-000000000002';
  const design = { id: designId, productId: '1', layers: ['validated'] };
  const input = { items: [{ id: '1', size: 'M', quantity: 1, customization: { designId, price: 0 } }], designs: [design] };
  const ready = setup(true, 'sandbox_no_tax', design);
  assert.equal((await ready.post(request('pickup', undefined, input))).status, 200);
  assert.equal(ready.calls[0].name, 'store_custom_checkout_start');
  assert.equal(ready.calls[0].values.p_lines[0].customization.price, undefined);
  assert.deepEqual(ready.calls[0].values.p_designs[designId], design);
  assert.equal(ready.session().line_items[0].price_data.unit_amount, 2500);
  const missing = setup(true, 'sandbox_no_tax');
  assert.equal((await missing.post(request('pickup', undefined, input))).status, 400);
  assert.equal(missing.calls.length, 0);
});
