/**
 * Capa de datos del inventario (dominio OPS, issue #44).
 *
 * Acá viven los tipos reales del API y las funciones puras que hoy usaban los
 * componentes. Sin React y sin JSX: lo consume `inventory-workspace.tsx` y lo
 * consumirá el rediseño v2 (`app/production/*`) sin tocar la vista actual.
 *
 * Fuentes: `GET /api/agency/inventory`, `GET /api/agency/inventory/:id`,
 * `GET /api/agency/inventory-context`, `-categories`, `-locations`,
 * `-reservations` (`backend/inventory-reservations.js`). Los campos opcionales
 * son los que el API devuelve y la vista todavía no muestra (spec #44 §2.8).
 */
import {inventoryCode} from './inventory-label';

export type Person={id:string;name:string;photo_url?:string|null};
export type Category={id:string;name:string;active:boolean;icon?:string|null;created_at?:string};
export type StorageTemplate={
 id:string;name:string;active:boolean;item_count:number;
 responsible_user_id?:string|null;responsible_name?:string|null;responsible_photo_url?:string|null;
 created_at?:string;updated_at?:string;
};
export type InventoryItem={
 id:string;name:string;inventory_code?:string;category:string;category_id:string|null;
 category_name?:string;category_icon?:string|null;category_active?:boolean;
 serial_number:string|null;photo_url?:string|null;value:string;currency:string;status:string;
 storage_shelf:string;storage_row:string;storage_location_id?:string|null;storage_location_name?:string|null;
 storage_location_active?:boolean;location_changed_at?:string|null;
 custodian_user_id:string|null;location_type?:string;
 current_custodian_name?:string;current_custodian_user_id?:string|null;
 production_name?:string;project_name?:string;active_reservation_id?:string|null;
 return_user_name?:string;return_user_id?:string|null;expected_return_at?:string;
 last_verified_at?:string|null;last_verified_by_user_id?:string|null;
 last_verification_result?:'confirmed'|'difference'|'missing'|null;last_verification_differences?:string;
 last_verified_counted_quantity?:number|null;
 last_verifier_name?:string|null;last_verifier_photo_url?:string|null;
 purchase_value?:string|null;purchase_date?:string|null;acquired_on?:string|null;
 depreciation_method?:'none'|'linear'|string;useful_life_months?:number|null;residual_value?:string|null;
 current_value?:string|null;accumulated_depreciation?:string|null;monthly_depreciation?:string|null;
 notes?:string;barcode_payload?:string;
 [key:string]:unknown;
};
export type ItemReference={
 id:string;name:string;inventory_code?:string;
 storage_location_id?:string|null;storage_location_name?:string|null;
 storage_shelf:string;storage_row:string;
};
export type ReservationActors={
 actor_name?:string;actor_photo_url?:string;actor_verified?:boolean;actor_user_id?:string;
 checkout_actor_name?:string;checkout_actor_photo_url?:string;checkout_actor_verified?:boolean;checkout_actor_user_id?:string;
 return_actor_name?:string;return_actor_photo_url?:string;return_actor_verified?:boolean;return_actor_user_id?:string;
};
export type InventoryReservationStatus='reserved'|'checked_out'|'returned'|'cancelled';
export type InventoryReservation=ReservationActors&{
 id:string;title:string;project_id:string;project_name:string;
 starts_at:string;ends_at:string;status:InventoryReservationStatus;
 created_by_user_id:string;return_user_id:string;return_user_name:string;
 custodian_user_id:string|null;custodian_name:string|null;
 responsible_members:Person[];items:ItemReference[];notes:string;version:number;
 checkout_note?:string;return_note?:string;
 checked_out_at?:string|null;returned_at?:string|null;cancelled_at?:string|null;
 checked_out_by_user_id?:string|null;returned_by_user_id?:string|null;
 created_at?:string;updated_at?:string;
};
export type Context={user_id:string;role:string;time_zone:string;can_manage:boolean;can_reserve:boolean;members:Person[];projects:Person[]};
export type InventoryVerification={
 id:string;result:'confirmed'|'difference'|'missing';differences?:string;note?:string;
 verified_at:string;verified_by_user_id?:string;
 counted_quantity?:number;adjusted?:boolean;
 before_state?:Record<string,unknown>|null;after_state?:Record<string,unknown>|null;
 verifier_name?:string;verifier_photo_url?:string|null;
};
export type InventoryMaintenance={
 id:string;inventory_id:string;inventory_code?:string;inventory_name?:string;
 maintenance_date:string;kind:string;description?:string|null;cost:string|number;currency:string;
 responsible_user_id?:string|null;responsible_name?:string|null;responsible_photo_url?:string|null;
 voided_at?:string|null;voided_by_user_id?:string|null;voided_by_name?:string|null;
 created_by_user_id?:string|null;created_at?:string;updated_at?:string;
};
export type InventoryTrace={
 id:string;event_type:string;event_at:string;actor_name?:string;actor_photo_url?:string;
 /** Payload real del API (`context` jsonb). Trae código, nombre, estado, resultado, notas, etc. */
 context?:Record<string,unknown>|null;
 /** @deprecated el API nunca devolvió `event_data`; se mantiene hasta el rediseño de la ficha. */
 event_data?:Record<string,unknown>;
};

