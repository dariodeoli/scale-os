"use client";
/**
 * Inventario y reservas (dominio OPS) — contenido v2 (campaña #41, spec #44).
 *
 * Tailwind + `owncoding-ui` + primitivas de `app/ui-v2.tsx`: superficies
 * `Card`, chip único `StateChip`, KPIs `Kpi`/`KpiStrip`, estados
 * `LoadingBlock`/`EmptyState`/`ErrorState`, acciones `IconAction` y campos de
 * la librería. Los diálogos siguen siendo el `Dialog` con pending por
 * formulario y `SelectCustom` buscable (contrato vigente, sin duplicar).
 *
 * La capa de datos vive en `inventory-data.ts` + `use-inventory-data.ts`: acá
 * sólo se dibuja. Las plantillas de lista se declaran una sola vez por lista y
 * el encabezado comparte la misma grilla que las filas.
 */
import {useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Aviso,Button,Card,CeldaMoneda,EmptyState,ErrorState,FilaDato,IconAction,Input,Label,Nota,SearchField,SegmentedField,primerNombre} from 'owncoding-ui';
import {Kpi,KpiStrip,LoadingBlock,MoneyText,StateChip} from './ui-v2';
import {api,Dialog,Editor} from './operations';
import {SaveActions} from './save-actions';
import {ActorAvatar,ActorIdentity,safePhoto} from './actor-identity';
import {SerialTexto,listDateFull,listDateShort,dueTone} from './list-format';
import {currencyChoices} from './currencies';
import {useCompanyCurrency} from './currency-provider';
import {AmountInput,SelectCustom} from './profile-controls';
import {preparePhoto,PHOTO_ACCEPT,PHOTO_FORMATS} from './profile-photo';
import {normalizeSerial} from './field-rules';
import {roleCan,BATCH_LIMITS,limitSelection} from './capabilities';
import {notify} from './feedback';
import {InventoryBarcode,printInventoryLabel} from './inventory-label';
import {DndContext,DragOverlay,KeyboardSensor,MouseSensor,TouchSensor,pointerWithin,rectIntersection,useDraggable,useDroppable,useSensor,useSensors,type CollisionDetection,type DragEndEvent} from '@dnd-kit/core';
import {BatteryCharging,Camera,HardDrive,Home,Lamp,Laptop,Lightbulb,Mic,Monitor,Package,Pencil,Plus,Speaker,Trash2,Video,X,type LucideIcon} from 'lucide-react';
import {buildInventoryPipelineColumns,depreciationFacts,depreciationValidation,depreciationMethodLabel,depreciationMethods,equipmentStatusLabel,filterInventoryItems,inventoryCanManageReservation,inventoryCanReturn,inventoryLocation,inventoryTotals,itemCode,itemStatuses,pipelineDropColumn,statusLabels,traceLabel,verificationLabel,type Category,type Context,type InventoryItem,type InventoryMaintenance,type InventoryReservation,type InventoryTrace,type InventoryVerification,type Person,type PipelineColumn,type StorageTemplate} from './inventory-data';
import {OPS_TIME_ZONE,opsLocalTime,opsUtcTime} from './ops-time';
import {useInventoryCatalog,useInventoryRecord} from './use-inventory-data';

// El contrato de datos y las funciones puras viven en `inventory-data.ts`; acá
// se re-exportan los tipos para quien ya los importaba de este módulo.
export type {Category,Context,InventoryItem,InventoryMaintenance,InventoryReservation,InventoryTrace,InventoryVerification,ItemReference,Person,PipelineColumn,StorageTemplate} from './inventory-data';

const errorMessage=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar la operación';
// A successful save closes the dialog that hosts these forms; keep the local
// busy flag from updating a form that is already unmounted.
function useMountedRef(){const mounted=useRef(true);useEffect(()=>()=>{mounted.current=false;},[]);return mounted;}
const dateTime=(value:string)=>listDateFull(value)||'';

// Plantilla única por lista: el encabezado y las filas comparten la grilla, el
// gap-x y el padding. La variable se declara en el contenedor una sola vez.
const EQUIPMENT_COLS='[--eq-cols:2rem_2.25rem_minmax(8.5rem,1.5fr)_minmax(8rem,1fr)_7rem_6.5rem_minmax(7.5rem,1fr)_minmax(11rem,1.2fr)_10.5rem]';
const EQUIPMENT_GRID='grid grid-cols-[var(--eq-cols)] items-center gap-x-2';
const RESERVATION_COLS='[--rsv-cols:minmax(9.5rem,1.3fr)_minmax(6.5rem,1fr)_minmax(15.5rem,1.2fr)_minmax(7.5rem,1fr)_minmax(7.5rem,1fr)_minmax(7rem,1fr)_9rem]';
const RESERVATION_GRID='grid grid-cols-[var(--rsv-cols)] items-center gap-x-2';
const CELL='min-w-0 text-[13px] leading-5';
// Targets táctiles: en móvil las acciones de ícono crecen a 44 px (32 en escritorio).
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-8 md:[&>button]:w-8';
// Las filas densas conservan el ícono de 28 px en escritorio (32 en tarjetas).
const ROW_ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';

const categoryIconMap:Record<string,LucideIcon>={'camera':Camera,'video':Video,'mic':Mic,'lamp':Lamp,'lightbulb':Lightbulb,'monitor':Monitor,'laptop':Laptop,'speaker':Speaker,'hard-drive':HardDrive,'battery-charging':BatteryCharging,'package':Package,'home':Home};
export function CategoryIcon({name}:{name?:string|null}){const Icon=name?categoryIconMap[name]:undefined;return Icon?<Icon size={14} aria-hidden="true"/>:null;}

const statusTone=(status:string)=>status==='available'?'ok':status==='in_use'?'info':status==='maintenance'?'warn':status==='retired'?'mute':'mute';
const reservationTone=(status:InventoryReservation['status'])=>status==='reserved'?'info':status==='checked_out'?'warn':status==='returned'?'ok':'mute';
const PHYSICAL_VERIFICATION_MAX_AGE_DAYS=30;
const PHYSICAL_VERIFICATION_MAX_AGE_MS=PHYSICAL_VERIFICATION_MAX_AGE_DAYS*24*60*60*1000;
type InventoryAttentionFilter='missing_value'|'physical_verification'|'';
const hasMissingInventoryValue=(item:InventoryItem)=>!(Number(item.value)>0);
const needsPhysicalVerification=(item:InventoryItem,now=Date.now())=>{
 if(!item.last_verified_at)return true;
 const verifiedAt=Date.parse(item.last_verified_at);
 return !Number.isFinite(verifiedAt)||verifiedAt<now-PHYSICAL_VERIFICATION_MAX_AGE_MS;
};

/** Sello de control: resultado + foto + primer nombre + fecha 24 h, en ese orden. */
function VerificationStamp({item,empty}:{item:InventoryItem;empty:ReactNode}){
 if(!item.last_verified_at)return <>{empty}</>;
 const tone=item.last_verification_result==='confirmed'?'ok':item.last_verification_result==='difference'?'warn':item.last_verification_result==='missing'?'bad':'mute';
 return <span className="inline-flex min-w-0 items-center gap-1.5" data-tone={tone}>
  <span role="img" title={`Control: ${verificationLabel(item.last_verification_result)}`} aria-label={`Control: ${verificationLabel(item.last_verification_result)}`} className={tone==='ok'?'text-ok':tone==='warn'?'text-warn':tone==='bad'?'text-bad':'text-mute'}>{tone==='ok'?'✓':tone==='warn'?'!':tone==='bad'?'×':'·'}</span>
  <ActorAvatar name={item.last_verifier_name||'Verificador'} photo={safePhoto(item.last_verifier_photo_url)}/>
  <span className="min-w-0 text-xs text-mute" title={item.last_verifier_name||'Verificador'}>{primerNombre(item.last_verifier_name??'')||'Verificador'}</span>
  <time className="whitespace-nowrap text-[11px] tabular-nums text-mute" dateTime={item.last_verified_at}>{dateTime(item.last_verified_at)}</time>
 </span>;
}

