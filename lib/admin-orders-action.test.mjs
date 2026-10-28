import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validOrderId, isFulfilmentStatus, nextFulfilment, orderContact } from './admin-orders.ts';

const id = '00000000-0000-0000-0000-000000000001';
const code = ts.transpileModule(readFileSync(new URL('../app/admin/orders/[id]/actions.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function setup({ denied = false, error = false } = {}) {
  const calls = [];
  const modules = {
    '@/lib/order-email-server': { sendOrderEmails: async () => ({ configured: false, accepted: 0 }), orderEmailsConfigured: () => false },
    'next/cache': { revalidatePath: path => calls.push(['revalidate',path]) },
    '@/lib/auth/admin': { requireAdmin: async () => {
      if (denied) throw new Error('Denied');
      return { supabase: { rpc: async (name,values) => { calls.push([name,values]); return error ? { error: {} } : {}; } } };
    } },
    '@/lib/admin-orders': { validOrderId, isFulfilmentStatus },
  };
  const exports = {};
  vm.runInNewContext(code,{ exports,require: name => modules[name] });
  return { action: exports.fulfilOrder,calls };
}
test('direct fulfilment action checks current admin before any database operation', async () => {
  const { action,calls } = setup({ denied: true });
  await assert.rejects(action(id,'unfulfilled',{},new FormData()), /Denied/);
  assert.equal(calls.length,0);
});
test('fulfilment action ignores forged order/payment/stock fields and handles failure safely', async () => {
  const form = new FormData(); form.set('next_status','ready_for_pickup');
  form.set('id','forged'); form.set('status','paid'); form.set('stock','999'); form.set('user_id','forged');
  const current = setup();
  assert.ok((await current.action(id,'unfulfilled',{},form)).message);
  assert.deepEqual(JSON.parse(JSON.stringify(current.calls[0])),['store_admin_fulfil_order', {
    p_order_id:id,p_expected_status:'unfulfilled',p_next_status:'ready_for_pickup',
  }]);
  assert.ok((await setup({ error:true }).action(id,'unfulfilled',{},form)).error);
  const invalid = setup(); form.set('next_status','paid');
  assert.ok((await invalid.action(id,'unfulfilled',{},form)).error);
  assert.equal(invalid.calls.length,0);
});
test('method-specific next steps and malformed contact data are handled explicitly', () => {
  assert.equal(nextFulfilment('pickup','unfulfilled').status,'ready_for_pickup');
  assert.equal(nextFulfilment('pickup','ready_for_pickup').status,'picked_up');
  assert.equal(nextFulfilment('shipping','unfulfilled').status,'shipped');
  assert.equal(nextFulfilment('shipping','ready_for_pickup'),null);
  assert.equal(nextFulfilment('pickup','picked_up'),null);
  assert.equal(isFulfilmentStatus('__proto__'),false);
  assert.equal(validOrderId('../private'),false);
  assert.deepEqual(orderContact({ name: {}, shipping: { address: null } }).address,[]);
  assert.deepEqual(orderContact({ shipping: { name:'Test recipient',address:{ line1:'Test street',city:'Kitchener',state:'ON',postal_code:'N2N 3E5',country:'CA' } } }).address,
    ['Test street','Kitchener, ON, N2N 3E5','CA']);
});
