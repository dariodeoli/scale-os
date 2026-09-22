"use client";
/** Estado de datos del estudio (dominio OPS, issue #44): contexto, espacios y reservas del mes. */
import {useEffect,useState} from 'react';
import {api} from './operations';
import {studioMonthRange} from './studio-data';
import type {StudioContext,StudioReservation,StudioSpace} from './studio-data';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';

export type StudioCatalog={context:StudioContext|null;spaces:StudioSpace[];reservations:StudioReservation[];loading:boolean;error:string};
export function useStudioCatalog(month:string,refresh:number):StudioCatalog{
 const [context,setContext]=useState<StudioContext|null>(null),[spaces,setSpaces]=useState<StudioSpace[]>([]),[reservations,setReservations]=useState<StudioReservation[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const {from,to}=studioMonthRange(month);
  setLoading(true);
  Promise.all([api<StudioContext>('/api/agency/studio-context'),api<{spaces:StudioSpace[]}>('/api/agency/studio-spaces'),api<{reservations:StudioReservation[]}>(`/api/agency/studio-reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)])
   .then(([current,spaceData,reservationData])=>{if(!active)return;setContext(current);setSpaces(spaceData.spaces);setReservations(reservationData.reservations);setError('');})
   .catch(reason=>{if(active)setError(errorMessage(reason));})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[month,refresh]);
 return {context,spaces,reservations,loading,error};
}
