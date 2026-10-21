"use client";
import {dataFetch,friendlyTransportError} from './data-cache';
import {normalizarNombre} from 'owncoding-ui/core';
import {rucLookupInput} from './ruc-validation';
export {rucLookupInput} from './ruc-validation';
import {listDateFull} from './list-format';
import {LookupReview} from './ui/smart-field';

// Consulta de RUC del ClientEditor (#184): una sola tarjeta de confirmación
// para alta y edición. La consulta nunca escribe nada: el nombre legal y el RUC
// del proveedor sólo llegan a la ficha si la persona los confirma con «Aplicar».
// Normalización compartida y validación OwnData: base de 1–9 dígitos,
// con verificación del DV suministrado (nunca se inventa).
export type RucSubjectKind='unknown'|'individual'|'legal_entity';
export type RucRecord={display_name?:string;name:string;tax_id:string;tax_state:string;publication_date:string;source:string};

/** Datos que «Aplicar» vuelca a la ficha: RUC del proveedor y razón social normalizada. */
export function rucApplyValues(record:RucRecord){
 // OwnData entrega nameOfficial de la fuente y se conserva exacto. El proveedor legado mantiene su presentación histórica.
 return {tax_id:record.tax_id,legal_name:record.source==='owndata:dnit_official_snapshot'?record.name:normalizarNombre(record.name,{apellidosPrimero:'sifen'})};
}

/** Consulta al proveedor con el RUC tal como se escribió (sin inventar el dígito verificador). */
export class RucNotFoundError extends Error {}

export class RucLookupError extends Error {
 constructor(message:string,readonly status:number,readonly retryAfter?:number){super(message);this.name='RucLookupError';}
}
let retryAt=0;
export async function lookupRuc(raw:string,signal?:AbortSignal,subjectKind:RucSubjectKind='unknown'):Promise<RucRecord>{
 const ruc=rucLookupInput(raw);
 if(retryAt>Date.now()){const remaining=Math.ceil((retryAt-Date.now())/1000);throw new RucLookupError(`Se alcanzó el límite de consultas. Esperá ${remaining} segundos; podés completar los datos manualmente.`,429,remaining);}
 const response=await dataFetch('/core-api/api/agency/ruc-lookup',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({ruc,...(subjectKind!=='unknown'?{subjectKind}:{})}),signal}).catch(cause=>{throw friendlyTransportError(cause);});
 let data:{record?:RucRecord|null;error?:unknown;retry_after?:unknown};
 try{data=await response.json();}catch{throw new RucLookupError('La consulta no está disponible. Podés completar los datos manualmente.',response.status);}
 if(!response.ok){
  if(response.status===404)throw new RucNotFoundError('No encontramos una ficha publicada para ese RUC. Podés cargar los datos manualmente.');
  const retry=Number(data.retry_after??response.headers.get('Retry-After'));
  const retryAfter=response.status===429&&Number.isInteger(retry)&&retry>=1&&retry<=86400?retry:undefined;
  if(retryAfter)retryAt=Date.now()+retryAfter*1000;
  const message=typeof data.error==='string'?data.error:'No se pudo consultar el RUC. Podés completar los datos manualmente.';
  throw new RucLookupError(message+(retryAfter?` Esperá ${retryAfter} segundos antes de volver a consultar.`:''),response.status,retryAfter);
 }
 if(!data.record)throw new RucNotFoundError('No encontramos una ficha publicada para ese RUC. Podés cargar los datos manualmente.');
 return data.record;
}

export function RucConfirmCard({record,onApply,onDiscard}:{record:RucRecord;onApply:()=>void;onDiscard:()=>void}){
 const name=record.display_name??rucApplyValues(record).legal_name;
 return <LookupReview label="Confirmar datos del RUC" className="client-ruc-inline ops-card grid gap-2" heading={name}
  onApply={onApply} onDiscard={onDiscard}
  description={<>Revisá los datos: se aplican al RUC y la razón social de esta ficha sólo si confirmás. El nombre comercial existente se conserva; si está vacío, se completa con el nombre mostrado. La razón social conserva el nombre oficial. No cambian el estado del servicio ni el saldo. Consultamos el RUC sólo para completar la ficha; <a className="text-button" href="/privacidad">Política de Privacidad</a>.</>}>
  <p>RUC: {record.tax_id}</p>
  {record.display_name?<p>Nombre oficial: {record.name}</p>:null}
  <small>Fuente: {record.source||'No informada'} · Publicado: {listDateFull(record.publication_date)||'No informado'}</small>
 </LookupReview>;
}
