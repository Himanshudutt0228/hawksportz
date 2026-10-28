import { test, expect } from "@playwright/test";

test("header search submits with Enter, matches names regardless of case, and opens products", async ({ page }) => {
  await page.goto("/tshirts");
  const productName = await page.locator("main article h2").first().innerText();
  const search = page.getByRole("search", { name: "Search the store", exact: true });
  await search.getByRole("searchbox").fill(productName.toUpperCase());
  await search.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/\/search\?q=/);
  await expect(page.getByRole("heading", { name: productName, exact: true }).first()).toBeVisible();
  await expect(page.getByRole("search", { name: "Search products", exact: true }).getByRole("searchbox")).toHaveValue(productName.toUpperCase());
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("main").getByRole("link", { name: "View Product" }).first().click();
  await expect(page.getByRole("heading", { name: productName, exact: true })).toBeVisible();
});

test("search button handles no matches and offers category recovery", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByText("Enter a product name to start searching.")).toBeVisible();
  const search = page.getByRole("search", { name: "Search products", exact: true });
  await search.getByRole("searchbox").fill("zz_search_no_matches_82d9a73f");
  await search.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("No products found. Try another name or browse our categories.")).toBeVisible();
  await page.getByRole("link", { name: "Browse all categories" }).click();
  await expect(page.getByRole("heading", { name: "Shop by category" })).toBeVisible();
});
