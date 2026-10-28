import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customPricingForCategory,quotePrintAreas,readPrintSizes,printAreaForSize,printTemplateForProduct} from './print-pricing.ts';
import {parseDesign,keepInPrintArea,selectionBounds} from './design.ts';
import {readCart} from './cart.ts';
import {refreshCart} from './cart-refresh.ts';
import {parseCheckout} from './checkout.ts';

const pricing=customPricingForCategory('tshirts',25);
test('product templates keep short sleeves, lengthen long sleeves and restrict headwear pricing',()=>{
  for(const category of ['tshirts','jerseys']){
    assert.equal(printTemplateForProduct({category,garmentStyle:'short-sleeve'}),'standard');
    assert.equal(printTemplateForProduct({category,garmentStyle:'long-sleeve'}),'long-sleeve');
  }
  for(const category of ['hoodies','sweatshirts']) {
    assert.equal(printTemplateForProduct({category}),'long-sleeve');
    assert.equal(quotePrintAreas(customPricingForCategory(category,category==='hoodies'||category==='sweatshirts'?27.5:category==='hats'||category==='beanies'?15:12.5),['front','left'],{front:'large',left:'pocket'},2).total,70);
  }
  assert.equal(printAreaForSize('left','pocket',undefined,'long-sleeve').height,200);
  assert.equal(printAreaForSize('left','pocket').height,70);
  for(const category of ['hats','beanies']){
    assert.equal(printTemplateForProduct({category}),'headwear');
    assert.equal(printAreaForSize('front','large',undefined,'headwear').width,70);
    const price=customPricingForCategory(category,category==='hoodies'||category==='sweatshirts'?27.5:category==='hats'||category==='beanies'?15:12.5);
    assert.equal(quotePrintAreas(price,['front'],{front:'pocket'},2).total,35);
    assert.equal(quotePrintAreas(price,['front'],{front:'large'},1),null);
    assert.equal(quotePrintAreas(price,['back'],{back:'pocket'},1),null);
  }
});

test('long sleeve and headwear saved layouts restore safely and reject incompatible areas',()=>{
  const draft={version:3,id:'draft',productId:'1',colour:'White',updatedAt:new Date().toISOString(),quantities:{M:1},layers:[],printSizes:{left:'pocket'},printTemplate:'long-sleeve',printAreas:{left:printAreaForSize('left','pocket',undefined,'long-sleeve')}};
  assert.equal(parseDesign(draft)?.printAreas.left.height,200);
  assert.equal(parseDesign({...draft,printTemplate:'standard'}),null);
  assert.equal(parseDesign({...draft,printTemplate:'unknown'}),null);
  const head={...draft,printTemplate:'headwear',printSizes:{front:'pocket'},printAreas:{front:printAreaForSize('front','pocket',undefined,'headwear')}};
  assert.equal(parseDesign(head)?.printAreas.front.width,70);
  assert.equal(parseDesign({...head,printSizes:{front:'large'}}),null);
  assert.equal(parseDesign({...head,layers:[{side:'back'}]}),null);
});
test('confirmed garment bases and print charges calculate in integer cents',()=>{
  assert.deepEqual(printAreaForSize('left','pocket'),printAreaForSize('left','large'));
  assert.equal(printAreaForSize('left','pocket').width,65);assert.equal(printAreaForSize('left','pocket').height,70);
  assert.equal(quotePrintAreas(pricing,['left'],{left:'large'},1).unit,15);
  assert.equal(readPrintSizes({left:'large'}).left,'pocket');
  assert.equal(pricing.baseCents,2500);assert.equal(customPricingForCategory('hoodies',40).baseCents,4000);
  assert.equal(customPricingForCategory('hats',18).baseCents,1800);assert.equal(customPricingForCategory('beanies',22).baseCents,2200);
  assert.equal(customPricingForCategory('jerseys',20),null);
  assert.equal(quotePrintAreas(pricing,['front'],{front:'pocket'},1).unit,15);
  assert.equal(quotePrintAreas(pricing,['front'],{front:'large'},1).unit,17.5);
  assert.equal(quotePrintAreas(pricing,['front','back'],{front:'pocket',back:'large'},3).total,60);
  assert.equal(quotePrintAreas(pricing,['front','back'],{front:'large',back:'large'},1).unit,22.5);
  assert.equal(quotePrintAreas(pricing,['front','back','left','right'],{left:'pocket',right:'pocket'},1).unit,27.5);
  assert.equal(quotePrintAreas(pricing,['front'],{front:'pocket'},0).total,0);
  assert.equal(quotePrintAreas(pricing,[],{},1),null);
  assert.equal(quotePrintAreas(pricing,['front','front'],{},1),null);
  assert.equal(quotePrintAreas(pricing,['front'],{front:'cheap'},1),null);
  assert.equal(quotePrintAreas(pricing,['front'],{},1.5),null);
  assert.equal(readPrintSizes({front:'pocket',admin:'large'}),null);
});
test('v3 saves preserve print sizes and reject an enlarged pocket box',()=>{
  const area=printAreaForSize('front','pocket');
  const draft={version:3,id:'draft',productId:'1',colour:'White',updatedAt:new Date().toISOString(),
    quantities:{M:2},printSizes:{front:'pocket'},printAreas:{front:area},
    layers:[{id:'text',kind:'text',side:'front',x:area.x+35,y:area.y+35,width:300,height:200,rotation:45,text:'Team',font:'Arial',color:'#111111'}]};
  const parsed=parseDesign(draft);assert.ok(parsed);assert.equal(parsed.version,3);assert.equal(parsed.printSizes.front,'pocket');
  const box=selectionBounds(parsed.layers);assert.ok(box.right-box.left<=70.00001);assert.ok(box.bottom-box.top<=70.00001);
  assert.equal(parseDesign({...draft,printAreas:{front:{...area,width:190,height:250}}}),null);
  assert.equal(parseDesign({...draft,printSizes:{front:'free'}}),null);
  const restored=parseDesign({...draft,printAreas:undefined});assert.equal(restored.layers[0].printArea.width,70);
  assert.ok(keepInPrintArea(restored.layers[0]));
});
test('cart retains print choices and refresh replaces client prices with current server policy',()=>{
  const item={id:'1',slug:'shirt',name:'Shirt',price:0,stock:10,size:'M',quantity:2,
    customization:{designId:'10000000-0000-0000-0000-000000000001',colour:'White',sides:['front','back'],printPricePerSide:0,
      printSizes:{front:'pocket',back:'large'}}};
  const restored=readCart(JSON.stringify([item]));assert.equal(restored.length,1);assert.equal(restored[0].customization.printSizes.front,'pocket');
  const product={id:'1',slug:'shirt',name:'Shirt',price:99,stock:10,sizes:['M'],requiresSize:true,colours:['White'],printPricing:pricing};
  const refreshed=refreshCart(restored,[product],['1']);assert.equal(refreshed.items[0].price,99.75);
  const malformed={...item,customization:{...item.customization,printSizes:{front:'free',back:'large'}}};
  assert.equal(readCart(JSON.stringify([malformed])).length,0);
  assert.equal(refreshCart(restored,[{...product,printPricing:null}],['1']).items.length,0);
});

test('custom print metadata cannot bypass the existing ready-made-only checkout',()=>{
  assert.equal(parseCheckout({requestId:'10000000-0000-0000-0000-000000000001',method:'pickup',items:[{
    id:'1',size:'M',quantity:1,price:0,customization:{printSizes:{front:'pocket'}}
  }]}),null);
});
