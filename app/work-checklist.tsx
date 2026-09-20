'use client';

import {useEffect,useId,useRef,useState} from 'react';
import {clearDataCache} from './data-cache';
import {ActorIdentity} from './actor-identity';
import './work-checklist.css';
import {roleCan} from './capabilities';

export type WorkChecklistItem={id:string;text:string;completed:boolean;completed_at?:string|null;completed_by_name?:string|null;completed_by_photo_url?:string|null;completed_by_verified?:boolean;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};
export type WorkChecklistSnapshot={version:string;items:WorkChecklistItem[];total:number;completed:number;max_items:number};
export type WorkChecklistProps={id:string|number;organizationId:string|number;role:string;refresh?:()=>Promise<void>|void};
// Same capabilities the API validates: inventory.view for reads, checklists.edit for writes.
class ChecklistError extends Error {constructor(message:string,readonly status:number){super(message);}}
const message=(error:unknown)=>error instanceof Error?error.message:'No se pudo cargar el checklist';
async function request(path:string,init:RequestInit={}):Promise<WorkChecklistSnapshot>{
 const response=await fetch('/core-api'+path,{credentials:'include',cache:'no-store',...init});
 const data=await response.json();
 if(!response.ok)throw new ChecklistError(typeof data.error==='string'?data.error:'No se pudo guardar el checklist',response.status);
 if(!Array.isArray(data.items)||typeof data.version!=='string')throw Error('No se pudo cargar el checklist');
 return data as WorkChecklistSnapshot;
}
export function WorkChecklist(props:WorkChecklistProps){
 if(!roleCan(props.role,'inventory.view'))return null;
 if(!/^[1-9]\d{0,18}$/.test(String(props.id))||!props.organizationId)return <p role="alert">Pieza inválida.</p>;
 // A new company, piece or effective role discards the previous component's drafts
 // and aborts requests. Never share checklist data through the application cache.
 return <Checklist key={`${props.organizationId}:${props.id}:${props.role}`} {...props}/>;
}
function Checklist({id,role,refresh}:WorkChecklistProps){
 const label=useId(),path=`/api/agency/work-orders/${id}/checklist`,editable=roleCan(role,'checklists.edit');
 const [snapshot,setSnapshot]=useState<WorkChecklistSnapshot|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(''),[edit,setEdit]=useState<{id:string;text:string}|null>(null),[removing,setRemoving]=useState<string|null>(null);
 const [conflict,setConflict]=useState(false),[reload,setReload]=useState(0);
 const generation=useRef(0),saving=useRef(false),controller=useRef<AbortController|null>(null),addInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const current=++generation.current,abort=new AbortController();controller.current=abort;
  setLoading(true);setError('');setNotice('');
  void request(path,{signal:abort.signal}).then(data=>{
   if(generation.current!==current)return;
   setSnapshot(data);setConflict(false);
   if(reload)setNotice('Lista actualizada. Revisá los cambios antes de guardar tu texto pendiente.');
  }).catch(e=>{if(generation.current===current)setError(message(e));})
   .finally(()=>{if(generation.current===current)setLoading(false);});
  return()=>{generation.current++;abort.abort();};
 },[path,reload]);
 const locked=loading||busy||conflict;
 const total=snapshot?.items.length||0,completed=snapshot?.items.filter(item=>item.completed).length||0;
 async function mutate(method:'POST'|'PATCH'|'DELETE',itemId:string|null,changes:Record<string,unknown>={}){
  if(!editable||!snapshot||locked||saving.current)return;
  saving.current=true;setBusy(true);setError('');setNotice('');
  clearDataCache();
  const current=generation.current;
  try{
   const data=await request(`${path}/items${itemId?'/'+itemId:''}`,{method,signal:controller.current?.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({...changes,expected_version:snapshot.version})});
   clearDataCache();
   if(generation.current!==current)return;
   setSnapshot(data);setRemoving(null);
   if(method==='POST')setDraft('');
   if(method==='PATCH'&&'text'in changes)setEdit(null);
   setNotice(method==='DELETE'?'Ítem quitado.':'Checklist guardado.');
   if(method==='DELETE')addInput.current?.focus();
   try{await refresh?.();}catch{if(generation.current===current)setNotice('Checklist guardado. No se pudo actualizar el resto de la vista.');}
  }catch(e){
   if(generation.current!==current)return;
   setError(message(e));
   // Network errors may happen after the server committed. Reload before any
   // retry, so an ambiguous POST cannot silently create a duplicate item.
   setConflict(true);
  }finally{saving.current=false;if(generation.current===current)setBusy(false);}
 }
 function reloadChecklist(){
  if(saving.current)return;
  setRemoving(null);setReload(n=>n+1);
 }
 return <section className="work-checklist" aria-labelledby={`${label}-title`} aria-busy={loading||busy}>
  <div className="work-checklist-heading"><h3 id={`${label}-title`}>Checklist</h3><span aria-live="polite">{completed} de {total}</span></div>
  <progress value={completed} max={Math.max(1,total)} aria-label="Progreso del checklist"/>
  {loading?<p role="status">Cargando checklist…</p>:null}
  {!loading&&snapshot&&!total?<p className="work-checklist-hint">Todavía no hay ítems.</p>:null}
  {snapshot?<ul className="work-checklist-items">{snapshot.items.map(item=><li key={item.id} className={item.completed?'is-complete':''}>
   <div className="work-checklist-item">
    <label className="work-checklist-check"><input type="checkbox" checked={item.completed} disabled={!editable||locked} onChange={event=>{void mutate('PATCH',item.id,{completed:event.target.checked});}}/><span>{item.text}</span></label>
    {item.completed&&item.completed_by_name?<span className="work-checklist-actor" title="Quién completó este ítem">Completado por <ActorIdentity name={item.completed_by_name} photoUrl={item.completed_by_photo_url} verified={item.completed_by_verified===true} timestamp={item.completed_at||undefined}/></span>:null}
    {item.actor_name?<span className="work-checklist-actor" title={`Agregado por ${item.actor_name}`}>por <ActorIdentity name={item.actor_name} photoUrl={item.actor_photo_url} verified={item.actor_verified===true}/></span>:null}
    {editable?<div className="work-checklist-actions"><button type="button" disabled={locked||!!edit} aria-label={`Editar ítem: ${item.text}`} onClick={()=>{setRemoving(null);setEdit({id:item.id,text:item.text});}}>Editar</button><button type="button" disabled={locked||!!edit} aria-label={`Quitar ítem: ${item.text}`} onClick={()=>setRemoving(item.id)}>Quitar</button></div>:null}
   </div>
   {edit?.id===item.id?<div className="work-checklist-editor">
    <label htmlFor={`${label}-edit`}>Texto del ítem</label><input id={`${label}-edit`} autoFocus maxLength={500} value={edit.text} disabled={locked} onChange={event=>setEdit({...edit,text:event.target.value})} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(!busy)setEdit(null);}if(event.key==='Enter'){event.preventDefault();if(edit.text.trim())void mutate('PATCH',item.id,{text:edit.text.trim()});}}}/>
    <div className="work-checklist-actions"><button type="button" disabled={locked||!edit.text.trim()} onClick={()=>{void mutate('PATCH',item.id,{text:edit.text.trim()});}}>Guardar ítem</button><button type="button" disabled={busy} onClick={()=>setEdit(null)}>Cancelar edición</button></div>
   </div>:null}
   {removing===item.id?<div className="work-checklist-confirm" role="group" aria-label="Confirmar eliminación del ítem">
    <p>¿Quitar «{item.text}» del checklist?</p><div className="work-checklist-actions"><button type="button" autoFocus disabled={busy} onClick={()=>setRemoving(null)}>Conservar ítem</button><button type="button" disabled={locked} onClick={()=>{void mutate('DELETE',item.id);}}>Sí, quitar ítem</button></div>
   </div>:null}
  </li>)}</ul>:null}
  {edit&&snapshot&&!snapshot.items.some(item=>item.id===edit.id)?<div className="work-checklist-editor">
   <label htmlFor={`${label}-pending`}>El ítem que editabas fue quitado. Tu texto pendiente:</label>
   <textarea id={`${label}-pending`} readOnly value={edit.text}/>
   <button type="button" onClick={()=>setEdit(null)}>Descartar texto pendiente</button>
  </div>:null}
  {editable&&snapshot?<div className="work-checklist-add">
   <label htmlFor={`${label}-new`}>Nuevo ítem</label><div className="work-checklist-add-row"><input ref={addInput} id={`${label}-new`} maxLength={500} value={draft} disabled={locked||total>=snapshot.max_items} placeholder="Escribí una tarea concreta" onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();if(draft.trim()&&total<snapshot.max_items)void mutate('POST',null,{text:draft.trim()});}}}/>
   <button type="button" disabled={locked||!draft.trim()||total>=snapshot.max_items} onClick={()=>{if(draft.trim()&&total<snapshot.max_items)void mutate('POST',null,{text:draft.trim()});}}>Agregar ítem</button></div>
   {total>=snapshot.max_items?<p className="work-checklist-hint">Máximo {snapshot.max_items} ítems por pieza.</p>:null}
  </div>:null}
  {error?<p role="alert" className="work-checklist-error">{error}</p>:null}
  {conflict?<p className="work-checklist-hint">Recargá y revisá la lista antes de volver a guardar. Tu texto pendiente se conserva.</p>:null}
  {!loading&&(error||conflict)?<button type="button" disabled={busy} onClick={reloadChecklist}>Recargar checklist</button>:null}
  {notice?<p role="status" className="work-checklist-hint">{notice}</p>:null}
 </section>;
}