function EquipmentCard({item,selectable,selected,onSelect,canManage,verifying,onDetail,onVerify,onVerifyDetail,onEdit,onArchive}:{
 item:InventoryItem;selectable:boolean;selected:boolean;onSelect:()=>void;canManage:boolean;verifying:boolean;
 onDetail:(item:InventoryItem)=>void;onVerify:(item:InventoryItem)=>void;onVerifyDetail:(item:InventoryItem)=>void;onEdit:(item:InventoryItem)=>void;onArchive:(item:InventoryItem)=>void;
}){
 const code=itemCode(item),location=inventoryLocation(item),facts=depreciationFacts(item);
 return <article data-grid-card="equipment" className="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
  <div className="flex items-start justify-between gap-3">
   <div className="flex min-w-0 items-start gap-2">
    {selectable?<label className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center md:h-6 md:w-6" title="Seleccionar para operar en lote"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar ${item.name}`} checked={selected} onChange={onSelect}/></label>:null}
    {item.photo_url?<img className="h-11 w-11 shrink-0 rounded-lg object-cover" src={item.photo_url} alt={`Foto de ${item.name}`}/>:null}
    <div className="min-w-0">
     <h3 className="break-words text-sm font-semibold text-fore">{item.name}</h3>
     <code className="whitespace-nowrap font-mono text-[11px] text-mute">{code}</code>
    </div>
   </div>
   <StateChip tone={statusTone(item.status)}>{equipmentStatusLabel(item.status)}</StateChip>
  </div>
  <dl className="grid gap-1 text-xs">
   <FilaDato etiqueta="Categoría" etiquetaComo="dt" valorComo="dd" valorClassName="shrink break-words text-right" valor={<span className="inline-flex items-center gap-1.5"><CategoryIcon name={item.category_icon}/>{item.category_name||item.category||'Sin categoría'}</span>}/>
   <FilaDato etiqueta="Serie / IMEI" etiquetaComo="dt" valorComo="dd" valorClassName="shrink text-right [overflow-wrap:anywhere] [&_.serial-text]:whitespace-normal [&_.serial-text]:break-all" valor={item.serial_number?<SerialTexto value={item.serial_number}/>:'Sin registrar'}/>
   <FilaDato etiqueta="Valor" etiquetaComo="dt" valorComo="dd" valorClassName="shrink text-right" valor={<CeldaMoneda valor={Number(item.value)} currency={item.currency}/>}/>
   {facts.hasDepreciation?<FilaDato etiqueta="Valor actual" etiquetaComo="dt" valorComo="dd" tono="info" valorClassName="shrink text-right" valor={<CeldaMoneda valor={facts.currentValue??0} currency={item.currency}/>}/>:null}
   <FilaDato etiqueta="Ubicación" etiquetaComo="dt" valorComo="dd" valorClassName="shrink break-words text-right" valor={location}/>
  </dl>
  <div className="mt-auto grid gap-2 border-t border-ink-600 pt-2">
   <div className="flex flex-wrap items-center justify-between gap-2">
    <VerificationStamp item={item} empty={<span className="text-xs text-mute">Sin verificación física</span>}/>
    {canManage?<span className={ICON_TARGETS}><IconAction icon="check" tone="ok" disabled={verifying} label={verifying?'Verificando…':`Marcar verificado: ${item.name}`} onClick={()=>onVerify(item)}/></span>:null}
   </div>
   {item.return_user_name?<span className="text-xs text-mute" title={`Devuelve ${item.return_user_name}${item.expected_return_at?` · previsto ${listDateFull(item.expected_return_at)}`:''}`}>Devuelve {item.return_user_name}{item.expected_return_at?<> · previsto <span className="whitespace-nowrap" data-tone={dueTone(item.expected_return_at)||undefined}>{listDateFull(item.expected_return_at)}</span></>:null}</span>:null}
   <div className={`flex flex-wrap items-center justify-end gap-1 ${ICON_TARGETS}`}>
    <IconAction icon="eye" label={`Detalle y trazabilidad: ${item.name}`} onClick={()=>onDetail(item)}/>
    <IconAction icon="printer" label={`Imprimir etiqueta: ${item.name}`} onClick={()=>printInventoryLabel({code,name:item.name,category:item.category_name||item.category||'Sin categoría',serial:item.serial_number,location})}/>
    {canManage?<><IconAction icon="check" tone="ok" label={`Verificar con detalle: ${item.name}`} onClick={()=>onVerifyDetail(item)}/><IconAction icon="edit" label={`Editar equipo: ${item.name}`} onClick={()=>onEdit(item)}/><IconAction icon="trash" tone="bad" label={`Archivar equipo: ${item.name}`} onClick={()=>onArchive(item)}/></>:null}
   </div>
  </div>
 </article>;
}

function EquipmentRow({item,selectable,selected,onSelect,canManage,verifying,onDetail,onVerify,onVerifyDetail,onEdit,onArchive}:{
 item:InventoryItem;selectable:boolean;selected:boolean;onSelect:()=>void;canManage:boolean;verifying:boolean;
 onDetail:(item:InventoryItem)=>void;onVerify:(item:InventoryItem)=>void;onVerifyDetail:(item:InventoryItem)=>void;onEdit:(item:InventoryItem)=>void;onArchive:(item:InventoryItem)=>void;
}){
 const code=itemCode(item),location=inventoryLocation(item);
 return <article data-list-row="equipment" className={`${EQUIPMENT_GRID} min-h-[48px] rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-1`} data-status={item.status}>
  <span className="flex h-11 items-center md:h-auto">{selectable?<label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar para operar en lote"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" aria-label={`Seleccionar ${item.name}`} checked={selected} onChange={onSelect}/></label>:null}</span>
  <span className="flex items-center">{item.photo_url?<img className="h-8 w-8 rounded-lg object-cover" src={item.photo_url} alt={`Foto de ${item.name}`}/>:<span className="grid h-8 w-8 place-items-center rounded-lg border border-ink-600 text-mute"><CategoryIcon name={item.category_icon}/></span>}</span>
  <span className="flex min-w-0 items-baseline gap-2"><b className="truncate text-[13px] font-semibold text-fore" title={item.name}>{item.name}</b><code className="shrink-0 whitespace-nowrap font-mono text-[11px] text-mute">{code}</code></span>
  <span className={`${CELL} flex min-w-0 items-center gap-x-1.5 text-mute`}><span className="inline-flex min-w-0 items-center gap-1.5 truncate" title={item.category_name||item.category||'Sin categoría'}>{<CategoryIcon name={item.category_icon}/>}{item.category_name||item.category||'Sin categoría'}</span><span aria-hidden="true">·</span><span className="inline-flex items-center whitespace-nowrap">{item.serial_number?<SerialTexto value={item.serial_number} mask/>:'Sin serie'}</span></span>
  <span className="flex justify-end"><CeldaMoneda valor={Number(item.value)} currency={item.currency} className="text-[13px]"/></span>
  <span className="flex justify-start"><StateChip tone={statusTone(item.status)}>{equipmentStatusLabel(item.status)}</StateChip></span>
  <span className={`${CELL} truncate text-mute`} title={location}>{location}</span>
  <span className="min-w-0"><VerificationStamp item={item} empty={<span className="text-xs text-mute">Sin verificación física</span>}/></span>
  <span className={`flex flex-wrap items-center justify-end gap-1 ${ROW_ICON_TARGETS}`}>
   <IconAction icon="eye" label={`Detalle y trazabilidad: ${item.name}`} onClick={()=>onDetail(item)}/>
   <IconAction icon="printer" label={`Imprimir etiqueta: ${item.name}`} onClick={()=>printInventoryLabel({code,name:item.name,category:item.category_name||item.category||'Sin categoría',serial:item.serial_number,location})}/>
   {canManage?<><IconAction icon="check" tone="ok" disabled={verifying} label={verifying?'Verificando…':`Marcar verificado: ${item.name}`} onClick={()=>onVerify(item)}/><IconAction icon="check" tone="ok" label={`Verificar con detalle: ${item.name}`} onClick={()=>onVerifyDetail(item)}/><IconAction icon="edit" label={`Editar equipo: ${item.name}`} onClick={()=>onEdit(item)}/><IconAction icon="trash" tone="bad" label={`Archivar equipo: ${item.name}`} onClick={()=>onArchive(item)}/></>:null}
  </span>
 </article>;
}

function InventoryPipeline({items,locations,canManage,onDetail,onMoved,onQuickVerify,verifyingId,onMoveLocally}:{items:InventoryItem[];locations:StorageTemplate[];canManage:boolean;onDetail:(item:InventoryItem)=>void;onMoved:()=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null;onMoveLocally:(id:string,storageLocationId:string|null,shelf:string)=>void}){
 const [dragged,setDragged]=useState<InventoryItem|null>(null);
 const [moveError,setMoveError]=useState('');
 const [hideUnassigned,setHideUnassigned]=useState(false);
 const columns=useMemo(()=>buildInventoryPipelineColumns(items,locations),[items,locations]);
 // Mouse desde cualquier punto de la tarjeta (6 px de margen para no robar el clic)
 // y touch con pulsación sostenida, para no pelear con el scroll del tablero.
 const sensors=useSensors(useSensor(MouseSensor,{activationConstraint:{distance:6}}),useSensor(TouchSensor,{activationConstraint:{delay:250,tolerance:8}}),useSensor(KeyboardSensor));
 // `pointerWithin` para mouse/touch y `rectIntersection` de respaldo para el teclado.
 const collisionDetection:CollisionDetection=args=>{const pointer=pointerWithin(args);return pointer.length?pointer:rectIntersection(args);};
 async function moveItem(itemId:string,target:PipelineColumn){
  if(target.readOnly)return;
  const item=items.find(candidate=>String(candidate.id)===itemId);if(!item)return;
  if(String(item.storage_location_id||'')===String(target.locationId||'')&&(item.storage_shelf||'')===target.shelf)return;
  setMoveError('');setDragged(null);
  // Optimista: la tarjeta cambia de columna ya; el refresco confirma o revierte.
  const previous={locationId:item.storage_location_id??null,shelf:item.storage_shelf};
  onMoveLocally(itemId,target.locationId,target.shelf);
  try{await api(`/api/agency/inventory/${itemId}`,{storage_location_id:target.locationId,storage_shelf:target.shelf},'PATCH');onMoved();}
  catch(reason){onMoveLocally(itemId,previous.locationId,previous.shelf);setMoveError(errorMessage(reason));}
 }
 function onDragEnd(event:DragEndEvent){
  const id=String(event.active.id),over=String(event.over?.id||'');if(!over)return;
  // Dropping over a card resolves to the column that contains it.
  const column=pipelineDropColumn(columns,items,over);
  if(!column)return;void moveItem(id,column);
 }
 const visibleColumns=columns.filter(column=>!hideUnassigned||column.key!=='sin-ubicacion');
 return <div className="grid gap-3">
  {moveError?<Aviso tono="error">{moveError}</Aviso>:null}
  <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={event=>setDragged(items.find(candidate=>String(candidate.id)===String(event.active.id))||null)} onDragCancel={()=>setDragged(null)} onDragEnd={onDragEnd}>
   <div data-board="locations" className="flex snap-x gap-3 overflow-x-auto pb-1" role="region" aria-label="Pipeline de ubicaciones">
    {visibleColumns.map(column=><PipelineColumn key={column.key} column={column} canManage={canManage} onDetail={onDetail} onQuickVerify={onQuickVerify} verifyingId={verifyingId} onHideUnassigned={()=>setHideUnassigned(true)}/>)}
   </div>
   <DragOverlay>{dragged?<article className="rounded-xl border border-fono/40 bg-ink-800 p-3 shadow-2xl"><b className="text-sm text-fore">{dragged.name}</b><code className="block whitespace-nowrap font-mono text-[11px] text-mute">{itemCode(dragged)}</code><small className="text-xs text-mute">{dragged.category_name||dragged.category||'Sin categoría'}</small></article>:null}</DragOverlay>
  </DndContext>
  {hideUnassigned?<Nota tono="info" className="flex items-center justify-between gap-3">{columns.find(column=>column.key==='sin-ubicacion')?.rows.length||0} equipo(s) sin ubicación no se muestran.<Button type="button" variant="ghost" onClick={()=>setHideUnassigned(false)}>Mostrar columna</Button></Nota>:null}
  {!items.length?<EmptyState icon="box" title="No hay equipos para mostrar en el pipeline."/>:null}
 </div>;
}
function PipelineColumn({column,canManage,onDetail,onQuickVerify,verifyingId,onHideUnassigned}:{column:PipelineColumn;canManage:boolean;onDetail:(item:InventoryItem)=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null;onHideUnassigned:()=>void}){
 // La columna es el destino del arrastre (id = clave de la columna, la que resuelve
 // `pipelineDropColumn`); las de solo lectura no aceptan drops ni se resaltan.
 const droppable=useDroppable({id:column.key,disabled:column.readOnly});
 return <section ref={droppable.setNodeRef} data-board-column data-column-key={column.key} className={`flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border p-3 transition ${droppable.isOver?'border-fono bg-fono/10':'border-ink-600 bg-ink-800/60'}`} data-readonly={column.readOnly?'true':undefined}>
  <header className="flex items-center gap-2">
   {column.readOnly?<span className="text-mute" role="img" title="Solo lectura: la ubicación se cambia al devolver" aria-label="Solo lectura: la ubicación se cambia al devolver">🔒</span>:<span className="h-2 w-2 rounded-full bg-fono" aria-hidden="true"/>}
   <h3 className="min-w-0 break-words text-sm font-semibold text-fore">{column.title}</h3>
   {column.responsibleName?<span title={`Responsable: ${column.responsibleName}`}><ActorAvatar name={column.responsibleName} photo={safePhoto(column.responsiblePhoto)}/></span>:null}
   <span className="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">{column.rows.length}</span>
   {column.key==='sin-ubicacion'?<span className={ICON_TARGETS}><IconAction icon="close" label="Ocultar columna Sin ubicación" onClick={onHideUnassigned}/></span>:null}
  </header>
  <div className="grid gap-2">
   {column.rows.map(item=><PipelineCard key={item.id} item={item} canManage={canManage} onDetail={onDetail} onQuickVerify={onQuickVerify} verifyingId={verifyingId}/>)}
   {!column.rows.length?<p className="py-3 text-center text-xs text-mute">{column.readOnly?'':canManage?'Arrastrá equipos hasta acá':'Sin equipos'}</p>:null}
  </div>
 </section>;
}
function PipelineCard({item,canManage,onDetail,onQuickVerify,verifyingId}:{item:InventoryItem;canManage:boolean;onDetail:(item:InventoryItem)=>void;onQuickVerify:(item:InventoryItem)=>void;verifyingId:string|null}){
 const disabled=!canManage||item.location_type==='checked_out';
 const draggable=useDraggable({id:item.id,disabled});
 const verifying=verifyingId===String(item.id);
 const code=itemCode(item);
 return <article ref={draggable.setNodeRef} {...draggable.listeners} {...draggable.attributes} data-board-card data-status={item.status} className={`grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3 ${draggable.isDragging?'opacity-60':''} ${disabled?'':'cursor-grab'}`}>
  <button type="button" className="flex min-w-0 items-center gap-2 text-left" title={`Abrir detalle: ${item.name}`} onClick={()=>onDetail(item)}>
   {item.photo_url?<img className="h-9 w-9 shrink-0 rounded-lg object-cover" src={item.photo_url} alt={`Foto de ${item.name}`}/>:<span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute"><CategoryIcon name={item.category_icon}/></span>}
   <span className="min-w-0"><b className="block break-words text-[13px] font-semibold text-fore">{item.name}</b><code className="whitespace-nowrap font-mono text-[11px] text-mute">{code}</code><small className="flex items-center gap-1 text-[11px] text-mute"><CategoryIcon name={item.category_icon}/>{item.category_name||item.category||'Sin categoría'}</small></span>
  </button>
  <VerificationStamp item={item} empty={<span className="text-[11px] text-mute">Sin verificación física</span>}/>
  <small className="text-[11px] text-mute">{item.location_type==='checked_out'?'En préstamo: devolvelo para cambiar su ubicación':item.location_changed_at?`Aquí desde ${dateTime(item.location_changed_at)}`:'Sin registro de ingreso a esta ubicación'}</small>
  <div className="flex items-center justify-between gap-2">
   <StateChip tone={statusTone(item.status)}>{equipmentStatusLabel(item.status)}</StateChip>
   {!disabled?<span className={`flex items-center gap-1 ${ROW_ICON_TARGETS}`}>
    {canManage?<IconAction icon="check" tone="ok" disabled={verifying} label={verifying?'Verificando…':`Marcar verificado: ${item.name}`} onClick={()=>onQuickVerify(item)}/>:null}
    <span className="select-none text-mute" role="img" aria-label={`Mover ${item.name}`} title={`Mover ${item.name}`}>⋮⋮</span>
   </span>:null}
  </div>
 </article>;
}

function InventorySummary({items,onAddValue}:{items:InventoryItem[];onAddValue?:()=>void}){
 const {currencyTotals,inUse,maintenance,available}=inventoryTotals(items);
 const missingValue=items.filter(item=>!(Number(item.value)>0)).length;
 const equipmentLabel=`${items.length} equipo${items.length===1?'':'s'}`;
 return <section aria-label="Métricas de inventario"><KpiStrip>
  <Kpi label="Valor total" valor={currencyTotals.length?<span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">{currencyTotals.map(({currency,total})=><CeldaMoneda key={currency} valor={total} currency={currency}/>)}</span>:'—'} hint={currencyTotals.length?equipmentLabel:items.length?<span className="flex flex-wrap items-center gap-x-2 gap-y-1"><span>{missingValue?`${missingValue} sin valor`:'Sin datos monetarios'}</span>{missingValue&&onAddValue?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={onAddValue} title="Completar el valor de un equipo del inventario">Agregar valor</button>:null}</span>:equipmentLabel}/>
  <Kpi label="En uso" valor={inUse} hint="Retirados o en rodaje"/>
  <Kpi label="Mantenimiento" valor={maintenance} hint="No asignables a rodaje"/>
  <Kpi label="Disponibles" valor={available} hint="Listos para reservar"/>
 </KpiStrip></section>;
}

export function InventoryWorkspace({role}:{role:string}){
 // Same gate the API applies to the catalog: inventory.view covers every role.
 return roleCan(role,'inventory.view')?<InventoryPanel key={role}/>:null;
}
function InventoryPanel(){
 const [month,setMonth]=useState(()=>opsLocalTime(new Date()).slice(0,7)),[view,setView]=useState<'equipment'|'reservations'>('equipment'),[equipmentView,setEquipmentView]=useState<'grid'|'list'|'pipeline'>('grid'),[selectedItems,setSelectedItems]=useState<string[]>([]),[reserveIds,setReserveIds]=useState<string[]>([]),[search,setSearch]=useState(''),[categoryFilter,setCategoryFilter]=useState(''),[attentionFilter,setAttentionFilter]=useState<InventoryAttentionFilter>('');
 const [actionError,setError]=useState(''),[notice,setNotice]=useState(''),[refresh,setRefresh]=useState(0);
 const {context,items,categories,storageTemplates,reservations,loading,error:loadError,refreshError,lastUpdated,addStorageTemplate,moveItemLocally}=useInventoryCatalog(month,refresh);
 // El error del catálogo sólo existe cuando nunca hubo datos; el de acciones se limpia al reintentar.
 const error=actionError||loadError;
 // Keep the selection bounded to the records the API still returns.
 useEffect(()=>{const ids=new Set(items.map(record=>String(record.id)));setSelectedItems(current=>current.filter(id=>ids.has(id)));},[items]);
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
 function toggleSelected(id:string){
  if(selectedItems.includes(id)){setSelectedItems(current=>current.filter(value=>value!==id));return;}
  if(selectedItems.length>=BATCH_LIMITS.inventory){notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.inventory} equipos. Quitá alguno para sumar otro.`});return;}
  setSelectedItems(current=>[...current,id]);
 }
 function selectVisible(){
  const ids=visible.filter(item=>item.status!=='retired').map(item=>String(item.id));
  if(ids.length>0&&ids.every(id=>selectedItems.includes(id))){setSelectedItems(current=>current.filter(id=>!ids.includes(id)));return;}
  const {selection,capped}=limitSelection([...selectedItems,...ids],BATCH_LIMITS.inventory);
  setSelectedItems(selection);
  if(capped)notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.inventory} equipos: se seleccionaron los primeros ${BATCH_LIMITS.inventory}.`});
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
 function saved(message='Cambios guardados.'){setEditItem(null);setEditReservation(null);setEditCategory(null);setEditStorageTemplate(null);setVerification(null);setAction(null);setArchive(null);setSelectedItems([]);setReserveIds([]);setNotice(message);setRefresh(n=>n+1);}
 // Editors own their successful close so their footer form association is
 // released before the same dialog can be opened again. This only refreshes
 // the workspace after a persisted inventory/category mutation.
 function refreshed(message:string){setNotice(message);setRefresh(n=>n+1);}
 const filteredItems=useMemo(()=>filterInventoryItems(items,{search,categoryId:categoryFilter}),[items,search,categoryFilter]);
 // Local attention signals mirror the 30-day operational control window and
 // deliberately leave the catalog/API contract unchanged.
 const attention=useMemo(()=>{
  const activeItems=filteredItems.filter(item=>item.status!=='retired');
  return {missingValue:activeItems.filter(hasMissingInventoryValue).length,physicalVerification:activeItems.filter(item=>needsPhysicalVerification(item)).length};
 },[filteredItems]);
 const visible=useMemo(()=>filteredItems.filter(item=>{
  if(!attentionFilter)return true;
  if(item.status==='retired')return false;
  return attentionFilter==='missing_value'?hasMissingInventoryValue(item):needsPhysicalVerification(item);
 }),[filteredItems,attentionFilter]);
 const itemWithoutValue=useMemo(()=>items.find(hasMissingInventoryValue)||null,[items]);
 const attentionFilterLabel=attentionFilter==='missing_value'?'valor faltante':attentionFilter==='physical_verification'?'control físico pendiente':'';
 const updatedAt=lastUpdated?lastUpdated.toLocaleTimeString('es-PY',{timeZone:OPS_TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}):'';
 return <div className="grid min-w-0 gap-4">
  <Card className="grid min-w-0 gap-3">
   <div className="flex flex-wrap items-end gap-2">
    <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Vistas de inventario" value={view} onChange={(value:string)=>setView(value as 'equipment'|'reservations')} options={[['equipment','Equipos','box'],['reservations','Calendario y reservas','calendar']]}/>
    {view!=='reservations'?<>
     <SearchField className="min-w-[12rem] flex-1 sm:max-w-80" ariaLabel="Buscar equipo o ubicación" value={search} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setSearch(event.target.value)} placeholder="Memoria, DJI Mic, estante…"/>
     <SelectCustom label="Categoría" choices={[{value:'',label:'Todas'},...categories.map(c=>({value:String(c.id),label:`${c.name}${c.active?'':' · archivada'}`}))]} value={categoryFilter} onChange={setCategoryFilter}/>
     <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Vista de inventario" value={equipmentView} onChange={(value:string)=>setEquipmentView(value as 'grid'|'list'|'pipeline')} options={[['grid','Cuadrícula','grid'],['list','Lista','list'],['pipeline','Ubicaciones','store']]}/>
     {selectionEnabled&&visible.length?<Button type="button" variant="ghost" onClick={selectVisible}>Seleccionar visibles</Button>:null}
     <div className="ml-auto flex flex-wrap items-center gap-2">
      <p className="whitespace-nowrap text-xs tabular-nums text-mute" role="status" aria-live="polite" title={`Mostrando ${visible.length} de ${items.length} equipos${attentionFilterLabel?` con filtro de ${attentionFilterLabel}`:''}. Sincroniza cada 30 s mientras esta pestaña esté visible.${updatedAt?` Actualizado ${updatedAt}.`:''}`}>{visible.length} de {items.length} equipos{attentionFilterLabel?` · ${attentionFilterLabel}`:''}{updatedAt?` · ${updatedAt}`:''}</p>
      {context?.can_manage?<Button type="button" variant="outline" onClick={()=>setEditItem('new')}>Agregar equipo</Button>:null}
      {context?.can_reserve&&!selectedItems.length?<Button type="button" onClick={()=>{setReserveIds([]);setEditReservation('new');}}>Reservar equipos</Button>:null}
     </div>
    </>:null}
   </div>
   {view!=='reservations'?<div className="flex flex-wrap items-center gap-2 border-t border-ink-600/60 pt-3" aria-label="Filtros locales de atención del inventario">
    <span className="text-[11px] font-bold uppercase tracking-wider text-mute">Atención</span>
    <button type="button" className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-fono/60 md:min-h-8 ${attentionFilter==='missing_value'?'border-warn bg-warn/15 text-fore':'border-ink-600 bg-ink-800/50 text-mute hover:border-ink-500 hover:text-fore'}`} aria-label={`Filtrar equipos con valor faltante: ${attention.missingValue}`} aria-pressed={attentionFilter==='missing_value'} title={`Filtrar ${attention.missingValue} equipo${attention.missingValue===1?'':'s'} con valor faltante`} onClick={()=>setAttentionFilter(current=>current==='missing_value'?'':'missing_value')}><span>Valor faltante</span><span className="rounded-md bg-fore/10 px-1.5 py-0.5 tabular-nums text-fore" aria-hidden="true">{attention.missingValue}</span></button>
    <button type="button" className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-fono/60 md:min-h-8 ${attentionFilter==='physical_verification'?'border-warn bg-warn/15 text-fore':'border-ink-600 bg-ink-800/50 text-mute hover:border-ink-500 hover:text-fore'}`} aria-label={`Filtrar equipos con control físico vencido o sin registro: ${attention.physicalVerification}`} aria-pressed={attentionFilter==='physical_verification'} title={`Filtrar ${attention.physicalVerification} equipo${attention.physicalVerification===1?'':'s'} con control físico vencido o sin registro`} onClick={()=>setAttentionFilter(current=>current==='physical_verification'?'':'physical_verification')}><span>Control físico pendiente</span><span className="rounded-md bg-fore/10 px-1.5 py-0.5 tabular-nums text-fore" aria-hidden="true">{attention.physicalVerification}</span></button>
    {attentionFilter?<Button type="button" variant="ghost" className="min-h-11 md:min-h-8" onClick={()=>setAttentionFilter('')}>Limpiar atención</Button>:null}
    <p className="basis-full text-[11px] leading-4 text-mute">Control pendiente: vencido hace más de {PHYSICAL_VERIFICATION_MAX_AGE_DAYS} días o sin registro. Los conteos respetan búsqueda y categoría.</p>
   </div>:null}
   {view!=='reservations'&&selectedItems.length?<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-600 bg-ink-800/60 px-3 py-2" role="status" aria-live="polite">
    <span className="text-xs text-mute"><b className="text-fore">{selectedItems.length}</b> de {BATCH_LIMITS.inventory} seleccionado{selectedItems.length===1?'':'s'}</span>
    <div className="flex flex-wrap items-center gap-2">
     {context?.can_reserve?<Button type="button" variant="outline" disabled={!reservableSelected.length} onClick={()=>{setReserveIds(reservableSelected);setEditReservation('new');}}>Reservar</Button>:null}
     {context?.can_manage?<Button type="button" variant="outline" disabled={batchBusy} onClick={()=>void batchVerify()}>{batchBusy?'Verificando…':'Verificar'}</Button>:null}
     {context?.can_manage?<Button type="button" variant="outline" onClick={()=>setBatchLocation(selectedItems)}>Mover ubicación</Button>:null}
     <Button type="button" variant="ghost" onClick={()=>setSelectedItems([])}>Limpiar</Button>
    </div>
   </div>:null}
  </Card>

  {view==='reservations'?<Card className="grid min-w-0 gap-4">
   <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="min-w-0">
     <h2 className="text-[17px] font-semibold tracking-tight text-fore">Calendario y reservas</h2>
     <p className="mt-1 text-xs leading-5 text-mute">Horarios de Asunción. Se incluyen retiros pendientes de devolución aunque sean de otro mes.</p>
    </div>
    <div className="w-52">
     <Label htmlFor="inventory-calendar-month">Mes del calendario</Label>
     <Input id="inventory-calendar-month" type="month" value={month} min="1900-01" max="9998-12" onChange={(e:React.ChangeEvent<HTMLInputElement>)=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))setMonth(e.target.value);}}/>
    </div>
   </div>
   <InventoryCalendar month={month} reservations={reservations}/>
   <div data-list="reservations" className="min-w-0 overflow-x-auto">
    <div className={`${RESERVATION_COLS} grid min-w-[67.5rem] gap-2`}>
    {reservations.length?<div data-list-head="reservations" className={`${RESERVATION_GRID} ${RESERVATION_COLS} px-3 text-[10px] font-bold uppercase tracking-wider text-mute`} aria-hidden="true">
     <span>Producción</span><span>Proyecto</span><span>Fechas</span><span>Equipos</span><span>Responsables</span><span>Devuelve</span><span className="text-right">Acciones</span>
    </div>:null}
    {reservations.map(row=><div key={row.id} data-list-row="reservations" className={`${RESERVATION_GRID} ${RESERVATION_COLS} min-h-[48px] rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-1`} data-status={row.status}>
     <span className="flex min-w-0 items-center gap-2"><b className="truncate text-[13px] font-semibold text-fore" title={row.title}>{row.title}</b><StateChip tone={reservationTone(row.status)}>{statusLabels[row.status]}</StateChip></span>
     <span className={`${CELL} truncate text-mute`} title={row.project_name||'Sin proyecto'}>{row.project_name||'Sin proyecto'}</span>
     <span className={`${CELL} whitespace-nowrap tabular-nums text-mute`}>{dateTime(row.starts_at)} → {dateTime(row.ends_at)}</span>
     <span className={`${CELL} truncate text-mute`} title={row.items.map(i=>i.name).join(' · ')}>{row.items.map(i=>i.name).join(' · ')||'Sin equipos'}</span>
     <span className={`${CELL} truncate text-mute`} title={row.responsible_members.map(p=>p.name).join(', ')}>{row.responsible_members.map(p=>p.name).join(', ')||'Sin responsables'}</span>
     <span className={`${CELL} truncate text-mute`} title={row.return_user_name||undefined}>{row.return_user_name||'—'}{row.status==='checked_out'?` · ${row.custodian_name||'Sin custodio'}`:''}</span>
     <span className={`flex flex-wrap items-center justify-end gap-1 ${ROW_ICON_TARGETS}`}>
      {context&&(inventoryCanManageReservation(context,row)||row.status==='checked_out'&&inventoryCanReturn(context,row))?<>
       {row.status==='reserved'?<><IconAction icon="edit" label={`Editar reserva: ${row.title}`} onClick={()=>setEditReservation(row)}/><IconAction icon="package" tone="ok" label={`Registrar retiro: ${row.title}`} onClick={()=>setAction({kind:'checkout',row})}/><IconAction icon="close" tone="warn" label={`Cancelar reserva: ${row.title}`} onClick={()=>setAction({kind:'cancel',row})}/></>:null}
       {row.status==='checked_out'?<IconAction icon="refresh" tone="ok" label={`Registrar devolución: ${row.title}`} onClick={()=>setAction({kind:'return',row})}/>:null}
      </>:null}
     </span>
     {row.actor_name||row.checkout_actor_name||row.return_actor_name||row.status==='checked_out'&&new Date(row.ends_at)<new Date()?<p className="col-span-full flex min-w-0 flex-nowrap items-center gap-x-3 overflow-hidden text-[11px] text-mute" title={[row.actor_name?`Reservado por ${row.actor_name}`:'',row.checkout_actor_name?`Retiro por ${row.checkout_actor_name}`:'',row.return_actor_name?`Devolución por ${row.return_actor_name}`:'',row.notes?`Notas: ${row.notes}`:''].filter(Boolean).join(' · ')}>
      {row.actor_name?<span className="truncate" title={`Reservado por ${row.actor_name}`}>Reservado por {row.actor_name}</span>:null}
      {row.checkout_actor_name?<span className="truncate" title={`Retiro por ${row.checkout_actor_name}`}>Retiro por {row.checkout_actor_name}</span>:null}
      {row.return_actor_name?<span className="truncate" title={`Devolución por ${row.return_actor_name}`}>Devolución por {row.return_actor_name}</span>:null}
      {row.status==='checked_out'&&new Date(row.ends_at)<new Date()?<span className="font-semibold text-warn">Devolución pendiente desde {dateTime(row.ends_at)}</span>:null}
      {row.notes?<span className="truncate" title={`Notas: ${row.notes}`}>Notas: {row.notes}</span>:null}
     </p>:null}
    </div>)}
    {!reservations.length?<EmptyState icon="calendar" title="Sin reservas en este mes." description="Elegí equipos y fechas para planificar una producción."/>:null}
    </div>
   </div>
  </Card>:<Card className="grid min-w-0 gap-4">
   {refreshError?<Aviso tono="warn">No se pudo actualizar: {refreshError}. Se muestra la última información recibida.</Aviso>:null}
   {notice?<Aviso tono="ok">{notice}</Aviso>:null}
   {error?<ErrorState title="No se pudo cargar el inventario." description={error} onRetry={()=>setRefresh(n=>n+1)}/>:null}
   {loading&&!error?<LoadingBlock label="Cargando inventario…" lines={6}/>:null}
   {!loading&&!error&&equipmentView==='pipeline'?<InventoryPipeline items={items} locations={storageTemplates} canManage={Boolean(context?.can_manage)} onDetail={setDetail} onMoved={()=>refreshed('Ubicación actualizada.')} onQuickVerify={quickVerify} verifyingId={verifyingId} onMoveLocally={moveItemLocally}/>:null}
   {!loading&&!error&&equipmentView!=='pipeline'?<>
    <InventorySummary items={items} onAddValue={context?.can_manage&&itemWithoutValue?()=>setEditItem(itemWithoutValue):undefined}/>
    {equipmentView==='list'?<div data-list="equipment" className="min-w-0 overflow-x-auto">
     <div className={`${EQUIPMENT_COLS} grid min-w-[67.5rem] gap-2`}>
     <div data-list-head="equipment" className={`${EQUIPMENT_GRID} px-3 text-[10px] font-bold uppercase tracking-wider text-mute`} aria-hidden="true">
      <span/><span>Foto</span><span>Artículo</span><span>Detalles</span><span className="text-right">Valor</span><span>Estado</span><span>Ubicación</span><span>Verificación</span><span className="text-right">Acciones</span>
     </div>
     {visible.map(item=><EquipmentRow key={item.id} item={item} selectable={selectionEnabled&&item.status!=='retired'} selected={selectedItems.includes(String(item.id))} onSelect={()=>toggleSelected(String(item.id))} canManage={Boolean(context?.can_manage)} verifying={verifyingId===String(item.id)} onDetail={setDetail} onVerify={quickVerify} onVerifyDetail={setVerification} onEdit={setEditItem} onArchive={setArchive}/>)}
     </div>
    </div>:<div data-grid="equipment" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
     {visible.map(item=><EquipmentCard key={item.id} item={item} selectable={selectionEnabled&&item.status!=='retired'} selected={selectedItems.includes(String(item.id))} onSelect={()=>toggleSelected(String(item.id))} canManage={Boolean(context?.can_manage)} verifying={verifyingId===String(item.id)} onDetail={setDetail} onVerify={quickVerify} onVerifyDetail={setVerification} onEdit={setEditItem} onArchive={setArchive}/>)}
    </div>}
    {!visible.length?<EmptyState icon="box" title={items.length?'No hay equipos que coincidan con la búsqueda.':'Todavía no hay equipos en el inventario.'} description={items.length?'Probá otra búsqueda o categoría.':'Registrá el primer equipo para reservarlo, verificarlo y etiquetarlo.'} action={items.length?<Button type="button" variant="ghost" onClick={()=>{setSearch('');setCategoryFilter('');}}>Limpiar búsqueda</Button>:context?.can_manage?<Button type="button" onClick={()=>setEditItem('new')}>Agregar equipo</Button>:undefined}/>:null}
   </>:null}
  </Card>}

  {context?.can_manage?<Card className="grid min-w-0 gap-4">
   <details className="grid gap-3">
    <summary className="cursor-pointer text-sm font-semibold text-fore">Ubicaciones de guardado</summary>
    <p className="text-xs text-mute">Las ubicaciones archivadas dejan de estar disponibles para equipos nuevos. No se puede eliminar una ubicación con equipos asociados.</p>
    <div className="grid gap-2">
     {storageTemplates.map(template=><div key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ink-600/60 px-3 py-2">
      <div className="min-w-0"><b className="text-[13px] text-fore">{template.name}</b><small className="block text-xs text-mute">{template.item_count} equipo{template.item_count===1?'':'s'}{template.active?'':' · archivada'}</small></div>
      <div className="flex flex-wrap items-center gap-2">
       <Button type="button" variant="ghost" onClick={()=>setEditStorageTemplate(template)}>Renombrar</Button>
       {template.active?<Button type="button" variant="ghost" onClick={async()=>{try{await api(`/api/agency/inventory-locations/${template.id}`,{name:template.name,active:false},'PATCH');refreshed('Ubicación archivada.');}catch(error){setError(errorMessage(error));}}}>Archivar</Button>:null}
       <Button type="button" variant="ghost" disabled={template.item_count>0} title={template.item_count>0?'No se puede eliminar: hay equipos asociados.':'Eliminar ubicación'} onClick={async()=>{if(template.item_count>0)return;try{await api(`/api/agency/inventory-locations/${template.id}`,undefined,'DELETE');refreshed('Ubicación eliminada.');}catch(error){setError(errorMessage(error));}}}>Eliminar</Button>
      </div>
     </div>)}
     {!storageTemplates.length?<p className="text-xs text-mute">Todavía no hay ubicaciones guardadas.</p>:null}
     <div className="flex justify-start"><Button type="button" variant="ghost" onClick={()=>setEditStorageTemplate('new')}>Crear ubicación</Button></div>
    </div>
   </details>
  </Card>:null}
  {context?.can_manage?<Card className="grid min-w-0 gap-4">
   <details className="grid gap-3">
    <summary className="cursor-pointer text-sm font-semibold text-fore">Categorías de equipos</summary>
    <p className="text-xs text-mute">Renombrar actualiza la categoría de sus equipos. Archivar la quita de nuevas selecciones.</p>
    <div className="flex flex-wrap gap-2">
     {categories.map(c=><Button type="button" key={c.id} variant="outline" onClick={()=>setEditCategory(c)}><CategoryIcon name={c.icon}/>{c.name}{c.active?'':' · archivada'}</Button>)}
     <Button type="button" variant="ghost" onClick={()=>setEditCategory('new')}>Agregar categoría</Button>
    </div>
   </details>
  </Card>:null}

  {editItem&&context?.can_manage?<Dialog title={editItem==='new'?'Nuevo equipo':'Editar equipo'} close={()=>setEditItem(null)}><InventoryItemForm item={editItem==='new'?null:editItem} categories={categories} members={context.members} storageTemplates={storageTemplates} canManageStorage={context.can_manage} createStorageTemplate={async name=>{const result=await api<{location:StorageTemplate}>('/api/agency/inventory-locations',{name},'POST');addStorageTemplate(result.location);setRefresh(current=>current+1);return result.location;}} done={()=>refreshed('Equipo guardado.')}/></Dialog>:null}
  {editStorageTemplate&&context?.can_manage?<Dialog title={editStorageTemplate==='new'?'Nueva ubicación':'Editar ubicación'} close={()=>setEditStorageTemplate(null)}><StorageTemplateForm template={editStorageTemplate==='new'?null:editStorageTemplate} members={context.members} done={message=>saved(message)}/></Dialog>:null}
  {verification&&context?.can_manage?<Dialog title={`Verificar con detalle · ${verification.name}`} close={()=>setVerification(null)}><InventoryVerificationForm item={verification} done={()=>saved('Verificación física registrada.')}/></Dialog>:null}
  {batchLocation?<Dialog title={`Mover ${batchLocation.length} equipo${batchLocation.length===1?'':'s'} de ubicación`} close={()=>setBatchLocation(null)}>{storageTemplates.some(template=>template.active)?<Editor columns fields={[{key:'location',label:'Ubicación',choices:storageTemplates.filter(template=>template.active).map(template=>({value:String(template.id),label:template.name}))},{key:'storage_row',label:'Fila / posición',optional:true}]} defaults={{location:String(storageTemplates.find(template=>template.active)?.id||''),storage_row:''}} label="Mover" save={async values=>{await batchMoveLocation(values.location,values.storage_row);}}/>:<Editor columns fields={[{key:'storage_shelf',label:'Ubicación',help:'Sin lugares configurados: escribí dónde se guardan.'},{key:'storage_row',label:'Fila / posición',optional:true}]} defaults={{storage_shelf:'',storage_row:''}} label="Mover" save={async values=>{await batchMoveLocation('',values.storage_row,values.storage_shelf);}}/>}</Dialog>:null}
  {detail?<Dialog variant="drawer" title="Detalle y trazabilidad" close={()=>setDetail(null)}><InventoryDetail item={detail} members={context?.members||[]} canManage={Boolean(context?.can_manage)} onChanged={()=>refreshed('Mantenimiento actualizado.')}/></Dialog>:null}
  {editCategory&&context?.can_manage?<Dialog title={editCategory==='new'?'Nueva categoría':'Editar categoría'} close={()=>setEditCategory(null)}><CategoryForm category={editCategory==='new'?null:editCategory} done={message=>saved(message)}/></Dialog>:null}
  {editReservation&&context?.can_reserve?<Dialog title={editReservation==='new'?'Reservar equipos':'Editar reserva'} close={()=>setEditReservation(null)}><InventoryReservationForm key={editReservation==='new'?`new-${reserveIds.join('-')}`:editReservation.id} context={context} items={items} initialSelected={reserveIds} record={editReservation==='new'?null:editReservation} done={()=>saved('Reserva guardada. El retiro se registra por separado.')}/></Dialog>:null}
  {action?<Dialog title={{checkout:'Registrar retiro',return:'Registrar devolución',cancel:'Cancelar reserva'}[action.kind]} close={()=>setAction(null)}><InventoryTransitionForm action={action.kind} record={action.row} done={()=>saved({checkout:'Retiro registrado.',return:'Devolución registrada.',cancel:'Reserva cancelada.'}[action.kind])}/></Dialog>:null}
  {archive?<Dialog title={`Archivar ${archive.name}`} busy={busy} close={()=>{if(!busy){setArchive(null);setArchiveError('');}}}><p className="text-sm text-mute">El equipo quedará en Papelera. No se puede archivar mientras tenga reservas abiertas.</p>{archiveError?<Aviso tono="error" className="mt-2">{archiveError}</Aviso>:null}<SaveActions pending={busy}><Button type="button" disabled={busy} onClick={async()=>{if(busy)return;setBusy(true);setArchiveError('');try{await api(`/api/agency/inventory/${archive.id}`,{},'DELETE');saved('Equipo archivado. Se puede restaurar desde Papelera.');}catch(error){setArchiveError(errorMessage(error));}finally{setBusy(false);}}}>{busy?'Archivando…':'Archivar equipo'}</Button></SaveActions></Dialog>:null}
 </div>;
}

