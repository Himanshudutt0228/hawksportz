import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { limitedBody } from './request-body.ts';
import { safeStripeUrl } from './checkout.ts';

const id = '00000000-0000-0000-0000-000000000001';
const code = ts.transpileModule(readFileSync(new URL('../app/api/checkout/[id]/route.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup(options = {}) {
  const calls = [];
  let retrievals = 0;
  const base = { id: 'cs_test_fixture', livemode: false, status: 'open', payment_status: 'unpaid',
    metadata: { order_id: id }, client_reference_id: id, url: 'https://checkout.stripe.com/c/pay/fixture' };
  const modules = {
    '@/lib/auth/server': { authSiteUrl: () => 'http://localhost:3000', createAuthClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.user ?? null } }) } }) },
    '@/lib/checkout': { safeStripeUrl }, '@/lib/request-body': { limitedBody },
    '@/lib/checkout-server': {
      guestOrderHash: async () => options.hash === undefined ? 'cookie-hash' : options.hash,
      orderDatabase: () => {
        calls.push('database');
        return { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
          id, access_hash: 'cookie-hash', user_id: 'owner', status: 'open', stripe_session_id: 'cs_test_fixture', ...options.order,
        } }) }) }) }), rpc: async (name, values) => { calls.push({ name, values }); return options.settleFails ? { error: {} } : {}; } };
      },
      checkoutStripe: () => ({ checkout: { sessions: {
        retrieve: async () => {
          calls.push('retrieve'); retrievals++;
          if (options.retrieveFails && retrievals > 1) throw new Error('Unavailable');
          return { ...base, ...(retrievals > 1 ? { status: 'expired', url: null } : {}), ...options.session,
            ...(retrievals > 1 ? options.afterExpire : {}) };
        },
        expire: async () => { calls.push('expire'); if (options.expireFails) throw new Error('Unknown outcome'); },
      } } }),
    },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, Response, require: name => modules[name] });
  return { post: (action = 'cancel', origin = 'http://localhost:3000') => exports.POST(new Request('http://localhost:3000/api/checkout/' + id, {
    method: 'POST', headers: { origin }, body: JSON.stringify({ action, access_hash: 'forged', user_id: 'owner' }),
  }), { params: Promise.resolve({ id }) }), calls };
}
const settlements = calls => calls.filter(call => typeof call === 'object' && call.name === 'store_checkout_settle');

test('wrong origin, absent identity, unrelated guest and unconfirmed user cannot change checkout', async () => {
  const crossOrigin = setup();
  assert.equal((await crossOrigin.post('cancel', 'https://evil.example')).status, 403);
  assert.equal(crossOrigin.calls.length, 0);
  for (const options of [{ hash: null }, { hash: 'unrelated' }, { hash: null, user: { id: 'owner' } }]) {
    const current = setup(options);
    assert.equal((await current.post()).status, 404);
    assert.equal(current.calls.includes('retrieve'), false);
    assert.equal(settlements(current.calls).length, 0);
  }
});

test('only verified account owner or receipt-cookie holder can resume the bound safe Stripe session', async () => {
  for (const options of [{}, { hash: null, user: { id: 'owner', email_confirmed_at: 'confirmed' } }]) {
    const current = setup(options);
    const response = await current.post('resume');
    assert.equal(response.status, 200);
    assert.equal((await response.json()).url, 'https://checkout.stripe.com/c/pay/fixture');
    assert.equal(current.calls.includes('expire'), false);
    assert.equal(settlements(current.calls).length, 0);
  }
  for (const session of [{ livemode: true }, { metadata: { order_id: 'other' } }, { id: 'cs_test_other' },
    { client_reference_id: 'other' }, { url: 'https://evil.example/' }]) {
    assert.notEqual((await setup({ session }).post('resume')).status, 200);
  }
});

test('remove expires Stripe first and releases only after retrieving confirmed expiration', async () => {
  const current = setup();
  assert.equal((await current.post()).status, 200);
  assert.deepEqual(current.calls.slice(1, 4), ['retrieve', 'expire', 'retrieve']);
  assert.equal(settlements(current.calls)[0].values.p_state, 'expired');
  assert.equal(settlements(current.calls)[0].values.p_session_id, 'cs_test_fixture');
});

test('paid, mismatched or uncertain sessions never release stock', async () => {
  for (const options of [
    { order: { status: 'paid' } }, { order: { stripe_session_id: null } },
    { session: { livemode: true } }, { session: { status: 'complete', payment_status: 'paid' } },
    { afterExpire: { status: 'complete', payment_status: 'paid' } },
    { expireFails: true, afterExpire: { status: 'open' } }, { retrieveFails: true },
    { afterExpire: { metadata: { order_id: 'other' } } },
  ]) {
    const current = setup(options);
    assert.notEqual((await current.post()).status, 200);
    assert.equal(settlements(current.calls).length, 0);
  }
});

test('lost expire response can reconcile safely; already-expired removal and database retries are safe', async () => {
  const lost = setup({ expireFails: true });
  assert.equal((await lost.post()).status, 200);
  assert.equal(settlements(lost.calls).length, 1);
  const expired = setup({ order: { status: 'expired' } });
  assert.equal((await expired.post()).status, 200);
  assert.equal(expired.calls.includes('retrieve'), false);
  const failed = setup({ settleFails: true });
  assert.equal((await failed.post()).status, 503);
});
