"use client";
import {Children,cloneElement,createContext,isValidElement,useContext,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {ButtonHTMLAttributes,ReactNode,RefObject} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {createLayerStack} from './overlay-stack';
import './dialog.css';
const layers=createLayerStack();
let originalOverflow='';
const FooterContext=createContext<HTMLElement|null>(null);
export function useOverlay(panel:RefObject<HTMLElement>,close:()=>void){
 const closeRef=useRef(close);closeRef.current=close;
 useEffect(()=>{
  const id=Symbol('overlay'),previous=document.activeElement as HTMLElement|null;
  if(!layers.size)originalOverflow=document.body.style.overflow;
  layers.add(id);document.body.style.overflow='hidden';
  panel.current?.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')?.focus();
  const keyboard=(event:KeyboardEvent)=>{
   if(event.defaultPrevented||!layers.isTop(id))return;
   if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeRef.current();return;}
   if(event.key==='Tab'){
    const items=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],summary,[tabindex="0"]')||[]).filter(el=>el.getClientRects().length>0);
    const first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();panel.current?.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  document.addEventListener('keydown',keyboard);
  return()=>{layers.remove(id);document.removeEventListener('keydown',keyboard);if(!layers.size)document.body.style.overflow=originalOverflow;if(previous?.isConnected)previous.focus();};
 },[panel]);
}
export function Dialog({title,close,children,variant='modal'}:{title:string;close:()=>void;children:ReactNode;variant?:'modal'|'drawer'}){
 const panel=useRef<HTMLElement>(null),heading=useId();
 const [footer,setFooter]=useState<HTMLDivElement|null>(null);
 useOverlay(panel,close);
 return createPortal(<div className={`ops-overlay${variant==='drawer'?' detail-drawer-overlay':''}`} onMouseDown={event=>{if(event.target===event.currentTarget)close();}}><section className="ops-dialog unified-dialog" ref={panel} role="dialog" aria-modal="true" aria-labelledby={heading} tabIndex={-1}>
  <div className="dialog-heading"><h2 id={heading}>{title}</h2><button className="icon-button" type="button" onClick={close} aria-label="Cerrar"><X size={18}/></button></div>
  <FooterContext.Provider value={footer}><div className="dialog-body">{children}</div></FooterContext.Provider>
  <div className="dialog-footer" ref={setFooter}/>
 </section></div>,document.body);
}
// The footer stays outside the scroll area. Native form association preserves
// validation, keyboard submission and disabled/pending state for the real form.
export function FormActions({children}:{children:ReactNode}){
 const footer=useContext(FooterContext),anchor=useRef<HTMLSpanElement>(null),id=useId();
 const [formId,setFormId]=useState('');
 useLayoutEffect(()=>{const form=anchor.current?.closest('form');if(form){if(!form.id)form.id=id;setFormId(form.id);}},[id]);
 const actions=<div className="dialog-actions">{Children.map(children,child=>isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(child)&&child.type==='button'?cloneElement(child,{form:formId||undefined}):child)}</div>;
 return <><span hidden ref={anchor}/>{footer&&formId?createPortal(actions,footer):actions}</>;
}
