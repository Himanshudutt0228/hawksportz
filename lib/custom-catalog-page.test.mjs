import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as audiences from './custom-audiences.ts';
import {validProductId} from './admin-product.ts';
import * as printPricing from './print-pricing.ts';

const records=[
  {id:7,name:'Custom sweatshirt',category:'sweatshirts',customizable:true,custom_audiences:['teams']},
  {id:8,name:'Unconfigured sweatshirt',category:'sweatshirts',customizable:null,custom_audiences:[]},
  {id:1,name:'Shared shirt',category:'tshirts',customizable:true,custom_audiences:['business','teams']},
  {id:2,name:'Sports jersey',category:'jerseys',customizable:true,custom_audiences:['teams']},
  {id:3,name:'Unassigned hoodie',category:'hoodies',customizable:true,custom_audiences:[]},
  {id:4,name:'Disabled shirt',category:'tshirts',customizable:false,custom_audiences:['teams']},
  {id:5,name:'Custom hat',category:'hats',customizable:true,custom_audiences:['teams']},
  {id:6,name:'Unconfigured beanie',category:'beanies',customizable:null,custom_audiences:[]},
];
function load(path,modules){const exports={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText;vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw new Error(name);return modules[name];},URLSearchParams,Intl});return exports.default;}
function setup(){
  let rows=records.map(row=>({...row,slug:'item-'+row.id,price:20,stock:5}));const calls=[];
  const query={select(){return this;},in(){return this;},contains(column,value){calls.push([column,value]);rows=rows.filter(row=>row.custom_audiences.includes(value[0]));return this;},async order(){return {data:rows,error:null};}};
  const shared={'react/jsx-runtime':jsx,'next/link':{default:({children,...props})=>jsx.jsx('a',{children,...props})},'next/image':{default:()=>null},'@/lib/print-pricing':printPricing};
  const grid=load('../components/CustomProductGrid.tsx',shared);
  const page=load('../app/custom-apparel/page.tsx',{
    ...shared,'@/components/designer/DesignStudio':{default:props=>jsx.jsx('div',{'data-studio-product':props.initialProductId??'resume'})},
    '@/components/CustomProductGrid':{default:grid},'@/components/designer/ResumeDesignLink':{default:()=>null},
    '@/lib/supabase':{supabase:{from:()=>query}},'@/lib/product-sizes':{productSizes:()=>['M']},
    '@/lib/design':{productColours:()=>['As pictured'],productViewImages:()=>({})},'@/lib/custom-pricing':{customPrintPrice:()=>null},
    '@/lib/product-stock':{readSizeStock:()=>null},'@/lib/site-images-server':{loadSiteImages:async()=>({})},
    '@/lib/admin-product':{validProductId},'@/lib/custom-audiences':audiences,
    '@/components/DismissibleNotice':{default:({children})=>jsx.jsx('p',{role:'alert',children})},
  });
  return {calls,render:async params=>renderToStaticMarkup(await page({searchParams:Promise.resolve(params)}))};
}
test('general custom catalog includes all audience assignments and unassigned products once',async()=>{
  const current=setup();const html=await current.render({});
  for(const name of ['Shared shirt','Sports jersey','Unassigned hoodie','Custom hat','Custom sweatshirt'])assert.match(html,new RegExp(name));
  assert.doesNotMatch(html,/Disabled shirt|Unconfigured beanie|Unconfigured sweatshirt|data-studio-product/);
  assert.equal((html.match(/<article/g)??[]).length,5);assert.equal(current.calls.length,0);
});
test('audience products are filtered and selection preserves the audience',async()=>{
  const current=setup();const html=await current.render({audience:'business'});
  assert.match(html,/Shared shirt/);assert.doesNotMatch(html,/Sports jersey|Unassigned hoodie/);
  assert.match(html,/product=1&amp;audience=business/);
  assert.equal(current.calls[0][0],'custom_audiences');assert.equal(current.calls[0][1][0],'business');
});
test('a selected product opens only its own editor and invalid links cannot substitute another',async()=>{
  assert.match(await setup().render({product:'7'}),/data-studio-product="7"/);
  assert.match(await setup().render({product:'2'}),/data-studio-product="2"/);
  for(const params of [{product:'999'},{product:['1','2']},{audience:'business',product:'2'}]){
    const html=await setup().render(params);assert.match(html,/unavailable/);assert.doesNotMatch(html,/data-studio-product/);
  }
});
