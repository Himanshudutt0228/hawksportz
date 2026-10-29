import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { fulfilmentLabels, isFulfilmentStatus, orderContact, orderDate, orderMoney, validOrderId } from "@/lib/admin-orders";
import DismissibleNotice from "@/components/DismissibleNotice";
import FulfilmentForm from "./FulfilmentForm";
import { orderEmailsConfigured } from "@/lib/order-email-server";

export const metadata = { title: "Manage order | Hawk Sportz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!validOrderId(id)) notFound();
  const { data: order, error } = await supabase.from("store_orders")
    .select("id,status,paid_at,delivery_method,items,subtotal_cents,shipping_cents,tax_cents,total_cents,customer_details,fulfilment_status,fulfilment_updated_at")
    .eq("id", id).eq("status", "paid").maybeSingle();
  if (!error && !order) notFound();
  if (error || !order) return <main className="mobile-content mx-auto max-w-2xl px-5 py-12">
    <Link href="/admin/orders" className="text-sm underline">Back to orders</Link>
    <h1 className="mt-6 text-3xl font-semibold">Manage order</h1>
    <DismissibleNotice tone="error" className="mt-6">Unable to load this order. Check order management setup and try again.</DismissibleNotice>
  </main>;
  const customer = orderContact(order.customer_details);
  const emails = await supabase.rpc("store_admin_email_status", { p_order_id: id });
  const items = order.items as { id: string; name: string; size: string | null; quantity: number; unit_cents: number; customization?: { designId: string; additionalComments?: string } }[];
  return <main className="mobile-content mx-auto w-full max-w-2xl px-5 py-12">
    <Link href="/admin/orders" className="text-sm underline">Back to orders</Link>
    <h1 className="mt-6 text-3xl font-semibold">Manage order</h1>
    <p className="mt-3 text-sm text-amber-900">Sandbox order · Payment confirmed</p>
    <p className="mt-3 break-all text-sm text-gray-600">Order reference: {order.id}</p>
    <p className="mt-2 text-sm text-gray-600">Paid: {orderDate(order.paid_at)} (Kitchener time)</p>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">Items</h2>
      {items.some(line => line.customization) && <a href={`/api/admin/orders/${id}/designs`} className="mt-3 inline-block text-sm underline">Download test design snapshots (JSON)</a>}
      {items.some(line => line.customization) && <Link href={`/admin/orders/${id}/production`} className="mt-3 block text-sm underline">View custom designs and production sheet</Link>}
      <ul className="mt-4 space-y-3">{items.map(line => <li key={`${line.id}:${line.size}:${line.customization?.designId ?? "ready"}`} className="flex justify-between gap-4">
        <span>{line.name}{line.customization ? " (Custom design)" : ""}{line.size ? ` (${line.size})` : ""} × {line.quantity}</span><span>{orderMoney(line.unit_cents * line.quantity)}</span>{line.customization?.additionalComments && <p className="basis-full whitespace-pre-wrap text-sm">Comments: {line.customization.additionalComments}</p>}
      </li>)}</ul>
      <div className="mt-5 space-y-2 text-sm"><p>Items: {orderMoney(order.subtotal_cents)}</p>
        <p>{order.delivery_method === "pickup" ? "Pickup: Free" : `Shipping: ${orderMoney(order.shipping_cents)}`}</p>
        <p>Tax: {orderMoney(order.tax_cents)}</p><p className="text-lg font-semibold">Total: {orderMoney(order.total_cents)}</p></div>
    </section>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">Customer</h2>
      <div className="mt-4 space-y-2 break-words text-sm"><p>{customer.name || "Name not provided"}</p>
        <p>{customer.email || "Email not provided"}</p>{customer.phone && <p>{customer.phone}</p>}
        {typeof (order.customer_details as { comments?: unknown } | null)?.comments === "string" &&
          <p className="whitespace-pre-wrap"><span className="font-medium">Additional comments: </span>
            {(order.customer_details as { comments: string }).comments}</p>}</div>
      {order.delivery_method === "shipping" && <div className="mt-5">
        <h3 className="font-medium">Delivery address</h3>
        <div className="mt-2 space-y-1 break-words text-sm">{customer.recipient && <p>{customer.recipient}</p>}
          {customer.address.length ? customer.address.map((line, index) => <p key={index}>{line}</p>) : <p>Delivery address unavailable. Review the payment before shipping.</p>}</div>
      </div>}
    </section>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">{order.delivery_method === "pickup" ? "Pickup" : "Delivery"} status</h2>
      <p className="mt-3">{isFulfilmentStatus(order.fulfilment_status) ? fulfilmentLabels[order.fulfilment_status] : "Status unavailable"}</p>
      {order.fulfilment_updated_at && <p className="mt-2 text-sm text-gray-600">Updated: {orderDate(order.fulfilment_updated_at)}</p>}
      <p className="mt-3 text-sm text-gray-600">When enabled, ready-for-pickup and shipped updates automatically email the customer. Pickup times still need to be arranged separately.</p>
      {isFulfilmentStatus(order.fulfilment_status) && <FulfilmentForm id={order.id} method={order.delivery_method} status={order.fulfilment_status} />}
    </section>
    <section className="mt-8 border-t border-gray-200 pt-6">
      <h2 className="text-xl font-semibold">Customer emails</h2>
      {!orderEmailsConfigured() && <p className="mt-2 text-sm text-amber-900">Automatic emails are disabled. Contact customers separately until email setup is complete.</p>}
      <p className="mt-2 text-sm text-gray-600">Accepted means the email provider received the message, not that it reached the inbox. Check Resend for delivery or bounce details.</p>
      {emails.error ? <p className="mt-3 text-sm">Email status unavailable. Check email setup before relying on automatic notifications.</p>
        : !emails.data?.length ? <p className="mt-3 text-sm">No automatic emails recorded for this order.</p>
        : <ul className="mt-3 space-y-2 text-sm">{emails.data.map((email: { kind: string; state: string }) => <li key={email.kind}>
          {email.kind === "design_approved" ? "Design approval" : email.kind === "payment_confirmed" ? "Payment confirmation" : email.kind === "ready_for_pickup" ? "Ready for pickup" : "Shipped"}: {email.state === "accepted" ? "Accepted for sending" : email.state === "review" ? "Needs attention — contact customer manually after checking Resend" : "Queued — awaiting sending or retry"}
        </li>)}</ul>}
    </section>
  </main>;
}
