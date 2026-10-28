import "server-only";
import { createHash, randomBytes } from "node:crypto";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function sandboxCheckoutReady(): boolean {
  return process.env.CHECKOUT_SANDBOX_ENABLED === "true" && sandboxTaxMode() !== null &&
    !!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && !!process.env.SUPABASE_SECRET_KEY?.startsWith("sb_secret_") &&
    !!process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_");
}

export function sandboxTaxMode(): "automatic" | "sandbox_no_tax" | null {
  if (process.env.CHECKOUT_TAX_MODE === "sandbox_no_tax") return "sandbox_no_tax";
  if (process.env.CHECKOUT_TAX_MODE === "automatic" && process.env.STRIPE_TAX_READY === "true") return "automatic";
  return null;
}

export function checkoutStripe() {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("Sandbox key required");
  return new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 15000 });
}

// Deliberately separate from normal auth/admin clients. Never export to client code.
export function orderDatabase() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith("sb_secret_")) throw new Error("Order server key missing");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function guestOrderHash(create = false): Promise<string | null> {
  const jar = await cookies();
  let token = jar.get("hawk-order-access")?.value;
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    if (!create) return null;
    token = randomBytes(32).toString("hex");
    jar.set("hawk-order-access", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return createHash("sha256").update(token).digest("hex");
}
