"use client";

import { useActionState } from "react";
import { deleteProduct } from "./delete-actions";
import type { ProductEditState } from "@/lib/admin-product";
import DismissibleNotice from "@/components/DismissibleNotice";

export default function DeleteProductForm({ id, name }: { id: string; name: string }) {
  const [state, action, pending] = useActionState<ProductEditState, FormData>(deleteProduct.bind(null, id), {});
  return <section className="mt-12 rounded-lg border border-red-200 p-5">
    <h2 className="text-xl font-semibold">Delete product</h2>
    <p id="delete-help" className="mt-3 text-sm text-gray-600">Permanently remove this product from your store and apparel designer. This cannot be undone.</p>
    <form action={action} className="mt-5" onSubmit={event => {
      if (!window.confirm(`Delete “${name}”? This permanently removes the product and cannot be undone.`)) event.preventDefault();
    }}>
      <input type="hidden" name="confirmDelete" value="delete" />
      <button type="submit" disabled={pending} aria-describedby="delete-help" className="rounded-lg bg-red-700 px-5 py-3 font-medium text-white disabled:opacity-60">
        {pending ? "Deleting..." : "Delete product"}
      </button>
      {state.error && <DismissibleNotice tone="error" resetKey={state} className="mt-4">{state.error}</DismissibleNotice>}
    </form>
  </section>;
}
