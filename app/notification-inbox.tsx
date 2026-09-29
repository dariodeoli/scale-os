'use client';
// Bandeja oficial de avisos (owncoding-ui §16, Refs #83): el objeto
// `CampanaAvisos` dibuja la campana, el contador, el panel, el vacío con acción
// y cada aviso (contrato `{id, titulo, detalle, tono, fecha, href, leido}`); la
// app conserva datos, polling, filtros, mutaciones y preferencias.
// El aviso elegido abre su detalle con las acciones propias de Scale OS (ver
// pieza o proyecto, marcar como leída, resolver o reabrir).
import {useCallback,useEffect,useRef,useState} from 'react';
import {Check,CheckCheck,CircleCheck,ExternalLink,RefreshCw,RotateCcw,Settings2} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {CampanaAvisos,SegmentedField} from 'owncoding-ui';
import {api} from './operations';
import {Dialog} from './dialog';
import {listDateFull} from './list-format';
import {StateChip} from './ui-v2';

type Notice={id:string;kind?:'assignment'|'comment'|'due';title:string;body:string;work_order_id:string|null;project_id?:string|null;comment_id?:string|null;read_at:string|null;resolved_at?:string|null;created_at:string};
type Inbox={notifications:Notice[];unread:number;pendingCount?:number;next:string|null};
type Filter='all'|'unread'|'unresolved'|'resolved';
/** Aviso canónico de la bandeja (§16): lo que el objeto sabe dibujar. */
export type Aviso={id:string;titulo:string;detalle:string;tono:'ok'|'warn'|'bad'|'info'|'mute';fecha:string;leido:boolean;icono:string};
const filters:{value:Filter;label:string}[]=[{value:'all',label:'Todas'},{value:'unread',label:'Sin leer'},{value:'unresolved',label:'Pendientes'},{value:'resolved',label:'Resueltas'}];
const empty:Inbox={notifications:[],unread:0,next:null};
const error=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudieron cargar los avisos.';
const kindLabel=(kind:Notice['kind'])=>({assignment:'Asignación',comment:'Mención o comentario',due:'Entrega pendiente'} as Record<string,string>)[kind||'']||'Aviso';
function dateLabel(value:string){return listDateFull(value)||'Fecha no disponible';}
/** Una línea del detalle: sin saltos ni espacios repetidos. */
function oneLine(value:string){return value.replace(/\s+/g,' ').trim();}
function short(value:string,limit:number){const text=oneLine(value);return text.length>limit?`${text.slice(0,limit-1).trimEnd()}…`:text;}
/** Tono del aviso: lo nuevo se pinta, lo leído queda neutro y lo resuelto en verde. */
function tonoDeAviso(notice:Notice):Aviso['tono']{if(notice.resolved_at)return 'ok';if(notice.read_at)return 'mute';return notice.kind==='due'?'warn':'info';}
function iconoDeAviso(notice:Notice){if(notice.resolved_at)return 'check';return ({assignment:'user',comment:'megaphone',due:'clock'} as Record<string,string>)[notice.kind||'']||'bell';}
/** Mapeo único al contrato de la bandeja (§16): título corto sin punto final,
 *  detalle en una línea y fecha ya formateada. La ruta del destino la resuelve
 *  la app al abrir el detalle (la pieza no tiene ruta canónica propia). */
export function avisoDeNotificacion(notice:Notice):Aviso{
 return {
  id:String(notice.id),
  titulo:short(notice.title||'Aviso',90).replace(/\.+$/,''),
  detalle:short(notice.body||'',140),
  tono:tonoDeAviso(notice),
  fecha:dateLabel(notice.created_at),
  leido:Boolean(notice.read_at),
  icono:iconoDeAviso(notice),
 };
}
/** Acción de la bandeja: target de 44 px y geometría estable. */
const ICON_ACTION='icon-button !h-11 !w-11';

