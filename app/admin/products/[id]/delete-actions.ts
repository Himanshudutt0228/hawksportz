"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { validProductId, type ProductEditState } from "@/lib/admin-product";

export async function deleteProduct(id: string, _: ProductEditState, form: FormData): Promise<ProductEditState> {
  const { supabase } = await requireAdmin();
  if (!validProductId(id) || form.get("confirmDelete") !== "delete") {
    return { error: "Confirm that you want to delete this product." };
  }
  try {
    const { data, error } = await supabase.from("products").delete().eq("id", id).select("id").maybeSingle();
    if (error?.code === "23503") return { error: "This product is linked to other records and cannot be deleted." };
    if (error) return { error: "Product was not deleted. Check your access and database setup, then try again." };
    if (!data) return { error: "This product is already gone or your access changed. Refresh the product list." };
  } catch {
    return { error: "Unable to confirm deletion. Check the product list before trying again." };
  }
  // Keep stored photos: other products or saved designs may still use them.
  revalidatePath("/", "layout");
  redirect("/admin?deleted=1");
}
