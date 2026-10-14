// Acciones en lote del directorio de clientes (#184 C5): exportación CSV del
// lado del cliente y asignación de plan de servicio. Funciones puras salvo la
// descarga y las llamadas al API, que se inyectan para poder probarlas.
import type {Client,ClientPaymentStatus} from './workspace-types';
import {csvCell} from './csv-safety';

export type ClientActivity={projects:number;pieces:number;nextDue:string|null};
export type CsvOptions={canSeeContact:boolean;canSeeBilling:boolean;payments:ClientPaymentStatus[];activity:Map<string,ClientActivity>;stateLabel:(client:Client)=>string};

// Evita la inyección de fórmulas al abrir el CSV en una planilla (=, +, -, @):
// helper compartido (app/csv-safety.ts); números y teléfono normalizado pasan tal cual.
const cell=(value:unknown)=>csvCell(value);

/** Columnas visibles según el rol: sin permiso de contacto no viajan correo, teléfono ni RUC; sin cobros, tampoco la mora. */
export function clientCsvColumns({canSeeContact,canSeeBilling}:Pick<CsvOptions,'canSeeContact'|'canSeeBilling'>){
  return ['Cliente',...(canSeeContact?['Correo','Teléfono','RUC','Razón social']:[]),'Estado',...(canSeeBilling?['Estado de cobro','Días de mora','Saldo pendiente','Moneda']:[]),'Proyectos activos','Piezas en curso','Próxima entrega'];
}

export function clientsCsv(clients:Client[],options:CsvOptions){
  const {canSeeContact,canSeeBilling,payments,activity,stateLabel}=options;
  const header=clientCsvColumns(options);
  const rows=clients.map(client=>{
    const restricted=(client as {contact_restricted?:boolean}).contact_restricted===true;
    const pay=payments.find(item=>String(item.client_id)===String(client.id));
    const stat=activity.get(String(client.id));
    return [
      client.name,
      ...(canSeeContact?[restricted?'':client.email||'',restricted?'':client.phone||'',restricted?'':client.tax_id||'',restricted?'':client.legal_name||'']:[]),
      stateLabel(client),
      ...(canSeeBilling?[pay?.payment_status||'',pay?pay.days_overdue:'',pay&&Number(pay.outstanding_amount)>0?Number(pay.outstanding_amount):'',pay?.currency||'']:[]),
      stat?.projects??0,
      stat?.pieces??0,
      stat?.nextDue?String(stat.nextDue).slice(0,10):'',
    ].map(cell).join(',');
  });
  return [header.map(cell).join(','),...rows].join('\r\n');
}

/** Descarga un CSV UTF-8 (con BOM para que la planilla respete los acentos). */
export function downloadCsv(filename:string,csv:string){
  if(typeof document==='undefined'||typeof URL==='undefined'||typeof URL.createObjectURL!=='function')return false;
  const url=URL.createObjectURL(new Blob(['﻿',csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),0);
  return true;
}

type Call=<T>(path:string,body?:unknown,method?:string)=>Promise<T>;
type ReportingMeta={reporting:{version:string};plans:{id:string;name:string}[]};

/** Planes de servicio asignables (los de la empresa), leídos del primer cliente del lote. */
export async function loadServicePlans(call:Call,clientId:string){
  return (await call<ReportingMeta>(`/api/agency/clients/${clientId}/reporting`)).plans;
}

/**
 * Asigna el plan de servicio cliente por cliente (no hay endpoint por lote):
 * cada PATCH lleva la versión vigente del cliente. Un fallo no frena al resto.
 */
export async function assignServicePlan(call:Call,ids:string[],servicePlanId:string){
  const failed:{id:string;message:string}[]=[];
  let updated=0;
  for(const id of ids){
    try{
      const meta=await call<ReportingMeta>(`/api/agency/clients/${id}/reporting`);
      await call(`/api/agency/clients/${id}/reporting`,{expectedVersion:meta.reporting.version,servicePlanId},'PATCH');
      updated+=1;
    }catch(cause){failed.push({id,message:cause instanceof Error?cause.message:'No se pudo asignar el plan.'});}
  }
  return {updated,failed};
}
