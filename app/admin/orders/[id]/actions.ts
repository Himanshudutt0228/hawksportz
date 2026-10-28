"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { validOrderId, isFulfilmentStatus, type FulfilmentState } from "@/lib/admin-orders";
import { orderEmailsConfigured, sendOrderEmails } from "@/lib/order-email-server";

export async function fulfilOrder(id: string, expectedStatus: string, _: FulfilmentState, form: FormData): Promise<FulfilmentState> {
  const { supabase } = await requireAdmin();
  const nextStatus = form.get("next_status");
  if (!validOrderId(id) || !isFulfilmentStatus(expectedStatus) || !isFulfilmentStatus(nextStatus)) {
    return { error: "Invalid order update. Refresh this page and try again." };
  }
  try {
    // Uses the signed-in admin's RLS client, never a service-role key.
    // Database locks/rechecks payment, membership, method and expected status.
    const { error } = await supabase.rpc("store_admin_fulfil_order", {
      p_order_id: id, p_expected_status: expectedStatus, p_next_status: nextStatus,
    });
    if (error) return { error: "Order was not updated. Refresh the page to check its status and your access." };
  } catch { return { error: "Unable to save right now. Please try again shortly." }; }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  if (nextStatus === "picked_up") return { message: "Order status saved." };
  try {
    const result = await sendOrderEmails(id);
    if (result.accepted) return { message: "Order status saved. Email accepted for sending; inbox delivery is not yet confirmed." };
  } catch { /* The committed status and queued email remain intact. */ }
  return { message: orderEmailsConfigured()
    ? "Order status saved. Check customer email status below; queued messages will be retried."
    : "Order status saved. Automatic emails are disabled; contact the customer separately." };
}
