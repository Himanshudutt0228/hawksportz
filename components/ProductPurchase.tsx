"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { remainingStock, type CartProduct } from "@/lib/cart";
import { stockForSize } from "@/lib/product-stock";

export default function ProductPurchase({ product, sizes, isClothing }: {
  product: CartProduct; sizes: string[]; isClothing: boolean;
}) {
  const { items, ready, dispatch } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const inStock = product.stock > 0;
  const sizeMissing = isClothing && sizes.length === 0;
  const needsSize = sizes.length > 0 && !size;
  const atLimit = !needsSize && remainingStock(items, product, size) < 1;

  return (
    <div className="mt-6">
      {sizes.length > 0 ? (
        <fieldset disabled={!inStock}>
          <legend className="font-medium">Choose a size</legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {sizes.map((option) => (
              <label key={option} className="flex cursor-pointer items-center gap-2 rounded border border-gray-300 px-4 py-2 has-checked:border-brand-link has-checked:bg-brand/10 has-disabled:opacity-50">
                <input type="radio" name="size" value={option} checked={size === option}
                  disabled={stockForSize(product, option) === 0}
                  onChange={() => { setSize(option); setAdded(false); }} className="accent-brand-link" />
                {option}{stockForSize(product, option) === 0 ? " (sold out)" : ""}
              </label>
            ))}
          </div>
        </fieldset>
      ) : sizeMissing ? <p className="text-sm text-gray-600">Size information is not available yet.</p> : null}
      {size && product.sizeStock != null && <p className="mt-3 text-sm text-gray-600">{stockForSize(product, size)} available in {size}.</p>}
      <button type="button" disabled={!ready || !inStock || sizeMissing || needsSize || atLimit}
        onClick={() => { dispatch({ type: "add", product, size }); setAdded(true); }}
        aria-describedby="purchase-status"
        className="mt-6 rounded bg-brand px-6 py-3 text-on-brand disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500">
        {!inStock ? "Unavailable" : "Add to Cart"}
      </button>
      <div id="purchase-status" role="status" className="mt-3 text-sm text-gray-600">
        {added ? <span>Added to cart. <Link href="/cart" className="underline">View cart</Link></span>
          : !inStock ? "This product is currently unavailable."
          : sizeMissing ? "This item will be available to order once sizes are listed."
          : needsSize ? "Select a size to continue."
          : atLimit ? "All available stock is already in your cart." : null}
      </div>
    </div>
  );
}
