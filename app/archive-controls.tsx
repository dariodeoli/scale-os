"use client";
import {Button} from './ui/button';

import {useEffect,useMemo,useState} from 'react';
import {SearchField} from './search-field';
import {SelectCustom} from './profile-controls';
import {api} from './operations';
import {ConfirmDialog} from './dialog';
import {notify} from './feedback';
import {listDateFull} from './list-format';
import {RotateCcw,Trash2} from 'lucide-react';
import {ARCHIVE_KIND_CAPABILITIES,roleCan,type Capability} from './capabilities';
import {BulkBar,EmptyBlock,ErrorBlock,FilterToolbar,ListActions,ListGrid,ListPage,ListRow,LoadingBlock,StateChip,useBulkSelection} from './ui-v2';

// Fuente única con la papelera del API: el NAV usa el mismo mapa.
const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>;
const labels:Record<string,string>={clients:'Cliente',projects:'Proyecto','work-orders':'Orden',leads:'Oportunidad',plans:'Plan',budgets:'Presupuesto',inventory:'Equipo de inventario',collaborators:'Colaborador',accounts:'Cuenta',members:'Acceso'}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación';

/** ¿Este rol puede mover el registro a la papelera? Fuente única con el NAV. */
export function canRemoveRecord(kind:string,role:string){
 const capability=kind==='members'?'members.manage':roles[kind];
 return Boolean(capability&&roleCan(role,capability));
}

/**
 * Confirmación de papelera controlada (Refs #140): el menú ⋯ abre el mismo
 * diálogo que usaba el botón de la fila, sin duplicar el contrato ni la copia.
 */
