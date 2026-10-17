"use client";
import {useEffect,useRef,useState} from 'react';
import {api,ApiFieldError,Editor,type Field} from './operations';
import {Dialog,ConfirmDialog} from './dialog';
import {Button} from './ui/button';
import {notify} from './feedback';

export type ClientContact={id:string;name:string;role:string;email:string|null;phone:string|null;version:number};
const CONTACTS_CHANGED='scale:client-contacts-changed';
const fields:Field[]=[
 {key:'name',label:'Nombre del contacto',maxLength:120},
 {key:'role',label:'Rol o cargo',maxLength:120,optional:true},
 {key:'email',label:'Correo',type:'email',optional:true},
 {key:'phone',label:'Teléfono',type:'phone',optional:true},
];
const message=(error:unknown)=>error instanceof Error?error.message:'No se pudieron consultar los contactos';
const defaults=(record:ClientContact|null)=>({name:record?.name||'',role:record?.role||'',email:record?.email||'',phone:record?.phone||''});

/** Los contactos son hijos de la ficha; el correo/teléfono principal se conserva. */
export function ClientContacts(props:{clientId:string;restricted?:boolean}){return <ContactDirectory key={props.clientId} {...props}/>;}
function ContactDirectory({clientId,restricted=false}:{clientId:string;restricted?:boolean}){
 const [contacts,setContacts]=useState<ClientContact[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[denied,setDenied]=useState(false),[hasMore,setHasMore]=useState(false),[offset,setOffset]=useState(0),[reload,setReload]=useState(0);
 const [editing,setEditing]=useState<ClientContact|'new'|null>(null),[removing,setRemoving]=useState<ClientContact|null>(null),[pending,setPending]=useState(false);
 const generation=useRef(0),flight=useRef(false);
 const root=`/api/agency/clients/${clientId}/contacts`;
 const refresh=()=>{setOffset(0);setReload(value=>value+1);};
 const changed=()=>{refresh();window.dispatchEvent(new CustomEvent(CONTACTS_CHANGED,{detail:{clientId}}));};
 useEffect(()=>{const update=(event:Event)=>{if((event as CustomEvent<{clientId:string}>).detail?.clientId===clientId)refresh();};window.addEventListener(CONTACTS_CHANGED,update);return()=>window.removeEventListener(CONTACTS_CHANGED,update);},[clientId]);
 useEffect(()=>{
  const version=++generation.current,controller=new AbortController();
  setDenied(false);setError('');
  if(restricted){setContacts([]);setLoading(false);return()=>controller.abort();}
  setLoading(true);
  void api<{contacts:ClientContact[];page:{has_more:boolean}}>(`${root}?limit=50&offset=${offset}`,undefined,'GET',{signal:controller.signal}).then(data=>{
   if(controller.signal.aborted||version!==generation.current)return;
   if(!Array.isArray(data.contacts)||typeof data.page?.has_more!=='boolean')throw Error('La respuesta de contactos no es válida. Recargá para intentarlo nuevamente.');
   setContacts(previous=>offset?[...previous,...data.contacts]:data.contacts);setHasMore(data.page.has_more);
  }).catch(cause=>{
   if(controller.signal.aborted||version!==generation.current)return;
   if(cause instanceof ApiFieldError&&cause.status===403){setDenied(true);setContacts([]);}else setError(message(cause));
  }).finally(()=>{if(!controller.signal.aborted&&version===generation.current)setLoading(false);});
  return()=>controller.abort();
 },[clientId,restricted,offset,reload]);
 if(restricted||denied)return <section className="ops-card"><h3>Contactos</h3><p className="form-note">Contactos reservados a quienes gestionan clientes.</p></section>;
 async function remove(){
  if(!removing||flight.current)return;flight.current=true;setPending(true);setError('');
  try{await api(`${root}/${removing.id}`,{expected_version:removing.version},'DELETE');setRemoving(null);changed();notify({message:'Contacto eliminado',tone:'success'});}
  catch(cause){setError(message(cause));setRemoving(null);}finally{flight.current=false;setPending(false);}
 }
 return <section className="ops-card grid min-w-0 gap-3" aria-label="Contactos del cliente">
  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2"><h3>Contactos</h3><Button type="button" variant="secondary" disabled={loading||pending} onClick={()=>setEditing('new')}>Agregar contacto</Button></div>
  <p className="form-note">Personas para coordinar el servicio. Agregar, editar o eliminar aquí no cambia el correo ni el teléfono principal del cliente.</p>
  {error?<div><p role="alert" className="error">{error}</p><Button type="button" variant="ghost" onClick={refresh}>Recargar contactos</Button></div>:null}
  {loading?<p role="status">Cargando contactos…</p>:null}
  {!loading&&!error&&!contacts.length?<p className="empty-copy">Este cliente todavía no tiene contactos adicionales.</p>:null}
  <ul className="grid min-w-0 gap-2">{contacts.map(contact=><li key={contact.id} className="ops-card grid min-w-0 gap-2">
   <div className="min-w-0 [overflow-wrap:anywhere]"><strong>{contact.name}</strong>{contact.role?<p>{contact.role}</p>:null}<p>{[contact.email,contact.phone].filter(Boolean).join(' · ')||'Sin correo ni teléfono'}</p></div>
   <div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" disabled={pending} onClick={()=>setEditing(contact)} aria-label={`Editar contacto: ${contact.name}`}>Editar</Button><Button type="button" variant="ghost" color="danger" disabled={pending} onClick={()=>setRemoving(contact)} aria-label={`Eliminar contacto: ${contact.name}`}>Eliminar</Button></div>
  </li>)}</ul>
  {hasMore?<Button type="button" variant="secondary" disabled={loading} onClick={()=>setOffset(contacts.length)}>Cargar más contactos</Button>:null}
  {editing?<ContactEditor key={editing==='new'?'new':editing.id} root={root} record={editing==='new'?null:editing} close={()=>setEditing(null)} saved={()=>{setEditing(null);changed();}}/>:null}
  {removing?<ConfirmDialog title="Eliminar contacto" description="Se elimina sólo este contacto adicional. La ficha y su contacto principal se conservan." confirmLabel="Eliminar contacto" variant="danger" busy={pending} onCancel={()=>setRemoving(null)} onConfirm={()=>void remove()}/>:null}
 </section>;
}
function ContactEditor({root,record,close,saved}:{root:string;record:ClientContact|null;close:()=>void;saved:()=>void}){
 const [current,setCurrent]=useState(record),[conflict,setConflict]=useState(false),[error,setError]=useState(''),[reloadReview,setReloadReview]=useState(false),[refreshing,setRefreshing]=useState(false);
 return <Dialog title={record?'Editar contacto':'Agregar contacto'} close={close}>
  <p className="form-note">Cargá sólo los datos necesarios para coordinar el servicio. El rol es opcional.</p>
  {conflict?<div><p className="error" role="alert">El contacto cambió. Tu borrador sigue visible; recargá para revisar la última versión antes de reemplazarlo.</p><Button type="button" variant="secondary" onClick={()=>setReloadReview(true)}>Recargar versión actual</Button></div>:null}
  {error?<p className="error" role="alert">{error}</p>:null}
  {reloadReview?<ConfirmDialog title="Recargar contacto" description="Se reemplazará el borrador visible por la última versión guardada." confirmLabel="Reemplazar borrador" busy={refreshing} error={error} onCancel={()=>setReloadReview(false)} onConfirm={()=>{setRefreshing(true);void api<{contact:ClientContact}>(`${root}/${record!.id}`).then(data=>{setCurrent(data.contact);setConflict(false);setError('');setReloadReview(false);}).catch(cause=>setError(message(cause))).finally(()=>setRefreshing(false));}}/>:null}
  <Editor key={`${current?.id||'new'}:${current?.version||0}`} fields={fields} defaults={defaults(current)} label={record?'Guardar contacto':'Agregar contacto'} save={async values=>{
   if(conflict)throw Error('Recargá la versión actual antes de guardar.');
   try{await api(record?`${root}/${record.id}`:root,{...values,...(record?{expected_version:current!.version}:{})},record?'PATCH':'POST');notify({message:record?'Contacto actualizado':'Contacto agregado',tone:'success'});saved();}
   catch(cause){if(cause instanceof ApiFieldError&&cause.status===409)setConflict(true);throw cause;}
  }}/>
 </Dialog>;
}
