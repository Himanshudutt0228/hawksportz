import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as designHelpers from './design.ts';
import * as measurements from './print-measurements.ts';
function load(path,modules){const exports={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;vm.runInNewContext(code,{exports,require:name=>{if(!(name in modules))throw Error(name);return modules[name]}});return exports.default;}
const common={'react':React,'react/jsx-runtime':jsx,'@/lib/design':designHelpers};
const Preview=load('../components/designer/GarmentPreview.tsx',{...common,'@/components/designer/LayerContent':{default:({layer})=>jsx.jsx('image',{href:layer.src})}});
const Notice=load('../components/designer/DesignApprovalNotice.tsx',common);
const Proof=load('../components/designer/DesignProof.tsx',{...common,'@/lib/print-measurements':measurements,'./GarmentPreview':{default:Preview},'./DesignApprovalNotice':{default:Notice}});
const original='data:image/png;base64,AAAA';
const design={version:3,id:'d',productId:'1',colour:'Blue',printSizes:{front:'large'},quantities:{M:1},updatedAt:'2026-10-29',garmentProof:{productId:'1',signature:'a'.repeat(64),photos:{front:'data:image/webp;base64,AAAA',back:'data:image/webp;base64,BBBB',left:'data:image/webp;base64,CCCC',right:'data:image/webp;base64,DDDD'}},layers:[{id:'art',kind:'image',side:'front',x:235,y:245,width:80,height:90,rotation:17,src:original}]};
test('owner sees four frozen garment views, exact artwork transform and unchanged original download bytes',()=>{
 const html=renderToStaticMarkup(jsx.jsx(Proof,{design,lines:[{name:'Shirt',size:'M',quantity:2}],ownerView:true,downloads:true}));
 assert.equal((html.match(/data-garment-photo="true"/g)||[]).length,4);
 for(const src of Object.values(design.garmentProof.photos))assert.ok(html.includes(src));
 assert.match(html,/translate\(235 245\) rotate\(17\)/);
 assert.match(html,/href="data:image\/png;base64,AAAA" download="artwork-d-1.png"/);
 assert.match(html,/full resolution/);assert.equal((html.match(/No print on this side/g)||[]).length,3);
 assert.doesNotMatch(html,/Review garment side/);
});
test('customer has one combined garment preview and side buttons, without a four-photo gallery or original download links',()=>{
 const html=renderToStaticMarkup(jsx.jsx(Proof,{design,lines:[{name:'Shirt',size:'M',quantity:2}]}));
 assert.equal((html.match(/data-garment-photo="true"/g)||[]).length,1);
 assert.match(html,/Review garment side/);assert.match(html,/Left sleeve/);assert.match(html,/Right sleeve/);
 assert.doesNotMatch(html,/download="artwork/);
});
test('older order proofs do not substitute current garment photographs',()=>{
 const html=renderToStaticMarkup(jsx.jsx(Proof,{design:{...design,garmentProof:undefined},lines:[],ownerView:true}));
 assert.equal((html.match(/data-garment-photo="true"/g)||[]).length,0);assert.match(html,/older design has no saved garment photos/);
});

test('customer email promise appears only once approval emails are ready',()=>{
 const base={design,lines:[]};
 const before=renderToStaticMarkup(jsx.jsx(Proof,base));assert.match(before,/owner will review/);assert.doesNotMatch(before,/receive an email once/);
 const ready=renderToStaticMarkup(jsx.jsx(Proof,{...base,approvalEmailsReady:true}));assert.match(ready,/may contact you/);assert.match(ready,/receive an email once your design is approved/);
});
