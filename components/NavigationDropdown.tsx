"use client";

import {useId,useState} from "react";
import Link from "next/link";

export default function NavigationDropdown({label,href,items,mobile=false}:{label:string;href:string;mobile?:boolean;items:{label:string;href:string}[]}){
  const [open,setOpen]=useState(false);const id=useId();
  return <div className="relative" onKeyDown={event=>{if(event.key==="Escape"&&open){event.preventDefault();event.stopPropagation();setOpen(false);(event.currentTarget.querySelector('button') as HTMLButtonElement)?.focus();}}} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <button type="button" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)} className="nav-button gap-2">{label}<span aria-hidden="true">⌄</span></button>
    {open&&<div id={id} className={mobile ? "ml-3 rounded-lg bg-gray-50 p-1 text-left space-y-1" : "absolute left-0 top-full z-50 w-44 rounded-lg border border-gray-200 bg-white p-1 text-left shadow-lg space-y-1"}>
      <Link href={href} onClick={()=>setOpen(false)} className="nav-button nav-subbutton">All {label}</Link>
      {items.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className="nav-button nav-subbutton">{item.label}</Link>)}
    </div>}
  </div>;
}
