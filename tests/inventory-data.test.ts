import assert from 'node:assert/strict';
import {opsLocalTime,opsMonthRange,opsUtcTime} from '../app/ops-time';
import {
 buildInventoryPipelineColumns,depreciationFacts,depreciationMethodLabel,depreciationValidation,equipmentStatusLabel,
 filterInventoryItems,inventoryCanManageReservation,inventoryCanReturn,inventoryLocation,inventorySearchText,inventoryTotals,
 itemCode,pipelineDropColumn,statusLabels,traceLabel,verificationLabel,
 type Context,type InventoryItem,type InventoryReservation,type StorageTemplate,
} from '../app/inventory-data';

// --- Reloj operativo: hora civil de Asunción ↔ instante UTC (24 h, sin depender del navegador).
assert.equal(opsUtcTime('2026-09-10T09:00'),'2026-09-10T12:00:00.000Z','septiembre opera en UTC-3');
assert.equal(opsLocalTime('2026-10-01T02:59:00Z'),'2026-09-30T23:59','la medianoche UTC cae el día anterior en Asunción');
assert.deepEqual(opsMonthRange('2026-12'),{from:'2026-12-01T03:00:00.000Z',to:'2027-01-01T03:00:00.000Z'},'el mes cierra en el primer día del mes siguiente');
assert.throws(()=>opsUtcTime('2026-02-30T09:00'),/Fecha inválida|no existe/,'una fecha civil inexistente no se convierte');

// --- Identidad del equipo.
const base:InventoryItem={id:'1',name:'Memoria SD',category:'Cámara',category_id:'1',serial_number:'SD-4821',value:'1000',currency:'PYG',status:'available',storage_shelf:'Estante A',storage_row:'2',custodian_user_id:null,location_type:'storage'};
assert.equal(itemCode(base),'SC-000001','sin código del API se deriva el código imprimible');
assert.equal(itemCode({...base,inventory_code:'SC-000999'}),'SC-000999','el código del API manda');
assert.equal(inventoryLocation(base),'Estante A · fila 2');
assert.equal(inventoryLocation({...base,storage_row:''}),'Estante A');
assert.match(inventoryLocation({...base,location_type:'checked_out',current_custodian_name:'Sonido',production_name:'Rodaje',project_name:'Campaña'}),/Con Sonido · Rodaje · Campaña/);
assert.match(inventoryLocation({...base,location_type:'legacy_in_use'}),/En uso · Custodio sin registrar/);
assert.match(inventoryLocation({...base,location_type:'legacy_in_use',current_custodian_name:'Ana'}),/En uso · Ana/);
assert.match(inventoryLocation({...base,storage_shelf:'',storage_row:''}),/sin registrar/);

// --- Permisos de reserva (espejo del API).
const reservation:InventoryReservation={id:'30',title:'Rodaje',project_id:'20',project_name:'Campaña',starts_at:'2026-09-10T12:00:00.000Z',ends_at:'2026-09-10T15:00:00.000Z',status:'reserved',created_by_user_id:'10',return_user_id:'11',return_user_name:'Sonido',custodian_user_id:null,custodian_name:null,responsible_members:[],items:[],notes:'',version:0};
const context:Context={user_id:'10',role:'production',time_zone:'America/Asuncion',can_manage:false,can_reserve:true,members:[],projects:[]};
assert.equal(inventoryCanManageReservation({...context,user_id:'11'},reservation),false,'otro rol sin manage no edita la reserva ajena');
assert.equal(inventoryCanManageReservation({...context,can_manage:true,user_id:'11'},reservation),true);
assert.equal(inventoryCanManageReservation(context,reservation),true,'el autor con inventory.book gestiona su reserva');
assert.equal(inventoryCanReturn(context,reservation),true,'el encargado de devolver ve la devolución');
assert.equal(inventoryCanReturn({...context,user_id:'12'},{...reservation,custodian_user_id:'12'}),true,'el custodio real también puede devolver');
for(const role of ['viewer','editor','finance'])assert.equal(inventoryCanReturn({...context,user_id:'11',role,can_reserve:false},reservation),false,`${role} sin inventory.book no devuelve`);
assert.equal(inventoryCanReturn({...context,user_id:'99'},reservation),false,'quien no participa no puede devolver');

