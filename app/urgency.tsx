'use client';
import {useId} from 'react';
import type {Field} from './operations';
import './urgency.css';

export const urgencyChoices=[{value:'',label:'Sin definir'},...['Baja','Moderada','Media','Alta','Crítica'].map((label,index)=>({value:String(index+1),label:`${index+1} · ${label}`}))];
export const urgencyHelp='1 Baja · 2 Moderada · 3 Media · 4 Alta · 5 Crítica. Sin definir no significa urgente. Es independiente de la prioridad, las aprobaciones y la urgencia del proyecto o sus piezas.';
export const urgencyField:Field={key:'urgency',label:'Urgencia',optional:true,choices:urgencyChoices,help:urgencyHelp};
export function UrgencySelect({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const id=useId();
 return <label className="urgency-field" htmlFor={id}>Urgencia<select id={id} value={value} disabled={disabled} aria-describedby={`${id}-help`} onChange={event=>onChange(event.target.value)}>{urgencyChoices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><small id={`${id}-help`} className="field-help">{urgencyHelp}</small></label>;
}
export function UrgencyBadge({value}:{value:unknown}){
 const label=value===null||value===''?'Sin definir':urgencyChoices.find(choice=>choice.value!==''&&choice.value===String(value))?.label||'No disponible';
 return <small className="urgency-badge">Urgencia: {label}</small>;
}
