"use client";

import {useId,useState} from "react";
import Link from "next/link";

export default function NavigationDropdown({label,href,items}:{label:string;href:string;items:{label:string;href:string}[]}){
  const [open,setOpen]=useState(false);const id=useId();
  return <div className="relative" onKeyDown={event=>{if(event.key==="Escape"){setOpen(false);(event.currentTarget.querySelector('button') as HTMLButtonElement)?.focus();}}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)} className="flex min-h-11 items-center gap-2 px-2 py-2">{label}<span aria-hidden="true">⌄</span></button>
    {open&&<div id={id} className="absolute left-0 top-full z-50 w-44 rounded-lg border border-gray-200 bg-white p-1 text-left shadow-lg">
      <Link href={href} onClick={()=>setOpen(false)} className="block rounded px-3 py-3 hover:bg-gray-100">All {label}</Link>
      {items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className="block rounded px-3 py-3 hover:bg-gray-100">{item.label}</Link>)}
    </div>}
  </div>;
}