// --- Búsqueda y filtros del catálogo.
const items:InventoryItem[]=[base,{...base,id:'2',name:'DJI Mic',category:'Audio',category_id:'2',serial_number:null,value:'100',currency:'USD',storage_shelf:'Estante B',storage_row:'1'}];
assert.match(inventorySearchText(base),/sc-000001 memoria sd sd-4821 cámara estante a · fila 2/);
assert.equal(filterInventoryItems(items,{search:'mic'}).length,1,'busca por nombre');
assert.equal(filterInventoryItems(items,{search:'SD-4821'})[0].id,'1','busca por serie');
assert.equal(filterInventoryItems(items,{search:'sc-000002'})[0].id,'2','busca por código');
assert.equal(filterInventoryItems(items,{search:'estante b'})[0].id,'2','busca por ubicación');
assert.equal(filterInventoryItems(items,{search:'memoria',categoryId:'2'}).length,0,'los filtros se combinan');
assert.equal(filterInventoryItems(items,{categoryId:'2'})[0].id,'2');
assert.equal(filterInventoryItems(items).length,2,'sin filtros no recorta');
assert.equal(filterInventoryItems(items,{search:''}).length,2,'un buscador vacío no oculta el catálogo');
// El buscador es literal (`includes`); un doble espacio se busca tal cual.
assert.equal(filterInventoryItems(items,{search:'  '}).length,1,'el texto se compara literal, sin normalizar espacios');

// --- KPIs del catálogo: monedas separadas y estados sin doble conteo.
const totals=inventoryTotals([
 base,
 {...base,id:'2',value:'100',currency:'USD',status:'available'},
 {...base,id:'3',value:'0',currency:'PYG',status:'maintenance'},
 {...base,id:'4',value:'-5',currency:'PYG',status:'retired'},
 {...base,id:'5',value:'abc',currency:'PYG',status:'in_use'},
 {...base,id:'6',value:'10',currency:'PYG',location_type:'checked_out'},
]);
assert.deepEqual(totals.currencyTotals,[{currency:'PYG',total:1010},{currency:'USD',total:100}],'suma por moneda e ignora valores inválidos');
assert.equal(totals.equipmentCount,6);
assert.equal(totals.inUse,2,'en uso cuenta estado y retiro activo');
assert.equal(totals.maintenance,1);
assert.equal(totals.available,2);
assert.deepEqual(inventoryTotals([]).currencyTotals,[],'sin equipos no hay monedas');

