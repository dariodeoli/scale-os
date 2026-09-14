"use client";

import './due-date.css';

function localDay(){
 return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function calendarDistance(from:string,to:string){
 return Math.round((Date.parse(`${to}T00:00:00Z`)-Date.parse(`${from}T00:00:00Z`))/86_400_000);
}
export function DueDate({value,compact=false}:{value?:string|null;compact?:boolean}){
 const date=value?.slice(0,10);
 if(!date||!/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
 const distance=calendarDistance(localDay(),date);
 const formatted=new Intl.DateTimeFormat('es-PY',{timeZone:'America/Asuncion',day:'numeric',month:'short',year:'numeric'}).format(new Date(`${date}T12:00:00Z`));
 const relative=distance===0?'vence hoy':distance===1?'falta 1 día':distance>1?`faltan ${distance} días`:distance===-1?'venció ayer':`venció hace ${Math.abs(distance)} días`;
 return <span className={`due-date${distance<0?' overdue':''}${compact?' compact':''}`} title={`Entrega: ${formatted}`}>Entrega {formatted} · {relative}</span>;
}
