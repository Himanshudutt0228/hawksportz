import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { loadSiteImages } from "@/lib/site-images-server";

export const metadata: Metadata = {
  title: "About | Hawk Sportz",
  description: "Get to know Hawk Sportz: ready-made sportswear and custom apparel, with Canada-wide delivery and local pickup in Kitchener, Ontario.",
};

export default async function AboutPage() {
  const image = (await loadSiteImages()).about;
  return <main className="mobile-content store-container py-12 sm:py-16">
    <div className="max-w-3xl">
      <p className="text-sm font-medium uppercase tracking-widest text-gray-500">About Hawk Sportz</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Sportswear and apparel. Made yours.</h1>
      <p className="mt-4 text-base leading-7 text-gray-600 sm:mt-6 sm:text-lg sm:leading-8">
        Hawk Sportz brings together ready-made sportswear and custom apparel for
        teams, businesses and events. Browse our collections or start planning
        a design of your own.
      </p>
    </div>

    {image && <div className="relative mt-6 aspect-[4/3] w-full min-w-0 overflow-hidden rounded-xl bg-gray-50 sm:mt-10 sm:aspect-[3/1]"><Image src={image.url} alt={image.alt} fill sizes="100vw" className="object-contain sm:object-cover" /></div>}

    <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-2">
      <section className="min-w-0 rounded-xl border border-gray-200 p-5 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Shop ready-made</h2>
        <p className="mt-4 leading-7 text-gray-600">
          Explore T-shirts, hoodies, jerseys and sports equipment.
          Product pages show the available sizes, prices and stock so you
          can choose what works for you.
        </p>
        <Link href="/product" className="mt-5 inline-flex min-h-11 w-full items-center justify-center sm:mt-6 sm:w-auto rounded-lg bg-brand px-5 py-3 text-sm font-medium text-on-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
          Browse collections
        </Link>
      </section>
      <section className="min-w-0 rounded-xl border border-gray-200 p-5 sm:p-8">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Create custom apparel</h2>
        <p className="mt-4 leading-7 text-gray-600">
          Our custom decoration services include DTF printing and embroidery.
          Use our apparel designer to explore a layout with your artwork
          and text, then choose sizes and quantities.
        </p>
        <Link href="/custom-apparel" className="mt-5 inline-flex min-h-11 w-full items-center justify-center sm:mt-6 sm:w-auto rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black">
          Explore the designer
        </Link>
      </section>
    </div>

    <section className="mt-8 border-t sm:mt-12 border-gray-200 pt-8">
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Across Canada. Local in Kitchener.</h2>
      <div className="mt-5 grid gap-6 text-gray-600 sm:grid-cols-2">
        <p className="max-w-xl leading-7">
          We offer Canada-wide delivery and free local pickup in Kitchener,
          Ontario. All store prices are in Canadian dollars.
        </p>
        <p className="max-w-xl leading-7">
          Collecting locally? Wait for your ready-for-pickup email and arrange
          a pickup time before arriving.
        </p>
      </div>
    </section>
  </main>;
}
