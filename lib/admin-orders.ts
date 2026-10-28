export type FulfilmentStatus = "unfulfilled" | "ready_for_pickup" | "picked_up" | "shipped";
export type FulfilmentState = { error?: string; message?: string };
export const fulfilmentLabels: Record<FulfilmentStatus, string> = {
  unfulfilled: "To fulfil", ready_for_pickup: "Ready for pickup", picked_up: "Picked up", shipped: "Shipped",
};
export function validOrderId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
export function isFulfilmentStatus(value: unknown): value is FulfilmentStatus {
  return typeof value === "string" && Object.hasOwn(fulfilmentLabels, value);
}
export function nextFulfilment(method: string, status: FulfilmentStatus): { status: FulfilmentStatus; label: string } | null {
  if (method === "shipping" && status === "unfulfilled") return { status: "shipped", label: "Mark shipped" };
  if (method === "pickup" && status === "unfulfilled") return { status: "ready_for_pickup", label: "Mark ready for pickup" };
  if (method === "pickup" && status === "ready_for_pickup") return { status: "picked_up", label: "Mark picked up" };
  return null;
}
export function orderMoney(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}
export function orderDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short",
  }).format(date) : "Unavailable";
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown): string { return typeof value === "string" ? value : ""; }
export function orderContact(value: unknown) {
  const customer = record(value);
  const shipping = record(customer.shipping);
  const address = record(shipping.address);
  return { name: text(customer.name), email: text(customer.email), phone: text(customer.phone),
    recipient: text(shipping.name), address: [text(address.line1), text(address.line2),
      [text(address.city), text(address.state), text(address.postal_code)].filter(Boolean).join(", "),
      text(address.country)].filter(Boolean),
  };
}