export function InventoryItemForm({item,categories,members,storageTemplates,canManageStorage,createStorageTemplate,done}:{item:InventoryItem|null;categories:Category[];members:Person[];storageTemplates:StorageTemplate[];canManageStorage:boolean;createStorageTemplate:(name:string)=>Promise<StorageTemplate>;done:()=>void}){
 const {currency:companyCurrency}=useCompanyCurrency();
 const [values,setValues]=useState(()=>({name:item?.name||'',category_id:String(item?.category_id||categories.find(c=>c.active)?.id||''),serial_number:item?.serial_number||'',photo_url:item?.photo_url||'',storage_shelf:item?.storage_shelf||'',storage_row:item?.storage_row||'',value:item?.value||'0',currency:item?.currency||companyCurrency,status:item?.status||'available',custodian_user_id:String(item?.custodian_user_id||''),acquired_on:String(item?.acquired_on||'').slice(0,10),notes:String(item?.notes||''),purchase_value:item?.purchase_value==null?'':String(item.purchase_value),purchase_date:String(item?.purchase_date||'').slice(0,10),depreciation_method:item?.depreciation_method==='linear'?'linear':'none',useful_life_months:item?.useful_life_months==null?'':String(item.useful_life_months),residual_value:item?.residual_value==null?'0':String(item.residual_value)}));
 const initialTemplate=String(item?.storage_location_id||'');
 const [templateId,setTemplateId]=useState(initialTemplate),[newPlace,setNewPlace]=useState(''),[creatingPlace,setCreatingPlace]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [photoBusy,setPhotoBusy]=useState(false);
 const availableTemplates=storageTemplates.filter(template=>template.active||template.id===initialTemplate);
 function change(key:keyof typeof values,value:string){setValues(current=>({...current,[key]:value}));}
 async function pickPhoto(file:File){setPhotoBusy(true);setError('');try{const photo=await preparePhoto(file,true);change('photo_url',photo);}catch(cause){setError(errorMessage(cause));}finally{setPhotoBusy(false);}}
 async function createPlace(){const name=newPlace.trim();if(!name||creatingPlace)return;setCreatingPlace(true);setError('');try{const template=await createStorageTemplate(name);setTemplateId(template.id);change('storage_shelf',template.name);setNewPlace('');}catch(error){setError(errorMessage(error));}finally{setCreatingPlace(false);}}
 // Mirrors the server rules before calling the API: linear needs purchase value, date and life 1..600.
 function validateValue(){const check=depreciationValidation(values);if(!check.ok){setError(check.error);return false;}return true;}
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;if(!values.value){setError('Ingresá el valor del equipo.');return;}if(!validateValue())return;setBusy(true);setError('');try{await api(`/api/agency/inventory${item?`/${item.id}`:''}`,{...values,storage_location_id:templateId||null,purchase_value:values.purchase_value||null,purchase_date:values.purchase_date||null,useful_life_months:values.depreciation_method==='linear'?Number(values.useful_life_months):null,residual_value:values.residual_value||'0'},item?'PATCH':'POST');done();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><p className="text-xs text-mute sm:col-span-2">Un registro por unidad reservable. Al guardar se asigna un código único Scale OS, imprimible como etiqueta. Para un kit, indicá sus componentes en el nombre o las notas.</p>{item?<p className="text-xs text-mute sm:col-span-2">Código de inventario: <code className="whitespace-nowrap font-mono text-[11px] text-fore">{itemCode(item)}</code></p>:null}
  <div className="sm:col-span-2"><Label htmlFor="inventory-item-name">Nombre del equipo</Label><Input id="inventory-item-name" value={values.name} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('name',event.target.value)} required minLength={2} maxLength={160}/></div>
  <div><SelectCustom label="Categoría" choices={categories.filter(c=>c.active||String(c.id)===String(item?.category_id)).map(c=>({value:String(c.id),label:c.name}))} value={values.category_id} onChange={(value:string)=>change('category_id',value)}/></div>
  <div><Label htmlFor="inventory-item-serial">Serie, IMEI o identificador</Label><Input id="inventory-item-serial" value={values.serial_number} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('serial_number',normalizeSerial(event.target.value))} autoCapitalize="characters" spellCheck={false} maxLength={160}/></div>
  <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Foto del equipo</legend>{values.photo_url?<span className="flex flex-wrap items-center gap-3"><img className="h-24 w-24 rounded-xl object-cover" src={values.photo_url} alt="Vista previa de la foto del equipo"/><Button type="button" variant="ghost" onClick={()=>change('photo_url','')}><Trash2 size={14}/>Quitar foto</Button></span>:null}<div className="grid gap-2 sm:grid-cols-2"><div><Label htmlFor="inventory-item-photo-url">Enlace a la imagen</Label><Input id="inventory-item-photo-url" value={values.photo_url.startsWith('data:')?'':values.photo_url} placeholder="https://…" onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('photo_url',event.target.value.trim())}/></div><label className="flex items-end gap-2 text-sm text-mute"><span className="flex-1">{photoBusy?'Procesando…':'Cámara o subir foto'}<input className="mt-1 block h-11 w-full text-xs md:h-auto" type="file" accept={PHOTO_ACCEPT} aria-label={`Elegir foto (${PHOTO_FORMATS}; hasta 4 MB)`} capture="environment" disabled={photoBusy} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];if(file)void pickPhoto(file);event.target.value='';}}/></span></label></div></fieldset>
  <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Ubicación de guardado</legend><div className="grid gap-2 sm:grid-cols-3"><div><SelectCustom label="Ubicación" choices={[{value:'',label:'Ubicación personalizada'},...availableTemplates.map(template=>({value:String(template.id),label:template.active?template.name:template.name+' · archivada'}))]} value={templateId} onChange={value=>{setTemplateId(value);const template=availableTemplates.find(candidate=>String(candidate.id)===value);if(template)change('storage_shelf',template.name);}}/></div>{!templateId?<div><Label htmlFor="inventory-item-shelf">Ubicación personalizada</Label><Input id="inventory-item-shelf" value={values.storage_shelf} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('storage_shelf',event.target.value)} maxLength={100} placeholder="Estante, depósito o lugar"/></div>:<p className="self-end text-xs text-mute">Se guarda como {availableTemplates.find(template=>template.id===templateId)?.name||values.storage_shelf}.</p>}<div><Label htmlFor="inventory-item-row">Fila / posición</Label><Input id="inventory-item-row" className="w-36" value={values.storage_row} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('storage_row',event.target.value)} maxLength={80}/></div></div>{canManageStorage?<div className="flex flex-wrap items-end gap-2"><div><Label htmlFor="inventory-item-new-place">Crear lugar</Label><Input id="inventory-item-new-place" className="w-52" value={newPlace} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setNewPlace(event.target.value)} maxLength={100} placeholder="Ej.: Depósito · Rack A"/></div><Button type="button" variant="ghost" disabled={!newPlace.trim()||creatingPlace} onClick={()=>void createPlace()}>{creatingPlace?'Creando…':'Crear lugar'}</Button></div>:null}</fieldset>
  <div><Label htmlFor="inventory-item-value">Valor del equipo</Label><AmountInput id="inventory-item-value" value={values.value} currency={values.currency} onChange={(value:string)=>change('value',value)}/></div>
  <div><SelectCustom label="Moneda" choices={currencyChoices} value={values.currency} onChange={(value:string)=>change('currency',value)}/></div>
  <div><Label htmlFor="inventory-item-purchase">Valor de compra · Opcional</Label><AmountInput id="inventory-item-purchase" value={values.purchase_value} currency={values.currency} onChange={(value:string)=>change('purchase_value',value)}/></div>
  <div><Label htmlFor="inventory-item-purchase-date">Fecha de compra · Opcional</Label><Input id="inventory-item-purchase-date" className="w-44" type="date" value={values.purchase_date} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('purchase_date',event.target.value)}/></div>
  <div><SelectCustom label="Método de depreciación" choices={depreciationMethods} value={values.depreciation_method} onChange={(value:string)=>change('depreciation_method',value)}/></div>
  {values.depreciation_method==='linear'?<div><Label htmlFor="inventory-item-life">Vida útil (meses)</Label><Input id="inventory-item-life" className="w-28" type="number" min={1} max={600} step={1} required value={values.useful_life_months} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('useful_life_months',event.target.value)}/></div>:null}
  <div><Label htmlFor="inventory-item-residual">Valor residual</Label><AmountInput id="inventory-item-residual" value={values.residual_value} currency={values.currency} onChange={(value:string)=>change('residual_value',value)}/></div>
  {item?<p className="text-xs text-mute sm:col-span-2">Valor actual {item.current_value==null?'sin calcular':<MoneyText valor={item.current_value} currency={values.currency}/>} · Depreciación acumulada {item.accumulated_depreciation==null?'sin calcular':<MoneyText valor={item.accumulated_depreciation} currency={values.currency}/>}. Se recalcula con los datos guardados; los cambios se aplican al guardar.</p>:null}
  <div><SelectCustom label="Estado" choices={item?.status==='in_use'?[{value:'in_use',label:'En uso (registrar devolución)'}]:itemStatuses} value={values.status} onChange={(value:string)=>change('status',value)}/></div>
  <div><SelectCustom label="Custodio registrado" choices={[{value:'',label:'Sin custodio'},...members.map(member=>({value:String(member.id),label:member.name}))]} value={values.custodian_user_id} onChange={(value:string)=>change('custodian_user_id',value)}/></div>
  <div><Label htmlFor="inventory-item-acquired">Fecha de adquisición</Label><Input id="inventory-item-acquired" className="w-44" type="date" value={values.acquired_on} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('acquired_on',event.target.value)}/></div>
  <div className="sm:col-span-2"><Label htmlFor="inventory-item-notes">Notas</Label><textarea id="inventory-item-notes" className="min-h-24 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={values.notes} onChange={(event:React.ChangeEvent<HTMLTextAreaElement>)=>change('notes',event.target.value)} maxLength={2000}/></div>
  {error?<Aviso tono="error" className="sm:col-span-2">{error}</Aviso>:null}<div className="sm:col-span-2"><SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar equipo'}</Button></SaveActions></div>
 </form>;
}

