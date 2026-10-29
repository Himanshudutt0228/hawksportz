import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { validOrderId } from './admin-orders.ts';
const id='10000000-0000-0000-0000-000000000001';
function setup({denied=false,rpcError=false,sendError=false,enabled=true}={}){
 const calls=[];const modules={'next/cache':{revalidatePath:()=>{}},'@/lib/auth/admin':{requireAdmin:async()=>{if(denied)throw Error('denied');return {supabase:{rpc:async(name)=>{calls.push(name);return {error:rpcError?{message:'secret'}:null}}}}}},'@/lib/admin-orders':{validOrderId},'@/lib/order-email-server':{orderEmailsConfigured:()=>enabled,sendOrderEmails:async()=>{calls.push('send');if(sendError)throw Error('provider secret');return {accepted:1}}}};
 const code=ts.transpileModule(readFileSync(new URL('../app/admin/orders/[id]/production/actions.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code,{exports,require:name=>modules[name]});return {approve:exports.approveDesign,calls};
}
const form=()=>{const f=new FormData();f.set('approve','yes');return f;};
test('approval action verifies admin and explicit confirmation before queue or email work',async()=>{
 const denied=setup({denied:true});await assert.rejects(denied.approve(id,{},form()),/denied/);assert.equal(denied.calls.length,0);
 const current=setup();assert.ok((await current.approve(id,{},new FormData())).error);assert.equal(current.calls.length,0);
 const failed=setup({rpcError:true});assert.ok((await failed.approve(id,{},form())).error);assert.deepEqual(failed.calls,['store_admin_approve_design']);
});
test('saved approval survives email outages and does not claim inbox delivery',async()=>{
 for(const options of [{},{sendError:true},{enabled:false}]){
  const current=setup(options);const state=await current.approve(id,{},form());assert.match(state.message,/Approval saved/);assert.doesNotMatch(state.message,/provider secret|delivered/);assert.deepEqual(current.calls,['store_admin_approve_design','send']);
 }
});
