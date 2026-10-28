"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function CartLink() {
  const { items, ready } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  return <Link href="/cart" className="hover:underline">Cart{ready ? ` (${count})` : ""}</Link>;
}
