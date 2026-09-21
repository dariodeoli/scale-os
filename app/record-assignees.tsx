'use client';

import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {PersonContainer} from './person-container';
import {AssigneePicker,assigneeSelection,type AssigneeMember,type AssigneeSelection,type AssigneeSnapshot} from './assignee-picker';
import {clearDataCache} from './data-cache';
import {notifyMutation} from './feedback';
import {Pencil,RefreshCw,X} from 'lucide-react';
import {roleCan} from './capabilities';

export type RecordAssigneesProps={
 kind:'projects'|'work-orders';
 id:string|number;
 role:string;
 refresh:()=>Promise<void>|void;
 organizationId?:string|number;
 updatedAt?:string;
 children?:(save:(details:Record<string,string>)=>Promise<void>)=>ReactNode;
};
type Person=Omit<AssigneeMember,'active'>&{active?:boolean};
class RequestError extends Error{constructor(message:string,readonly status:number){super(message);}}
async function request<T>(path:string,init:RequestInit={}):Promise<T>{
 // Version reads must bypass the short-lived application cache, especially after 409.
 const response=await fetch('/core-api'+path,{credentials:'include',cache:'no-store',...init});
 const data=await response.json();
 if(!response.ok)throw new RequestError(typeof data.error==='string'?data.error:'No se pudieron cargar los responsables',response.status);
 return data as T;
}
const message=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';
function same(a:AssigneeSelection,b:AssigneeSelection){
 return a.assigned_user_id===b.assigned_user_id&&a.assigned_user_ids.length===b.assigned_user_ids.length&&a.assigned_user_ids.every(id=>b.assigned_user_ids.includes(id));
}
export function RecordAssignees(props:RecordAssigneesProps){
 if(!roleCan(props.role,'inventory.view'))return null;
 if(!/^\d+$/.test(String(props.id))||!['projects','work-orders'].includes(props.kind))return <p role="alert">Registro inválido.</p>;
 return <RecordAssigneesForm key={`${props.organizationId??''}:${props.kind}:${props.id}:${props.role}`} {...props}/>;
}
function RecordAssigneesForm({kind,id,role,refresh,updatedAt,children}:RecordAssigneesProps){
 const panelId=useId();
 const path=`/api/agency/${kind}/${id}/assignees`;
 // The API gates the assignee write with the record's edit capability.
 // La asignación de responsables sigue a assignees.manage (issue #26), igual que el API.
 const editable=roleCan(role,'assignees.manage');
 const [saved,setSaved]=useState<AssigneeSnapshot|null>(null),[draft,setDraft]=useState<AssigneeSelection>({assigned_user_ids:[],assigned_user_id:null});
 const [members,setMembers]=useState<AssigneeMember[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[conflict,setConflict]=useState(false),[reload,setReload]=useState(0);
 const [expanded,setExpanded]=useState(false);
 const generation=useRef(0),saving=useRef(false),controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  const version=++generation.current,abort=new AbortController();controller.current=abort;
  setLoading(true);setSaved(null);setMembers([]);setError('');setNotice('');setConflict(false);setExpanded(false);
  void Promise.all([
   request<AssigneeSnapshot>(path,{signal:abort.signal}),
   request<{people:Person[]}>('/api/agency/productivity/people',{signal:abort.signal}),
  ]).then(([snapshot,people])=>{
   if(generation.current!==version)return;
   setSaved(snapshot);setDraft(assigneeSelection(snapshot.assigned_user_ids,snapshot.assigned_user_id));
   // productivity/people returns only active memberships; keep defensive flags if supplied.
   setMembers(people.people.map(person=>({...person,active:person.active!==false&&!person.removed_at})));
  }).catch(e=>{if(generation.current===version)setError(message(e));})
   .finally(()=>{if(generation.current===version)setLoading(false);});
  return()=>{generation.current++;abort.abort();};
 },[path,reload]);
 const available=new Set(members.filter(member=>member.active&&!member.removed_at).map(member=>String(member.id)));
 const unavailable=draft.assigned_user_ids.some(person=>!available.has(person));
 const changed=!!saved&&!same(saved,draft);
 async function save(details?:Record<string,string>){
  if(!editable||!saved||loading||conflict||unavailable||saving.current){
   if(details)throw new Error(conflict?'Revisá el conflicto antes de guardar.':'Esperá la carga y revisá los responsables antes de guardar.');
   return;
  }
  if(!details&&!changed)return;
  const version=generation.current,payload={...draft,expected_version:saved.assignee_version};
  saving.current=true;setBusy(true);setError('');setNotice('');clearDataCache();
  try{
   const target=details?path.replace(/\/assignees$/,''):path;
   const body=details?{...details,assignees:payload,expected_updated_at:updatedAt}:payload;
   const response=await request<AssigneeSnapshot&{assignees?:AssigneeSnapshot}>(target,{method:'PATCH',signal:controller.current?.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=details?response.assignees!:response;
   clearDataCache();
   if(generation.current!==version)return;
   setSaved(result);setDraft(assigneeSelection(result.assigned_user_ids,result.assigned_user_id));setNotice('Responsables guardados.');setExpanded(false);
   notifyMutation(target,'PATCH',body,response);
   try{await refresh();}catch{if(generation.current===version)setNotice('Responsables guardados. No se pudo actualizar el resto de la vista; recargala.');}
  }catch(e){
   if(generation.current!==version)return;
   setError(message(e));if(e instanceof RequestError&&e.status===409)setConflict(true);
   if(details)throw e;
  }finally{saving.current=false;if(generation.current===version)setBusy(false);}
 }
 return <section className="record-assignees" aria-label="Asignación de responsables">
  <div className="record-assignees-heading"><strong>Responsables</strong>{editable&&saved?<button type="button" className="text-button" aria-expanded={expanded} aria-controls={panelId} disabled={loading||busy} onClick={()=>{setExpanded(open=>!open);}}><Pencil size={14}/>Cambiar responsables</button>:null}</div>
  {loading?<p role="status">Cargando responsables…</p>:saved?<div className="record-assignees-summary" aria-label="Responsables actuales">{draft.assigned_user_ids.length?draft.assigned_user_ids.map(person=>{
   const member=members.find(member=>String(member.id)===person);
   return <span className="record-assignee-chip" key={person}><PersonContainer size="sm" name={member?.full_name?.trim()||member?.email||'Persona no disponible'} photoUrl={member?.photo_url} secondary={member?.full_name&&member?.email?member.email:undefined} verified/>{draft.assigned_user_id===person?<small>Principal</small>:null}</span>;
  }):<span>Sin responsables asignados.</span>}</div>:null}
  {expanded&&editable&&saved?<div id={panelId} className="record-assignees-editor">
   <AssigneePicker members={members} value={draft} onChange={value=>{setDraft(value);setNotice('');}} disabled={busy||conflict} loading={loading} error={error}/>
   <div className="record-assignees-actions">{children?<small>Los cambios se guardan con Guardar, junto con los detalles.</small>:<button type="button" className="secondary" disabled={loading||busy||conflict||unavailable||!changed} onClick={()=>{void save();}}>{busy?'Guardando…':'Guardar responsables'}</button>}
   <button type="button" className="text-button" disabled={busy} onClick={()=>{setDraft(assigneeSelection(saved.assigned_user_ids,saved.assigned_user_id));setExpanded(false);if(!conflict)setError('');}}><X size={14}/>Cancelar</button></div>
  </div>:error?<p role="alert" className="error">{error}</p>:null}
  {conflict?<p role="status">{children?'El registro cambió. Tu borrador sigue aquí y no se guardó. Conservá los cambios que necesites antes de cerrar y volver a abrir para revisar la versión actual.':'Otra persona cambió la asignación. Recargá para revisar la selección actual antes de guardar.'}</p>:null}
  {!loading&&(!saved||!children&&(conflict||error))?<button type="button" className="text-button" disabled={busy} onClick={()=>{if(!saving.current){setDraft({assigned_user_ids:[],assigned_user_id:null});setReload(value=>value+1);}}}><RefreshCw size={14}/>{conflict?'Recargar responsables':'Reintentar carga'}</button>:null}
  {notice?<p role="status">{notice}</p>:null}
  {children?.(save)}
 </section>;
}
