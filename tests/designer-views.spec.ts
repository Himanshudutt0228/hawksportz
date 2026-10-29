import { test, expect } from "@playwright/test";

test("selected product photo, four view choices, corner resizing and quick sizing", async ({ page }, testInfo) => {
  await page.goto("/custom-apparel?resume=1");
  const preview = page.getByRole("region", { name: "Design preview", exact: true });
  await expect(preview.locator("image[data-garment-photo]")).toHaveAttribute("href", /^data:image\/webp;base64,/);
  await expect(preview.locator("image[data-garment-photo]")).toHaveCount(1);
  for (const name of ["Back", "Left sleeve", "Right sleeve"]) {
    await preview.getByRole("button", { name, exact: true }).click();
    await expect(preview.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(preview.locator("image[data-garment-photo]")).toHaveCount(1);
  }
  await preview.getByRole("button", { name: "Front", exact: true }).click();
  await expect(preview.locator("image[data-garment-photo]")).toHaveCount(1);
  await page.getByLabel("Add your text").fill("HAWK");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const widthInput = page.getByRole("spinbutton", { name: "Design width", exact: true });
  const originalWidth = Number(await widthInput.inputValue());
  const handle = page.getByRole("button", { name: "Resize design bottom right", exact: true });
  await handle.scrollIntoViewIfNeeded();
  const position = await handle.boundingBox();
  await page.mouse.move(position!.x + position!.width / 2, position!.y + position!.height / 2);
  await page.mouse.down();
  await page.mouse.move(position!.x + position!.width / 2 + 35, position!.y + position!.height / 2 + 25, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await widthInput.inputValue())).toBeGreaterThan(originalWidth);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("region", { name: "Design tools", exact: true }).getByRole("button", { name: "HAWK", exact: true }).click();
  await expect(widthInput).toHaveValue(String(originalWidth));
  await preview.getByRole("group", { name: "Quick design size", exact: true }).getByRole("button", { name: /Smaller/ }).click();
  await expect.poll(async () => Number(await widthInput.inputValue())).toBeLessThan(originalWidth);
  await page.getByRole("button", { name: "Make design larger", exact: true }).click();
  await widthInput.fill("10.5");
  await expect(widthInput).toHaveValue("10.5");
  await page.screenshot({ path: testInfo.outputPath("actual-product-and-resize.png"), fullPage: true });
});

test("artwork height changes without changing width, and edge handles stretch the image", async ({ page }) => {
  await page.goto("/custom-apparel?resume=1");
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
  const data = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 100; canvas.height = 100;
    const context = canvas.getContext("2d")!; context.fillStyle = "#16543a"; context.fillRect(0, 0, 100, 100);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.getByLabel("Upload artwork file", { exact: true }).setInputFiles({ name: "art.png", mimeType: "image/png", buffer: Buffer.from(data, "base64") });
  const width = page.getByRole("spinbutton", { name: "Design width", exact: true });
  const height = page.getByRole("spinbutton", { name: "Design height", exact: true });
  await expect(page.getByRole("checkbox", { name: "Lock proportions", exact: true })).not.toBeChecked();
  await width.fill("5.79");
  await height.fill("10.42");
  await expect(width).toHaveValue("5.79");
  await expect(height).toHaveValue("10.42");
  await expect(page.getByRole("button", { name: "Select artwork", exact: true }).locator("image")).toHaveAttribute("preserveAspectRatio", "none");
  const handle = page.getByRole("button", { name: "Resize design bottom edge", exact: true });
  await handle.scrollIntoViewIfNeeded();
  const position = await handle.boundingBox();
  await page.mouse.move(position!.x + position!.width / 2, position!.y + position!.height / 2);
  await page.mouse.down();
  await page.mouse.move(position!.x + position!.width / 2, position!.y + position!.height / 2 + 20, { steps: 4 });
  await page.mouse.up();
  await expect.poll(async () => Number(await height.inputValue())).toBeGreaterThan(10.42);
  await expect(width).toHaveValue("5.79");
  await page.getByRole("checkbox", { name: "Lock proportions", exact: true }).check();
  const previousWidth = Number(await width.inputValue());
  await height.fill("5.79");
  await expect.poll(async () => Number(await width.inputValue())).toBeLessThan(previousWidth);
});

test("left and right designs stay on their sleeve and retain placement after reopening", async ({ page }, testInfo) => {
  await page.goto("/custom-apparel?resume=1");
  await page.getByRole("button", { name: "Left sleeve", exact: true }).click();
  await page.getByLabel("Add your text").fill("LOGO");
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  const layer = page.getByRole("button", { name: "Select LOGO", exact: true });
  await expect(layer).toHaveAttribute("transform", /^translate\(402\.5 /);
  await expect(page.locator('rect[data-print-area="left"]')).toHaveAttribute("x", "370");
  await page.getByRole("button", { name: "Center", exact: true }).click();
  await expect(layer).toHaveAttribute("transform", /^translate\(402\.5 /);
  await page.getByRole("combobox", { name: "Print side", exact: true }).selectOption("right");
  await expect(layer).toHaveAttribute("transform", /^translate\(97\.5 /);
  await expect(page.locator('rect[data-print-area="right"]')).toHaveAttribute("x", "65");
  expect(Number(await page.getByRole("spinbutton", { name: "Design width", exact: true }).getAttribute("max"))).toBeCloseTo(65 * 11 / 190, 6);
  await page.getByRole("button", { name: "Save design", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Design saved on this device");
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Saved design opened");
  await page.getByRole("button", { name: "Right sleeve", exact: true }).click();
  await expect(layer).toHaveAttribute("transform", /^translate\(97\.5 /);
  await page.screenshot({ path: testInfo.outputPath("sleeve-placement.png"), fullPage: true });
});
