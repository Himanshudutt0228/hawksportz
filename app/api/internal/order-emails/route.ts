import { emailWorkerAuthorized, orderEmailsConfigured, sendOrderEmails } from "@/lib/order-email-server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  if (!emailWorkerAuthorized(request.headers.get("authorization"))) return new Response("Unauthorized", { status: 401, headers });
  if (!orderEmailsConfigured()) return new Response("Email sending is disabled", { status: 503, headers });
  try { return Response.json(await sendOrderEmails(), { headers }); }
  catch { return new Response("Email worker unavailable", { status: 503, headers }); }
}
