import type { Metadata } from "next";
import Link from "next/link";
import { pickupLocation, shippingCents } from "@/lib/checkout";
import { storeContactEmail } from "@/lib/store-contact";

export const metadata: Metadata = {
  title: "Shipping & Pickup | Hawk Sportz",
  description: "Canada-wide delivery for CAD $8.99 per order and free local pickup in Kitchener, Ontario. Find pickup hours and order update information.",
};

export default function ShippingPage() {
  return <main className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
    <h1 className="text-4xl font-semibold tracking-tight">Shipping &amp; pickup</h1>
    <p className="mt-5 leading-7 text-gray-600">Choose Canada-wide delivery or free local pickup at checkout. All amounts are in Canadian dollars.</p>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Canada-wide delivery</h2>
      <p className="mt-4 leading-7 text-gray-600">Delivery costs CAD ${(shippingCents / 100).toFixed(2)} per order, before any applicable tax.</p>
      <p className="mt-4 leading-7 text-gray-600">Enter your Canadian delivery address at checkout. Please check the address carefully before completing your order.</p>
      <p className="mt-4 leading-7 text-gray-600">For production or delivery timing, email us before ordering. We have not published a fixed processing or delivery timeframe.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Free local pickup</h2>
      <address className="mt-4 not-italic leading-7 text-gray-600">{pickupLocation.line1}<br />{pickupLocation.city}, Ontario {pickupLocation.postal_code}<br />Canada</address>
      <p className="mt-4 leading-7 text-gray-600">Pickup hours are 10 AM–8 PM daily, Kitchener local time.</p>
      <p className="mt-4 leading-7 text-gray-600">Wait for your ready-for-pickup email, then email us to arrange a time before arriving. Payment confirmation alone does not mean your order is ready to collect.</p>
    </section>
    <section className="mt-10 border-t border-gray-200 pt-6">
      <h2 className="text-2xl font-semibold">Order updates and questions</h2>
      <p className="mt-4 leading-7 text-gray-600">We send an email when your order is marked shipped or ready for pickup. If you bought while signed in, you can also check its status in <Link href="/account/orders" className="underline">Your orders</Link>.</p>
      <p className="mt-4 leading-7 text-gray-600">For an address correction, delivery question or pickup arrangement, email <a href={`mailto:${storeContactEmail}`} className="break-all underline">{storeContactEmail}</a> with your order reference. Changes depend on the current order status.</p>
    </section>
  </main>;
}
