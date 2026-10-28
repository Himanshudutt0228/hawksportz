import { test, expect } from "@playwright/test";

test("anonymous requests cannot render the admin dashboard", async ({ page }) => {
  const response = await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Admin dashboard", exact: true })).toHaveCount(0);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await page.goto("/admin/products/1");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Save product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save photos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete product", exact: true })).toHaveCount(0);
  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Create product", exact: true })).toHaveCount(0);
  for (const path of ["/admin/orders", "/admin/orders/00000000-0000-0000-0000-000000000001"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Manage order", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toHaveCount(0);
  }
});

test("forged session and admin metadata cannot grant dashboard access", async ({ page, context }) => {
  const forgedSession = {
    access_token: "forged-token", refresh_token: "forged-refresh",
    user: { id: "00000000-0000-0000-0000-000000000001", user_metadata: { role: "admin", is_admin: true } },
  };
  await context.addCookies([{
    name: "sb-kmvnqympemtivxxlmcvu-auth-token",
    value: `base64-${Buffer.from(JSON.stringify(forgedSession)).toString("base64url")}`,
    domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax",
  }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Admin dashboard", exact: true })).toHaveCount(0);
  await page.goto("/admin/products/1");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Save product" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Save photos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Delete product", exact: true })).toHaveCount(0);
  await page.goto("/admin/products/new");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Create product", exact: true })).toHaveCount(0);
  for (const path of ["/admin/orders", "/admin/orders/00000000-0000-0000-0000-000000000001"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { name: "Manage order", exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Orders", exact: true })).toHaveCount(0);
  }
});
