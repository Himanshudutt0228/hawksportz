"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { orderEmailsConfigured, sendOrderEmails } from "@/lib/order-email-server";
import { validOrderId } from "@/lib/admin-orders";

export async function checkDesign(id: string, _: { error?: string; message?: string }, form: FormData): Promise<{ error?: string; message?: string }> {
  const { supabase } = await requireAdmin();
  if (!validOrderId(id) || form.get("checked") !== "yes") return { error: "Review all designs and confirm the checkbox." };
  try {
    const { error } = await supabase.rpc("store_admin_check_design", { p_order_id: id });
    if (error) return { error: "Unable to record review. Check production review setup and your access, then refresh." };
  } catch { return { error: "Unable to record review. Please try again." }; }
  revalidatePath(`/admin/orders/${id}/production`);
  return { message: "Design review recorded. This sandbox order is not approved for production." };
}

export async function approveDesign(id: string, _: { error?: string; message?: string }, form: FormData): Promise<{ error?: string; message?: string }> {
  const { supabase } = await requireAdmin();
  if (!validOrderId(id) || form.get("approve") !== "yes") return { error: "Confirm that the designs are approved and any questions have been resolved." };
  try {
    const { error } = await supabase.rpc("store_admin_approve_design", { p_order_id: id });
    if (error) return { error: "Unable to approve. Review the design first, check approval setup and your access, then refresh." };
  } catch { return { error: "Unable to save approval. Please try again." }; }
  revalidatePath(`/admin/orders/${id}/production`);
  revalidatePath(`/admin/orders/${id}`);
  try { await sendOrderEmails(id); } catch { /* Approval and queued email remain committed for worker retry. */ }
  return { message: orderEmailsConfigured()
    ? "Approval saved. Check customer email status on the order; queued messages will be retried. This remains a sandbox test."
    : "Approval saved. The email is queued but sending is disabled. Contact the customer separately until email setup is complete." };
}
