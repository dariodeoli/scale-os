"use client";
import {Input} from './ui/input';

import { MoneyInput, BuscadorPersonas } from 'owncoding-ui';
import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import {selectPosition} from './select-position';
import {useDialogClose} from './dialog-context';
import { ChevronDown } from 'lucide-react';

const currencyMarks: Record<string, string> = { PYG: 'Gs', USD: 'US$', EUR: '€', BRL: 'R$', ARS: '$', MXN: 'MX$' };
const currencyMark = (currency: string) => currencyMarks[currency] || currency;
// Guarda de entrada (issue #65): labels o búsquedas `null`/`undefined` no
// pueden tirar `normalize`; se pliegan a texto vacío.
const foldSearch = (value: unknown) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/**
 * Campo de monto de la app: puente sobre `MoneyInput` de owncoding-ui v0.39
 * (#75), que conserva el caret al tipear/pegar, acepta pegado es-PY/en-US y
 * `integerOnly`. La API local (`onChange(value:string)`, `invalid`,
 * `describedBy`, `required`) se mantiene para los consumidores existentes.
 */
export function AmountInput({ value, currency, onChange,disabled=false,id,invalid,describedBy,integerOnly=false,required=false,placeholder='0' }: { value: string|number; currency: string; onChange: (value: string) => void;disabled?:boolean;id?:string;invalid?:boolean;describedBy?:string;integerOnly?:boolean;required?:boolean;placeholder?:string }) {
  return <MoneyInput
    id={id}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    aria-invalid={invalid||undefined}
    aria-describedby={describedBy}
    currency={currency}
    symbol={currencyMark(currency)}
    integerOnly={integerOnly}
    value={value === '' || value === null || value === undefined ? '' : String(value)}
    onValueChange={(next: unknown)=>onChange(next === '' || next === null || next === undefined ? '' : String(next))}
  />;
}

