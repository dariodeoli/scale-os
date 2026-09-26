"use client";
/**
 * Estudio (dominio OPS) — contenido v2 (campaña #41, spec #44).
 *
 * Tailwind + `owncoding-ui` + primitivas de `app/ui-v2.tsx`. La capa de datos
 * vive en `studio-data.ts` + `use-studio-data.ts`; acá sólo se dibuja, con las
 * mismas acciones, permisos y validaciones de solapamiento que antes.
 */
import {useEffect,useMemo,useState} from 'react';
import {Aviso,Button,Card,EmptyState,ErrorState,IconAction,Input,Label,Nota,Select} from 'owncoding-ui';
import {LoadingBlock,StateChip} from './ui-v2';
import {api,Dialog,Editor} from './operations';
import {ActorIdentity} from './actor-identity';
import {SaveActions} from './save-actions';
import {listDateFull} from './list-format';
import {BATCH_LIMITS, limitSelection} from './capabilities';
import {STUDIO_PRODUCTION_TYPES,studioCanManageReservation,studioMonthGrid,studioProductionTypeLabel,studioReservationsOverlap,type StudioContext as Context,type StudioProductionType as ProductionType,type StudioReservation,type StudioSpace} from './studio-data';
import {opsLocalTime,opsUtcTime} from './ops-time';
import {useStudioCatalog} from './use-studio-data';

// El contrato de datos y las funciones puras viven en `studio-data.ts`.
const RESERVATION_COLS='[--studio-cols:2.25rem_minmax(9.5rem,1.4fr)_minmax(15.5rem,1.2fr)_minmax(7.5rem,1fr)_minmax(8.5rem,1fr)_7rem_9rem]';
const RESERVATION_GRID='grid grid-cols-[var(--studio-cols)] items-center gap-x-2';
const CELL='min-w-0 text-[13px] leading-5';
// Targets táctiles: en móvil las acciones de ícono crecen a 44 px (32 en escritorio).
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-8 md:[&>button]:w-8';
// La fila densa de reservas conserva el ícono de 28 px en escritorio.
const ROW_ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';
const dateTime=(value:string)=>listDateFull(value)||'';

