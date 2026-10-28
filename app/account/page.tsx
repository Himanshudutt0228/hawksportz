import Link from "next/link";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";
import SignOutButton from "@/components/auth/SignOutButton";
import { hasAdminAccess } from "@/lib/auth/admin";

export const metadata = { title: "Your account | Hawk Sportz" };

export default async function AccountPage() {
  const supabase = await createAuthClient(true);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) redirect("/sign-in");
  const isAdmin = await hasAdminAccess(supabase, data.user.id);
  return <main className="mx-auto w-full max-w-3xl px-5 py-12">
    <h1 className="text-3xl font-semibold">Your account</h1>
    <p className="mt-4 text-gray-600">Signed in as {data.user.email}</p>
    <div className="mt-6 flex flex-wrap gap-5 text-sm underline">
      <Link href="/account/orders">Your orders</Link>
      <Link href="/product">Shop products</Link>
      <Link href="/reset-password">Change password</Link>
      {isAdmin && <Link href="/admin">Admin dashboard</Link>}
    </div>
    <SignOutButton />
  </main>;
}
