import "server-only";
import { timingSafeEqual } from "node:crypto";
import { orderDatabase } from "./checkout-server";
import { orderEmailContent, type EmailSnapshot } from "./order-email-content";

export function orderEmailsConfigured() {
  return process.env.ORDER_EMAILS_ENABLED === "true" && !!process.env.RESEND_API_KEY?.startsWith("re_")
    && process.env.ORDER_EMAIL_FROM === "accounts@hawksportz.ca";
}

export function emailWorkerAuthorized(header: string | null) {
  const secret = process.env.ORDER_EMAIL_WORKER_SECRET;
  if (!secret || secret.length < 32 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const supplied = Buffer.from(header);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

// Bounded work: scheduled worker handles retries independently of browser activity.
export async function sendOrderEmails(orderId?: string, limit = 3) {
  if (!orderEmailsConfigured()) return { configured: false, accepted: 0 };
  const db = orderDatabase();
  let accepted = 0;
  for (let count = 0; count < Math.min(limit, 3); count++) {
    const claim = await db.rpc("store_email_claim", { p_order_id: orderId ?? null });
    if (claim.error) throw new Error("Email queue unavailable");
    const job = claim.data?.[0];
    if (!job) break;
    let review = false;
    let providerId: string | null = null;
    try {
      let body = job.request_body;
      if (!body) {
        try {
          body = { from: `Hawk Sportz <${process.env.ORDER_EMAIL_FROM}>`, ...orderEmailContent(job.snapshot as EmailSnapshot) };
        } catch {
          review = true;
        }
        if (!review) {
          const prepared = await db.rpc("store_email_prepare", { p_id: job.id, p_token: job.lease_token, p_body: body });
          if (prepared.error || !prepared.data) throw new Error("Email preparation failed");
          body = prepared.data;
        }
      }
      if (!review) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST", cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000),
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json",
            "Idempotency-Key": `order-email/${job.id}` },
          body: JSON.stringify(body),
        });
        if (response.ok) {
          const result = await response.json();
          if (typeof result.id !== "string" || !result.id) throw new Error("Missing email receipt");
          providerId = result.id;
        } else {
          // Authentication/payload failures require operator review. Network/limits retry.
          review = response.status >= 400 && response.status < 500 && ![408, 409, 429].includes(response.status);
        }
      }
    } catch {
      // An ambiguous timeout retries the exact frozen request with the same key.
      // Never log provider responses, addresses, bodies or credentials.
    }
    const finished = await db.rpc("store_email_finish", { p_id: job.id, p_token: job.lease_token,
      p_provider_id: providerId, p_review: review });
    if (finished.error) throw new Error("Email acknowledgement failed");
    if (providerId) accepted++;
  }
  return { configured: true, accepted };
}
