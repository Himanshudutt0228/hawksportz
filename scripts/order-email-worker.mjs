// Run locally with: node --env-file=.env.local scripts/order-email-worker.mjs
// Production: schedule the authenticated POST every minute from a trusted worker.
const origin = process.env.ORDER_EMAIL_WORKER_URL || "http://localhost:3000";
const secret = process.env.ORDER_EMAIL_WORKER_SECRET;
const url = new URL("/api/internal/order-emails", origin);
if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
  throw new Error("Email worker needs HTTPS or localhost");
}
if (!secret || secret.length < 32) throw new Error("Set ORDER_EMAIL_WORKER_SECRET (32+ characters)");
async function run() {
  try {
    const response = await fetch(url, { method: "POST", redirect: "error", signal: AbortSignal.timeout(45000),
      headers: { Authorization: `Bearer ${secret}` } });
    console.log(response.ok ? "Email queue checked." : `Email worker returned ${response.status}.`);
  } catch { console.log("Email worker unavailable; retrying next minute."); }
}
await run();
setInterval(run, 60000);
