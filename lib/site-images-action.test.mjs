import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import sharp from 'sharp';
import * as images from './site-images.ts';
import { prepareProductPhoto } from './product-photo-upload.ts';

const id='10000000-0000-0000-0000-000000000001';
const code=ts.transpileModule(readFileSync(new URL('../app/admin/website-images/actions.ts',import.meta.url),'utf8'),{
  compilerOptions:{ module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022 },
}).outputText;
function setup({ denied=false,version=0,uploadError=false,saveError=false }={}) {
  const calls=[];
  const supabase={
    from:table=>{ calls.push(['read',table]); return { select:()=>({ eq:()=>({ maybeSingle:async()=>({ data:{ image_path:null,version } }) }) }) }; },
    storage:{ from:bucket=>({ upload:async(path,body,options)=>{
      calls.push(['upload',bucket,path,body,options]); return { error:uploadError?{}:null };
    } }) },
    rpc:async(name,params)=>{ calls.push(['rpc',name,params]); return { error:saveError?{}:null }; },
  };
  const modules={ 'node:crypto':{ randomUUID:()=>id },'next/cache':{ revalidatePath:(...args)=>calls.push(['revalidate',...args]) },
    '@/lib/auth/admin':{ requireAdmin:async()=>{ if(denied) throw new Error('Denied'); return { supabase }; } },
    '@/lib/product-photo-upload':{ prepareProductPhoto },'@/lib/site-images':images };
  const exports={};
  vm.runInNewContext(code,{ exports,require:name=>{ if(!(name in modules)) throw new Error(name); return modules[name]; }, File,Buffer });
  return { action:exports.saveSiteImage,calls };
}
async function form() {
  const png=await sharp({ create:{ width:20,height:20,channels:3,background:'blue' } }).png().toBuffer();
  const data=new FormData(); data.set('image',new File([png],'untrusted-name.png',{ type:'image/png' }));
  data.set('alt_text','Team shirts'); data.set('intent','save'); return data;
}
test('direct site image action requires admin before any database or storage access',async()=>{
  const current=setup({ denied:true });
  await assert.rejects(current.action('home-hero',0,{},new FormData()),/Denied/);
  assert.equal(current.calls.length,0);
});
test('invalid slot, corrupt file, missing description and stale version cannot upload',async()=>{
  for(const kind of ['slot','file','description','version']) {
    const current=setup({ version:kind==='version'?1:0 }); const data=await form();
    if(kind==='file') data.set('image',new File(['<svg>'],'fake.png',{ type:'image/png' }));
    if(kind==='description') data.set('alt_text','');
    assert.ok((await current.action(kind==='slot'?'forged':'home-hero',0,{},data)).error);
    assert.equal(current.calls.filter(call=>['upload','rpc'].includes(call[0])).length,0);
  }
});
test('valid save decodes the image, ignores submitted paths/identity and uses the bound version',async()=>{
  const current=setup(); const data=await form();
  data.set('slot','about');data.set('path','https://attacker.test/image');data.set('user_id','forged');data.set('version','999');
  assert.ok((await current.action('home-hero',0,{},data)).message);
  const upload=current.calls.find(call=>call[0]==='upload');
  assert.equal(upload[1],'store-site-images');assert.equal(upload[2],`site/home-hero/${id}.webp`);
  assert.equal((await sharp(upload[3]).metadata()).format,'webp');assert.equal(upload[4].upsert,false);
  const rpc=current.calls.find(call=>call[0]==='rpc');
  assert.deepEqual(JSON.parse(JSON.stringify(rpc)),['rpc','store_admin_set_site_image',{
    p_slot:'home-hero',p_expected_version:0,p_path:`site/home-hero/${id}.webp`,p_alt:'Team shirts',
  }]);
});
test('removal needs explicit confirmation, unlinks only and storage failures do not save',async()=>{
  const current=setup();const data=new FormData();data.set('intent','remove');
  assert.ok((await current.action('home-hero',0,{},data)).error);
  assert.equal(current.calls.length,0);
  data.set('confirm_remove','yes');assert.ok((await current.action('home-hero',0,{},data)).message);
  assert.equal(current.calls.find(call=>call[0]==='rpc')[2].p_path,null);
  assert.equal(current.calls.filter(call=>call[0]==='upload').length,0);
  const failed=setup({ uploadError:true });assert.ok((await failed.action('home-hero',0,{},await form())).error);
  assert.equal(failed.calls.filter(call=>call[0]==='rpc').length,0);
  const uncertain=setup({ saveError:true });assert.ok((await uncertain.action('home-hero',0,{},await form())).error);
  assert.equal(uncertain.calls.filter(call=>call[0]==='revalidate').length,0);
});
test('site image paths accept only the configured slot and immutable WebP shape',()=>{
  assert.equal(images.validSiteImagePath('home-hero',`site/home-hero/${id}.webp`),true);
  for(const path of [`site/about/${id}.webp`,'https://attacker.test/a.webp','../private.webp','site/home-hero/a.svg']) assert.equal(images.validSiteImagePath('home-hero',path),false);
});