// --- Pipeline de ubicaciones: columnas activas, archivadas ocupadas y columnas de sólo lectura.
const locations:StorageTemplate[]=[
 {id:'a',name:'Estante A',active:true,item_count:1},
 {id:'b',name:'Estante B',active:true,item_count:0},
 {id:'old',name:'Depósito anterior',active:false,item_count:2,responsible_name:'Ana',responsible_photo_url:'https://cdn.test/ana.webp'},
 {id:'empty-old',name:'Depósito vacío',active:false,item_count:0},
];
const pipelineItems:InventoryItem[]=[
 {...base,storage_location_id:'a',storage_location_name:'Estante A',storage_shelf:'Estante A'},
 {...base,id:'2',storage_location_id:null,storage_shelf:'',storage_row:''},
 {...base,id:'3',location_type:'checked_out',current_custodian_name:'Sonido'},
 {...base,id:'4',location_type:'legacy_in_use',current_custodian_name:'Ana',storage_location_id:null},
 {...base,id:'5',storage_location_id:'old',storage_location_name:'Depósito anterior',storage_shelf:'Depósito anterior'},
];
const columns=buildInventoryPipelineColumns(pipelineItems,locations);
assert.deepEqual(columns.map(column=>column.key),['cust-Sonido','legacy-in-use','loc-old','loc-a','loc-b','sin-ubicacion'],'primero las de sólo lectura, luego las ubicaciones por nombre y al final sin ubicación');
assert.equal(columns.find(column=>column.key==='cust-Sonido')?.rows.length,1);
assert.equal(columns.find(column=>column.key==='cust-Sonido')?.readOnly,true);
assert(columns.find(column=>column.key==='loc-b')?.rows.length===0,'una ubicación activa vacía sigue apareciendo');
assert.equal(columns.find(column=>column.key==='loc-old')?.responsibleName,'Ana','la ubicación trae su responsable');
assert.equal(columns.find(column=>column.key==='loc-old')?.responsiblePhoto,'https://cdn.test/ana.webp');
assert(!columns.some(column=>column.key==='loc-empty-old'),'una ubicación archivada sin equipos no se dibuja');
assert.equal(columns.at(-1)?.key,'sin-ubicacion','sin ubicación siempre existe para poder devolver equipos');
assert.equal(columns.at(-1)?.rows.length,1);
// Un equipo guardado por nombre en un lugar del catálogo cae en la columna del lugar, no en una suelta.
const byName=buildInventoryPipelineColumns([{...base,id:'7',storage_location_id:null,storage_shelf:'Estante B',storage_row:''}],locations);
assert.deepEqual(byName.find(column=>column.key==='loc-b')?.rows.map(row=>row.id),['7']);
// Un estante libre que no está en el catálogo mantiene su columna propia.
const shelf=buildInventoryPipelineColumns([{...base,id:'8',storage_location_id:null,storage_shelf:'Rack Z',storage_row:''}],[]);
assert.deepEqual(shelf.map(column=>column.key),['shelf-Rack Z','sin-ubicacion']);
// El drop se resuelve por columna o por la tarjeta que la contiene.
assert.equal(pipelineDropColumn(columns,pipelineItems,'loc-a')?.key,'loc-a');
assert.equal(pipelineDropColumn(columns,pipelineItems,'5')?.key,'loc-old','soltar sobre una tarjeta resuelve su columna');
assert.equal(pipelineDropColumn(columns,pipelineItems,'nope'),null);

// --- Valor y depreciación (espeja la fórmula lineal del API).
const today=new Date('2026-09-22T12:00:00Z');
assert.deepEqual(depreciationValidation({depreciation_method:'none',purchase_value:'',residual_value:'0'}),{ok:true},'sin valor de compra la ficha es válida');
assert.equal(depreciationValidation({depreciation_method:'none',purchase_value:'',residual_value:'10'}).ok,false,'residual sin compra se rechaza');
assert.equal((depreciationValidation({depreciation_method:'none',purchase_value:'100',residual_value:'101'}) as {error:string}).error,'El valor residual no puede superar el valor de compra.');
assert.equal((depreciationValidation({depreciation_method:'linear',purchase_value:'',residual_value:'0'}) as {error:string}).error,'Para depreciación lineal indicá el valor de compra.');
assert.equal((depreciationValidation({depreciation_method:'linear',purchase_value:'100',residual_value:'0'}) as {error:string}).error,'Para depreciación lineal indicá la fecha de compra.');
assert.equal((depreciationValidation({depreciation_method:'linear',purchase_value:'100',purchase_date:'2026-01-10',residual_value:'0',useful_life_months:'0'}) as {error:string}).error,'La vida útil debe estar entre 1 y 600 meses.');
assert.deepEqual(depreciationValidation({depreciation_method:'linear',purchase_value:'100',purchase_date:'2026-01-10',residual_value:'0',useful_life_months:'600'}),{ok:true});

