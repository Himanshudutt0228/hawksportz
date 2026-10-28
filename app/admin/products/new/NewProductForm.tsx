"use client";

import { useActionState, useState } from "react";
import { createProduct } from "./actions";
import type { ProductEditState } from "@/lib/admin-product";
import ProductStockFields from "@/components/admin/ProductStockFields";
import DismissibleNotice from "@/components/DismissibleNotice";
import CustomAudienceFields from "@/components/admin/CustomAudienceFields";
import ProductStyleField from "@/components/admin/ProductStyleField";

export default function NewProductForm() {
  const [state, action, pending] = useActionState<ProductEditState, FormData>(createProduct, {});
  const [fileError, setFileError] = useState("");
  const [noticeAttempt, setNoticeAttempt] = useState(0);
  const [sizeList, setSizeList] = useState("");
  const [customEnabled,setCustomEnabled] = useState(false);
  const [category,setCategory] = useState("");
  const sizes = [...new Set(sizeList.split(",").map(size => size.trim()).filter(Boolean))];
  const fieldClass = "mt-2 w-full rounded-lg border border-gray-300 px-3 py-3";
  return <form action={action} className="mt-8 space-y-5" onSubmit={event => {
    setNoticeAttempt(attempt => attempt + 1);
    const inputs = event.currentTarget.querySelectorAll<HTMLInputElement>('input[type="file"]');
    if (Array.from(inputs).some(input => (input.files?.[0]?.size ?? 0) > 5 * 1024 * 1024)) {
      event.preventDefault(); setFileError("Each photo must be 5 MB or smaller.");
    } else setFileError("");
  }}>
    <fieldset disabled={pending} className="space-y-5 disabled:opacity-60">
      <div><label htmlFor="name" className="font-medium">Product name</label>
        <input id="name" name="name" required maxLength={200} className={fieldClass} /></div>
      <div><label htmlFor="category" className="font-medium">Category</label>
        <select id="category" name="category" className={fieldClass} required value={category} onChange={event => {setCategory(event.target.value);if(!["tshirts","hoodies","jerseys","hats","beanies","sweatshirts"].includes(event.target.value))setCustomEnabled(false);}}>
          <option value="" disabled>Choose a category</option><option value="tshirts">T-Shirts</option>
          <option value="hoodies">Hoodies</option><option value="jerseys">Jerseys</option><option value="equipment">Equipment</option>
          <option value="beanies">Beanies</option><option value="hats">Hats</option><option value="sweatshirts">Sweatshirts</option>
        </select></div>
      <ProductStyleField category={category} />
      <div><label htmlFor="description" className="font-medium">Description</label>
        <textarea id="description" name="description" rows={5} maxLength={10000} className={fieldClass} /></div>
      <div><label htmlFor="price" className="font-medium">Price (CAD)</label>
        <input id="price" name="price" type="number" required min="0" max="9999999.99" step="0.01" className={fieldClass} /></div>
      <div><label htmlFor="sizes" className="font-medium">Sizes, separated by commas</label>
        <input id="sizes" name="sizes" maxLength={1000} placeholder="S, M, L, XL" className={fieldClass}
          value={sizeList} onChange={event => setSizeList(event.target.value)} />
        <p className="mt-2 text-sm text-gray-600">Required for clothing. Up to 30 sizes, 40 characters each.</p></div>
      <ProductStockFields sizes={sizes} />
      <div><label htmlFor="colours" className="font-medium">Colours, separated by commas</label>
        <input id="colours" name="colours" maxLength={1000} placeholder="Black, White" className={fieldClass} />
        <p className="mt-2 text-sm text-gray-600">Optional. Up to 30 colours, 40 characters each.</p></div>
      <label className="flex items-center gap-3"><input name="customizable" type="checkbox" disabled={!["tshirts","hoodies","jerseys","hats","beanies","sweatshirts"].includes(category)} checked={customEnabled} onChange={event=>setCustomEnabled(event.target.checked)} />Offer this clothing product in the apparel designer</label>
      {customEnabled && <CustomAudienceFields />}
      <div className="border-t border-gray-200 pt-5"><h2 className="text-xl font-semibold">Product photos</h2>
        <p className="mt-2 text-sm text-gray-600">Four real views are required. Use still PNG, JPEG, or WebP, up to 5 MB and 16 megapixels each. Sleeve sides follow the wearer’s perspective.</p>
        {([['front', 'Main / front photo'], ['back', 'Back photo'], ['left', 'Left sleeve / side photo'], ['right', 'Right sleeve / side photo']] as const).map(([side, label]) =>
          <div className="mt-5" key={side}><label htmlFor={side} className="font-medium">{label}</label>
            <input id={side} name={side} type="file" required accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" onChange={() => setFileError("")} /></div>)}
      </div>
      <button type="submit" className="rounded-lg bg-black px-5 py-3 font-medium text-white">{pending ? "Creating..." : "Create product"}</button>
    </fieldset>
    {(fileError || state.error) && <DismissibleNotice tone="error" resetKey={fileError ? noticeAttempt : state}>{fileError || state.error}</DismissibleNotice>}
  </form>;
}
