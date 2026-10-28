import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Each request gets its own client. Never share a signed-in client across users.
export async function createAuthClient(readOnly = false) {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: authCookieOptions,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(values) {
          // Server Components cannot write cookies; Proxy refreshes them before rendering.
          if (readOnly) return;
          for (const { name, value, options } of values) cookieStore.set(name, value, options);
        },
      },
    },
  );
}

export function authSiteUrl(): string {
  const configured = process.env.SITE_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must be configured for authentication.");
  }
  const url = new URL(configured ?? "http://localhost:3000");
  if (url.username || url.password || (url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && url.protocol === "http:" && url.hostname === "localhost"))) {
    throw new Error("SITE_URL must use HTTPS in production.");
  }
  return url.origin;
}
