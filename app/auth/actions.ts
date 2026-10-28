"use server";

import { redirect } from "next/navigation";
import { createAuthClient, authSiteUrl } from "@/lib/auth/server";
import { readEmail, validNewPassword, type AuthFormState } from "@/lib/auth/validation";

const unavailable = { error: "Unable to connect right now. Please try again shortly." };

export async function signIn(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = readEmail(form.get("email"));
  const password = form.get("password");
  if (!email || typeof password !== "string" || !password || password.length > 128) {
    return { error: "Enter a valid email and password." };
  }
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Unable to sign in. Check your details and confirm your email." };
    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut({ scope: "local" });
      return { error: "Confirm your email before signing in." };
    }
  } catch { return unavailable; }
  redirect("/account");
}

export async function signUp(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = readEmail(form.get("email"));
  const password = form.get("password");
  if (!email || !validNewPassword(password)) return { error: "Enter a valid email and a password between 12 and 128 characters." };
  if (password !== form.get("confirmPassword")) return { error: "The passwords do not match." };
  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: `${authSiteUrl()}/auth/callback` },
    });
    // Do not reveal whether an email already exists or automatically sign users in.
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    if (error?.status === 429) return { error: "Too many attempts. Please wait before trying again." };
    if (error && error.status && error.status >= 500) return unavailable;
  } catch { return unavailable; }
  return { message: "If registration is available for this email, you will receive a confirmation link. If you already have an account, sign in or reset your password." };
}

export async function forgotPassword(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = readEmail(form.get("email"));
  if (!email) return { error: "Enter a valid email address." };
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${authSiteUrl()}/auth/callback?next=/reset-password`,
    });
    if (error?.status === 429) return { error: "Too many attempts. Please wait before trying again." };
    if (error && error.status && error.status >= 500) return unavailable;
  } catch { return unavailable; }
  return { message: "If an account exists for this email, you will receive a password reset link." };
}

export async function resetPassword(_: AuthFormState, form: FormData): Promise<AuthFormState> {
  const password = form.get("password");
  if (!validNewPassword(password)) return { error: "Use a password between 12 and 128 characters." };
  if (password !== form.get("confirmPassword")) return { error: "The passwords do not match." };
  try {
    const supabase = await createAuthClient();
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user?.email_confirmed_at) return { error: "Open a valid reset link or sign in before changing your password." };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: "Unable to update your password. Request a new reset link and try again." };
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
    if (signOutError) return { message: "Password updated. Please sign out of your other devices." };
  } catch { return unavailable; }
  redirect("/sign-in?password=updated");
}

export async function signOut(): Promise<AuthFormState> {
  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return unavailable;
  } catch { return unavailable; }
  redirect("/sign-in");
}