const linear:InventoryItem={...base,purchase_value:'1200',purchase_date:'2026-01-10',depreciation_method:'linear',useful_life_months:24,residual_value:'0'};
const facts=depreciationFacts(linear,today);
assert.equal(facts.hasValue,true);
assert.equal(facts.hasDepreciation,true);
assert.equal(facts.monthsElapsed,8,'enero 10 → septiembre 22 son 8 meses completos');
assert.equal(facts.monthlyDepreciation,50,'(1200-0)/24');
assert.equal(facts.accumulatedDepreciation,400,'8 de 24 meses');
assert.equal(facts.currentValue,800);
assert.equal(facts.progressPercent,33.33);
// El mes parcial no se redondea hacia arriba.
assert.equal(depreciationFacts(linear,new Date('2026-09-09T12:00:00Z')).monthsElapsed,7);
assert.equal(depreciationFacts(linear,new Date('2026-10-10T12:00:00Z')).monthsElapsed,9);
// Vida útil cumplida: el valor se clava en el residual y la barra llega al 100 %.
const finished=depreciationFacts(linear,new Date('2028-06-10T12:00:00Z'));
assert.equal(finished.accumulatedDepreciation,1200);
assert.equal(finished.currentValue,0);
assert.equal(finished.progressPercent,100);
// Residual: la depreciación nunca baja del valor residual.
const withResidual=depreciationFacts({...linear,residual_value:'200'},new Date('2030-06-10T12:00:00Z'));
assert.equal(withResidual.accumulatedDepreciation,1000);
assert.equal(withResidual.currentValue,200);
assert.equal(withResidual.monthlyDepreciation,41.67,'(1200-200)/24 redondeado a 2 decimales');
// Compra en el futuro: todavía no hay depreciación acumulada.
const future=depreciationFacts(linear,new Date('2025-12-01T12:00:00Z'));
assert.equal(future.monthsElapsed,0);
assert.equal(future.accumulatedDepreciation,0);
assert.equal(future.currentValue,1200);
assert.equal(future.progressPercent,0);
// Sin depreciación: el valor actual es el de compra y no hay barra.
const none=depreciationFacts({...linear,depreciation_method:'none'},today);
assert.equal(none.hasDepreciation,false);
assert.equal(none.currentValue,1200);
assert.equal(none.accumulatedDepreciation,0);
assert.equal(none.progressPercent,null);
assert.equal(none.monthsElapsed,null);
// Sin valor de compra no hay nada que calcular.
const empty=depreciationFacts({...base,purchase_value:null},today);
assert.deepEqual({hasValue:empty.hasValue,current:empty.currentValue,accumulated:empty.accumulatedDepreciation,progress:empty.progressPercent},{hasValue:false,current:null,accumulated:null,progress:null});
// Los valores que ya devuelve el API mandan sobre el cálculo local.
const fromApi=depreciationFacts({...linear,current_value:'999',accumulated_depreciation:'111',monthly_depreciation:'7.5'},today);
assert.equal(fromApi.currentValue,999);
assert.equal(fromApi.accumulatedDepreciation,111);
assert.equal(fromApi.monthlyDepreciation,7.5);

// --- Rótulos compartidos (un solo diccionario por tipo).
assert.equal(verificationLabel('confirmed'),'Confirmado');
assert.equal(verificationLabel('difference'),'Con diferencias');
assert.equal(verificationLabel('missing'),'No encontrado');
assert.equal(verificationLabel(null),'Sin control');
assert.equal(equipmentStatusLabel('in_use'),'En uso');
assert.equal(equipmentStatusLabel('otro'),'otro');
assert.equal(statusLabels.checked_out,'Retirado');
assert.equal(depreciationMethodLabel('linear'),'Lineal');
assert.equal(depreciationMethodLabel('none'),'Sin depreciación');
assert.equal(traceLabel('loan.checked_in'),'Devolución registrada');
assert.equal(traceLabel('location.changed'),'Ubicación actualizada');
assert.equal(traceLabel('custom.event'),'custom event');

console.log('PASS: inventario — reloj operativo, identidad, permisos, filtros, KPIs, pipeline y valor/depreciación (incluye residual, vida útil cumplida y datos del API).');
