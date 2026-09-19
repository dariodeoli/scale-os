'use client';
import {useId} from 'react';
import type {Field} from './operations';
import {SelectCustom} from './profile-controls';
import './urgency.css';

export const urgencyChoices=[{value:'',label:'Sin definir'},...['Baja','Moderada','Media','Alta','Crítica'].map((label,index)=>({value:String(index+1),label:`${index+1} · ${label}`}))];
export const urgencyHelp='1 Baja · 2 Moderada · 3 Media · 4 Alta · 5 Crítica. Sin definir no significa urgente. Es independiente de la prioridad, las aprobaciones y la urgencia del proyecto o sus piezas.';
export const urgencyField:Field={key:'urgency',label:'Urgencia',optional:true,choices:urgencyChoices,help:urgencyHelp};
export function UrgencySelect({value,onChange,disabled=false}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const id=useId();
 return <SelectCustom label="Urgencia" choices={urgencyChoices} value={value} disabled={disabled} describedBy={`${id}-help`} onChange={onChange}/>;
}
export function UrgencyBadge({value}:{value:unknown}){
 const label=value===null||value===''?'Sin definir':urgencyChoices.find(choice=>choice.value!==''&&choice.value===String(value))?.label||'No disponible';
 return <small className="urgency-badge">Urgencia: {label}</small>;
}
