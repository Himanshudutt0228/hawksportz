import { requireAdmin } from "@/lib/auth/admin";
import { validOrderId } from "@/lib/admin-orders";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireAdmin();
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  if (!validOrderId(id)) return new Response(null, { status: 404, headers });
  const { data: order, error: orderError } = await supabase.from("store_orders")
    .select("status").eq("id", id).maybeSingle();
  if (orderError) return Response.json({ error: "Unable to verify paid order." }, { status: 503, headers });
  if (order?.status !== "paid") return new Response(null, { status: 404, headers });
  const { data, error } = await supabase.from("store_order_designs").select("designs").eq("order_id", id).maybeSingle();
  if (error) return Response.json({ error: "Unable to load test designs." }, { status: 503, headers });
  if (!data) return new Response(null, { status: 404, headers });
  return Response.json(data.designs, { headers: { ...headers, "Content-Disposition": `attachment; filename="test-designs-${id}.json"` } });
}
