"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, forgotPassword, resetPassword } from "@/app/auth/actions";
import type { AuthFormState } from "@/lib/auth/validation";
import DismissibleNotice from "@/components/DismissibleNotice";

const settings = {
  "sign-in": { action: signIn, title: "Sign in", description: "Welcome back to Hawk Sportz.", button: "Sign in" },
  "sign-up": { action: signUp, title: "Create an account", description: "Join Hawk Sportz with your email address.", button: "Create account" },
  "forgot-password": { action: forgotPassword, title: "Forgot your password?", description: "We will email you a link to reset it.", button: "Send reset link" },
  "reset-password": { action: resetPassword, title: "Set a new password", description: "Choose a password you have not used elsewhere.", button: "Update password" },
};

export default function AuthForm({ mode }: { mode: keyof typeof settings }) {
  const { action, title, description, button } = settings[mode];
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  const newPassword = mode === "sign-up" || mode === "reset-password";
  const fieldClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3 focus:outline-2 focus:outline-offset-2 focus:outline-gray-900";

  return (
    <section className="mx-auto w-full max-w-md rounded-xl border border-gray-200 p-6 sm:p-8">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-gray-600">{description}</p>
      <form action={formAction} className="mt-6 space-y-5">
        <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
          {mode !== "reset-password" && <div>
            <label htmlFor="email" className="text-sm font-medium">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} className={fieldClass} />
          </div>}
          {mode !== "forgot-password" && <div>
            <label htmlFor="password" className="text-sm font-medium">{newPassword ? "New password" : "Password"}</label>
            <input id="password" name="password" type="password" required minLength={newPassword ? 12 : 1}
              maxLength={128} autoComplete={newPassword ? "new-password" : "current-password"}
              aria-describedby={newPassword ? "password-help" : undefined} className={fieldClass} />
            {newPassword && <p id="password-help" className="mt-2 text-sm text-gray-600">Use 12 to 128 characters.</p>}
          </div>}
          {newPassword && <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={12} maxLength={128} className={fieldClass} />
          </div>}
          <button type="submit" className="w-full rounded-lg bg-brand px-5 py-3 font-medium text-on-brand disabled:cursor-wait">
            {pending ? "Please wait..." : button}
          </button>
        </fieldset>
        {state.error && <DismissibleNotice tone="error" resetKey={state}>{state.error}</DismissibleNotice>}
        {state.message && <DismissibleNotice tone="success" resetKey={state}>{state.message}</DismissibleNotice>}
      </form>
      <nav aria-label="Account help" className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm underline">
        {mode !== "sign-in" && <Link href="/sign-in">Sign in</Link>}
        {mode !== "sign-up" && <Link href="/sign-up">Create an account</Link>}
        {mode === "sign-in" && <Link href="/forgot-password">Forgot password?</Link>}
      </nav>
    </section>
  );
}
