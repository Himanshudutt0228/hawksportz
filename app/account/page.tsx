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
  return <main className="mobile-content mx-auto w-full max-w-3xl px-5 py-12">
    <h1 className="text-3xl font-semibold">Your account</h1>
    <p className="mt-4 text-gray-600">Signed in as {data.user.email}</p>
    <div className="mt-6 flex flex-wrap gap-3 text-sm">
      <Link href="/account/orders" className="nav-button">Your orders</Link>
      <Link href="/product" className="nav-button">Shop products</Link>
      <Link href="/reset-password" className="nav-button">Change password</Link>
      {isAdmin && <Link href="/admin" className="nav-button">Admin dashboard</Link>}
    </div>
    <SignOutButton />
  </main>;
}
