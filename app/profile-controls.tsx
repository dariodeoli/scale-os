"use client";
import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import {selectPosition} from './select-position';
import { ChevronDown } from 'lucide-react';
import { caretAfterDigits, displayAmount, normalizeAmount } from './amount-format';

const currencyMarks: Record<string, string> = { PYG: 'Gs', USD: 'US$', EUR: '€', BRL: 'R$', ARS: '$', MXN: 'MX$' };
const currencyMark = (currency: string) => currencyMarks[currency] || currency;
export function AmountInput({ value, currency, onChange,disabled=false,id,invalid,describedBy,integerOnly=false,required=false }: { value: string|number; currency: string; onChange: (value: string) => void;disabled?:boolean;id?:string;invalid?:boolean;describedBy?:string;integerOnly?:boolean;required?:boolean }) {
  useEffect(() => { if((currency === 'PYG' || integerOnly) && String(value).includes('.')) onChange(String(value).split('.')[0]); }, [currency, value, onChange, integerOnly]);
  const display = integerOnly ? displayAmount(String(value).split('.')[0], currency) : displayAmount(value, currency);
  const inputRef = useRef<HTMLInputElement>(null);
  return <span className="amount-field" data-currency={currency}>
    <span className="amount-currency" aria-hidden="true">{currencyMark(currency)}</span>
    <input ref={inputRef} id={id} disabled={disabled} required={required} aria-invalid={invalid||undefined} aria-describedby={describedBy} type="text" inputMode={currency === 'PYG' || integerOnly ? 'numeric' : 'decimal'} autoComplete="off" value={display} placeholder={currency === 'PYG' ? '1.000.000' : '1.250,50'} onKeyDown={e => {
      if(e.ctrlKey||e.metaKey||e.altKey)return;
      const allowed = currency === 'PYG' || integerOnly ? '0123456789' : '0123456789.,';
      if(e.key.length===1&&!allowed.includes(e.key))e.preventDefault();
    }} onChange={e => {
      const input=e.currentTarget ?? e.target, digitsBeforeCaret=input.value.slice(0,input.selectionStart ?? input.value.length).replace(/\D/g,'').length;
      const normalized = normalizeAmount(input.value,currency);
      onChange(integerOnly ? normalized.split('.')[0] : normalized);
      if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>{
        const node=inputRef.current;
        if(!node||document.activeElement!==node)return;
        const caret=caretAfterDigits(node.value,digitsBeforeCaret);
        node.setSelectionRange(caret,caret);
      });
    }} />
  </span>;
}

export function SelectCustom({ label, value, choices, onChange,disabled=false,invalid,describedBy }: { label: string; value: string; choices: {value: string;label: string}[]; onChange: (value: string)=>void;disabled?:boolean;invalid?:boolean;describedBy?:string }) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const id=useId();
  const menu=useRef<HTMLDivElement>(null);
  const [floating,setFloating]=useState<{target:Element;style:ReturnType<typeof selectPosition>}|null>(null);
  const filtered=choices.filter(c=>c.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
  const selectedLabel=choices.find(c=>String(c.value)===String(value))?.label||'Seleccionar…';
  useEffect(()=>{if(!open)setQuery('');},[open]);
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  useLayoutEffect(()=>{if(!open){setFloating(null);return;}const update=()=>{if(!trigger.current)return;setFloating({target:root.current?.closest('[role="dialog"]')||document.body,style:selectPosition(trigger.current.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight},Math.min(380,choices.length*44+12+(choices.length>8?48:0)))});};update();window.addEventListener('resize',update);const scroll=(event:Event)=>{if(!menu.current?.contains(event.target as Node))update();};window.addEventListener('scroll',scroll,true);return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',scroll,true);};},[open,choices.length]);
  useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)&&!menu.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[open]);
  const hasFloating=!!floating;
  useEffect(()=>{if(open&&hasFloating)menu.current?.querySelector<HTMLElement>('[aria-selected="true"], [role="option"]')?.focus();},[open,hasFloating]);
  return <div className="ops-select" ref={root} onKeyDown={e=>{
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();}
    if(e.key==='Tab'&&open){setOpen(false);trigger.current?.focus();}
    if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const options=Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')||[]);const current=options.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==='Home'?0:e.key==='End'?options.length-1:(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus();}
  }}>
    <span className="ops-label" id={`${id}-label`}>{label}</span>
    <button type="button" ref={trigger} disabled={disabled} title={selectedLabel} className="ops-select-trigger" aria-invalid={invalid||undefined} aria-describedby={describedBy} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open&&!disabled} aria-controls={open&&!disabled?id:undefined} onClick={()=>{if(!disabled)setOpen(!open);}} onKeyDown={e=>{if(!disabled&&!open&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);}}}>
      <span id={`${id}-value`}>{selectedLabel}</span><ChevronDown size={16}/>
    </button>
    {open&&!disabled&&floating&&createPortal(<div className="ops-select-options ops-select-floating" ref={menu} style={floating.style}>
      {choices.length>8&&<input type="search" aria-label={`Buscar ${label.toLowerCase()}`} placeholder="Buscar…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(['Home','End'].includes(e.key))e.stopPropagation();}}/>}
      <div role="listbox" id={id} aria-labelledby={`${id}-label`}>{filtered.map(c=><button type="button" role="option" aria-selected={String(value)===String(c.value)} key={c.value} onClick={()=>{onChange(String(c.value));setOpen(false);trigger.current?.focus();}}>{c.label}</button>)}</div>
      {!filtered.length&&<p>No hay opciones disponibles.</p>}
    </div>,floating.target)}
  </div>;
}
