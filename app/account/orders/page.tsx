import Link from "next/link";
import DismissibleNotice from "@/components/DismissibleNotice";
import { customerOrderStatus, requireCustomer, type CustomerOrder } from "@/lib/customer-orders";
import { orderDate, orderMoney } from "@/lib/admin-orders";

export const metadata = { title: "Your orders | Hawk Sportz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const supabase = await requireCustomer();
  const { page } = await searchParams;
  const currentPage = typeof page === "string" && /^(?:[1-9]\d{0,4}|100000)$/.test(page) ? Number(page) : 1;
  const { data, error } = await supabase.rpc("store_customer_orders", { p_page: currentPage });
  const orders = (error ? [] : data ?? []) as CustomerOrder[];
  return <main className="mobile-content mx-auto w-full max-w-3xl px-5 py-12">
    <Link href="/account" className="nav-button text-sm">Back to account</Link>
    <h1 className="mt-6 text-3xl font-semibold">Your orders</h1>
    <p className="mt-3 text-gray-600">Paid orders placed while signed in to this account. Guest purchases remain available through their original receipt.</p>
    <p className="mt-3 text-sm text-amber-900">Sandbox orders only. No real money was collected.</p>
    {error ? <DismissibleNotice tone="error" className="mt-6">Unable to load your orders. Please try again later.</DismissibleNotice>
      : orders.length ? <ul className="mt-8 divide-y divide-gray-200">{orders.slice(0, 25).map(order => <li key={order.id} className="py-5">
        <Link href={`/account/orders/${order.id}`} className="nav-button text-sm font-medium">Order {order.id.slice(0, 8)}</Link>
        <p className="mt-2 text-sm text-gray-600">{orderDate(order.paid_at)} (Kitchener time) · {order.delivery_method === "pickup" ? "Pickup" : "Delivery"}</p>
        <div className="mt-2 flex flex-wrap gap-5 text-sm"><span>{orderMoney(order.total_cents)} CAD</span><span>{customerOrderStatus(order.fulfilment_status)}</span></div>
      </li>)}</ul> : <p className="mt-8 text-gray-600">No paid orders on this page. <Link href="/product" className="nav-button text-sm">Shop products</Link></p>}
    {!error && <nav aria-label="Order pages" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
      {currentPage > 1 && <Link href={`/account/orders?page=${currentPage - 1}`} className="nav-button text-sm">Previous</Link>}
      <span>Page {currentPage}</span>
      {orders.length > 25 && currentPage < 100000 && <Link href={`/account/orders?page=${currentPage + 1}`} className="nav-button text-sm">Next</Link>}
    </nav>}
  </main>;
}
