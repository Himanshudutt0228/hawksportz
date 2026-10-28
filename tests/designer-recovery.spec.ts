import { test, expect } from "@playwright/test";

const draftId = "00000000-0000-0000-0000-000000000099";

test("a missing remembered draft is forgotten without a recurring warning", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(id => localStorage.setItem("hawk-sportz-last-design", id), draftId);
  await page.goto("/custom-apparel");
  await page.getByRole("link",{name:"Resume saved design",exact:true}).click();
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("hawk-sportz-last-design"))).toBeNull();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("an automatically remembered unavailable garment starts fresh without deleting artwork", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async id => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("hawk-sportz-designs", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("designs", { keyPath: "id" });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("designs", "readwrite");
        transaction.objectStore("designs").put({ version: 2, id, productId: "missing-product-for-recovery-test",
          colour: "Black", layers: [], quantities: {}, updatedAt: new Date().toISOString() });
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      };
    });
    localStorage.setItem("hawk-sportz-last-design", id);
  }, draftId);
  await page.goto("/custom-apparel");
  await page.getByRole("link",{name:"Resume saved design",exact:true}).click();
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("hawk-sportz-last-design"))).toBeNull();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(async id => new Promise<boolean>((resolve, reject) => {
    const request = indexedDB.open("hawk-sportz-designs", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const read = db.transaction("designs", "readonly").objectStore("designs").get(id);
      read.onsuccess = () => { db.close(); resolve(!!read.result); };
      read.onerror = () => { db.close(); reject(read.error); };
    };
  }), draftId)).toBe(true);
});

test("explicit missing-design links give a dismissible recovery explanation", async ({ page }) => {
  await page.goto(`/custom-apparel?design=${draftId}`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("not available in this browser");
  await page.getByRole("button", { name: "Dismiss notice", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upload artwork", exact: true })).toBeEnabled();
});
