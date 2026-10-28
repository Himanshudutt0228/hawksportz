import Link from "next/link";
import { notFound } from "next/navigation";
import DismissibleNotice from "@/components/DismissibleNotice";
import { customerOrderStatus, requireCustomer, type CustomerOrder } from "@/lib/customer-orders";
import { orderDate, orderMoney, validOrderId } from "@/lib/admin-orders";
import { pickupInstructions, pickupLocation } from "@/lib/checkout";

export const metadata = { title: "Your order | Hawk Sportz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await requireCustomer();
  const { id } = await params;
  if (!validOrderId(id)) notFound();
  const { data, error } = await supabase.rpc("store_customer_orders", { p_order_id: id });
  const order = (data as CustomerOrder[] | null)?.[0];
  if (!error && !order) notFound();
  if (error || !order) return <main className="mx-auto max-w-2xl px-5 py-12">
    <Link href="/account/orders" className="text-sm underline">Back to your orders</Link>
    <h1 className="mt-6 text-3xl font-semibold">Your order</h1>
    <DismissibleNotice tone="error" className="mt-6">Unable to load your order. Please try again later.</DismissibleNotice>
  </main>;
  return <main className="mx-auto w-full max-w-2xl px-5 py-12">
    <Link href="/account/orders" className="text-sm underline">Back to your orders</Link>
    <h1 className="mt-6 text-3xl font-semibold">Your order</h1>
    <p className="mt-3 text-sm text-amber-900">Sandbox order · Payment confirmed</p>
    <p className="mt-3 break-all text-sm text-gray-600">Order reference: {order.id}</p>
    <p className="mt-2 text-sm text-gray-600">Paid: {orderDate(order.paid_at)} (Kitchener time)</p>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">{order.delivery_method === "pickup" ? "Pickup" : "Delivery"} status</h2>
      <p className="mt-3">{customerOrderStatus(order.fulfilment_status)}</p>
      {order.fulfilment_updated_at && <p className="mt-2 text-sm text-gray-600">Updated: {orderDate(order.fulfilment_updated_at)} (Kitchener time)</p>}
      {order.delivery_method === "pickup" && order.fulfilment_status !== "picked_up" && <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm">
        <p>{pickupLocation.line1}, {pickupLocation.city}, {pickupLocation.state} {pickupLocation.postal_code}</p>
        <p className="mt-2">{pickupInstructions}</p>
      </div>}
    </section>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">Items</h2>
      <ul className="mt-4 space-y-3">{order.items.map(line => <li key={`${line.id}:${line.size}`} className="flex justify-between gap-4">
        <span>{line.name}{line.size ? ` (${line.size})` : ""} × {line.quantity}</span><span className="shrink-0">{orderMoney(line.unit_cents * line.quantity)}</span>
      </li>)}</ul>
      <div className="mt-5 space-y-2 text-sm"><p>Items: {orderMoney(order.subtotal_cents)}</p>
        <p>{order.delivery_method === "pickup" ? "Pickup: Free" : `Shipping: ${orderMoney(order.shipping_cents)}`}</p>
        <p>Tax: {orderMoney(order.tax_cents)}</p><p className="text-lg font-semibold">Total: {orderMoney(order.total_cents)} CAD</p></div>
    </section>
  </main>;
}
