import { test, expect } from "@playwright/test";

test("Review hides editing tools, preserves comments and allows return to Design", async ({ page }) => {
  await page.goto("/custom-apparel?resume=1");
  await page.getByLabel("Add your text").fill("REVIEW ONLY");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByLabel("Additional comments (optional)").fill("Keep this note");
  await page.getByRole("button", { name: "Continue to sizes", exact: true }).click();
  const quantities = page.getByRole("spinbutton", { name: /^Quantity for size / });
  const count = await quantities.count();
  let chosen = false;
  for (let i = 0; i < count; i++) {
    if (Number(await quantities.nth(i).getAttribute("max")) > 0) { await quantities.nth(i).fill("1"); chosen = true; break; }
  }
  expect(chosen).toBe(true);
  await page.getByRole("button", { name: "Review design", exact: true }).click();
  const proof = page.getByRole("article", { name: /Design proof/ });
  await expect(proof).toBeVisible();
  await expect(page.getByRole("heading", { name: "Price summary" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Design tools" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Design preview", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Garment colour")).toHaveCount(0);
  await expect(page.getByLabel("Measurement unit")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh garment views", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open a design file", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save design", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Additional comments (optional)")).toHaveCount(1);
  await expect(page.getByLabel("Additional comments (optional)")).toHaveValue("Keep this note");
  await expect(page.locator('svg[aria-label$="garment preview"]')).toHaveCount(1);
  await proof.getByRole("button", { name: "Back", exact: true }).click();
  await expect(proof.getByRole("group", { name: "Back garment preview", exact: true })).toBeVisible();
  const approval = page.getByRole("checkbox", { name: /I have reviewed the spelling/ });
  await expect(approval).toBeEnabled({ timeout: 30000 });
  await approval.check();
  await expect(page.getByRole("button", { name: "Add custom apparel to cart", exact: true })).toBeEnabled();
  await page.getByLabel("Additional comments (optional)").fill("Updated review note");
  await expect(approval).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Add custom apparel to cart", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("list", { name: "Design steps" }).getByRole("button").first().click();
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select REVIEW ONLY", exact: true })).toBeVisible();
  await expect(page.getByLabel("Additional comments (optional)")).toHaveValue("Updated review note");
});