export const statusLabels:Record<InventoryReservationStatus,string>={
 reserved:'Reservado',
 checked_out:'Retirado',
 returned:'Devuelto',
 cancelled:'Cancelado',
};
export const itemStatuses=[{value:'available',label:'Disponible'},{value:'maintenance',label:'Mantenimiento'},{value:'retired',label:'Dado de baja'}];
export const depreciationMethods=[{value:'none',label:'Sin depreciación'},{value:'linear',label:'Lineal'}];
export const depreciationMethodLabel=(method?:string|null)=>method==='linear'?'Lineal':'Sin depreciación';
const equipmentStatusLabels:Record<string,string>={available:'Disponible',in_use:'En uso',maintenance:'Mantenimiento',retired:'Dado de baja'};
export const equipmentStatusLabel=(status:string)=>equipmentStatusLabels[status]||status;
const verificationLabels:Record<string,string>={confirmed:'Confirmado',difference:'Con diferencias',missing:'No encontrado'};
export const verificationLabel=(result?:InventoryItem['last_verification_result'])=>verificationLabels[result||'']||'Sin control';
const traceLabels:Record<string,string>={
 'inventory.created':'Equipo registrado','inventory.updated':'Ficha actualizada','stock.verified':'Verificación física',
 'reservation.reserved':'Reserva creada','reservation.updated':'Reserva actualizada','reservation.cancelled':'Reserva cancelada',
 'loan.checked_out':'Retiro registrado','loan.checked_in':'Devolución registrada','location.changed':'Ubicación actualizada',
};
export const traceLabel=(event:string)=>traceLabels[event]||event.replace(/[._]/g,' ');

export const itemCode=(item:Pick<InventoryItem,'id'|'inventory_code'>)=>item.inventory_code||inventoryCode(item.id);

export function inventoryLocation(item:InventoryItem){
 if(item.location_type==='checked_out')return `Con ${item.current_custodian_name||'custodio registrado'} · ${item.production_name||'Producción'}${item.project_name?` · ${item.project_name}`:''}`;
 if(item.location_type==='legacy_in_use')return `En uso · ${item.current_custodian_name||'Custodio sin registrar'} · sin reserva vinculada`;
 return item.storage_shelf?`${item.storage_shelf}${item.storage_row?` · fila ${item.storage_row}`:''}`:'Ubicación sin registrar';
}
/** El API habilita la edición de la reserva a quien la gestiona (inventory.manage o su autor). */
export function inventoryCanManageReservation(context:Pick<Context,'user_id'|'role'|'can_manage'|'can_reserve'>,row:InventoryReservation){return context.can_manage||context.can_reserve&&String(row.created_by_user_id)===String(context.user_id);}
/** El API habilita la devolución con inventory.book a quien gestiona la reserva y al encargado de devolver o custodio. */
export function inventoryCanReturn(context:Pick<Context,'user_id'|'role'|'can_manage'|'can_reserve'>,row:InventoryReservation){return context.can_reserve&&(inventoryCanManageReservation(context,row)||[row.return_user_id,row.custodian_user_id].some(id=>String(id)===String(context.user_id)));}

