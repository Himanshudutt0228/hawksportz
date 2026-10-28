"use client";

import { useState } from "react";
import type { SizeStock } from "@/lib/product-stock";

export default function ProductStockFields({ sizes, initial, sharedStock = "" }: {
  sizes: string[]; initial?: SizeStock | null; sharedStock?: string;
}) {
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(initial ?? {}).map(([size, count]) => [size, String(count)])));
  const fieldClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3";
  if (!sizes.length) return <div><label htmlFor="stock" className="font-medium">Stock</label>
    <input id="stock" name="stock" type="number" min="0" max="999999999" step="1" required defaultValue={sharedStock} className={fieldClass} /></div>;
  const total = sizes.reduce((sum, size) => sum + (Number(counts[size]) || 0), 0);
  return <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
    <legend className="px-1 font-medium">Stock by size</legend>
    {initial === null && <p className="text-sm text-gray-600">This product currently has {sharedStock || "0"} units in shared stock. Enter the actual count for each size to start tracking sizes separately.</p>}
    {sizes.map((size, index) => <div key={size} className="flex items-center justify-between gap-4">
      <label htmlFor={`size-stock-${index}`} className="font-medium">{size}</label>
      <input id={`size-stock-${index}`} name={`stock:${size}`} type="number" min="0" max="999999999" step="1" required
        aria-label={`Stock for size ${size}`} value={counts[size] ?? ""}
        onChange={event => setCounts(previous => ({ ...previous, [size]: event.target.value }))}
        className="w-28 rounded-lg border border-gray-300 px-3 py-2" />
    </div>)}
    <p className="border-t border-gray-200 pt-3 font-medium">Total stock: <output aria-live="polite">{total}</output></p>
  </fieldset>;
}
