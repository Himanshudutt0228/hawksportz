"use client";

import { useActionState, useState } from "react";
import CustomAudienceFields from "@/components/admin/CustomAudienceFields";
import { updateDesignerAvailability } from "./designer-actions";
import type { ProductEditState } from "@/lib/admin-product";
import DismissibleNotice from "@/components/DismissibleNotice";

export default function ProductDesignerForm({ id, enabled, audiences=[] }: { id: string; enabled: boolean; audiences?:string[] }) {
  const [customEnabled,setCustomEnabled] = useState(enabled);
  const [state, action, pending] = useActionState<ProductEditState, FormData>(updateDesignerAvailability.bind(null, id), {});
  return <section className="mt-12 border-t border-gray-200 pt-8">
    <h2 className="text-2xl font-semibold">Apparel designer</h2>
    <form action={action} className="mt-5 space-y-4">
      <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
        <label className="flex items-center gap-3"><input type="checkbox" name="customizable" checked={customEnabled} onChange={event=>setCustomEnabled(event.target.checked)} />Offer this product in the apparel designer</label>
        {customEnabled && <CustomAudienceFields selected={audiences} />}
        <button type="submit" className="rounded-lg bg-black px-5 py-3 font-medium text-white">{pending ? "Saving..." : "Save designer availability"}</button>
      </fieldset>
      {state.error && <DismissibleNotice tone="error" resetKey={state}>{state.error}</DismissibleNotice>}
      {state.message && <DismissibleNotice tone="success" resetKey={state}>{state.message}</DismissibleNotice>}
    </form>
  </section>;
}
