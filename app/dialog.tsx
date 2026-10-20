"use client";
import {InputBase} from './ui/input';
import {Children,Fragment,cloneElement,createContext,isValidElement,useCallback,useContext,useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {ButtonHTMLAttributes,ReactNode,RefObject} from 'react';
import {createPortal} from 'react-dom';
import {dialogFocusContains,dialogFocusableElements} from 'owncoding-ui/core';
import {X} from 'lucide-react';
import {createLayerStack} from './overlay-stack';
import './dialog.css';
import {DialogContext,useDialogClose,type DialogCloseOptions} from './dialog-context';
import {Button as ScaleButton, IconButton as ScaleIconButton} from "./ui/button";

export {useDialogClose,type DialogCloseOptions} from './dialog-context';
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
 return (panel?dialogFocusableElements(panel,focusSelector):[]).filter(el=>
  el.tabIndex>=0&&!el.matches(':disabled')&&!el.closest('[hidden],[inert]')&&el.getClientRects().length>0&&el.ownerDocument.defaultView?.getComputedStyle(el).visibility!=='hidden'
 ).sort((a,b)=>(a.tabIndex||Infinity)-(b.tabIndex||Infinity));
}
function focusContains(panel:HTMLElement|null,target:Node|null){
 return panel?.ownerDocument?.defaultView?.Node?dialogFocusContains(panel,target):!!panel?.contains?.(target);
}
function focusFirst(panel:HTMLElement|null){
 const first=focusable(panel)[0];
 // querySelector fallback also supports useOverlay consumers with minimal host refs.
 (first||(!panel?.querySelectorAll?panel?.querySelector<HTMLElement>(focusSelector):null)||panel)?.focus();
}
// Formularios: el foco inicial va al primer campo del cuerpo (no a «Cerrar»), salvo
// con puntero táctil, donde abrir el teclado al aparecer la hoja tapa el contenido.
const fieldSelector='input,select,textarea,[aria-haspopup="listbox"],[contenteditable="true"]';
export function dialogInitialFocus(panel:HTMLElement|null):HTMLElement|null{
 const body=panel?.querySelector?.<HTMLElement>('.dialog-body');
 if(!body?.classList?.contains('dialog-body'))return null;
 const view=panel?.ownerDocument?.defaultView;
 if(typeof view?.matchMedia==='function'&&view.matchMedia('(pointer: coarse)').matches)return null;
 const items=focusable(body);
 return items.find(el=>el.matches('[data-autofocus]'))||items.find(el=>el.matches(fieldSelector)&&!el.matches('[readonly],[type="search"]'))||null;
}
type OverlayOptions={busy?:boolean;initialFocus?:(panel:HTMLElement|null)=>HTMLElement|null};
function useOverlayState(panel:RefObject<HTMLElement>,close:()=>void,{busy=false,initialFocus}:OverlayOptions={}){
 const initialFocusRef=useRef(initialFocus);initialFocusRef.current=initialFocus;
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
  if(layers.isTop(id)){const field=initialFocusRef.current?.(panel.current);if(field)field.focus();else focusFirst(panel.current);}
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
  const containFocus=(event:FocusEvent)=>{if(layers.isTop(id)&&panel.current?.contains&&!focusContains(panel.current,event.target as Node))focusFirst(panel.current);};
  document.addEventListener('keydown',keyboard);
  document.addEventListener('focusin',containFocus);
  return()=>{
   const wasTop=layers.isTop(id);
   layers.remove(id);overlays.splice(overlays.indexOf(entry),1);
   notifyOverlayChange();
   document.removeEventListener('keydown',keyboard);document.removeEventListener('focusin',containFocus);
   // If a covered parent disappears, retain its external trigger for the surviving child.
   overlays.forEach(item=>{if(focusContains(element,item.previous))item.previous=entry.previous;});
   if(!layers.size)document.body.style.overflow=originalOverflow;
   if(wasTop){
    const top=overlays.at(-1);
    if(entry.previous?.isConnected&&(!top||focusContains(top.panel.current,entry.previous)))entry.previous.focus();
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
/**
 * Each form owns one registration. One idle form cannot unlock another saving form.
 * `dirty`: el formulario tiene cambios sin guardar; Escape, el fondo, «Cerrar» y
 * «Cancelar» piden confirmar antes de descartarlos.
 */
export function useDialogPending(pending:boolean,dirty=false){
 const controls=useContext(DialogContext),id=useRef(Symbol('dialog-form')).current;
 useLayoutEffect(()=>{controls?.setPending(id,pending);return()=>controls?.setPending(id,false);},[controls,id,pending]);
 useLayoutEffect(()=>{controls?.setDirty(id,dirty);return()=>controls?.setDirty(id,false);},[controls,id,dirty]);
}
/** Reflect form failures outside the scroll area, including custom/native forms.
 * The observer reads only the body; its own output never feeds back into it.
 * It announces nothing twice and never moves focus while the user is editing.
 */
function useDialogErrors(panel:RefObject<HTMLElement>){
 const [errors,setErrors]=useState<string[]>([]);
 useEffect(()=>{
  const element=panel.current,body=element?.querySelector<HTMLElement>('.dialog-body');
  if(!element||!body?.querySelectorAll||!element.addEventListener||!body.addEventListener)return;
  let nativeField:HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement|null=null;
  const visible=(node:HTMLElement)=>{
   if(node.closest('[hidden],[inert],[aria-hidden="true"]'))return false;
   for(let parent=node.parentElement;parent&&parent!==body;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!(parent as HTMLDetailsElement).open&&!parent.querySelector('summary')?.contains(node))return false;
   return node.getClientRects().length>0&&node.ownerDocument.defaultView?.getComputedStyle(node).visibility!=='hidden';
  };
  const update=()=>{
   const messages:string[]=[];
   for(const node of body.querySelectorAll<HTMLElement>('[role="alert"],.error')){
    if(!visible(node))continue;
    const parent=node.parentElement?.closest('[role="alert"],.error');
    if(parent&&body.contains(parent)&&visible(parent as HTMLElement))continue;
    const value=node.textContent?.replace(/\s+/g,' ').trim();if(value)messages.push(value);
   }
   if(nativeField?.isConnected&&body.contains(nativeField)&&!nativeField.validity.valid){
    const label=Array.from(nativeField.labels||[]).map(label=>label.textContent?.trim()).filter(Boolean).join(' ')||nativeField.getAttribute('aria-label')||nativeField.name;
    messages.unshift([label,nativeField.validationMessage].filter(Boolean).join(': '));
   }else nativeField=null;
   const next=Array.from(new Set(messages));
   setErrors(current=>current.length===next.length&&current.every((value,index)=>value===next[index])?current:next);
  };
  const invalid=(event:Event)=>{const target=event.target as HTMLInputElement;if(target?.validity&&(!nativeField||nativeField.validity.valid))nativeField=target;update();};
  const Observer=element.ownerDocument.defaultView?.MutationObserver;
  const observer=Observer?new Observer(update):null;
  observer?.observe(body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','role','hidden','open','aria-hidden','aria-invalid']});
  element.addEventListener('invalid',invalid,true);body.addEventListener('input',update);body.addEventListener('change',update);body.addEventListener('toggle',update,true);update();
  return()=>{observer?.disconnect();element.removeEventListener('invalid',invalid,true);body.removeEventListener('input',update);body.removeEventListener('change',update);body.removeEventListener('toggle',update,true);};
 },[panel]);
 return errors;
}
/** Tamaños nombrados (issue #183). `compact` y `wide` se aceptan como alias de `corto` y `amplio`. */
export type DialogSize='corto'|'default'|'amplio'|'drawer';
export const dialogSizeAliases={compact:'corto',wide:'amplio'} as const;
export function dialogSize(size:DialogSize|keyof typeof dialogSizeAliases|undefined):DialogSize{
 return size==='compact'||size==='wide'?dialogSizeAliases[size]:size||'default';
}
export function Dialog({title,close,children,variant='modal',busy=false,size:requestedSize='default'}:{title:string;close:()=>void;children:ReactNode;variant?:'modal'|'drawer';busy?:boolean;size?:DialogSize|keyof typeof dialogSizeAliases}){
 const size=dialogSize(requestedSize),drawer=variant==='drawer'||size==='drawer';
 const panel=useRef<HTMLElement>(null),heading=useId(),errorsId=useId();
 const errors=useDialogErrors(panel);
 const [footer,setFooter]=useState<HTMLDivElement|null>(null);
 const pendingForms=useRef(new Set<symbol>()),[formBusy,setFormBusy]=useState(false);
 const dirtyForms=useRef(new Set<symbol>()),[discardAsked,setDiscardAsked]=useState(false);
 const blocked=busy||formBusy;
 const closeRef=useRef(close);closeRef.current=close;
 const savedClose=useRef(false);
 const guardedClose=useCallback(()=>{if(pendingForms.current.size)return;if(dirtyForms.current.size&&!savedClose.current){setDiscardAsked(true);return;}closeRef.current();},[]);
 // The registry ref releases synchronously in child layout effects, before an Editor's
 // post-save passive effect requests close; rendering aria-busy must not delay it.
 const {id,parents,requestClose,isTop}=useOverlayState(panel,guardedClose,{busy,initialFocus:dialogInitialFocus});
 const setPending=useCallback((id:symbol,pending:boolean)=>{if(pending)pendingForms.current.add(id);else pendingForms.current.delete(id);setFormBusy(pendingForms.current.size>0);},[]);
 const setDirty=useCallback((id:symbol,dirty:boolean)=>{if(dirty)dirtyForms.current.add(id);else dirtyForms.current.delete(id);},[]);
 const contextClose=useCallback((options?:DialogCloseOptions)=>{savedClose.current=options?.afterSave===true;try{requestClose();}finally{savedClose.current=false;}},[requestClose]);
 const controls=useMemo(()=>({requestClose:contextClose,setPending,setDirty}),[contextClose,setPending,setDirty]);
 const ancestry=useMemo(()=>[...parents,id],[parents,id]);
 return createPortal(<div className={`ops-overlay${drawer?' detail-drawer-overlay':''}`} onMouseDown={event=>{if(event.target===event.currentTarget&&event.button===0)requestClose();}}><section className="ops-dialog unified-dialog" data-dialog-size={size} ref={panel} role="dialog" aria-modal={isTop?'true':undefined} aria-labelledby={heading} aria-busy={blocked||undefined} tabIndex={-1}>
  <div className="dialog-heading"><h2 id={heading}>{title}</h2><ScaleIconButton className="icon-button" type="button" title="Cerrar" onClick={requestClose} disabled={blocked} label="Cerrar" icon={<><X size={18}/></>} variant="ghost" size="compact"></ScaleIconButton></div>
  {errors.length>0&&<aside className="dialog-error-summary" aria-labelledby={errorsId} tabIndex={0}><strong id={errorsId}>Revisá el formulario</strong><ul>{errors.map(message=><li key={message}>{message}</li>)}</ul></aside>}
  <OverlayContext.Provider value={ancestry}><DialogContext.Provider value={controls}><FooterContext.Provider value={footer}><div className="dialog-body">{children}</div></FooterContext.Provider></DialogContext.Provider></OverlayContext.Provider>
  <div className="dialog-footer" ref={setFooter}/>
  {discardAsked?<OverlayContext.Provider value={ancestry}><ConfirmDialog title="¿Descartar los cambios?" description="Hay datos sin guardar en este formulario. Si cerrás ahora, se pierden." confirmLabel="Descartar cambios" cancelLabel="Seguir editando" variant="danger" onCancel={()=>setDiscardAsked(false)} onConfirm={()=>{setDiscardAsked(false);dirtyForms.current.clear();closeRef.current();}}/></OverlayContext.Provider>:null}
 </section></div>,document.body);
}
// The footer stays outside the scroll area. Native form association preserves
// validation, keyboard submission and disabled/pending state for the real form.
export function FormActions({children}:{children:ReactNode}){
 const footer=useContext(FooterContext),anchor=useRef<HTMLSpanElement>(null),id=useId();
 const [formId,setFormId]=useState(''),[visible,setVisible]=useState(true);
 // A portal escapes collapsed sections. Keep actions with their form until all
 // logical ancestors are visible, then use the fixed dialog footer. This does
 // not rely on layout rectangles (which are absent in DOM test environments).
 useLayoutEffect(()=>{
  const element=anchor.current;
  if(!element)return;
  const ancestors:HTMLElement[]=[];
  for(let node=element.parentElement;node;node=node.parentElement)ancestors.push(node);
  const update=()=>setVisible(!ancestors.some(node=>node.hidden||node.hasAttribute?.('inert')||node.getAttribute?.('aria-hidden')==='true'||node.tagName==='DETAILS'&&!(node as HTMLDetailsElement).open));
  update();
  const Observer=element.ownerDocument?.defaultView?.MutationObserver;
  const observer=Observer?new Observer(update):null;
  for(const node of ancestors){
   observer?.observe(node,{attributes:true,attributeFilter:['hidden','open','inert','aria-hidden']});
   if(node.tagName==='DETAILS')node.addEventListener('toggle',update);
  }
  return()=>{observer?.disconnect();for(const node of ancestors)if(node.tagName==='DETAILS')node.removeEventListener('toggle',update);};
 },[footer]);
 // The footer is mounted after the form. Re-check when it becomes available so
 // a dialog that closes and reopens immediately never keeps a stale form target.
 useLayoutEffect(()=>{const form=anchor.current?.closest('form');if(!form){setFormId('');return;}if(!form.id)form.id=id;setFormId(form.id);},[id,footer]);
 function associateActions(nodes:ReactNode):ReactNode{return Children.map(nodes,child=>{
  if(!isValidElement<ButtonHTMLAttributes<HTMLButtonElement>>(child))return child;
  if(child.type===Fragment)return cloneElement(child,{},associateActions(child.props.children));
  if(child.props.form!==undefined)return child;
  // Only canonical objects have a known native button contract. Preserve omitted
  // type (native submit) without guessing the DOM rendered by arbitrary wrappers.
  const canonical=child.type===ScaleButton||child.type===ScaleIconButton;
  const associate=child.type==='button'||canonical&&(child.props.type===undefined||child.props.type==='submit');
  return associate?cloneElement(child,{form:formId||undefined}):child;
 });}
 const actions=<div className="dialog-actions">{associateActions(children)}</div>;
 return <><span hidden ref={anchor}/>{footer&&visible?createPortal(actions,footer):actions}</>;
}

/**
 * Confirmación única (issue #183): toda acción destructiva o irreversible pasa por
 * este primitivo, montado sobre `Dialog` (foco atrapado, Escape, `aria-labelledby`,
 * bloqueo mientras `busy`). `requireText` exige tipear la palabra exacta antes de
 * habilitar el botón y solo corresponde a operaciones irreversibles.
 */
export type ConfirmDialogProps={
 open?:boolean;title:string;description?:ReactNode;children?:ReactNode;
 confirmLabel?:string;cancelLabel?:string;variant?:'danger'|'primary';busy?:boolean;error?:string;
 requireText?:string;requireLabel?:string;onCancel:()=>void;onConfirm:()=>void;
};
/** Cancel participates in the same draft/pending guard as X, Escape and backdrop. */
function ConfirmDialogCancel({busy,label}:{busy:boolean;label:string}){
 const requestClose=useDialogClose();
 return <ScaleButton type="button" className="secondary" disabled={busy} onClick={()=>requestClose?.()} variant="secondary">{label}</ScaleButton>;
}
export function ConfirmDialog({open=true,title,description,children,confirmLabel='Confirmar',cancelLabel='Cancelar',variant='primary',busy=false,error,requireText,requireLabel,onCancel,onConfirm}:ConfirmDialogProps){
 const [typed,setTyped]=useState(''),inputId=useId();
 useEffect(()=>{if(!open)setTyped('');},[open]);
 if(!open)return null;
 const blocked=requireText!==undefined&&typed!==requireText;
 return <Dialog title={title} close={onCancel} busy={busy} size="corto">
  <form className="confirm-dialog" data-variant={variant} noValidate onSubmit={event=>{event.preventDefault();if(!busy&&!blocked)onConfirm();}}>
   {description?<div className="confirm-dialog-body">{description}</div>:null}
   {children}
   {requireText!==undefined?<label htmlFor={inputId}><span>{requireLabel||`Escribí ${requireText} para confirmar`}</span><InputBase id={inputId} name="confirmation" value={typed} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={busy} onChange={event=>setTyped(event.target.value)}/></label>:null}
   {error?<p className="error form-error-summary" role="alert" tabIndex={-1}>{error}</p>:null}
   <FormActions>
    <ConfirmDialogCancel busy={busy} label={cancelLabel}/>
    <ScaleButton type="submit" className={variant==='danger'?'secondary danger':'primary'} disabled={busy||blocked} variant={variant==='danger'?'outline':'primary'} color={variant==='danger'?'danger':'brand'}>{busy?'Procesando…':confirmLabel}</ScaleButton>
   </FormActions>
  </form>
 </Dialog>;
}
