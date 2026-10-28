"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createProductSlug, readNewProduct, type ProductEditState } from "@/lib/admin-product";
import { designSides } from "@/lib/design";
import { prepareProductPhoto } from "@/lib/product-photo-upload";

export async function createProduct(_: ProductEditState, form: FormData): Promise<ProductEditState> {
  const { supabase } = await requireAdmin();
  const values = readNewProduct(form);
  if (!values) return { error: "Check the product details. Choose a category, enter a valid CAD price, and enter stock for each clothing size. Stock counts must be whole numbers with a total below one billion." };
  const photos: { side: typeof designSides[number]; body: Buffer }[] = [];
  try {
    for (const side of designSides) {
      const file = form.get(side);
      if (!(file instanceof File) || !file.size) return { error: "Choose a real photo for each of the four product views." };
      photos.push({ side, body: await prepareProductPhoto(file) });
    }
  } catch {
    return { error: "Use still PNG, JPEG, or WebP photos up to 5 MB and 16 megapixels each." };
  }
  let createdId: string | undefined;
  try {
    const images: Record<string, string> = {};
    const folder = randomUUID();
    for (const photo of photos) {
      const path = `products/${folder}/${randomUUID()}.webp`;
      const storage = supabase.storage.from("admin-product-images");
      const { error } = await storage.upload(path, photo.body, { contentType: "image/webp", upsert: false, cacheControl: "31536000" });
      if (error) return { error: "Product was not created. Check photo storage permissions and try again." };
      images[photo.side] = storage.getPublicUrl(path).data.publicUrl;
    }
    // Only validated fields reach the database; no submitted ID or privileges.
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = createProductSlug(values.name, randomUUID());
      const { data, error } = await supabase.from("products")
        .insert({ ...values, slug, image_url: images.front, design_images: images }).select("id").single();
      if (error?.code === "23505") continue;
      if(error?.code==="23514") {
        const message=error.message??"";
        if(message.includes('products_custom_audiences_valid'))return {error:"Product was not created. Apply headwear-customization.sql in Supabase before assigning custom apparel groups to hats or beanies."};
        if(message.includes('products_four_images_required'))return {error:"Product was not created. The database requires four distinct product photos, including for hats and beanies."};
        if(message.includes('products_garment_style_valid'))return {error:"Product was not created. The selected style is not allowed by the database. Check the jersey-styles.sql setup for jersey sleeve styles."};
        return {error:"Product was not created. A database validation rule rejected it (23514). Check the products table constraints, including the allowed categories."};
      }
      if(error?.code==="22P02")return {error:"Product was not created. A value does not match the database type (22P02). Check whether the database category type includes beanies, hats, and sweatshirts."};
      if(error?.code==="42501")return {error:"Product was not created. The database denied access. Check your current admin membership and the product-creation database permissions."};
      if (error || !data) return { error: "Unable to confirm creation. Check the admin product list before retrying, and verify the product-creation database setup." };
      createdId = String(data.id);
      break;
    }
    if (!createdId) return { error: "Product could not be created. Please try again shortly." };
  } catch {
    return { error: "Unable to confirm creation. Check the admin product list before retrying." };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/products/${encodeURIComponent(createdId)}?created=1`);
}
