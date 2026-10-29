import { test, expect } from "@playwright/test";

test("phone navigation traps focus, closes with Escape and opens style collections", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/");
  const open = page.getByRole("button", { name: "Open menu", exact: true });
  await expect(open).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Shop menu" });
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe("hidden");
  await dialog.getByRole("link", { name: "Contact us", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Close menu", exact: true })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("link", { name: "Contact us", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible(); await expect(open).toBeFocused();
  await open.click();
  await dialog.getByRole("button", { name: "T-Shirts", exact: true }).click();
  await dialog.getByRole("link", { name: "Long Sleeve", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Long Sleeve T-Shirts", exact: true })).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await open.click(); await page.setViewportSize({ width: 1280, height: 900 });
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});

test("storefront fits small phones and keeps the image and main actions prominent", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const path of ["/", "/custom-apparel", "/tshirts", "/checkout"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= screen.width)).toBe(true);
      const search = page.getByRole("searchbox", { name: "Search the store", exact: true });
      await expect(search).toBeVisible();
      expect(await search.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
      if (path === "/") {
        const hero = page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section");
        const media = hero.locator(':scope > div').last();
        const text = hero.locator(':scope > div').first();
        expect((await media.boundingBox())!.y).toBeLessThan((await text.boundingBox())!.y);
        expect((await page.getByRole("link", { name: "Customize Your Apparel", exact: true }).boundingBox())!.width).toBeGreaterThan(width - 60);
      }
      if (path === "/custom-apparel") {
        const cards = page.getByRole("article");
        if (await cards.count() > 1) expect(Math.abs((await cards.nth(0).boundingBox())!.y - (await cards.nth(1).boundingBox())!.y)).toBeLessThan(2);
      }
    }
  }
});

test("phone customizer places garment above editing controls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await page.goto("/custom-apparel?resume=1");
  const preview = page.getByRole("region", { name: "Design preview", exact: true });
  const tools = page.getByRole("region", { name: "Design tools", exact: true });
  await expect(preview).toBeVisible(); await expect(tools).toBeVisible();
  expect((await preview.boundingBox())!.y).toBeLessThan((await tools.boundingBox())!.y);
  await expect(page.getByRole("navigation", { name: "Custom apparel categories" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= screen.width)).toBe(true);
});


test("cart icon and accessible item count work on desktop and mobile", async ({ page }) => {
  await page.goto("/");
  const cart = page.getByRole("link", { name: "Cart (0)", exact: true });
  await expect(cart).toBeVisible();
  await expect(cart.locator("svg")).toBeVisible();
  await cart.click();
  await expect(page.getByRole("heading", { name: "Your cart", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= screen.width)).toBe(true);
});
