'use client';
import {useEffect,useState} from 'react';
import {api,Dialog,Editor} from './operations';
import {Button} from './ui/button';
import {Notice} from './ui/notice';
import {InputControl} from './ui/input-control';
import {clientFields} from './client-editor-data';

type Link={id:string;client_id:string|null;scope:string;expires_at:string;revoked_at:string|null;consumed_at:string|null};
type Submission={id:string;payload:Record<string,string|boolean|null>;status:string;intended_client_id:string|null;scope:string};
const message=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar';
export function ClientIntakeButton({clientId,onReviewed}:{clientId?:string;onReviewed?:()=>Promise<void>}){
 const [open,setOpen]=useState(false);
 return <><Button type="button" variant="secondary" onClick={()=>setOpen(true)}>Enlaces de registro</Button>{open?<ClientIntakeDialog clientId={clientId} close={()=>setOpen(false)} onReviewed={onReviewed}/>:null}</>;
}
export function ClientIntakeDialog({clientId,close,onReviewed}:{clientId?:string;close:()=>void;onReviewed?:()=>Promise<void>}){
 const [links,setLinks]=useState<Link[]>([]),[entries,setEntries]=useState<Submission[]>([]),[error,setError]=useState(''),[fresh,setFresh]=useState(''),[review,setReview]=useState<Submission|null>(null),[busy,setBusy]=useState(false);
 const query=clientId?'?client_id='+encodeURIComponent(clientId):'';
 async function load(){
  const [a,b]=await Promise.all([api<{links:Link[]}>('/api/agency/client-intake-links'+query),api<{submissions:Submission[]}>('/api/agency/client-intake-submissions'+query)]);setLinks(a.links);setEntries(b.submissions);
 }
 useEffect(()=>{void load().catch(cause=>setError(message(cause)));},[clientId]); // eslint-disable-line react-hooks/exhaustive-deps
 return <Dialog size="wide" title="Enlaces de registro y solicitudes" close={close} busy={busy}>
  <p className="form-note">Cada enlace admite un envío, vence y puede revocarse. No muestra datos existentes. Revisá la solicitud antes de crear una ficha o completar datos vacíos.</p>
  {error?<Notice tono="error" role="alert">{error}</Notice>:null}
  <Editor columns fields={[{key:'scope',label:'Datos solicitados',choices:[{value:'basic',label:'Básico / rápido'},{value:'contract',label:'Completo / contrato'}]},{key:'days',label:'Vence en',choices:[{value:'1',label:'1 día'},{value:'7',label:'7 días'},{value:'30',label:'30 días'}]}]} defaults={{scope:'basic',days:'7'}} label="Crear enlace" save={async values=>{const result=await api<{path:string}>('/api/agency/client-intake-links',{scope:values.scope,expires_in_days:Number(values.days),...(clientId?{client_id:clientId}:{})});setFresh(new URL(result.path,window.location.origin).href);await load();}}/>
  {fresh?<div className="grid gap-2"><label htmlFor="intake-share">Copiá este enlace y compartilo con el cliente</label><InputControl id="intake-share" readOnly value={fresh}/><small>Se muestra una sola vez; al cerrar sólo se conserva su identificador.</small></div>:null}
  <h3>Enlaces emitidos</h3>
  {links.length?links.map(link=><div className="flex flex-wrap items-center gap-2 py-2" key={link.id}><span>#{link.id} · {link.scope==='contract'?'Contrato':'Básico'} · {link.revoked_at?'Revocado':link.consumed_at?'Enviado':new Date(link.expires_at)<new Date()?'Vencido':'Disponible'}</span><small>Vence {new Date(link.expires_at).toLocaleDateString('es-PY')}</small>{!link.revoked_at&&!link.consumed_at?<Button type="button" variant="ghost" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await api('/api/agency/client-intake-links/'+link.id,{},'DELETE');await load();}catch(cause){setError(message(cause));}finally{setBusy(false);}}}>Revocar enlace #{link.id}</Button>:null}</div>):<p>No hay enlaces emitidos.</p>}
  <h3>Solicitudes recibidas</h3>
  {entries.length?entries.map(entry=><div className="flex flex-wrap items-center gap-2 py-2" key={entry.id}><span>{String(entry.payload.name)} · {entry.status==='pending'?'Pendiente':entry.status==='accepted'?'Aceptada':'Rechazada'}</span>{entry.status==='pending'?<Button type="button" variant="secondary" onClick={()=>setReview(entry)}>Revisar solicitud #{entry.id}</Button>:null}</div>):<p>No hay solicitudes recibidas.</p>}
  {review?<IntakeReview entry={review} close={()=>setReview(null)} saved={async()=>{setReview(null);await load();await onReviewed?.();}}/>:null}
 </Dialog>;
}
function IntakeReview({entry,close,saved}:{entry:Submission;close:()=>void;saved:()=>Promise<void>}){
 const [current,setCurrent]=useState<Record<string,unknown>|null>(null),[loadError,setLoadError]=useState(''),[clients,setClients]=useState<{id:string;name:string}[]>([]),[selectedClient,setSelectedClient]=useState(entry.intended_client_id||'');
 const labels=new Map(clientFields({mode:'create'}).map(field=>[field.key,field.label]));
 useEffect(()=>{if(!entry.intended_client_id)void api<{clients:{id:string;name:string}[]}>('/api/agency/clients?fields=name&limit=100').then(data=>setClients(data.clients)).catch(cause=>setLoadError(message(cause)));},[entry.intended_client_id]);
 useEffect(()=>{let active=true;setCurrent(null);setLoadError('');if(selectedClient)void api<{record:Record<string,unknown>}>('/api/agency/clients/'+selectedClient).then(data=>{if(active)setCurrent(data.record);}).catch(cause=>{if(active)setLoadError(message(cause));});return()=>{active=false;};},[selectedClient]);
 const keys=Object.keys(entry.payload).filter(key=>entry.payload[key]!==null&&entry.payload[key]!==''&&entry.payload[key]!==false);
 return <Dialog size="wide" title="Revisar datos recibidos" close={close}>
  <p>Seleccioná los datos que comprobaste. Sólo se completan campos vacíos; para reemplazar un dato existente usá la ficha del cliente.</p>
  {loadError?<Notice tono="error" role="alert">{loadError}</Notice>:null}
  <dl className="grid gap-2">{keys.map(key=><div key={key}><dt>{labels.get(key)||key}</dt><dd>{entry.payload[key]===true?'Sí':String(entry.payload[key])}{current&&current[key]?<small className="block">Dato actual: {String(current[key])} · se conserva</small>:null}</dd></div>)}</dl>
  {!entry.intended_client_id||current?<Editor onValuesChange={values=>{const next=entry.intended_client_id||(values.action==='link'?values.client_id:'')||'';setSelectedClient(previous=>previous===next?previous:next);}} fields={[{key:'action',label:'Decisión',choices:[{value:entry.intended_client_id?'link':'create',label:entry.intended_client_id?'Completar ficha vinculada':'Crear ficha nueva'},...(!entry.intended_client_id?[{value:'link',label:'Completar ficha existente'}]:[]),{value:'reject',label:'Rechazar solicitud'}]},...(!entry.intended_client_id?[{key:'client_id',label:'Ficha existente (si vinculás)',optional:true,choices:[{value:'',label:'Elegir cliente'},...clients.map(client=>({value:String(client.id),label:client.name}))],help:'Se muestran hasta 100 clientes. También podés emitir un enlace desde la ficha específica.'}]:[]),...keys.map(key=>({key:'select_'+key,label:'Aplicar '+(labels.get(key)||key),type:'checkbox' as const,optional:true,disabled:!!(current&&current[key])}))]} defaults={{action:entry.intended_client_id?'link':'create',...Object.fromEntries(keys.map(key=>['select_'+key,'false']))}} label="Confirmar revisión" save={async values=>{await api('/api/agency/client-intake-submissions/'+entry.id+'/review',{action:values.action,fields:keys.filter(key=>values['select_'+key]==='true'),...(values.action==='link'?{client_id:selectedClient,expected_updated_at:current?new Date(String(current.updated_at)).toISOString():undefined}:{})});await saved();}}/>:!loadError?<p role="status">Cargando ficha actual…</p>:null}
 </Dialog>;
}
