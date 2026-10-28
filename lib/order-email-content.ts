import { orderMoney } from "./admin-orders";
import { pickupLocation, pickupInstructions } from "./checkout";
import { storeContactEmail } from "./store-contact";

export type EmailSnapshot = {
  id: string; kind: "payment_confirmed" | "ready_for_pickup" | "shipped";
  email: string; method: "pickup" | "shipping";
  items: { name: string; size: string | null; quantity: number; unit_cents: number }[];
  subtotal: number; shipping: number; tax: number; total: number;
};

export function orderEmailContent(order: EmailSnapshot) {
  const headings = {
    payment_confirmed: "Payment confirmed",
    ready_for_pickup: "Your order is ready for pickup",
    shipped: "Your order has shipped",
  };
  const heading = headings[order.kind];
  if (!heading || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(order.email) || order.email.length > 254) {
    throw new Error("Invalid email snapshot");
  }
  const lines = ["Hawk Sportz — SANDBOX TEST ORDER", "", heading,
    "This is a test purchase. No live payment was taken.", `Order reference: ${order.id}`, ""];
  if (order.kind === "payment_confirmed") {
    lines.push(...order.items.map(item => `${item.name}${item.size ? ` (${item.size})` : ""} × ${item.quantity}: ${orderMoney(item.unit_cents * item.quantity)}`),
      "", `Items: ${orderMoney(order.subtotal)}`, `Shipping: ${orderMoney(order.shipping)}`,
      `Tax: ${orderMoney(order.tax)}`, `Total: ${orderMoney(order.total)}`, "");
    lines.push(order.method === "pickup" ? "Please wait for a ready-for-pickup email before arranging collection." : "We will email you when your order ships.");
  }
  if (order.kind === "ready_for_pickup") {
    lines.push(`${pickupLocation.line1}, ${pickupLocation.city}, ${pickupLocation.state} ${pickupLocation.postal_code}`, pickupInstructions,
      `Email ${storeContactEmail} to arrange your pickup time before arriving.`);
  }
  if (order.kind === "shipped") lines.push("Your order has been marked shipped. Contact the store if you need delivery assistance.");
  lines.push("", `Questions? Reply to this email or contact ${storeContactEmail}.`);
  // Plain text prevents customer/product content from becoming active HTML.
  // No receipt links: guest receipt access stays bound to the original private cookie.
  return { to: [order.email], reply_to: storeContactEmail, subject: `[TEST] Hawk Sportz — ${heading}`, text: lines.join("\n") };
}
