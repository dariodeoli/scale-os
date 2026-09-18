"use client";
import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {api,Dialog,Editor,money} from './operations';
import {SaveActions} from './save-actions';
import {ActorAvatar,ActorIdentity,safePhoto} from './actor-identity';
import {SerialTexto,listDateFull,dueTone} from './list-format';
import {currencyChoices} from './currencies';
import {useCompanyCurrency} from './currency-provider';
import {AmountInput,SelectCustom} from './profile-controls';
import {preparePhoto,PHOTO_ACCEPT,PHOTO_FORMATS} from './profile-photo';
import {normalizeSerial} from './field-rules';
import {InventoryBarcode,inventoryCode,printInventoryLabel} from './inventory-label';
import {DndContext,DragOverlay,useDraggable,useDroppable,pointerWithin,type DragEndEvent} from '@dnd-kit/core';
import {Archive,BadgeCheck,BatteryCharging,Camera,CheckCircle2,CircleX,ClipboardCheck,Columns3,Eye,Grid2X2,HardDrive,Home,Lamp,Laptop,Lightbulb,List,Lock,Mic,Monitor,Package,Pencil,Plus,RefreshCw,Speaker,Tag,Trash2,TriangleAlert,Video,X,type LucideIcon} from 'lucide-react';
import './inventory-workspace.css';

