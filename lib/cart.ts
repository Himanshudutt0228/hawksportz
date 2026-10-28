import { readSizeStock, stockForSize, type SizeStock } from "./product-stock.ts";
import {readPrintSizes,type PrintSizes} from "./print-pricing.ts";

export type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  stock: number;
  sizeStock?: SizeStock | null;
  customization?: {
    designId: string;
    additionalComments?: string;
    colour: string;
    sides: ("front" | "back" | "left" | "right")[];
    printPricePerSide: number;
    printSizes?:PrintSizes;
  };
};

export type CartItem = CartProduct & { size: string | null; quantity: number };

export function consumePurchasedItems(items: CartItem[], purchased: { id: string; size: string | null; quantity: number; customization?: { designId: string } }[]): CartItem[] {
  return items.flatMap(item => {
    const line = purchased.find(entry => entry.id === item.id && entry.size === item.size && entry.customization?.designId === item.customization?.designId);
    const quantity = item.quantity - (line?.quantity ?? 0);
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

export function itemKey(item: Pick<CartItem, "id" | "size" | "customization">) {
  return JSON.stringify(item.customization ? [item.id, item.size, item.customization.designId] : [item.id, item.size]);
}

export function addItem(items: CartItem[], product: CartProduct, size: string | null) {
  if (remainingStock(items, product, size) < 1) return items;
  const key = itemKey({ ...product, size });
  const existing = items.some((item) => itemKey(item) === key);
  return existing
    ? items.map((item) => itemKey(item) === key
        ? { ...product, size, quantity: item.quantity + 1 } : item)
    : [...items, { ...product, size, quantity: 1 }];
}

// Ready-made and custom lines consume the same product and size inventory.
export function remainingStock(items: CartItem[], product: CartProduct, size: string | null): number {
  const matching = items.filter(item => item.id === product.id);
  const totalUsed = matching.reduce((sum, item) => sum + item.quantity, 0);
  const sizeUsed = matching.filter(item => item.size === size).reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, Math.min(product.stock - totalUsed, stockForSize(product, size) - sizeUsed));
}

export function addDesignItems(items: CartItem[], product: CartProduct, quantities: Record<string, number>) {
  if (!product.customization) return items;
  const entries = Object.entries(quantities).filter(([, quantity]) => quantity > 0);
  if (!entries.length || entries.some(([, quantity]) => !Number.isSafeInteger(quantity))) return items;
  const quantity = entries.reduce((sum, [, count]) => sum + count, 0);
  const used = items.filter((item) => item.id === product.id).reduce((sum, item) => sum + item.quantity, 0);
  if (used + quantity > product.stock) return items;
  if (entries.some(([size, count]) => count > remainingStock(items, product, size))) return items;
  const next = [...items];
  for (const [size, count] of entries) {
    const key = itemKey({ ...product, size });
    const index = next.findIndex((item) => itemKey(item) === key);
    if (index < 0) next.push({ ...product, size, quantity: count });
    else next[index] = { ...product, size, quantity: next[index].quantity + count };
  }
  return next;
}

export function changeQuantity(items: CartItem[], key: string, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return items;
  const target = items.find((item) => itemKey(item) === key);
  if (!target) return items;
  const others = items.filter((item) => item.id === target.id && itemKey(item) !== key)
    .reduce((sum, item) => sum + item.quantity, 0);
  if (quantity + others > target.stock) return items;
  const sameSize = items.filter(item => item.id === target.id && item.size === target.size && itemKey(item) !== key)
    .reduce((sum, item) => sum + item.quantity, 0);
  if (quantity + sameSize > stockForSize(target, target.size)) return items;
  return items.map((item) => itemKey(item) === key ? { ...item, quantity } : item);
}

export function readCart(raw: string | null): CartItem[] {
  try {
    const data: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(data)) return [];
    const result: CartItem[] = [];
    for (const item of data) {
      if (!item || typeof item.id !== "string" || typeof item.slug !== "string"
        || typeof item.name !== "string" || !Number.isFinite(item.price) || item.price < 0
        || !Number.isSafeInteger(item.stock) || item.stock < 1
        || !Number.isSafeInteger(item.quantity) || item.quantity < 1
        || (item.size !== null && typeof item.size !== "string")) continue;
      const used = result.filter((entry) => entry.id === item.id)
        .reduce((sum, entry) => sum + entry.quantity, 0);
      const sizeStock = readSizeStock(item.sizeStock);
      if (used + item.quantity > item.stock || item.quantity > remainingStock(result, { ...item, sizeStock }, item.size)
        || result.some((entry) => itemKey(entry) === itemKey(item))) continue;
      let customization: CartProduct["customization"];
      if (item.customization !== undefined) {
        const custom = item.customization;
        if (!custom || typeof custom.designId !== "string" || !/^[0-9a-f-]{36}$/.test(custom.designId)
          || typeof custom.colour !== "string" || custom.colour.length > 100
          || !Array.isArray(custom.sides) || !custom.sides.length || custom.sides.length > 4
          || new Set(custom.sides).size !== custom.sides.length
          || custom.sides.some((side: unknown) => typeof side !== "string" || !["front", "back", "left", "right"].includes(side))
          || !Number.isFinite(custom.printPricePerSide) || custom.printPricePerSide < 0) continue;
        const printSizes=custom.printSizes===undefined?undefined:readPrintSizes(custom.printSizes);
        if(custom.printSizes!==undefined&&(!printSizes||custom.sides.some((side:string)=>!Object.hasOwn(printSizes,side))||Object.keys(printSizes).some(side=>!custom.sides.includes(side))))continue;
        customization = { designId: custom.designId, colour: custom.colour,
          sides: custom.sides, printPricePerSide: custom.printPricePerSide,...(printSizes?{printSizes}:{}) };
      }
      result.push({ id: item.id, slug: item.slug, name: item.name,
        price: item.price, stock: item.stock, size: item.size, quantity: item.quantity,
        ...(sizeStock !== null ? { sizeStock } : {}),
        ...(customization ? { customization } : {}) });
    }
    return result;
  } catch {
    return [];
  }
}
