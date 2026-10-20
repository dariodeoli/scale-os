"use client";
import {useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {SelectCustom} from './profile-controls';
import {ErrorBlock,LoadingBlock} from './ui-v2';
import {notify} from './feedback';
import type {TeamPermissionPolicy} from './team-permission-policy';

type MemberPermission={id:string;label:string;description:string;defaultAllowed:boolean;override:boolean|null;effectiveAllowed:boolean;canGrant:boolean};
export type MemberPermissionData={member:{id:string;role:string};capabilities:MemberPermission[];policy:TeamPermissionPolicy};
const message=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudieron cargar los permisos individuales.';
export function MemberPermissions({memberId}:{memberId:string}){
 const [data,setData]=useState<MemberPermissionData|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[retry,setRetry]=useState(0);
 const lock=useRef(false);
 useEffect(()=>{let alive=true;setData(null);setError('');void api<MemberPermissionData>(`/api/agency/members/${encodeURIComponent(memberId)}/permissions`).then(next=>{if(String(next.member?.id)!==memberId)throw Error('Los permisos pertenecen a otra persona. Volvé a abrir su ficha.');if(alive)setData(next);}).catch(cause=>{if(alive)setError(message(cause));});return()=>{alive=false;};},[memberId,retry]);
 async function change(row:MemberPermission,value:string){
  if(lock.current||!data?.policy.canManageRoles||!data.policy.grantableCapabilities.includes(row.id)||(!row.canGrant&&value==='true'))return;
  lock.current=true;setBusy(true);setError('');
  try{const next=await api<MemberPermissionData>(`/api/agency/members/${encodeURIComponent(memberId)}/permissions`,{capability:row.id,allowed:value==='inherit'?null:value==='true'},'PATCH');if(String(next.member?.id)!==memberId)throw Error('No se pudo validar la persona modificada. Volvé a cargar.');setData(next);notify({tone:'success',message:'Permiso individual guardado.'});window.dispatchEvent(new Event('scale:identity-changed'));}
  catch(cause){setError(message(cause));}finally{lock.current=false;setBusy(false);}
 }
 return <section className="grid gap-3 rounded-xl border border-ink-600 p-4" aria-label="Permisos individuales" aria-busy={busy}>
  <div><h3 className="m-0 text-sm font-semibold">Permisos individuales</h3><p className="form-note">El valor del cargo se usa salvo que guardes una excepción para esta persona. Sólo se muestran las capacidades que tu cuenta puede administrar.</p></div>
  {error?<ErrorBlock title="No pudimos actualizar los permisos" description={error} onRetry={()=>setRetry(value=>value+1)}/>:null}
  {!data&&!error?<LoadingBlock label="Cargando permisos individuales…" lines={2}/>:null}
  {data?.capabilities.filter(row=>data.policy.grantableCapabilities.includes(row.id)).map(row=>{const editable=data.policy.canManageRoles&&data.policy.grantableCapabilities.includes(row.id);return <div key={row.id} className="grid min-w-0 gap-2 border-t border-ink-600 pt-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center">
   <div className="min-w-0"><b className="text-[13px]">{row.label}</b><p className="form-note">{row.description}</p></div>
   {editable?<SelectCustom label={`Permiso individual: ${row.label}`} value={row.override===null?'inherit':String(row.override)} disabled={busy} choices={[{value:'inherit',label:`Usar cargo (${row.defaultAllowed?'habilitado':'sin permiso'})`},...(row.canGrant?[{value:'true',label:'Habilitado para esta persona'}]:[]),{value:'false',label:'Sin permiso para esta persona'}]} onChange={value=>void change(row,value)}/>:<span className="form-note">{row.effectiveAllowed?'Habilitado':'Sin permiso'}</span>}
  </div>;})}
 </section>;
}
