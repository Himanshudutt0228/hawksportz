import { test, expect } from "@playwright/test";

test("product gallery exposes four named views and displays each available product photo", async ({ page }) => {
  await page.goto("/tshirts");
  await page.getByRole("link", { name: "View Product" }).first().click();
  const gallery = page.getByRole("region", { name: "Product images", exact: true });
  const views = gallery.getByRole("group", { name: "Product views", exact: true });
  await expect(views.getByRole("button")).toHaveCount(4);
  for (const side of ["Front", "Back", "Left", "Right"]) {
    const button = views.getByRole("button", { name: `${side} view`, exact: true });
    if (await button.isDisabled()) {
      await expect(button).toContainText("Photo pending");
    } else {
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(gallery.getByRole("img")).toHaveAttribute("alt", new RegExp(` - ${side}$`));
      await expect.poll(() => gallery.getByRole("img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
