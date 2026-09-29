/** Short-lived session-only cache. Never persists credentials or tenant data to disk. */
let scope='',generation=0;
const entries=new Map<string,{expires:number;response:Response}>();
const pending=new Map<string,Promise<Response>>();
export function clearDataCache(){generation++;entries.clear();pending.clear();}
export function setDataScope(next:string){if(next!==scope){scope=next;clearDataCache();}}
export function hasDataScope(expected:string){return !!expected&&scope===expected;}
function subscriptionResponse(response:Response){
 if(response.status===402){clearDataCache();if(typeof window!=='undefined')window.dispatchEvent(new Event('scale:billing-refresh'));}
}
/**
 * Traduce el fallo del transporte a un mensaje accionable en es-PY: la red no
 * se muestra cruda («Failed to fetch») y el timeout tampoco queda en inglés.
 * Las cancelaciones (`AbortError`) se conservan tal cual: quien cancela ya sabe.
 */
export function friendlyTransportError(cause:unknown):Error{
 if(cause instanceof Error){
  if(cause.name==='AbortError')return cause;
  if(cause.name==='TimeoutError'||/timeout|timed out/i.test(cause.message))return new Error('El servidor tardó demasiado. Probá de nuevo.');
  if(cause.name==='TypeError'||/failed to fetch|load failed|network ?error|fetch failed/i.test(cause.message))return new Error('Sin conexión con el servidor. Revisá tu conexión y probá de nuevo.');
  return cause;
 }
 return new Error('No se pudo completar la operación. Probá de nuevo.');
}
const transport=(url:string,init:RequestInit)=>fetch(url,init).catch(cause=>{throw friendlyTransportError(cause);});
export async function dataFetch(url:string,init:RequestInit={}):Promise<Response>{
 const method=(init.method||'GET').toUpperCase();
 // Explicit fresh reads (especially edit versions) must never join a cached read.
 // These permission-bearing and versioned inventory responses are never retained.
 const cacheable=method==='GET'&&!!scope&&url.startsWith('/core-api/api/agency/')&&
  !init.signal&&(!init.cache||init.cache==='default')&&
  (!init.credentials||init.credentials==='include')&&Array.from(new Headers(init.headers)).length===0&&
  !/\/members|\/team|\/settings|\/activity|\/notifications|\/inventory-context|\/inventory-reservations|\/custodians|\/productivity\/people/.test(url);
 if(method!=='GET'){clearDataCache();if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('scale:data-mutated',{detail:{url}}));}
 if(!cacheable){const response=await transport(url,{...init,signal:init.signal??AbortSignal.timeout(15000)});subscriptionResponse(response);if(method!=='GET'||response.status===401||response.status===403)clearDataCache();return response;}
 const key=scope+':'+url,now=Date.now(),cached=entries.get(key);
 if(cached&&cached.expires>now)return cached.response.clone();
 const inflight=pending.get(key);if(inflight)return (await inflight).clone();
 const version=generation;
 const work=transport(url,{...init,signal:init.signal??AbortSignal.timeout(15000)}).then(response=>{
  subscriptionResponse(response);
  if(response.status===401||response.status===403)clearDataCache();
  if(response.ok&&version===generation){if(entries.size>=80)entries.delete(entries.keys().next().value!);entries.set(key,{expires:Date.now()+15000,response:response.clone()});}
  return response;
 });
 pending.set(key,work);
 try{return (await work).clone();}finally{if(pending.get(key)===work)pending.delete(key);}
}
