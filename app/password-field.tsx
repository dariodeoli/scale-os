"use client";

import {Eye,EyeOff} from 'lucide-react';
import {useState} from 'react';

type PasswordFieldProps={label:string;value:string;onChange:(value:string)=>void;name:string;autoComplete:'new-password'|'current-password';placeholder?:string;required?:boolean;minLength?:number};

/** Shared password input: every access flow gets the same accessible reveal control. */
export function PasswordField({label,value,onChange,name,autoComplete,placeholder,required=false,minLength}:PasswordFieldProps){
 const [visible,setVisible]=useState(false);
 return <label className="password-field"><span>{label}</span><span className="password-field-control"><input name={name} type={visible?'text':'password'} value={value} onChange={event=>onChange(event.target.value)} autoComplete={autoComplete} placeholder={placeholder} required={required} minLength={minLength}/><button type="button" className="password-visibility" aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'} aria-pressed={visible} onClick={()=>setVisible(current=>!current)}>{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label>;
}
