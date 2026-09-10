"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {ProfilePhoto} from './profile-photo';
import {api} from './operations';
import {notify} from './feedback';
import './client-identity.css';

export const clientColors=[['violet','Violeta'],['blue','Azul'],['teal','Turquesa'],['green','Verde'],['gold','Dorado'],['rose','Rosa'],['slate','Gris']] as const;
export function identityColor(value?:string|null){return clientColors.some(([key])=>key===value)?value!:'violet';}
export function ClientIdentity({name,logo,color,compact=false}:{name:string;logo?:string|null;color?:string|null;compact?:boolean}){
 const [failed,setFailed]=useState('');
 return <span className={`client-identity identity-${identityColor(color)} ${compact?'compact':''}`}>
  <span className="identity-avatar" aria-hidden="true">{logo&&logo!==failed?<img src={logo} alt="" loading="lazy" width={36} height={36} onError={()=>setFailed(logo)}/>:name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('').toUpperCase()}</span>
  <span className="identity-name">{name}</span>
 </span>;
}
const schema=z.object({color_key:z.enum(['violet','blue','teal','green','gold','rose','slate'])});
export function ClientAppearance({id,name,logo,color,refresh}:{id:string;name:string;logo?:string|null;color?:string|null;refresh:()=>Promise<void>}){
 const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema),defaultValues:{color_key:identityColor(color) as z.infer<typeof schema>['color_key']}});
 const [error,setError]=useState('');
 return <section className="client-appearance"><ClientIdentity name={name} logo={logo} color={form.watch('color_key')}/>
  <ProfilePhoto label="Logo o foto del cliente" name={name} photo={logo||null} save={async photo=>{await api(`/api/agency/clients/${id}`,{logo_url:photo},'PATCH');await refresh();}}/>
  <form noValidate className="form-stack" onSubmit={form.handleSubmit(async v=>{setError('');try{await api(`/api/agency/clients/${id}`,v,'PATCH');await refresh();form.reset(v);notify({tone:'success',message:'Color del cliente guardado.'});}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar.');}})}>
   <fieldset className="identity-palette"><legend>Color identificador</legend>{clientColors.map(([key,label])=><label className={`identity-${key}`} key={key}><input type="radio" value={key} {...form.register('color_key')}/><span className="color-swatch"/><span>{label}</span></label>)}</fieldset>
   <p className="form-note">Identifica al cliente en sus proyectos y piezas. No cambia el estado de producción.</p>
   {error&&<p role="alert" className="error">{error}</p>}
   <button className="secondary" disabled={form.formState.isSubmitting||!form.formState.isDirty}>{form.formState.isSubmitting?'Guardando…':'Guardar color'}</button>
  </form>
 </section>;
}
