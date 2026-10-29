import { checkoutReservationFailure } from "@/lib/checkout-reservation-error";
import { verifyGarmentProof } from "@/lib/garment-proof-signature";
import { checkoutDesign } from "@/lib/custom-checkout";
import { authSiteUrl, createAuthClient } from "@/lib/auth/server";
import { checkoutStripe, guestOrderHash, orderDatabase, sandboxCheckoutReady, sandboxTaxMode } from "@/lib/checkout-server";
import { parseCheckout, pickupInstructions, pickupLocation, safeStripeUrl } from "@/lib/checkout";
import { limitedBody } from "@/lib/request-body";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!sandboxCheckoutReady()) return Response.json({ error: "Sandbox checkout setup is incomplete." }, { status: 503, headers });
  const origin = authSiteUrl();
  if (request.headers.get("origin") !== origin) return Response.json({ error: "Invalid checkout request." }, { status: 403, headers });
  let checkout;
  let designs: unknown[] = [];
  try {
    const body = JSON.parse(await limitedBody(request, 24 * 1024 * 1024));
    checkout = parseCheckout(body, true);
    if (Array.isArray(body.designs) && body.designs.length <= 20) designs = body.designs;
  } catch { /* Reject malformed/oversized input. */ }
  if (!checkout) return Response.json({ error: "Check your cart and saved designs, then try again." }, { status: 400, headers });
  try {
    const auth = await createAuthClient(true);
    const { data: identity } = await auth.auth.getUser();
    const userId = identity.user?.email_confirmed_at ? identity.user.id : null;
    const accessHash = await guestOrderHash(true);
    const db = orderDatabase();
    const customLines = checkout.lines.filter(line => line.customization);
    const snapshots: Record<string, unknown> = {};
    if (customLines.length) {
      const { data: products, error: productError } = await db.from("products").select("*").in("id", [...new Set(customLines.map(line => line.id))]);
      if (productError || !products) throw new Error("Products unavailable");
      for (const line of customLines) {
        const product = products.find(product => String(product.id) === line.id);
        const source = designs.find(value => value && typeof value === "object" && "id" in value && value.id === line.customization!.designId);
        const design = product && checkoutDesign(source, product);
        if (!design || !verifyGarmentProof(design.garmentProof, design.productId, process.env.SUPABASE_SECRET_KEY ?? "")) return Response.json({ error: "Reopen your custom design, refresh garment views, check the print options, and save it again before checkout." }, { status: 400, headers });
        snapshots[design.id] = design;
      }
    }
    const { data: order, error } = await db.rpc(customLines.length ? "store_custom_checkout_start" : "store_checkout_start", { p_order_id: checkout.requestId,
      p_access_hash: accessHash, p_user_id: userId, p_lines: checkout.lines, p_method: checkout.method, ...(customLines.length ? { p_designs: snapshots } : {}) });
    if (error || !order) {
      const failure = checkoutReservationFailure(error);
      return Response.json({ error: failure.error }, { status: failure.status, headers });
    }
    const stripe = checkoutStripe();
    const taxMode = sandboxTaxMode();
    if (order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      if (session.status === "open" && safeStripeUrl(session.url)) return Response.json({ url: session.url }, { headers });
      return Response.json({ error: "This checkout has already finished. Check your order or start again from the cart." }, { status: 409, headers });
    }
    const customer = await stripe.customers.create({ metadata: { order_id: order.id },
      ...(checkout.method === "pickup" ? { shipping: { name: "Hawk Sportz local pickup", address: pickupLocation } } : {}),
    }, { idempotencyKey: `order-customer:${order.id}` });
    const session = await stripe.checkout.sessions.create({
      mode: "payment", allowed_payment_method_types: ["card"], currency: "cad", customer: customer.id,
      client_reference_id: order.id, metadata: { order_id: order.id, tax_mode: taxMode! },
      billing_address_collection: "required", automatic_tax: { enabled: taxMode === "automatic" },
      customer_update: { address: "auto", name: "auto", ...(checkout.method === "shipping" ? { shipping: "auto" as const } : {}) },
      ...(checkout.method === "shipping" ? { shipping_address_collection: { allowed_countries: ["CA" as const] } } : {}),
      shipping_options: [{ shipping_rate_data: { display_name: checkout.method === "shipping" ? "Canada-wide shipping" : "Local pickup",
        type: "fixed_amount", fixed_amount: { amount: order.shipping_cents, currency: "cad" }, tax_behavior: "exclusive" } }],
      line_items: order.items.map((line: { name: string; size: string | null; quantity: number; unit_cents: number }) => ({
        quantity: line.quantity, price_data: { currency: "cad", unit_amount: line.unit_cents, tax_behavior: "exclusive",
          product_data: { name: `${line.name}${line.size ? ` (${line.size})` : ""}`, tax_code: "txcd_99999999" } },
      })),
      ...(checkout.method === "pickup" ? { custom_text: { submit: { message: `${pickupLocation.line1}, ${pickupLocation.city}. ${pickupInstructions}` } } } : {}),
      expires_at: order.session_expires_at,
      success_url: `${origin}/orders/${order.id}`, cancel_url: `${origin}/cart`,
    }, { idempotencyKey: `order-session:${order.id}` });
    if (session.livemode || !safeStripeUrl(session.url)) throw new Error("Invalid sandbox session");
    const { error: bindError } = await db.rpc("store_checkout_bind", { p_order_id: order.id,
      p_access_hash: accessHash, p_session_id: session.id });
    if (bindError) throw new Error("Session binding failed");
    return Response.json({ url: session.url }, { headers });
  } catch {
    // Never log provider errors: they may contain secrets or customer details.
    return Response.json({ error: "Unable to confirm checkout. Please try again from this cart. If payment was made, check your order before paying again." }, { status: 503, headers });
  }
}