function StorageTemplateForm({template,members,done}:{template:StorageTemplate|null;members:{id:string;name:string}[];done:(message:string)=>void}){
 const mounted=useMountedRef();
 const [name,setName]=useState(template?.name||''),[active,setActive]=useState(template?.active??true),[responsible,setResponsible]=useState(template?.responsible_user_id||''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <form className="grid gap-4" onSubmit={async event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(`/api/agency/inventory-locations${template?`/${template.id}`:''}`,{name,active,responsible_user_id:responsible||null},template?'PATCH':'POST');done(template?'Ubicación actualizada.':'Ubicación creada.');}catch(error){setError(errorMessage(error));}finally{if(mounted.current)setBusy(false);}}}><div><Label htmlFor="inventory-place-name">Nombre de la ubicación</Label><Input id="inventory-place-name" value={name} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setName(event.target.value)} required minLength={2} maxLength={100}/></div><div><SelectCustom label="Responsable del lugar" choices={[{value:'',label:'Sin responsable'},...members.map(member=>({value:String(member.id),label:member.name}))]} value={responsible} onChange={setResponsible}/></div><p className="text-xs text-mute">El responsable es una persona del equipo que cuida ese lugar; solo se muestra en el panel.</p>{template?<label className="flex min-h-11 items-center gap-2 text-sm text-fore md:min-h-0"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={active} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setActive(event.target.checked)}/><span>Disponible para nuevas asignaciones</span></label>:null}{error?<Aviso tono="error">{error}</Aviso>:null}<SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar ubicación'}</Button></SaveActions></form>;
}

