import { productStyles } from "@/lib/product-styles";

export default function ProductStyleField({category,value}:{category:string;value?:string|null}) {
  if (category !== "tshirts" && category !== "hoodies" && category !== "jerseys") return null;
  return <div><label htmlFor="garment_style" className="font-medium">Style</label>
    <select key={category} id="garment_style" name="garment_style" defaultValue={value ?? ""} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-3">
      <option value="">Not specified</option>
      {Object.entries(productStyles[category]).map(([key,label])=><option key={key} value={key}>{label}</option>)}
    </select>
    <p className="mt-2 text-sm text-gray-600">Choose a style to show this product in the matching dropdown collection.</p>
  </div>;
}
