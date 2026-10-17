"use client";
import {validateMonth} from './ui/temporal-value';
import {useTemporalFilter} from './use-temporal-filter';
import {InputControl as Input,InputControl} from './ui/input-control';
/**
 * Estudio (dominio OPS) — contenido v2 (campaña #41, spec #44).
 *
 * Tailwind + `owncoding-ui` + primitivas de `app/ui-v2.tsx`. La capa de datos
 * vive en `studio-data.ts` + `use-studio-data.ts`; acá sólo se dibuja, con las
 * mismas acciones, permisos y validaciones de solapamiento que antes.
 */
import {useEffect,useMemo,useState} from 'react';
import {Aviso,Button,Card,EmptyState,ErrorState,IconAction,Label,Nota,fechaLista} from 'owncoding-ui';
import {SearchField} from './search-field';
import {ConfirmDialog} from './dialog';
import {SelectCustom} from './profile-controls';
import {notify} from './feedback';
import {BulkBar,FilterToolbar,ListActions,ListGrid,ListPage,ListRow,LoadingBlock,StateChip,useBulkSelection,type Column} from './ui-v2';
import {api,Dialog,Editor} from './operations';
import {ActorIdentity} from './actor-identity';
import {OPS_TIME_ZONE} from './ops-time';
import {BATCH_LIMITS, limitSelection} from './capabilities';
import {STUDIO_PRODUCTION_TYPES,studioCanManageReservation,studioMonthGrid,studioProductionTypeLabel,studioReservationsOverlap,type StudioContext as Context,type StudioProductionType as ProductionType,type StudioReservation,type StudioSpace} from './studio-data';
import {opsLocalTime,opsUtcTime} from './ops-time';
import {useStudioCatalog} from './use-studio-data';

// El contrato de datos y las funciones puras viven en `studio-data.ts`.
// Una sola plantilla para el encabezado y las filas (ListGrid/ListRow). La selección
// vive dentro de la celda de la reserva, como en Presupuestos.
const RESERVATION_TEMPLATE='grid-cols-[var(--studio-cols)]';
const RESERVATION_COLS='[--studio-cols:minmax(13rem,1.5fr)_minmax(14rem,1.2fr)_minmax(7.5rem,1fr)_minmax(8.5rem,1fr)_6.5rem_5rem]';
const RESERVATION_COLUMNS:Column[]=[{key:'reservation',label:'Reserva'},{key:'schedule',label:'Horario'},{key:'project',label:'Proyecto'},{key:'people',label:'Responsables'},{key:'status',label:'Estado'},{key:'actions',label:'Acciones'}];
const fold=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const CELL='min-w-0 text-[13px] leading-5';
// Targets táctiles: en móvil las acciones de ícono crecen a 44 px (32 en escritorio).
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-8 md:[&>button]:w-8';
// La fila densa de reservas conserva el ícono de 28 px en escritorio.
const ROW_ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';
const dateTime=(value:string)=>fechaLista(value,'',{timeZone:OPS_TIME_ZONE});

