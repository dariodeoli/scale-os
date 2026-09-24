"use client";
import {useEffect,useState} from 'react';
import {api,Dialog} from './operations';
import {notify} from './feedback';
import {listDateFull} from './list-format';
import {RotateCcw,Trash2} from 'lucide-react';
import {ARCHIVE_KIND_CAPABILITIES,roleCan,type Capability} from './capabilities';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,ListGrid,ListRow,LoadingBlock,PageHeader} from './ui-v2';

// Fuente única con la papelera del API: el NAV usa el mismo mapa.
const roles=ARCHIVE_KIND_CAPABILITIES as Record<string,Capability>;
const labels:Record<string,string>={clients:'Cliente',projects:'Proyecto','work-orders':'Orden',leads:'Oportunidad',plans:'Plan',budgets:'Presupuesto',inventory:'Equipo de inventario',collaborators:'Colaborador',accounts:'Cuenta',members:'Acceso'}
const errorMessage=(e:unknown)=>e instanceof Error?e.message:'No se pudo completar la operación';

export function RemoveRecord({kind,id,name,role,done}:{kind:string;id:string;name:string;role:string;done:()=>Promise<void>}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const capability=roles[kind];
 if(!capability||!roleCan(role,capability))return null;
 const access=kind==='members';
 return <><button className="icon-button record-remove" type="button" title={access?'Quitar acceso':'Mover a la papelera'} aria-label={`${access?'Quitar acceso':'Mover a la papelera'}: ${name}`} onClick={()=>{setError('');setOpen(true);}}><Trash2 size={16} aria-hidden="true"/></button>
 {open&&<Dialog title={access?'Quitar acceso o invitación':'Mover a la papelera'} close={()=>{if(!busy)setOpen(false);}}>
  <p><strong>{name}</strong></p>
  <p>{access?'Esta persona dejará de entrar a esta empresa, incluso con Google. Sus sesiones se cerrarán. No se borrarán sus comentarios, pagos ni su acceso a otras empresas. Podés invitarla nuevamente desde Equipo.':'Se quitará de las listas activas y quedará en la Papelera. Podés restaurarlo después.'}</p>
  {['clients','projects'].includes(kind)&&<p className="form-note">Sus proyectos u órdenes vinculados también quedarán ocultos mientras este registro esté en la papelera. Restaurarlo volverá a mostrarlos, salvo los eliminados por separado.</p>}
  {kind==='budgets'&&<p className="form-note">El enlace público dejará de funcionar. Restaurar el presupuesto no volverá a publicarlo automáticamente.</p>}
  {kind==='accounts'&&<p className="form-note">Solo se pueden retirar cuentas con saldo cero. Su historial seguirá disponible.</p>}
  {kind==='collaborators'&&<p className="form-note">Esto retira el perfil del colaborador, no su acceso. Para revocar el acceso usá Equipo.</p>}
  {kind==='inventory'&&<p className="form-note">Archivar no equivale a dar de baja un activo: no modifica su valor patrimonial.</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  <div className="inline-actions"><button className="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</button><button className="secondary danger" disabled={busy} onClick={async()=>{setBusy(true);try{await api(`/api/agency/${kind}/${id}`,{},'DELETE');await done();setOpen(false);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}}>{busy?'Procesando…':access?'Confirmar: quitar acceso':'Confirmar: mover a papelera'}</button></div>
 </Dialog>}</>;
}

type Removed={kind:string;id:string;name:string;removed_at:string;actor_name?:string;actor_photo_url?:string;actor_verified?:boolean};

/** Plantilla v2 compartida entre el encabezado y las filas de la papelera. */
const TRASH_TEMPLATE='grid-cols-[2rem_7rem_minmax(16rem,2.4fr)_7rem]';
const TRASH_COLUMNS=[{key:'select',label:''},{key:'kind',label:'Tipo'},{key:'record',label:'Registro'},{key:'actions',label:'Acciones'}];

export function TrashWorkspace({refresh}:{refresh:()=>Promise<void>}){
 const [records,setRecords]=useState<Removed[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState('');
 const [selected,setSelected]=useState<string[]>([]),[bulkBusy,setBulkBusy]=useState(false);
 const keyOf=(r:Removed)=>`${r.kind}-${r.id}`;
 function toggleSelected(key:string){setSelected(current=>current.includes(key)?current.filter(value=>value!==key):[...current,key]);}
 async function restoreBatch(){
  if(bulkBusy||!selected.length)return;
  const total=selected.length;
  setBulkBusy(true);setError('');
  let restored=0;
  try{
   for(const key of selected){const record=records.find(item=>keyOf(item)===key);if(!record)continue;await api(`/api/agency/${record.kind}/${record.id}/restore`,{});restored+=1;}
   setSelected([]);await Promise.all([load(),refresh()]);
   notify({tone:restored===total?'success':'warning',message:`${restored} de ${total} registro${total===1?'':'s'} restaurado${restored===1?'':'s'}.`});
  }catch(e){setError(errorMessage(e));await load().catch(()=>{});}
  finally{setBulkBusy(false);}
 }
 async function load(){setRecords((await api<{records:Removed[]}>('/api/agency/trash')).records);}
 useEffect(()=>{void load().catch(e=>setError(errorMessage(e))).finally(()=>setLoading(false));},[]);
 const kinds=new Set(records.map(record=>record.kind)).size;
 const allSelected=records.length>0&&selected.length===records.length;
 return <section className="grid gap-4" aria-labelledby="trash-workspace-title">
  <PageHeader eyebrow="Configuración" title="Papelera de esta empresa" subtitle="Solo ves registros que tu permiso permite recuperar. No se borran de forma definitiva: los accesos retirados se devuelven con una nueva invitación desde Equipo."/>
  {error?<ErrorBlock title="No pudimos completar la operación" description={error} onRetry={()=>void load().catch(e=>setError(errorMessage(e)))}/>:null}
  <KpiStrip>
   <Kpi label="Registros en papelera" valor={records.length} hint="Recuperables con tu permiso actual" destacado/>
   <Kpi label="Tipos de registro" valor={kinds} hint="Clasificación del API"/>
   <Kpi label="Seleccionados" valor={selected.length} hint="Para restaurar en lote"/>
  </KpiStrip>
  <div className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div className="flex flex-wrap items-center justify-between gap-2" role="status" aria-live="polite">
    <p className="text-xs text-mute">{selected.length?<><b className="tabular-nums text-fore">{selected.length}</b> seleccionado{selected.length===1?'':'s'}</>:<span>Seleccioná varios para restaurar en lote</span>}</p>
    <div className="flex flex-wrap items-center gap-1">
     {records.length?<button type="button" className="text-button" onClick={()=>setSelected(allSelected?[]:records.map(keyOf))}>{allSelected?'Limpiar selección':'Seleccionar todos'}</button>:null}
     {selected.length?<><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void restoreBatch()}>{bulkBusy?'Restaurando…':'Restaurar'}</button><button type="button" className="text-button" onClick={()=>setSelected([])}>Limpiar</button></>:null}
    </div>
   </div>
   {loading?<LoadingBlock label="Cargando papelera…" lines={3}/>:!records.length?<EmptyBlock compact title="No hay registros en la papelera" description="Lo que se mueva a la papelera queda acá hasta que lo restaures."/>:
    <ListGrid label="Papelera" template={TRASH_TEMPLATE} columns={TRASH_COLUMNS} minWidthClass="min-w-[40rem]">
     {records.map(record=><ListRow key={keyOf(record)} template={TRASH_TEMPLATE}>
      <label className="relative flex items-center after:absolute after:-inset-3.5 after:content-['']" title="Seleccionar registro"><input type="checkbox" aria-label={`Seleccionar ${record.name}`} checked={selected.includes(keyOf(record))} onChange={()=>toggleSelected(keyOf(record))}/></label>
      <span className="whitespace-nowrap text-[11.5px] text-mute">{labels[record.kind]||record.kind}</span>
      <div className="flex min-w-0 items-baseline gap-2 overflow-hidden">
       <b className="min-w-0 truncate text-[13.5px] font-semibold leading-[1.2] text-fore" title={record.name}>{record.name}</b>
       <small className="flex min-w-0 items-baseline gap-2 text-[11.5px] text-mute">
        <span className="min-w-0 truncate" title={`Movido a Papelera por ${record.actor_name||'Sistema'}`}>Movido a Papelera por {record.actor_name||'Sistema'}</span>
        {listDateFull(record.removed_at)?<span className="shrink-0 whitespace-nowrap">· {listDateFull(record.removed_at)}</span>:null}
       </small>
      </div>
      <div className="flex justify-end">
       <button className="text-button" disabled={Boolean(busy)||bulkBusy} onClick={async()=>{setBusy(keyOf(record));setError('');try{await api(`/api/agency/${record.kind}/${record.id}/restore`,{});await Promise.all([load(),refresh()]);}catch(e){setError(errorMessage(e));}finally{setBusy('');}}}><RotateCcw size={14} aria-hidden="true"/>{busy===keyOf(record)?'Restaurando…':'Restaurar'}</button>
      </div>
     </ListRow>)}
    </ListGrid>}
  </div>
 </section>;
}
