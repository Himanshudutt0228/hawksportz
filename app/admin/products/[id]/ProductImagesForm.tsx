"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { updateProductImages } from "./image-actions";
import { designSides, type DesignSide } from "@/lib/design";
import type { ProductEditState } from "@/lib/admin-product";
import DismissibleNotice from "@/components/DismissibleNotice";

const labels = { front: "Main / front photo", back: "Back photo", left: "Left sleeve photo", right: "Right sleeve photo" };

export default function ProductImagesForm({ id, images }: { id: string; images: Partial<Record<DesignSide, string>> }) {
  const [state, action, pending] = useActionState<ProductEditState, FormData>(updateProductImages.bind(null, id), {});
  const [error, setError] = useState("");
  const [noticeAttempt, setNoticeAttempt] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  return <section className="mt-12 border-t border-gray-200 pt-8">
    <h2 className="text-2xl font-semibold">Product photos</h2>
    <p className="mt-3 text-sm text-gray-600">Replace any photo below; leave a field empty to keep its current photo. The front photo is also the main storefront photo. Sleeve sides follow the wearer’s perspective.</p>
    <p className="mt-2 text-sm text-gray-600">Use still PNG, JPEG, or WebP files, up to 5 MB and 16 megapixels each. Supply real photos for all four views.</p>
    <form ref={formRef} action={action} className="mt-6 space-y-5" onSubmit={event => {
      setNoticeAttempt(attempt => attempt + 1);
      const files = Array.from(formRef.current?.querySelectorAll<HTMLInputElement>('input[type="file"]') ?? []).flatMap(input => Array.from(input.files ?? []));
      if (files.some(file => file.size > 5 * 1024 * 1024)) {
        event.preventDefault(); setError("Each photo must be 5 MB or smaller.");
      } else setError("");
    }}>
      <fieldset disabled={pending} className="grid gap-6 sm:grid-cols-2 disabled:opacity-60">
        {designSides.map(side => <div key={side}>
          <label htmlFor={`photo-${side}`} className="font-medium">{labels[side]}</label>
          <div className="relative mt-2 aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {images[side] ? <Image src={images[side]} alt={`Current ${labels[side].toLowerCase()}`} fill sizes="(max-width: 640px) 90vw, 300px" className="object-contain" />
              : <p className="p-4 text-sm text-gray-500">Photo missing</p>}
          </div>
          <input id={`photo-${side}`} name={side} type="file" accept="image/png,image/jpeg,image/webp"
            className="mt-3 block w-full text-sm" onChange={() => setError("")} />
        </div>)}
        <button type="submit" className="rounded-lg bg-black px-5 py-3 font-medium text-white sm:col-span-2">{pending ? "Saving photos..." : "Save photos"}</button>
      </fieldset>
      {(error || state.error) && <DismissibleNotice tone="error" resetKey={error ? noticeAttempt : state}>{error || state.error}</DismissibleNotice>}
      {!error && state.message && <DismissibleNotice tone="success" resetKey={state}>{state.message}</DismissibleNotice>}
    </form>
  </section>;
}
