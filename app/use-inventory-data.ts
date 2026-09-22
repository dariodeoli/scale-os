"use client";
/**
 * Estado de datos del inventario (dominio OPS, issue #44): catálogo con
 * refresco cada 30 s mientras la pestaña está visible, catálogo y una lectura
 * puntual para la ficha. Toda la lógica vive acá para que el rediseño la
 * reutilice sin tocar la vista.
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {opsMonthRange} from './ops-time';
import type {Category,Context,InventoryItem,InventoryReservation,StorageTemplate} from './inventory-data';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';

export type InventoryCatalog={
 context:Context|null;items:InventoryItem[];categories:Category[];storageTemplates:StorageTemplate[];reservations:InventoryReservation[];
 loading:boolean;error:string;refreshError:string;lastUpdated:Date|null;
 /** Alta en contexto (crear lugar desde el formulario de equipo) sin esperar el próximo ciclo. */
 addStorageTemplate:(location:StorageTemplate)=>void;
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
  async function load(background=false){
   if(!active||running||background&&document.visibilityState==='hidden')return;
   running=true;if(!hasData.current)setLoading(true);
   try{
    // Wait for every request to settle before permitting another polling cycle.
    const results=await Promise.allSettled([api<Context>('/api/agency/inventory-context'),api<{records:InventoryItem[]}>('/api/agency/inventory'),api<{categories:Category[]}>('/api/agency/inventory-categories'),api<{locations:StorageTemplate[]}>('/api/agency/inventory-locations'),api<{reservations:InventoryReservation[]}>(`/api/agency/inventory-reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)]);
    if(!active)return;
    const [c,i,cat,templates,r]=results;
    if(c.status==='rejected')throw c.reason;if(i.status==='rejected')throw i.reason;if(cat.status==='rejected')throw cat.reason;if(templates.status==='rejected')throw templates.reason;if(r.status==='rejected')throw r.reason;
    setContext(c.value);setItems(i.value.records);setCategories(cat.value.categories);setStorageTemplates(templates.value.locations);setReservations(r.value.reservations);
    hasData.current=true;setLastUpdated(new Date());setError('');setRefreshError('');
   }catch(reason){if(active){if(hasData.current)setRefreshError(errorMessage(reason));else setError(errorMessage(reason));}}
   finally{running=false;if(active)setLoading(false);}
  }
  void load();
  const timer=window.setInterval(()=>{void load(true);},30000);
  const visible=()=>{if(document.visibilityState==='visible')void load(true);};
  document.addEventListener('visibilitychange',visible);
  return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[month,refresh]);
 const addStorageTemplate=useCallback((location:StorageTemplate)=>setStorageTemplates(current=>[...current,location]),[]);
 return {context,items,categories,storageTemplates,reservations,loading,error,refreshError,lastUpdated,addStorageTemplate};
}

export type InventoryRecord<T>={data:T|null;error:string};
/** Lectura puntual (ficha y trazabilidad) que se repite cuando cambia el token. */
export function useInventoryRecord<T>(path:string,reload:number):InventoryRecord<T>{
 const [data,setData]=useState<T|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  let alive=true;
  void api<T>(path).then(result=>{if(alive)setData(result);}).catch(cause=>{if(alive)setError(errorMessage(cause));});
  return()=>{alive=false;};
 },[path,reload]);
 return {data,error};
}
