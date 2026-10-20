'use client';
import {useEffect,useRef,type ComponentProps} from 'react';
import {MenuDesplegable as LibraryMenu} from 'owncoding-ui/core';

/** Same library menu and keyboard contract, promoted above scrolling cards. */
export function MenuDesplegable(props:ComponentProps<typeof LibraryMenu>){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const container=root.current;if(!container)return;
  let popup:HTMLElement|null=null;
  function position(){
   const trigger=container!.querySelector<HTMLElement>('[aria-haspopup="menu"]');
   if(!popup||!trigger)return;
   const rect=trigger.getBoundingClientRect(),width=Math.min(Math.max(popup.scrollWidth,224),window.innerWidth-16);
   const below=window.innerHeight-rect.bottom-12,above=rect.top-12;
   const height=Math.min(popup.scrollHeight,Math.max(below,above),400);
   const top=below>=height?rect.bottom+4:Math.max(8,rect.top-height-4);
   const left=props.alineacion==='left'?rect.left:rect.right-width;
   Object.assign(popup.style,{position:'fixed',inset:'auto',margin:'0',top:`${Math.max(8,top)}px`,left:`${Math.max(8,Math.min(left,window.innerWidth-width-8))}px`,width:`${width}px`,minWidth:'0',maxHeight:`${Math.max(44,height)}px`,overflowY:'auto',zIndex:'1200'});
  }
  function sync(){
   const trigger=container!.querySelector<HTMLElement>('[aria-haspopup="menu"]');
   if(trigger)trigger.setAttribute('aria-label',props.ariaLabel||'Menú');
   const next=container!.querySelector<HTMLElement>('[role="menu"]');
   if(next===popup)return;
   popup=next;if(!popup)return;
   // Popover keeps the library's DOM/focus ancestry while escaping overflow
   // clipping and transformed card/dialog containing blocks. Fixed fallback
   // supports browsers without the top-layer API.
   if(typeof popup.showPopover==='function'){
    popup.setAttribute('popover','manual');
    try{popup.showPopover();}catch{/* Fixed fallback remains usable. */}
   }
   position();
  }
  const observer=new MutationObserver(sync);observer.observe(container,{childList:true,subtree:true});
  window.addEventListener('resize',position);document.addEventListener('scroll',position,true);sync();
  return()=>{observer.disconnect();window.removeEventListener('resize',position);document.removeEventListener('scroll',position,true);};
 },[props.alineacion,props.ariaLabel]);
 return <div ref={root} className="inline-flex min-w-0"><LibraryMenu {...props}/></div>;
}
