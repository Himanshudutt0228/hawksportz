"use client";

import { useState } from "react";
import Image from "next/image";
import { designSides, type DesignSide } from "@/lib/design";

const labels: Record<DesignSide, string> = { front: "Front", back: "Back", left: "Left", right: "Right" };

export default function ProductGallery({ name, images }: {
  name: string; images: Partial<Record<DesignSide, string>>;
}) {
  const [side, setSide] = useState<DesignSide>(designSides.find((view) => images[view]) ?? "front");
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = images[side];
  return (
    <section aria-label="Product images" className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {source && source !== failedSource ? <Image src={source} alt={`${name} - ${labels[side]}`} fill
          sizes="(max-width: 768px) 100vw, 50vw" className="object-contain" onError={() => setFailedSource(source)} />
          : <p className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-500">This product photo is currently unavailable.</p>}
      </div>
      <div role="group" aria-label="Product views" className="mt-4 grid grid-cols-4 gap-3">
        {designSides.map((view) => <button key={view} type="button" aria-label={`${labels[view]} view`} aria-pressed={side === view}
          disabled={!images[view]} onClick={() => setSide(view)}
          className={`min-w-0 rounded-lg border p-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${side === view ? "border-black bg-gray-50 font-medium" : "border-gray-200 hover:border-gray-400"}`}>
          <span className="relative mb-2 block aspect-square overflow-hidden rounded bg-gray-100">
            {images[view] ? <Image src={images[view]!} alt="" fill sizes="(max-width: 768px) 20vw, 120px" className="object-contain" />
              : <span className="flex h-full items-center justify-center text-[10px] text-gray-500">Photo pending</span>}
          </span>
          {labels[view]}
        </button>)}
      </div>
    </section>
  );
}
