"use client";
import {Notice as Aviso} from './ui/notice';

import {PendingFields} from './ui/form-state';
import {useDialogPending} from './dialog';
import {Button} from './ui/button';
import {InputControl} from './ui/input-control';
// Rediseño v2 (campaña #41 / spec #43 §1): identidad y apariencia del cliente.
// La paleta y el mapeo de color viven en ./client-identity-data (puros).
import {useState,useRef} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';

import {ProfilePhoto} from './profile-photo';
import {FotoPerfil,type FotoPerfilTamano} from './foto-perfil';
import {api} from './operations';
import {notify} from './feedback';
import {CLIENT_COLOR_VALUES,clientColors,identityColor,clientLegalName,type ClientColorKey} from './client-identity-data';
import './client-identity.css';
// Se reexporta para no romper imports existentes (production-board usa identityColor).
export {CLIENT_COLOR_VALUES,clientColorLabels,clientColors,identityColor} from './client-identity-data';
export type {ClientColorKey,ClientIdentityRecord} from './client-identity-data';

/** Logo de cliente único: círculo, imagen completa e iniciales seguras. */
export function ClientLogo({name,logo,color,size='xl',className=''}:{name:string;logo?:string|null;color?:string|null;size?:FotoPerfilTamano;className?:string}){
 return <FotoPerfil nombre={name} foto={logo} tamano={size} forma="circulo" variante="logo" className={`identity-avatar identity-${identityColor(color)} ${className}`}/>;
}

export function ClientIdentity({name,logo,color,compact=false}:{name:string;logo?:string|null;color?:string|null;compact?:boolean}){
 // El logo del cliente usa el objeto único de foto (#107) en variante logo:
 // se ve entero (`contain`) y conserva el color de identidad del cliente.
 return <span className={`client-identity identity-${identityColor(color)} ${compact?'compact':''} inline-flex min-w-0 items-center gap-2.5 text-fore`}>
  <ClientLogo name={name} logo={logo} color={color}/>
  <span className="identity-name min-w-0 font-bold leading-snug" title={name}>{name}</span>
 </span>;
}

/** Ficha y editor comparten identidad circular y nombres legales alineados. */
export function ClientLegalIdentity({name,legalName,representativeName,linked=false,logo,color,restricted=false}:{name:string;legalName?:string|null;representativeName?:string|null;linked?:boolean;logo?:string|null;color?:string|null;restricted?:boolean}){
 const legal=restricted?name:clientLegalName({name,legal_name:legalName});
 return <div className="flex min-w-0 items-center gap-3" data-testid="client-legal-identity">
  <ClientLogo name={name} logo={logo} color={color}/>
  <dl className="m-0 grid min-w-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
   <div className="min-w-0"><dt className="text-[11px] text-mute">Cliente / empresa</dt><dd className="m-0 break-words text-sm font-semibold text-fore">{legal}</dd>{!restricted&&legal!==name?<p className="m-0 break-words text-xs text-mute">{name}</p>:null}</div>
   <div className="min-w-0"><dt className="text-[11px] text-mute">Responsable legal</dt><dd className="m-0 break-words text-sm font-semibold text-fore">{restricted?'Información reservada':representativeName||'Sin completar'}</dd>{!restricted&&linked?<p className="m-0 text-xs text-mute">Nombre vinculado al cliente</p>:null}</div>
  </dl>
 </div>;
}

const schema=z.object({color_key:z.enum(CLIENT_COLOR_VALUES)});
export function ClientAppearance({id,name,logo,color,refresh,showIdentity=true,legalName,representativeName,linked=false,restricted=false,compact=false}:{id:string;compact?:boolean;name:string;legalName?:string|null;representativeName?:string|null;linked?:boolean;restricted?:boolean;logo?:string|null;color?:string|null;refresh:()=>Promise<void>;showIdentity?:boolean}){
 const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{color_key:identityColor(color)}});
 const [error,setError]=useState(''),[expanded,setExpanded]=useState(!compact);
 const [saving,setSaving]=useState(false),pending=useRef(false);
 const [photoSaving,setPhotoSaving]=useState(false),photoPending=useRef(false);
 const busy=saving||photoSaving;
 useDialogPending(busy,form.formState.isDirty&&!busy);
 async function saveColor(value:ClientColorKey){
  if(pending.current||photoPending.current||form.getValues('color_key')===value)return;
  const previous=form.getValues('color_key');pending.current=true;setSaving(true);setError('');form.setValue('color_key',value,{shouldDirty:true});
  try{const values=schema.parse({color_key:value});await api(`/api/agency/clients/${id}`,values,'PATCH');form.reset(values);notify({tone:'success',message:'Color del cliente guardado.'});try{await refresh();}catch{setError('Color guardado. Actualizá la página para refrescar las otras vistas.');}}
  catch(e){form.setValue('color_key',previous,{shouldDirty:true});setError(e instanceof Error?e.message:'No se pudo guardar.');}
  finally{pending.current=false;setSaving(false);}
 }
 const current=form.watch('color_key');
 return <section className="client-appearance-compact grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-3 sm:grid-cols-2">
  {compact?<div className="flex min-w-0 items-center gap-3 sm:col-span-2"><ClientLogo name={name} logo={logo} color={current} size="md"/><strong className="min-w-0 flex-1 break-words">{name}</strong><Button type="button" variant="ghost" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Cerrar apariencia':'Editar logo y color'}</Button></div>:null}
  {!compact&&showIdentity&&<div className="sm:col-span-2"><ClientLegalIdentity name={name} legalName={legalName} representativeName={representativeName} linked={linked} restricted={restricted} logo={logo} color={current}/></div>}
  {expanded?<><ProfilePhoto disabled={saving} onPendingChange={value=>{photoPending.current=value;setPhotoSaving(value);}} label="Logo o foto del cliente" name={name} photo={logo||null} save={async photo=>{await api(`/api/agency/clients/${id}`,{logo_url:photo},'PATCH');try{await refresh();}catch{notify({tone:'warning',message:'Logo guardado. Actualizá la página para refrescar las otras vistas.'});}}}/>
  <form noValidate aria-busy={busy} className="grid content-start gap-3" onSubmit={event=>event.preventDefault()}>
   <PendingFields pending={busy}><fieldset disabled={busy} className="min-w-0 border-0 p-0">
    <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Color del cliente</legend>
    <div className="flex flex-wrap gap-2">
     {clientColors.map(([key,label])=>{const active=current===key;return <label key={key} className={`identity-${key} flex min-h-9 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition ${active?'border-fono/60 bg-fono/10 text-fore':'border-interactivo bg-ink-800 text-mute hover:border-fono/40 hover:text-fore'}`}>
      <InputControl type="radio" name="color_key" value={key} checked={active} disabled={busy} className="sr-only" onChange={()=>void saveColor(key)}/>
      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{background:'var(--client-accent)'}} aria-hidden="true"/>
      {label}
     </label>;})}
    </div>
   </fieldset></PendingFields>
   <p className="text-xs leading-5 text-mute">El logo y el color se guardan al elegir.</p>
   {error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}
   {saving&&<p role="status" className="text-xs text-mute">Guardando color…</p>}
  </form></>:null}
 </section>;
}
