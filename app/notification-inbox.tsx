'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell,Check,CheckCheck,CircleCheck,ExternalLink,RefreshCw,RotateCcw,Settings2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {api} from './operations';
import {Dialog} from './dialog';
import './notifications.css';

type Notice={id:string;kind?:'assignment'|'comment'|'due';title:string;body:string;work_order_id:string|null;project_id?:string|null;comment_id?:string|null;read_at:string|null;resolved_at?:string|null;created_at:string};
type Inbox={notifications:Notice[];unread:number;pendingCount?:number;next:string|null};
type Filter='all'|'unread'|'unresolved'|'resolved';
const filters:{value:Filter;label:string}[]=[{value:'all',label:'Todas'},{value:'unread',label:'Sin leer'},{value:'unresolved',label:'Pendientes'},{value:'resolved',label:'Resueltas'}];
const empty:Inbox={notifications:[],unread:0,next:null};
const error=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudieron cargar los avisos.';
const kindLabel=(kind:Notice['kind'])=>({assignment:'Asignación',comment:'Mención o comentario',due:'Entrega pendiente'} as Record<string,string>)[kind||'']||'Aviso';
function dateLabel(value:string){const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('es-PY'):'Fecha no disponible';}

export function NotificationInbox({openOrder,openPreferences}:{openOrder:(id:string,anchor?:string)=>void;openPreferences:()=>void}){
 const router=useRouter();
 const [open,setOpen]=useState(false),[filter,setFilter]=useState<Filter>('all'),[data,setData]=useState<Inbox>(empty);
 const [loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const alive=useRef(false),sequence=useRef(0),locked=useRef(false),reading=useRef(false),olderPages=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;sequence.current++;};},[]);
 const load=useCallback(async(before?:string,background=false)=>{
  const version=++sequence.current;reading.current=true;
  if(!background&&!before)setLoading(true);
  const query=new URLSearchParams({status:filter});if(before)query.set('before',before);
  try{
   const result=await api<Inbox>('/api/agency/notifications?'+query);
   if(!alive.current||version!==sequence.current)return false;
   olderPages.current=!!before;
   setData(previous=>before?{...result,notifications:Array.from(new Map([...previous.notifications,...result.notifications].map(row=>[String(row.id),row])).values())}:result);
   setLoaded(true);setMessage('');return true;
  }catch(cause){if(alive.current&&version===sequence.current)setMessage(error(cause));return false;}
  finally{if(version===sequence.current){reading.current=false;if(alive.current)setLoading(false);}}
 },[filter]);
 useEffect(()=>{
  void load();
  // Do not replace the expanded history with page one while it is being read.
  // Explicit refresh/filter changes and closing the drawer resume fresh polling.
  const timer=setInterval(()=>{if(!document.hidden&&!locked.current&&!reading.current&&!(open&&olderPages.current))void load(undefined,true);},60000);
  return()=>{clearInterval(timer);sequence.current++;reading.current=false;};
 },[load,open]);
 function changeFilter(next:Filter){if(locked.current||next===filter)return;setFilter(next);setData(previous=>({...previous,notifications:[],next:null}));setLoading(true);setMessage('');}
 function visitNotice(notice:Notice){setOpen(false);if(notice.work_order_id)openOrder(String(notice.work_order_id),notice.comment_id?`comment-${notice.comment_id}`:undefined);else if(notice.project_id)router.push('/proyectos#project-'+encodeURIComponent(notice.project_id));}
 async function mutate(action:'read'|'read-all'|'resolve'|'reopen',notice?:Notice,visit=false){
  if(locked.current)return;locked.current=true;sequence.current++;reading.current=false;setBusy(true);setMessage('');
  try{
   try{
   await api('/api/agency/notifications/'+(action==='read-all'?'read-all':encodeURIComponent(notice!.id)),action==='resolve'?{resolved:true}:action==='reopen'?{resolved:false}:{},'PATCH');
   }catch(cause){if(alive.current)setMessage(error(cause));return;}
   if(!alive.current)return;
   const refreshed=await load(undefined,true);
   if(alive.current){
   if(!refreshed)setMessage('Cambio guardado. No se pudo actualizar la lista; usá Actualizar para comprobar el estado.');
    if(visit&&notice)visitNotice(notice);
   }
  }finally{locked.current=false;if(alive.current){setBusy(false);setLoading(false);}}
 }
 async function more(){
  if(locked.current||!data.next)return;locked.current=true;setBusy(true);
  try{await load(data.next);}finally{locked.current=false;if(alive.current)setBusy(false);}
 }
 return <>
  <button type="button" className="icon-button notification-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notificaciones${!loaded?', estado no disponible':data.unread?`, ${data.unread} sin leer`:''}`} onClick={()=>setOpen(true)}><Bell size={19}/>{loaded&&data.unread>0&&<span className="notification-badge" aria-hidden="true">{data.unread>99?'99+':data.unread}</span>}</button>
  {open&&<Dialog title="Notificaciones" close={()=>setOpen(false)} size="compact" busy={busy}><div className="notification-inbox">
   <div className="notification-toolbar"><p role="status">{loaded?`${data.unread} sin leer${typeof data.pendingCount==='number'?` · ${data.pendingCount} pendientes`:''}`:loading?'Consultando notificaciones…':'Estado no disponible.'}</p><div className="notification-actions" aria-label="Acciones de notificaciones"><button type="button" className="icon-button" title="Preferencias" aria-label="Abrir preferencias de notificaciones" disabled={busy} onClick={openPreferences}><Settings2 size={17}/></button><button type="button" className="icon-button notification-action-icon is-confirm" title="Marcar todas como leídas" aria-label="Marcar todas las notificaciones como leídas" disabled={busy||!data.unread} onClick={()=>void mutate('read-all')}><CheckCheck size={18}/></button><button type="button" className="icon-button" title="Actualizar" aria-label="Actualizar notificaciones" disabled={busy||loading} onClick={()=>void load()}><RefreshCw size={17}/></button></div></div><p className="form-note">Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza ni modifica el aviso de otras personas.</p>
   <div className="notification-filters" role="group" aria-label="Filtrar notificaciones">{filters.map(option=><button type="button" key={option.value} className={filter===option.value?'choice active':'choice'} aria-pressed={filter===option.value} disabled={busy} onClick={()=>changeFilter(option.value)}>{option.label}</button>)}</div>
   {message&&<p role="alert">{message}</p>}
   <div aria-busy={loading||busy}>{loading?<p role="status">Cargando avisos…</p>:!data.notifications.length?<p className="empty-copy">{message?'No se pudo mostrar la lista. Intentá actualizar.':filter==='all'?'No tenés notificaciones. Acá aparecerán tus avisos de asignaciones, comentarios y entregas.':'No hay notificaciones para este filtro.'}</p>:<div className="notification-list">{data.notifications.map(notice=><article key={notice.id} className={notice.read_at?'notice':'notice unread'}>
    <h3>{notice.title}</h3><p className="notification-kind">{kindLabel(notice.kind)}</p><p>{notice.body}</p><time dateTime={Number.isFinite(new Date(notice.created_at).getTime())?notice.created_at:undefined}>{dateLabel(notice.created_at)}</time>
    <p className="notification-state">{notice.read_at?'Leída':'Sin leer'} · {notice.resolved_at?'Resuelta':'Pendiente'}</p>
    <div className="notification-actions">
     {(notice.work_order_id||notice.project_id)&&<button type="button" className="icon-button" title={notice.work_order_id?'Ver pieza':'Ver proyecto'} aria-label={`${notice.work_order_id?'Ver pieza':'Ver proyecto'}: ${notice.title}`} disabled={busy} onClick={()=>{if(locked.current)return;if(notice.read_at)visitNotice(notice);else void mutate('read',notice,true);}}><ExternalLink size={17}/></button>}
     {!notice.read_at&&<button type="button" className="icon-button notification-action-icon is-confirm" title="Marcar como leída" aria-label={`Marcar como leída: ${notice.title}`} disabled={busy} onClick={()=>void mutate('read',notice)}><Check size={18}/></button>}
     <button type="button" className={`icon-button notification-action-icon ${notice.resolved_at?'':'is-confirm'}`} title={notice.resolved_at?'Reabrir aviso':'Resolver aviso'} aria-label={`${notice.resolved_at?'Reabrir aviso':'Resolver aviso'}: ${notice.title}`} disabled={busy} onClick={()=>void mutate(notice.resolved_at?'reopen':'resolve',notice)}>{notice.resolved_at?<RotateCcw size={17}/>:<CircleCheck size={18}/>}</button>
    </div>
   </article>)}</div>}</div>
   {data.next&&!loading&&<button type="button" className="secondary" disabled={busy} onClick={()=>void more()}>Ver avisos anteriores</button>}
  </div></Dialog>}
 </>;
}
