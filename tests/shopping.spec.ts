import { test, expect } from "@playwright/test";

test("shop from home, select a size, update cart, reload and remove", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("main").getByRole("link", { name: "Shop Ready-Made", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "T-Shirts", exact: true }).click();
  await page.getByRole("link", { name: "View Product" }).first().click();
  const add = page.getByRole("button", { name: "Add to Cart", exact: true });
  await expect(add).toBeDisabled();
  await page.getByRole("radio", { name: "M", exact: true }).check();
  await expect(add).toBeEnabled();
  const image = page.getByRole("main").getByRole("img");
  await expect(image).toBeVisible();
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await add.click();
  await expect(page.getByRole("link", { name: "Cart (1)", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "View cart", exact: true }).click();
  await expect(page.getByText("Size: M", { exact: true })).toBeVisible();
  await expect(page.getByText("Subtotal: $25.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByText("Subtotal: $50.00", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Cart (2)", exact: true })).toBeVisible();
  await expect(page.getByText("Subtotal: $50.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Decrease quantity" }).click();
  await expect(page.getByText("Subtotal: $25.00", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Remove / }).click();
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("navigation works on touch and keyboard and pages fit the viewport", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Hoodies", exact: true }).click();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "All Hoodies" }).click();
  await expect(page.getByRole("heading", { name: "Hoodies", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Equipment", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Equipment", exact: true })).toBeVisible();
  for (const url of ["/", "/tshirts", "/product/classic-t-shirt", "/cart"]) {
    await page.goto(url);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("banner")).toHaveCount(1);
    await expect(page.getByRole("contentinfo")).toHaveCount(1);
  }
});

test("unknown product shows a recovery link", async ({ page }) => {
  await page.goto("/product/does-not-exist-browser-test");
  await expect(page.getByRole("heading", { name: "Product not found" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Back to products" }).click();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
});
