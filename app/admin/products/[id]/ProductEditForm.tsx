"use client";

import { useActionState } from "react";
import { updateProduct } from "./actions";
import type { ProductEditState } from "@/lib/admin-product";
import ProductStockFields from "@/components/admin/ProductStockFields";
import DismissibleNotice from "@/components/DismissibleNotice";
import type { SizeStock } from "@/lib/product-stock";
import ProductStyleField from "@/components/admin/ProductStyleField";

export default function ProductEditForm({ product }: { product: {
  id: string; name: string; description: string; price: string; stock: string; sizes: string[]; sizeStock: SizeStock | null; category: string; garmentStyle?: string|null;
} }) {
  const [state, action, pending] = useActionState<ProductEditState, FormData>(updateProduct.bind(null, product.id), {});
  const fieldClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3";
  return <form action={action} className="mt-8 space-y-5">
    <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
      <div><label htmlFor="name" className="font-medium">Product name</label>
        <input id="name" name="name" required maxLength={200} defaultValue={product.name} className={fieldClass} /></div>
      <div><label htmlFor="description" className="font-medium">Description</label>
        <textarea id="description" name="description" rows={6} maxLength={10000} defaultValue={product.description} className={fieldClass} /></div>
      <div><label htmlFor="price" className="font-medium">Price (CAD)</label>
        <input id="price" name="price" type="number" min="0" max="9999999.99" step="0.01" required defaultValue={product.price} className={fieldClass} /></div>
      <ProductStockFields sizes={product.sizes} initial={product.sizeStock} sharedStock={product.stock} />
      <ProductStyleField category={product.category} value={product.garmentStyle} />
      <button type="submit" className="rounded-lg bg-black px-5 py-3 font-medium text-white">{pending ? "Saving..." : "Save product"}</button>
    </fieldset>
    {state.error && <DismissibleNotice tone="error" resetKey={state}>{state.error}</DismissibleNotice>}
    {state.message && <DismissibleNotice tone="success" resetKey={state}>{state.message}</DismissibleNotice>}
  </form>;
}