function CategoryForm({category,done}:{category:Category|null;done:(message:string)=>void}){
 const [name,setName]=useState(category?.name||''),[active,setActive]=useState(category?.active??true),[icon,setIcon]=useState<string|null>(category?.icon??null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const trimmed=name.trim();
 return <form className="grid gap-4" onSubmit={async event=>{event.preventDefault();if(busy)return;if(trimmed.length<2||trimmed.length>80){setError('El nombre debe tener entre 2 y 80 caracteres.');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory-categories${category?`/${category.id}`:''}`,{name:trimmed,active,icon},category?'PATCH':'POST');done(category?'Categoría actualizada.':'Categoría creada.');}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}}>
  <div><Label htmlFor="inventory-category-name">Nombre de la categoría</Label><Input id="inventory-category-name" value={name} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setName(event.target.value)} required minLength={2} maxLength={80}/></div>
  {category?<label className="flex min-h-11 items-center gap-2 text-sm text-fore md:min-h-0"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={active} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setActive(event.target.checked)}/><span>Disponible para nuevos equipos</span></label>:null}
  <fieldset className="grid gap-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Ícono de categoría</legend><div className="flex flex-wrap gap-1" role="group" aria-label="Ícono de categoría"><button type="button" className={`grid h-11 w-11 place-items-center rounded-lg border md:h-9 md:w-9 ${icon===null?'border-fono bg-fono/15 text-fono-light':'border-ink-600 text-mute'}`} title="Sin ícono" aria-label="Sin ícono" aria-pressed={icon===null} onClick={()=>setIcon(null)}><X size={16}/></button>{Object.entries(categoryIconMap).map(([key,Icon])=><button key={key} type="button" className={`grid h-11 w-11 place-items-center rounded-lg border md:h-9 md:w-9 ${icon===key?'border-fono bg-fono/15 text-fono-light':'border-ink-600 text-mute'}`} title={key} aria-label={key} aria-pressed={icon===key} onClick={()=>setIcon(key)}><Icon size={16}/></button>)}</div></fieldset>
  {error?<Aviso tono="error">{error}</Aviso>:null}<SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar categoría'}</Button></SaveActions>
 </form>;
}

export function InventoryDetail({item,members=[],canManage=false,onChanged}:{item:InventoryItem;members?:Person[];canManage?:boolean;onChanged?:()=>void}){
 const [maintenance,setMaintenance]=useState<InventoryMaintenance|'new'|null>(null),[confirmVoid,setConfirmVoid]=useState(''),[voiding,setVoiding]=useState(''),[voidError,setVoidError]=useState(''),[reload,setReload]=useState(0);
 const {data,error}=useInventoryRecord<{record:InventoryItem;verifications:InventoryVerification[];trace:InventoryTrace[];maintenance?:InventoryMaintenance[]}>(`/api/agency/inventory/${item.id}`,reload);
 function maintenanceSaved(){setMaintenance(null);setReload(n=>n+1);onChanged?.();}
 async function voidMaintenance(row:InventoryMaintenance){if(voiding)return;setVoiding(String(row.id));setVoidError('');try{await api(`/api/agency/inventory-maintenance/${row.id}`,{},'DELETE');setConfirmVoid('');setReload(n=>n+1);onChanged?.();}catch(cause){setVoidError(errorMessage(cause));}finally{setVoiding('');}}
 const record=data?.record||item,code=itemCode(record),maintenanceRows=data?.maintenance||[],facts=depreciationFacts(record);
 return <div className="grid min-w-0 gap-4">
  <section className="grid gap-3 rounded-xl border border-ink-600 bg-ink-800/60 p-3 sm:grid-cols-[auto_minmax(0,1fr)]">
   {record.photo_url?<img className="h-28 w-28 rounded-xl object-cover" src={record.photo_url} alt={`Foto de ${record.name}`}/>:null}
   <div className="grid min-w-0 gap-1">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-fono-light">Identificación física</p>
    <code className="whitespace-nowrap font-mono text-sm text-fore">{code}</code>
    <p className="break-words text-sm text-fore">{record.name} · {record.serial_number||'Sin serie registrada'}</p>
    <p className="text-xs text-mute">{inventoryLocation(record)}</p>
    <div className="mt-1"><InventoryBarcode code={code}/></div>
   </div>
  </section>
  {error?<Aviso tono="error">{error}</Aviso>:null}
  {!data&&!error?<LoadingBlock label="Cargando trazabilidad…" lines={4}/>:<>
   <section className="grid gap-2"><h3 className="text-sm font-semibold text-fore">Valor y depreciación</h3>{record.purchase_value==null?<p className="text-sm text-mute">Sin valor de compra registrado.</p>:<dl className="grid gap-1 text-sm">
    <FilaDato etiqueta="Valor de compra" etiquetaComo="dt" valorComo="dd" valor={<CeldaMoneda valor={Number(record.purchase_value)} currency={record.currency}/>}/>
    <FilaDato etiqueta="Fecha de compra" etiquetaComo="dt" valorComo="dd" valor={<span className="whitespace-nowrap">{listDateShort(String(record.purchase_date||'').slice(0,10))||'—'}</span>}/>
    <FilaDato etiqueta="Método" etiquetaComo="dt" valorComo="dd" valor={depreciationMethodLabel(record.depreciation_method)}/>
    {record.depreciation_method==='linear'?<FilaDato etiqueta="Vida útil" etiquetaComo="dt" valorComo="dd" valor={record.useful_life_months?`${record.useful_life_months} meses`:'—'}/>:null}
    <FilaDato etiqueta="Valor residual" etiquetaComo="dt" valorComo="dd" valor={<CeldaMoneda valor={Number(record.residual_value||0)} currency={record.currency}/>}/>
    <FilaDato etiqueta="Valor actual" etiquetaComo="dt" valorComo="dd" tono="info" valorClassName="shrink text-right" valor={facts.currentValue==null?'—':<CeldaMoneda valor={facts.currentValue} currency={record.currency}/>}/>
    <FilaDato etiqueta="Depreciación acumulada" etiquetaComo="dt" valorComo="dd" valor={facts.accumulatedDepreciation==null?'—':<CeldaMoneda valor={facts.accumulatedDepreciation} currency={record.currency}/>}/>
    {facts.monthlyDepreciation!=null?<FilaDato etiqueta="Depreciación mensual" etiquetaComo="dt" valorComo="dd" valor={<CeldaMoneda valor={facts.monthlyDepreciation} currency={record.currency}/>}/>:null}
   </dl>}{facts.hasDepreciation?<div className="grid gap-1"><span className="text-xs text-mute">Vida útil transcurrida: {facts.progressPercent}% ({facts.monthsElapsed} de {facts.usefulLifeMonths} meses)</span><span className="block h-1.5 overflow-hidden rounded-full bg-fore/10" role="img" aria-label={`Vida útil transcurrida: ${facts.progressPercent}%`}><span className="block h-full rounded-full bg-fono" style={{width:`${facts.progressPercent}%`}}/></span></div>:null}</section>
   <section className="grid gap-2"><h3 className="text-sm font-semibold text-fore">Mantenimiento</h3>{voidError?<Aviso tono="error">{voidError}</Aviso>:null}{canManage?<div className="flex justify-start"><Button type="button" variant="outline" onClick={()=>setMaintenance('new')}><Plus size={14}/>Agregar mantenimiento</Button></div>:null}{maintenanceRows.length?maintenanceRows.map(row=><article className={`grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2 ${row.voided_at?'opacity-60':''}`} key={row.id} data-voided={row.voided_at?'true':undefined}><b className="text-[13px] text-fore">{row.kind}{row.voided_at?<span className="ml-2 text-[11px] font-semibold text-warn">Anulado</span>:null}</b><span className="inline-flex items-center gap-1 text-xs text-mute">{listDateShort(String(row.maintenance_date||'').slice(0,10))||row.maintenance_date} · <MoneyText valor={row.cost} currency={row.currency}/></span>{row.responsible_name?<span className="inline-flex items-center gap-1.5 text-xs text-mute"><ActorAvatar name={row.responsible_name} photo={safePhoto(row.responsible_photo_url)}/>{row.responsible_name}</span>:null}{row.description?<p className="text-xs text-mute">{row.description}</p>:null}{row.voided_at&&row.voided_by_name?<span className="text-xs text-mute">Anulado por {row.voided_by_name}</span>:null}{canManage&&!row.voided_at?<div className="flex flex-wrap items-center gap-2">{confirmVoid===String(row.id)?<><span role="alert" className="text-xs text-fore">¿Anular este mantenimiento?</span><Button type="button" variant="danger" disabled={Boolean(voiding)} onClick={()=>void voidMaintenance(row)}>{voiding===String(row.id)?'Anulando…':'Confirmar'}</Button><Button type="button" variant="ghost" disabled={Boolean(voiding)} onClick={()=>setConfirmVoid('')}>Cancelar</Button></>:<><Button type="button" variant="ghost" onClick={()=>setMaintenance(row)}><Pencil size={14}/>Editar</Button><Button type="button" variant="ghost" onClick={()=>setConfirmVoid(String(row.id))}><X size={14}/>Anular</Button></>}</div>:null}</article>):<p className="text-sm text-mute">Sin mantenimientos registrados.</p>}</section>
   <section className="grid gap-2"><h3 className="text-sm font-semibold text-fore">Verificación física</h3>{record.last_verified_at?<p className="text-sm text-fore"><b>{verificationLabel(record.last_verification_result)}</b> · {dateTime(record.last_verified_at)}{record.last_verifier_name?` · ${record.last_verifier_name}`:''}</p>:<p className="text-sm text-mute">Sin verificación física registrada.</p>}{data?.verifications.map(row=><article className="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2" key={`verification-${row.id}`}><b className="text-[13px] text-fore">{verificationLabel(row.result)}</b><span className="text-xs text-mute">{dateTime(row.verified_at)} · {row.verifier_name||'Usuario registrado'}</span>{row.differences?<p className="text-xs text-mute">{row.differences}</p>:null}{row.note?<p className="text-xs text-mute">{row.note}</p>:null}</article>)}</section>
   <section className="grid gap-2"><h3 className="text-sm font-semibold text-fore">Rastro de préstamo y cambios</h3>{data?.trace.map(row=><article className="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2" key={row.id}><b className="text-[13px] text-fore">{traceLabel(row.event_type)}</b><span className="text-xs text-mute">{dateTime(row.event_at)} · {row.actor_name||'Sistema'}</span>{row.event_data?.title?<p className="text-xs text-mute">{String(row.event_data.title)}</p>:null}</article>)}{!data?.trace.length?<p className="text-sm text-mute">Sin eventos registrados todavía.</p>:null}</section>
  </>}
  {maintenance&&<Dialog title={maintenance==='new'?'Agregar mantenimiento':`Editar mantenimiento · ${maintenance.kind}`} close={()=>setMaintenance(null)}><InventoryMaintenanceForm item={record} record={maintenance==='new'?null:maintenance} members={members} done={maintenanceSaved}/></Dialog>}
 </div>;
}

function InventoryMaintenanceForm({item,record,members,done}:{item:InventoryItem;record:InventoryMaintenance|null;members:Person[];done:()=>void}){
 const {currency}=useCompanyCurrency();
 const [values,setValues]=useState(()=>({maintenance_date:String(record?.maintenance_date||'').slice(0,10),kind:record?.kind||'',description:record?.description||'',cost:record?.cost==null?'0':String(record.cost),currency:record?.currency||currency,responsible_user_id:String(record?.responsible_user_id||'')}));
 const mounted=useMountedRef();
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 const change=(key:keyof typeof values,value:string)=>setValues(current=>({...current,[key]:value}));
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;if(!values.maintenance_date){setError('Indicá la fecha del mantenimiento.');return;}if(values.kind.trim().length<2){setError('Indicá el tipo de mantenimiento.');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory-maintenance${record?`/${record.id}`:''}`,{inventory_id:item.id,maintenance_date:values.maintenance_date,kind:values.kind.trim(),description:values.description,cost:values.cost||'0',currency:values.currency,responsible_user_id:values.responsible_user_id||null},record?'PATCH':'POST');done();}catch(error){setError(errorMessage(error));}finally{if(mounted.current)setBusy(false);}}
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><p className="text-xs text-mute sm:col-span-2">Mantenimiento de <code className="whitespace-nowrap font-mono text-[11px] text-fore">{itemCode(item)}</code>. El costo se registra en su moneda, sin conversiones.</p><div><Label htmlFor="inventory-maintenance-date">Fecha del mantenimiento</Label><Input id="inventory-maintenance-date" className="w-44" type="date" required value={values.maintenance_date} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('maintenance_date',event.target.value)}/></div><div><Label htmlFor="inventory-maintenance-kind">Tipo de mantenimiento</Label><Input id="inventory-maintenance-kind" value={values.kind} required minLength={2} maxLength={80} placeholder="Preventivo, reparación, limpieza…" onChange={(event:React.ChangeEvent<HTMLInputElement>)=>change('kind',event.target.value)}/></div><div className="sm:col-span-2"><Label htmlFor="inventory-maintenance-description">Descripción · Opcional</Label><textarea id="inventory-maintenance-description" className="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={values.description||''} maxLength={2000} onChange={(event:React.ChangeEvent<HTMLTextAreaElement>)=>change('description',event.target.value)}/></div><div><Label htmlFor="inventory-maintenance-cost">Costo</Label><AmountInput id="inventory-maintenance-cost" value={values.cost} currency={values.currency} onChange={(value:string)=>change('cost',value)}/></div><div><SelectCustom label="Moneda" choices={currencyChoices} value={values.currency} onChange={(value:string)=>change('currency',value)}/></div><div><SelectCustom label="Responsable" choices={[{value:'',label:'Sin responsable'},...members.map(member=>({value:String(member.id),label:member.name}))]} value={values.responsible_user_id} onChange={(value:string)=>change('responsible_user_id',value)}/></div>{error?<Aviso tono="error" className="sm:col-span-2">{error}</Aviso>:null}<div className="sm:col-span-2"><SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':'Guardar mantenimiento'}</Button></SaveActions></div></form>;
}

