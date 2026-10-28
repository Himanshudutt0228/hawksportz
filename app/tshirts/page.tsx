import CategoryProducts from "@/components/CategoryProducts";
import {readProductStyle,productStyles} from "@/lib/product-styles";
import {notFound} from "next/navigation";

export default async function TShirtsPage({searchParams}:{searchParams:Promise<{style?:string|string[]}>}) {
  const style=readProductStyle("tshirts",(await searchParams).style);
  if(style===undefined)notFound();
  return (
    <CategoryProducts
      category="tshirts"
      title={style?`${productStyles.tshirts[style as keyof typeof productStyles.tshirts]} T-Shirts`:"T-Shirts"}
      style={style??undefined}
      description="Browse our T-shirt collection."
    />
  );
}
