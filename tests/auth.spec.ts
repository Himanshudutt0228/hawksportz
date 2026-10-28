import { test, expect } from "@playwright/test";

test("signed-out users cannot open account or change a password", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  for (const path of ["/account/orders", "/account/orders/00000000-0000-0000-0000-000000000001"]) {
    const response = await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
    expect(response?.headers()["cache-control"]).toContain("no-store");
  }
  await page.goto("/reset-password");
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test("forged auth cookies do not grant account access", async ({ page, context }) => {
  await context.addCookies([{
    name: "sb-kmvnqympemtivxxlmcvu-auth-token", value: "base64-forged-session",
    domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax",
  }]);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByText("Signed in as")).toHaveCount(0);
  for (const path of ["/account/orders", "/account/orders/00000000-0000-0000-0000-000000000001"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText("Payment confirmed", { exact: false })).toHaveCount(0);
  }
});

test("invalid callback links fail closed and never use external redirects", async ({ page }) => {
  const response = await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/sign-in\?link=invalid$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("invalid or expired");
  expect(response?.headers()["cache-control"]).toContain("no-store");
});

test("account forms are linked and reject mismatched passwords before registration", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Account", exact: true }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create an account", exact: true })).toBeVisible();
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("New password", { exact: true }).fill("long test password");
  await page.getByLabel("Confirm password").fill("different password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The passwords do not match.");
  await page.getByRole("button", { name: "Dismiss notice", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  // React resets successful action submissions, including returned error states.
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("New password", { exact: true }).fill("long test password");
  await page.getByLabel("Confirm password").fill("different password");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("The passwords do not match.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: "Forgot password?", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?", exact: true })).toBeVisible();
});

test("notice close buttons work with the keyboard without submitting the account form", async ({ page }) => {
  await page.goto("/sign-in?password=updated");
  await expect(page.getByRole("status")).toContainText("Password updated");
  const dismiss = page.getByRole("button", { name: "Dismiss notice", exact: true });
  await dismiss.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/sign-in\?password=updated$/);
});
