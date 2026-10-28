import CategoryProducts from "@/components/CategoryProducts";
import { readProductStyle, productStyles } from "@/lib/product-styles";
import { notFound } from "next/navigation";

export default async function JerseysPage({searchParams}:{searchParams:Promise<{style?:string|string[]}>}) {
  const style=readProductStyle("jerseys",(await searchParams).style);
  if(style===undefined)notFound();
  return (
    <CategoryProducts
      category="jerseys"
      title={style?`${productStyles.jerseys[style as keyof typeof productStyles.jerseys]} Jerseys`:"Jerseys"}
      style={style??undefined}
      description="Browse our jersey collection."
    />
  );
}
