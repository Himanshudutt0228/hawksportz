import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import Stripe from 'stripe';
import { limitedBody } from './request-body.ts';

const secret = 'whsec_local_test_fixture';
const stripe = new Stripe('sk_test_local_fixture');
const code = ts.transpileModule(readFileSync(new URL('../app/api/stripe/webhook/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(options = {}) {
  const calls = [];
  const modules = {
    '@/lib/order-email-server': { sendOrderEmails: async () => ({ configured: false, accepted: 0 }) },
    '@/lib/request-body': { limitedBody },
    '@/lib/checkout-server': { checkoutStripe: () => ({ webhooks: stripe.webhooks,
      checkout: { sessions: { retrieve: async () => ({ id: 'cs_test_example', livemode: false,
        metadata: { order_id: 'order-example' }, client_reference_id: 'order-example',
        status: 'complete', payment_status: 'paid', automatic_tax: { enabled: true, status: 'complete' },
        currency: 'cad', amount_subtotal: 2500, amount_total: 3841,
        total_details: { amount_shipping: 899, amount_tax: 442 },
        ...options.session }) } } }),
      orderDatabase: () => ({ rpc: async (name, values) => { calls.push({ name, values }); return {}; } }) },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Response, process: { env: { STRIPE_WEBHOOK_SECRET: secret } },
    require: name => { if (!(name in modules)) throw new Error(`Unexpected module ${name}`); return modules[name]; } });
  return { post: exports.POST, calls };
}
function eventRequest({ signed = true, tampered = false, live = false, type = 'checkout.session.completed' } = {}) {
  const payload = JSON.stringify({ id: 'evt_fixture', object: 'event', livemode: live, type, data: { object: { id: 'cs_test_example' } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request('http://localhost/api/stripe/webhook', { method: 'POST',
    headers: signed ? { 'stripe-signature': signature } : {}, body: tampered ? payload + ' ' : payload });
}

test('unsigned, tampered and live webhook events cannot update orders', async () => {
  const { post, calls } = setup();
  for (const options of [{ signed: false }, { tampered: true }, { live: true }]) assert.equal((await post(eventRequest(options))).status, 400);
  assert.equal(calls.length, 0);
});

test('signed completion is checked against current Stripe payment state', async () => {
  const unpaid = setup({ session: { status: 'open', payment_status: 'unpaid' } });
  assert.equal((await unpaid.post(eventRequest())).status, 200);
  assert.equal(unpaid.calls.length, 0);
  const paid = setup();
  assert.equal((await paid.post(eventRequest())).status, 200);
  assert.equal(paid.calls[0].name, 'store_checkout_settle');
  assert.equal(paid.calls[0].values.p_state, 'paid');
  assert.equal(paid.calls[0].values.p_total, 3841);
});

test('expiration and unfinished tax calculations cannot masquerade as paid orders', async () => {
  const expired = setup({ session: { status: 'expired', payment_status: 'unpaid' } });
  assert.equal((await expired.post(eventRequest({ type: 'checkout.session.expired' }))).status, 200);
  assert.equal(expired.calls[0].values.p_state, 'expired');
  const taxPending = setup({ session: { automatic_tax: { status: 'requires_location_inputs' } } });
  assert.equal((await taxPending.post(eventRequest())).status, 503);
  assert.equal(taxPending.calls.length, 0);
});

test('verified sandbox no-tax session settles only with disabled tax and an explicit zero tax total', async () => {
  for (const tax of [0, 442, undefined]) {
    const current = setup({ session: {
      metadata: { order_id: 'order-example', tax_mode: 'sandbox_no_tax' },
      automatic_tax: { enabled: false, status: null }, amount_total: 3399,
      total_details: { amount_shipping: 899, amount_tax: tax },
    } });
    assert.equal((await current.post(eventRequest())).status, tax === 0 ? 200 : 503);
    assert.equal(current.calls.length, tax === 0 ? 1 : 0);
    if (tax === 0) assert.equal(current.calls[0].values.p_tax, 0);
  }
  const unmarked = setup({ session: { automatic_tax: { enabled: false, status: null } } });
  assert.equal((await unmarked.post(eventRequest())).status, 503);
  assert.equal(unmarked.calls.length, 0);
  const unexpectedAutomatic = setup({ session: { metadata: { order_id: 'order-example', tax_mode: 'sandbox_no_tax' } } });
  assert.equal((await unexpectedAutomatic.post(eventRequest())).status, 503);
  assert.equal(unexpectedAutomatic.calls.length, 0);
});
