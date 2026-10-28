import { test, expect } from "@playwright/test";

test("text effects, duplication, flips, stacking, zoom and undo", async ({ page }, testInfo) => {
  await page.goto("/custom-apparel?resume=1");
  await page.getByLabel("Add your text").fill("HAWK TEAM");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("combobox", { name: "Font", exact: true }).selectOption("Impact");
  await page.getByRole("button", { name: "Italic", exact: true }).click();
  await page.getByLabel("Letter spacing", { exact: false }).fill("3");
  await page.getByLabel("Outline thickness", { exact: true }).fill("2");
  await page.getByRole("combobox", { name: "Text shape", exact: true }).selectOption("arch-up");
  const selected = page.getByRole("button", { name: "Select HAWK TEAM", exact: true });
  await expect(selected.locator("textPath")).toHaveCount(1);
  await expect(selected.locator("text")).toHaveAttribute("font-family", "Impact");
  await expect(selected.locator("text")).toHaveAttribute("stroke-width", "2");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select HAWK TEAM", exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Flip horizontal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Flip horizontal", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Send to back", exact: true }).click();
  await page.getByRole("button", { name: "Select all", exact: true }).click();
  await expect(page.getByRole("heading", { name: "2 elements selected", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Center selection", exact: true }).click();
  await page.getByLabel("Preview zoom", { exact: true }).selectOption("2");
  await expect(page.getByRole("group", { name: "Front garment preview", exact: true })).toHaveAttribute("viewBox", "125 150 250 300");
  await page.getByRole("button", { name: "Clear side", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select HAWK TEAM", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select HAWK TEAM", exact: true })).toHaveCount(2);
  await page.getByLabel("Preview zoom", { exact: true }).selectOption("1");
  await page.getByRole("region", { name: "Design tools", exact: true }).getByRole("button", { name: "HAWK TEAM", exact: true }).first().click();
  await page.screenshot({ path: testInfo.outputPath("text-effects.png"), fullPage: true });
});

