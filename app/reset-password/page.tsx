import { redirect } from "next/navigation";
import AuthForm from "@/components/auth/AuthForm";
import { createAuthClient } from "@/lib/auth/server";

export const metadata = { title: "New password | Hawk Sportz" };

export default async function ResetPasswordPage() {
  const supabase = await createAuthClient(true);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) redirect("/forgot-password");
  return <main className="mobile-content px-5 py-12"><AuthForm mode="reset-password" /></main>;
}