function InventoryVerificationForm({item,done}:{item:InventoryItem;done:()=>void}){
 const mounted=useMountedRef();
 const [result,setResult]=useState<'confirmed'|'difference'|'missing'>('confirmed'),[differences,setDifferences]=useState(''),[note,setNote]=useState(''),[adjust,setAdjust]=useState(false),[status,setStatus]=useState(item.status),[shelf,setShelf]=useState(item.storage_shelf),[row,setRow]=useState(item.storage_row),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setBusy(true);setError('');try{await api(`/api/agency/inventory/${item.id}/verify`,{result,differences,note,...(adjust?{adjustment:{status,storage_shelf:shelf,storage_row:row}}:{})},'POST');done();}catch(error){setError(errorMessage(error));}finally{if(mounted.current)setBusy(false);}}
 return <form className="grid gap-4" onSubmit={submit}><p className="text-xs text-mute">Código: <code className="whitespace-nowrap font-mono text-[11px] text-fore">{itemCode(item)}</code>. El control queda fechado, asociado a tu usuario y no cambia reservas existentes.</p><div><SelectCustom label="Resultado" choices={[{value:'confirmed',label:'Coincide con el registro'},{value:'difference',label:'Hay una diferencia'},{value:'missing',label:'No encontrado'}]} value={result} onChange={value=>setResult(value as typeof result)}/></div><div><Label htmlFor="inventory-verify-note">Observación</Label><textarea id="inventory-verify-note" className="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={note} maxLength={2000} onChange={(event:React.ChangeEvent<HTMLTextAreaElement>)=>setNote(event.target.value)} placeholder="Ej.: revisión mensual"/></div>{result!=='confirmed'?<div><Label htmlFor="inventory-verify-differences">Diferencias encontradas</Label><textarea id="inventory-verify-differences" className="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={differences} required maxLength={2000} onChange={(event:React.ChangeEvent<HTMLTextAreaElement>)=>setDifferences(event.target.value)} placeholder="Qué no coincide con el registro"/></div>:null}<label className="flex min-h-11 items-start gap-2 text-sm text-fore md:min-h-0"><input type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={adjust} disabled={item.location_type==='checked_out'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setAdjust(event.target.checked)}/><span>Ajustar estado o ubicación registrada{item.location_type==='checked_out'?' (no disponible mientras esté retirado)':''}</span></label>{adjust?<div className="grid gap-4 sm:grid-cols-3"><div><SelectCustom label="Estado real" choices={itemStatuses} value={status} onChange={setStatus}/></div><div><Label htmlFor="inventory-verify-shelf">Ubicación real</Label><Input id="inventory-verify-shelf" value={shelf} maxLength={100} required onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setShelf(event.target.value)}/></div><div><Label htmlFor="inventory-verify-row">Fila / posición</Label><Input id="inventory-verify-row" className="w-36" value={row} maxLength={80} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setRow(event.target.value)}/></div></div>:null}{error?<Aviso tono="error">{error}</Aviso>:null}<SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Registrando…':'Registrar verificación'}</Button></SaveActions></form>;
}

