"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CartLink() {
  const { items, ready } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <Link href="/cart" aria-label={`Cart${ready ? ` (${count})` : ""}`} className="header-action relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-gray-200 px-2 md:border-white/25 md:bg-white/5 md:px-3">
    <svg className="shrink-0" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 3h3l3 13h12l2-9H6" /><circle cx="9" cy="21" r="1" /><circle cx="19" cy="21" r="1" /></svg>
    <span className="hidden md:inline">Cart</span>
    {ready && <span aria-hidden="true" className="absolute -top-0.5 right-0 rounded-full bg-brand px-1.5 text-[10px] leading-4 text-on-brand">{count}</span>}
  </Link>;
}
