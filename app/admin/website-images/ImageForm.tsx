"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveSiteImage } from "./actions";
import { siteImageSlots, type SiteImageSlot, type SiteImageState } from "@/lib/site-images";
import DismissibleNotice from "@/components/DismissibleNotice";

export default function ImageForm({ slot,version,url,alt }: { slot: SiteImageSlot; version:number; url:string|null; alt:string }) {
  const [state,action,pending] = useActionState<SiteImageState,FormData>(saveSiteImage.bind(null,slot,version),{});
  const [fileError,setFileError] = useState("");
  return <form action={action} className="rounded-xl border border-gray-200 p-5 sm:p-6" onSubmit={event => {
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "remove" && !window.confirm("Remove this image from the website? The original upload will be retained.")) event.preventDefault();
  }}>
    <h2 className="text-xl font-semibold">{siteImageSlots[slot].label}</h2>
    <p className="mt-2 text-sm text-gray-600">{siteImageSlots[slot].hint}</p>
    <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-lg bg-gray-100">
      {url ? <Image src={url} alt={alt} fill sizes="(max-width:768px) 90vw, 500px" className="object-contain" />
        : <p className="flex h-full items-center justify-center text-sm text-gray-500">No image selected</p>}
    </div>
    <fieldset disabled={pending} className="mt-5 space-y-4 disabled:opacity-60">
      <div><label htmlFor={`site-${slot}`} className="block text-sm font-medium">Choose replacement image</label>
        <input key={`file-${version}`} id={`site-${slot}`} name="image" type="file" accept="image/png,image/jpeg,image/webp" className="mt-2 block w-full text-sm" onChange={event => {
          const file = event.target.files?.[0];
          if (file && file.size>5*1024*1024) { event.target.value=""; setFileError("Choose an image of 5 MB or less."); }
          else setFileError("");
        }} /></div>
      <div><label htmlFor={`alt-${slot}`} className="block text-sm font-medium">Image description</label>
        <input key={`alt-${version}`} id={`alt-${slot}`} name="alt_text" defaultValue={alt} maxLength={160}
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2" />
        <p className="mt-1 text-xs text-gray-500">Describe what is shown for people using screen readers.</p></div>
      <button type="submit" name="intent" value="save" className="min-h-11 rounded-lg bg-black px-5 py-3 text-sm font-medium text-white">{pending ? "Saving..." : "Save image"}</button>
      {url && <div className="border-t border-gray-200 pt-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirm_remove" value="yes" />Confirm removal</label>
        <button type="submit" name="intent" value="remove" className="mt-2 min-h-11 text-sm text-red-700 underline">Remove image</button>
      </div>}
    </fieldset>
    {fileError && <DismissibleNotice tone="error" resetKey={fileError} className="mt-4">{fileError}</DismissibleNotice>}
    {state.error && <DismissibleNotice tone="error" resetKey={state} className="mt-4">{state.error}</DismissibleNotice>}
    {state.message && <DismissibleNotice tone="success" resetKey={state} className="mt-4">{state.message}</DismissibleNotice>}
  </form>;
}
