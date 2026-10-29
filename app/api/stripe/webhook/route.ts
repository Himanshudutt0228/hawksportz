import { checkoutStripe, orderDatabase } from "@/lib/checkout-server";
import { limitedBody } from "@/lib/request-body";
import { sendOrderEmails } from "@/lib/order-email-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return new Response("Webhook not configured", { status: 503 });
  if (!signature) return new Response("Invalid signature", { status: 400 });
  let event;
  try {
    const body = await limitedBody(request, 262144);
    const stripe = checkoutStripe();
    const nextSecret = process.env.STRIPE_WEBHOOK_SECRET_NEXT;
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch {
      // Endpoint migration: verify the same raw body against the new endpoint secret.
      if (!nextSecret?.startsWith("whsec_")) throw new Error("Invalid signature");
      event = stripe.webhooks.constructEvent(body, signature, nextSecret);
    }
  } catch { return new Response("Invalid webhook", { status: 400 }); }
  if (event.livemode) return new Response("Live events are disabled", { status: 400 });
  if (!["checkout.session.completed", "checkout.session.expired", "checkout.session.async_payment_succeeded"].includes(event.type)) return new Response("Ignored");
  try {
    const object = event.data.object as { id: string };
    // Retrieve current state: signed events can arrive twice or out of order.
    const session = await checkoutStripe().checkout.sessions.retrieve(object.id);
    const orderId = session.metadata?.order_id;
    if (session.livemode || !orderId || orderId !== session.client_reference_id) return new Response("Unrelated session");
    const paid = session.status === "complete" && ["paid", "no_payment_required"].includes(session.payment_status);
    if (!paid && session.status !== "expired") return new Response("Awaiting payment");
    if (paid) {
      // Use the verified session's original policy, even if server settings change.
      const noTax = session.metadata?.tax_mode === "sandbox_no_tax";
      const validTax = noTax
        ? session.automatic_tax.enabled === false && session.total_details?.amount_tax === 0
        : session.automatic_tax.enabled === true && session.automatic_tax.status === "complete";
      if (!validTax) return new Response("Tax is not finalized", { status: 503 });
    }
    const customer = session.customer_details;
    const { error } = await orderDatabase().rpc("store_checkout_settle", { p_order_id: orderId,
      p_session_id: session.id, p_state: paid ? "paid" : "expired", p_subtotal: session.amount_subtotal,
      p_shipping: session.total_details?.amount_shipping ?? 0, p_tax: session.total_details?.amount_tax ?? 0,
      p_total: session.amount_total, p_currency: session.currency,
      p_customer: paid ? { email: customer?.email, name: customer?.name, phone: customer?.phone, address: customer?.address,
        shipping: session.collected_information?.shipping_details } : null,
    });
    if (error) return new Response("Order update failed", { status: 503 });
    if (paid) {
      try { await sendOrderEmails(orderId); } catch { /* Durable queue is retried by the worker. */ }
    }
    return new Response("Received");
  } catch { return new Response("Unable to verify event", { status: 503 }); }
}
