import {test,expect} from '@playwright/test';

test('pocket and large areas price once per printed view and survive save/reload',async({page})=>{
  await page.goto('/custom-apparel',{waitUntil:'domcontentloaded'});
  const card=page.locator('main article').filter({hasText:'Base CA$12.50'}).first();
  await card.getByRole('link').click();
  await page.getByRole('button',{name:'Pocket · CA$2.50',exact:true}).click();
  await page.getByRole('button',{name:'Done positioning',exact:true}).click();
  await page.getByLabel('Add your text').fill('Pocket logo');
  await page.getByRole('button',{name:'Add text',exact:true}).click();
  await expect(page.getByLabel('Current custom price')).toContainText('CA$15.00 per item');
  await page.getByLabel('Add your text').fill('More text');
  await page.getByRole('button',{name:'Add text',exact:true}).click();
  await expect(page.getByLabel('Current custom price')).toContainText('CA$15.00 per item');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.getByRole('button',{name:'Large · CA$5.00',exact:true}).click();
  await page.getByRole('button',{name:'Done positioning',exact:true}).click();
  await page.getByLabel('Add your text').fill('Big back print');
  await page.getByRole('button',{name:'Add text',exact:true}).click();
  await expect(page.getByLabel('Current custom price')).toContainText('CA$20.00 per item');
  await page.getByRole('button',{name:'Save design',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Design saved on this device');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('status')).toContainText('Saved design opened');
  await expect(page.getByLabel('Current custom price')).toContainText('CA$20.00 per item');
  await page.getByRole('button',{name:'Front',exact:true}).click();
  await expect(page.getByRole('button',{name:'Pocket · CA$2.50',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Continue to sizes',exact:true}).click();
  const quantity=page.getByRole('spinbutton',{name:/Quantity for size/}).first();
  await quantity.fill('1');
  await page.getByRole('button',{name:'Review design',exact:true}).click();
  const details=page.getByRole('complementary',{name:'Design details'});
  await expect(details).toContainText('Pocket/small prints / item');await expect(details).toContainText('1 × CA$2.50');
  await expect(details).toContainText('1 × CA$5.00');await expect(details).toContainText('$20.00');
});

test('sleeves offer Small only at the small print price',async({page})=>{
  await page.goto('/custom-apparel',{waitUntil:'domcontentloaded'});
  await page.locator('main article').filter({hasText:'Base CA$12.50'}).first().getByRole('link').click();
  for(const name of ['Left sleeve','Right sleeve']){
    await page.getByRole('button',{name,exact:true}).click();
    await expect(page.getByRole('button',{name:'Small · CA$2.50',exact:true})).toHaveAttribute('aria-pressed','true');
    await expect(page.getByRole('button',{name:'Large · CA$5.00',exact:true})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Pocket · CA$2.50',exact:true})).toHaveCount(0);
  }
  await page.getByLabel('Add your text').fill('Sleeve');await page.getByRole('button',{name:'Add text',exact:true}).click();
  await expect(page.getByLabel('Current custom price')).toContainText('CA$15.00 per item');
});