export function RemoveRecordDialog({kind,id,name,role,done,open,onClose}:{kind:string;id:string;name:string;role:string;done:()=>Promise<void>;open:boolean;onClose:()=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 // Cada apertura arranca limpia: un error viejo no reaparece al reabrir.
 useEffect(()=>{if(open)setError('');},[open]);
 if(!open)return null;
 const access=kind==='members';
 const description=<><p><strong>{name}</strong></p>
  <p>{access?'Esta persona dejará de entrar a esta empresa, incluso con Google. Sus sesiones se cerrarán. No se borrarán sus comentarios, pagos ni su acceso a otras empresas. Podés invitarla nuevamente desde Equipo.':'Se quitará de las listas activas y quedará en la Papelera. Podés restaurarlo después.'}</p>
  {['clients','projects'].includes(kind)&&<p className="form-note">Sus proyectos u órdenes vinculados también quedarán ocultos mientras este registro esté en la papelera. Restaurarlo volverá a mostrarlos, salvo los eliminados por separado.</p>}
  {kind==='budgets'&&<p className="form-note">El enlace público dejará de funcionar. Restaurar el presupuesto no volverá a publicarlo automáticamente.</p>}
  {kind==='accounts'&&<p className="form-note">Solo se pueden retirar cuentas con saldo cero. Su historial seguirá disponible.</p>}
  {kind==='collaborators'&&<p className="form-note">Esto retira el perfil del colaborador, no su acceso. Para revocar el acceso usá Equipo.</p>}
  {kind==='inventory'&&<p className="form-note">Archivar no equivale a dar de baja un activo: no modifica su valor patrimonial.</p>}</>;
 return <ConfirmDialog open variant="danger" title={access?'Quitar acceso o invitación':'Mover a la papelera'} description={description} error={error} busy={busy} confirmLabel={access?'Confirmar: quitar acceso':'Confirmar: mover a papelera'} onCancel={()=>{if(!busy)onClose();}} onConfirm={async()=>{setBusy(true);try{await api(`/api/agency/${kind}/${id}`,{},'DELETE');await done();onClose();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}/>;
}

/**
 * Disparador + diálogo para fila (modo interno) o menú ⋯ ya abierto
 * (`hideTrigger` + `open`, #141); misma confirmación y mismo endpoint.
 */
export function RemoveRecord({kind,id,name,role,done,hideTrigger=false,open,onClose}:{kind:string;id:string;name:string;role:string;done:()=>Promise<void>;hideTrigger?:boolean;open?:boolean;onClose?:()=>void}){
 const [internal,setInternal]=useState(false);
 if(!canRemoveRecord(kind,role))return null;
 const access=kind==='members';
 const visible=open??internal;
 const close=()=>{setInternal(false);onClose?.();};
 return <>{hideTrigger?null:<Button variant="danger" iconOnly className="icon-button record-remove" type="button" title={access?'Quitar acceso':'Mover a la papelera'} aria-label={`${access?'Quitar acceso':'Mover a la papelera'}: ${name}`} onClick={()=>setInternal(true)}><Trash2 size={16} aria-hidden="true"/></Button>}
 <RemoveRecordDialog kind={kind} id={id} name={name} role={role} done={done} open={visible} onClose={close}/></>;
}

type Removed={kind:string;id:string;name:string;removed_at:string;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};

/** Plantilla v2 compartida entre el encabezado y las filas de la papelera. */
const TRASH_TEMPLATE='grid-cols-[2rem_8.5rem_minmax(16rem,2.4fr)_7rem]';
const TRASH_COLUMNS=[{key:'select',label:''},{key:'kind',label:'Tipo'},{key:'record',label:'Registro'},{key:'actions',label:'Acciones'}];

const TRASH_BATCH_LIMIT=50;

export function TrashWorkspace({refresh,role}:{refresh:()=>Promise<void>;role?:string}){
 const [records,setRecords]=useState<Removed[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 const [bulkBusy,setBulkBusy]=useState(false);
 const [query,setQuery]=useState(''),[kindFilter,setKindFilter]=useState('');
 // Ventana de servidor (#106): 50 por página, total y tipos del API.
 const [total,setTotal]=useState(0),[kindsCount,setKindsCount]=useState(0),[hasMore,setHasMore]=useState(false),[loadingMore,setLoadingMore]=useState(false);
 const keyOf=(r:Removed)=>`${r.kind}-${r.id}`;
 const bulk=useBulkSelection({limit:TRASH_BATCH_LIMIT,noun:'registros'});
 const {prune}=bulk;
 useEffect(()=>{prune(records.map(keyOf));},[records,prune]);
 const shown=useMemo(()=>{
  const needle=query.trim().toLowerCase();
  return records.filter(record=>(!kindFilter||record.kind===kindFilter)&&(!needle||`${record.name} ${labels[record.kind]||record.kind} ${record.actor_name||''}`.toLowerCase().includes(needle)));
 },[records,query,kindFilter]);
 const kindChoices=useMemo(()=>[{value:'',label:'Todos los tipos'},...Array.from(new Set(records.map(record=>record.kind))).map(kind=>({value:kind,label:labels[kind]||kind}))],[records]);
 // Restaurar en lote: el API no tiene endpoint de lote para la papelera; se
 // conserva la secuencia de restauraciones individuales que ya existía.
 async function restoreBatch(){
  if(bulkBusy||!bulk.count)return;
  const total=bulk.count;
  setBulkBusy(true);setError('');
  let restored=0;
  try{
   for(const key of bulk.ids){const record=records.find(item=>keyOf(item)===key);if(!record)continue;await api(`/api/agency/${record.kind}/${record.id}/restore`,{});restored+=1;}
   bulk.clear();await Promise.all([load(),refresh()]);
   notify({tone:restored===total?'success':'warning',message:`${restored} de ${total} registro${total===1?'':'s'} restaurado${restored===1?'':'s'}.`});
  }catch(e){setError(errorMessage(e));await load().catch(()=>{});}
  finally{setBulkBusy(false);}
 }
 async function load(offset=0){
  const data=await api<{records:Removed[];total?:number;kinds?:number;page?:{hasMore:boolean}}>(`/api/agency/trash?limit=50&offset=${offset}`);
  setRecords(current=>offset?[...current,...data.records]:data.records);
  setTotal(typeof data.total==='number'?data.total:data.records.length);
  setKindsCount(typeof data.kinds==='number'?data.kinds:new Set(data.records.map(record=>record.kind)).size);
  setHasMore(data.page?.hasMore===true);
 }
 async function more(){
  if(loadingMore||!hasMore)return;
  setLoadingMore(true);setError('');
  try{await load(records.length);}catch(e){setError(errorMessage(e));}
  finally{setLoadingMore(false);}
 }
 useEffect(()=>{void load().catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false));},[]);
 return <ListPage aria-label="Papelera de esta empresa"
  /* Reorganización IA: el total y los tipos viajan en el contador de la toolbar
     (la tira de dos KPIs dejaba media fila vacía y repetía el aviso de alcance). */
  toolbar={records.length?<FilterToolbar className="mb-0" summary={`${shown.length} de ${total} registros · ${kindsCount} tipo${kindsCount===1?'':'s'}`}>
   <SearchField className="w-full sm:w-72" ariaLabel="Buscar en la papelera" value={query} onChange={value=>setQuery(value)} placeholder="Nombre, tipo o quién lo movió…"/>
   <div className="w-full sm:w-52"><SelectCustom label="Tipo" choices={kindChoices} value={kindFilter} onChange={setKindFilter}/></div>
  </FilterToolbar>:undefined}
  bulk={<BulkBar count={bulk.count} label="seleccionado" role={role} busy={bulkBusy} onSelectVisible={()=>bulk.selectVisible(shown.map(keyOf))} onClear={bulk.clear}>
   <Button variant="secondary" type="button" className="secondary" disabled={bulkBusy} onClick={()=>void restoreBatch()}>{bulkBusy?'Restaurando…':'Restaurar'}</Button>
  </BulkBar>}>
  <p className="m-0 text-xs text-mute" title="No se borran de forma definitiva: los accesos retirados se devuelven con una nueva invitación desde Equipo.">Solo ves registros que tu permiso permite recuperar. No se borran de forma definitiva.</p>
  {error?<ErrorBlock title="No pudimos completar la operación" description={error} onRetry={()=>void load().catch(e=>setError(errorMessage(e)))}/>:null}
   {loading?<LoadingBlock label="Cargando papelera…" lines={3}/>:!records.length?<EmptyBlock compact title="No hay registros en la papelera" description="Lo que se mueva a la papelera queda acá hasta que lo restaures."/>:!shown.length?<EmptyBlock compact title="Ningún registro coincide" description="Probá con otra búsqueda o con todos los tipos." action={<Button variant="secondary" type="button" className="secondary" onClick={()=>{setQuery('');setKindFilter('');}}>Limpiar filtros</Button>}/>:
    <ListGrid label="Papelera" template={TRASH_TEMPLATE} columns={TRASH_COLUMNS} minWidthClass="min-w-[40rem]" pinnedActions>
     {shown.map(record=><ListRow key={keyOf(record)} template={TRASH_TEMPLATE}>
      <label className="relative flex items-center after:absolute after:-inset-3.5 after:content-['']" title="Seleccionar registro"><input type="checkbox" aria-label={`Seleccionar ${record.name}`} checked={bulk.has(keyOf(record))} onChange={()=>bulk.toggle(keyOf(record))}/></label>
      <span className="whitespace-nowrap"><StateChip tone="mute">{labels[record.kind]||record.kind}</StateChip></span>
      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
       <b className="min-w-0 truncate text-[13.5px] font-semibold leading-[1.2] text-fore" title={record.name}>{record.name}</b>
       <small className="flex min-w-0 items-baseline gap-2 text-[11.5px] text-mute">
        <span className="min-w-0 truncate" title={`Movido a Papelera por ${record.actor_name||'Sistema'}`}>Movido a Papelera por {record.actor_name||'Sistema'}</span>
        {listDateFull(record.removed_at)?<span className="shrink-0 whitespace-nowrap">· {listDateFull(record.removed_at)}</span>:null}
       </small>
      </div>
      <ListActions>
       <button className="text-button" disabled={Boolean(busy)||bulkBusy} onClick={async()=>{setBusy(keyOf(record));setError('');try{await api(`/api/agency/${record.kind}/${record.id}/restore`,{});await Promise.all([load(),refresh()]);}catch(e){setError(errorMessage(e));}finally{setBusy('');}}}><RotateCcw size={14} aria-hidden="true"/>{busy===keyOf(record)?'Restaurando…':'Restaurar'}</button>
      </ListActions>
     </ListRow>)}
    </ListGrid>}
  {hasMore?<div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs tabular-nums text-mute">{records.length} de {total} registros cargados</span><Button variant="secondary" type="button" className="secondary" disabled={loadingMore} onClick={()=>void more()}>{loadingMore?'Cargando…':'Ver más'}</Button></div>:null}
 </ListPage>;
}
