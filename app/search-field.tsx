"use client";

import {forwardRef,useId,useImperativeHandle,useRef} from 'react';
import {Search,X} from 'lucide-react';
import {InputBase,type InputBaseProps} from './ui/input';
import {IconButton} from './ui/button';
import './search-field.css';

export type SearchFieldProps=Omit<InputBaseProps,'type'|'value'|'onChange'> & {label:string;value:string;onChange:(value:string)=>void;hideLabel?:boolean};
export const SearchField=forwardRef<HTMLInputElement,SearchFieldProps>(function SearchField({label,value,onChange,placeholder,disabled=false,pending=false,hideLabel=false,className,id:providedId,...props},forwardedRef){
 const generatedId=useId(),id=providedId||`${generatedId}-input`,input=useRef<HTMLInputElement>(null);
 useImperativeHandle(forwardedRef,()=>input.current!);
 const locked=disabled||pending;
 return <label className={className?`search-field ${className}`:'search-field'} htmlFor={id}>
  <span className={hideLabel?'sr-only':'search-field-label'}>{label}</span>
  <span className="search-field-box"><Search size={16} aria-hidden="true"/><InputBase {...props} ref={input} id={id} type="search" value={value} disabled={locked} pending={pending} placeholder={placeholder} autoComplete="off" onChange={event=>onChange(event.target.value)}/>{value?<IconButton type="button" className="search-field-clear" size="compact" variant="ghost" label={`Limpiar ${label.toLowerCase()}`} icon={<X size={16}/>} disabled={locked} onClick={()=>{onChange('');input.current?.focus();}}/>:null}</span>
 </label>;
});
