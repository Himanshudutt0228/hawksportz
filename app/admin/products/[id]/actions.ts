"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { readProductEdit, validProductId, type ProductEditState } from "@/lib/admin-product";
import { productSizes } from "@/lib/product-sizes";
import { readProductStyle } from "@/lib/product-styles";

export async function updateProduct(id: string, _: ProductEditState, form: FormData): Promise<ProductEditState> {
  const { supabase } = await requireAdmin();
  if (!validProductId(id)) return { error: "Invalid product." };
  const { data: current, error: readError } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (readError || !current) return { error: "Unable to load this product. Refresh the page and try again." };
  const values = readProductEdit(form, productSizes(current));
  if (!values) return { error: "Check the name, description, price, and stock. Enter a whole-number count for every size; the total must be below one billion." };
  const style = readProductStyle(current.category, form.get("garment_style"));
  if (style === undefined) return { error: "Choose a valid style for this product category." };
  // Omit an unchanged or unavailable style column so existing products remain editable before migration.
  const update = {...values, ...(style !== (current.garment_style ?? null) ? {garment_style:style} : {})};
  try {
    // Size keys come from the database, not a submitted list. Total is derived.
    const { data, error } = await supabase.from("products").update(update)
      .eq("id", id).select("id").maybeSingle();
    if (error || !data) return { error: "Product was not saved. Check your access and database setup, then try again." };
  } catch {
    return { error: "Unable to save right now. Please try again shortly." };
  }
  revalidatePath("/", "layout");
  return { message: "Product saved." };
}
