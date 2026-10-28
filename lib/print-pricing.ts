import type { DesignSide, PrintArea } from "./design";

export type PrintSize = "pocket" | "large";
export type PrintSizes = Partial<Record<DesignSide,PrintSize>>;
export type PrintPricing = { baseCents:number; pocketCents:number; largeCents:number; frontOnly?:boolean };
export type PrintTemplate = "standard" | "long-sleeve" | "headwear";
export function printTemplateForProduct(product?:{category:string;garmentStyle?:string|null}):PrintTemplate {
  if(product?.category==="hats"||product?.category==="beanies")return "headwear";
  return product?.category==="hoodies"||product?.category==="sweatshirts"||product?.garmentStyle==="long-sleeve"?"long-sleeve":"standard";
}
const sides = ["front","back","left","right"] as const;
export function customPricingForCategory(category:string,basePrice:number):PrintPricing|null {
  const baseCents=Math.round(basePrice*100);
  const categories=["tshirts","jerseys","hoodies","sweatshirts","hats","beanies"];
  return categories.includes(category)&&Number.isSafeInteger(baseCents)&&baseCents>=0?{baseCents,pocketCents:250,largeCents:500,...(category==="hats"||category==="beanies"?{frontOnly:true}:{})}:null;
}
export function readPrintSizes(value:unknown):PrintSizes|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const result:PrintSizes={};
  for(const [side,size] of Object.entries(value)){
    if(!sides.includes(side as DesignSide)||(size!=="pocket"&&size!=="large"))return null;
    result[side as DesignSide]=(side==="left"||side==="right")?"pocket":size;
  }
  return result;
}
export function printAreaForSize(side:DesignSide,size:PrintSize,position?:PrintArea,template:PrintTemplate="standard"):PrintArea {
  const sleeve=side==="left"||side==="right";
  const width=sleeve?65:(template==="headwear"?70:size==="large"?190:70);
  const height=sleeve?(template==="long-sleeve"?200:70):(template==="headwear"?70:size==="large"?250:70);
  return {x:Math.max(0,Math.min(500-width,position?.x??(sleeve?(side==="left"?370:65):155))),
    y:Math.max(0,Math.min(600-height,position?.y??(sleeve?180:170))),width,height};
}
export function quotePrintAreas(pricing:PrintPricing|null,printed:DesignSide[],sizes:PrintSizes,quantity:number){
  if(!pricing||!printed.length||printed.length>4||new Set(printed).size!==printed.length||!Number.isSafeInteger(quantity)||quantity<0||quantity>100000)return null;
  if(![pricing.baseCents,pricing.pocketCents,pricing.largeCents].every(value=>Number.isSafeInteger(value)&&value>=0&&value<=999999999))return null;
  if(pricing.frontOnly&&(printed.some(side=>side!=="front")||sizes.front!=="pocket"))return null;
  let pockets=0,large=0;
  for(const side of printed){if(!sides.includes(side))return null;
    if(sizes[side]!==undefined&&sizes[side]!=="pocket"&&sizes[side]!=="large")return null;
    const size=side==="left"||side==="right"?"pocket":sizes[side]??"large";
    if(size==="pocket")pockets++;else if(size==="large")large++;else return null;}
  const printingCents=pockets*pricing.pocketCents+large*pricing.largeCents;
  const unitCents=pricing.baseCents+printingCents;
  if(!Number.isSafeInteger(unitCents*quantity))return null;
  return {unit:unitCents/100,total:unitCents*quantity/100,printing:printingCents/100,pockets,large};
}
