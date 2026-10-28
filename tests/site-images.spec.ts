import { test,expect } from "@playwright/test";

test("storefront fills available width and remains usable on mobile",async({page},testInfo)=>{
  if (page.viewportSize()!.width>1000) await page.setViewportSize({width:1920,height:1080});
  await page.goto("/");
  await expect(page.getByRole("heading",{ level:1 })).toContainText("Ready for your game.");
  const width=page.viewportSize()!.width;
  const hero=await page.locator("main > section").first().boundingBox();
  expect(hero!.width).toBeGreaterThan(width*0.95);
  const heading=await page.getByRole("heading",{ level:1 }).boundingBox();
  expect(heading!.x).toBeLessThanOrEqual(65);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath("homepage.png"),fullPage:true});
  await page.getByRole("main").getByRole("link",{ name:"Shop Ready-Made",exact:true }).click();
  await page.getByRole("main").getByRole("link",{ name:"T-Shirts",exact:true }).click();
  await expect(page.getByRole("heading",{ name:"T-Shirts",exact:true })).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});

test("website image administration denies anonymous and forged sessions",async({page,context})=>{
  await page.goto("/admin/website-images");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button",{ name:"Save image",exact:true })).toHaveCount(0);
  await context.addCookies([{ name:"sb-kmvnqympemtivxxlmcvu-auth-token",
    value:`base64-${Buffer.from(JSON.stringify({ access_token:"forged",refresh_token:"forged",
      user:{id:"00000000-0000-0000-0000-000000000001",user_metadata:{ role:"admin" }} })).toString("base64url")}`,
    domain:"localhost",path:"/",httpOnly:true,sameSite:"Lax" }]);
  await page.goto("/admin/website-images");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading",{ name:"Website images",exact:true })).toHaveCount(0);
});
