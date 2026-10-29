"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import Link from "next/link";
import NavigationDropdown from "./NavigationDropdown";

export default function MobileNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls[controls.length - 1];
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <>
    <button ref={trigger} type="button" aria-label="Open menu" aria-haspopup="dialog" aria-controls={id}
      onClick={() => dialog.current?.showModal()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 md:hidden">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
    <dialog ref={dialog} id={id} data-mobile-menu aria-label="Shop menu" onKeyDown={keepFocusInside} onClose={() => trigger.current?.focus()}
      onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[calc(100%-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-r-2xl border-0 bg-white p-0 text-ink shadow-2xl backdrop:bg-black/45">
      <div className="flex min-h-16 items-center justify-between border-b border-gray-200 px-5"><span className="text-lg font-semibold">Hawk Sportz</span>
        <button type="button" aria-label="Close menu" onClick={() => dialog.current?.close()} className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl">&times;</button>
      </div>
      <nav aria-label="Mobile navigation" className="mobile-shop-nav space-y-1 p-4 text-sm font-medium"
        onClick={event => { if ((event.target as Element).closest("a")) dialog.current?.close(); }}>
        <Link href="/product" className="nav-button">Shop Ready-Made</Link>
        <Link href="/custom-apparel" className="nav-button nav-button-primary">Custom Apparel</Link>
        <NavigationDropdown mobile label="T-Shirts" href="/tshirts" items={[{label:"Short Sleeve",href:"/tshirts?style=short-sleeve"},{label:"Long Sleeve",href:"/tshirts?style=long-sleeve"}]} />
        <NavigationDropdown mobile label="Hoodies" href="/hoodies" items={[{label:"Pullover",href:"/hoodies?style=pullover"},{label:"Zip-Up",href:"/hoodies?style=zip-up"}]} />
        <Link href="/beanies" className="nav-button">Beanies</Link>
        <Link href="/hats" className="nav-button">Hats</Link>
        <Link href="/sweatshirts" className="nav-button">Sweatshirts</Link>
        <NavigationDropdown mobile label="Jerseys" href="/jerseys" items={[{label:"Short Sleeve",href:"/jerseys?style=short-sleeve"},{label:"Long Sleeve",href:"/jerseys?style=long-sleeve"}]} />
        <Link href="/equipment" className="nav-button">Equipment</Link>
        <div className="mt-4 space-y-1 border-t border-gray-200 pt-3"><Link href="/account" className="nav-button">My account</Link><Link href="/contact" className="nav-button">Contact us</Link></div>
      </nav>
    </dialog>
  </>;
}
