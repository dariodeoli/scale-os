"use client";
import {api} from './operations';
import {MENSAJE_RUC,normalizarNombre,normalizeTaxId,taxIdValid} from 'owncoding-ui/core';
import {listDateFull} from './list-format';
import {LookupReview} from './ui/smart-field';

// Consulta de RUC del ClientEditor (#184): una sola tarjeta de confirmación
// para alta y edición. La consulta nunca escribe nada: el nombre legal y el RUC
// del proveedor sólo llegan a la ficha si la persona los confirma con «Aplicar».
// La regla del RUC es la de la librería (#75): normaliza puntos/espacios y valida
// 5–8 dígitos con dígito verificador opcional (nunca se inventa).
export type RucRecord={name:string;tax_id:string;tax_state:string;publication_date:string;source:string};

/** Datos que «Aplicar» vuelca a la ficha: RUC del proveedor y razón social normalizada. */
export function rucApplyValues(record:RucRecord){
 // OwnData entrega nameOfficial de la fuente y se conserva exacto. El proveedor legado mantiene su presentación histórica.
 return {tax_id:record.tax_id,legal_name:record.source==='owndata:dnit_official_snapshot'?record.name:normalizarNombre(record.name,{apellidosPrimero:'sifen'})};
}

/** Consulta al proveedor con el RUC tal como se escribió (sin inventar el dígito verificador). */
export class RucNotFoundError extends Error {}

export async function lookupRuc(raw:string,signal?:AbortSignal):Promise<RucRecord>{
 const ruc=normalizeTaxId(raw)||'';
 if(!taxIdValid(ruc))throw new Error(MENSAJE_RUC);
 const data=await api<{record:RucRecord|null}>('/api/agency/ruc-lookup',{ruc},'POST',{signal});
 if(!data.record)throw new RucNotFoundError('No encontramos una ficha publicada para ese RUC. Podés cargar los datos manualmente.');
 return data.record;
}

export function RucConfirmCard({record,onApply,onDiscard}:{record:RucRecord;onApply:()=>void;onDiscard:()=>void}){
 const name=rucApplyValues(record).legal_name;
 return <LookupReview label="Confirmar datos del RUC" className="client-ruc-inline ops-card grid gap-2" heading={name}
  onApply={onApply} onDiscard={onDiscard}
  description={<>Revisá los datos: se aplican al RUC y la razón social de esta ficha sólo si confirmás. No cambian el nombre comercial, el estado del servicio ni el saldo. Consultamos el RUC sólo para completar la ficha; <a className="text-button" href="/privacidad">Política de Privacidad</a>.</>}>
  <p>RUC: {record.tax_id}</p>
  <small>Estado tributario: {record.tax_state||'No informado'} · Fuente: {record.source||'No informada'} · Publicado: {listDateFull(record.publication_date)||'No informado'}</small>
 </LookupReview>;
}
