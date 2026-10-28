import { test, expect } from "@playwright/test";

const saved = { id: "1", slug: "classic-t-shirt", name: "Classic tshirt", price: 25, stock: 20, size: "M", quantity: 4 };

test('pending checkout keeps reserved last-size cart item and offers recovery after reload', async ({ page }) => {
  await page.route('**/api/cart/products', route => route.fulfill({ json: {
    products: [{ ...saved, stock: 0, sizeStock: { M: 0 }, sizes: ['M'], requiresSize: true }],
    pendingOrders: [{ id: '00000000-0000-0000-0000-000000000001', lines: [{ id: '1', size: 'M', quantity: 4 }] }],
  } }));
  await page.goto('/cart');
  await expect(page.getByText('Subtotal: $100.00', { exact: true })).toBeVisible();
  await expect(page.getByText('Payment incomplete. Continue checkout or remove this item.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue checkout', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View pending order', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
  await page.reload();
  await expect(page.getByText('Subtotal: $100.00', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Checkout', exact: true })).toHaveCount(0);
});

test('empty cart restores its unpaid item without a separate pending-order screen', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('hawk-sportz-cart-v1', '[]'));
  await page.route('**/api/cart/products', route => route.fulfill({ json: {
    products: [{ ...saved, stock: 0, sizeStock: { M: 0 }, sizes: ['M'], requiresSize: true }],
    pendingOrders: [{ id: '00000000-0000-0000-0000-000000000001', lines: [{ id: '1', size: 'M', quantity: 1, name: saved.name, slug: saved.slug, unitCents: 2500 }] }],
  } }));
  await page.goto('/cart');
  await expect(page.getByText('Subtotal: $25.00', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue checkout', exact: true })).toBeVisible();
});

test('removing an unpaid item confirms cancellation first and persists removal', async ({ page }) => {
  let active = true;
  let cancellations = 0;
  await page.route('**/api/cart/products', route => route.fulfill({ json: {
    products: [{ ...saved, stock: active ? 0 : 4, sizeStock: { M: active ? 0 : 4 }, sizes: ['M'], requiresSize: true }],
    pendingOrders: active ? [{ id: '00000000-0000-0000-0000-000000000001', lines: [{ id: '1', size: 'M', quantity: 4 }] }] : [],
  } }));
  await page.route('**/api/checkout/00000000-0000-0000-0000-000000000001', route => {
    expect(route.request().postDataJSON().action).toBe('cancel');
    active = false; cancellations++;
    return route.fulfill({ json: { cancelled: true } });
  });
  await page.goto('/cart');
  const remove = page.getByRole('button', { name: `Remove ${saved.name}, M`, exact: true });
  await expect(remove).toBeEnabled();
  page.once('dialog', dialog => dialog.dismiss());
  await remove.click();
  expect(cancellations).toBe(0);
  await expect(page.getByText('Subtotal: $100.00', { exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await remove.click();
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  expect(cancellations).toBe(1);
  await page.reload();
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
});

test('failed cancellation keeps the unpaid item in the cart', async ({ page }) => {
  await page.route('**/api/cart/products', route => route.fulfill({ json: {
    products: [{ ...saved, stock: 0, sizeStock: { M: 0 }, sizes: ['M'], requiresSize: true }],
    pendingOrders: [{ id: '00000000-0000-0000-0000-000000000001', lines: [{ id: '1', size: 'M', quantity: 4 }] }],
  } }));
  await page.route('**/api/checkout/00000000-0000-0000-0000-000000000001', route => route.fulfill({ status: 503, json: { error: 'Unable to verify checkout. Your cart has been kept.' } }));
  await page.goto('/cart');
  const remove = page.getByRole('button', { name: `Remove ${saved.name}, M`, exact: true });
  await expect(remove).toBeEnabled();
  page.once('dialog', dialog => dialog.accept());
  await remove.click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Your cart has been kept');
  await expect(page.getByText('Subtotal: $100.00', { exact: true })).toBeVisible();
});

test('continue checkout reopens Stripe directly from the cart', async ({ page }) => {
  await page.route('**/api/cart/products', route => route.fulfill({ json: {
    products: [{ ...saved, stock: 0, sizeStock: { M: 0 }, sizes: ['M'], requiresSize: true }],
    pendingOrders: [{ id: '00000000-0000-0000-0000-000000000001', lines: [{ id: '1', size: 'M', quantity: 4 }] }],
  } }));
  await page.route('**/api/checkout/00000000-0000-0000-0000-000000000001', route => {
    expect(route.request().postDataJSON().action).toBe('resume');
    return route.fulfill({ json: { url: 'https://checkout.stripe.com/c/pay/cart-resume-fixture' } });
  });
  await page.route('https://checkout.stripe.com/**', route => route.fulfill({ body: '<h1>Test payment page</h1>', contentType: 'text/html' }));
  await page.goto('/cart');
  await page.getByRole('button', { name: 'Continue checkout', exact: true }).click();
  await expect(page).toHaveURL('https://checkout.stripe.com/c/pay/cart-resume-fixture');
});

test.beforeEach(async ({ page }) => {
  await page.addInitScript((item) => {
    if (!sessionStorage.getItem("cart-test-seeded")) {
      localStorage.setItem("hawk-sportz-cart-v1", JSON.stringify([item]));
      sessionStorage.setItem("cart-test-seeded", "yes");
    }
  }, saved);
});

test("cart refresh updates price and quantity and persists the correction", async ({ page }) => {
  await page.route("**/api/cart/products", (route) => route.fulfill({ json: { products: [{
    id: "1", slug: saved.slug, name: saved.name, price: 30, stock: 2, sizes: ["M"], requiresSize: true,
  }] } }));
  await page.goto("/cart");
  await expect(page.getByText("Subtotal: $60.00", { exact: true })).toBeVisible();
  await expect(page.getByText(/price updated from/)).toBeVisible();
  await expect(page.getByText(/quantity reduced to 2/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  await page.reload();
  await expect(page.getByText("Subtotal: $60.00", { exact: true })).toBeVisible();
});

test("unavailable sizes are removed with an explanation", async ({ page }) => {
  await page.route("**/api/cart/products", (route) => route.fulfill({ json: { products: [{
    id: "1", slug: saved.slug, name: saved.name, price: 25, stock: 20, sizes: ["L"], requiresSize: true,
  }] } }));
  await page.goto("/cart");
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
  await expect(page.getByText(/no longer available in that size/)).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notice", exact: true }).click();
  await expect(page.getByRole("region", { name: "Cart updates" })).toHaveCount(0);
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
});

test("past removal notices do not return after leaving the cart", async ({ page }) => {
  await page.route("**/api/cart/products", route => route.fulfill({ json: { products: [{
    id: "1", slug: saved.slug, name: saved.name, price: 25, stock: 20, sizes: ["L"], requiresSize: true,
  }] } }));
  await page.goto("/cart");
  await expect(page.getByText(/no longer available in that size/)).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Shop products", exact: true }).click();
  await expect(page).toHaveURL(/\/product$/);
  await page.getByRole("link", { name: "Cart (0)", exact: true }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Cart updates" })).toHaveCount(0);
});

test("failed checks preserve saved items and allow retry", async ({ page }) => {
  let fail = true;
  await page.route("**/api/cart/products", (route) => route.fulfill(fail
    ? { status: 503, json: { error: "Unavailable" } }
    : { json: { products: [] } }));
  await page.goto("/cart");
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Could not verify your cart");
  await expect(page.getByText("Subtotal: $100.00", { exact: true })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("Your cart is empty.", { exact: true })).toBeVisible();
});

test("size stock caps one size while another size can still increase", async ({ page }) => {
  await page.addInitScript((item) => {
    if (!sessionStorage.getItem("size-stock-seeded")) {
      localStorage.setItem("hawk-sportz-cart-v1", JSON.stringify([item, { ...item, size: "L", quantity: 3 }]));
      sessionStorage.setItem("size-stock-seeded", "yes");
    }
  }, saved);
  await page.route("**/api/cart/products", route => route.fulfill({ json: { products: [{
    id: "1", slug: saved.slug, name: saved.name, price: 30, stock: 10,
    sizes: ["M", "L"], sizeStock: { M: 1, L: 9 }, requiresSize: true,
  }] } }));
  await page.goto("/cart");
  await expect(page.getByText("Subtotal: $120.00", { exact: true })).toBeVisible();
  const medium = page.getByRole("group", { name: `Quantity for ${saved.name}, M`, exact: true });
  const large = page.getByRole("group", { name: `Quantity for ${saved.name}, L`, exact: true });
  await expect(medium.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  await expect(large.getByRole("button", { name: "Increase quantity" })).toBeEnabled();
  await large.getByRole("button", { name: "Increase quantity" }).click();
  await expect(page.getByText("Subtotal: $150.00", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Subtotal: $150.00", { exact: true })).toBeVisible();
});