export function InventoryReservationForm({context,items,record,done,initialSelected=[]}:{context:Context;items:InventoryItem[];record:InventoryReservation|null;done:()=>void;initialSelected?:string[]}){
 const mounted=useMountedRef();
 const [title,setTitle]=useState(record?.title||''),[project,setProject]=useState(String(record?.project_id||'')),[start,setStart]=useState(record?opsLocalTime(record.starts_at):''),[end,setEnd]=useState(record?opsLocalTime(record.ends_at):'');
 const [selected,setSelected]=useState<string[]>(record?.items.map(i=>String(i.id))||initialSelected),[responsibles,setResponsibles]=useState<string[]>(record?.responsible_members.map(p=>String(p.id))||(context.role==='production'?[context.user_id]:[])),[returnPerson,setReturnPerson]=useState(String(record?.return_user_id||'')),[notes,setNotes]=useState(record?.notes||''),[search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const toggle=(id:string,list:string[],set:(list:string[])=>void)=>set(list.includes(id)?list.filter(value=>value!==id):[...list,id]);
 async function submit(event:FormEvent){event.preventDefault();if(busy)return;setError('');setBusy(true);try{
  if(!selected.length)throw new Error('Elegí al menos un equipo');if(!responsibles.length)throw new Error('Elegí al menos un responsable');if(!responsibles.includes(returnPerson))throw new Error('Elegí quién se encarga de devolver los equipos');if(!project)throw new Error('Elegí un proyecto activo');
  const starts=opsUtcTime(start),ends=opsUtcTime(end);if(ends<=starts)throw new Error('La devolución prevista debe ser posterior al inicio');
  await api(`/api/agency/inventory-reservations${record?`/${record.id}`:''}`,{title,project_id:project,starts_at:starts,ends_at:ends,inventory_ids:selected,responsible_user_ids:responsibles,return_user_id:returnPerson,notes,...(record?{expected_version:record.version}:{})},record?'PATCH':'POST');done();
 }catch(error){setError(errorMessage(error));}finally{if(mounted.current)setBusy(false);}}
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
  <div className="sm:col-span-2"><Label htmlFor="inventory-reservation-title">Producción o uso previsto</Label><Input id="inventory-reservation-title" value={title} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setTitle(e.target.value)} required minLength={2} maxLength={160} placeholder="Rodaje de contenidos · cliente"/></div>
  <div className="sm:col-span-2"><SelectCustom label="Proyecto" choices={[{value:'',label:'Elegí un proyecto activo'},...context.projects.map(p=>({value:String(p.id),label:p.name}))]} value={project} onChange={setProject}/></div>
  <div><Label htmlFor="inventory-reservation-start">Desde · Asunción</Label><Input id="inventory-reservation-start" type="datetime-local" value={start} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setStart(e.target.value)} required/></div><div><Label htmlFor="inventory-reservation-end">Devolución prevista · Asunción</Label><Input id="inventory-reservation-end" type="datetime-local" value={end} min={start||undefined} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setEnd(e.target.value)} required/></div>
  <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Equipos · {selected.length} de {BATCH_LIMITS.reservationItems} seleccionados</legend><SearchField ariaLabel="Buscar equipos" value={search} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setSearch(event.target.value)} placeholder="Memoria, DJI Mic…"/><div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">{items.filter(i=>`${i.name} ${i.category_name||i.category}`.toLowerCase().includes(search.toLowerCase())).map(i=><label className="flex min-h-11 items-start gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore md:min-h-0" key={i.id}><input type="checkbox" className="mt-0.5 h-6 w-6 p-0 accent-fono" checked={selected.includes(String(i.id))} disabled={['maintenance','retired'].includes(i.status)&&!selected.includes(String(i.id))||selected.length>=BATCH_LIMITS.reservationItems&&!selected.includes(String(i.id))} onChange={()=>toggle(String(i.id),selected,setSelected)}/><span className="min-w-0"><b className="break-words">{i.name}</b><small className="block text-xs text-mute">{i.status==='in_use'?'Actualmente en uso; el retiro depende de su devolución':i.status==='maintenance'?'En mantenimiento':i.status==='retired'?'Dado de baja':i.category_name||i.category}</small></span></label>)}</div><small className="text-xs text-mute">Se verifica que los equipos no tengan otra reserva en el horario elegido.{selected.length>=BATCH_LIMITS.reservationItems?` El lote admite hasta ${BATCH_LIMITS.reservationItems} equipos: quitá uno para sumar otro.`:''}</small></fieldset>
  <fieldset className="grid gap-2 sm:col-span-2"><legend className="text-[11px] font-medium uppercase tracking-wider text-mute">Responsables · {responsibles.length} de {BATCH_LIMITS.reservationResponsibles}</legend><div className="grid gap-1 sm:grid-cols-2">{context.members.map(p=><label className="flex items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore" key={p.id}><input type="checkbox" className="h-6 w-6 p-0 accent-fono" checked={responsibles.includes(String(p.id))} disabled={responsibles.length>=BATCH_LIMITS.reservationResponsibles&&!responsibles.includes(String(p.id))} onChange={()=>{toggle(String(p.id),responsibles,setResponsibles);if(returnPerson===String(p.id))setReturnPerson('');}}/><ActorIdentity name={p.name} photoUrl={p.photo_url} verified/></label>)}</div></fieldset>
  <div className="sm:col-span-2"><SelectCustom label="Responsable de devolución" choices={[{value:'',label:'Elegí entre los responsables'},...context.members.filter(p=>responsibles.includes(String(p.id))).map(p=>({value:String(p.id),label:p.name}))]} value={returnPerson} onChange={setReturnPerson}/>{returnPerson&&context.members.find(p=>String(p.id)===returnPerson)?<span className="mt-2 inline-flex"><ActorIdentity name={context.members.find(p=>String(p.id)===returnPerson)!.name} photoUrl={context.members.find(p=>String(p.id)===returnPerson)!.photo_url} verified/></span>:null}</div>
  <div className="sm:col-span-2"><Label htmlFor="inventory-reservation-notes">Notas</Label><textarea id="inventory-reservation-notes" className="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-sm text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value={notes} onChange={(e:React.ChangeEvent<HTMLTextAreaElement>)=>setNotes(e.target.value)} maxLength={2000}/></div>
  <p className="text-xs text-mute sm:col-span-2">Reservar no registra el retiro. Al retirar se indica quién lleva físicamente los equipos; al devolver se registra dónde quedan.</p>
  {error?<Aviso tono="error" className="sm:col-span-2">{error}</Aviso>:null}<div className="sm:col-span-2"><SaveActions pending={busy}><Button type="submit" disabled={busy||!context.projects.length}>{busy?'Guardando…':'Guardar reserva'}</Button></SaveActions></div>
 </form>;
}

