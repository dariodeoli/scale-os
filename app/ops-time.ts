/**
 * Tiempo operativo del dominio OPS (issue #44): hora de Asunción en formato de
 * 24 h y conversión entre la hora civil que ve el usuario y el instante UTC que
 * espera el API. Fuente única para inventario, estudio y el calendario de
 * producción; no asume la zona del navegador.
 */
export const OPS_TIME_ZONE='America/Asuncion';

export function opsLocalTime(value:string|Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:OPS_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
// Resolve local wall time using the IANA zone; do not assume the browser's zone.
export function opsUtcTime(local:string){
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local))throw new Error('Completá fecha y hora');
 const base=new Date(local+'Z').getTime();if(!Number.isFinite(base))throw new Error('Fecha inválida');
 let candidate=base;
 for(let i=0;i<3;i++)candidate+=base-new Date(opsLocalTime(new Date(candidate))+'Z').getTime();
 if(opsLocalTime(new Date(candidate))!==local)throw new Error('Esa hora no existe en la zona de Asunción');
 return new Date(candidate).toISOString();
}
/** Rango [desde, hasta) en UTC para un mes civil `AAAA-MM`. */
export function opsMonthRange(month:string){
 const [year,m]=month.split('-').map(Number);
 const next=new Date(Date.UTC(year,m,1)).toISOString().slice(0,7);
 return {from:opsUtcTime(`${month}-01T00:00`),to:opsUtcTime(`${next}-01T00:00`)};
}
