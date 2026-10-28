import {test,expect} from "@playwright/test";

test("custom apparel starts with products, then opens the exact selected garment",async({page})=>{
  await page.goto('/custom-apparel',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('heading',{level:1})).toHaveText('Choose your custom apparel');
  await expect(page.getByRole('button',{name:'Upload artwork',exact:true})).toHaveCount(0);
  const choices=page.getByRole('link',{name:/^Customize /});
  await expect(choices.first()).toBeVisible();
  const href=await choices.first().getAttribute('href');
  const name=(await choices.first().getAttribute('aria-label'))!.replace(/^Customize /,'');
  await page.evaluate(()=>localStorage.setItem('hawk-sportz-last-design','00000000-0000-0000-0000-000000000099'));
  await choices.first().click();
  await expect(page).toHaveURL(new URL(href!,'http://localhost:3000').href);
  await expect(page.getByRole('button',{name:'Upload artwork',exact:true})).toBeEnabled();
  await expect(page.getByRole('combobox',{name:'Garment',exact:true})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Design tools'})).toContainText(name);
  expect(await page.evaluate(()=>localStorage.getItem('hawk-sportz-last-design'))).toBe('00000000-0000-0000-0000-000000000099');
  await page.getByRole('link',{name:'Change product',exact:true}).click();
  await expect(page.getByRole('heading',{level:1})).toHaveText('Choose your custom apparel');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("unavailable direct product links do not open a different garment",async({page})=>{
  await page.goto('/custom-apparel?product=999999999999999999',{waitUntil:'domcontentloaded'});
  await expect(page.getByRole('main').getByRole('alert')).toContainText('unavailable');
  await expect(page.getByRole('button',{name:'Upload artwork',exact:true})).toHaveCount(0);
  await page.getByRole('link',{name:'Choose a product',exact:true}).click();
  await expect(page.getByRole('link',{name:/^Customize /}).first()).toBeVisible();
});
