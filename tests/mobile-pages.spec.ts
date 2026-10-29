import { test, expect } from "@playwright/test";

const publicPages = ["/", "/about", "/contact", "/shipping", "/returns", "/privacy", "/product", "/tshirts", "/tshirts?style=long-sleeve", "/hoodies", "/hoodies?style=zip-up", "/jerseys", "/hats", "/beanies", "/sweatshirts", "/equipment", "/custom-apparel", "/custom-apparel?audience=teams", "/custom-apparel?resume=1", "/search?q=shirt", "/cart", "/checkout", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

for (const width of [320, 390, 430]) {
  test(`public pages fit a ${width}px phone without automatic viewport shrinking`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile");
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 844 });
    for (const path of publicPages) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("main")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      // innerWidth alone is insufficient: overflow can make the mobile browser
      // widen its layout viewport and shrink the whole page to fit.
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => innerWidth), path).toBe(width);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      const footer = page.getByRole("navigation", { name: "Footer navigation" });
      expect(await footer.getByRole("link").evaluateAll(nodes => nodes.every(node => getComputedStyle(node).borderTopWidth === "0px"))).toBe(true);
      if (path === "/about") {
        const image = page.locator("main img");
        if (await image.count()) expect((await image.first().boundingBox())!.width).toBeLessThanOrEqual(width - 30);
        expect((await page.getByRole("link", { name: "Browse collections", exact: true }).boundingBox())!.width).toBeGreaterThan(width - 95);
      }
    }
    // Check an actual public product detail, rather than only its 404 page.
    await page.goto("/tshirts");
    const product = page.getByRole("main").locator('article a[href^="/product/"]').first();
    if (await product.count()) {
      await product.click();
      await expect(page.getByRole("region", { name: "Product images" })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => innerWidth)).toBe(width);
    }
  });
}

test("private routes keep their access protection and fit the phone when signed out", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.setViewportSize({ width: 320, height: 844 });
  const id = "10000000-0000-0000-0000-000000000001";
  for (const path of ["/account", "/account/orders", `/account/orders/${id}`, "/admin", "/admin/orders", `/admin/orders/${id}`, `/admin/orders/${id}/production`, "/admin/products/new", "/admin/products/1", "/admin/website-images"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  }
  const response = await page.goto(`/orders/${id}`);
  expect(response?.status()).toBe(404);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
