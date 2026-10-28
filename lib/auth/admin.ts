import "server-only";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/auth/server";

export async function hasAdminAccess(
  supabase: Awaited<ReturnType<typeof createAuthClient>>,
  userId: string,
): Promise<boolean> {
  // The database is the authority. User metadata and browser input never grant roles.
  const { data, error } = await supabase.from("store_admins")
    .select("user_id").eq("user_id", userId).maybeSingle();
  return !error && data?.user_id === userId;
}

// Call this inside every future admin page, action, and data operation.
// A layout or a hidden navigation link alone does not protect an operation.
export async function requireAdmin() {
  const supabase = await createAuthClient(true);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) redirect("/sign-in");
  if (!await hasAdminAccess(supabase, data.user.id)) redirect("/account");
  return { supabase, user: data.user };
}
