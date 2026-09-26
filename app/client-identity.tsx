"use client";
// Rediseño v2 (campaña #41 / spec #43 §1): identidad y apariencia del cliente.
// La paleta y el mapeo de color viven en ./client-identity-data (puros).
import {useState,useRef} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Aviso} from 'owncoding-ui';
import {ProfilePhoto} from './profile-photo';
import {actorInitials} from './actor-identity';
import {api} from './operations';
import {notify} from './feedback';
import {CLIENT_COLOR_VALUES,clientColors,identityColor,type ClientColorKey} from './client-identity-data';
import './client-identity.css';
// Se reexporta para no romper imports existentes (production-board usa identityColor).
export {CLIENT_COLOR_VALUES,clientColorLabels,clientColors,identityColor} from './client-identity-data';
export type {ClientColorKey,ClientIdentityRecord} from './client-identity-data';

export function ClientIdentity({name,logo,color,compact=false}:{name:string;logo?:string|null;color?:string|null;compact?:boolean}){
 const [failed,setFailed]=useState('');
 return <span className={`client-identity identity-${identityColor(color)} ${compact?'compact':''} inline-flex min-w-0 items-center gap-2.5 text-fore`}>
  <span className="identity-avatar overflow-hidden" aria-hidden="true">{logo&&logo!==failed?<img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" width={36} height={36} onError={()=>setFailed(logo)}/>:actorInitials(name)}</span>
  <span className="identity-name min-w-0 font-bold leading-snug" title={name}>{name}</span>
 </span>;
}

const schema=z.object({color_key:z.enum(CLIENT_COLOR_VALUES)});
export function ClientAppearance({id,name,logo,color,refresh,showIdentity=true}:{id:string;name:string;logo?:string|null;color?:string|null;refresh:()=>Promise<void>;showIdentity?:boolean}){
 const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{color_key:identityColor(color)}});
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false),pending=useRef(false);
 async function saveColor(value:ClientColorKey){
  if(pending.current||form.getValues('color_key')===value)return;
  const previous=form.getValues('color_key');pending.current=true;setSaving(true);setError('');form.setValue('color_key',value);
  try{const values=schema.parse({color_key:value});await api(`/api/agency/clients/${id}`,values,'PATCH');form.reset(values);notify({tone:'success',message:'Color del cliente guardado.'});try{await refresh();}catch{setError('Color guardado. Actualizá la página para refrescar las otras vistas.');}}
  catch(e){form.setValue('color_key',previous);setError(e instanceof Error?e.message:'No se pudo guardar.');}
  finally{pending.current=false;setSaving(false);}
 }
 const current=form.watch('color_key');
 return <section className="grid gap-4 rounded-xl border border-ink-600 bg-ink-800 p-4 md:grid-cols-2 md:p-5">
  {showIdentity&&<div className="md:col-span-2"><ClientIdentity name={name} logo={logo} color={current}/></div>}
  <ProfilePhoto label="Logo o foto del cliente" name={name} photo={logo||null} save={async photo=>{await api(`/api/agency/clients/${id}`,{logo_url:photo},'PATCH');await refresh();}}/>
  <form noValidate className="grid content-start gap-3" onSubmit={event=>event.preventDefault()}>
   <fieldset disabled={saving} className="min-w-0 border-0 p-0">
    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Color identificador</legend>
    <div className="flex flex-wrap gap-2">
     {clientColors.map(([key,label])=>{const active=current===key;return <label key={key} className={`identity-${key} flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${active?'border-fono/60 bg-fono/10 text-fore':'border-interactivo bg-ink-800 text-mute hover:border-fono/40 hover:text-fore'}`}>
      <input type="radio" name="color_key" value={key} checked={active} disabled={saving} className="sr-only" onChange={()=>void saveColor(key)}/>
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{background:'var(--client-accent)'}} aria-hidden="true"/>
      {label}
     </label>;})}
    </div>
   </fieldset>
   <p className="text-xs leading-5 text-mute">Se guarda al elegir. Identifica al cliente en sus proyectos y piezas; no cambia el estado de producción.</p>
   {error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}
   {saving&&<p role="status" className="text-xs text-mute">Guardando color…</p>}
  </form>
 </section>;
}
