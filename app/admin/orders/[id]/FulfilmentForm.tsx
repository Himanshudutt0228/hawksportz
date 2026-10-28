"use client";

import { useActionState } from "react";
import { fulfilOrder } from "./actions";
import { nextFulfilment, type FulfilmentStatus, type FulfilmentState } from "@/lib/admin-orders";
import DismissibleNotice from "@/components/DismissibleNotice";

export default function FulfilmentForm({ id, method, status }: { id: string; method: string; status: FulfilmentStatus }) {
  const [state, action, pending] = useActionState<FulfilmentState, FormData>(fulfilOrder.bind(null, id, status), {});
  const next = nextFulfilment(method, status);
  return <div className="mt-5">
    {next && <form action={action} onSubmit={event => {
      if (!window.confirm(`${next.label} for this order? When enabled, ready-for-pickup and shipped updates automatically email the customer.`)) event.preventDefault();
    }}>
      <input type="hidden" name="next_status" value={next.status} />
      <button disabled={pending} type="submit" className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{pending ? "Saving..." : next.label}</button>
    </form>}
    {state.error && <DismissibleNotice tone="error" resetKey={state} className="mt-4">{state.error}</DismissibleNotice>}
    {state.message && <DismissibleNotice tone="success" resetKey={state} className="mt-4">{state.message}</DismissibleNotice>}
  </div>;
}
