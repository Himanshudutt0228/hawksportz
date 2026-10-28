import { test, expect } from "@playwright/test";

test("guest checkout previews confirmed delivery/pickup details without moving money", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("hawk-sportz-cart-v1", JSON.stringify([{
    id: "1", slug: "shirt", name: "Test shirt", price: 25, stock: 10, size: "M", quantity: 2,
  }])));
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Checkout", exact: true })).toBeVisible();
  await expect(page.getByText("Before tax: CA$58.99", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "Local pickup — Free", exact: true }).check();
  await expect(page.getByText("Before tax: CA$50.00", { exact: true })).toBeVisible();
  await expect(page.getByText("222 Bankside Drive, Kitchener, ON N2N 3E5", { exact: true })).toBeVisible();
  await expect(page.getByText(/10 AM–8 PM daily/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("private order URLs cannot be opened by an unrelated guest", async ({ page }) => {
  const response = await page.goto("/orders/00000000-0000-0000-0000-000000000001");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Payment confirmed" })).toHaveCount(0);
});

test("unsigned Stripe callbacks cannot confirm an order", async ({ request }) => {
  const response = await request.post("/api/stripe/webhook", { data: { type: "checkout.session.completed", livemode: false } });
  expect([400, 503]).toContain(response.status());
});
