"use client";
import React,{useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {usePathname} from 'next/navigation';
import {Menu,X} from 'lucide-react';
import {useOverlay} from './dialog';
import {WorkspaceBrand} from './workspace-brand';

function MobileDrawer({id,close,children}:{id:string;close:()=>void;children:ReactNode}){
 const panel=useRef<HTMLElement>(null);
 useEffect(()=>{
  const shell=document.querySelector<HTMLElement>('.control-shell');
  const wasInert=shell?.inert;
  if(shell)shell.inert=true;
  return()=>{if(shell)shell.inert=wasInert??false;};
 },[]);
 useOverlay(panel,close);
 return createPortal(<div className="mobile-sidebar-backdrop" onClick={event=>{if(event.target===event.currentTarget)close();}}>
  <section id={id} className="mobile-sidebar" ref={panel} role="dialog" aria-modal="true" aria-label="Menú de Scale OS" tabIndex={-1}>
   <div className="mobile-sidebar-heading"><WorkspaceBrand/><button type="button" className="icon-button" onClick={close} aria-label="Cerrar menú"><X size={20}/></button></div>
   <div className="mobile-sidebar-body" onClick={event=>{if((event.target as HTMLElement).closest('a[href]'))close();}}>{children}</div>
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
  <button className="icon-button mobile-menu-trigger" type="button" aria-label="Abrir menú" aria-expanded={open} aria-controls={open?id:undefined} aria-haspopup="dialog" onClick={()=>setOpen(v=>!v)}><Menu size={22}/></button>
  {open&&<MobileDrawer id={id} close={()=>setOpen(false)}>{children}</MobileDrawer>}
 </>;
}
