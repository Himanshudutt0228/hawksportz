import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import { isFulfilmentStatus, fulfilmentLabels } from "@/lib/admin-orders";

export type CustomerOrder = {
  id: string; paid_at: string; delivery_method: "pickup" | "shipping";
  items: { id: string; name: string; size: string | null; quantity: number; unit_cents: number }[];
  subtotal_cents: number; shipping_cents: number; tax_cents: number; total_cents: number;
  fulfilment_status: string; fulfilment_updated_at: string | null;
};

export async function requireCustomer() {
  const supabase = await createAuthClient(true);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) redirect("/sign-in");
  return supabase;
}

export function customerOrderStatus(status: string) {
  if (status === "unfulfilled") return "Preparing your order";
  return isFulfilmentStatus(status) ? fulfilmentLabels[status] : "Status unavailable";
}