export function StudioWorkspace({role}:{role:string}){return ['owner','admin','management','production','finance','editor','viewer','sales','collaborator'].includes(role)?<StudioPanel/>:null;}
function StudioPanel(){
 const [month,,monthDraft,setMonthDraft]=useTemporalFilter(()=>opsLocalTime(new Date()).slice(0,7),value=>validateMonth(value)?value:null);
 const [refresh,setRefresh]=useState(0),[editSpace,setEditSpace]=useState<StudioSpace|'new'|null>(null),[editReservation,setEditReservation]=useState<StudioReservation|'new'|null>(null),[cancel,setCancel]=useState<StudioReservation|null>(null),[busy,setBusy]=useState(false);
 const {context,spaces,reservations,loading,error:loadError}=useStudioCatalog(month,refresh);
 const [actionError,setError]=useState('');
 const [bulkCancel,setBulkCancel]=useState(false),[bulkBusy,setBulkBusy]=useState(false);
 const [query,setQuery]=useState(''),[spaceFilter,setSpaceFilter]=useState(''),[statusFilter,setStatusFilter]=useState('');
 const bulk=useBulkSelection({limit:BATCH_LIMITS.studioReservations,noun:'reservas',cappedMessage:`Se seleccionaron las primeras ${BATCH_LIMITS.studioReservations} reservas.`});
 const selectedReservations=bulk.ids;
 // Un ciclo de datos exitoso limpia el error de la última acción, igual que antes de separar la capa de datos.
 useEffect(()=>{if(!loading)setError('');},[loading]);
 // El error de la carga inicial bloquea la pantalla; el de una acción se avisa
 // aparte y no borra el calendario que ya está en pantalla.
 const error=loadError;
 const saved=(message:string)=>{notify({tone:'success',message});setEditSpace(null);setEditReservation(null);setCancel(null);setRefresh(value=>value+1);};
 // Lote de reservas del mes: solo lo que el usuario puede gestionar y sigue reservada.
 const reservationSelectable=(reservation:StudioReservation)=>Boolean(context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved');
 const shown=useMemo(()=>{
  const needle=fold(query.trim());
  return reservations.filter(reservation=>(!spaceFilter||String(reservation.space_id)===spaceFilter)&&(!statusFilter||reservation.status===statusFilter)&&(!needle||fold([reservation.title,reservation.space_name,reservation.space_scenario,studioProductionTypeLabel(reservation.production_type),reservation.project_name,reservation.actor_name,...reservation.responsible_members.map(person=>person.name)].join(' ')).includes(needle)));
 },[reservations,query,spaceFilter,statusFilter]);
 const filtersActive=Boolean(query.trim()||spaceFilter||statusFilter);
 const clearFilters=()=>{setQuery('');setSpaceFilter('');setStatusFilter('');};
 const visibleSelectable=useMemo(()=>shown.filter(reservationSelectable).map(reservation=>String(reservation.id)),[shown,context]);
 const toggleReservation=bulk.toggle;
 const selectVisibleReservations=()=>bulk.selectVisible(visibleSelectable);
 async function cancelSelectedReservations(){
  if(bulkBusy||!selectedReservations.length)return;
  setBulkBusy(true);setError('');
  const {selection,capped}=limitSelection(selectedReservations,BATCH_LIMITS.studioReservations);
  // Cada fila se cuenta por su propia respuesta: el aviso nunca da por cancelada
  // una reserva que el API no confirmó.
  let cancelled=0;let failed:string[]=[];
  const cancelOne=async(id:string)=>{
   const row=reservations.find(candidate=>String(candidate.id)===id);
   try{await api(`/api/agency/studio-reservations/${id}/cancel`,{expected_version:row?.version},'POST');cancelled+=1;}
   catch{failed.push(id);}
  };
  try{
   let confirmedByBatch=false;
   try{
    const data=await api<{cancelled?:string[]|number}>('/api/agency/studio-reservations/batch',{ids:selection,change:{cancel:true}},'POST');
    if(Array.isArray(data.cancelled)){cancelled=data.cancelled.length;confirmedByBatch=true;}
    else if(typeof data.cancelled==='number'){cancelled=data.cancelled;confirmedByBatch=true;}
    // Sin el detalle en la respuesta no se puede afirmar cuáles quedaron canceladas:
    // se cae a los cancels unitarios.
   }catch(cause){
    // El endpoint de lote todavía no está (#59, PLT): se cae a los cancels unitarios.
    if(!/no encontrado|404/i.test(cause instanceof Error?cause.message:''))throw cause;
   }
   if(!confirmedByBatch){cancelled=0;failed=[];for(const id of selection)await cancelOne(id);}
   if(failed.length){
    const titles=failed.slice(0,3).map(id=>reservations.find(row=>String(row.id)===id)?.title||`Reserva ${id}`);
    bulk.replace(failed);
    setError(`No se pudieron cancelar ${failed.length} de ${selection.length} reservas: ${titles.join(', ')}${failed.length>3?'…':''}. Probá de nuevo; las demás quedaron canceladas.`);
    return;
   }
   setBulkCancel(false);bulk.clear();
   saved(capped?`${cancelled} de ${selection.length} reservas canceladas (tope ${BATCH_LIMITS.studioReservations}).`:`${cancelled} reserva${cancelled===1?'':'s'} cancelada${cancelled===1?'':'s'}.`);
  }catch(cause){
   setError(cause instanceof Error?cause.message:'No se pudieron cancelar las reservas.');
  }finally{
   setBulkBusy(false);
  }
 }
 const activeSpaces=spaces.filter(space=>space.active);
 const canReserve=Boolean(context?.can_reserve);
 const spaceChoices=[{value:'',label:'Todos los espacios'},...spaces.map(space=>({value:String(space.id),label:space.name}))];
 const statusChoices=[{value:'',label:'Todos los estados'},{value:'reserved',label:'Reservada'},{value:'cancelled',label:'Cancelada'}];
 const primaryAction=!loading&&!error?<>
  {context?.can_manage?<Button type="button" variant="outline" onClick={()=>setEditSpace('new')}>Agregar espacio</Button>:null}
  {canReserve?<Button type="button" disabled={!activeSpaces.length} onClick={()=>setEditReservation('new')}>Nueva reserva</Button>:null}
 </>:undefined;
 const showReservations=Boolean(spaces.length||reservations.length);
 const toolbar=!loading&&!error&&showReservations?<FilterToolbar className="mb-0" summary={`${shown.length} de ${reservations.length} reserva${reservations.length===1?'':'s'}`}>
  <SearchField className="w-full sm:w-64" label="Buscar reserva" hideLabel value={query} onChange={(nextSearchValue)=>setQuery(nextSearchValue)} placeholder="Reserva, espacio, proyecto o persona…"/>
  <div className="w-full sm:w-52"><SelectCustom label="Espacio" choices={spaceChoices} value={spaceFilter} onChange={setSpaceFilter}/></div>
  <div className="w-full sm:w-44"><SelectCustom label="Estado" choices={statusChoices} value={statusFilter} onChange={setStatusFilter}/></div>
  <div className="flex items-center gap-2"><Label htmlFor="studio-month" className="whitespace-nowrap">Mes</Label><Input id="studio-month" className="w-44" type="month" value={monthDraft} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setMonthDraft(event.target.value)}/></div>
  {filtersActive?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={clearFilters}>Limpiar filtros</button>:null}
  {visibleSelectable.length?<button type="button" className="text-button min-h-11 md:min-h-8" title={`Seleccioná hasta ${BATCH_LIMITS.studioReservations} reservas del mes para cancelarlas juntas`} onClick={selectVisibleReservations}>Seleccionar visibles</button>:null}
 </FilterToolbar>:undefined;
 const bulkBar=!loading&&!error?<BulkBar count={bulk.count} total={BATCH_LIMITS.studioReservations} label="seleccionada" onClear={bulk.clear}>
  <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>setBulkCancel(true)}>Cancelar</button>
 </BulkBar>:undefined;
 const rowTitle=(reservation:StudioReservation)=>`${reservation.space_name}${reservation.space_scenario?` · ${reservation.space_scenario}`:''} · ${studioProductionTypeLabel(reservation.production_type)}`;
 const responsibles=(reservation:StudioReservation)=>reservation.responsible_members.map(person=>person.name).join(', ');
 const canAct=(reservation:StudioReservation)=>Boolean(context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved');
 const emptyReservations=<EmptyState compact icon="calendar" title="No hay reservas en este mes." description="Elegí un espacio y una franja para reservarlo." action={canReserve&&activeSpaces.length?<Button type="button" onClick={()=>setEditReservation('new')}>Nueva reserva</Button>:undefined}/>;
 const noMatches=<EmptyState compact icon="filter" title="Ninguna reserva coincide con los filtros." description="Probá con otro espacio, estado o búsqueda." action={<button type="button" className="secondary" onClick={clearFilters}>Limpiar filtros</button>}/>;
 return <ListPage aria-label="Estudio" primaryAction={primaryAction} toolbar={toolbar} bulk={bulkBar}>
  {loading?<Card className="min-w-0"><LoadingBlock label="Cargando espacios y calendario…" lines={4}/></Card>:error?<Card className="min-w-0"><ErrorState title="No se pudo cargar el estudio." description={error} onRetry={()=>setRefresh(value=>value+1)}/></Card>:<>
  {actionError?<Aviso tono="error">{actionError}</Aviso>:null}
  {showReservations?<Card className="grid min-w-0 gap-4">
   <div className="flex min-w-0 flex-wrap items-center gap-3">
    <h2 className="m-0 text-[17px] font-semibold tracking-tight text-fore">Calendario del estudio</h2>
    <p className="m-0 min-w-0 flex-1 truncate text-xs leading-5 text-mute" title="Horario de Asunción. Una reserva activa bloquea únicamente su espacio.">Horario de Asunción. Una reserva activa bloquea únicamente su espacio.</p>
   </div>
   <StudioCalendar month={month} reservations={reservations}/>
   <div data-list="studio-reservations" className="grid min-w-0 gap-2 md:hidden">
    {shown.map(reservation=><article data-list-row="studio-reservations" className="grid min-w-0 gap-2 rounded-xl border border-ink-600/60 bg-ink-800/40 p-3" key={reservation.id}>
     <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><b className="block truncate text-[13px] font-semibold text-fore" title={reservation.title}>{reservation.title}</b><p className="m-0 truncate text-xs text-mute" title={rowTitle(reservation)}>{rowTitle(reservation)}</p></div><StateChip tone={reservation.status==='reserved'?'info':'mute'}>{reservation.status==='reserved'?'Reservada':'Cancelada'}</StateChip></div>
     <p className="m-0 text-xs leading-5 tabular-nums text-mute">{dateTime(reservation.starts_at)} → {dateTime(reservation.ends_at)}</p>
     <div className="grid grid-cols-1 gap-1 text-xs text-mute"><p className="m-0 truncate" title={reservation.project_name||'Sin proyecto vinculado'}>Proyecto: {reservation.project_name||'Sin proyecto vinculado'}</p><p className="m-0 truncate" title={responsibles(reservation)}>Responsables: {responsibles(reservation)}</p></div>
     {(reservationSelectable(reservation)||canAct(reservation))?<div className="flex min-h-11 items-center justify-between gap-2 border-t border-ink-600/60 pt-2"><span>{reservationSelectable(reservation)?<label className="flex min-h-11 items-center gap-2 text-xs text-mute"><InputControl type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar reserva: ${reservation.title}`} checked={bulk.has(String(reservation.id))} onChange={()=>toggleReservation(String(reservation.id))}/><span>Seleccionar</span></label>:null}</span>{canAct(reservation)?<span className={`flex items-center gap-1 ${ICON_TARGETS}`}><IconAction icon="edit" label={`Editar reserva: ${reservation.title}`} onClick={()=>setEditReservation(reservation)}/><IconAction icon="close" tone="warn" label={`Cancelar reserva: ${reservation.title}`} onClick={()=>setCancel(reservation)}/></span>:null}</div>:null}
    </article>)}
    {!reservations.length?emptyReservations:!shown.length?noMatches:null}
   </div>
   <div data-list="studio-reservations" className="hidden min-w-0 md:block">
    {shown.length?<ListGrid label="Reservas del estudio" template={RESERVATION_TEMPLATE} columns={RESERVATION_COLUMNS} minWidthClass="min-w-[60rem]" pinnedActions className={RESERVATION_COLS}>
     {shown.map(reservation=><ListRow template={RESERVATION_TEMPLATE} className="content-center" key={reservation.id}>
      <span role="cell" className="flex min-w-0 items-center gap-2">{reservationSelectable(reservation)?<label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar reserva para operar en lote"><InputControl type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar reserva: ${reservation.title}`} checked={bulk.has(String(reservation.id))} onChange={()=>toggleReservation(String(reservation.id))}/></label>:null}<span className="flex min-w-0 items-baseline gap-2"><b className="truncate text-[13px] font-semibold text-fore" title={reservation.title}>{reservation.title}</b><small className="truncate text-[11px] text-mute" title={rowTitle(reservation)}>{rowTitle(reservation)}</small></span></span>
      <span role="cell" className={`${CELL} whitespace-nowrap tabular-nums text-mute`}>{dateTime(reservation.starts_at)} → {dateTime(reservation.ends_at)}</span>
      <span role="cell" className={`${CELL} truncate text-mute`} title={reservation.project_name||'Sin proyecto vinculado'}>{reservation.project_name||'Sin proyecto vinculado'}</span>
      <span role="cell" className={`${CELL} truncate text-mute`} title={responsibles(reservation)}>{responsibles(reservation)}</span>
      <span role="cell" className="flex"><StateChip tone={reservation.status==='reserved'?'info':'mute'}>{reservation.status==='reserved'?'Reservada':'Cancelada'}</StateChip></span>
      <ListActions className={ROW_ICON_TARGETS}>{canAct(reservation)?<><IconAction icon="edit" label={`Editar reserva: ${reservation.title}`} onClick={()=>setEditReservation(reservation)}/><IconAction icon="close" tone="warn" label={`Cancelar reserva: ${reservation.title}`} onClick={()=>setCancel(reservation)}/></>:null}</ListActions>
      {reservation.actor_name||reservation.notes?<p className="m-0 col-span-full flex min-w-0 flex-nowrap items-center gap-x-3 overflow-hidden text-[11px] text-mute" title={[reservation.actor_name?`Creada por ${reservation.actor_name}`:'',reservation.notes?`Notas: ${reservation.notes}`:''].filter(Boolean).join(' · ')}>{reservation.actor_name?<span className="truncate" title={`Creada por ${reservation.actor_name}`}>Creada por {reservation.actor_name}</span>:null}{reservation.notes?<span className="truncate" title={reservation.notes}>{reservation.notes}</span>:null}</p>:null}
     </ListRow>)}
    </ListGrid>:!reservations.length?emptyReservations:noMatches}
   </div>
  </Card>:null}
  {/* Reorganización IA: la agenda (lo que se viene a consultar o reservar) va
      primero, junto a sus filtros; el catálogo de espacios queda debajo. */}
  <Card className="grid min-w-0 gap-3">
   {!spaces.length?<EmptyState compact icon="store" title="Sin espacios todavía." description={context?.can_manage?'Creá un espacio para reservarlo después.':'Un responsable debe crear un espacio antes de reservar.'} action={context?.can_manage?<Button type="button" onClick={()=>setEditSpace('new')}>Agregar espacio</Button>:undefined}/>:<>
    <p className="m-0 text-xs text-mute">Los espacios disponibles se reservan por franja horaria; cada reserva bloquea solo su espacio.</p>
    <div data-grid="studio-spaces" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{spaces.map(space=><article data-grid-card="studio-spaces" className="flex min-w-0 flex-col gap-1.5 rounded-xl border border-ink-600 bg-ink-800/60 p-4" key={space.id}>
     <div className="flex min-w-0 items-center justify-between gap-2"><h3 className="m-0 truncate text-sm font-semibold text-fore" title={space.name}>{space.name}</h3><StateChip tone={space.active?'ok':'mute'}>{space.active?'Disponible':'Inactivo'}</StateChip></div>
     <p className="m-0 truncate text-xs text-mute" title={space.scenario||'Escenario sin especificar'}>{space.scenario||'Escenario sin especificar'}</p>
     {space.notes?<small className="line-clamp-2 text-xs leading-5 text-mute" title={space.notes}>{space.notes}</small>:null}
     {context?.can_manage?<div className={`mt-auto flex justify-end pt-1 ${ICON_TARGETS}`}><IconAction icon="edit" label={`Editar espacio: ${space.name}`} onClick={()=>setEditSpace(space)}/></div>:null}
    </article>)}</div>
   </>}
  </Card>
  </>}
  {editSpace&&context?.can_manage?<Dialog size="corto" title={editSpace==='new'?'Nuevo espacio de estudio':'Editar espacio'} close={()=>setEditSpace(null)}><Editor closeOnSave fields={[{key:'name',label:'Nombre del espacio',maxLength:120},{key:'scenario',label:'Escenario o fondo',optional:true},{key:'active',label:'Disponibilidad',choices:[{value:'true',label:'Disponible para reservar'},{value:'false',label:'Inactivo'}]},{key:'notes',label:'Notas',type:'textarea',optional:true,maxLength:2000}]} defaults={editSpace==='new'?{name:'',scenario:'',active:'true',notes:''}:{name:editSpace.name,scenario:editSpace.scenario,active:String(editSpace.active),notes:editSpace.notes}} save={async values=>{await api(`/api/agency/studio-spaces${editSpace==='new'?'':`/${editSpace.id}`}`,{...values,active:values.active==='true'},editSpace==='new'?'POST':'PATCH');saved('Espacio guardado.');}}/></Dialog>:null}
  {editReservation&&context?.can_reserve?<Dialog size="amplio" title={editReservation==='new'?'Nueva reserva de estudio':'Editar reserva de estudio'} close={()=>setEditReservation(null)}><StudioReservationForm context={context} spaces={spaces} reservations={reservations} record={editReservation==='new'?null:editReservation} done={()=>saved('Reserva guardada.')} /></Dialog>:null}
  {bulkCancel?<ConfirmDialog open variant="danger" title={`Cancelar ${selectedReservations.length} reserva${selectedReservations.length===1?'':'s'} de estudio`} description="Se liberan los espacios de esas franjas. No afecta equipos ni otras reservas." confirmLabel="Cancelar reservas" cancelLabel="Volver" busy={bulkBusy} error={actionError} onCancel={()=>{if(!bulkBusy)setBulkCancel(false);}} onConfirm={()=>void cancelSelectedReservations()}/>:null}
  {cancel?<ConfirmDialog open variant="danger" title="Cancelar reserva de estudio" description="Se libera el espacio para esa franja. No afecta equipos ni otras reservas." confirmLabel="Confirmar cancelación" cancelLabel="Volver" busy={busy} onCancel={()=>{if(!busy)setCancel(null);}} onConfirm={async()=>{if(busy)return;setBusy(true);try{await api(`/api/agency/studio-reservations/${cancel.id}/cancel`,{expected_version:cancel.version});saved('Reserva cancelada.');}catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}}}/>:null}
 </ListPage>;
}
function StudioReservationForm({context,spaces,reservations,record,done}:{context:Context;spaces:StudioSpace[];reservations:StudioReservation[];record:StudioReservation|null;done:()=>void}){
 const [members,setMembers]=useState<string[]>(record?.responsible_members.map(person=>String(person.id))||(context.role==='production'?[String(context.user_id)]:[]));
 const toggle=(id:string)=>setMembers(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
 const [startDate='',startTime='']=(record?opsLocalTime(record.starts_at):'').split('T'),[endDate='',endTime='']=(record?opsLocalTime(record.ends_at):'').split('T');
 const responsibles=<fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Responsables · {members.length} de {BATCH_LIMITS.reservationResponsibles}</legend><div className="grid gap-1 sm:grid-cols-2">{context.members.map(person=><label className="flex min-h-11 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore md:min-h-0" key={person.id}><InputControl type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={members.includes(String(person.id))} disabled={members.length>=BATCH_LIMITS.reservationResponsibles&&!members.includes(String(person.id))} onChange={()=>toggle(String(person.id))}/><ActorIdentity name={person.name} photoUrl={person.photo_url} verified/></label>)}</div>{members.length>=BATCH_LIMITS.reservationResponsibles?<Nota tono="warn" compact>El lote admite hasta {BATCH_LIMITS.reservationResponsibles} responsables: quitá uno para sumar otro.</Nota>:null}</fieldset>;
 return <Editor label="Guardar reserva" fields={[
  {key:'title',label:'Nombre de la reserva',section:'Reserva',wide:true,maxLength:160,validate:value=>value.trim().length<2?'Ingresá al menos 2 caracteres.':null},
  {key:'space',label:'Espacio',section:'Reserva',choices:spaces.filter(item=>item.active||String(item.id)===String(record?.space_id)).map(item=>({value:String(item.id),label:item.scenario?item.name+' · '+item.scenario:item.name}))},
  {key:'productionType',label:'Tipo de producción',section:'Reserva',choices:STUDIO_PRODUCTION_TYPES.map(type=>({value:type.value,label:type.label}))},
  {key:'project',label:'Proyecto vinculado',section:'Reserva',optional:true,wide:true,choices:[{value:'',label:'Sin proyecto vinculado'},...context.projects.map(item=>({value:String(item.id),label:item.client_name?item.client_name+' · '+item.name:item.name}))],after:responsibles},
  {key:'startDate',label:'Desde · fecha (Asunción)',section:'Horario',type:'date'},
  {key:'startTime',label:'Desde · hora',section:'Horario',type:'time'},
  {key:'endDate',label:'Hasta · fecha (Asunción)',section:'Horario',type:'date'},
  {key:'endTime',label:'Hasta · hora',section:'Horario',type:'time'},
  {key:'notes',label:'Notas',section:'Notas',type:'textarea',optional:true,maxLength:2000,help:'El sistema impide reservas que se superpongan en el mismo espacio. Reservar un estudio no bloquea inventario.'},
 ]} defaults={{title:record?.title||'',space:String(record?.space_id||''),productionType:record?.production_type||'video',project:String(record?.project_id||''),startDate,startTime,endDate,endTime,notes:record?.notes||''}} save={async values=>{
  if(!members.length)throw Error('Elegí al menos un responsable');
  const starts=opsUtcTime(`${values.startDate}T${values.startTime}`),ends=opsUtcTime(`${values.endDate}T${values.endTime}`);
  if(ends<=starts)throw Error('La hora de cierre debe ser posterior al inicio');
  const conflict=studioReservationsOverlap(reservations,{spaceId:values.space,startsAt:starts,endsAt:ends,ignoreId:record?.id});
  if(conflict)throw Error(`El espacio ${conflict.space_name} ya está reservado de ${dateTime(conflict.starts_at)} a ${dateTime(conflict.ends_at)} (${conflict.title}).`);
  await api(`/api/agency/studio-reservations${record?`/${record.id}`:''}`,{title:values.title,space_id:values.space,project_id:values.project||null,production_type:values.productionType as ProductionType,starts_at:starts,ends_at:ends,responsible_user_ids:members,notes:values.notes,...(record?{expected_version:record.version}:{})},record?'PATCH':'POST');
  done();
 }}/>;
}
function StudioCalendar({month,reservations}:{month:string;reservations:StudioReservation[]}){
 const {blanks,days}=studioMonthGrid(month,reservations);
 return <div className="grid gap-2" aria-label="Calendario mensual del estudio"><div className="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-mute">{day}</span>)}</div><div className="grid grid-cols-2 gap-1 sm:grid-cols-3 min-[769px]:grid-cols-7">{Array.from({length:blanks},(_,index)=><div className="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key={`blank-${index}`}/>)}{days.map(({date,day,reservations:rows})=><div className="grid min-h-[4.25rem] content-start gap-1 rounded-lg border border-ink-600/60 p-2 min-[769px]:min-h-14 min-[769px]:p-1" key={date}><time className="text-[11px] tabular-nums text-mute" dateTime={date} aria-label={date}>{day}</time>{rows.map(item=><div className="grid gap-0.5 rounded-md border border-fono/30 bg-fono/10 px-1.5 py-1 text-[11px] text-fono-light" key={item.id}><b className="truncate" title={item.space_name}>{item.space_name}</b><span className="truncate text-mute" title={item.title}>{item.title}</span></div>)}</div>)}</div></div>;
}
