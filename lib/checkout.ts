export type CheckoutLine = { id: string; size: string | null; quantity: number; customization?: { designId: string; additionalComments?: string } };
export type DeliveryMethod = "shipping" | "pickup";
export const shippingCents = 899;
export const pickupLocation = { line1: "222 Bankside Drive", city: "Kitchener", state: "ON", postal_code: "N2N 3E5", country: "CA" };
export const pickupInstructions = "Free pickup, 10 AM–8 PM daily. Wait for Ready for pickup confirmation and arrange a pickup time before arriving.";

export function parseCheckout(value: unknown, allowCustom = false): { lines: CheckoutLine[]; method: DeliveryMethod; requestId: string } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 20 ||
      (body.method !== "shipping" && body.method !== "pickup") || typeof body.requestId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId)) return null;
  const lines: CheckoutLine[] = [];
  for (const item of body.items) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !/^[1-9]\d{0,18}$/.test(entry.id) || (entry.customization !== undefined && (!allowCustom || !entry.customization || typeof entry.customization !== "object" || !/^[0-9a-f-]{36}$/i.test(String((entry.customization as Record<string, unknown>).designId)))) ||
        (entry.size !== null && (typeof entry.size !== "string" || !entry.size.trim() || entry.size.length > 40)) ||
        !Number.isSafeInteger(entry.quantity) || Number(entry.quantity) < 1 || Number(entry.quantity) > 99) return null;
    const line: CheckoutLine = { id: entry.id, size: entry.size as string | null, quantity: Number(entry.quantity) };
    if (entry.customization) line.customization = { designId: (entry.customization as { designId: string }).designId };
    if (lines.some(other => other.id === line.id && other.size === line.size && other.customization?.designId === line.customization?.designId)) return null;
    lines.push(line);
  }
  lines.sort((a, b) => a.id.localeCompare(b.id) || (a.size ?? "").localeCompare(b.size ?? "") || (a.customization?.designId ?? "").localeCompare(b.customization?.designId ?? ""));
  return { lines, method: body.method, requestId: body.requestId };
}

export function safeStripeUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com" && !url.username && !url.password && !url.port;
  } catch { return false; }
}
