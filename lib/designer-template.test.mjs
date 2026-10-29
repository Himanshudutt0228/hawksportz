import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as react from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import * as design from './design.ts';
import * as pricing from './print-pricing.ts';
import * as measurements from './print-measurements.ts';
import * as garmentProof from './garment-proof.ts';

const code=ts.transpileModule(readFileSync(new URL('../components/designer/DesignStudio.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},
}).outputText;
const modules={react,'react/jsx-runtime':jsx,'next/image':{default:()=>null},'next/link':{default:({children})=>jsx.jsx('span',{children})},
  '@/components/designer/GarmentPreview':{default:()=>null},'@/components/designer/LayerEditor':{default:()=>null},
  '@/components/designer/DesignApprovalNotice':{default:()=>null},'@/components/designer/DesignProof':{default:()=>null},
  '@/components/CartProvider':{useCart:()=>({items:[],ready:true,dispatch(){}})},
  '@/lib/design-storage':{},'@/lib/cart':{remainingStock:()=>10},'@/components/DismissibleNotice':{default:()=>null},
  '@/lib/design':design,'@/lib/print-pricing':pricing,'@/lib/print-measurements':measurements,'@/lib/garment-proof':garmentProof};
const exports={};vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw new Error(name);return modules[name];}});
test('headwear editor renders front and Small only while apparel keeps all views',()=>{
  const render=category=>renderToStaticMarkup(jsx.jsx(exports.default,{products:[{id:'1',slug:'test',name:'Test garment',category,price:15,stock:10,sizes:['One Size'],colours:['Black'],imageUrl:null,viewImages:{}}],initialProductId:'1'}));
  for(const category of ['hats','beanies']){
    const html=render(category);
    assert.match(html,/aria-label="Front"/);assert.match(html,/Small.*CA\$2\.50/);
    assert.doesNotMatch(html,/aria-label="(?:Back|Left sleeve|Right sleeve)"|<button[^>]*>Large[^<]*CA\$5\.00|<button[^>]*>Pocket[^<]*CA\$2\.50/);
  }
  const html=render('tshirts');assert.match(html,/aria-label="Left sleeve"/);assert.match(html,/aria-label="Back"/);
});
