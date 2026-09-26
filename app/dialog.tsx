"use client";
import {Children,cloneElement,createContext,isValidElement,useCallback,useContext,useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {ButtonHTMLAttributes,ReactNode,RefObject} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import {createLayerStack} from './overlay-stack';
import './dialog.css';
const layers=createLayerStack();
let originalOverflow='';
const FooterContext=createContext<HTMLElement|null>(null);
const OverlayContext=createContext<symbol[]>([]);
type OverlayEntry={id:symbol;panel:RefObject<HTMLElement>;previous:HTMLElement|null;parents:symbol[]};
const overlays:OverlayEntry[]=[];
const overlayListeners=new Set<()=>void>();
const notifyOverlayChange=()=>{overlayListeners.forEach(listener=>listener());};
const focusSelector='button,input:not([type="hidden"]),select,textarea,a[href],summary,[tabindex],[contenteditable="true"]';
function focusable(panel:HTMLElement|null){
 return Array.from(panel?.querySelectorAll?.<HTMLElement>(focusSelector)||[]).filter(el=>
  el.tabIndex>=0&&!el.matches(':disabled')&&!el.closest('[hidden],[inert]')&&el.getClientRects().length>0&&el.ownerDocument.defaultView?.getComputedStyle(el).visibility!=='hidden'
 ).sort((a,b)=>(a.tabIndex||Infinity)-(b.tabIndex||Infinity));
}
function focusFirst(panel:HTMLElement|null){
 const first=focusable(panel)[0];
 // querySelector fallback also supports useOverlay consumers with minimal host refs.
 (first||(!panel?.querySelectorAll?panel?.querySelector<HTMLElement>(focusSelector):null)||panel)?.focus();
}
type OverlayOptions={busy?:boolean};
function useOverlayState(panel:RefObject<HTMLElement>,close:()=>void,{busy=false}:OverlayOptions={}){
 const id=useRef(Symbol('overlay')).current,parents=useContext(OverlayContext);
 const closeRef=useRef(close),busyRef=useRef(busy);closeRef.current=close;busyRef.current=busy;
 const requestClose=useCallback(()=>{if(layers.isTop(id)&&!busyRef.current)closeRef.current();},[id]);
 // aria-modal belongs to the top layer only; nested dialogs stay mounted until their child closes.
 const [isTop,setIsTop]=useState(true);
 useEffect(()=>{const update=()=>setIsTop(layers.isTop(id));overlayListeners.add(update);update();return()=>{overlayListeners.delete(update);};},[id]);
 useEffect(()=>{
  const element=panel.current;
  const entry:OverlayEntry={id,panel,previous:document.activeElement as HTMLElement|null,parents};
  if(!layers.size)originalOverflow=document.body.style.overflow;
  // React mounts child effects first: insert a late-registering parent below its children.
  const childIndex=overlays.findIndex(item=>item.parents.includes(id));
  if(childIndex>=0)entry.previous=overlays[childIndex].previous;
  overlays.splice(childIndex<0?overlays.length:childIndex,0,entry);
  overlays.forEach(item=>layers.remove(item.id));overlays.forEach(item=>layers.add(item.id));
  notifyOverlayChange();
  document.body.style.overflow='hidden';
  if(layers.isTop(id))focusFirst(panel.current);
  const keyboard=(event:KeyboardEvent)=>{
   if(event.defaultPrevented||!layers.isTop(id))return;
   if(event.key==='Escape'){
    // Native pickers own Escape while focused; their open state is not exposed by the DOM.
    if(event.isComposing||event.repeat||(event.target as HTMLElement|null)?.tagName==='SELECT')return;
    event.preventDefault();event.stopImmediatePropagation();requestClose();return;
   }
   if(event.key==='Tab'){
    const items=focusable(panel.current);
    const first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();panel.current?.focus();return;}
    if(!items.includes(document.activeElement as HTMLElement)){event.preventDefault();(event.shiftKey?last:first)?.focus();}
    else if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
   }
  };
  const containFocus=(event:FocusEvent)=>{if(layers.isTop(id)&&panel.current?.contains&&!panel.current.contains(event.target as Node))focusFirst(panel.current);};
  document.addEventListener('keydown',keyboard);
  document.addEventListener('focusin',containFocus);
  return()=>{
   const wasTop=layers.isTop(id);
   layers.remove(id);overlays.splice(overlays.indexOf(entry),1);
   notifyOverlayChange();
   document.removeEventListener('keydown',keyboard);document.removeEventListener('focusin',containFocus);
   // If a covered parent disappears, retain its external trigger for the surviving child.
   overlays.forEach(item=>{if(element?.contains?.(item.previous))item.previous=entry.previous;});
   if(!layers.size)document.body.style.overflow=originalOverflow;
   if(wasTop){
    const top=overlays.at(-1);
    if(entry.previous?.isConnected&&(!top||top.panel.current?.contains?.(entry.previous)))entry.previous.focus();
    else if(top)focusFirst(top.panel.current);
   }
  };
 },[id,panel,parents,requestClose]);
 return {id,parents,requestClose,isTop};
}
/** Existing photo/navigation consumers may ignore the returned guarded dismiss callback. */
export function useOverlay(panel:RefObject<HTMLElement>,close:()=>void,options:OverlayOptions={}){
 return useOverlayState(panel,close,options).requestClose;
}
type DialogControls={requestClose:()=>void;setPending:(id:symbol,pending:boolean)=>void};
const DialogContext=createContext<DialogControls|null>(null);
/** Opt-in dismissal; undefined for inline forms rendered outside a Dialog. */
export function useDialogClose(){return useContext(DialogContext)?.requestClose;}
/** Each form owns one registration. One idle form cannot unlock another saving form. */
export function useDialogPending(pending:boolean){
 const controls=useContext(DialogContext),id=useRef(Symbol('dialog-form')).current;
 useLayoutEffect(()=>{controls?.setPending(id,pending);return()=>controls?.setPending(id,false);},[controls,id,pending]);
}
export function Dialog({title,close,children,variant='modal',busy=false,size='default'}:{title:string;close:()=>void;children:ReactNode;variant?:'modal'|'drawer';busy?:boolean;size?:'default'|'compact'|'wide'}){
 const panel=useRef<HTMLElement>(null),heading=useId();
 const [footer,setFooter]=useState<HTMLDivElement|null>(null);
 const pendingForms=useRef(new Set<symbol>()),[formBusy,setFormBusy]=useState(false);
 const blocked=busy||formBusy;
 const guardedClose=useCallback(()=>{if(!pendingForms.current.size)close();},[close]);
 // The registry ref releases synchronously in child layout effects, before an Editor's
 // post-save passive effect requests close; rendering aria-busy must not delay it.
 const {id,parents,requestClose,isTop}=useOverlayState(panel,guardedClose,{busy});
 const setPending=useCallback((id:symbol,pending:boolean)=>{if(pending)pendingForms.current.add(id);else pendingForms.current.delete(id);setFormBusy(pendingForms.current.size>0);},[]);
 const controls=useMemo(()=>({requestClose,setPending}),[requestClose,setPending]);
 const ancestry=useMemo(()=>[...parents,id],[parents,id]);
 return createPortal(<div className={`ops-overlay${variant==='drawer'?' detail-drawer-overlay':''}`} onMouseDown={event=>{if(event.target===event.currentTarget&&event.button===0)requestClose();}}><section className="ops-dialog unified-dialog" data-dialog-size={size} ref={panel} role="dialog" aria-modal={isTop?'true':undefined} aria-labelledby={heading} aria-busy={blocked||undefined} tabIndex={-1}>
  <div className="dialog-heading"><h2 id={heading}>{title}</h2><button className="icon-button" type="button" title="Cerrar" onClick={requestClose} disabled={blocked} aria-label="Cerrar"><X size={18}/></button></div>
  <OverlayContext.Provider value={ancestry}><DialogContext.Provider value={controls}><FooterContext.Provider value={footer}><div className="dialog-body">{children}</div></FooterContext.Provider></DialogContext.Provider></OverlayContext.Provider>
  <div className="dialog-footer" ref={setFooter}/>
 </section></div>,document.body);
}
// The footer stays outside the scroll area. Native form association preserves
// validation, keyboard submission and disabled/pending state for the real form.
export function FormActions({children}:{children:ReactNode}){
 const footer=useContext(FooterContext),anchor=useRef<HTMLSpanElement>(null),id=useId();
 const [formId,setFormId]=useState('');
 // The footer is mounted after the form. Re-check when it becomes available so
 // a dialog that closes and reopens immediately never keeps a stale form target.
 useLayoutEffect(()=>{const form=anchor.current?.closest('form');if(!form){setFormId('');return;}if(!form.id)form.id=id;setFormId(form.id);},[id,footer]);
 const actions=<div className="dialog-actions">{Children.map(children,child=>{
  if(!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(child)||child.props.form)return child;
  // Los objetos de la librería (`<Button type="submit">`) también se asocian: sin
  // el atributo `form`, el portal del pie deja el submit fuera del formulario y el
  // clic no guarda. Los `<button>` crudos conservan el comportamiento anterior.
  const associate=child.type==='button'||child.props.type==='submit';
  return associate?cloneElement(child,{form:formId||undefined}):child;
 })}</div>;
 return <><span hidden ref={anchor}/>{footer?createPortal(actions,footer):actions}</>;
}
