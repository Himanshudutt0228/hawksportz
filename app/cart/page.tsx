"use client";

import Link from "next/link";
import { useEffect, useReducer, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { itemKey, remainingStock } from "@/lib/cart";
import DismissibleNotice from "@/components/DismissibleNotice";
import type { PendingCheckout } from "@/lib/cart-refresh";
import { safeStripeUrl } from "@/lib/checkout";
import type { CartItem } from "@/lib/cart";
import {quotePrintAreas} from "@/lib/print-pricing";

export default function CartPage() {
  const { items, ready, messages, dispatch } = useCart();
  const [attempt, retry] = useReducer((value: number) => value + 1, 0);
  const [status, setStatus] = useReducer((_: string, value: string) => value, "idle");
  const [pendingOrders, setPendingOrders] = useState<PendingCheckout[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const ids = JSON.stringify([...new Set(items.map((item) => item.id))].sort());
  // Notices describe corrections made during this visit, not permanent problems.
  useEffect(() => () => { dispatch({ type: "clear-messages" }); }, [dispatch]);
  useEffect(() => {
    if (!ready || busy) return;
    const controller = new AbortController();
    setStatus("checking");
    fetch("/api/cart/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: JSON.parse(ids) }), signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error("Product check failed");
      const data = await response.json();
      if (!controller.signal.aborted) {
        setPendingOrders(data.pendingOrders ?? []);
        dispatch({ type: "refresh", products: data.products, checkedIds: data.products.map((product: { id: string }) => product.id).concat(JSON.parse(ids)), pending: data.pendingOrders ?? [] });
        setStatus("checked");
      }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [ready, ids, attempt, dispatch, busy]);
  useEffect(() => {
    const onFocus = () => retry();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  async function checkoutAction(orderId: string, action: "resume" | "cancel") {
    const response = await fetch(`/api/checkout/${orderId}`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to update checkout. Please try again.");
    return result;
  }
  async function continueCheckout(orderId: string) {
    if (busy) return;
    setBusy(true); setActionError("");
    try {
      const result = await checkoutAction(orderId, "resume");
      if (!safeStripeUrl(result.url)) throw new Error("Invalid payment destination.");
      window.location.assign(result.url);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to continue checkout.");
      setBusy(false);
    }
  }
  async function removeItem(item: CartItem) {
    if (busy) return;
    const heldBy = pendingOrders.filter(order =>
      order.lines.some(line => line.id === item.id && line.size === item.size && line.customization?.designId === item.customization?.designId));
    if (heldBy.length && !window.confirm("Remove this item? Its unfinished checkout will close. Other items will stay in your cart.")) return;
    setBusy(true); setActionError("");
    try {
      for (const order of heldBy) await checkoutAction(order.id, "cancel");
      setPendingOrders(current => current.filter(order => !heldBy.some(held => held.id === order.id)));
      dispatch({ type: "remove", key: itemKey(item) });
      retry();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to remove this item. Your cart has been kept.");
      retry();
    } finally { setBusy(false); }
  }
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  return (
    <main className="mobile-content store-container py-12">
      <h1 className="text-4xl font-bold">Your cart</h1>
      {actionError && <DismissibleNotice tone="error" onDismiss={() => setActionError("")}>{actionError}</DismissibleNotice>}
      {messages.length > 0 && <section aria-label="Cart updates" className="mt-6">
        <DismissibleNotice resetKey={messages} onDismiss={() => dispatch({ type: "clear-messages" })}>
          <ul>{messages.map((message) => <li key={message}>{message}</li>)}</ul>
        </DismissibleNotice>
      </section>}
      {ready && (items.length > 0 || status === "error") && <div className="mt-4 text-sm text-gray-600">
        {status === "checking" ? <p role="status">Checking current prices and availability...</p>
          : status === "error" ? <DismissibleNotice tone="error" resetKey={attempt}>Could not verify your cart. Saved prices and availability may be outdated. <button type="button" onClick={() => retry()} className="underline">Try again</button></DismissibleNotice>
          : <button type="button" onClick={() => retry()} className="underline">Refresh prices and availability</button>}
      </div>}
      {!ready ? <p className="mt-6" role="status">Loading your cart...</p> : items.length === 0 ? (
        <div className="mt-6">
          <p className="text-gray-600">Your cart is empty.</p>
          <Link href="/product" className="mt-6 inline-block rounded bg-brand px-6 py-3 text-on-brand">Shop products</Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 divide-y divide-gray-200">
            {items.map((item) => {
              const key = itemKey(item);
              return (
                <li key={key} className="flex flex-wrap items-center justify-between gap-6 py-6">
                  <div>
                    <Link href={`/product/${item.slug}`} className="text-lg font-medium underline">{item.name}</Link>
                    {item.size && <p className="mt-1 text-sm text-gray-600">Size: {item.size}</p>}
                    {pendingOrders.some(order => order.lines.some(line => line.id === item.id && line.size === item.size && line.customization?.designId === item.customization?.designId)) &&
                      <p className="mt-2 text-sm text-amber-900">Payment incomplete. Continue checkout or remove this item.</p>}
                    {item.customization && <div className="mt-2 text-sm text-gray-600">
                      <p>Custom design · {item.customization.colour} · {item.customization.sides.join(" + ")}</p>
                      <p>Printing included: ${(item.customization.printSizes
                        ?quotePrintAreas({baseCents:0,pocketCents:250,largeCents:500},item.customization.sides,item.customization.printSizes,1)?.printing??0
                        :item.customization.printPricePerSide * item.customization.sides.length).toFixed(2)} per item</p>
                      {item.customization.printSizes&&<p className="mt-1 text-xs">{item.customization.sides.map(side=>`${side}: ${side==="left"||side==="right"?"small":item.customization!.printSizes![side]}`).join(" · ")}</p>}
                      <Link href={`/custom-apparel?design=${item.customization.designId}`} className="mt-1 inline-block underline">View saved design</Link>
                    </div>}
                    <p className="mt-2 text-gray-600">${item.price.toFixed(2)} each</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3" role="group" aria-label={`Quantity for ${item.name}${item.size ? `, ${item.size}` : ""}`}>
                      <button type="button" aria-label="Decrease quantity" disabled={busy || item.quantity <= 1 || pendingOrders.length > 0}
                        onClick={() => dispatch({ type: "quantity", key, quantity: item.quantity - 1 })}
                        className="rounded border px-3 py-2 disabled:opacity-40">−</button>
                      <span aria-live="polite">{item.quantity}</span>
                      <button type="button" aria-label="Increase quantity" disabled={busy || remainingStock(items, item, item.size) < 1 || pendingOrders.length > 0}
                        onClick={() => dispatch({ type: "quantity", key, quantity: item.quantity + 1 })}
                        className="rounded border px-3 py-2 disabled:opacity-40">+</button>
                    </div>
                    <p className="min-w-20 font-medium">${(Math.round(item.price * 100) * item.quantity / 100).toFixed(2)}</p>
                    <button type="button" disabled={busy || status !== "checked"} onClick={() => removeItem(item)}
                      aria-label={`Remove ${item.name}${item.size ? `, ${item.size}` : ""}`} className="text-sm underline">Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 border-t border-gray-200 pt-6 sm:text-right">
            <p className="text-xl font-semibold" aria-live="polite">Subtotal: ${(subtotalCents / 100).toFixed(2)}</p>
            <p className="mt-2 text-sm text-gray-600">Shipping and taxes are not included. Availability and prices will be confirmed at checkout.</p>
            {pendingOrders.length === 0 && <Link href="/checkout" className="mt-6 inline-block rounded bg-brand px-6 py-3 text-on-brand">Checkout</Link>}
            {pendingOrders.map((order, index) => <button key={order.id} type="button" disabled={busy || status !== "checked"}
              onClick={() => continueCheckout(order.id)} className="mt-6 block rounded bg-brand px-6 py-3 text-on-brand disabled:opacity-40 sm:ml-auto">
              {busy ? "Checking checkout..." : pendingOrders.length > 1 ? `Continue checkout ${index + 1}` : "Continue checkout"}
            </button>)}
            <Link href="/product" className="mt-4 block text-sm underline">Continue shopping</Link>
          </div>
        </>
      )}
    </main>
  );
}