export type SelectChoice={value:string;label:string;photoUrl?:string|null;secondary?:string;searchText?:string;kind?:'person'|'entity';disabled?:boolean};
export type SelectProps={
 label:string;value:string;choices:SelectChoice[];onChange:(value:string)=>void;
 disabled?:boolean;invalid?:boolean;describedBy?:string;
 /** El tipo explícito evita inferir una persona a partir del logo de una entidad. */
 kind?:'person'|'entity';
 /** Estados y búsqueda opt-in del selector simple; PersonSelect conserva su contrato propio. */
 loading?:boolean;error?:string|null;searchable?:boolean;
 loadingText?:string;emptyText?:string;noResultsText?:string;
};
export function SelectCustom(props: SelectProps) {
 const {label,choices}=props;
 const explicitEntity=props.kind==='entity'||choices.some(choice=>choice.kind==='entity');
 const people=props.kind==='person'||(props.kind!=='entity'&&(choices.some(choice=>choice.kind==='person')||(!explicitEntity&&(choices.some(choice=>choice.photoUrl!==undefined)||/persona|custodio|responsable|empleado|integrante|asignad[oa]|vendedor|colaborador/i.test(label)))));
 if(people)return <PersonSelect {...props}/>;
 return <PlainSelect {...props}/>;
}
export function PersonSelect({label,value,choices,onChange,disabled=false,invalid,describedBy}:{label:string;value:string;choices:SelectChoice[];onChange:(value:string)=>void;disabled?:boolean;invalid?:boolean;describedBy?:string}){
 const id=useId(),requestClose=useDialogClose();
 const blank=choices.find(choice=>choice.value==='');
 return <div className="ops-select ops-person-select" onKeyDownCapture={event=>{
  // The library owns Escape while its menu is open. Once closed, preserve the
  // dialog's normal Escape dismissal, including its pending/dirty guards.
  const input=event.target as HTMLElement;
  if(event.key==='Escape'&&requestClose&&input.getAttribute?.('role')==='combobox'&&input.getAttribute('aria-expanded')==='false'){event.preventDefault();event.stopPropagation();requestClose();}
 }} aria-invalid={invalid||undefined} aria-describedby={describedBy}>
  <label className="ops-label" htmlFor={id}>{label}</label>
  <BuscadorPersonas id={id} personas={choices.filter(choice=>choice.value!=='').map(choice=>({id:String(choice.value),nombre:choice.label,fotoUrl:choice.photoUrl,detalle:choice.secondary,email:choice.searchText}))} valor={String(value)} onCambiar={person=>onChange(person?.id?String(person.id):'')} placeholder={blank?.label||'Buscar persona…'} opcionVacia={blank?.label} ariaLabel={label} etiquetaLista={label} avatarSeleccionado desplegable maxResultados={Math.max(30,choices.length)} disabled={disabled}/>
 </div>;
}
/** Salida del portal al orden de tabulación del formulario, nunca de vuelta al trigger. */
function adjacentControl(trigger:HTMLElement,menu:HTMLElement|null,backward:boolean):HTMLElement|undefined {
 const controls=Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]')).filter(control=>
  control.tabIndex>=0&&!control.hasAttribute('disabled')&&!control.closest('[hidden],[inert],[aria-hidden="true"]')&&!menu?.contains(control)&&control.getClientRects().length>0);
 const index=controls.indexOf(trigger);
 return index<0?undefined:controls[index+(backward?-1:1)];
}
function ChoiceContent({choice}:{choice:SelectChoice}){
 return <span className="ops-select-choice-identity">
  {choice.photoUrl&&<img src={choice.photoUrl} alt="" aria-hidden="true" width={24} height={24} className={choice.kind==='entity'?'ops-select-entity-logo':'ops-select-choice-avatar'}/>}
  <span><span>{choice.label}</span>{choice.secondary&&<small className="ops-select-choice-secondary">{choice.secondary}</small>}</span>
 </span>;
}
function PlainSelect({label,value,choices,onChange,disabled=false,invalid,describedBy,loading=false,error,searchable,loadingText='Cargando opciones…',emptyText='No hay opciones disponibles.',noResultsText='No hay coincidencias.'}:SelectProps) {
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),id=useId();
 const [floating,setFloating]=useState<{target:Element;style:ReturnType<typeof selectPosition>}|null>(null);
 const filtered=choices.filter(choice=>foldSearch([choice.label,choice.secondary,choice.searchText].filter(Boolean).join(' ')).includes(foldSearch(query)));
 const selected=choices.find(choice=>String(choice.value)===String(value)),selectedLabel=selected?.label||'Seleccionar…';
 const hasSearch=searchable??choices.length>8,blocked=loading||Boolean(error);
 useEffect(()=>{if(!open)setQuery('');},[open]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useLayoutEffect(()=>{
  if(!open){setFloating(null);return;}
  const update=()=>{if(!trigger.current)return;setFloating({target:root.current?.closest('[role="dialog"]')||document.body,style:selectPosition(trigger.current.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight},Math.min(380,Math.max(80,choices.length*44+12+(hasSearch?48:0))))});};
  update();window.addEventListener('resize',update);
  const scroll=(event:Event)=>{if(!menu.current?.contains(event.target as Node))update();};
  window.addEventListener('scroll',scroll,true);
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',scroll,true);};
 },[open,choices.length,hasSearch]);
 useEffect(()=>{if(!open)return;const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)&&!menu.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
 const hasFloating=!!floating;
 useEffect(()=>{
  if(open&&hasFloating&&!blocked){
   const preferred=menu.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]:not([disabled])')||menu.current?.querySelector<HTMLElement>('[role="option"]:not([disabled])');
   preferred?.focus();
  }
 },[open,hasFloating,blocked]);
 return <div className="ops-select" ref={root} onKeyDown={event=>{
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}
  if(event.key==='Tab'&&open){
   const next=trigger.current?adjacentControl(trigger.current,menu.current,event.shiftKey):undefined;
   if(next){event.preventDefault();next.focus();}
   setOpen(false);
  }
  if(open&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();
   const options=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])')||[]);
   if(!options.length)return;
   const current=options.indexOf(document.activeElement as HTMLButtonElement);
   const next=event.key==='Home'?0:event.key==='End'?options.length-1:current<0?(event.key==='ArrowUp'?options.length-1:0):(current+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;
   options[next]?.focus();
  }
 }}>
  <span className="ops-label" id={`${id}-label`}>{label}</span>
  <button type="button" ref={trigger} disabled={disabled} title={selectedLabel} className="ops-select-trigger" aria-invalid={invalid||undefined} aria-describedby={describedBy} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open&&!disabled} aria-controls={open&&!disabled?id:undefined} onClick={()=>{if(!disabled)setOpen(!open);}} onKeyDown={event=>{if(!disabled&&!open&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}}}>
   <span id={`${id}-value`}>{selected&&(selected.photoUrl||selected.secondary)?<ChoiceContent choice={selected}/>:selectedLabel}</span><ChevronDown size={16}/>
  </button>
  {open&&!disabled&&floating&&createPortal(<div className="ops-select-options ops-select-floating" ref={menu} style={floating.style}>
   {hasSearch&&<Input type="search" aria-label={`Buscar ${label.toLowerCase()}`} placeholder="Buscar…" value={query} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(['Home','End'].includes(event.key))event.stopPropagation();}}/>}
   <div role="listbox" id={id} aria-labelledby={`${id}-label`} aria-busy={loading||undefined}>
    {!blocked&&filtered.map(choice=><button type="button" role="option" disabled={choice.disabled} aria-disabled={choice.disabled||undefined} aria-selected={String(value)===String(choice.value)} key={choice.value} onClick={()=>{if(choice.disabled||blocked)return;onChange(String(choice.value));setOpen(false);trigger.current?.focus();}}>{choice.photoUrl||choice.secondary?<ChoiceContent choice={choice}/>:choice.label}</button>)}
   </div>
   {loading?<p role="status">{loadingText}</p>:error?<p role="alert">{error}</p>:!filtered.length?<p role="status">{choices.length?noResultsText:emptyText}</p>:null}
  </div>,floating.target)}
 </div>;
}
