export function productSizes(product: { sizes?: unknown; size?: unknown }): string[] {
  const values: unknown[] = Array.isArray(product.sizes) ? product.sizes : [product.size];
  return [...new Set(values.filter((size): size is string => typeof size === "string")
    .map((size) => size.trim()).filter(Boolean))];
}
