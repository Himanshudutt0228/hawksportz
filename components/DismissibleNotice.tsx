"use client";

import { useState, type ReactNode } from "react";

const colours = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-green-200 bg-green-50 text-green-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-gray-200 bg-gray-50 text-gray-700",
};

export default function DismissibleNotice({ children, tone = "warning", className = "", resetKey, onDismiss }: {
  children: ReactNode; tone?: keyof typeof colours; className?: string;
  resetKey?: unknown; onDismiss?: () => void;
}) {
  const token = resetKey ?? children;
  const [dismissed, setDismissed] = useState<{ token: unknown } | null>(null);
  if (dismissed?.token === token) return null;
  return <div className={`relative rounded-lg border p-4 pr-14 text-sm ${colours[tone]} ${className}`}>
    <div role={tone === "error" ? "alert" : "status"}>{children}</div>
    <button type="button" aria-label="Dismiss notice" title="Dismiss notice"
      onClick={() => { setDismissed({ token }); onDismiss?.(); }}
      className="absolute right-1 top-1 flex h-11 w-11 items-center justify-center rounded text-2xl leading-none hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2">
      <span aria-hidden="true">×</span>
    </button>
  </div>;
}
