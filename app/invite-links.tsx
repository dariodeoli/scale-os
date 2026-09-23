"use client";
import {useEffect,useMemo,useState} from 'react';
import {api,Editor} from './operations';
import {teamRoleLabels} from './team-directory';
import {dueTone,listDateShort} from './list-format';
import {Copy,Link2,Trash2,UserCheck,X} from 'lucide-react';
import {ActorIdentity} from './actor-identity';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,PageHeader,StateChip} from './ui-v2';

type ActorFields={actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};
type LinkRow=ActorFields&{id:string;role:string;mode:string;expires_at:string;revoked_at:string|null;used_at:string|null;click_count:number;account_count:number;url:string|null;created_by_email:string;joined_users:Array<ActorFields&{email:string;full_name:string;joined_at:string}>};
type RequestRow=ActorFields&{id:string;full_name:string;email:string;role:string;created_at:string;status:'pending'|'unavailable';unavailableReason:string|null};
const unavailableLabels:Record<string,string>={revoked:'El enlace fue revocado.',expired:'El enlace venció.',used:'El enlace ya fue utilizado.',organization_unavailable:'La empresa no está disponible.',existing_access:'La persona ya tiene un registro de acceso. Administralo desde Equipo.'};

/** Plantillas v2: encabezado y filas comparten una sola grilla por lista (fila finita 44–52 px). */
const REQUESTS_TEMPLATE='grid-cols-[minmax(11rem,1.5fr)_minmax(12rem,1.5fr)_6.5rem_7.5rem_5.5rem_14rem]';
const REQUESTS_COLUMNS=[{key:'person',label:'Persona'},{key:'email',label:'Correo'},{key:'role',label:'Rol'},{key:'status',label:'Estado'},{key:'date',label:'Fecha'},{key:'actions',label:'Acciones'}];
const LINKS_TEMPLATE='grid-cols-[minmax(12rem,1.6fr)_8rem_minmax(11rem,1.2fr)_minmax(10rem,1.2fr)_12rem]';
const LINKS_COLUMNS=[{key:'link',label:'Enlace'},{key:'status',label:'Estado'},{key:'activity',label:'Actividad'},{key:'author',label:'Autor'},{key:'actions',label:'Acciones'}];

/** Densidad de fila finita: la identidad compartida usa avatar chico y sin relleno extra. */
const ROW_DENSITY='[&_.actor-identity]:py-0.5 [&_.actor-identity-name]:truncate md:[&_.actor-identity-avatar]:h-6 md:[&_.actor-identity-avatar]:w-6 md:[&_.actor-identity-avatar]:flex-none';

const joinedText=(users:LinkRow['joined_users'])=>users.map(person=>`${person.actor_name||person.full_name||person.email}${person.joined_at?` (${listDateShort(person.joined_at)})`:''}`).join(', ');
function linkState(link:LinkRow){if(link.revoked_at)return{tone:'bad' as const,label:'Revocado'};if(link.used_at)return{tone:'info' as const,label:'Utilizado'};const date=listDateShort(link.expires_at);return{tone:dueTone(link.expires_at)?'warn' as const:'ok' as const,label:date?`Vence ${date}`:'Sin fecha'};}

