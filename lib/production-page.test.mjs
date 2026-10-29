import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as helpers from './admin-orders.ts';
import { parseDesign } from './design.ts';
const id='10000000-0000-0000-0000-000000000001';
const design={version:3,id,productId:'1',colour:'Blue',additionalComments:'<customer comment>',printSizes:{front:'large'},quantities:{M:9},updatedAt:'2026-10-29',layers:[{id:'text',kind:'text',side:'front',x:250,y:250,width:80,height:30,rotation:0,text:'PROOF',font:'Arial',color:'#111111'}]};
function setup({denied=false,paid=true,snapshot=design}={}) {
  const calls=[]; const proofs=[];
  const client={from(table){ calls.push(table); let fields=''; const query={select(value){fields=value;return query},eq(key,value){calls.push([key,value]);return query},async maybeSingle(){return {data:table==='store_orders'?(paid?{id,items:[{id:'1',name:'Shirt',size:'M',quantity:2,customization:{designId:id}}]}:null):fields==='reviewed_at'?{reviewed_at:null}:{designs:{[id]:snapshot}},error:null}}};return query;}};
  const modules={ 'react/jsx-runtime':jsx,'next/link':{default:({children,href})=>jsx.jsx('a',{children,href})},'next/navigation':{notFound(){throw Error('not-found')}},'@/lib/auth/admin':{requireAdmin:async()=>{if(denied)throw Error('denied');return {supabase:client}}},'@/lib/admin-orders':helpers,'@/lib/design':{parseDesign},'@/components/designer/DesignProof':{default:props=>{proofs.push(props);return jsx.jsx('p',{children:props.design.additionalComments})}},'./ProductionControls':{default:()=>null}};
  const exports={};const code=ts.transpileModule(readFileSync(new URL('../app/admin/orders/[id]/production/page.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw Error(name);return modules[name]}});
  return {page:()=>exports.default({params:Promise.resolve({id})}),calls,proofs};
}
test('production page checks admin before database reads and requires paid order',async()=>{
  const denied=setup({denied:true});await assert.rejects(denied.page(),/denied/);assert.equal(denied.calls.length,0);
  const unpaid=setup({paid:false});await assert.rejects(unpaid.page(),/not-found/);assert.ok(unpaid.calls.some(call=>Array.isArray(call)&&call[0]==='status'&&call[1]==='paid'));
});
test('production proof uses private snapshot and actual purchased quantities with escaped comments',async()=>{
  const current=setup();const html=renderToStaticMarkup(await current.page());assert.match(html,/&lt;customer comment&gt;/);assert.equal(current.proofs[0].design.colour,'Blue');assert.equal(current.proofs[0].lines[0].quantity,2);assert.equal(current.proofs[0].downloads,true);
});
test('invalid or mismatched stored snapshot cannot render a production proof',async()=>{
  for(const snapshot of [{...design,productId:'other'},{...design,layers:[]},{...design,layers:[{...design.layers[0],kind:'image',src:'https://attacker.test/art.svg'}]}]){
    const current=setup({snapshot});const html=renderToStaticMarkup(await current.page());assert.match(html,/Do not print/);assert.equal(current.proofs.length,0);assert.doesNotMatch(html,/attacker/);
  }
});
