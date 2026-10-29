import "server-only";
import { orderDatabase } from "./checkout-server";
import { orderEmailsConfigured } from "./order-email-server";

// Do not promise approval emails before the transactional approval migration
// and outbound email configuration are available.
export async function designApprovalEmailsReady(): Promise<boolean> {
  if (!orderEmailsConfigured()) return false;
  try {
    const { error } = await orderDatabase().from("store_order_designs").select("approved_at,approved_by").limit(0);
    return !error;
  } catch { return false; }
}
