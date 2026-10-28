export type AuthFormState = { error?: string; message?: string };

export function readEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validNewPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

// Only these destinations are accepted from email links. Never redirect to user-provided URLs.
export function callbackDestination(value: string | null): "/account" | "/reset-password" {
  return value === "/reset-password" ? value : "/account";
}
