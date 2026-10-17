"use client";
import {Input} from './ui/input';


import {useId,useRef} from 'react';
import {Search,X} from 'lucide-react';
import './search-field.css';

export type SearchFieldProps={
 label?:string;
 /** Nombre accesible cuando la toolbar no muestra una etiqueta visible. */
 ariaLabel?:string;
 value:string;
 /** Contrato de ScaleOS: el consumidor recibe el texto, nunca un evento DOM. */
 onChange:(value:string)=>void;
 placeholder?:string;
 disabled?:boolean;
 hideLabel?:boolean;
 className?:string;
 invalid?:boolean;
 describedBy?:string;
 clearable?:boolean;
};

/** Buscador único de la aplicación: iconos en flujo, etiqueta, limpiar y teclado nativo. */
export function SearchField({label,ariaLabel,value,onChange,placeholder,disabled=false,hideLabel=false,className,invalid=false,describedBy,clearable=true}:SearchFieldProps){
 const id=useId(),input=useRef<HTMLInputElement>(null);
 const accessibleLabel=ariaLabel||label||'Buscar';
 return <div className={className?`search-field ${className}`:'search-field'}>
  <label className={hideLabel||!label?'sr-only':'search-field-label'} htmlFor={`${id}-input`}>{label||accessibleLabel}</label>
  <span className="search-field-box"><Search size={16} aria-hidden="true"/><Input ref={input} id={`${id}-input`} type="search" value={value} disabled={disabled} placeholder={placeholder} aria-label={ariaLabel} aria-invalid={invalid||undefined} aria-describedby={describedBy} autoComplete="off" onChange={event=>{if(!disabled)onChange(event.target.value);}}/>
   {clearable&&value?<button type="button" className="search-field-clear" disabled={disabled} aria-label={`Limpiar: ${accessibleLabel}`} onClick={()=>{if(disabled)return;onChange('');input.current?.focus();}}><X size={16} aria-hidden="true"/></button>:null}
  </span>
 </div>;
}
