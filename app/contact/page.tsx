import type { Metadata } from "next";
import Link from "next/link";
import { pickupLocation } from "@/lib/checkout";
import { storeContactEmail } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Contact & Pickup | Hawk Sportz",
  description: "Email Hawk Sportz about orders, custom apparel and privacy. Find pickup details and hours in Kitchener, Ontario.",
};

export default function ContactPage() {
  return <main className="store-container py-12 sm:py-16">
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-widest text-gray-500">Hawk Sportz</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Contact &amp; pickup</h1>
      <p className="mt-6 text-lg leading-8 text-gray-600">
        Collect your order locally in Kitchener, Ontario. Please wait until
        your order is ready and arrange a pickup time before visiting.
      </p>
    </div>
    <section className="mt-10 rounded-xl border border-gray-200 p-6 sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">Email us</h2>
      <p className="mt-4 leading-7 text-gray-600">For order questions, custom apparel enquiries, returns or privacy requests, email <a href={`mailto:${storeContactEmail}`} className="break-all underline">{storeContactEmail}</a>.</p>
      <p className="mt-3 leading-7 text-gray-600">If your message concerns an order, include its reference so we can find it.</p>
    </section>
    <div className="mt-12 grid gap-6 md:grid-cols-2">
      <section className="rounded-xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Pickup location</h2>
        <address className="mt-4 text-lg not-italic leading-8 text-gray-600">
          {pickupLocation.line1}<br />
          {pickupLocation.city}, Ontario {pickupLocation.postal_code}<br />
          Canada
        </address>
        <p className="mt-5 leading-7 text-gray-600">Local pickup is free.</p>
      </section>
      <section className="rounded-xl border border-gray-200 p-6 sm:p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Before you arrive</h2>
        <p className="mt-4 leading-7 text-gray-600">Pickup hours: 10 AM–8 PM daily, Kitchener local time.</p>
        <p className="mt-4 leading-7 text-gray-600">
          Wait for your ready-for-pickup email, then arrange a pickup time
          by email before arriving.
        </p>
        <p className="mt-4 leading-7 text-gray-600">Keep your order reference handy when arranging collection.</p>
      </section>
    </div>
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-2xl font-semibold tracking-tight">Check your order</h2>
      <p className="mt-4 max-w-2xl leading-7 text-gray-600">
        If you placed your order while signed in, you can view its status in
        your account. For a guest purchase, use the order confirmation page
        in the browser where you checked out.
      </p>
      <Link href="/account/orders" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 py-3 text-sm font-medium text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
        View your orders
      </Link>
    </section>
  </main>;
}
