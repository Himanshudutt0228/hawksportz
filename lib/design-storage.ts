import { parseDesign, type SavedDesign } from "@/lib/design";

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("hawk-sportz-designs", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("designs", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Design storage is unavailable. Download your design to keep a copy."));
  });
}

export async function saveDesign(design: SavedDesign): Promise<void> {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("designs", "readwrite");
      transaction.objectStore("designs").put(design);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error("Could not save your design. Download it to keep a copy."));
      transaction.onabort = () => reject(new Error("Could not save your design. Download it to keep a copy."));
    });
  } finally { db.close(); }
}

export async function loadDesign(id: string): Promise<SavedDesign | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("designs", "readonly").objectStore("designs").get(id);
      request.onsuccess = () => resolve(parseDesign(request.result) ?? undefined);
      request.onerror = () => reject(new Error("Could not open your saved design."));
    });
  } finally { db.close(); }
}
