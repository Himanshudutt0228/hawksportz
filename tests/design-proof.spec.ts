import sharp from "sharp";
import { test, expect } from "@playwright/test";

const designId = "10000000-0000-0000-0000-000000000001";
const design = { version: 3, id: designId, productId: "1", colour: "As pictured", additionalComments: "Keep logo centred", printTemplate: "standard", printSizes: { front: "large", back: "large" }, quantities: { M: 2 }, updatedAt: "2026-10-29",
  layers: ["front", "back"].map((side, i) => ({ id: `text-${i}`, kind: "text", side, x: 250, y: 250, width: 80, height: 35, rotation: 0, font: "Arial", color: "#111111", text: side === "front" ? "HAWK FRONT" : "HAWK BACK" })) };

async function seed(page: import("@playwright/test").Page, includeDesign: boolean) {
  const photo = `data:image/webp;base64,${(await sharp({ create: { width: 20, height: 30, channels: 3, background: "#aaaaaa" } }).webp().toBuffer()).toString("base64")}`;
  const proof = { productId: "1", photos: { front: photo, back: photo, left: photo, right: photo }, signature: "a".repeat(64) };
  await page.route("**/api/checkout", route => route.abort());
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty.", { exact: false })).toBeVisible();
  await page.evaluate(async ({ design, includeDesign }) => {
    const cart = [{ id: "1", name: "Proof test shirt", slug: "shirt", price: 35, stock: 10, size: "M", quantity: 2, customization: { designId: design.id, colour: "As pictured", sides: ["front", "back"], printSizes: { front: "large", back: "large" }, printPricePerSide: 0 } }];
    localStorage.setItem("hawk-sportz-cart-v1", JSON.stringify(cart));
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("hawk-sportz-designs", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("designs", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("designs", "readwrite");
      if (includeDesign) tx.objectStore("designs").put(design); else tx.objectStore("designs").delete(design.id);
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
    }); db.close();
    window.dispatchEvent(new StorageEvent("storage", { key: "hawk-sportz-cart-v1", newValue: JSON.stringify(cart) }));
  }, { design: { ...design, garmentProof: proof }, includeDesign });
}

test("checkout shows all saved sides and comments and invalidates approval when design changes", async ({ page }) => {
  await seed(page, true);
  const proof = page.getByRole("article", { name: `Design proof ${designId}` });
  await expect(proof).toBeVisible();
  await expect(proof.getByText(/The owner will review your design/)).toBeVisible();
  await expect(proof.getByText("Keep logo centred", { exact: true })).toBeVisible();
  await expect(proof.getByRole("group", { name: "Front garment preview" })).toBeVisible();
  await expect(proof.getByRole("group", { name: "Back garment preview" })).toHaveCount(0);
  await proof.getByRole("button", { name: "Back", exact: true }).click();
  await expect(proof.getByRole("group", { name: "Back garment preview" })).toBeVisible();
  await expect(proof.locator("image[data-garment-photo]")).toHaveCount(1);
  await expect(proof.getByText("M: 2", { exact: true })).toBeVisible();
  const approval = page.getByRole("checkbox", { name: /I have checked all design proofs/ });
  await expect(approval).not.toBeChecked();
  await expect(page.getByRole("button", { name: "Continue to test payment" })).toBeDisabled();
  await approval.check();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => { const r = indexedDB.open("hawk-sportz-designs", 1); r.onsuccess = () => resolve(r.result); });
    await new Promise<void>(resolve => { const tx = db.transaction("designs", "readwrite"); const store = tx.objectStore("designs"); const r = store.get("10000000-0000-0000-0000-000000000001"); r.onsuccess = () => store.put({ ...r.result, additionalComments: "Updated instruction" }); tx.oncomplete = () => resolve(); });
    db.close(); window.dispatchEvent(new Event("focus"));
  });
  await expect(proof.getByText("Updated instruction", { exact: true })).toBeVisible();
  await expect(approval).not.toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("missing saved artwork blocks customer approval", async ({ page }) => {
  await seed(page, false);
  await expect(page.getByRole("alert").filter({ hasText: "Unable to load the design proof" })).toContainText("Unable to load the design proof");
  await expect(page.getByRole("checkbox", { name: /I have checked all design proofs/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Continue to test payment" })).toBeDisabled();
});

test("anonymous visitors cannot open a production sheet", async ({ page }) => {
  await page.goto("/admin/orders/10000000-0000-0000-0000-000000000001/production");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole("heading", { name: "Custom order production sheet" })).toHaveCount(0);
});
