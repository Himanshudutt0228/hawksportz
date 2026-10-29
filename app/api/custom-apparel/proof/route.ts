import { supabase } from "@/lib/supabase";
import { productViewImages } from "@/lib/design";
import { freezeGarmentPhotos } from "@/lib/garment-proof-server";
import { validProductId } from "@/lib/admin-product";

export const runtime = "nodejs";
const headers = { "Cache-Control": "public, max-age=300, s-maxage=300", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request) {
  const values = new URL(request.url).searchParams.getAll("product");
  if (values.length !== 1 || !validProductId(values[0])) return Response.json({ error: "Invalid product." }, { status: 400 });
  try {
    const { data, error } = await supabase.from("products").select("id,category,customizable,image_url,design_images").eq("id", values[0]).maybeSingle();
    if (error) throw new Error("Products unavailable");
    if (!data || !["tshirts", "jerseys", "hoodies", "sweatshirts", "hats", "beanies"].includes(data.category) ||
        data.customizable === false || (["hats", "beanies", "sweatshirts"].includes(data.category) && data.customizable !== true)) return Response.json({ error: "Product unavailable." }, { status: 404 });
    const proof = await freezeGarmentPhotos(String(data.id), productViewImages(data), process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
    return Response.json(proof, { headers });
  } catch { return Response.json({ error: "Unable to prepare the four garment views. Check the product photos and try again." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
