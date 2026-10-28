import Link from "next/link";

export default function Benefits() {
  return <section aria-labelledby="why-shop-with-us" className="store-container border-t border-gray-200 bg-gray-50 py-12 lg:py-16">
    <h2 id="why-shop-with-us" className="text-3xl font-semibold tracking-tight sm:text-4xl">Your order. Your way.</h2>
    <div className="mt-8 grid gap-8 md:grid-cols-3">
      <div className="border-t border-gray-300 pt-5"><p className="text-xs font-medium text-gray-500">01 / DELIVERY</p><h3 className="mt-3 text-xl font-semibold">Across Canada</h3><p className="mt-3 max-w-md text-sm leading-7 text-gray-600">Canada-wide shipping for CAD $8.99 per order, before any applicable tax.</p><Link href="/shipping" className="mt-4 inline-block text-sm underline underline-offset-4">Shipping details</Link></div>
      <div className="border-t border-gray-300 pt-5"><p className="text-xs font-medium text-gray-500">02 / PICKUP</p><h3 className="mt-3 text-xl font-semibold">Local to Kitchener</h3><p className="mt-3 max-w-md text-sm leading-7 text-gray-600">Choose free pickup. Wait until your order is ready, then arrange a time to collect it.</p><Link href="/contact" className="mt-4 inline-block text-sm underline underline-offset-4">Plan your pickup</Link></div>
      <div className="border-t border-gray-300 pt-5"><p className="text-xs font-medium text-gray-500">03 / CUSTOM APPAREL</p><h3 className="mt-3 text-xl font-semibold">Make it yours</h3><p className="mt-3 max-w-md text-sm leading-7 text-gray-600">Plan apparel for your team, business or event with your artwork and text.</p><Link href="/custom-apparel" className="mt-4 inline-block text-sm underline underline-offset-4">Explore the designer</Link></div>
    </div>
  </section>;
}