export function NotificationInbox({openOrder,openPreferences}:{openOrder:(id:string,anchor?:string)=>void;openPreferences:()=>void}){
 const router=useRouter();
 const [filter,setFilter]=useState<Filter>('all'),[data,setData]=useState<Inbox>(empty);
 const [loading,setLoading]=useState(true),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [selected,setSelected]=useState<Notice|null>(null);
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
  // La página uno no reemplaza el historial expandido mientras se lee: al
  // abrir la bandeja se vuelve a la primera página y el polling se reanuda.
  const timer=setInterval(()=>{if(!document.hidden&&!locked.current&&!reading.current&&!olderPages.current)void load(undefined,true);},60000);
  return()=>{clearInterval(timer);sequence.current++;reading.current=false;};
 },[load]);
 function changeFilter(next:Filter){if(locked.current||next===filter)return;setFilter(next);setData(previous=>({...previous,notifications:[],next:null}));setLoading(true);setMessage('');}
 function openInbox(){if(olderPages.current){olderPages.current=false;setData(previous=>({...previous,notifications:[],next:null}));void load();}else void load(undefined,true);}
 function visitNotice(notice:Notice){setSelected(null);if(notice.work_order_id)openOrder(String(notice.work_order_id),notice.comment_id?`comment-${notice.comment_id}`:undefined);else if(notice.project_id)router.push('/proyectos#project-'+encodeURIComponent(notice.project_id));}
 async function mutate(action:'read'|'read-all'|'resolve'|'reopen',notice?:Notice,visit=false){
  if(locked.current)return;locked.current=true;sequence.current++;reading.current=false;setBusy(true);setMessage('');
  try{
   try{
   await api('/api/agency/notifications/'+(action==='read-all'?'read-all':encodeURIComponent(notice!.id)),action==='resolve'?{resolved:true}:action==='reopen'?{resolved:false}:{},'PATCH');
   }catch(cause){if(alive.current)setMessage(error(cause));return;}
   if(!alive.current)return;
   if(notice)setSelected(current=>current&&String(current.id)===String(notice.id)?{...current,...(action==='resolve'?{resolved_at:'now'}:action==='reopen'?{resolved_at:null}:{read_at:current.read_at||'now'})}:current);
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
 function choose(aviso:Aviso){
  const notice=data.notifications.find(row=>String(row.id)===String(aviso.id));
  if(!notice)return;
  setMessage('');
  setSelected(notice);
  if(!notice.read_at)void mutate('read',notice);
 }
 const avisos=data.notifications.map(avisoDeNotificacion);
 const pending=typeof data.pendingCount==='number'?`${data.pendingCount} pendientes`:'';
 const status=loaded?pending:'Estado no disponible.';
 const vacio=!loaded
  ?{titulo:loading?'Consultando avisos…':'No pudimos cargar los avisos',detalle:loading?'Un momento.':(message||'Volvé a intentar en un rato.')}
  :{titulo:filter==='all'?'No tenés avisos':'No hay avisos para este filtro',detalle:filter==='all'?'Acá aparecerán tus avisos de asignaciones, comentarios y entregas.':'Probá con otra vista o volvé a todas.'};
 const vacioAccion=!loaded
  ?(loading?undefined:<button type="button" className="secondary" onClick={()=>void load()}>Reintentar</button>)
  :filter==='all'
   ?<button type="button" className="secondary" onClick={()=>void load()}>Actualizar</button>
   :<button type="button" className="secondary" onClick={()=>changeFilter('all')}>Ver todas</button>;
 return <>
  <CampanaAvisos
   avisos={avisos}
   ariaLabel="Notificaciones"
   onAbrir={openInbox}
   onElegir={choose}
   vacioTitulo={vacio.titulo}
   vacioDetalle={vacio.detalle}
   vacioAccion={vacioAccion}
   pie={<div className="grid gap-2">
    <p role="status" className="px-1 text-[11px] tabular-nums text-mute">{status}</p>
    {message&&<p role="alert" className="rounded-lg border-l-[3px] border-bad bg-bad/10 px-2.5 py-1.5 text-[12px] leading-[1.4] text-fore">{message}</p>}
    <SegmentedField value={filter} onChange={(value:string)=>changeFilter(value as Filter)} ariaLabel="Filtrar notificaciones" className="[&_button]:min-h-11 [&_button]:px-2 [&_button]:text-[11px]" options={filters.map(option=>[option.value,option.label] as [string,string])}/>
    <div className="flex flex-wrap items-center gap-1" aria-label="Acciones de notificaciones">
     <button type="button" className={ICON_ACTION} title="Marcar todas como leídas" aria-label="Marcar todas las notificaciones como leídas" disabled={busy||!data.unread} onClick={()=>void mutate('read-all')}><CheckCheck size={18}/></button>
     <button type="button" className={ICON_ACTION} title="Actualizar" aria-label="Actualizar notificaciones" disabled={busy||loading} onClick={()=>void load()}><RefreshCw size={17}/></button>
     <button type="button" className={ICON_ACTION} title="Preferencias" aria-label="Abrir preferencias de notificaciones" disabled={busy} onClick={openPreferences}><Settings2 size={17}/></button>
    </div>
    {data.next&&!loading&&<button type="button" className="secondary" disabled={busy} onClick={()=>void more()}>Ver avisos anteriores</button>}
   </div>}
  />
  {selected&&<Dialog title={kindLabel(selected.kind)} close={()=>setSelected(null)} size="compact" busy={busy}><div className="grid min-w-0 max-w-full gap-3 [overflow-wrap:anywhere]">
   <div className="flex min-w-0 flex-wrap items-center gap-2">
    <h2 className="min-w-0 text-base font-semibold leading-snug text-fore">{selected.title}</h2>
    <StateChip tone={selected.resolved_at?'ok':'mute'}>{selected.resolved_at?'Resuelta':'Pendiente'}</StateChip>
    <StateChip tone="mute">{selected.read_at?'Leída':'Sin leer'}</StateChip>
   </div>
   <p className="whitespace-pre-wrap text-[13px] leading-[1.5] text-mute">{selected.body}</p>
   {message&&<p role="alert" className="rounded-lg border-l-[3px] border-bad bg-bad/10 px-3 py-2 text-[13px] text-fore">{message}</p>}
   <time className="whitespace-nowrap text-[11px] tabular-nums text-mute" dateTime={Number.isFinite(new Date(selected.created_at).getTime())?selected.created_at:undefined}>{dateLabel(selected.created_at)}</time>
   <p className="text-[12px] leading-[1.45] text-mute">Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza ni modifica el aviso de otras personas.</p>
   <div className="flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">
    {(selected.work_order_id||selected.project_id)&&<button type="button" className="secondary" disabled={busy} onClick={()=>visitNotice(selected)}><ExternalLink size={15}/>{selected.work_order_id?'Ver pieza':'Ver proyecto'}</button>}
    {!selected.read_at&&<button type="button" className="secondary" disabled={busy} onClick={()=>void mutate('read',selected)}><Check size={16}/>Marcar como leída</button>}
    <button type="button" className={`text-button ${selected.resolved_at?'warn':'positive'}`} disabled={busy} onClick={()=>void mutate(selected.resolved_at?'reopen':'resolve',selected)}>{selected.resolved_at?<><RotateCcw size={15}/>Reabrir aviso</>:<><CircleCheck size={16}/>Resolver aviso</>}</button>
   </div>
  </div></Dialog>}
 </>;
}
