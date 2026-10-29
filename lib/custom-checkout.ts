import { parseDesign, printedSides, productColours, type SavedDesign } from "./design.ts";
import { customPricingForCategory, printTemplateForProduct, quotePrintAreas } from "./print-pricing.ts";

// Test orders retain editable snapshots, never public artwork URLs.
export function checkoutDesign(value: unknown, product: Record<string, unknown>): SavedDesign | null {
  const design = parseDesign(value);
  if (!design || design.version !== 3 || design.productId !== String(product.id) ||
      !/^[0-9a-f-]{36}$/i.test(design.id) || product.customizable === false ||
      (["hats", "beanies", "sweatshirts"].includes(String(product.category)) && product.customizable !== true) ||
      !productColours(product).includes(design.colour) ||
      (design.printTemplate ?? "standard") !== printTemplateForProduct({ category: String(product.category), garmentStyle: product.garment_style as string | null })) return null;
  // Refuse geometry that the general import parser would repair silently.
  const original = value as SavedDesign;
  if (design.layers.some((layer, index) => ["x", "y", "width", "height", "rotation"].some(key =>
    Math.abs(layer[key as "x"] - original.layers[index][key as "x"]) > 0.000001))) return null;
  // The editor can omit untouched defaults. SQL requires an explicit size for
  // every printed side; use the same defaults as the editor and pricing helper.
  const sides = printedSides(design.layers);
  const printSizes = { ...design.printSizes };
  for (const side of sides) {
    printSizes[side] = side === "left" || side === "right" || design.printTemplate === "headwear"
      ? "pocket" : printSizes[side] ?? "large";
  }
  const quote = quotePrintAreas(customPricingForCategory(String(product.category),Number(product.price)), sides, printSizes, 1);
  return quote ? { ...design, printSizes } : null;
}
