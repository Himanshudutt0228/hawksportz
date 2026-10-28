"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { validProductId, type ProductEditState } from "@/lib/admin-product";
import { readCustomAudiences } from "@/lib/custom-audiences";

export async function updateDesignerAvailability(id: string, _: ProductEditState, form: FormData): Promise<ProductEditState> {
  const { supabase } = await requireAdmin();
  if (!validProductId(id)) return { error: "Invalid product." };
  const value = form.get("customizable");
  if (value !== null && value !== "on") return { error: "Choose whether to offer this product in the designer." };
  const audiences = readCustomAudiences(form);
  if (!audiences) return { error:"Choose only the listed custom apparel categories." };
  try {
    // An independent setting: no need to alter inventory or upload photos.
    const { data, error } = await supabase.from("products").update({ customizable: value === "on", custom_audiences:value==="on"?audiences:[] })
      .eq("id", id).in("category", ["tshirts", "hoodies", "jerseys", "hats", "beanies", "sweatshirts"]).select("id").maybeSingle();
    if (error || !data) return { error: "Designer availability was not saved. Check your access and database setup." };
  } catch {
    return { error: "Unable to save right now. Please try again shortly." };
  }
  revalidatePath("/", "layout");
  return { message: "Designer availability saved." };
}