/** Texto sobre el que busca el catálogo: código, nombre, serie, categoría y ubicación. */
export function inventorySearchText(item:InventoryItem){
 return `${itemCode(item)} ${item.name} ${item.serial_number||''} ${item.category_name||item.category} ${inventoryLocation(item)}`.toLowerCase();
}
export function filterInventoryItems(items:InventoryItem[],filters:{search?:string;categoryId?:string}={}){
 const search=(filters.search||'').toLowerCase(),categoryId=filters.categoryId||'';
 return items.filter(item=>(!categoryId||String(item.category_id)===categoryId)&&inventorySearchText(item).includes(search));
}
export type InventoryTotals={equipmentCount:number;currencyTotals:{currency:string;total:number}[];inUse:number;maintenance:number;available:number};
/** Totales por moneda (valor de catálogo) y conteo por estado, sin alterar el orden del API. */
export function inventoryTotals(items:InventoryItem[]):InventoryTotals{
 const totals=new Map<string,number>();
 let inUse=0,maintenance=0,available=0;
 for(const item of items){
  const value=Number(item.value);
  if(Number.isFinite(value)&&value>0)totals.set(item.currency,totals.has(item.currency)?totals.get(item.currency)!+value:value);
  if(item.status==='in_use'||item.location_type==='checked_out')inUse+=1;
  else if(item.status==='maintenance')maintenance+=1;
  else if(item.status==='available')available+=1;
 }
 return {equipmentCount:items.length,currencyTotals:[...totals].map(([currency,total])=>({currency,total})),inUse,maintenance,available};
}

export type PipelineColumn={key:string;title:string;readOnly:boolean;locationId:string|null;shelf:string;responsibleName?:string|null;responsiblePhoto?:string|null;rows:InventoryItem[]};
/**
 * Columnas del pipeline de ubicaciones: una por lugar (todas las activas, y las
 * archivadas sólo si tienen equipos) más las de sólo lectura para los retirados
 * (agrupados por custodio) y los equipos `legacy_in_use`; "Sin ubicación" existe
 * siempre para poder devolver equipos desde una columna.
 */
export function buildInventoryPipelineColumns(items:InventoryItem[],locations:StorageTemplate[]):PipelineColumn[]{
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
   ensure(`loc-${item.storage_location_id}`,{key:`loc-${item.storage_location_id}`,title,readOnly:false,locationId:String(item.storage_location_id),shelf:title,responsibleName:location?.responsible_name||null,responsiblePhoto:location?.responsible_photo_url??null}).rows.push(item);
  }else if(item.storage_shelf){
   const matching=locations.find(candidate=>candidate.name===item.storage_shelf);
   if(matching)ensure(`loc-${matching.id}`,{key:`loc-${matching.id}`,title:matching.name,readOnly:false,locationId:String(matching.id),shelf:matching.name,responsibleName:matching.responsible_name||null,responsiblePhoto:matching.responsible_photo_url??null}).rows.push(item);
   else ensure(`shelf-${item.storage_shelf}`,{key:`shelf-${item.storage_shelf}`,title:item.storage_shelf,readOnly:false,locationId:null,shelf:item.storage_shelf}).rows.push(item);
  }else{
   ensure('sin-ubicacion',{key:'sin-ubicacion',title:'Sin ubicación',readOnly:false,locationId:null,shelf:''}).rows.push(item);
  }
 }
 // Every active location appears even with no equipment; archived ones only when occupied.
 for(const location of locations.filter(candidate=>candidate.active||candidate.item_count>0))ensure(`loc-${location.id}`,{key:`loc-${location.id}`,title:location.name,readOnly:false,locationId:String(location.id),shelf:location.name,responsibleName:location.responsible_name||null,responsiblePhoto:location.responsible_photo_url??null});
 // The unassigned column always exists so items can move back out of a location.
 ensure('sin-ubicacion',{key:'sin-ubicacion',title:'Sin ubicación',readOnly:false,locationId:null,shelf:''});
 return [...map.values()].sort((a,b)=>{if(a.readOnly!==b.readOnly)return a.readOnly?-1:1;if(a.key==='sin-ubicacion')return 1;if(b.key==='sin-ubicacion')return -1;return a.title.localeCompare(b.title,'es');});
}
/** Columna destino de un drop: por la columna o por la tarjeta que contiene el equipo. */
export function pipelineDropColumn(columns:PipelineColumn[],items:InventoryItem[],overId:string):PipelineColumn|null{
 const direct=columns.find(candidate=>candidate.key===overId);
 if(direct)return direct;
 const item=items.find(candidate=>String(candidate.id)===overId);
 if(!item)return null;
 return columns.find(candidate=>candidate.rows.some(row=>String(row.id)===String(item.id)))||null;
}

