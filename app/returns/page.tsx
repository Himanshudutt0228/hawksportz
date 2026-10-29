import type { Metadata } from "next";
import { storeContactEmail } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Returns & Refunds | Hawk Sportz",
  description: "Contact Hawk Sportz about a return, refund or problem with an order.",
};

export default function ReturnsPage() {
  return <main className="mobile-content mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Returns &amp; refunds</h1>
    <p className="mt-6 rounded-lg bg-amber-50 p-5 leading-7 text-amber-950">
      Our return policy is being finalized. Checkout currently accepts test payments only.
      Return windows, item conditions, return shipping costs and custom-item terms
      have not yet been published. Please confirm the terms with us before placing a live order.
    </p>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Ask about your order</h2>
      <p className="mt-4 leading-7 text-gray-600">Email <a href={`mailto:${storeContactEmail}`} className="break-all underline">{storeContactEmail}</a> with your order reference, the item concerned and a description of the issue. For a damaged or incorrect item, include photos that show the problem.</p>
      <p className="mt-4 leading-7 text-gray-600">Ask us to confirm the next steps and return destination before sending an item. The pickup address is not an automatic return authorization.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Your consumer rights</h2>
      <p className="mt-4 leading-7 text-gray-600">Nothing on this page limits rights you may have under applicable consumer protection law.</p>
    </section>
  </main>;
}
