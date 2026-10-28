import CategoryProducts from "@/components/CategoryProducts";
import {readProductStyle,productStyles} from "@/lib/product-styles";
import {notFound} from "next/navigation";

export default async function HoodiesPage({searchParams}:{searchParams:Promise<{style?:string|string[]}>}) {
  const style=readProductStyle("hoodies",(await searchParams).style);
  if(style===undefined)notFound();
  return (
    <CategoryProducts
      category="hoodies"
      title={style?`${productStyles.hoodies[style as keyof typeof productStyles.hoodies]} Hoodies`:"Hoodies"}
      style={style??undefined}
      description="Browse our hoodie collection."
    />
  );
}
