import Image from "next/image";
import Link from "next/link";
import { loadSiteImages } from "@/lib/site-images-server";

export default async function Hero() {
  const image = (await loadSiteImages())["home-hero"];
  return <section className="store-container grid gap-8 bg-gray-50 py-8 md:grid-cols-2 md:items-center md:gap-12 lg:py-12">
    <div className="py-4 lg:py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Sportswear · Custom apparel · Equipment</p>
      <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">Ready for your game.<br />Made for your team.</h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-gray-600 lg:text-lg">Shop ready-made sportswear and equipment, or create custom apparel for your team, business or event.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/product" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-brand px-6 py-3.5 text-sm font-medium text-on-brand transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gray-900">Shop Ready-Made</Link>
        <Link href="/custom-apparel" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium hover:bg-gray-100">Customize Your Apparel</Link>
      </div>
      <p className="mt-7 text-xs font-medium uppercase tracking-wider text-gray-500">Canada-wide delivery · Free Kitchener pickup</p>
    </div>
    <div className="relative aspect-[5/4] min-w-0 overflow-hidden rounded-xl bg-stone-200">
      {image ? <Image src={image.url} alt={image.alt} fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" preload />
        : <div className="flex h-full flex-col justify-between bg-stone-200 p-8 sm:p-12" aria-hidden="true">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-600">Hawk Sportz / Custom & ready-made</span>
          <span className="text-5xl font-semibold leading-none tracking-tighter text-stone-700 sm:text-7xl xl:text-8xl">YOUR TEAM.<br />YOUR LOOK.</span>
          <span className="border-t border-stone-400/50 pt-5 text-xs font-medium uppercase tracking-widest text-stone-600">T-shirts / Hoodies / Jerseys / Equipment</span>
        </div>}
    </div>
  </section>;
}
