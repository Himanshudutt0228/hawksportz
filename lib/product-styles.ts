export const productStyles={
  tshirts:{"short-sleeve":"Short Sleeve","long-sleeve":"Long Sleeve"},
  jerseys:{"short-sleeve":"Short Sleeve","long-sleeve":"Long Sleeve"},
  hoodies:{pullover:"Pullover","zip-up":"Zip-Up"},
} as const;
export function readProductStyle(category:string,value:unknown):string|null|undefined {
  if(value===null||value===undefined||value==="")return null;
  const choices=Object.hasOwn(productStyles,category)?productStyles[category as keyof typeof productStyles]:null;
  return typeof value==="string"&&choices&&Object.hasOwn(choices,value)?value:undefined;
}
