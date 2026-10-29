import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validOrderId, orderDate } from "@/lib/admin-orders";
import { parseDesign } from "@/lib/design";
import DesignProof from "@/components/designer/DesignProof";
import ProductionControls from "./ProductionControls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Production sheet | Hawk Sportz", robots: { index: false, follow: false } };

export default async function ProductionPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  if (!validOrderId(id)) notFound();
  const { data: order, error: orderError } = await supabase.from("store_orders").select("id,items").eq("id", id).eq("status", "paid").maybeSingle();
  if (!orderError && !order) notFound();
  if (orderError || !order) return <main className="mobile-content p-8">Unable to load the paid order. Please try again.</main>;
  const { data, error } = await supabase.from("store_order_designs").select("designs").eq("order_id", id).maybeSingle();
  if (error || !data) return <main className="mobile-content p-8">Design snapshots unavailable. Check custom checkout setup before printing.</main>;
  const lines = order.items as { id: string; name: string; size: string | null; quantity: number; customization?: { designId: string } }[];
  const designIds = [...new Set(lines.flatMap(line => line.customization ? [line.customization.designId] : []))];
  if (!designIds.length) notFound();
  const designs = designIds.map(designId => parseDesign(data.designs?.[designId]));
  const valid = designs.every((design, index) => design && design.version === 3 && design.layers.length > 0 && design.id === designIds[index] && lines.filter(line => line.customization?.designId === design.id).every(line => String(line.id) === design.productId));
  const review = await supabase.from("store_order_designs").select("reviewed_at").eq("order_id", id).maybeSingle();
  const approval = await supabase.from("store_order_designs").select("approved_at").eq("order_id", id).maybeSingle();
  return <main className="mobile-content mx-auto max-w-5xl px-5 py-10 print:max-w-none print:p-0">
    <Link href={`/admin/orders/${id}`} className="text-sm underline print:hidden">Back to order</Link>
    <h1 className="mt-5 text-3xl font-semibold">Custom order production sheet</h1>
    <p className="mt-3 break-all text-sm">Order: {id}</p>
    <p className="mt-2 font-medium text-amber-900">SANDBOX TEST - not approved for production fulfilment.</p>
    <p className="mt-2 text-sm">Review all sides and customer comments. Contact the customer before printing if anything is unclear. This sheet records the saved checkout artwork; it is not a later customer-approved production proof.</p>
    {!valid ? <p role="alert" className="mt-6 text-red-700">A design snapshot is invalid or missing. Do not print; investigate this order.</p> : <>
      {designs.map(design => design && <DesignProof key={design.id} design={design} lines={lines.filter(line => line.customization?.designId === design.id)} downloads ownerView />)}
      <a href={`/api/admin/orders/${id}/designs`} className="underline print:hidden">Download editable design snapshots (JSON)</a>
      {review.data?.reviewed_at && <p className="mt-4">Design checked: {orderDate(review.data.reviewed_at)}</p>}
      {approval.data?.approved_at && <p className="mt-3">Design approved: {orderDate(approval.data.approved_at)}</p>}
      <ProductionControls approvalReady={!approval.error} approved={!!approval.data?.approved_at} id={id} checked={!!review.data?.reviewed_at} reviewReady={!review.error} />
    </>}
  </main>;
}
