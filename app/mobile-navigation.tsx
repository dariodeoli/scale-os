"use client";
import React,{useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {Menu,X} from 'lucide-react';
import {useOverlay} from './dialog';

function MobileDrawer({id,close,children}:{id:string;close:()=>void;children:ReactNode}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{
  const shell=document.querySelector<HTMLElement>('.control-shell');
  const wasInert=shell?.inert;
  if(shell)shell.inert=true;
  return()=>{if(shell)shell.inert=wasInert??false;};
 },[]);
 useOverlay(panel,close);
 return createPortal(<div className="mobile-sidebar-backdrop fixed inset-0 z-40 grid bg-black/50 motion-reduce:transition-none" onClick={event=>{if(event.target===event.currentTarget)close();}}>
  <section id={id} className="mobile-sidebar flex h-[100dvh] w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-ink-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-2xl [&_a]:no-underline [&_.mobile-sidebar-brand]:flex [&_.mobile-sidebar-brand]:items-center [&_.mobile-sidebar-brand]:pb-1" ref={panel} role="dialog" aria-modal="true" aria-label="Menú de Scale OS" tabIndex={-1}>
   <div className="mobile-sidebar-heading sticky -top-4 z-10 -mx-4 flex items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 px-4 pb-3 pt-4 backdrop-blur"><strong className="text-sm font-semibold text-fore">Menú principal</strong><button type="button" className="icon-button !h-11 !w-11" title="Cerrar menú" onClick={close} aria-label="Cerrar menú"><X size={20}/></button></div>
   <div className="mobile-sidebar-body grid min-h-0 content-start gap-1 [&_a]:min-h-11 [&_button]:min-h-11" onClick={event=>{if((event.target as HTMLElement).closest('a[href]'))close();}}>{children}</div>
  </section>
 </div>,document.body);
}

/** Closed by default. Opening the drawer never changes the route or mounts the workspace again. */
export function MobileNavigation({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false),pathname=usePathname(),id=useId();
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{
  const desktop=window.matchMedia('(min-width: 761px)');
  const resized=()=>{if(desktop.matches)setOpen(false);};
  desktop.addEventListener('change',resized);
  return()=>desktop.removeEventListener('change',resized);
 },[]);
 return <>
  <button className="icon-button mobile-menu-trigger hidden h-11 w-11 place-items-center max-md:grid" type="button" title="Abrir menú" aria-label="Abrir menú" aria-expanded={open} aria-controls={open?id:undefined} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}><Menu size={22}/></button>
  {open&&<MobileDrawer id={id} close={()=>setOpen(false)}>{children}</MobileDrawer>}
 </>;
}
