import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import { signGarmentPhotos,verifyGarmentProof } from './garment-proof-signature.ts';
import { readGarmentProof,garmentViews } from './garment-proof.ts';
import { parseDesign } from './design.ts';
const secret='sb_secret_'+ 'x'.repeat(40);
const photos=Object.fromEntries(garmentViews.map(side=>[side,'data:image/webp;base64,AAAA']));
test('photo proof binds the product and all four image bytes without exposing the signing key',()=>{
  const proof=signGarmentPhotos('1',photos,secret);
  assert.ok(verifyGarmentProof(proof,'1',secret));
  assert.ok(verifyGarmentProof({...proof,photos:{right:photos.right,front:photos.front,left:photos.left,back:photos.back}},'1',secret));
  assert.equal(verifyGarmentProof(proof,'2',secret),false);
  assert.equal(verifyGarmentProof({...proof,photos:{...photos,back:photos.back+'AAAA'}},'1',secret),false);
  assert.equal(verifyGarmentProof({...proof,signature:'0'.repeat(64)},'1',secret),false);
  assert.equal(verifyGarmentProof(proof,'1',''),false);
  for(const bad of [{...proof,photos:{...photos,left:'https://attacker.test/image.svg'}},{...proof,photos:{front:photos.front}},{...proof,photos:{...photos,front:'data:image/webp;base64,'+'A'.repeat(400001)}}])assert.equal(readGarmentProof(bad),null);
  assert.ok(!JSON.stringify(proof).includes(secret));
});
test('saved design parser retains frozen backgrounds and rejects swapped-product proof',()=>{
  const proof=signGarmentPhotos('1',photos,secret);
  const design={version:3,id:'d',productId:'1',colour:'Blue',printSizes:{front:'large'},quantities:{M:1},layers:[],updatedAt:'2026-10-29',garmentProof:proof};
  assert.deepEqual(parseDesign(design).garmentProof,proof);
  assert.equal(parseDesign({...design,productId:'2'}),null);
  assert.ok(parseDesign({...design,garmentProof:undefined}));
});
function loadServer(fetch){
  const exports={};const code=ts.transpileModule(readFileSync(new URL('./garment-proof-server.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const modules={'server-only':{},sharp:{default:sharp,__esModule:true},'./garment-proof':{garmentViews},'./garment-proof-signature':{signGarmentPhotos}};
  vm.runInNewContext(code,{exports,URL,Buffer,AbortSignal,fetch,require:name=>modules[name]});return exports;
}
test('photo fetch rejects off-site URLs and redirects, and freezes copies independent of source changes',async()=>{
  const bytes=await sharp({create:{width:20,height:30,channels:3,background:'#fff'}}).png().toBuffer();
  const requests=[];
  const server=loadServer(async(url,options)=>{requests.push([String(url),options.redirect]);return new Response(bytes)});
  const origin='https://project.supabase.co';
  for(const url of ['https://evil.test/a.png',origin+'/auth/a',origin+'/storage/v1/object/public/product-images/a?redirect=1','http://project.supabase.co/storage/v1/object/public/product-images/a']) assert.throws(()=>server.trustedGarmentPhoto(url,origin));
  const urls=Object.fromEntries(garmentViews.map(side=>[side,origin+'/storage/v1/object/public/product-images/'+side+'.png']));
  const proof=await server.freezeGarmentPhotos('1',urls,origin,secret);
  assert.equal(requests.length,4);assert.ok(requests.every(([,redirect])=>redirect==='error'));
  urls.front='https://changed.example/photo';
  assert.ok(verifyGarmentProof(proof,'1',secret));
  assert.ok(garmentViews.every(side=>proof.photos[side].startsWith('data:image/webp;base64,')));
  await assert.rejects(server.freezeGarmentPhotos('1',{...urls,left:undefined},origin,secret));
});

test('garment snapshot rejects oversized, redirecting or non-raster responses',async()=>{
  const origin='https://project.supabase.co';const urls=Object.fromEntries(garmentViews.map(side=>[side,origin+'/storage/v1/object/public/product-images/'+side]));
  for(const fetch of [async()=>new Response('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),async()=>new Response(new Uint8Array(5*1024*1024+1)),async()=>{throw Error('redirect refused')}]) {
    const server=loadServer(fetch);
    await assert.rejects(server.freezeGarmentPhotos('1',urls,origin,secret));
  }
});
