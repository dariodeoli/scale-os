"use client";

import {diasHasta} from 'owncoding-ui';
import './due-date.css';

const TIME_ZONE='America/Asuncion';
export function DueDate({value,time,compact=false}:{value?:string|null;time?:string|null;compact?:boolean}){
 const date=value?.slice(0,10);
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const distance=diasHasta(date,{timeZone:TIME_ZONE})??0;
 const formatted=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00Z`));
 const clock=time?.slice(0,5);
 const relative=distance===0?'vence hoy':distance===1?'falta 1 día':distance>1?`faltan ${distance} días`:distance===-1?'venció ayer':`venció hace ${Math.abs(distance)} días`;
 return <span className={`due-date${distance<0?' overdue':''}${compact?' compact':''}`} title={`Entrega: ${formatted}${clock?` ${clock}`:''}`}>Entrega {formatted}{clock?` · ${clock} h`:''} · {relative}</span>;
}