export function InviteLinks({role}:{role:string}){
 const [links,setLinks]=useState<LinkRow[]>([]),[requests,setRequests]=useState<RequestRow[]>([]),[created,setCreated]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[copied,setCopied]=useState('');
 const [loading,setLoading]=useState(true);
 async function load(){try{const [a,b]=await Promise.all([api<{links:LinkRow[]}>('/api/agency/invite-links'),api<{requests:RequestRow[]}>('/api/agency/access-requests')]);setLinks(a.links);setRequests(b.requests);setError('');}catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la información de invitaciones.');}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function act(path:string,data:unknown,method='POST'){setBusy(true);try{await api(path,data,method);await load();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy(false);}}
 const activeLinks=useMemo(()=>links.filter(link=>!link.revoked_at&&!link.used_at).length,[links]);
 const joined=useMemo(()=>links.reduce((total,link)=>total+(link.joined_users?.length||0),0),[links]);
 const pending=requests.filter(request=>request.status==='pending').length;
 return <section className="grid gap-4" aria-label="Invitaciones y solicitudes">
  <PageHeader eyebrow="Equipo" title="Invitaciones y solicitudes" subtitle="Atendé las solicitudes pendientes, generá enlaces temporales y limpiá los que ya cumplieron su ciclo."/>
  {error?<ErrorBlock title="No pudimos completar la operación" description={error} onRetry={()=>void load()}/>:null}
  <KpiStrip>
   <Kpi label="Solicitudes pendientes" valor={pending} hint="Esperan aprobación o rechazo" destacado/>
   <Kpi label="Enlaces activos" valor={activeLinks} hint="Sin revocar ni usar"/>
   <Kpi label="Personas unidas" valor={joined} hint="Ingresaron con un enlace"/>
  </KpiStrip>
  {loading?<LoadingBlock label="Cargando invitaciones…" lines={3}/>:<>
   <div className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="invite-requests-heading">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div className="min-w-0"><h3 id="invite-requests-heading" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fore"><UserCheck size={18} aria-hidden="true"/> Solicitudes</h3><p className="mt-1 text-xs text-mute">Aprobá solo los accesos disponibles; el estado actual lo confirma el API.</p></div>
     <span className="whitespace-nowrap text-xs tabular-nums text-mute">{pending} de {requests.length} pendientes</span>
    </div>
    {!requests.length?<EmptyBlock compact title="No hay solicitudes pendientes" description="Cuando alguien pida acceso con un enlace de aprobación, aparece acá."/>:
     <ListGrid label="Solicitudes de acceso" template={REQUESTS_TEMPLATE} columns={REQUESTS_COLUMNS} minWidthClass="min-w-[60rem]">
      {requests.map(request=>{
       const unavailable=request.status!=='pending';
       const reason=unavailable?(unavailableLabels[request.unavailableReason||'']||'Actualizá la lista para comprobar la invitación.'):'';
       return <ListRow key={request.id} template={REQUESTS_TEMPLATE} className={ROW_DENSITY}>
        <ActorIdentity name={request.actor_name||request.full_name||request.email} photoUrl={request.actor_photo_url} verified={request.actor_verified===true}/>
        <span className="min-w-0 truncate text-[12px] text-mute" title={request.email}>{request.email}</span>
        <span className="whitespace-nowrap text-[12.5px] text-fore">{teamRoleLabels[request.role]||request.role}</span>
        <span className="flex min-w-0 items-center gap-2">
         <StateChip tone={unavailable?'mute':'info'}>{unavailable?'No disponible':'Pendiente'}</StateChip>
         {reason?<span className="min-w-0 truncate text-[11.5px] text-mute" title={reason}>{reason}</span>:null}
        </span>
        <span className="whitespace-nowrap text-[12px] tabular-nums text-mute">{listDateShort(request.created_at)||'Sin fecha'}</span>
        <span className="flex min-w-0 items-center justify-end gap-1 whitespace-nowrap">
         {request.status==='pending'&&<button className="text-button positive" disabled={busy||(request.role==='owner'&&role!=='owner')} onClick={()=>act(`/api/agency/access-requests/${request.id}`,{action:'approve'},'PATCH')}>Aprobar acceso</button>}
         <button className="text-button danger" disabled={busy||(request.role==='owner'&&role!=='owner')} onClick={()=>act(`/api/agency/access-requests/${request.id}`,{action:'reject'},'PATCH')}><X size={14} aria-hidden="true"/>Rechazar</button>
        </span>
       </ListRow>;})}
     </ListGrid>}
   </div>
   <div className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
    <div className="min-w-0"><h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fore"><Link2 size={18} aria-hidden="true"/> Crear enlace</h3><p className="mt-1 text-xs text-mute">Elegí el permiso y el tipo. El enlace vence a los 7 días o al primer uso, según el modo.</p></div>
    <Editor columns fields={[{key:'role',label:'Permiso del enlace',choices:Object.entries(teamRoleLabels).filter(([value])=>value!=='owner'||role==='owner').map(([value,label])=>({value,label}))},{key:'mode',label:'Tipo de invitación',choices:[{value:'single',label:'Una persona · un solo uso'},{value:'approval',label:'Varias personas · requiere aprobación'}]}]} defaults={{role:'viewer',mode:'single'}} label="Generar enlace" save={async values=>{const result=await api<{url:string}>('/api/agency/invite-links',values);setCreated(result.url);setCopied('');await load();}}/>
    {created?<div role="status" className="grid gap-2 rounded-lg border border-ink-600 px-3 py-2"><label className="grid gap-1.5 text-xs text-mute">Enlace generado<input readOnly className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 font-mono text-xs text-fore" value={created} onFocus={e=>e.target.select()}/></label><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(created);setCopied(created);setTimeout(()=>setCopied(''),1800);}catch{setError('Seleccioná el enlace y copialo manualmente.');}}}><Copy size={16} aria-hidden="true"/>{copied===created?'Copiado':'Copiar enlace'}</button></div>:null}
   </div>
   <div className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
     <div className="min-w-0"><h3 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-fore"><Link2 size={18} aria-hidden="true"/> Enlaces recientes</h3><p className="mt-1 text-xs text-mute">Los enlaces agotados o revocados se pueden eliminar; los que tuvieron ingresos conservan su historial.</p></div>
     <span className="whitespace-nowrap text-xs tabular-nums text-mute">{links.length} enlace{links.length===1?'':'s'}</span>
    </div>
    {!links.length?<EmptyBlock compact title="Todavía no creaste enlaces" description="Generá uno cuando necesites sumar a alguien."/>:
     <ListGrid label="Enlaces de invitación" template={LINKS_TEMPLATE} columns={LINKS_COLUMNS} minWidthClass="min-w-[56rem]">
      {links.map(link=>{const state=linkState(link);const joinedUsers=link.joined_users||[];const activity=`${link.click_count} clics · ${link.account_count} cuentas creadas · ${joinedUsers.length?`${joinedUsers.length} unidos`:'Nadie se unió todavía'}`;return <ListRow key={link.id} template={LINKS_TEMPLATE} className={ROW_DENSITY}>
       <strong className="min-w-0 truncate text-[13.5px] font-semibold text-fore" title={`${teamRoleLabels[link.role]||link.role} · ${link.mode==='single'?'Un solo uso':'Con aprobación'}`}>{teamRoleLabels[link.role]||link.role} · {link.mode==='single'?'Un solo uso':'Con aprobación'}</strong>
       <StateChip tone={state.tone}>{state.label}</StateChip>
       <span className="min-w-0 truncate text-[11.5px] tabular-nums text-mute" title={joinedUsers.length?`${activity} · Se unieron ${joinedText(joinedUsers)}`:activity}>{activity}</span>
       <ActorIdentity name={link.actor_name||link.created_by_email||'El equipo'} photoUrl={link.actor_photo_url} verified={link.actor_verified===true}/>
       <span className="flex min-w-0 items-center justify-end gap-1 whitespace-nowrap">
        {link.url?<button className="text-button" disabled={busy} onClick={async()=>{try{await navigator.clipboard.writeText(link.url!);setCopied(link.url!);setTimeout(()=>setCopied(''),1800);}catch{setError('Seleccioná el enlace y copialo manualmente.');}}}><Copy size={14} aria-hidden="true"/>{copied===link.url?'Copiado':'Copiar enlace'}</button>:null}
        {!joinedUsers.length&&(link.revoked_at||link.used_at?<button className="text-button" disabled={busy} onClick={()=>act(`/api/agency/invite-links/${link.id}?permanent=1`,{},'DELETE')}><Trash2 size={14} aria-hidden="true"/>Eliminar</button>:<button className="text-button" disabled={busy} onClick={()=>act(`/api/agency/invite-links/${link.id}`,{},'DELETE')}><X size={14} aria-hidden="true"/>Revocar</button>)}
       </span>
      </ListRow>;})}
     </ListGrid>}
   </div>
  </>}
 </section>;
}
