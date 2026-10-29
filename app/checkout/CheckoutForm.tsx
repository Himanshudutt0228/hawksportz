"use client";

import { loadDesign } from "@/lib/design-storage";
import DesignProof from "@/components/designer/DesignProof";
import { type SavedDesign } from "@/lib/design";
import { itemKey } from "@/lib/cart";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import DismissibleNotice from "@/components/DismissibleNotice";
import { pickupInstructions, shippingCents, type DeliveryMethod } from "@/lib/checkout";

export default function CheckoutForm({ enabled, noTax, customEnabled, approvalEmailsReady=false }: { enabled: boolean; noTax: boolean; customEnabled: boolean; approvalEmailsReady?: boolean }) {
  const { items, ready } = useCart();
  const [method, setMethod] = useState<DeliveryMethod>("shipping");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [proofs, setProofs] = useState<SavedDesign[]>([]);
  const [proofKey, setProofKey] = useState("");
  const [proofError, setProofError] = useState("");
  const [approvedKey, setApprovedKey] = useState("");
  const customKey = JSON.stringify(items.filter(item => item.customization));
  useEffect(() => {
    let active = true;
    async function refreshProofs() {
      setApprovedKey("");
      setProofKey("");
      setProofError("");
      try {
        const customItems = JSON.parse(customKey) as typeof items;
        const designs = await Promise.all([...new Set(customItems.map(item => item.customization!.designId))].map(async id => {
          const design = await loadDesign(id);
          if (!design || !design.garmentProof || design.version !== 3 || !design.layers.length || customItems.some(item => item.customization!.designId === id && item.id !== design.productId)) throw new Error("A saved design is missing or does not match this cart. Reopen it in the designer before checkout.");
          return design;
        }));
        if (active) { setProofs(designs); setProofKey(customKey); }
      } catch { if (active) setProofError("Unable to load the design proof. Reopen and save your design with its garment previews before checkout."); }
    }
    void refreshProofs();
    window.addEventListener("focus", refreshProofs);
    return () => { active = false; window.removeEventListener("focus", refreshProofs); };
  }, [customKey]);
  const proofApproved = proofKey === customKey && approvedKey === customKey;
  useEffect(() => {
  const resetBusy = () => setBusy(false);

  window.addEventListener("pageshow", resetBusy);

  return () => {
    window.removeEventListener("pageshow", resetBusy);
  };
}, []);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  if (!ready) return <p className="mt-6" role="status">Loading your cart...</p>;
  if (!items.length) return <p className="mt-6">Your cart is empty. <Link href="/product" className="underline">Shop products</Link></p>;
  const hasCustom = items.some(item => item.customization);
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0);
  const delivery = method === "shipping" ? shippingCents : 0;
  return <form className="mt-8 space-y-6" onSubmit={async event => {
    event.preventDefault();
    if (busy || !enabled || (hasCustom && (!customEnabled || !proofApproved))) return;
    setBusy(true); setError("");
    try {
      const lines = items.map(item => ({ id: item.id, size: item.size, quantity: item.quantity, ...(item.customization ? { customization: { designId: item.customization.designId } } : {}) }));
      const designs = await Promise.all([...new Set(items.flatMap(item => item.customization ? [item.customization.designId] : []))].map(async id => {
        const design = await loadDesign(id);
        if (!design) throw new Error("A saved design is missing on this device. Reopen it in the designer before checkout.");
        return design;
      }));
      if (hasCustom && JSON.stringify(designs) !== JSON.stringify(proofs)) {
        setProofs(designs); setApprovedKey("");
        throw new Error("Your saved design changed. Review the updated proof and confirm it again.");
      }
      const fingerprint = JSON.stringify({ lines, designs, method });
      if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: lines, designs, method, requestId: request.current.id }) });
      const result = await response.json();
      if (!response.ok || typeof result.url !== "string") throw new Error(result.error || "Unable to start checkout. Please try again.");
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Invalid payment destination.");
      window.location.assign(result.url);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to start checkout. Please try again.");
      setBusy(false);
    }
  }}>
    {hasCustom && <section aria-label="Review your custom designs">
      <h2 className="text-xl font-semibold">Review your custom designs</h2>
      <p className="mt-2 text-sm">Check every printed side, spelling, colour, sizes, quantities and comments. These saved designs will be sent with your order.</p>
      {proofError ? <p role="alert" className="mt-3 text-red-700">{proofError}</p> : proofKey !== customKey ? <p role="status">Loading design proofs...</p> : proofs.map(design => <div key={design.id}>
        <DesignProof approvalEmailsReady={approvalEmailsReady} design={design} lines={items.filter(item => item.customization?.designId === design.id)} />
        <Link href={`/custom-apparel?design=${encodeURIComponent(design.id)}`} className="text-sm underline">Edit this design</Link>
      </div>)}
      <label className="mt-5 flex items-start gap-3 text-sm"><input type="checkbox" disabled={busy || proofKey !== customKey} checked={proofApproved} onChange={event => setApprovedKey(event.target.checked ? customKey : "")} />I have checked all design proofs, spelling, colour, sizes, quantities and comments.</label>
    </section>}
    <fieldset disabled={busy} className="space-y-4">
      <legend className="mb-3 text-xl font-medium">Delivery or pickup</legend>
      <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4"><input type="radio" name="method" checked={method === "shipping"} onChange={() => setMethod("shipping")} />Canada-wide shipping — CA$8.99</label>
      <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-4"><input type="radio" name="method" checked={method === "pickup"} onChange={() => setMethod("pickup")} />Local pickup — Free</label>
      {method === "pickup" && <div className="rounded-lg bg-gray-50 p-4 text-sm"><p>222 Bankside Drive, Kitchener, ON N2N 3E5</p><p className="mt-2">{pickupInstructions}</p></div>}
    </fieldset>
    <ul className="space-y-2 text-sm">{items.map(item => <li key={itemKey(item)} className="flex flex-wrap justify-between gap-x-4 gap-y-2"><span>{item.name}{item.customization ? " (Custom design)" : ""}{item.size ? ` (${item.size})` : ""} × {item.quantity}</span><span>CA${(Math.round(item.price * 100) * item.quantity / 100).toFixed(2)}</span>{item.customization?.additionalComments && <span className="basis-full text-xs text-gray-600">Design comments: {item.customization.additionalComments}</span>}</li>)}</ul>
    <div className="border-t border-gray-200 pt-4"><p>Items: CA${(subtotal / 100).toFixed(2)}</p><p className="mt-1">{method === "shipping" ? `Shipping: CA$${(delivery / 100).toFixed(2)}` : "Pickup: Free"}</p><p className="mt-2 font-medium">Before tax: CA${((subtotal + delivery) / 100).toFixed(2)}</p>
      <p className="mt-2 text-sm text-gray-600">{noTax ? "No tax is collected in this sandbox test. " : "Applicable taxes are confirmed on the payment page. "}Current prices and size availability are checked before payment. You can pay as a guest.</p></div>
    {!enabled && <p className="text-sm text-amber-900">Sandbox payment setup is still being completed. Checkout is not available yet.</p>}
    {hasCustom && !customEnabled && <p className="text-sm text-amber-900">Custom test checkout is waiting for database setup. Your designs are still saved on this device.</p>}
    {hasCustom && customEnabled && <p className="text-sm text-amber-900">Your custom designs will be saved privately with this test order. This test does not submit artwork for production.</p>}
    {error && <DismissibleNotice tone="error" onDismiss={() => setError("")}>{error}</DismissibleNotice>}
    <button type="submit" disabled={!enabled || (hasCustom && (!customEnabled || !proofApproved)) || busy} className="w-full rounded-lg bg-brand px-6 py-3 font-medium text-on-brand sm:w-auto disabled:opacity-40">{busy ? "Opening payment page..." : "Continue to test payment"}</button>
    <p className="text-sm text-gray-600">Already have an account? <Link href="/sign-in" className="underline">Sign in</Link> or continue as a guest.</p>
  </form>;
}
