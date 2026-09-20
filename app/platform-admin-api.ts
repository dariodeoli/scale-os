export const platformApiBase='/core-api';
export async function platformApi<T>(path:string,init:RequestInit={}){
 const response=await fetch(platformApiBase+path,{...init,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',...(init.headers||{})}});
 const data=await response.json().catch(()=>({}));
 // El código del API viaja en el error: la UI decide por él (re-autenticación, vista previa).
 if(!response.ok)throw Object.assign(Error(data.error||'No se pudo completar la administración global.'),{status:response.status,code:typeof data.code==='string'?data.code:undefined});
 return data as T;
}
const asuncionZone='America/Asuncion';
function asuncionWall(value:Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:asuncionZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value);
 const part=(type:string)=>parts.find(entry=>entry.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
/** ISO instant to the `datetime-local` value in Asunción wall time. */
export function asuncionInput(value:string){
 if(!value)return '';
 const date=new Date(value);
 return Number.isFinite(date.getTime())?asuncionWall(date):'';
}
export function subscriptionExpiry(value:string){
 if(!value)return null;
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Elegí una fecha y hora de vencimiento válida.');
 const base=Date.parse(`${value}:00Z`);if(!Number.isFinite(base))throw Error('Elegí una fecha y hora de vencimiento válida.');
 let candidate=base;
 for(let attempt=0;attempt<3;attempt++){const wall=Date.parse(`${asuncionWall(new Date(candidate))}:00Z`);candidate+=base-wall;}
 return new Date(candidate).toISOString();
}
