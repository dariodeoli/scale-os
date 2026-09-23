"use client";
/**
 * Estado de datos del inventario (dominio OPS, issue #44): catálogo con
 * refresco cada 30 s mientras la pestaña está visible, catálogo y una lectura
 * puntual para la ficha. Toda la lógica vive acá para que el rediseño la
 * reutilice sin tocar la vista.
 *
 * Robustez (orden del dueño, «No se pudo cargar el inventario»):
 * - Cada sección declara su timeout. El catálogo de equipos viaja con la foto
 *   de cada equipo (150 × 180 KB ≈ 36 MB), así que espera hasta 45 s en vez de
 *   cortar a los 15 s; las secciones livianas conservan el timeout del cliente.
 * - Los fallos se traducen a un mensaje accionable que nombra la sección
 *   (`inventoryErrorText`): nunca más «The operation was aborted due to
 *   timeout» ni «Unexpected token '<'…» en pantalla.
 * - La carga inicial reintenta una vez los fallos transitorios (timeout, red o
 *   respuesta no-JSON) antes de mostrar el estado de error; el reintento manual
 *   sigue disponible desde el propio estado.
 * - El catálogo pide un timeout propio (no comparte la caché de respuestas de
 *   15 s) para no clonar decenas de MB en memoria; el resto sigue cacheado.
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {dataFetch} from './data-cache';
import {opsMonthRange} from './ops-time';
import type {Category,Context,InventoryItem,InventoryReservation,StorageTemplate} from './inventory-data';

/** Timeout del catálogo de equipos: pesa por las fotos de todos los equipos. */
export const CATALOG_TIMEOUT_MS=45000;
const DEFAULT_TIMEOUT_MS=15000;
const RESERVATIONS_TIMEOUT_MS=20000;
const RETRY_DELAY_MS=1200;
const sleep=(ms:number)=>new Promise(resolve=>{window.setTimeout(resolve,ms);});

const isTimeout=(reason:unknown)=>reason instanceof Error&&(reason.name==='TimeoutError'||/aborted due to timeout|signal timed out/i.test(reason.message));
const isNetwork=(reason:unknown)=>reason instanceof TypeError&&/fetch failed|failed to fetch|load failed|network/i.test(reason.message);
const isUnexpectedPayload=(reason:unknown)=>reason instanceof SyntaxError;
/** Fallo transitorio: vale un reintento automático antes de mostrar el error. */
export const isTransientInventoryError=(reason:unknown)=>isTimeout(reason)||isNetwork(reason)||isUnexpectedPayload(reason);
const capitalize=(text:string)=>text.charAt(0).toUpperCase()+text.slice(1);

/** Mensaje accionable: nombra la sección que falló y el motivo real. */
export function inventoryErrorText(reason:unknown,label:string,timeoutMs=DEFAULT_TIMEOUT_MS):string{
 const seconds=Math.max(1,Math.round(timeoutMs/1000));
 if(isTimeout(reason))return capitalize(`${label} tardó más de ${seconds} s en responder con los datos. Reintentá; si sigue igual, avisá a soporte.`);
 if(isNetwork(reason))return capitalize(`no hay conexión con el servidor para ${label}. Revisá tu conexión y reintentá.`);
 if(isUnexpectedPayload(reason))return capitalize(`el servidor devolvió una respuesta inesperada al pedir ${label}. Reintentá; si sigue igual, avisá a soporte.`);
 const message=reason instanceof Error?reason.message.trim():'';
 if(message&&message.length<=160)return capitalize(`${label}: ${message}`);
 return capitalize(`no se pudo cargar ${label}. Reintentá en unos segundos.`);
}

type InventorySection={label:string;timeoutMs:number;path:string};
/**
 * Lectura de una sección. Los endpoints livianos usan `api` (caché de 15 s y
 * aviso de mutaciones); el catálogo —decenas de MB— usa `dataFetch` con su
 * propio timeout y un mensaje que conserva el status del API.
 */
async function fetchInventorySection<T>(section:InventorySection):Promise<T>{
 if(section.timeoutMs===DEFAULT_TIMEOUT_MS)return api<T>(section.path);
 const response=await dataFetch(`/core-api${section.path}`,{credentials:'include',method:'GET',headers:{},signal:AbortSignal.timeout(section.timeoutMs)});
 const raw=await response.text();
 let data:any={};
 try{data=raw?JSON.parse(raw):{};}catch{throw new SyntaxError('El servidor no devolvió JSON');}
 if(!response.ok){
  const message=typeof data?.error==='string'&&data.error?data.error:`El servidor respondió ${response.status}`;
  throw new Error(message);
 }
 return data as T;
}

export type InventoryCatalog={
 context:Context|null;items:InventoryItem[];categories:Category[];storageTemplates:StorageTemplate[];reservations:InventoryReservation[];
 loading:boolean;error:string;refreshError:string;lastUpdated:Date|null;
 /** Alta en contexto (crear lugar desde el formulario de equipo) sin esperar el próximo ciclo. */
 addStorageTemplate:(location:StorageTemplate)=>void;
 /** Movimiento optimista del pipeline: el refresco confirma o la vista revierte. */
 moveItemLocally:(id:string,storageLocationId:string|null,shelf:string)=>void;
};
/**
 * Catálogo completo del mes pedido. Un ciclo de refresco espera las cinco
 * respuestas y no se solapa con el siguiente; si ya hay datos, el error de un
 * refresco no borra la información visible (`refreshError`).
 */
