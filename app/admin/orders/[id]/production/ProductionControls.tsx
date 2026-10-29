"use client";

import { useActionState } from "react";
import { checkDesign, approveDesign } from "./actions";

export default function ProductionControls({ id, checked, reviewReady, approvalReady, approved }: { id: string; checked: boolean; reviewReady: boolean; approvalReady: boolean; approved: boolean }) {
  const [state, action, pending] = useActionState(checkDesign.bind(null, id), {});
  const [approval, approveAction, approving] = useActionState(approveDesign.bind(null, id), {});
  return <div className="mt-6 space-y-4 print:hidden">
    <button type="button" className="rounded border px-4 py-2" onClick={() => window.print()}>Print production sheet / Save PDF</button>
    {!reviewReady ? <p>Apply supabase/production-review.sql to enable recording design checks.</p> : !checked && <form action={action} className="space-y-3">
      <label className="flex items-start gap-2"><input type="checkbox" name="checked" value="yes" required disabled={pending} />I checked all sides, artwork, dimensions, quantities and comments.</label>
      <button className="rounded bg-gray-950 px-4 py-2 text-white disabled:opacity-50" disabled={pending}>Mark design checked</button>
    </form>}
    {checked && !approved && (approvalReady ? <form action={approveAction} className="space-y-3 rounded border p-4">
      <label className="flex items-start gap-2"><input type="checkbox" name="approve" value="yes" required disabled={approving} />I approve all designs in this order and have resolved any questions with the customer.</label>
      <button className="rounded bg-gray-950 px-4 py-2 text-white disabled:opacity-50" disabled={approving}>Approve designs and notify customer</button>
    </form> : <p>Apply supabase/design-approval.sql to enable design approval and its email notification.</p>)}
    {approval.error && <p role="alert">{approval.error}</p>}{approval.message && <p role="status">{approval.message}</p>}
    {state.error && <p role="alert">{state.error}</p>}{state.message && <p role="status">{state.message}</p>}
  </div>;
}
