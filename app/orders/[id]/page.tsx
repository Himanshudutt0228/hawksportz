import Link from "next/link";
import { notFound } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import { checkoutStripe, guestOrderHash, orderDatabase } from "@/lib/checkout-server";
import { pickupInstructions, pickupLocation, safeStripeUrl, type CheckoutLine } from "@/lib/checkout";
import PaidCartUpdate from "./PaidCartUpdate";

export const metadata = { title: "Your order | Hawk Sportz", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const accessHash = await guestOrderHash();
  const auth = await createAuthClient(true);
  const { data: identity } = await auth.auth.getUser();
  const userId = identity.user?.email_confirmed_at ? identity.user.id : null;
  if (!accessHash && !userId) notFound();
  const { data: order, error } = await orderDatabase().from("store_orders")
    .select("id,user_id,access_hash,status,delivery_method,items,subtotal_cents,shipping_cents,tax_cents,total_cents,stripe_session_id")
    .eq("id", id).maybeSingle();
  if (error) return <main className="mx-auto max-w-2xl px-5 py-12"><h1 className="text-3xl font-semibold">Unable to load your order</h1><p className="mt-4">Please try again shortly.</p></main>;
  if (!order || !((accessHash !== null && order.access_hash === accessHash) || (userId !== null && order.user_id === userId))) notFound();
  let resumeUrl: string | null = null;
  if (order.status === "open" && order.stripe_session_id) {
    try {
      const session = await checkoutStripe().checkout.sessions.retrieve(order.stripe_session_id);
      if (!session.livemode && session.status === "open" && safeStripeUrl(session.url)) resumeUrl = session.url;
    } catch { /* A receipt still renders when Stripe is temporarily unavailable. */ }
  }
  const paid = order.status === "paid";
  const items = order.items as (CheckoutLine & { name: string; unit_cents: number })[];
  const money = (cents: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
  return <main className="mx-auto w-full max-w-2xl px-5 py-12">
    <p className="text-sm font-medium text-amber-900">Sandbox order — no real payment</p>
    <h1 className="mt-3 text-3xl font-semibold">{paid ? "Payment confirmed" : order.status === "expired" ? "Checkout expired" : "Payment not yet confirmed"}</h1>
    <p className="mt-4 text-sm text-gray-600">Order reference: {order.id}</p>
    {paid ? <p className="mt-4">Your test order has been recorded.</p> : order.status === "expired"
      ? <p className="mt-4">Reserved stock has been released. Return to your cart to check availability and try again.</p>
      : <p className="mt-4">If you just paid, wait briefly and refresh this page. A payment-page redirect does not confirm payment.</p>}
    <ul className="mt-8 space-y-3">{items.map(line => <li key={`${line.id}:${line.size}:${line.customization?.designId ?? "ready"}`} className="flex justify-between gap-4"><span>{line.name}{line.customization ? " (Custom design)" : ""}{line.size ? ` (${line.size})` : ""} × {line.quantity}</span><span>{money(line.unit_cents * line.quantity)}</span></li>)}</ul>
    <div className="mt-6 border-t border-gray-200 pt-4"><p>Items: {money(order.subtotal_cents)}</p><p className="mt-2">{order.delivery_method === "pickup" ? "Pickup: Free" : `Shipping: ${money(order.shipping_cents)}`}</p>
      {paid && <><p className="mt-2">Tax: {money(order.tax_cents)}</p><p className="mt-3 text-xl font-semibold">Total: {money(order.total_cents)}</p></>}
    </div>
    {order.delivery_method === "pickup" && <div className="mt-6 rounded-lg bg-gray-50 p-4"><p>{pickupLocation.line1}, {pickupLocation.city}, ON {pickupLocation.postal_code}</p><p className="mt-2 text-sm">{pickupInstructions}</p></div>}
    <div className="mt-8 flex flex-wrap gap-5 text-sm underline">
      {resumeUrl && <a href={resumeUrl}>Continue test payment</a>}
      {!paid && <Link href={`/orders/${id}`} prefetch={false}>Refresh order status</Link>}
      <Link href="/cart">Your cart</Link><Link href="/product">Continue shopping</Link>
    </div>
    {paid && <PaidCartUpdate orderId={id} lines={items} />}
  </main>;
}
