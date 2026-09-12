"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {api,Editor} from './operations';
import {Dialog,FormActions} from './dialog';
import {notify} from './feedback';
const schema=z.object({ruc:z.string().trim().transform(v=>v.replace(/[.\s]/g,'')).refine(v=>/^\d{3,12}(?:-\d)?$/.test(v),'Ingresá un RUC con o sin guion y dígito verificador')});
type Record={name:string;tax_id:string;tax_state:string;publication_date:string;source:string};
type ExistingClient={id:string;name:string;legalName?:string;taxId?:string;onUpdated:()=>Promise<void>|void};
export function ClientRuc({refresh,embedded=false,onCreated,existing}:{refresh:()=>Promise<void>;embedded?:boolean;onCreated?:()=>void;existing?:ExistingClient}){
 const [open,setOpen]=useState(false),[record,setRecord]=useState<Record|null>(null),[error,setError]=useState('');
 const form=useForm<z.input<typeof schema>,unknown,z.output<typeof schema>>({resolver:zodResolver(schema),defaultValues:{ruc:''}});
 function close(){if(form.formState.isSubmitting)return;setOpen(false);setRecord(null);setError('');form.reset();}
 const body=<>
 <p className="form-note">Consultamos el RUC en ruc.sun.com.py. Revisá los datos antes de crear el cliente. No se guardará nada sin tu confirmación. <a href="https://ruc.sun.com.py/api-docs" target="_blank" rel="noreferrer">Ver documentación de la API ↗</a></p>
 {!record?<form noValidate className="form-stack" onSubmit={form.handleSubmit(async value=>{setError('');try{const data=await api<{record:Record}>('/api/agency/ruc-lookup',value);setRecord(data.record);}catch(e){setError(e instanceof Error?e.message:'No se pudo consultar.');}})}><label>RUC<input inputMode="text" autoComplete="off" placeholder="80168807-8" {...form.register('ruc')} aria-invalid={!!form.formState.errors.ruc} aria-describedby="ruc-help"/></label><p id="ruc-help" className="form-note">Podés pegarlo con puntos o espacios. Si tenés solo el número base, lo buscamos sin inventar el dígito verificador. Ejemplo: 80168807-8.</p>{form.formState.errors.ruc&&<p className="error" role="alert">{form.formState.errors.ruc.message}</p>}<FormActions><button className="primary" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?'Consultando…':'Buscar RUC'}</button></FormActions></form>:<>
 <div className="ops-card"><b>{record.name}</b><p>RUC: {record.tax_id}</p><small>Estado tributario: {record.tax_state||'No informado'} · Fuente publicada: {record.publication_date||'No informada'}</small><a href="https://ruc.sun.com.py/api-docs" target="_blank" rel="noreferrer">Fuente y documentación ↗</a></div><p className="form-note">El estado tributario no cambia el estado del servicio ni el saldo del cliente.</p>
 <Editor fields={[{key:'name',label:'Nombre comercial'},{key:'legal_name',label:'Razón social'}]} defaults={{name:existing?.name||record.name.slice(0,120),legal_name:existing?.legalName||record.name}} save={async values=>{if(existing){await api(`/api/agency/clients/${existing.id}`,{...values,tax_id:record.tax_id},'PATCH');notify({tone:'success',message:'Datos del cliente actualizados desde el RUC.'});await refresh();await existing.onUpdated();setRecord(null);form.reset({ruc:record.tax_id});return;}await api('/api/agency/clients/from-ruc',{...values,ruc:record.tax_id});setOpen(false);setRecord(null);form.reset();notify({tone:'success',message:'Cliente creado con los datos confirmados.'});await refresh();onCreated?.();}}/>
 <button type="button" className="text-button" onClick={()=>{setRecord(null);setError('');}}>Consultar otro RUC</button></>}
 {error&&<p className="error" role="alert">{error}</p>}<p className="form-note">Límite gratuito: 100 consultas por mes para esta instalación. Podés seguir creando clientes manualmente si se agota.</p>
 </>;
 if(embedded)return <section className="client-ruc-inline" aria-label={existing?'Actualizar cliente desde RUC':'Completar cliente desde RUC'}><div><strong>{existing?'Actualizar desde RUC':'Completar desde RUC'}</strong><small>{existing?'Consultá, revisá y aplicá razón social y RUC a esta ficha.':'Opcional · verificá razón social antes de crear.'}</small></div>{body}</section>;
 return <><button type="button" className="secondary" onClick={()=>setOpen(true)}>{existing?'Actualizar cliente desde RUC':'Agregar cliente por RUC'}</button>{open&&<Dialog title={existing?'Actualizar cliente desde RUC':'Agregar cliente por RUC'} close={close}>{body}</Dialog>}</>;
}
