"use client";

import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";
import type { CheckoutLine } from "@/lib/checkout";

export default function PaidCartUpdate({ orderId, lines }: { orderId: string; lines: CheckoutLine[] }) {
  const { ready, dispatch } = useCart();
  useEffect(() => {
    if (!ready) return;
    try {
      const key = `hawk-paid-order:${orderId}`;
      if (localStorage.getItem(key)) return;
      // Mark first: when storage is unavailable, leave the cart intact rather
      // than removing additional purchases again on each receipt visit.
      localStorage.setItem(key, "processed");
      dispatch({ type: "purchase-complete", lines });
    } catch { /* The customer can still manage their cart manually. */ }
  }, [ready, dispatch, orderId, lines]);
  return null;
}