type Person={id:string;name:string;photo_url?:string|null};
type Category={id:string;name:string;active:boolean;icon?:string|null};
export type StorageTemplate={id:string;name:string;active:boolean;item_count:number;responsible_user_id?:string|null;responsible_name?:string|null;responsible_photo_url?:string|null};
export type InventoryItem={id:string;name:string;inventory_code?:string;category:string;category_id:string|null;category_name?:string;category_icon?:string|null;serial_number:string|null;photo_url?:string|null;value:string;currency:string;status:string;storage_shelf:string;storage_row:string;storage_location_id?:string|null;storage_location_name?:string|null;location_changed_at?:string|null;custodian_user_id:string|null;location_type?:string;current_custodian_name?:string;production_name?:string;project_name?:string;return_user_name?:string;expected_return_at?:string;last_verified_at?:string|null;last_verified_by_user_id?:string|null;last_verification_result?:'confirmed'|'difference'|'missing'|null;last_verification_differences?:string;last_verifier_name?:string|null;last_verifier_photo_url?:string|null;[key:string]:unknown};
type ItemReference={id:string;name:string;inventory_code?:string;storage_shelf:string;storage_row:string};
type ReservationActors={actor_name?:string;actor_photo_url?:string;actor_verified?:boolean;checkout_actor_name?:string;checkout_actor_photo_url?:string;checkout_actor_verified?:boolean;return_actor_name?:string;return_actor_photo_url?:string;return_actor_verified?:boolean};
export type InventoryReservation=ReservationActors&{id:string;title:string;project_id:string;project_name:string;starts_at:string;ends_at:string;status:'reserved'|'checked_out'|'returned'|'cancelled';created_by_user_id:string;return_user_id:string;return_user_name:string;custodian_user_id:string|null;custodian_name:string|null;responsible_members:Person[];items:ItemReference[];notes:string;version:number};
type Context={user_id:string;role:string;time_zone:string;can_manage:boolean;can_reserve:boolean;members:Person[];projects:Person[]};
type InventoryVerification={id:string;result:'confirmed'|'difference'|'missing';differences?:string;note?:string;verified_at:string;verifier_name?:string;verifier_photo_url?:string|null};
type InventoryTrace={id:string;event_type:string;event_at:string;actor_name?:string;event_data?:Record<string,unknown>};
const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';
const statusLabels={reserved:'Reservado',checked_out:'Retirado',returned:'Devuelto',cancelled:'Cancelado'};
const itemStatuses=[{value:'available',label:'Disponible'},{value:'maintenance',label:'Mantenimiento'},{value:'retired',label:'Dado de baja'}];
const zone='America/Asuncion';
const dateTime=(value:string)=>new Intl.DateTimeFormat('es-PY',{timeZone:zone,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
const itemCode=(item:Pick<InventoryItem,'id'|'inventory_code'>)=>item.inventory_code||inventoryCode(item.id);
export const categoryIconMap:Record<string,LucideIcon>={'camera':Camera,'video':Video,'mic':Mic,'lamp':Lamp,'lightbulb':Lightbulb,'monitor':Monitor,'laptop':Laptop,'speaker':Speaker,'hard-drive':HardDrive,'battery-charging':BatteryCharging,'package':Package,'home':Home};
export function CategoryIcon({name}:{name?:string|null}){const Icon=name?categoryIconMap[name]:undefined;return Icon?<Icon size={14} aria-hidden="true"/>:null;}
const verificationLabel=(result:InventoryItem['last_verification_result'])=>({confirmed:'Confirmado',difference:'Con diferencias',missing:'No encontrado'} as Record<string,string>)[result||'']||'Sin control';
const verificationIcons:Record<string,LucideIcon>={confirmed:BadgeCheck,difference:TriangleAlert,missing:CircleX};
const firstName=(name?:string|null)=>(name||'').trim().split(/\s+/)[0]||'';
/** Shared control stamp: verified icon, author photo, first name and 24-hour date in that order. */
function VerificationStamp({item,className,empty}:{item:InventoryItem;className:string;empty:ReactNode}){
 const label=verificationLabel(item.last_verification_result);
 if(!item.last_verified_at)return <>{empty}</>;
 const Icon=verificationIcons[item.last_verification_result||'']||BadgeCheck;
 return <span className={`inventory-verify-stamp ${className}`} data-result={item.last_verification_result}>
  <span className="inventory-verify-check" role="img" title={`Control: ${label}`} aria-label={`Control: ${label}`}><Icon size={14} aria-hidden="true"/></span>
  <span className="inventory-control-avatar"><ActorAvatar name={item.last_verifier_name||'Verificador'} photo={safePhoto(item.last_verifier_photo_url)}/></span>
  <span className="inventory-verify-name">{firstName(item.last_verifier_name)||'Verificador'}</span>
  <time className="inventory-verify-time" dateTime={item.last_verified_at}>{dateTime(item.last_verified_at)}</time>
 </span>;
}
const equipmentStatusLabel=(status:string)=>(({available:'Disponible',in_use:'En uso',maintenance:'Mantenimiento',retired:'Dado de baja'} as Record<string,string>)[status]||status);
function EquipmentCard({item,selectable,selected,onSelect,canManage,verifying,onDetail,onVerify,onVerifyDetail,onEdit,onArchive}:{
 item:InventoryItem;selectable:boolean;selected:boolean;onSelect:()=>void;canManage:boolean;verifying:boolean;
 onDetail:(item:InventoryItem)=>void;onVerify:(item:InventoryItem)=>void;onVerifyDetail:(item:InventoryItem)=>void;onEdit:(item:InventoryItem)=>void;onArchive:(item:InventoryItem)=>void;
}){
 const code=itemCode(item),location=inventoryLocation(item);
 return <article className="inventory-equipment" data-status={item.status}>
  <div className="panel-heading inventory-card-head">
   <div className="inventory-item-title">
    {selectable?<label className="inventory-item-select" title="Seleccionar para operar en lote"><input type="checkbox" aria-label={`Seleccionar ${item.name}`} checked={selected} onChange={onSelect}/></label>:null}
    {item.photo_url?<img className="inventory-item-photo" src={item.photo_url} alt={`Foto de ${item.name}`}/>:null}
    <div className="inventory-item-name"><h3 title={item.name}>{item.name}</h3><code className="inventory-code">{code}</code></div>
   </div>
   <span className="inventory-state" data-status={item.status}>{equipmentStatusLabel(item.status)}</span>
  </div>
  <dl className="inventory-item-facts">
   <div className="inventory-fact"><dt>Categoría</dt><dd><CategoryIcon name={item.category_icon}/>{item.category_name||item.category||'Sin categoría'}</dd></div>
   <div className="inventory-fact inventory-fact-location"><dt>Ubicación</dt><dd title={location}>{location}</dd></div>
   <div className="inventory-fact"><dt>Serie / IMEI</dt><dd title={item.serial_number||undefined}>{item.serial_number?<SerialTexto value={item.serial_number}/>:'Sin registrar'}</dd></div>
   <div className="inventory-fact"><dt>Valor</dt><dd className="list-amount">{money(item.value,item.currency)}</dd></div>
  </dl>
  <div className="inventory-card-foot">
   <div className="inventory-card-control">
    <VerificationStamp item={item} className="inventory-verify-chip" empty={<span className="hub-chip muted">Sin verificación física</span>}/>
    {canManage?<button type="button" className="icon-button positive inventory-verify-action" disabled={verifying} title={verifying?'Verificando…':'Marcar verificado'} aria-label={verifying?'Verificando…':`Marcar verificado: ${item.name}`} onClick={()=>onVerify(item)}><CheckCircle2 size={16}/></button>:null}
    {item.return_user_name?<span className="hub-chip inventory-return-chip">Devuelve {item.return_user_name}{item.expected_return_at?<> · previsto <span className="list-date" data-tone={dueTone(item.expected_return_at)||undefined}>{listDateFull(item.expected_return_at)}</span></>:null}</span>:null}
   </div>
   <div className="inline-actions inventory-item-actions">
    <button className="icon-button" type="button" title="Detalle y trazabilidad" aria-label={`Detalle y trazabilidad: ${item.name}`} onClick={()=>onDetail(item)}><Eye size={16}/></button>
    <button className="icon-button" type="button" title="Imprimir etiqueta" aria-label={`Imprimir etiqueta: ${item.name}`} onClick={()=>printInventoryLabel({code,name:item.name,category:item.category_name||item.category||'Sin categoría',serial:item.serial_number,location})}><Tag size={16}/></button>
    {canManage?<><button className="icon-button positive" type="button" title="Verificar con detalle" aria-label={`Verificar con detalle: ${item.name}`} onClick={()=>onVerifyDetail(item)}><ClipboardCheck size={16}/></button><button className="icon-button" type="button" title="Editar equipo" aria-label={`Editar equipo: ${item.name}`} onClick={()=>onEdit(item)}><Pencil size={16}/></button><button className="icon-button warn" type="button" title="Archivar equipo" aria-label={`Archivar equipo: ${item.name}`} onClick={()=>onArchive(item)}><Archive size={16}/></button></>:null}
   </div>
  </div>
 </article>;
}
export function inventoryLocalTime(value:string|Date){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const part=(type:string)=>parts.find(p=>p.type===type)!.value;
 return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
// Resolve local wall time using the IANA zone; do not assume the browser's zone.
export function inventoryUtcTime(local:string){
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(local))throw new Error('Completá fecha y hora');
 const base=new Date(local+'Z').getTime();if(!Number.isFinite(base))throw new Error('Fecha inválida');
 let candidate=base;
 for(let i=0;i<3;i++)candidate+=base-new Date(inventoryLocalTime(new Date(candidate))+'Z').getTime();
 if(inventoryLocalTime(new Date(candidate))!==local)throw new Error('Esa hora no existe en la zona de Asunción');
 return new Date(candidate).toISOString();
}
export function inventoryMonthRange(month:string){
 const [year,m]=month.split('-').map(Number);
 const next=new Date(Date.UTC(year,m,1)).toISOString().slice(0,7);
 return {from:inventoryUtcTime(`${month}-01T00:00`),to:inventoryUtcTime(`${next}-01T00:00`)};
}
export function inventoryLocation(item:InventoryItem){
 if(item.location_type==='checked_out')return `Con ${item.current_custodian_name||'custodio registrado'} · ${item.production_name||'Producción'}${item.project_name?` · ${item.project_name}`:''}`;
 if(item.location_type==='legacy_in_use')return `En uso · ${item.current_custodian_name||'Custodio sin registrar'} · sin reserva vinculada`;
 return item.storage_shelf?`${item.storage_shelf}${item.storage_row?` · fila ${item.storage_row}`:''}`:'Ubicación sin registrar';
}
export function inventoryCanManageReservation(context:Pick<Context,'user_id'|'role'|'can_manage'|'can_reserve'>,row:InventoryReservation){return context.can_manage||context.can_reserve&&String(row.created_by_user_id)===String(context.user_id);}
export function inventoryCanReturn(context:Pick<Context,'user_id'|'role'|'can_manage'|'can_reserve'>,row:InventoryReservation){return context.can_reserve&&['owner','admin','management','production'].includes(context.role)&&(inventoryCanManageReservation(context,row)||[row.return_user_id,row.custodian_user_id].some(id=>String(id)===String(context.user_id)));}

function InventorySummary({items}:{items:InventoryItem[]}){
 const totals=new Map<string,number>();
 let inUse=0,maintenance=0,available=0;
 for(const item of items){
  const value=Number(item.value);
  if(Number.isFinite(value)&&value>0)totals.set(item.currency,totals.has(item.currency)?totals.get(item.currency)!+value:value);
  if(item.status==='in_use'||item.location_type==='checked_out')inUse+=1;
  else if(item.status==='maintenance')maintenance+=1;
  else if(item.status==='available')available+=1;
 }
  const format=(value:number,currency:string)=>money(value,currency);
  return <div className="kpi-strip" aria-label="Métricas de inventario">
   <article className="kpi-card tone-brand"><p className="eyebrow">VALOR TOTAL</p><strong>{items.length} equipos</strong><div className="kpi-amounts">{totals.size?Array.from(totals).map(([currency,value])=><span key={currency}>{format(value,currency)}</span>):<span>Sin valores registrados</span>}</div></article>
   <article className="kpi-card tone-blue"><p className="eyebrow">EN USO</p><strong>{inUse}</strong><small>Retirados o en rodaje</small></article>
   <article className="kpi-card tone-warning"><p className="eyebrow">MANTENIMIENTO</p><strong>{maintenance}</strong><small>No asignables a rodaje</small></article>
   <article className="kpi-card tone-green"><p className="eyebrow">DISPONIBLES</p><strong>{available}</strong><small>Listos para reservar</small></article>
  </div>;
}

type PipelineColumn={key:string;title:string;readOnly:boolean;locationId:string|null;shelf:string;responsibleName?:string|null;responsiblePhoto?:string|null;rows:InventoryItem[]};
function InventoryPipeline({items,locations,canManage,onDetail,onMoved,onQuickVerify,verifyingId}:{items:InventoryItem[];locations:StorageTemplate[];canManage:boolean;onDetail:(item:InventoryItem)=>void;onMoved:()=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null}){
 const [dragged,setDragged]=useState<InventoryItem|null>(null);
 const [moveError,setMoveError]=useState('');
 const [hideUnassigned,setHideUnassigned]=useState(false);
 const columns=useMemo<PipelineColumn[]>(()=>{
  const map=new Map<string,PipelineColumn>();
  const ensure=(key:string,column:Omit<PipelineColumn,'rows'>)=>{let current=map.get(key);if(!current){current={...column,rows:[]};map.set(key,current);}return current;};
  for(const item of items){
   if(item.location_type==='checked_out'){
    const key=`cust-${item.current_custodian_name||'sin-custodio'}`;
    ensure(key,{key,title:`Con ${item.current_custodian_name||'custodio registrado'}`,readOnly:true,locationId:null,shelf:''}).rows.push(item);
   }else if(item.location_type==='legacy_in_use'){
    ensure('legacy-in-use',{key:'legacy-in-use',title:'En uso',readOnly:true,locationId:null,shelf:''}).rows.push(item);
   }else if(item.storage_location_id){
    const location=locations.find(candidate=>String(candidate.id)===String(item.storage_location_id));
    const title=location?.name||item.storage_location_name||'Ubicación';
    ensure(`loc-${item.storage_location_id}`,{key:`loc-${item.storage_location_id}`,title,readOnly:false,locationId:String(item.storage_location_id),shelf:title,responsibleName:location?.responsible_name||null,responsiblePhoto:safePhoto(location?.responsible_photo_url)}).rows.push(item);
   }else if(item.storage_shelf){
    const matching=locations.find(candidate=>candidate.name===item.storage_shelf);
    if(matching)ensure(`loc-${matching.id}`,{key:`loc-${matching.id}`,title:matching.name,readOnly:false,locationId:String(matching.id),shelf:matching.name,responsibleName:matching.responsible_name||null,responsiblePhoto:safePhoto(matching.responsible_photo_url)}).rows.push(item);
    else ensure(`shelf-${item.storage_shelf}`,{key:`shelf-${item.storage_shelf}`,title:item.storage_shelf,readOnly:false,locationId:null,shelf:item.storage_shelf}).rows.push(item);
   }else{
    ensure('sin-ubicacion',{key:'sin-ubicacion',title:'Sin ubicación',readOnly:false,locationId:null,shelf:''}).rows.push(item);
   }
  }
  // Every active location appears even with no equipment; archived ones only when occupied.
  for(const location of locations.filter(candidate=>candidate.active||candidate.item_count>0))ensure(`loc-${location.id}`,{key:`loc-${location.id}`,title:location.name,readOnly:false,locationId:String(location.id),shelf:location.name,responsibleName:location.responsible_name||null,responsiblePhoto:safePhoto(location.responsible_photo_url)});
  // The unassigned column always exists so items can move back out of a location.
  ensure('sin-ubicacion',{key:'sin-ubicacion',title:'Sin ubicación',readOnly:false,locationId:null,shelf:''});
  return [...map.values()].sort((a,b)=>{if(a.readOnly!==b.readOnly)return a.readOnly?-1:1;if(a.key==='sin-ubicacion')return 1;if(b.key==='sin-ubicacion')return -1;return a.title.localeCompare(b.title,'es');});
 },[items,locations]);
 async function moveItem(itemId:string,target:PipelineColumn){
  if(target.readOnly)return;
  const item=items.find(candidate=>String(candidate.id)===itemId);if(!item)return;
  if(String(item.storage_location_id||'')===String(target.locationId||'')&&(item.storage_shelf||'')===target.shelf)return;
  setMoveError('');setDragged(null);
  try{await api(`/api/agency/inventory/${itemId}`,{storage_location_id:target.locationId,storage_shelf:target.shelf},'PATCH');onMoved();}
  catch(reason){setMoveError(errorMessage(reason));}
 }
 function onDragEnd(event:DragEndEvent){
  const id=String(event.active.id),over=String(event.over?.id||'');if(!over)return;
  let column=columns.find(candidate=>candidate.key===over);
  if(!column){
   // Dropping over a card resolves to the column that contains it.
   const item=items.find(candidate=>String(candidate.id)===over);
   if(!item)return;
   column=columns.find(candidate=>candidate.rows.some(row=>String(row.id)===String(item.id)));
  }
  if(!column)return;void moveItem(id,column);
 }
 return <div className={`inventory-pipeline${dragged?' is-dragging':''}`}>
  {moveError?<p className="error" role="alert">{moveError}</p>:null}
  <DndContext collisionDetection={pointerWithin} onDragStart={event=>setDragged(items.find(candidate=>String(candidate.id)===String(event.active.id))||null)} onDragCancel={()=>setDragged(null)} onDragEnd={onDragEnd}>
   {columns.filter(column=>!hideUnassigned||column.key!=='sin-ubicacion').map(column=><PipelineColumn key={column.key} column={column} canManage={canManage} onDetail={onDetail} onQuickVerify={onQuickVerify} verifyingId={verifyingId} onHide={column.key==='sin-ubicacion'?()=>setHideUnassigned(true):undefined}/>)}
   <DragOverlay>{dragged?<article className="inventory-pipeline-card is-overlay"><b>{dragged.name}</b><code className="inventory-code">{itemCode(dragged)}</code><small>{dragged.category_name||dragged.category||'Sin categoría'}</small></article>:null}</DragOverlay>
  </DndContext>
  {hideUnassigned&&<p className="inventory-pipeline-note" role="status">{columns.find(column=>column.key==='sin-ubicacion')?.rows.length||0} equipo(s) sin ubicación no se muestran. <button type="button" className="text-button" onClick={()=>setHideUnassigned(false)}><Eye size={14}/>Mostrar columna</button></p>}
  {!items.length?<p className="empty-copy">No hay equipos para mostrar en el pipeline.</p>:null}
 </div>;
}
function PipelineColumn({column,canManage,onDetail,onQuickVerify,verifyingId,onHide}:{column:PipelineColumn;canManage:boolean;onDetail:(item:InventoryItem)=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null;onHide?:()=>void}){
 const droppable=useDroppable({id:column.key,disabled:column.readOnly});
 return <section ref={droppable.setNodeRef} className={`inventory-pipeline-column${droppable.isOver?' drop-over':''}${column.readOnly?' is-readonly':''}`}>
  <header className="inventory-pipeline-header">{column.readOnly?<Lock size={12} aria-label="Solo lectura: la ubicación se cambia al devolver"/>:<span className="inventory-pipeline-column-dot" aria-hidden="true"/>}<h3>{column.title}</h3>{column.responsibleName?<span className="inventory-pipeline-responsible" title={`Responsable: ${column.responsibleName}`}><ActorAvatar name={column.responsibleName} photo={column.responsiblePhoto??''}/></span>:null}<span className="inventory-pipeline-count">{column.rows.length}</span>{onHide?<button type="button" className="icon-button inventory-pipeline-hide" title="Ocultar columna Sin ubicación" aria-label="Ocultar columna Sin ubicación" onClick={onHide}><X size={14}/></button>:null}</header>
  <div className="inventory-pipeline-column-body">
   {column.rows.map(item=><PipelineCard key={item.id} item={item} canManage={canManage} onDetail={onDetail} onQuickVerify={onQuickVerify} verifyingId={verifyingId}/>)}
   {!column.rows.length?<p className="empty-copy">{column.readOnly?'':canManage?'Arrastrá equipos hasta acá':'Sin equipos'}</p>:null}
  </div>
 </section>;
}
function PipelineCard({item,canManage,onDetail,onQuickVerify,verifyingId}:{item:InventoryItem;canManage:boolean;onDetail:(item:InventoryItem)=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null}){
 const disabled=!canManage||item.location_type==='checked_out';
 const draggable=useDraggable({id:item.id,disabled});
 const style=draggable.transform?{transform:`translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`}:undefined;
 const verifying=verifyingId===String(item.id);
 return <article ref={draggable.setNodeRef} style={style} data-status={item.status} className={`inventory-pipeline-card${draggable.isDragging?' dragging':''}`}>
  <button type="button" className="inventory-pipeline-open" title={`Abrir detalle: ${item.name}`} onClick={()=>onDetail(item)}>
   {item.photo_url?<img className="inventory-item-photo" src={item.photo_url} alt={`Foto de ${item.name}`}/>:<span className="inventory-pipeline-tile"><CategoryIcon name={item.category_icon}/></span>}
   <span className="inventory-pipeline-title"><b>{item.name}</b><code className="inventory-code">{itemCode(item)}</code><small><CategoryIcon name={item.category_icon}/>{item.category_name||item.category||'Sin categoría'}</small></span>
  </button>
  <VerificationStamp item={item} className="inventory-pipeline-verified" empty={<span>Sin verificación física</span>}/>
  <small className="inventory-pipeline-since">{item.location_type==='checked_out'?'En préstamo: devolvelo para cambiar su ubicación':item.location_changed_at?`Aquí desde ${dateTime(item.location_changed_at)}`:'Sin registro de ingreso a esta ubicación'}</small>
  <div className="inventory-pipeline-footer"><span className="inventory-status">{({available:'Disponible',in_use:'En uso',maintenance:'Mantenimiento',retired:'Dado de baja'} as Record<string,string>)[item.status]||item.status}</span>{!disabled&&<span className="inventory-pipeline-actions">{canManage&&<button type="button" className="icon-button positive" disabled={verifying} title={verifying?'Verificando…':'Marcar verificado'} aria-label={verifying?'Verificando…':`Marcar verificado: ${item.name}`} onClick={event=>{event.stopPropagation();onQuickVerify(item);}}><CheckCircle2 size={16}/></button>}<button type="button" className="icon-button" title={`Mover ${item.name}`} aria-label={`Mover ${item.name}`} onPointerDown={event=>event.stopPropagation()} {...draggable.listeners} {...draggable.attributes}>⋮⋮</button></span>}</div>
 </article>;
}

export function InventoryWorkspace({role}:{role:string}){
 const allowed=['owner','admin','management','production','finance','editor','viewer'].includes(role);
 return allowed?<InventoryPanel key={role}/>:null;
}
function InventoryPanel(){
 const [context,setContext]=useState<Context|null>(null),[items,setItems]=useState<InventoryItem[]>([]),[categories,setCategories]=useState<Category[]>([]),[storageTemplates,setStorageTemplates]=useState<StorageTemplate[]>([]),[reservations,setReservations]=useState<InventoryReservation[]>([]);
 const [month,setMonth]=useState(()=>inventoryLocalTime(new Date()).slice(0,7)),[view,setView]=useState<'equipment'|'reservations'>('equipment'),[equipmentView,setEquipmentView]=useState<'grid'|'list'|'pipeline'>('grid'),[selectedItems,setSelectedItems]=useState<string[]>([]),[reserveIds,setReserveIds]=useState<string[]>([]),[search,setSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState('');
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[refresh,setRefresh]=useState(0);
 const [refreshError,setRefreshError]=useState(''),[lastUpdated,setLastUpdated]=useState<Date|null>(null);
 const hasData=useRef(false);
 const [editItem,setEditItem]=useState<InventoryItem|'new'|null>(null),[editReservation,setEditReservation]=useState<InventoryReservation|'new'|null>(null),[editCategory,setEditCategory]=useState<Category|'new'|null>(null),[editStorageTemplate,setEditStorageTemplate]=useState<StorageTemplate|'new'|null>(null),[verification,setVerification]=useState<InventoryItem|null>(null),[detail,setDetail]=useState<InventoryItem|null>(null);
 const [action,setAction]=useState<{kind:'checkout'|'return'|'cancel';row:InventoryReservation}|null>(null);
 const [archive,setArchive]=useState<InventoryItem|null>(null),[busy,setBusy]=useState(false),[archiveError,setArchiveError]=useState('');
 const [verifyingId,setVerifyingId]=useState<string|null>(null);
 async function quickVerify(item:InventoryItem){
  if(verifyingId)return;setVerifyingId(String(item.id));setError('');
  try{await api(`/api/agency/inventory/${item.id}/verify`,{result:'confirmed',differences:'',note:''},'POST');refreshed(`Verificación registrada: ${item.name}.`);}
  catch(reason){setError(errorMessage(reason));}
  finally{setVerifyingId(null);}
 }
 const [batchBusy,setBatchBusy]=useState(false),[batchLocation,setBatchLocation]=useState<string[]|null>(null);
 const selectionEnabled=Boolean(context?.can_manage||context?.can_reserve);
 function toggleSelected(id:string){setSelectedItems(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);}
 function selectVisible(){
  const ids=visible.filter(item=>item.status!=='retired').map(item=>String(item.id));
  setSelectedItems(current=>{const all=ids.length>0&&ids.every(id=>current.includes(id));return all?current.filter(id=>!ids.includes(id)):[...new Set([...current,...ids])];});
 }
 const reservableSelected=selectedItems.filter(id=>{const item=items.find(value=>String(value.id)===id);return item&&!['maintenance','retired'].includes(item.status);});
 async function batchVerify(){
  if(batchBusy||!selectedItems.length)return;
  setBatchBusy(true);setError('');
  try{const data=await api<{verified:number}>('/api/agency/inventory/batch',{ids:selectedItems,change:{verify:true}},'POST');setSelectedItems([]);refreshed(`${data.verified??selectedItems.length} equipos verificados.`);}
  catch(reason){setError(errorMessage(reason));}
  finally{setBatchBusy(false);}
 }
 async function batchMoveLocation(locationId:string,storageRow:string,storageShelf=''){
  const ids=batchLocation||[];
  if(!ids.length)return;
  const location=locationId?{location_id:locationId,storage_row:storageRow}:{storage_shelf:storageShelf,storage_row:storageRow};
  const data=await api<{moved:number}>('/api/agency/inventory/batch',{ids,change:{location}},'POST');
  setBatchLocation(null);setSelectedItems([]);refreshed(`Ubicación actualizada en ${data.moved??ids.length} equipo${(data.moved??ids.length)===1?'':'s'}.`);
 }
 useEffect(()=>{
  let active=true,running=false;
  const {from,to}=inventoryMonthRange(month);
  async function load(background=false){
   if(!active||running||background&&document.visibilityState==='hidden')return;
   running=true;if(!hasData.current)setLoading(true);
   try{
    // Wait for every request to settle before permitting another polling cycle.
    const results=await Promise.allSettled([api<Context>('/api/agency/inventory-context'),api<{records:InventoryItem[]}>('/api/agency/inventory'),api<{categories:Category[]}>('/api/agency/inventory-categories'),api<{locations:StorageTemplate[]}>('/api/agency/inventory-locations'),api<{reservations:InventoryReservation[]}>(`/api/agency/inventory-reservations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)]);
    if(!active)return;
    const [c,i,cat,templates,r]=results;
    if(c.status==='rejected')throw c.reason;if(i.status==='rejected')throw i.reason;if(cat.status==='rejected')throw cat.reason;if(templates.status==='rejected')throw templates.reason;if(r.status==='rejected')throw r.reason;
    setContext(c.value);setItems(i.value.records);setCategories(cat.value.categories);setStorageTemplates(templates.value.locations);setReservations(r.value.reservations);
    setSelectedItems(current=>{const ids=new Set(i.value.records.map(record=>String(record.id)));return current.filter(id=>ids.has(id));});
    hasData.current=true;setLastUpdated(new Date());setError('');setRefreshError('');
   }catch(error){if(active){if(hasData.current)setRefreshError(errorMessage(error));else setError(errorMessage(error));}}
   finally{running=false;if(active)setLoading(false);}
  }
  void load();
  const timer=window.setInterval(()=>{void load(true);},30000);
  const visible=()=>{if(document.visibilityState==='visible')void load(true);};
  document.addEventListener('visibilitychange',visible);
  return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
 },[month,refresh]);
 function saved(message='Cambios guardados.'){setEditItem(null);setEditReservation(null);setEditCategory(null);setEditStorageTemplate(null);setVerification(null);setAction(null);setArchive(null);setSelectedItems([]);setReserveIds([]);setNotice(message);setRefresh(n=>n+1);}
 // Editors own their successful close so their footer form association is
 // released before the same dialog can be opened again. This only refreshes
 // the workspace after a persisted inventory/category mutation.
 function refreshed(message:string){setNotice(message);setRefresh(n=>n+1);}
 const visible=items.filter(item=>(!categoryFilter||String(item.category_id)===categoryFilter)&&`${itemCode(item)} ${item.name} ${item.serial_number||''} ${item.category_name||item.category} ${inventoryLocation(item)}`.toLowerCase().includes(search.toLowerCase()));
 return <div className="ops-stack inventory-workspace">
  <section className="panel"><div className="inventory-toolbar"><div className="panel-heading inventory-title-block"><div><h2>Inventario y reservas</h2><p className="form-note">Ubicación registrada y préstamo de equipos por producción.</p></div></div><div className="inline-actions inventory-header-actions">{context?.can_manage?<button className="secondary" onClick={()=>setEditItem('new')}>Agregar equipo</button>:null}{context?.can_reserve&&!selectedItems.length?<button className="primary" onClick={()=>{setReserveIds([]);setEditReservation('new');}}>Reservar equipos</button>:null}</div>
   <div className="inventory-toolbar-meta"><div className="inline-actions inventory-tabs" role="group" aria-label="Vistas de inventario"><button className={view==='equipment'?'secondary':'text-button'} aria-pressed={view==='equipment'} onClick={()=>setView('equipment')}>Equipos</button><button className={view==='reservations'?'secondary':'text-button'} aria-pressed={view==='reservations'} onClick={()=>setView('reservations')}>Calendario y reservas</button></div><p className="form-note inventory-refresh-note" role="status">Sincroniza cada 30 s mientras esta pestaña esté visible.{lastUpdated?` Actualizado ${lastUpdated.toLocaleTimeString('es-PY',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'})}`:''}</p></div>
   {view!=='reservations'?<div className="inventory-toolbar-controls"><div className="inventory-form-grid inventory-filters"><label>Buscar equipo o ubicación<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Memoria, DJI Mic, estante…"/></label><label>Categoría<select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)}><option value="">Todas</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}{c.active?'':' · archivada'}</option>)}</select></label></div><div className="inventory-collection-toolbar"><p className="directory-summary" aria-live="polite">{visible.length} equipo{visible.length===1?'':'s'} visibles</p><div className="inventory-view-options" role="group" aria-label="Vista de inventario"><button type="button" className={equipmentView==='grid'?'active':undefined} aria-label="Ver como cuadrícula" aria-pressed={equipmentView==='grid'} title="Ver como cuadrícula" onClick={()=>setEquipmentView('grid')}><Grid2X2 size={18}/></button><button type="button" className={equipmentView==='list'?'active':undefined} aria-label="Ver como lista" aria-pressed={equipmentView==='list'} title="Ver como lista" onClick={()=>setEquipmentView('list')}><List size={18}/></button><button type="button" className={equipmentView==='pipeline'?'active':undefined} aria-label="Ver como pipeline de ubicaciones" aria-pressed={equipmentView==='pipeline'} title="Ver como pipeline de ubicaciones" onClick={()=>setEquipmentView('pipeline')}><Columns3 size={18}/></button></div>{selectionEnabled&&visible.length?<button type="button" className="text-button inventory-select-visible" onClick={selectVisible}>Seleccionar visibles</button>:null}</div>{selectedItems.length?<div className="inventory-bulk-bar" role="status" aria-live="polite"><span className="inventory-bulk-count"><b>{selectedItems.length}</b> seleccionado{selectedItems.length===1?'':'s'}</span><div className="inline-actions inventory-bulk-actions">{context?.can_reserve?<button type="button" className="secondary" disabled={!reservableSelected.length} onClick={()=>{setReserveIds(reservableSelected);setEditReservation('new');}}>Reservar</button>:null}{context?.can_manage?<button type="button" className="secondary" disabled={batchBusy} onClick={()=>void batchVerify()}>{batchBusy?'Verificando…':'Verificar'}</button>:null}{context?.can_manage?<button type="button" className="secondary" onClick={()=>setBatchLocation(selectedItems)}>Mover ubicación</button>:null}<button type="button" className="text-button" onClick={()=>setSelectedItems([])}>Limpiar</button></div></div>:null}</div>:null}</div>
   {refreshError?<p role="status" className="inventory-late">No se pudo actualizar: {refreshError}. Se muestra la última información recibida.</p>:null}
   {notice?<p role="status">{notice}</p>:null}{error?<p className="error" role="alert">{error} <button className="text-button" onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={14}/>Reintentar</button></p>:null}
   {loading?<p role="status">Cargando inventario…</p>:error?null:view==='equipment'?equipmentView==='pipeline'?<InventoryPipeline items={items} locations={storageTemplates} canManage={Boolean(context?.can_manage)} onDetail={setDetail} onMoved={()=>refreshed('Ubicación actualizada.')} onQuickVerify={quickVerify} verifyingId={verifyingId}/>:<>
    <InventorySummary items={items}/>
    {equipmentView==='list'?<div className="inventory-equipment-head" aria-hidden="true"><span>Foto</span><span/><span>Artículo</span><span>Detalles</span><span>Estado</span><span>Ubicación</span><span>Verificación</span><span>Acciones</span></div>:null}
    <div className={`inventory-equipment-grid ${equipmentView==='list'?'inventory-equipment-list':''}`}>{visible.map(item=><EquipmentCard key={item.id} item={item} selectable={selectionEnabled&&item.status!=='retired'} selected={selectedItems.includes(String(item.id))} onSelect={()=>toggleSelected(String(item.id))} canManage={Boolean(context?.can_manage)} verifying={verifyingId===String(item.id)} onDetail={setDetail} onVerify={quickVerify} onVerifyDetail={setVerification} onEdit={setEditItem} onArchive={setArchive}/>)}</div>
    {!visible.length?<p className="empty-copy">No hay equipos que coincidan. {items.length?'Probá otra búsqueda.':'Agregá el equipo disponible antes de reservar.'}</p>:null}
   </>:<><label className="inventory-month">Mes del calendario<input type="month" value={month} min="1900-01" max="9998-12" onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))setMonth(e.target.value);}}/></label><p className="form-note">Horarios de Asunción. Se incluyen retiros pendientes de devolución aunque sean de otro mes.</p><InventoryCalendar month={month} reservations={reservations}/><div className="inventory-reservation-list">{reservations.map(row=><article key={row.id} className="inventory-reservation"><div className="panel-heading"><h3>{row.title}</h3><span className={`inventory-status inventory-status-${row.status}`}>{statusLabels[row.status]}</span></div><p>{row.project_name} · {dateTime(row.starts_at)} → {dateTime(row.ends_at)}</p><p>{row.items.map(i=>i.name).join(' · ')}</p><div className="ops-stack">{row.actor_name&&<span>Reservado por <ActorIdentity name={row.actor_name} photoUrl={row.actor_photo_url} verified={row.actor_verified===true}/></span>}{row.checkout_actor_name&&<span>Retiro registrado por <ActorIdentity name={row.checkout_actor_name} photoUrl={row.checkout_actor_photo_url} verified={row.checkout_actor_verified===true}/></span>}{row.return_actor_name&&<span>Devolución registrada por <ActorIdentity name={row.return_actor_name} photoUrl={row.return_actor_photo_url} verified={row.return_actor_verified===true}/></span>}</div><p>Responsables: {row.responsible_members.map(p=>p.name).join(', ')}</p><p>Devuelve: {row.return_user_name}{row.status==='checked_out'?` · Custodio: ${row.custodian_name||'Sin registrar'}`:''}</p>{row.status==='checked_out'&&new Date(row.ends_at)<new Date()?<p className="inventory-late">Devolución pendiente desde {dateTime(row.ends_at)}.</p>:null}{context&&(inventoryCanManageReservation(context,row)||row.status==='checked_out'&&inventoryCanReturn(context,row))?<div className="inline-actions">{row.status==='reserved'?<><button className="text-button" onClick={()=>setEditReservation(row)}><Pencil size={14}/>Editar reserva</button><button className="secondary" onClick={()=>setAction({kind:'checkout',row})}>Registrar retiro</button><button className="text-button danger" onClick={()=>setAction({kind:'cancel',row})}><X size={14}/>Cancelar reserva</button></>:row.status==='checked_out'?<button className="primary" onClick={()=>setAction({kind:'return',row})}>Registrar devolución</button>:null}</div>:null}</article>)}</div>{!reservations.length?<p className="empty-copy">Sin reservas en este mes. Elegí equipos y fechas para planificar una producción.</p>:null}</>}
  </section>
  {context?.can_manage?<section className="panel inventory-manager"><details><summary>Ubicaciones de guardado</summary><p className="form-note">Las ubicaciones archivadas dejan de estar disponibles para equipos nuevos. No se puede eliminar una ubicación con equipos asociados.</p><div className="inventory-template-list">{storageTemplates.map(template=><div className="inventory-template-row" key={template.id}><div><b>{template.name}</b><small>{template.item_count} equipo{template.item_count===1?'':'s'}{template.active?'':' · archivada'}</small></div><div className="inline-actions"><button className="text-button" onClick={()=>setEditStorageTemplate(template)}><Pencil size={14}/>Renombrar</button>{template.active?<button className="text-button warn" onClick={async()=>{try{await api(`/api/agency/inventory-locations/${template.id}`,{name:template.name,active:false},'PATCH');refreshed('Ubicación archivada.');}catch(error){setError(errorMessage(error));}}}><Archive size={14}/>Archivar</button>:null}<button className="text-button danger" disabled={template.item_count>0} title={template.item_count>0?'No se puede eliminar: hay equipos asociados.':'Eliminar ubicación'} onClick={async()=>{if(template.item_count>0)return;try{await api(`/api/agency/inventory-locations/${template.id}`,undefined,'DELETE');refreshed('Ubicación eliminada.');}catch(error){setError(errorMessage(error));}}}><Trash2 size={14}/>Eliminar</button></div></div>)}{!storageTemplates.length?<p className="form-note">Todavía no hay ubicaciones guardadas.</p>:null}<button className="text-button" onClick={()=>setEditStorageTemplate('new')}><Plus size={14}/>Crear ubicación</button></div></details></section>:null}
  {context?.can_manage?<section className="panel"><details><summary>Categorías de equipos</summary><p className="form-note">Renombrar actualiza la categoría de sus equipos. Archivar la quita de nuevas selecciones.</p><div className="inventory-categories">{categories.map(c=><button className="secondary" key={c.id} onClick={()=>setEditCategory(c)}><CategoryIcon name={c.icon}/>{c.name}{c.active?'':' · archivada'}</button>)}<button className="text-button" onClick={()=>setEditCategory('new')}><Plus size={14}/>Agregar categoría</button></div></details></section>:null}
  {editItem&&context?.can_manage?<Dialog title={editItem==='new'?'Nuevo equipo':'Editar equipo'} close={()=>setEditItem(null)}><InventoryItemForm item={editItem==='new'?null:editItem} categories={categories} members={context.members} storageTemplates={storageTemplates} canManageStorage={context.can_manage} createStorageTemplate={async name=>{const result=await api<{location:StorageTemplate}>('/api/agency/inventory-locations',{name},'POST');setStorageTemplates(current=>[...current,result.location]);setRefresh(current=>current+1);return result.location;}} done={()=>refreshed('Equipo guardado.')}/></Dialog>:null}
  {editStorageTemplate&&context?.can_manage?<Dialog title={editStorageTemplate==='new'?'Nueva ubicación':'Editar ubicación'} close={()=>setEditStorageTemplate(null)}><StorageTemplateForm template={editStorageTemplate==='new'?null:editStorageTemplate} members={context.members} done={message=>saved(message)}/></Dialog>:null}
   {verification&&context?.can_manage?<Dialog title={`Verificar con detalle · ${verification.name}`} close={()=>setVerification(null)}><InventoryVerificationForm item={verification} done={()=>saved('Verificación física registrada.')}/></Dialog>:null}
  {batchLocation?<Dialog title={`Mover ${batchLocation.length} equipo${batchLocation.length===1?'':'s'} de ubicación`} close={()=>setBatchLocation(null)}>{storageTemplates.some(template=>template.active)?<Editor columns fields={[{key:'location',label:'Ubicación',choices:storageTemplates.filter(template=>template.active).map(template=>({value:String(template.id),label:template.name}))},{key:'storage_row',label:'Fila / posición',optional:true}]} defaults={{location:String(storageTemplates.find(template=>template.active)?.id||''),storage_row:''}} label="Mover" save={async values=>{await batchMoveLocation(values.location,values.storage_row);}}/>:<Editor columns fields={[{key:'storage_shelf',label:'Ubicación',help:'Sin lugares configurados: escribí dónde se guardan.'},{key:'storage_row',label:'Fila / posición',optional:true}]} defaults={{storage_shelf:'',storage_row:''}} label="Mover" save={async values=>{await batchMoveLocation('',values.storage_row,values.storage_shelf);}}/>}</Dialog>:null}
  {detail?<Dialog title="Detalle y trazabilidad" close={()=>setDetail(null)}><InventoryDetail item={detail}/></Dialog>:null}
  {editCategory&&context?.can_manage?<Dialog title={editCategory==='new'?'Nueva categoría':'Editar categoría'} close={()=>setEditCategory(null)}><CategoryForm category={editCategory==='new'?null:editCategory} done={message=>saved(message)}/></Dialog>:null}
  {editReservation&&context?.can_reserve?<Dialog title={editReservation==='new'?'Reservar equipos':'Editar reserva'} close={()=>setEditReservation(null)}><InventoryReservationForm key={editReservation==='new'?`new-${reserveIds.join('-')}`:editReservation.id} context={context} items={items} initialSelected={reserveIds} record={editReservation==='new'?null:editReservation} done={()=>saved('Reserva guardada. El retiro se registra por separado.')}/></Dialog>:null}
  {action?<Dialog title={{checkout:'Registrar retiro',return:'Registrar devolución',cancel:'Cancelar reserva'}[action.kind]} close={()=>setAction(null)}><InventoryTransitionForm action={action.kind} record={action.row} done={()=>saved({checkout:'Retiro registrado.',return:'Devolución registrada.',cancel:'Reserva cancelada.'}[action.kind])}/></Dialog>:null}
  {archive?<Dialog title={`Archivar ${archive.name}`} busy={busy} close={()=>{if(!busy){setArchive(null);setArchiveError('');}}}><p>El equipo quedará en Papelera. No se puede archivar mientras tenga reservas abiertas.</p>{archiveError?<p className="error" role="alert">{archiveError}</p>:null}<SaveActions pending={busy}><button type="button" className="primary" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setArchiveError('');try{await api(`/api/agency/inventory/${archive.id}`,{},'DELETE');saved('Equipo archivado. Se puede restaurar desde Papelera.');}catch(error){setArchiveError(errorMessage(error));}finally{setBusy(false);}}}>{busy?'Archivando…':'Archivar equipo'}</button></SaveActions></Dialog>:null}
 </div>;
}

export function InventoryItemForm({item,categories,members,storageTemplates,canManageStorage,createStorageTemplate,done}:{item:InventoryItem|null;categories:Category[];members:Person[];storageTemplates:StorageTemplate[];canManageStorage:boolean;createStorageTemplate:(name:string)=>Promise<StorageTemplate>;done:()=>void}){
 const {currency:companyCurrency}=useCompanyCurrency();
 const [values,setValues]=useState(()=>({name:item?.name||'',category_id:String(item?.category_id||categories.find(c=>c.active)?.id||''),serial_number:item?.serial_number||'',photo_url:item?.photo_url||'',storage_shelf:item?.storage_shelf||'',storage_row:item?.storage_row||'',value:item?.value||'0',currency:item?.currency||companyCurrency,status:item?.status||'available',custodian_user_id:String(item?.custodian_user_id||''),acquired_on:String(item?.acquired_on||'').slice(0,10),notes:String(item?.notes||'')}));
 const initialTemplate=String(item?.storage_location_id||'');
 const [templateId,setTemplateId]=useState(initialTemplate),[newPlace,setNewPlace]=useState(''),[creatingPlace,setCreatingPlace]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [photoBusy,setPhotoBusy]=useState(false);
 const availableTemplates=storageTemplates.filter(template=>template.active||template.id===initialTemplate);
 function change(key:keyof typeof values,value:string){setValues(current=>({...current,[key]:value}));}
 async function pickPhoto(file:File){setPhotoBusy(true);setError('');try{const photo=await preparePhoto(file,true);change('photo_url',photo);}catch(cause){setError(errorMessage(cause));}finally{setPhotoBusy(false);}}
 async function createPlace(){const name=newPlace.trim();if(!name||creatingPlace)return;setCreatingPlace(true);setError('');try{const template=await createStorageTemplate(name);setTemplateId(template.id);change('storage_shelf',template.name);setNewPlace('');}catch(error){setError(errorMessage(error));}finally{setCreatingPlace(false);}}
  async function submit(event:FormEvent){event.preventDefault();if(busy)return;if(!values.value){setError('Ingresá el valor del equipo.');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory${item?`/${item.id}`:''}`,{...values,storage_location_id:templateId||null},item?'PATCH':'POST');done();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <form className="inventory-form-grid inventory-item-form" onSubmit={submit}><p className="form-note inventory-wide">Un registro por unidad reservable. Al guardar se asigna un código único Scale OS, imprimible como etiqueta. Para un kit, indicá sus componentes en el nombre o las notas.</p>{item?<p className="form-note inventory-wide">Código de inventario: <code className="inventory-code">{itemCode(item)}</code></p>:null}
  <label className="inventory-wide">Nombre del equipo<input value={values.name} onChange={event=>change('name',event.target.value)} required minLength={2} maxLength={160}/></label>
  <label><SelectCustom label="Categoría" choices={categories.filter(c=>c.active||String(c.id)===String(item?.category_id)).map(c=>({value:String(c.id),label:c.name}))} value={values.category_id} onChange={value=>change('category_id',value)}/></label>
  <label>Serie, IMEI o identificador<input value={values.serial_number} onChange={event=>change('serial_number',normalizeSerial(event.target.value))} autoCapitalize="characters" spellCheck={false} maxLength={160}/></label>
  <fieldset className="inventory-wide inventory-photo-field"><legend>Foto del equipo</legend>{values.photo_url?<span className="inventory-photo-preview"><img src={values.photo_url} alt="Vista previa de la foto del equipo"/><button type="button" className="text-button danger" onClick={()=>change('photo_url','')}><Trash2 size={14}/>Quitar foto</button></span>:null}<div className="inventory-photo-actions"><label className="inventory-wide">Enlace a la imagen<input value={values.photo_url.startsWith('data:')?'':values.photo_url} placeholder="https://…" onChange={event=>change('photo_url',event.target.value.trim())}/></label><label className="inventory-photo-upload">{photoBusy?'Procesando…':'Cámara o subir foto'}<input type="file" accept={PHOTO_ACCEPT} aria-label={`Elegir foto (${PHOTO_FORMATS}; hasta 4 MB)`} capture="environment" disabled={photoBusy} onChange={event=>{const file=event.target.files?.[0];if(file)void pickPhoto(file);event.target.value='';}}/></label></div></fieldset>
  <fieldset className="inventory-wide inventory-storage-field"><legend>Ubicación de guardado</legend><label><SelectCustom label="Ubicación" choices={[{value:'',label:'Ubicación personalizada'},...availableTemplates.map(template=>({value:String(template.id),label:template.active?template.name:template.name+' · archivada'}))]} value={templateId} onChange={value=>{setTemplateId(value);const template=availableTemplates.find(candidate=>String(candidate.id)===value);if(template)change('storage_shelf',template.name);}}/></label>{!templateId?<label>Ubicación personalizada<input value={values.storage_shelf} onChange={event=>change('storage_shelf',event.target.value)} maxLength={100} placeholder="Estante, depósito o lugar"/></label>:<p className="form-note">Se guarda como {availableTemplates.find(template=>template.id===templateId)?.name||values.storage_shelf}.</p>}{canManageStorage?<div className="inventory-create-place"><label>Crear lugar<input value={newPlace} onChange={event=>setNewPlace(event.target.value)} maxLength={100} placeholder="Ej.: Depósito · Rack A"/></label><button type="button" className="text-button" disabled={!newPlace.trim()||creatingPlace} onClick={()=>void createPlace()}>{creatingPlace?'Creando…':'Crear lugar'}</button></div>:null}<label>Fila / posición<input value={values.storage_row} onChange={event=>change('storage_row',event.target.value)} maxLength={80}/></label></fieldset>
  <label>Valor del equipo<AmountInput value={values.value} currency={values.currency} onChange={value=>change('value',value)}/></label>
  <label><SelectCustom label="Moneda" choices={currencyChoices} value={values.currency} onChange={value=>change('currency',value)}/></label>
  <label><SelectCustom label="Estado" choices={item?.status==='in_use'?[{value:'in_use',label:'En uso (registrar devolución)'}]:itemStatuses} value={values.status} onChange={value=>change('status',value)}/></label>
  <label><SelectCustom label="Custodio registrado" choices={[{value:'',label:'Sin custodio'},...members.map(member=>({value:String(member.id),label:member.name}))]} value={values.custodian_user_id} onChange={value=>change('custodian_user_id',value)}/></label>
  <label>Fecha de adquisición<input type="date" value={values.acquired_on} onChange={event=>change('acquired_on',event.target.value)}/></label><label className="inventory-wide">Notas<textarea value={values.notes} onChange={event=>change('notes',event.target.value)} maxLength={2000}/></label>
  {error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar equipo'}</button></SaveActions>
 </form>;
}

function StorageTemplateForm({template,members,done}:{template:StorageTemplate|null;members:{id:string;name:string}[];done:(message:string)=>void}){
 const [name,setName]=useState(template?.name||''),[active,setActive]=useState(template?.active??true),[responsible,setResponsible]=useState(template?.responsible_user_id||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="inventory-form-grid" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(`/api/agency/inventory-locations${template?`/${template.id}`:''}`,{name,active,responsible_user_id:responsible||null},template?'PATCH':'POST');done(template?'Ubicación actualizada.':'Ubicación creada.');}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}}><label className="inventory-wide">Nombre de la ubicación<input value={name} onChange={event=>setName(event.target.value)} required minLength={2} maxLength={100}/></label><label><SelectCustom label="Responsable del lugar" choices={[{value:'',label:'Sin responsable'},...members.map(member=>({value:String(member.id),label:member.name}))]} value={responsible} onChange={setResponsible}/></label><p className="form-note inventory-wide">El responsable es una persona del equipo que cuida ese lugar; solo se muestra en el panel.</p>{template?<label className="inventory-wide inventory-check"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/><span>Disponible para nuevas asignaciones</span></label>:null}{error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar ubicación'}</button></SaveActions></form>;
}

function CategoryForm({category,done}:{category:Category|null;done:(message:string)=>void}){
 const [name,setName]=useState(category?.name||''),[active,setActive]=useState(category?.active??true),[icon,setIcon]=useState<string|null>(category?.icon??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const trimmed=name.trim();
 return <form className="inventory-form-grid" onSubmit={async event=>{event.preventDefault();if(busy)return;if(trimmed.length<2||trimmed.length>80){setError('El nombre debe tener entre 2 y 80 caracteres.');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory-categories${category?`/${category.id}`:''}`,{name:trimmed,active,icon},category?'PATCH':'POST');done(category?'Categoría actualizada.':'Categoría creada.');}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}}>
  <label className="inventory-wide">Nombre de la categoría<input value={name} onChange={event=>setName(event.target.value)} required minLength={2} maxLength={80}/></label>
  {category?<label className="inventory-wide inventory-check"><input type="checkbox" checked={active} onChange={event=>setActive(event.target.checked)}/><span>Disponible para nuevos equipos</span></label>:null}
  <fieldset className="inventory-wide"><legend>Ícono de categoría</legend><div className="inventory-category-icons" role="group" aria-label="Ícono de categoría"><button type="button" className={`icon-button${icon===null?' is-selected':''}`} title="Sin ícono" aria-label="Sin ícono" aria-pressed={icon===null} onClick={()=>setIcon(null)}><X size={16}/></button>{Object.entries(categoryIconMap).map(([key,Icon])=><button key={key} type="button" className={`icon-button${icon===key?' is-selected':''}`} title={key} aria-label={key} aria-pressed={icon===key} onClick={()=>setIcon(key)}><Icon size={16}/></button>)}</div></fieldset>
  {error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy}>{busy?'Guardando…':'Guardar categoría'}</button></SaveActions>
 </form>;
}

const traceLabel=(event:string)=>({
 'inventory.created':'Equipo registrado','inventory.updated':'Ficha actualizada','stock.verified':'Verificación física','reservation.reserved':'Reserva creada','reservation.updated':'Reserva actualizada','reservation.cancelled':'Reserva cancelada','loan.checked_out':'Retiro registrado','loan.checked_in':'Devolución registrada'
} as Record<string,string>)[event]||event.replace(/[._]/g,' ');
export function InventoryDetail({item}:{item:InventoryItem}){
 const [data,setData]=useState<{record:InventoryItem;verifications:InventoryVerification[];trace:InventoryTrace[]}|null>(null),[error,setError]=useState('');
 useEffect(()=>{let alive=true;void api<{record:InventoryItem;verifications:InventoryVerification[];trace:InventoryTrace[]}>(`/api/agency/inventory/${item.id}`).then(result=>{if(alive)setData(result);}).catch(cause=>{if(alive)setError(errorMessage(cause));});return()=>{alive=false;};},[item.id]);
 const record=data?.record||item,code=itemCode(record);
 return <div className="inventory-detail"><section className="inventory-code-payload">{record.photo_url?<img className="inventory-detail-photo" src={record.photo_url} alt={`Foto de ${record.name}`}/>:null}<div><p className="eyebrow">IDENTIFICACIÓN FÍSICA</p><code className="inventory-code">{code}</code><p>{record.name} · {record.serial_number||'Sin serie registrada'}</p><p className="form-note">{inventoryLocation(record)}</p></div><InventoryBarcode code={code}/></section>{error?<p className="error" role="alert">{error}</p>:null}{!data&&!error?<p role="status">Cargando trazabilidad…</p>:<><section><h3>Verificación física</h3>{record.last_verified_at?<p><b>{verificationLabel(record.last_verification_result)}</b> · {dateTime(record.last_verified_at)}{record.last_verifier_name?` · ${record.last_verifier_name}`:''}</p>:<p>Sin verificación física registrada.</p>}{data?.verifications.map(row=><article className="inventory-trace-row" key={`verification-${row.id}`}><b>{verificationLabel(row.result)}</b><span>{dateTime(row.verified_at)} · {row.verifier_name||'Usuario registrado'}</span>{row.differences?<p>{row.differences}</p>:null}{row.note?<p>{row.note}</p>:null}</article>)}</section><section><h3>Rastro de préstamo y cambios</h3>{data?.trace.map(row=><article className="inventory-trace-row" key={row.id}><b>{traceLabel(row.event_type)}</b><span>{dateTime(row.event_at)} · {row.actor_name||'Sistema'}</span>{row.event_data?.title?<p>{String(row.event_data.title)}</p>:null}</article>)}{!data?.trace.length?<p>Sin eventos registrados todavía.</p>:null}</section></>}</div>;
}

function InventoryVerificationForm({item,done}:{item:InventoryItem;done:()=>void}){
 const [result,setResult]=useState<'confirmed'|'difference'|'missing'>('confirmed'),[differences,setDifferences]=useState(''),[note,setNote]=useState(''),[adjust,setAdjust]=useState(false),[status,setStatus]=useState(item.status),[shelf,setShelf]=useState(item.storage_shelf),[row,setRow]=useState(item.storage_row),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(`/api/agency/inventory/${item.id}/verify`,{result,differences,note,...(adjust?{adjustment:{status,storage_shelf:shelf,storage_row:row}}:{})},'POST');done();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <form className="inventory-form-grid" onSubmit={submit}><p className="form-note inventory-wide">Código: <code className="inventory-code">{itemCode(item)}</code>. El control queda fechado, asociado a tu usuario y no cambia reservas existentes.</p><label><SelectCustom label="Resultado" choices={[{value:'confirmed',label:'Coincide con el registro'},{value:'difference',label:'Hay una diferencia'},{value:'missing',label:'No encontrado'}]} value={result} onChange={value=>setResult(value as typeof result)}/></label><label>Observación<textarea value={note} maxLength={2000} onChange={event=>setNote(event.target.value)} placeholder="Ej.: revisión mensual"/></label>{result!=='confirmed'?<label className="inventory-wide">Diferencias encontradas<textarea value={differences} required maxLength={2000} onChange={event=>setDifferences(event.target.value)} placeholder="Qué no coincide con el registro"/></label>:null}<label className="inventory-wide inventory-check"><input type="checkbox" checked={adjust} disabled={item.location_type==='checked_out'} onChange={event=>setAdjust(event.target.checked)}/><span>Ajustar estado o ubicación registrada{item.location_type==='checked_out'?' (no disponible mientras esté retirado)':''}</span></label>{adjust?<><label><SelectCustom label="Estado real" choices={itemStatuses} value={status} onChange={setStatus}/></label><label>Ubicación real<input value={shelf} maxLength={100} required onChange={event=>setShelf(event.target.value)}/></label><label>Fila / posición<input value={row} maxLength={80} onChange={event=>setRow(event.target.value)}/></label></>:null}{error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy}>{busy?'Registrando…':'Registrar verificación'}</button></SaveActions></form>;
}

export function InventoryReservationForm({context,items,record,done,initialSelected=[]}:{context:Context;items:InventoryItem[];record:InventoryReservation|null;done:()=>void;initialSelected?:string[]}){
 const [title,setTitle]=useState(record?.title||''),[project,setProject]=useState(String(record?.project_id||'')),[start,setStart]=useState(record?inventoryLocalTime(record.starts_at):''),[end,setEnd]=useState(record?inventoryLocalTime(record.ends_at):'');
 const [selected,setSelected]=useState<string[]>(record?.items.map(i=>String(i.id))||initialSelected),[responsibles,setResponsibles]=useState<string[]>(record?.responsible_members.map(p=>String(p.id))||(context.role==='production'?[context.user_id]:[])),[returnPerson,setReturnPerson]=useState(String(record?.return_user_id||'')),[notes,setNotes]=useState(record?.notes||''),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const toggle=(id:string,list:string[],set:(list:string[])=>void)=>set(list.includes(id)?list.filter(value=>value!==id):[...list,id]);
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setError('');setBusy(true);try{
  if(!selected.length)throw new Error('Elegí al menos un equipo');if(!responsibles.length)throw new Error('Elegí al menos un responsable');if(!responsibles.includes(returnPerson))throw new Error('Elegí quién se encarga de devolver los equipos');if(!project)throw new Error('Elegí un proyecto activo');
  const starts=inventoryUtcTime(start),ends=inventoryUtcTime(end);if(ends<=starts)throw new Error('La devolución prevista debe ser posterior al inicio');
  await api(`/api/agency/inventory-reservations${record?`/${record.id}`:''}`,{title,project_id:project,starts_at:starts,ends_at:ends,inventory_ids:selected,responsible_user_ids:responsibles,return_user_id:returnPerson,notes,...(record?{expected_version:record.version}:{})},record?'PATCH':'POST');done();
 }catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <form className="inventory-form-grid" onSubmit={submit}>
  <label className="inventory-wide">Producción o uso previsto<input value={title} onChange={e=>setTitle(e.target.value)} required minLength={2} maxLength={160} placeholder="Rodaje de contenidos · cliente"/></label>
  <label className="inventory-wide"><SelectCustom label="Proyecto" choices={[{value:'',label:'Elegí un proyecto activo'},...context.projects.map(p=>({value:String(p.id),label:p.name}))]} value={project} onChange={setProject}/></label>
  <label>Desde · Asunción<input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} required/></label><label>Devolución prevista · Asunción<input type="datetime-local" value={end} min={start||undefined} onChange={e=>setEnd(e.target.value)} required/></label>
  <fieldset className="inventory-wide"><legend>Equipos · {selected.length} seleccionados</legend><label>Buscar equipos<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Memoria, DJI Mic…"/></label><div className="inventory-options">{items.filter(i=>`${i.name} ${i.category_name||i.category}`.toLowerCase().includes(search.toLowerCase())).map(i=><label className="inventory-check" key={i.id}><input type="checkbox" checked={selected.includes(String(i.id))} disabled={['maintenance','retired'].includes(i.status)&&!selected.includes(String(i.id))} onChange={()=>toggle(String(i.id),selected,setSelected)}/><span>{i.name}<small>{i.status==='in_use'?'Actualmente en uso; el retiro depende de su devolución':i.status==='maintenance'?'En mantenimiento':i.status==='retired'?'Dado de baja':i.category_name||i.category}</small></span></label>)}</div><small>Se verifica que los equipos no tengan otra reserva en el horario elegido.</small></fieldset>
  <fieldset className="inventory-wide"><legend>Responsables · {responsibles.length}</legend><div className="inventory-options">{context.members.map(p=><label className="inventory-check inventory-person-check" key={p.id}><input type="checkbox" checked={responsibles.includes(String(p.id))} onChange={()=>{toggle(String(p.id),responsibles,setResponsibles);if(returnPerson===String(p.id))setReturnPerson('');}}/><ActorIdentity name={p.name} photoUrl={p.photo_url} verified/></label>)}</div></fieldset>
  <label className="inventory-wide"><SelectCustom label="Responsable de devolución" choices={[{value:'',label:'Elegí entre los responsables'},...context.members.filter(p=>responsibles.includes(String(p.id))).map(p=>({value:String(p.id),label:p.name}))]} value={returnPerson} onChange={setReturnPerson}/>{returnPerson&&context.members.find(p=>String(p.id)===returnPerson)&&<span className="inventory-return-person"><ActorIdentity name={context.members.find(p=>String(p.id)===returnPerson)!.name} photoUrl={context.members.find(p=>String(p.id)===returnPerson)!.photo_url} verified/></span>}</label>
  <label className="inventory-wide">Notas<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={2000}/></label>
  <p className="form-note inventory-wide">Reservar no registra el retiro. Al retirar se indica quién lleva físicamente los equipos; al devolver se registra dónde quedan.</p>
  {error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy||!context.projects.length}>{busy?'Guardando…':'Guardar reserva'}</button></SaveActions>
 </form>;
}

export function InventoryTransitionForm({action,record,done}:{action:'checkout'|'return'|'cancel';record:InventoryReservation;done:()=>void}){
 const [custodian,setCustodian]=useState(''),[locations,setLocations]=useState(record.items.map(i=>({inventory_id:String(i.id),storage_shelf:i.storage_shelf||'',storage_row:i.storage_row||'',status:'available'}))),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 function location(index:number,key:'storage_shelf'|'storage_row'|'status',value:string){setLocations(current=>current.map((row,i)=>i===index?{...row,[key]:value}:row));}
 return <form className="inventory-form-grid" onSubmit={async event=>{event.preventDefault();if(busy)return;if(action==='checkout'&&!custodian){setError('Elegí al custodio real');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory-reservations/${record.id}/${action}`,{expected_version:record.version,...(action==='checkout'?{custodian_user_id:custodian}:action==='return'?{locations}:{})});done();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}}>
  <p className="inventory-wide">{record.title} · {record.items.map(i=>i.name).join(', ')}</p>
  {action==='checkout'?<><label className="inventory-wide"><SelectCustom label="Quién lleva los equipos (custodio)" choices={[{value:'',label:'Elegí al custodio real'},...record.responsible_members.map(p=>({value:String(p.id),label:p.name}))]} value={custodian} onChange={setCustodian}/></label><p className="form-note inventory-wide">Responsable de devolución: {record.return_user_name}. Confirmá el retiro cuando los equipos se entreguen físicamente, dentro del horario reservado.</p></>:action==='return'?<><p className="form-note inventory-wide">Registrá la devolución completa y revisá dónde queda cada equipo. No se libera ninguno hasta guardar todos.</p>{locations.map((row,index)=><fieldset className="inventory-wide inventory-form-grid" key={row.inventory_id}><legend>{record.items[index].name}</legend><label>Estante o lugar de guardado<input value={row.storage_shelf} maxLength={100} required onChange={e=>location(index,'storage_shelf',e.target.value)}/></label><label>Fila / posición<input value={row.storage_row} maxLength={80} onChange={e=>location(index,'storage_row',e.target.value)}/></label><label><SelectCustom label="Estado al devolver" choices={[{value:'available',label:'Disponible'},{value:'maintenance',label:'Necesita mantenimiento'}]} value={row.status} onChange={value=>location(index,'status',value)}/></label></fieldset>)}</>:<p className="inventory-wide">Cancelar libera todos los equipos de esta reserva. Solo aplica si todavía no se retiraron.</p>}
  {error?<p className="error inventory-wide" role="alert">{error}</p>:null}<SaveActions pending={busy}><button className="primary" disabled={busy}>{busy?'Guardando…':{checkout:'Confirmar retiro',return:'Confirmar devolución completa',cancel:'Confirmar cancelación'}[action]}</button></SaveActions>
 </form>;
}

export function InventoryCalendar({month,reservations}:{month:string;reservations:InventoryReservation[]}){
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate(),offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
 return <div className="inventory-calendar" aria-label="Calendario mensual de reservas"><div className="inventory-weekdays" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day}>{day}</span>)}</div><div className="inventory-calendar-grid">{Array.from({length:offset},(_,index)=><div className="inventory-calendar-blank" key={`blank-${index}`}/>)}{Array.from({length:days},(_,index)=>{
  const day=`${month}-${String(index+1).padStart(2,'0')}`,start=inventoryUtcTime(day+'T00:00'),nextDay=new Date(Date.UTC(year,m-1,index+2)).toISOString().slice(0,10),end=inventoryUtcTime(nextDay+'T00:00');
  const rows=reservations.filter(r=>r.status!=='cancelled'&&r.starts_at<end&&r.ends_at>start);
  return <div className="inventory-calendar-day" key={day} aria-label={day}><time dateTime={day}>{index+1}</time>{rows.map(r=><div className={`inventory-calendar-event inventory-status-${r.status}`} key={r.id}><b>{r.title}</b><small>{r.items.length} equipo(s) · {statusLabels[r.status]}</small></div>)}</div>;
 })}</div></div>;
}
