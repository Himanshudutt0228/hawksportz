import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { fulfilmentLabels, isFulfilmentStatus, orderDate, orderMoney } from "@/lib/admin-orders";
import DismissibleNotice from "@/components/DismissibleNotice";

export const metadata = { title: "Orders | Hawk Sportz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const { supabase } = await requireAdmin();
  const { page } = await searchParams;
  const currentPage = typeof page === "string" && /^[1-9]\d{0,5}$/.test(page) ? Number(page) : 1;
  const pageSize = 25;
  const start = (currentPage - 1) * pageSize;
  const { data, error } = await supabase.from("store_orders")
    .select("id,paid_at,delivery_method,total_cents,fulfilment_status").eq("status", "paid")
    .order("paid_at", { ascending: false }).order("id", { ascending: false }).range(start, start + pageSize);
  const orders = error ? [] : (data ?? []).slice(0, pageSize);
  return <main className="mobile-content mx-auto w-full max-w-5xl px-5 py-12">
    <Link href="/admin" className="text-sm underline">Back to dashboard</Link>
    <h1 className="mt-6 text-3xl font-semibold">Orders</h1>
    <p className="mt-3 text-sm text-amber-900">Sandbox orders only. No real money was collected.</p>
    <p className="mt-3 text-gray-600">Paid orders, newest first. Dates use Kitchener time.</p>
    {error ? <DismissibleNotice tone="error" className="mt-6">Unable to load orders. Order management setup may be incomplete; try again after setup.</DismissibleNotice>
      : orders.length ? <ul className="mt-8 divide-y divide-gray-200">{orders.map(order => <li key={order.id} className="py-5">
        <Link href={`/admin/orders/${order.id}`} className="font-medium underline">Order {order.id.slice(0, 8)}</Link>
        <p className="mt-2 text-sm text-gray-600">{orderDate(order.paid_at)} · {order.delivery_method === "pickup" ? "Pickup" : "Delivery"}</p>
        <div className="mt-2 flex flex-wrap gap-5 text-sm"><span>{orderMoney(order.total_cents)}</span>
          <span>{isFulfilmentStatus(order.fulfilment_status) ? fulfilmentLabels[order.fulfilment_status] : "Status unavailable"}</span></div>
      </li>)}</ul> : <p className="mt-8 text-gray-600">No paid orders on this page.</p>}
    {!error && <nav aria-label="Order pages" className="mt-6 flex gap-5 text-sm">
      {currentPage > 1 && <Link href={`/admin/orders?page=${currentPage - 1}`} className="underline">Previous</Link>}
      <span>Page {currentPage}</span>
      {(data?.length ?? 0) > pageSize && <Link href={`/admin/orders?page=${currentPage + 1}`} className="underline">Next</Link>}
    </nav>}
  </main>;
}
