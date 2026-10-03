"use client";

import {diasHasta} from 'owncoding-ui';
import './due-date.css';

const TIME_ZONE='America/Asuncion';
export function DueDate({value,time,compact=false,done=false}:{value?:string|null;time?:string|null;compact?:boolean;/** Pieza aprobada o publicada: la entrega ya no es una alerta (#151). */done?:boolean}){
 const date=value?.slice(0,10);
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const distance=diasHasta(date,{timeZone:TIME_ZONE})??0;
 const formatted=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00Z`));
 const clock=time?.slice(0,5);
 // Terminada: el vencimiento pasado se lee como cumplido, nunca como alerta roja.
 const relative=done?(distance<0?'entregada':null):distance===0?'vence hoy':distance===1?'falta 1 día':distance>1?`faltan ${distance} días`:distance===-1?'venció ayer':`venció hace ${Math.abs(distance)} días`;
 return <span className={`due-date${!done&&distance<0?' overdue':''}${done?' done':''}${compact?' compact':''}`} title={`Entrega: ${formatted}${clock?` ${clock}`:''}${done?' · pieza terminada':''}`}>Entrega {formatted}{clock?` · ${clock} h`:''}{relative?` · ${relative}`:''}</span>;
}