export function useInventoryCatalog(month:string,refresh:number):InventoryCatalog{
 const [context,setContext]=useState<Context|null>(null),[items,setItems]=useState<InventoryItem[]>([]),[categories,setCategories]=useState<Category[]>([]),[storageTemplates,setStorageTemplates]=useState<StorageTemplate[]>([]),[reservations,setReservations]=useState<InventoryReservation[]>([]);
 const [error,setError]=useState(''),[refreshError,setRefreshError]=useState(''),[loading,setLoading]=useState(true),[lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const hasData=useRef(false);
 useEffect(()=>{
  let active=true,running=false;
  const {from,to}=opsMonthRange(month);
  const sections:InventorySection[]=[
   {label:'el contexto de inventario',timeoutMs:DEFAULT_TIMEOUT_MS,path:'/api/agency/inventory-context'},
   {label:'el catálogo de equipos',timeoutMs:CATALOG_TIMEOUT_MS,path:'/api/agency/inventory'},
   {label:'las categorías de inventario',timeoutMs:DEFAULT_TIMEOUT_MS,path:'/api/agency/inventory-categories'},
   {label:'las ubicaciones de guardado',timeoutMs:DEFAULT_TIMEOUT_MS,path:'/api/agency/inventory-locations'},
   {label:'las reservas del mes',timeoutMs:RESERVATIONS_TIMEOUT_MS,path:`/api/agency/inventory-reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`},
  ];
  async function load(background=false){
   if(!active||running||background&&document.visibilityState==='hidden')return;
   running=true;if(!hasData.current)setLoading(true);
   try{
    // Wait for every request to settle before permitting another polling cycle.
    for(let attempt=0;attempt<2;attempt++){
     const results=await Promise.allSettled([
      fetchInventorySection<Context>(sections[0]),
      fetchInventorySection<{records:InventoryItem[]}>(sections[1]),
      fetchInventorySection<{categories:Category[]}>(sections[2]),
      fetchInventorySection<{locations:StorageTemplate[]}>(sections[3]),
      fetchInventorySection<{reservations:InventoryReservation[]}>(sections[4]),
     ] as const);
     if(!active)return;
     const failed=results.findIndex(result=>result.status==='rejected');
     if(failed<0){
      const [c,i,cat,templates,r]=results as [PromiseFulfilledResult<Context>,PromiseFulfilledResult<{records:InventoryItem[]}>,PromiseFulfilledResult<{categories:Category[]}>,PromiseFulfilledResult<{locations:StorageTemplate[]}>,PromiseFulfilledResult<{reservations:InventoryReservation[]}>];
      setContext(c.value);setItems(i.value.records);setCategories(cat.value.categories);setStorageTemplates(templates.value.locations);setReservations(r.value.reservations);
      hasData.current=true;setLastUpdated(new Date());setError('');setRefreshError('');return;
     }
     const reason=(results[failed] as PromiseRejectedResult).reason;
     // Un fallo transitorio en la primera carga se reintenta solo una vez.
     if(attempt===0&&!hasData.current&&isTransientInventoryError(reason)){await sleep(RETRY_DELAY_MS);if(!active)return;continue;}
     const text=inventoryErrorText(reason,sections[failed].label,sections[failed].timeoutMs);
     if(hasData.current)setRefreshError(text);else setError(text);
     return;
    }
   }catch(reason){if(active){const text=inventoryErrorText(reason,'el inventario',DEFAULT_TIMEOUT_MS);if(hasData.current)setRefreshError(text);else setError(text);}}
   finally{running=false;if(active)setLoading(false);}
  }
  void load();
  const timer=window.setInterval(()=>{void load(true);},30000);
  const visible=()=>{if(document.visibilityState==='visible')void load(true);};
  document.addEventListener('visibilitychange',visible);
  return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[month,refresh]);
 const addStorageTemplate=useCallback((location:StorageTemplate)=>setStorageTemplates(current=>[...current,location]),[]);
 const moveItemLocally=useCallback((id:string,storageLocationId:string|null,shelf:string)=>{
  setItems(current=>current.map(item=>String(item.id)===String(id)?{...item,storage_location_id:storageLocationId,storage_shelf:shelf}:item));
 },[]);
 return {context,items,categories,storageTemplates,reservations,loading,error,refreshError,lastUpdated,addStorageTemplate,moveItemLocally};
}

export type InventoryRecord<T>={data:T|null;error:string};
/** Lectura puntual (ficha y trazabilidad) que se repite cuando cambia el token. */
export function useInventoryRecord<T>(path:string,reload:number):InventoryRecord<T>{
 const [data,setData]=useState<T|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  void api<T>(path).then(result=>{if(alive)setData(result);}).catch(cause=>{if(alive)setError(inventoryErrorText(cause,'la ficha del equipo',DEFAULT_TIMEOUT_MS));});
  return()=>{alive=false;};
 },[path,reload]);
 return {data,error};
}
