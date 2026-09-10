"use client";
import { useEffect, useLayoutEffect, useId, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import {selectPosition} from './select-position';
import { ChevronDown } from 'lucide-react';
import { displayAmount, normalizeAmount } from './amount-format';

export function AmountInput({ value, currency, onChange }: { value: string; currency: string; onChange: (value: string) => void }) {
  useEffect(() => { if(currency === 'PYG' && value.includes('.')) onChange(value.split('.')[0]); }, [currency, value, onChange]);
  return <input type="text" inputMode="decimal" autoComplete="off" value={displayAmount(value, currency)} placeholder={currency === 'USD' ? '1.250,50' : '4.000.000'} onChange={e => {
    const input=e.currentTarget, right=input.value.length-(input.selectionStart ?? input.value.length);
    onChange(normalizeAmount(input.value,currency));
    requestAnimationFrame(()=> { const caret=Math.max(0,input.value.length-right);input.setSelectionRange(caret,caret); });
  }} />;
}

export function SelectCustom({ label, value, choices, onChange }: { label: string; value: string; choices: {value: string;label: string}[]; onChange: (value: string)=>void }) {
  const [open,setOpen]=useState(false),[query,setQuery]=useState('');const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const id=useId();
  const menu=useRef<HTMLDivElement>(null);
  const [floating,setFloating]=useState<{target:Element;style:ReturnType<typeof selectPosition>}|null>(null);
  const filtered=choices.filter(c=>c.label.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()));
  useEffect(()=>{if(!open)setQuery('');},[open]);
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
    <button type="button" ref={trigger} className="ops-select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)} onKeyDown={e=>{if(!open&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);}}}>
      <span id={`${id}-value`}>{choices.find(c=>String(c.value)===String(value))?.label || 'Seleccionar…'}</span><ChevronDown size={16}/>
    </button>
    {open&&floating&&createPortal(<div className="ops-select-options ops-select-floating" ref={menu} style={floating.style}>
      {choices.length>8&&<input type="search" aria-label={`Buscar ${label.toLowerCase()}`} placeholder="Buscar…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(['Home','End'].includes(e.key))e.stopPropagation();}}/>}
      <div role="listbox" id={id} aria-labelledby={`${id}-label`}>{filtered.map(c=><button type="button" role="option" aria-selected={String(value)===String(c.value)} key={c.value} onClick={()=>{onChange(String(c.value));setOpen(false);trigger.current?.focus();}}>{c.label}</button>)}</div>
      {!filtered.length&&<p>No hay opciones disponibles.</p>}
    </div>,floating.target)}
  </div>;
}
