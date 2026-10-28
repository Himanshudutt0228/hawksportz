"use client";

import {useEffect,useRef,type CSSProperties,type ReactNode} from "react";

export default function ProductCarousel({children,count}:{children:ReactNode;count:number}) {
  const repeat=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    // Only the original copy participates in keyboard and screen-reader navigation.
    repeat.current?.querySelectorAll<HTMLElement>('a,button,input,select,textarea,[tabindex]').forEach(element=>element.tabIndex=-1);
  },[children]);
  return <div className={`product-belt mt-6 ${count<2?"product-belt-single":""}`} role="region" aria-label="Featured products">
    <div className="product-belt-track" style={{"--belt-duration":`${Math.max(20,count*8)}s`} as CSSProperties}>
      <div className="product-belt-group">{children}</div>
      {count>1&&<div ref={repeat} className="product-belt-group product-belt-repeat" aria-hidden="true">{children}</div>}
    </div>
  </div>;
}
