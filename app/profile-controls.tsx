"use client";
import { useEffect, useId, useRef, useState } from 'react';
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
  const [open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null);const trigger=useRef<HTMLButtonElement>(null);const id=useId();
  useEffect(()=>{if(!open)return;const close=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};document.addEventListener('pointerdown',close);root.current?.querySelector<HTMLElement>('[aria-selected="true"], [role="option"]')?.focus();return()=>document.removeEventListener('pointerdown',close);},[open]);
  return <div className="ops-select" ref={root} onKeyDown={e=>{
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();}
    if(e.key==='Tab')setOpen(false);
    if(open&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();const options=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')||[]);const current=options.indexOf(document.activeElement as HTMLButtonElement);const next=e.key==='Home'?0:e.key==='End'?options.length-1:(current+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus();}
  }}>
    <span className="ops-label" id={`${id}-label`}>{label}</span>
    <button type="button" ref={trigger} className="ops-select-trigger" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>setOpen(!open)} onKeyDown={e=>{if(!open&&['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true);}}}>
      <span id={`${id}-value`}>{choices.find(c=>String(c.value)===String(value))?.label || 'Seleccionar…'}</span><ChevronDown size={16}/>
    </button>
    {open&&<div role="listbox" id={id} aria-labelledby={`${id}-label`} className="ops-select-options">
      {choices.map(c=><button type="button" role="option" aria-selected={String(value)===String(c.value)} key={c.value} onClick={()=>{onChange(String(c.value));setOpen(false);trigger.current?.focus();}}>{c.label}</button>)}
      {!choices.length&&<p>No hay opciones disponibles.</p>}
    </div>}
  </div>;
}
