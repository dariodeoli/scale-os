"use client";

import {useId} from 'react';
import {Search} from 'lucide-react';
import './search-field.css';

export function SearchField({label,value,onChange,placeholder,disabled=false,hideLabel=false,className}:{label:string;value:string;onChange:(value:string)=>void;placeholder?:string;disabled?:boolean;hideLabel?:boolean;className?:string}){
 const id=useId();
 return <label className={className?`search-field ${className}`:'search-field'} htmlFor={`${id}-input`}>
  <span className={hideLabel?'sr-only':'search-field-label'}>{label}</span>
  <span className="search-field-box"><Search size={16} aria-hidden="true"/><input id={`${id}-input`} type="search" value={value} disabled={disabled} placeholder={placeholder} autoComplete="off" onChange={event=>onChange(event.target.value)}/></span>
 </label>;
}