export function InventoryTransitionForm({action,record,done}:{action:'checkout'|'return'|'cancel';record:InventoryReservation;done:()=>void}){
 const mounted=useMountedRef();
 const [custodian,setCustodian]=useState(''),[locations,setLocations]=useState(record.items.map(i=>({inventory_id:String(i.id),storage_shelf:i.storage_shelf||'',storage_row:i.storage_row||'',status:'available'}))),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 function location(index:number,key:'storage_shelf'|'storage_row'|'status',value:string){setLocations(current=>current.map((row,i)=>i===index?{...row,[key]:value}:row));}
 return <form className="grid gap-4" onSubmit={async event=>{event.preventDefault();if(busy)return;if(action==='checkout'&&!custodian){setError('Elegí al custodio real');return;}setBusy(true);setError('');try{await api(`/api/agency/inventory-reservations/${record.id}/${action}`,{expected_version:record.version,...(action==='checkout'?{custodian_user_id:custodian}:action==='return'?{locations}:{})});done();}catch(error){setError(errorMessage(error));}finally{if(mounted.current)setBusy(false);}}}>
  <p className="break-words text-sm text-fore">{record.title} · {record.items.map(i=>i.name).join(', ')}</p>
  {action==='checkout'?<><div><SelectCustom label="Quién lleva los equipos (custodio)" choices={[{value:'',label:'Elegí al custodio real'},...record.responsible_members.map(p=>({value:String(p.id),label:p.name}))]} value={custodian} onChange={setCustodian}/></div><p className="text-xs text-mute">Responsable de devolución: {record.return_user_name}. Confirmá el retiro cuando los equipos se entreguen físicamente, dentro del horario reservado.</p></>:action==='return'?<><p className="text-xs text-mute">Registrá la devolución completa y revisá dónde queda cada equipo. No se libera ninguno hasta guardar todos.</p>{locations.map((row,index)=><fieldset className="grid gap-3 rounded-xl border border-ink-600/60 p-3 sm:grid-cols-3" key={row.inventory_id}><legend className="px-1 text-[11px] font-medium uppercase tracking-wider text-mute">{record.items[index].name}</legend><div><Label htmlFor={`inventory-return-shelf-${row.inventory_id}`}>Estante o lugar de guardado</Label><Input id={`inventory-return-shelf-${row.inventory_id}`} value={row.storage_shelf} maxLength={100} required onChange={(e:React.ChangeEvent<HTMLInputElement>)=>location(index,'storage_shelf',e.target.value)}/></div><div><Label htmlFor={`inventory-return-row-${row.inventory_id}`}>Fila / posición</Label><Input id={`inventory-return-row-${row.inventory_id}`} className="w-36" value={row.storage_row} maxLength={80} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>location(index,'storage_row',e.target.value)}/></div><div><SelectCustom label="Estado al devolver" choices={[{value:'available',label:'Disponible'},{value:'maintenance',label:'Necesita mantenimiento'}]} value={row.status} onChange={value=>location(index,'status',value)}/></div></fieldset>)}</>:<p className="text-sm text-mute">Cancelar libera todos los equipos de esta reserva. Solo aplica si todavía no se retiraron.</p>}
  {error?<Aviso tono="error">{error}</Aviso>:null}<SaveActions pending={busy}><Button type="submit" disabled={busy}>{busy?'Guardando…':{checkout:'Confirmar retiro',return:'Confirmar devolución completa',cancel:'Confirmar cancelación'}[action]}</Button></SaveActions>
 </form>;
}

export function InventoryCalendar({month,reservations}:{month:string;reservations:InventoryReservation[]}){
 const [year,m]=month.split('-').map(Number),days=new Date(Date.UTC(year,m,0)).getUTCDate(),offset=(new Date(Date.UTC(year,m-1,1)).getUTCDay()+6)%7;
 return <div className="grid gap-2" aria-label="Calendario mensual de reservas">
  <div className="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">{['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day=><span key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-mute">{day}</span>)}</div>
  <div className="grid grid-cols-1 gap-1 min-[769px]:grid-cols-7">{Array.from({length:offset},(_,index)=><div className="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key={`blank-${index}`}/>)}{Array.from({length:days},(_,index)=>{
   const day=`${month}-${String(index+1).padStart(2,'0')}`,start=opsUtcTime(day+'T00:00'),nextDay=new Date(Date.UTC(year,m-1,index+2)).toISOString().slice(0,10),end=opsUtcTime(nextDay+'T00:00');
   const rows=reservations.filter(r=>r.status!=='cancelled'&&r.starts_at<end&&r.ends_at>start);
   return <div className="grid min-h-16 content-start gap-1 rounded-lg border border-ink-600/60 p-1" key={day} aria-label={day}><time className="text-[11px] tabular-nums text-mute" dateTime={day}>{index+1}</time>{rows.map(r=><div className={`grid gap-0.5 rounded-md border px-1.5 py-1 text-[11px] ${r.status==='checked_out'?'border-warn/40 bg-warn/10 text-warn':r.status==='returned'?'border-ok/40 bg-ok/10 text-ok':'border-fono/30 bg-fono/10 text-fono-light'}`} key={r.id}><b className="break-words">{r.title}</b><small className="text-mute">{r.items.length} equipo(s) · {statusLabels[r.status]}</small></div>)}</div>;
  })}</div>
 </div>;
}