export function StudioWorkspace({role}:{role:string}){return ['owner','admin','management','production','finance','editor','viewer','sales','collaborator'].includes(role)?<StudioPanel/>:null;}
function StudioPanel(){
 const [month,setMonth]=useState(()=>opsLocalTime(new Date()).slice(0,7));
 const [notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0),[editSpace,setEditSpace]=useState<StudioSpace|'new'|null>(null),[editReservation,setEditReservation]=useState<StudioReservation|'new'|null>(null),[cancel,setCancel]=useState<StudioReservation|null>(null),[busy,setBusy]=useState(false);
 const {context,spaces,reservations,loading,error:loadError}=useStudioCatalog(month,refresh);
 const [actionError,setError]=useState('');
 const [selectedReservations,setSelectedReservations]=useState<string[]>([]),[bulkCancel,setBulkCancel]=useState(false),[bulkBusy,setBulkBusy]=useState(false);
 // Un ciclo de datos exitoso limpia el error de la última acción, igual que antes de separar la capa de datos.
 useEffect(()=>{if(!loading)setError('');},[loading]);
 const error=loadError||actionError;
 const saved=(message:string)=>{setNotice(message);setEditSpace(null);setEditReservation(null);setCancel(null);setRefresh(value=>value+1);};
 // Lote de reservas del mes: solo lo que el usuario puede gestionar y sigue reservada.
 const reservationSelectable=(reservation:StudioReservation)=>Boolean(context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved');
 const visibleSelectable=useMemo(()=>reservations.filter(reservationSelectable).map(reservation=>String(reservation.id)),[reservations,context]);
 const toggleReservation=(id:string)=>setSelectedReservations(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
 const selectVisibleReservations=()=>{const {selection,capped}=limitSelection(visibleSelectable,BATCH_LIMITS.studioReservations);setSelectedReservations(selection);if(capped)setNotice(`Se seleccionaron las primeras ${BATCH_LIMITS.studioReservations} reservas.`);};
 async function cancelSelectedReservations(){
  if(bulkBusy||!selectedReservations.length)return;
  setBulkBusy(true);setError('');
  const {selection,capped}=limitSelection(selectedReservations,BATCH_LIMITS.studioReservations);
  try{
   let cancelled=0;
   try{
    const data=await api<{cancelled?:string[]|number}>('/api/agency/studio-reservations/batch',{ids:selection,change:{cancel:true}},'POST');
    cancelled=Array.isArray(data.cancelled)?data.cancelled.length:Number(data.cancelled||selection.length);
   }catch(cause){
    // El endpoint de lote todavía no está (#59, PLT): se cae a los cancels unitarios.
    if(!/no encontrado|404/i.test(cause instanceof Error?cause.message:''))throw cause;
    for(const id of selection){
     const row=reservations.find(candidate=>String(candidate.id)===id);
     try{await api(`/api/agency/studio-reservations/${id}/cancel`,{expected_version:row?.version},'POST');cancelled+=1;}catch{/* la fila se saltea */}
    }
   }
   setBulkCancel(false);setSelectedReservations([]);setBulkBusy(false);
   saved(capped?`${cancelled} de ${selection.length} reservas canceladas (tope ${BATCH_LIMITS.studioReservations}).`:`${cancelled} reserva${cancelled===1?'':'s'} cancelada${cancelled===1?'':'s'}.`);
  }catch(cause){
   setBulkBusy(false);
   setError(cause instanceof Error?cause.message:'No se pudieron cancelar las reservas.');
  }
 }
 if(loading)return <Card className="min-w-0"><LoadingBlock label="Cargando espacios y calendario…" lines={4}/></Card>;
 if(error)return <Card className="min-w-0"><ErrorState title="No se pudo cargar el estudio." description={error} onRetry={()=>setRefresh(value=>value+1)}/></Card>;
 const activeSpaces=spaces.filter(space=>space.active);
 return <div className="grid min-w-0 gap-4">
  <Card className="grid min-w-0 gap-3">
   {notice?<Aviso tono="ok">{notice}</Aviso>:null}
   {!spaces.length?<EmptyState compact icon="store" title="Sin espacios todavía." description={context?.can_manage?'Creá un espacio para reservarlo después.':'Un responsable debe crear un espacio antes de reservar.'} action={context?.can_manage?<Button type="button" onClick={()=>setEditSpace('new')}>Agregar espacio</Button>:undefined}/>:<>
    <div className="flex flex-wrap items-center justify-between gap-2">
     <p className="text-xs text-mute">Los espacios disponibles se reservan por franja horaria; cada reserva bloquea solo su espacio.</p>
     <div className="flex flex-wrap items-center gap-2">
      {context?.can_manage?<Button type="button" variant="outline" onClick={()=>setEditSpace('new')}>Agregar espacio</Button>:null}
      {context?.can_reserve?<Button type="button" disabled={!activeSpaces.length} onClick={()=>setEditReservation('new')}>Nueva reserva</Button>:null}
     </div>
    </div>
    <div data-grid="studio-spaces" className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">{spaces.map(space=><article data-grid-card="studio-spaces" className="grid min-w-0 gap-1.5 rounded-xl border border-ink-600 bg-ink-800/60 p-3" key={space.id}>
     <div className="flex min-w-0 items-center justify-between gap-2"><h3 className="truncate text-sm font-semibold text-fore" title={space.name}>{space.name}</h3><StateChip tone={space.active?'ok':'mute'}>{space.active?'Disponible':'Inactivo'}</StateChip></div>
     <p className="truncate text-xs text-mute" title={space.scenario||'Escenario sin especificar'}>{space.scenario||'Escenario sin especificar'}</p>
     {space.notes?<small className="max-h-10 overflow-hidden text-xs leading-5 text-mute">{space.notes}</small>:null}
     {context?.can_manage?<div className={`mt-1 flex justify-end ${ICON_TARGETS}`}><IconAction icon="edit" label={`Editar espacio: ${space.name}`} onClick={()=>setEditSpace(space)}/></div>:null}
    </article>)}</div>
   </>}
  </Card>
  {(spaces.length||reservations.length)?<Card className="grid min-w-0 gap-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
     <h2 className="text-[17px] font-semibold tracking-tight text-fore">Calendario del estudio</h2>
     <p className="mt-1 text-xs leading-5 text-mute">Horario de Asunción. Una reserva activa bloquea únicamente su espacio.</p>
    </div>
    <div className="w-52"><Label htmlFor="studio-month">Mes</Label><Input id="studio-month" type="month" value={month} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(event.target.value))setMonth(event.target.value);}}/></div>
   </div>
   <StudioCalendar month={month} reservations={reservations}/>
  {visibleSelectable.length?<div className="bulk-bar" role="status" aria-live="polite">
    <span className="bulk-count">{selectedReservations.length?<><b>{selectedReservations.length}</b> de {BATCH_LIMITS.studioReservations} seleccionada{selectedReservations.length===1?'':'s'}</>:<span className="bulk-hint whitespace-normal">Seleccioná varias reservas del mes para cancelarlas juntas.</span>}</span>
    <div className="inline-actions bulk-actions">
      <button type="button" className="text-button min-h-11 md:min-h-8" onClick={selectVisibleReservations}>Seleccionar visibles</button>
      {selectedReservations.length?<>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>setBulkCancel(true)}>Cancelar</button>
        <button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setSelectedReservations([])}>Limpiar</button>
      </>:null}
    </div>
  </div>:null}
   <div data-list="studio-reservations" className="grid min-w-0 gap-2 md:hidden">
    {reservations.map(reservation=><article data-list-row="studio-reservations" className="grid min-w-0 gap-2 rounded-xl border border-ink-600/60 bg-ink-800/40 p-3" key={reservation.id}>
     <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><b className="block truncate text-[13px] font-semibold text-fore" title={reservation.title}>{reservation.title}</b><p className="truncate text-xs text-mute" title={`${reservation.space_name}${reservation.space_scenario?` · ${reservation.space_scenario}`:''} · ${studioProductionTypeLabel(reservation.production_type)}`}>{reservation.space_name}{reservation.space_scenario?` · ${reservation.space_scenario}`:''} · {studioProductionTypeLabel(reservation.production_type)}</p></div><StateChip tone={reservation.status==='reserved'?'info':'mute'}>{reservation.status==='reserved'?'Reservada':'Cancelada'}</StateChip></div>
     <p className="text-xs leading-5 tabular-nums text-mute">{dateTime(reservation.starts_at)} → {dateTime(reservation.ends_at)}</p>
     <div className="grid grid-cols-1 gap-1 text-xs text-mute"><p className="truncate" title={reservation.project_name||'Sin proyecto vinculado'}>Proyecto: {reservation.project_name||'Sin proyecto vinculado'}</p><p className="truncate" title={reservation.responsible_members.map(person=>person.name).join(', ')}>Responsables: {reservation.responsible_members.map(person=>person.name).join(', ')}</p></div>
     {(reservationSelectable(reservation)||context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved')?<div className="flex min-h-11 items-center justify-between gap-2 border-t border-ink-600/60 pt-2"><span>{reservationSelectable(reservation)?<label className="flex min-h-11 items-center gap-2 text-xs text-mute"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar reserva: ${reservation.title}`} checked={selectedReservations.includes(String(reservation.id))} onChange={()=>toggleReservation(String(reservation.id))}/><span>Seleccionar</span></label>:null}</span>{context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved'?<span className={`flex items-center gap-1 ${ICON_TARGETS}`}><IconAction icon="edit" label={`Editar reserva: ${reservation.title}`} onClick={()=>setEditReservation(reservation)}/><IconAction icon="close" tone="warn" label={`Cancelar reserva: ${reservation.title}`} onClick={()=>setCancel(reservation)}/></span>:null}</div>:null}
    </article>)}
    {!reservations.length?<EmptyState compact icon="calendar" title="No hay reservas en este mes."/>:null}
   </div>
   <div data-list="studio-reservations" className="hidden min-w-0 overflow-x-auto md:block">
    <div className={`${RESERVATION_COLS} grid min-w-[64rem] gap-2`}>
    {reservations.length?<div data-list-head="studio-reservations" className={`${RESERVATION_GRID} ${RESERVATION_COLS} px-3 text-[10px] font-bold uppercase tracking-wider text-mute`} aria-hidden="true"><span/><span>Reserva</span><span>Horario</span><span>Proyecto</span><span>Responsables</span><span>Estado</span><span className="text-right">Acciones</span></div>:null}
    {reservations.map(reservation=><div data-list-row="studio-reservations" className={`${RESERVATION_GRID} ${RESERVATION_COLS} min-h-[48px] content-center rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-1`} key={reservation.id}>
     <span className="flex h-11 items-center md:h-auto">{reservationSelectable(reservation)?<label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar reserva para operar en lote"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar reserva: ${reservation.title}`} checked={selectedReservations.includes(String(reservation.id))} onChange={()=>toggleReservation(String(reservation.id))}/></label>:null}</span>
     <span className="flex min-w-0 items-baseline gap-2"><b className="truncate text-[13px] font-semibold text-fore" title={reservation.title}>{reservation.title}</b><small className="truncate text-[11px] text-mute" title={`${reservation.space_name}${reservation.space_scenario?` · ${reservation.space_scenario}`:''} · ${studioProductionTypeLabel(reservation.production_type)}`}>{reservation.space_name}{reservation.space_scenario?` · ${reservation.space_scenario}`:''} · {studioProductionTypeLabel(reservation.production_type)}</small></span>
     <span className={`${CELL} whitespace-nowrap tabular-nums text-mute`}>{dateTime(reservation.starts_at)} → {dateTime(reservation.ends_at)}</span>
     <span className={`${CELL} truncate text-mute`} title={reservation.project_name||'Sin proyecto vinculado'}>{reservation.project_name||'Sin proyecto vinculado'}</span>
     <span className={`${CELL} flex min-w-0 items-center gap-1 overflow-hidden text-mute`}><span className="text-[11px]">Responsables:</span><span className="truncate" title={reservation.responsible_members.map(person=>person.name).join(', ')}>{reservation.responsible_members.map(person=>person.name).join(', ')}</span></span>
     <span className="flex"><StateChip tone={reservation.status==='reserved'?'info':'mute'}>{reservation.status==='reserved'?'Reservada':'Cancelada'}</StateChip></span>
     <span className={`flex flex-wrap items-center justify-end gap-1 ${ROW_ICON_TARGETS}`}>{context&&studioCanManageReservation(context,reservation)&&reservation.status==='reserved'?<><IconAction icon="edit" label={`Editar reserva: ${reservation.title}`} onClick={()=>setEditReservation(reservation)}/><IconAction icon="close" tone="warn" label={`Cancelar reserva: ${reservation.title}`} onClick={()=>setCancel(reservation)}/></>:null}</span>
     {reservation.actor_name||reservation.notes?<p className="col-span-full flex min-w-0 flex-nowrap items-center gap-x-3 overflow-hidden text-[11px] text-mute" title={[reservation.actor_name?`Creada por ${reservation.actor_name}`:'',reservation.notes?`Notas: ${reservation.notes}`:''].filter(Boolean).join(' · ')}>{reservation.actor_name?<span className="truncate" title={`Creada por ${reservation.actor_name}`}>Creada por {reservation.actor_name}</span>:null}{reservation.notes?<span className="truncate" title={reservation.notes}>{reservation.notes}</span>:null}</p>:null}
    </div>)}
    {!reservations.length?<EmptyState icon="calendar" title="No hay reservas en este mes."/>:null}
    </div>
   </div>
  </Card>:null}
  {editSpace&&context?.can_manage?<Dialog title={editSpace==='new'?'Nuevo espacio de estudio':'Editar espacio'} close={()=>setEditSpace(null)}><Editor closeOnSave fields={[{key:'name',label:'Nombre del espacio'},{key:'scenario',label:'Escenario o fondo',optional:true},{key:'active',label:'Disponibilidad',choices:[{value:'true',label:'Disponible para reservar'},{value:'false',label:'Inactivo'}]},{key:'notes',label:'Notas',type:'textarea',optional:true}]} defaults={editSpace==='new'?{name:'',scenario:'',active:'true',notes:''}:{name:editSpace.name,scenario:editSpace.scenario,active:String(editSpace.active),notes:editSpace.notes}} save={async values=>{await api(`/api/agency/studio-spaces${editSpace==='new'?'':`/${editSpace.id}`}`,{...values,active:values.active==='true'},editSpace==='new'?'POST':'PATCH');saved('Espacio guardado.');}}/></Dialog>:null}
  {editReservation&&context?.can_reserve?<Dialog title={editReservation==='new'?'Nueva reserva de estudio':'Editar reserva de estudio'} close={()=>setEditReservation(null)}><StudioReservationForm context={context} spaces={spaces} reservations={reservations} record={editReservation==='new'?null:editReservation} done={()=>saved('Reserva guardada.')} /></Dialog>:null}
  {bulkCancel?<Dialog title={`Cancelar ${selectedReservations.length} reserva${selectedReservations.length===1?'':'s'} de estudio`} busy={bulkBusy} close={()=>{if(!bulkBusy)setBulkCancel(false);}}><p className="text-sm text-mute">Se liberan los espacios de esas franjas. No afecta equipos ni otras reservas.</p><SaveActions pending={bulkBusy} cancelLabel="Volver"><Button type="button" disabled={bulkBusy} onClick={()=>void cancelSelectedReservations()}>Cancelar reservas</Button></SaveActions></Dialog>:null}
  {cancel?<Dialog title="Cancelar reserva de estudio" busy={busy} close={()=>{if(!busy)setCancel(null);}}><p className="text-sm text-mute">Se libera el espacio para esa franja. No afecta equipos ni otras reservas.</p><SaveActions pending={busy} cancelLabel="Volver"><Button type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);try{await api(`/api/agency/studio-reservations/${cancel.id}/cancel`,{expected_version:cancel.version});saved('Reserva cancelada.');}catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}}}>{busy?'Cancelando…':'Confirmar cancelación'}</Button></SaveActions></Dialog>:null}
 </div>;
}
function StudioReservationForm({context,spaces,reservations,record,done}:{context:Context;spaces:StudioSpace[];reservations:StudioReservation[];record:StudioReservation|null;done:()=>void}){
 const [title,setTitle]=useState(record?.title||''),[space,setSpace]=useState(String(record?.space_id||'')),[project,setProject]=useState(String(record?.project_id||'')),[productionType,setProductionType]=useState<ProductionType>(record?.production_type||'video'),[startsAt,setStartsAt]=useState(record?opsLocalTime(record.starts_at):''),[endsAt,setEndsAt]=useState(record?opsLocalTime(record.ends_at):''),[members,setMembers]=useState<string[]>(record?.responsible_members.map(person=>String(person.id))||(context.role==='production'?[String(context.user_id)]:[])),[notes,setNotes]=useState(record?.notes||''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const toggle=(id:string)=>setMembers(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{if(!members.length)throw Error('Elegí al menos un responsable');if(!space)throw Error('Elegí un espacio');const starts=opsUtcTime(startsAt),ends=opsUtcTime(endsAt);if(ends<=starts)throw Error('La hora de cierre debe ser posterior al inicio');const conflict=studioReservationsOverlap(reservations,{spaceId:space,startsAt:starts,endsAt:ends,ignoreId:record?.id});if(conflict)throw Error(`El espacio ${conflict.space_name} ya está reservado de ${dateTime(conflict.starts_at)} a ${dateTime(conflict.ends_at)} (${conflict.title}).`);await api(`/api/agency/studio-reservations${record?`/${record.id}`:''}`,{title,space_id:space,project_id:project||null,production_type:productionType,starts_at:starts,ends_at:ends,responsible_user_ids:members,notes,...(record?{expected_version:record.version}:{})},record?'PATCH':'POST');done();}catch(reason){setError(errorMessage(reason));}finally{setBusy(false);}}}>
  <div className="sm:col-span-2"><Label htmlFor="studio-reservation-title">Nombre de la reserva</Label><Input id="studio-reservation-title" value={title} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setTitle(event.target.value)} required minLength={2} maxLength={160} placeholder="Grabación de campaña · cliente"/></div>
  <div><Label htmlFor="studio-reservation-space">Espacio</Label><Select id="studio-reservation-space" value={space} onChange={(event:React.ChangeEvent<HTMLSelectElement>)=>setSpace(event.target.value)}><option value="">Elegí un espacio</option>{spaces.filter(item=>item.active||String(item.id)===String(record?.space_id)).map(item=><option key={item.id} value={String(item.id)}>{item.scenario?item.name+' · '+item.scenario:item.name}</option>)}</Select></div>
  <div><Label htmlFor="studio-reservation-type">Tipo de producción</Label><Select id="studio-reservation-type" value={productionType} onChange={(event:React.ChangeEvent<HTMLSelectElement>)=>setProductionType(event.target.value as ProductionType)}>{STUDIO_PRODUCTION_TYPES.map(type=><option key={type.value} value={type.value}>{type.label}</option>)}</Select></div>
  <div className="sm:col-span-2"><Label htmlFor="studio-reservation-project">Proyecto vinculado · Opcional</Label><Select id="studio-reservation-project" value={project} onChange={(event:React.ChangeEvent<HTMLSelectElement>)=>setProject(event.target.value)}><option value="">Sin proyecto vinculado</option>{context.projects.map(item=><option key={item.id} value={String(item.id)}>{item.client_name?item.client_name+' · '+item.name:item.name}</option>)}</Select></div>
  <div><Label htmlFor="studio-reservation-start">Desde · Asunción</Label><Input id="studio-reservation-start" type="datetime-local" value={startsAt} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setStartsAt(event.target.value)} required/></div>
  <div><Label htmlFor="studio-reservation-end">Hasta · Asunción</Label><Input id="studio-reservation-end" type="datetime-local" value={endsAt} min={startsAt||undefined} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEndsAt(event.target.value)} required/></div>
  <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Responsables · {members.length} de {BATCH_LIMITS.reservationResponsibles}</legend><div className="grid gap-1 sm:grid-cols-2">{context.members.map(person=><label className="flex min-h-11 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore md:min-h-0" key={person.id}><input type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={members.includes(String(person.id))} disabled={members.length>=BATCH_LIMITS.reservationResponsibles&&!members.includes(String(person.id))} onChange={()=>toggle(String(person.id))}/><ActorIdentity name={person.name} photoUrl={person.photo_url} verified/></label>)}</div>{members.length>=BATCH_LIMITS.reservationResponsibles?<Nota tono="warn" compact>El lote admite hasta {BATCH_LIMITS.reservationResponsibles} responsables: quitá uno para sumar otro.</Nota>:null}</fieldset>
  <div className="sm:col-span-2"><Label htmlFor="studio-reservation-notes">Notas · Opcional</Label><textarea id="studio-reservation-notes" className="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={notes} onChange={(event:React.ChangeEvent<HTMLTextAreaElement>)=>setNotes(event.target.value)} maxLength={2000}/></div>
  <p className="text-xs text-mute sm:col-span-2">El sistema impide reservas que se superpongan en el mismo espacio. Reservar un estudio no bloquea inventario.</p>
  {error?<Aviso tono="error" className="sm:col-span-2">{error}</Aviso>:null}<div className="sm:col-span-2"><SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar reserva'}</Button></SaveActions></div>
 </form>;
}
function StudioCalendar({month,reservations}:{month:string;reservations:StudioReservation[]}){
 const {blanks,days}=studioMonthGrid(month,reservations);
 return <div className="grid gap-2" aria-label="Calendario mensual del estudio"><div className="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-mute">{day}</span>)}</div><div className="grid grid-cols-2 gap-1 sm:grid-cols-3 min-[769px]:grid-cols-7">{Array.from({length:blanks},(_,index)=><div className="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key={`blank-${index}`}/>)}{days.map(({date,day,reservations:rows})=><div className="grid min-h-[4.25rem] content-start gap-1 rounded-lg border border-ink-600/60 p-2 min-[769px]:min-h-16 min-[769px]:p-1" key={date}><time className="text-[11px] tabular-nums text-mute" dateTime={date} aria-label={date}>{day}</time>{rows.map(item=><div className="grid gap-0.5 rounded-md border border-fono/30 bg-fono/10 px-1.5 py-1 text-[11px] text-fono-light" key={item.id}><b className="truncate" title={item.space_name}>{item.space_name}</b><span className="truncate text-mute" title={item.title}>{item.title}</span></div>)}</div>)}</div></div>;
}
