import Link from "next/link";
import { storeContactEmail } from "@/lib/store-contact";

export default function Footer() {
  return (
    <footer className="border-t border-white/15 bg-ink text-white">
      <div className="store-container grid gap-6 pt-10 md:grid-cols-2">
        <div><p className="text-xl font-semibold tracking-tight">Hawk Sportz</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-300">Sportswear, equipment and custom apparel for your team, business or next event.</p></div>
        <div className="md:justify-self-end"><p className="text-sm font-medium">Let’s talk about your order</p>
          <a href={`mailto:${storeContactEmail}`} className="mt-2 inline-block break-all text-sm text-zinc-300 underline">{storeContactEmail}</a>
          <p className="mt-2 text-sm text-zinc-300">Canada-wide delivery · Kitchener pickup</p></div>
      </div>
      <nav
        aria-label="Footer navigation"
        className="store-container mt-8 flex flex-wrap items-center justify-start gap-x-8 gap-y-4 border-t border-white/15 py-6 text-sm text-zinc-300"
      >
        <Link href="/about" className="hover:underline focus-visible:underline">
          About
        </Link>

        <Link href="/contact" className="hover:underline focus-visible:underline">
          Contact
        </Link>

        <Link href="/shipping" className="hover:underline focus-visible:underline">
          Shipping
        </Link>

        <Link href="/returns" className="hover:underline focus-visible:underline">
          Returns
        </Link>

        <Link href="/privacy" className="hover:underline focus-visible:underline">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
