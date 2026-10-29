import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
function setup(enabled,error,throws=false){let reads=0;const modules={'server-only':{},'./order-email-server':{orderEmailsConfigured:()=>enabled},'./checkout-server':{orderDatabase:()=>({from:()=>{reads++;if(throws)throw Error('unavailable');return {select:()=>({limit:async()=>({error})})}}})}};const code=ts.transpileModule(readFileSync(new URL('./design-approval-server.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code,{exports,require:name=>modules[name]});return {ready:exports.designApprovalEmailsReady,reads:()=>reads};}
test('approval email promise requires configured dispatch and successful schema check',async()=>{
 const disabled=setup(false,null);assert.equal(await disabled.ready(),false);assert.equal(disabled.reads(),0);
 for(const current of [setup(true,{code:'42703'}),setup(true,null,true)])assert.equal(await current.ready(),false);
 assert.equal(await setup(true,null).ready(),true);
});
