import { readCustomAudiences } from "./custom-audiences.ts";
import { readProductStyle } from "./product-styles.ts";

export type ProductEditState = { error?: string; message?: string };

export function validProductId(value: unknown): value is string {
  return typeof value === "string" && (/^[1-9]\d{0,18}$/.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

export function readProductEdit(form: FormData, sizes?: string[]) {
  const name = form.get("name");
  const description = form.get("description");
  const price = form.get("price");
  if (typeof name !== "string" || !name.trim() || name.trim().length > 200 ||
      typeof description !== "string" || description.length > 10000 ||
      typeof price !== "string" || !/^\d{1,7}(\.\d{1,2})?$/.test(price)) return null;
  let stock: number;
  let stockBySize: Record<string, number> | null = null;
  if (sizes?.length) {
    if (sizes.length > 30 || sizes.some(size => !size || size.length > 40)) return null;
    const entries: [string, number][] = [];
    for (const size of sizes) {
      const quantity = form.get(`stock:${size}`);
      if (typeof quantity !== "string" || !/^\d{1,9}$/.test(quantity)) return null;
      entries.push([size, Number(quantity)]);
    }
    stockBySize = Object.fromEntries(entries);
    stock = entries.reduce((total, [, count]) => total + count, 0);
    if (stock > 999999999) return null;
  } else {
    const quantity = form.get("stock");
    if (typeof quantity !== "string" || !/^\d{1,9}$/.test(quantity)) return null;
    stock = Number(quantity);
  }
  return { name: name.trim(), description: description.trim(), price: Number(price), stock,
    ...(sizes !== undefined ? { stock_by_size: stockBySize } : {}) };
}

export const productCategories = ["tshirts", "hoodies", "jerseys", "beanies", "hats", "sweatshirts", "equipment"] as const;

export function readNewProduct(form: FormData) {
  const category = form.get("category");
  const customizable = form.get("customizable");
  if (typeof category !== "string" ||
      !productCategories.some(value => value === category) ||
      (customizable !== null && customizable !== "on")) return null;
  const sizes = readList(form.get("sizes"));
  const colours = readList(form.get("colours"));
  if (!sizes || !colours || (category !== "equipment" && sizes.length === 0) ||
      (!["tshirts", "hoodies", "jerseys", "hats", "beanies", "sweatshirts"].includes(category) && customizable === "on")) return null;
  const style = readProductStyle(category, form.get("garment_style"));
  if (style === undefined) return null;
  const details = readProductEdit(form, sizes);
  if (!details) return null;
  const audiences = readCustomAudiences(form);
  if (!audiences || (audiences.length>0 && customizable!=="on")) return null;
  return { ...details, category, sizes, colours, customizable: customizable === "on", custom_audiences: audiences,
    ...(style ? { garment_style: style } : {}) };
}

// The unique suffix lets two products share a name without asking staff to
// manage URLs. Non-Latin names receive a safe fallback while preserving the name.
export function createProductSlug(name: string, uniqueId: string): string {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").slice(0, 63).replace(/^-+|-+$/g, "") || "product";
  return `${base}-${uniqueId}`;
}

function readList(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  const items = [...new Set(value.split(",").map(item => item.trim()).filter(Boolean))];
  return items.length <= 30 && items.every(item => item.length <= 40) ? items : null;
}
