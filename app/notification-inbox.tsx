'use client';
// Bandeja de notificaciones v2 (issue #46): Tailwind + primitivas ui-v2; sin hoja
// propia. La lógica de filtros, polling y single-flight se conserva tal cual.
import {useCallback,useEffect,useRef,useState} from 'react';
import {Bell,Check,CheckCheck,CircleCheck,ExternalLink,RefreshCw,RotateCcw,Settings2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {SegmentedField} from 'owncoding-ui';
import {api} from './operations';
import {Dialog} from './dialog';
import {listDateFull} from './list-format';
import {EmptyBlock,LoadingBlock,StateChip} from './ui-v2';

type Notice={id:string;kind?:'assignment'|'comment'|'due';title:string;body:string;work_order_id:string|null;project_id?:string|null;comment_id?:string|null;read_at:string|null;resolved_at?:string|null;created_at:string};
type Inbox={notifications:Notice[];unread:number;pendingCount?:number;next:string|null};
type Filter='all'|'unread'|'unresolved'|'resolved';
const filters:{value:Filter;label:string}[]=[{value:'all',label:'Todas'},{value:'unread',label:'Sin leer'},{value:'unresolved',label:'Pendientes'},{value:'resolved',label:'Resueltas'}];
const empty:Inbox={notifications:[],unread:0,next:null};
const error=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudieron cargar los avisos.';
const kindLabel=(kind:Notice['kind'])=>({assignment:'Asignación',comment:'Mención o comentario',due:'Entrega pendiente'} as Record<string,string>)[kind||'']||'Aviso';
function dateLabel(value:string){return listDateFull(value)||'Fecha no disponible';}
/** Acción de la bandeja: target de 44 px en mobile y geometría estable. */
const ICON_ACTION='icon-button !h-11 !w-11';
const CARD='grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4';
const CARD_UNREAD='grid min-w-0 gap-2 rounded-xl border border-ink-600 border-l-4 border-l-fono bg-ink-700 p-4';

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
  <span className="relative flex-none">
   <button type="button" className="icon-button notification-trigger" title="Notificaciones" aria-haspopup="dialog" aria-expanded={open} aria-label={`Notificaciones${!loaded?', estado no disponible':data.unread?`, ${data.unread} sin leer`:''}`} onClick={()=>setOpen(true)}><Bell size={19}/></button>
   {loaded&&data.unread>0&&<span className="pointer-events-none absolute -right-1.5 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full border-2 border-ink-800 bg-bad px-1 text-[10px] font-bold leading-none tabular-nums text-onbrand" aria-hidden="true">{data.unread>99?'99+':data.unread}</span>}
  </span>
  {open&&<Dialog title="Notificaciones" close={()=>setOpen(false)} size="compact" busy={busy}><div className="grid min-w-0 max-w-full gap-3 [overflow-wrap:anywhere]">
   <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-700 px-3 py-2">
    <p role="status" className="text-[13px] tabular-nums text-mute">{loaded?`${data.unread} sin leer${typeof data.pendingCount==='number'?` · ${data.pendingCount} pendientes`:''}`:loading?'Consultando notificaciones…':'Estado no disponible.'}</p>
    <div className="flex flex-wrap items-center gap-1" aria-label="Acciones de notificaciones">
     <button type="button" className={ICON_ACTION} title="Preferencias" aria-label="Abrir preferencias de notificaciones" disabled={busy} onClick={openPreferences}><Settings2 size={17}/></button>
     <button type="button" className={`${ICON_ACTION} notification-action-icon is-confirm`} title="Marcar todas como leídas" aria-label="Marcar todas las notificaciones como leídas" disabled={busy||!data.unread} onClick={()=>void mutate('read-all')}><CheckCheck size={18}/></button>
     <button type="button" className={ICON_ACTION} title="Actualizar" aria-label="Actualizar notificaciones" disabled={busy||loading} onClick={()=>void load()}><RefreshCw size={17}/></button>
    </div>
   </div>
   <p className="whitespace-pre-wrap text-[12px] leading-[1.45] text-mute">Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza ni modifica el aviso de otras personas.</p>
   <SegmentedField value={filter} onChange={(value:string)=>changeFilter(value as Filter)} ariaLabel="Filtrar notificaciones" className="[&_button]:min-h-11" options={filters.map(option=>[option.value,option.label] as [string,string])}/>
   {message&&<p role="alert" className="rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2 text-[13px] text-fore">{message}</p>}
   <div aria-busy={loading||busy} className="grid gap-2">
    {loading?<LoadingBlock label="Cargando avisos…" lines={3}/>:!data.notifications.length?<EmptyBlock compact title={message?'No se pudo mostrar la lista':'No tenés notificaciones'} description={message?'Intentá actualizar.':filter==='all'?'Acá aparecerán tus avisos de asignaciones, comentarios y entregas.':'No hay notificaciones para este filtro.'}/>:<div className="grid gap-2">
     {data.notifications.map(notice=><article key={notice.id} className={notice.read_at?CARD:CARD_UNREAD}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-2">
       <h3 className="min-w-0 whitespace-pre-wrap text-sm font-semibold leading-[1.3] text-fore [overflow-wrap:anywhere]">{notice.title}</h3>
       <StateChip tone="mute" className="uppercase tracking-[.05em]">{kindLabel(notice.kind)}</StateChip>
      </div>
      <p className="min-w-0 whitespace-pre-wrap text-[12.5px] leading-[1.45] text-mute [overflow-wrap:anywhere]">{notice.body}</p>
      <time className="whitespace-nowrap text-[11px] tabular-nums text-mute" dateTime={Number.isFinite(new Date(notice.created_at).getTime())?notice.created_at:undefined}>{dateLabel(notice.created_at)}</time>
      <p className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[.075em] text-mute">{notice.read_at?'Leída':'Sin leer'} · {notice.resolved_at?'Resuelta':'Pendiente'}</p>
      <div className="flex flex-wrap items-center gap-1 border-t border-ink-600 pt-2">
       {(notice.work_order_id||notice.project_id)&&<button type="button" className={ICON_ACTION} title={notice.work_order_id?'Ver pieza':'Ver proyecto'} aria-label={`${notice.work_order_id?'Ver pieza':'Ver proyecto'}: ${notice.title}`} disabled={busy} onClick={()=>{if(locked.current)return;if(notice.read_at)visitNotice(notice);else void mutate('read',notice,true);}}><ExternalLink size={17}/></button>}
       {!notice.read_at&&<button type="button" className={`${ICON_ACTION} notification-action-icon is-confirm`} title="Marcar como leída" aria-label={`Marcar como leída: ${notice.title}`} disabled={busy} onClick={()=>void mutate('read',notice)}><Check size={18}/></button>}
       <button type="button" className={`${ICON_ACTION} notification-action-icon ${notice.resolved_at?'':'is-confirm'}`} title={notice.resolved_at?'Reabrir aviso':'Resolver aviso'} aria-label={`${notice.resolved_at?'Reabrir aviso':'Resolver aviso'}: ${notice.title}`} disabled={busy} onClick={()=>void mutate(notice.resolved_at?'reopen':'resolve',notice)}>{notice.resolved_at?<RotateCcw size={17}/>:<CircleCheck size={18}/>}</button>
      </div>
     </article>)}
    </div>}
   </div>
   {data.next&&!loading&&<button type="button" className="secondary" disabled={busy} onClick={()=>void more()}>Ver avisos anteriores</button>}
  </div></Dialog>}
 </>;
}