const round2=(value:number)=>Math.round(value*100)/100;
const numberOrNull=(value:unknown):number|null=>{
 if(value===null||value===undefined||value==='')return null;
 const parsed=Number(value);
 return Number.isFinite(parsed)?parsed:null;
};
const dateOnlyOrNull=(value:unknown):string|null=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0,10))?value.slice(0,10):null;
/** Meses completos entre dos fechas civiles (misma semántica que `age()` de Postgres). */
export function depreciationMonthsElapsed(purchaseDate:string,to:Date):number{
 const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(purchaseDate);
 if(!match)return 0;
 const [year,month,day]=purchaseDate.split('-').map(Number);
 let months=(to.getUTCFullYear()-year)*12+(to.getUTCMonth()-(month-1));
 if(to.getUTCDate()<day)months-=1;
 return Math.max(0,months);
}
export type DepreciationFacts={
 method:'none'|'linear';hasValue:boolean;hasDepreciation:boolean;
 purchaseValue:number|null;purchaseDate:string|null;usefulLifeMonths:number|null;residualValue:number;
 monthsElapsed:number|null;currentValue:number|null;accumulatedDepreciation:number|null;monthlyDepreciation:number|null;
 progressPercent:number|null;
};
/**
 * Valor y depreciación de una unidad. Espeja la fórmula lineal del API
 * (`backend/inventory-reservations.js:68-79`, calculada al leer) y **prefiere
 * los valores que ya devuelve el API**; el cálculo local es el respaldo para
 * datos incompletos y la base del rediseño (spec #44 §2.8/§2.11).
 */
export function depreciationFacts(item:InventoryItem,today:Date=new Date()):DepreciationFacts{
 const method=item.depreciation_method==='linear'?'linear':'none';
 const purchaseValue=numberOrNull(item.purchase_value);
 const purchaseDate=dateOnlyOrNull(item.purchase_date);
 const usefulLifeMonths=numberOrNull(item.useful_life_months);
 const residualValue=numberOrNull(item.residual_value)??0;
 const hasDepreciation=method==='linear'&&purchaseValue!==null&&purchaseDate!==null&&usefulLifeMonths!==null&&usefulLifeMonths>0;
 const monthsElapsed=hasDepreciation&&purchaseDate!==null?depreciationMonthsElapsed(purchaseDate,today):null;
 let currentValue=purchaseValue,accumulatedDepreciation=purchaseValue===null?null:0,monthlyDepreciation=numberOrNull(item.monthly_depreciation);
 let progressPercent:number|null=null;
 if(purchaseValue!==null&&hasDepreciation&&usefulLifeMonths!==null&&monthsElapsed!==null){
  const life=usefulLifeMonths,elapsed=Math.min(monthsElapsed,life);
  monthlyDepreciation=round2((purchaseValue-residualValue)/life);
  accumulatedDepreciation=Math.min(round2((purchaseValue-residualValue)*elapsed/life),purchaseValue-residualValue);
  currentValue=round2(purchaseValue-accumulatedDepreciation);
  progressPercent=Math.min(100,round2(elapsed/life*100));
 }
 return {
  method,hasValue:purchaseValue!==null,hasDepreciation,
  purchaseValue,purchaseDate,usefulLifeMonths,residualValue,
  monthsElapsed,
  currentValue:numberOrNull(item.current_value)??currentValue,
  accumulatedDepreciation:numberOrNull(item.accumulated_depreciation)??accumulatedDepreciation,
  monthlyDepreciation:numberOrNull(item.monthly_depreciation)??monthlyDepreciation,
  progressPercent,
 };
}
export type DepreciationInput={depreciation_method?:string|null;purchase_value?:string|null;purchase_date?:string|null;residual_value?:string|null;useful_life_months?:string|number|null};
/** Espeja las reglas del API antes de llamarlo; un solo mensaje por regla. */
export function depreciationValidation(values:DepreciationInput):{ok:true}|{ok:false;error:string}{
 const linear=values.depreciation_method==='linear',purchase=Number(values.purchase_value||0),residual=Number(values.residual_value||0);
 if(!values.purchase_value&&residual>0)return {ok:false,error:'Cargá primero el valor de compra para registrar un valor residual.'};
 if(values.purchase_value&&Math.round(residual*100)>Math.round(purchase*100))return {ok:false,error:'El valor residual no puede superar el valor de compra.'};
 if(linear&&!values.purchase_value)return {ok:false,error:'Para depreciación lineal indicá el valor de compra.'};
 if(linear&&!values.purchase_date)return {ok:false,error:'Para depreciación lineal indicá la fecha de compra.'};
 if(linear){
  const life=Number(values.useful_life_months);
  if(!Number.isInteger(life)||life<1||life>600)return {ok:false,error:'La vida útil debe estar entre 1 y 600 meses.'};
 }
 return {ok:true};
}
