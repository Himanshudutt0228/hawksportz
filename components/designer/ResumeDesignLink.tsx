"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

function subscribe(onChange:()=>void) {
  window.addEventListener("storage",onChange);
  return ()=>window.removeEventListener("storage",onChange);
}
function hasSavedDesign() {
  try{return !!localStorage.getItem("hawk-sportz-last-design");}catch{return false;}
}
export default function ResumeDesignLink() {
  const available=useSyncExternalStore(subscribe,hasSavedDesign,()=>false);
  return available?<Link href="/custom-apparel?resume=1" className="mt-4 inline-block text-sm underline">Resume saved design</Link>:null;
}
