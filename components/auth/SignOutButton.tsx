"use client";

import { useActionState } from "react";
import { signOut } from "@/app/auth/actions";
import type { AuthFormState } from "@/lib/auth/validation";
import DismissibleNotice from "@/components/DismissibleNotice";

export default function SignOutButton() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(signOut, {});
  return <form action={action} className="mt-6">
    <button disabled={pending} className="nav-button disabled:opacity-50">
      {pending ? "Signing out..." : "Sign out"}
    </button>
    {state.error && <DismissibleNotice tone="error" resetKey={state} className="mt-3">{state.error}</DismissibleNotice>}
  </form>;
}
