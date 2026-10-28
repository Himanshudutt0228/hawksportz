// Printing charge per garment, per printed side, in the store's current currency.
// Missing configuration deliberately disables custom add-to-cart.
export function customPrintPrice(): number | null {
  const raw = process.env.CUSTOM_PRINT_PRICE_PER_SIDE?.trim();
  if (!raw || !/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const price = Number(raw);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
