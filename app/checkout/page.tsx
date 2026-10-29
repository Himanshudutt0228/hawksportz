import { designApprovalEmailsReady } from "@/lib/design-approval-server";
import Link from "next/link";
import { sandboxCheckoutReady, sandboxTaxMode, orderDatabase } from "@/lib/checkout-server";
import CheckoutForm from "./CheckoutForm";

export const metadata = { title: "Checkout | Hawk Sportz", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  let customEnabled = false;
  if (sandboxCheckoutReady()) {
    try {
      const { error } = await orderDatabase().from("store_order_designs").select("order_id").limit(0);
      customEnabled = !error;
    } catch { /* Keep custom checkout unavailable until its private storage exists. */ }
  }
  return <main className="mobile-content mx-auto w-full max-w-2xl px-5 py-12">
    <Link href="/cart" className="text-sm underline">Back to cart</Link>
    <h1 className="mt-6 text-3xl font-semibold">Checkout</h1>
    <p className="mt-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Sandbox checkout: test payments only. No real money moves.</p>
    <CheckoutForm approvalEmailsReady={await designApprovalEmailsReady()} customEnabled={customEnabled} enabled={sandboxCheckoutReady()} noTax={sandboxTaxMode() === "sandbox_no_tax"} />
  </main>;
}
