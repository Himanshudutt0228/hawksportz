export type SizeStock = Record<string, number>;

// Null marks legacy shared stock. Invalid configured inventory fails closed.
export function readSizeStock(value: unknown): SizeStock | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value);
  if (entries.length > 30 || entries.some(([size, count]) => !size || size.length > 40 ||
      !Number.isSafeInteger(count) || count < 0 || count > 999999999)) return {};
  return Object.fromEntries(entries);
}

export function stockForSize(product: { stock: number; sizeStock?: SizeStock | null }, size: string | null): number {
  if (!Number.isSafeInteger(product.stock) || product.stock < 0) return 0;
  if (product.sizeStock == null) return product.stock;
  const count = size !== null && Object.hasOwn(product.sizeStock, size) ? product.sizeStock[size] : 0;
  return Number.isSafeInteger(count) && count >= 0 ? Math.min(product.stock, count) : 0;
}
