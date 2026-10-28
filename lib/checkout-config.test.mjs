import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(readFileSync(new URL('./checkout-server.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function ready(overrides = {}) {
  const exports = {};
  vm.runInNewContext(code, { exports, process: { env: {
    CHECKOUT_SANDBOX_ENABLED: 'true', CHECKOUT_TAX_MODE: 'sandbox_no_tax',
    STRIPE_SECRET_KEY: 'sk_test_fixture', SUPABASE_SECRET_KEY: 'sb_secret_fixture',
    STRIPE_WEBHOOK_SECRET: 'whsec_fixture', ...overrides,
  } }, require: () => ({}) });
  return exports.sandboxCheckoutReady();
}

test('sandbox no-tax checkout requires explicit policy, test keys and webhook setup', () => {
  assert.equal(ready(), true);
  for (const overrides of [
    { CHECKOUT_SANDBOX_ENABLED: 'false' }, { CHECKOUT_TAX_MODE: undefined },
    { CHECKOUT_TAX_MODE: 'invalid' }, { STRIPE_SECRET_KEY: 'sk_live_fixture' },
    { SUPABASE_SECRET_KEY: '' }, { STRIPE_WEBHOOK_SECRET: '' },
    { CHECKOUT_TAX_MODE: 'automatic', STRIPE_TAX_READY: 'false' },
  ]) assert.equal(ready(overrides), false);
  assert.equal(ready({ CHECKOUT_TAX_MODE: 'automatic', STRIPE_TAX_READY: 'true' }), true);
});
