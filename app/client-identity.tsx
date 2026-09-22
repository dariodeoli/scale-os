"use client";
import {useState,useRef} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ProfilePhoto} from './profile-photo';
import {actorInitials} from './actor-identity';
import {api} from './operations';
import {notify} from './feedback';
import {CLIENT_COLOR_VALUES,clientColors,identityColor,type ClientColorKey} from './client-identity-data';
import './client-identity.css';
// La paleta y el mapeo de color viven en ./client-identity-data (puros); se
// reexporta para no romper imports existentes (production-board usa identityColor).
export {CLIENT_COLOR_VALUES,clientColorLabels,clientColors,identityColor} from './client-identity-data';
export type {ClientColorKey,ClientIdentityRecord} from './client-identity-data';
export function ClientIdentity({name,logo,color,compact=false}:{name:string;logo?:string|null;color?:string|null;compact?:boolean}){
 const [failed,setFailed]=useState('');
 return <span className={`client-identity identity-${identityColor(color)} ${compact?'compact':''}`}>
  <span className="identity-avatar" aria-hidden="true">{logo&&logo!==failed?<img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" width={36} height={36} onError={()=>setFailed(logo)}/>:actorInitials(name)}</span>
  <span className="identity-name" title={name}>{name}</span>
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
 return <section className="client-appearance">{showIdentity&&<ClientIdentity name={name} logo={logo} color={form.watch('color_key')}/>}
  <ProfilePhoto label="Logo o foto del cliente" name={name} photo={logo||null} save={async photo=>{await api(`/api/agency/clients/${id}`,{logo_url:photo},'PATCH');await refresh();}}/>
  <form noValidate className="form-stack" onSubmit={event=>event.preventDefault()}>
   <fieldset disabled={saving} className="identity-palette"><legend>Color identificador</legend>{clientColors.map(([key,label])=><label className={`identity-${key}`} key={key}><input type="radio" name="color_key" value={key} checked={form.watch('color_key')===key} onChange={()=>void saveColor(key)}/><span className="color-swatch"/><span>{label}</span></label>)}</fieldset>
   <p className="form-note">Se guarda al elegir. Identifica al cliente en sus proyectos y piezas; no cambia el estado de producción.</p>
   {error&&<p role="alert" className="error">{error}</p>}
   {saving&&<p role="status">Guardando color…</p>}
  </form>
 </section>;
}
