import { supabase } from "@/lib/supabase";
import { productSizes } from "@/lib/product-sizes";
import { productColours } from "@/lib/design";
import { customPrintPrice } from "@/lib/custom-pricing";
import {customPricingForCategory} from "@/lib/print-pricing";
import { readSizeStock } from "@/lib/product-stock";
import { guestOrderHash, orderDatabase } from "@/lib/checkout-server";
import { limitedBody } from "@/lib/request-body";
import type { PendingCheckout } from "@/lib/cart-refresh";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = JSON.parse(await limitedBody(request, 16000)); } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const ids = body && typeof body === "object" && "ids" in body ? body.ids : null;
  if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || !/^\d+$/.test(id))) {
    return Response.json({ error: "Invalid product IDs." }, { status: 400 });
  }
  const headers = { "Cache-Control": "private, no-store" };
  let pendingOrders: PendingCheckout[] = [];
  const accessHash = await guestOrderHash();
  if (accessHash) {
    try {
      // Possession of the HTTP-only receipt cookie is required. Never accept an
      // access hash, account ID or claimed reservation from the request body.
      const { data, error } = await orderDatabase().from("store_orders")
        .select("id,items").eq("access_hash", accessHash).in("status", ["creating", "open"])
        .order("created_at", { ascending: false }).limit(100);
      if (error || data?.length === 100) throw new Error("Unable to check reservations");
      pendingOrders = (data ?? []).map(order => ({ id: order.id,
        lines: order.items.map((line: { id: string; size: string | null; quantity: number; name: string; slug: string; unit_cents: number; customization?: import("@/lib/cart").CartProduct["customization"] }) => ({
          id: line.id, size: line.size, quantity: line.quantity, name: line.name, slug: line.slug, unitCents: line.unit_cents, ...(line.customization ? { customization: line.customization } : {}),
        })),
      }));
    } catch {
      return Response.json({ error: "Unable to check pending checkout. Your cart has been kept." }, { status: 503, headers });
    }
  }
  const productIds = [...new Set([...ids, ...pendingOrders.flatMap(order => order.lines.map(line => line.id))])];
  if (!productIds.length) return Response.json({ products: [], pendingOrders }, { headers });
  const { data, error } = await supabase.from("products").select("*").in("id", productIds);
  if (error) return Response.json({ error: "Unable to check products right now." }, { status: 503, headers });
  return Response.json({ pendingOrders, products: data.map((product) => ({
    id: String(product.id), name: product.name, slug: product.slug,
    price: product.price == null ? null : Number(product.price),
    stock: product.stock == null ? 0 : Number(product.stock),
    sizeStock: readSizeStock(product.stock_by_size),
    sizes: productSizes(product),
    colours: productColours(product),
    printPricePerSide: product.customizable === false ? null : customPrintPrice(),
    printPricing:product.customizable===false?null:customPricingForCategory(product.category,product.price),
    requiresSize: ["tshirts", "hoodies", "jerseys", "beanies", "hats", "sweatshirts"].includes(product.category),
  })) }, { headers });
}
