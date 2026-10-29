import { test, expect } from "@playwright/test";

test("Large and Small measurements follow the rendered artwork ratio in inches and cm", async ({ page }) => {
  await page.goto("/custom-apparel?resume=1");
  await page.getByLabel("Add your text").fill("MEASUREMENT");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const width = page.getByRole("spinbutton", { name: "Design width", exact: true });
  const height = page.getByRole("spinbutton", { name: "Design height", exact: true });
  await width.fill("11"); await width.blur();
  await height.fill("14.47"); await height.blur();
  await expect(width).toHaveValue("11"); await expect(height).toHaveValue("14.47");
  const artwork = page.getByRole("button", { name: "Select MEASUREMENT", exact: true });
  async function checkRatio() {
    const border = artwork.locator("rect").last();
    const visualWidth = Number(await border.getAttribute("width")) - 4;
    const visualHeight = Number(await border.getAttribute("height")) - 4;
    const measuredWidth = Number(await width.inputValue());
    const measuredHeight = Number(await height.inputValue());
    expect(Math.abs(visualWidth / visualHeight - measuredWidth / measuredHeight)).toBeLessThan(.02);
    const factor = await page.getByLabel("Measurement unit").inputValue() === "cm" ? 2.54 : 1;
    expect(Math.abs(measuredWidth - visualWidth * 11 / 190 * factor)).toBeLessThan(.015);
    expect(Math.abs(measuredHeight - visualHeight * 11 / 190 * factor)).toBeLessThan(.015);
  }
  await checkRatio();
  await page.getByLabel("Measurement unit").selectOption("cm");
  await expect(width).toHaveValue("27.94");
  await checkRatio();
  await page.getByLabel("Measurement unit").selectOption("in");
  await page.getByRole("button", { name: /^Pocket/ }).click();
  await page.getByRole("button", { name: "Done positioning", exact: true }).click();
  await artwork.click();
  await width.fill("4"); await width.blur(); await height.fill("4"); await height.blur();
  await checkRatio();
  await page.getByRole("button", { name: "Left sleeve", exact: true }).click();
  await page.getByLabel("Add your text").fill("MEASUREMENT");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await width.fill("2"); await width.blur(); await height.fill("2"); await height.blur();
  await checkRatio();
  await expect(page.getByText(/^Element width: /)).toContainText("in");
  await page.getByLabel("Measurement unit").selectOption("cm");
  await checkRatio();
  await expect(page.getByText(/^Element height: /)).toContainText("cm");
});
