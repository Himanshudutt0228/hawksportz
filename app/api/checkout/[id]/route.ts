import type Stripe from "stripe";
import { authSiteUrl, createAuthClient } from "@/lib/auth/server";
import { checkoutStripe, guestOrderHash, orderDatabase } from "@/lib/checkout-server";
import { safeStripeUrl } from "@/lib/checkout";
import { limitedBody } from "@/lib/request-body";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const reply = (error: string, status: number) => Response.json({ error }, { status, headers });
  if (request.headers.get("origin") !== authSiteUrl()) return reply("Invalid checkout request.", 403);
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply("Checkout not found.", 404);
  let action: unknown;
  try { action = JSON.parse(await limitedBody(request, 1024))?.action; } catch { /* Reject malformed input. */ }
  if (action !== "resume" && action !== "cancel") return reply("Invalid checkout action.", 400);
  try {
    const accessHash = await guestOrderHash();
    const auth = await createAuthClient(true);
    const { data: identity } = await auth.auth.getUser();
    const userId = identity.user?.email_confirmed_at ? identity.user.id : null;
    if (!accessHash && !userId) return reply("Checkout not found.", 404);
    const db = orderDatabase();
    const { data: order, error } = await db.from("store_orders")
      .select("id,user_id,access_hash,status,stripe_session_id").eq("id", id).maybeSingle();
    if (error) return reply("Unable to check checkout. Please try again.", 503);
    if (!order || !((accessHash !== null && order.access_hash === accessHash) ||
      (userId !== null && order.user_id === userId))) return reply("Checkout not found.", 404);
    if (order.status === "paid") return reply("Payment is already confirmed. View your receipt before making changes.", 409);
    if (order.status === "expired") return action === "cancel"
      ? Response.json({ cancelled: true }, { headers }) : reply("This checkout has expired. Refresh your cart.", 409);
    if (!order.stripe_session_id?.startsWith("cs_test_")) return reply("Checkout is still being prepared. Please try again shortly.", 409);
    const stripe = checkoutStripe();
    let session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    const matchesOrder = (value: Stripe.Checkout.Session) => !value.livemode && value.id === order.stripe_session_id &&
      value.metadata?.order_id === order.id && value.client_reference_id === order.id;
    if (!matchesOrder(session)) return reply("Unable to verify checkout.", 503);
    if (action === "resume") {
      if (session.status !== "open" || !safeStripeUrl(session.url)) return reply("Checkout has finished. View your receipt or refresh your cart.", 409);
      return Response.json({ url: session.url }, { headers });
    }
    if (session.status === "open") {
      try {
        await stripe.checkout.sessions.expire(session.id, {}, { idempotencyKey: `order-cancel:${order.id}` });
      } catch { /* A concurrent payment or lost response requires checking Stripe again. */ }
      session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
    }
    // Never release stock from a browser request or an uncertain expire response.
    if (!matchesOrder(session) || session.status !== "expired" || session.payment_status === "paid") {
      return reply("Checkout could not be cancelled. Payment may have completed; view your receipt before trying again.", 409);
    }
    const { error: settleError } = await db.rpc("store_checkout_settle", {
      p_order_id: order.id, p_session_id: session.id, p_state: "expired",
      p_subtotal: null, p_shipping: null, p_tax: null, p_total: null, p_currency: null, p_customer: null,
    });
    if (settleError) return reply("Payment is closed, but stock release needs another attempt. Please try Remove again.", 503);
    return Response.json({ cancelled: true }, { headers });
  } catch {
    return reply("Unable to verify checkout. Your cart has been kept. Please try again.", 503);
  }
}
