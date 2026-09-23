import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Los módulos de la app se cargan con `require` (tsx) para poder ignorar las
// hojas de estilo, igual que el resto de los tests de la suite.
require.extensions['.css']=()=>{};
const {buildInventoryPipelineColumns,pipelineDropColumn}=require('../app/inventory-data') as typeof import('../app/inventory-data');
const {statuses}=require('../app/production-board') as typeof import('../app/production-board');
type InventoryItem=import('../app/inventory-data').InventoryItem;
type StorageTemplate=import('../app/inventory-data').StorageTemplate;

// Drag & drop de la vertical (orden del dueño, #44): el pipeline de inventario
// no registraba ningún droppable (el drop nunca resolvía) y las tarjetas del
// tablero sólo se arrastraban desde el handle. Este test fija la matriz de
// transiciones y el wiring que la sostiene.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const inventory=read('app/inventory-workspace.tsx');
const board=read('app/production-board.tsx');
const productionSection=read('app/sections/produccion.tsx');
const shell=read('app/scale-workspace.tsx');

const location=(id:string,name:string):StorageTemplate=>({id,name,active:true,responsible_user_id:null,item_count:0});
const item=(id:string,name:string,overrides:Partial<InventoryItem>={}):InventoryItem=>({
 id,name,status:'available',category:'Cámaras',category_name:'Cámaras',serial_number:'SN',value:'1000',currency:'PYG',
 storage_location_id:null,storage_shelf:'',inventory_code:`INV-${id}`,location_type:'storage',...overrides,
} as unknown as InventoryItem);

const locations=[location('1','Depósito central'),location('2','Estudio A')];
const items=[
 item('10','Cámara A',{storage_location_id:'1'}),
 item('11','Lente B',{storage_shelf:'Estante 3'}),
 item('12','Monitor C'),
];

// ── Matriz de transiciones del pipeline: toda caída resuelve una columna.
const columns=buildInventoryPipelineColumns(items,locations);
assert(columns.length>=4,'hay una columna por ubicación más Sin ubicación');
for(const column of columns){
 assert.equal(pipelineDropColumn(columns,items,column.key)?.key,column.key,`soltar sobre la columna ${column.key} la resuelve`);
}
assert.equal(pipelineDropColumn(columns,items,'10')?.key,'loc-1','soltar sobre una tarjeta resuelve la columna que la contiene');
assert.equal(pipelineDropColumn(columns,items,'11')?.key,'shelf-Estante 3','una tarjeta en estante resuelve su columna de estante');
assert.equal(pipelineDropColumn(columns,items,'12')?.key,'sin-ubicacion','un equipo sin ubicación cae en Sin ubicación');
assert.equal(pipelineDropColumn(columns,items,'999'),null,'un id desconocido no inventa destino');
const checkedOut=buildInventoryPipelineColumns([item('20','En rodaje',{status:'in_use',location_type:'checked_out',current_custodian_name:'Ana'})],locations);
const custody=checkedOut.find(column=>column.readOnly);
assert(custody,'la columna de custodia es de solo lectura');
assert.equal(pipelineDropColumn(checkedOut,[],custody!.key)?.readOnly,true,'soltar en una columna de solo lectura resuelve una columna que no acepta el movimiento');

// ── Wiring del pipeline: droppable por columna (el bug), sensores y optimismo.
assert.match(inventory,/useDroppable\(\{id:column\.key,disabled:column\.readOnly\}\)/,'cada columna del pipeline es un destino de arrastre y las de solo lectura no aceptan drops');
assert.match(inventory,/droppable\.setNodeRef/,'la columna registra su nodo como droppable');
assert.match(inventory,/droppable\.isOver\?'border-fono bg-fono\/10'/,'la columna destino se resalta al pasar por encima');
assert.match(inventory,/sensors=\{sensors\} collisionDetection=\{collisionDetection\}/,'el pipeline usa sensores explícitos y detección mixta');
assert.match(inventory,/useSensor\(MouseSensor,\{activationConstraint:\{distance:6\}\}\)/,'el mouse arrastra con 6 px de margen (no roba el clic)');
assert.match(inventory,/useSensor\(TouchSensor,\{activationConstraint:\{delay:250,tolerance:8\}\}\)/,'el touch arrastra con pulsación sostenida (no pelea con el scroll)');
assert.match(inventory,/useSensor\(KeyboardSensor\)/,'el teclado puede mover piezas');
assert.match(inventory,/const collisionDetection:CollisionDetection=args=>\{const pointer=pointerWithin\(args\);return pointer\.length\?pointer:rectIntersection\(args\);\}/,'pointerWithin con respaldo rectIntersection para el teclado');
assert.match(inventory,/const column=pipelineDropColumn\(columns,items,over\)/,'el drop resuelve la columna con la función pura del dominio');
// Optimista con reversión: la tarjeta cambia de columna ya y vuelve si el API falla.
assert.match(inventory,/const previous=\{locationId:item\.storage_location_id\?\?null,shelf:item\.storage_shelf\};/,'el movimiento guarda la ubicación previa');
assert.match(inventory,/onMoveLocally\(itemId,target\.locationId,target\.shelf\)/,'el movimiento se aplica de forma optimista');
assert.match(inventory,/catch\(reason\)\{onMoveLocally\(itemId,previous\.locationId,previous\.shelf\);setMoveError\(errorMessage\(reason\)\);\}/,'si el API falla la tarjeta vuelve y se avisa');
assert.match(inventory,/if\(target\.readOnly\)return;/,'soltar en una columna de solo lectura no dispara el PATCH');
assert.match(inventory,/await api\(`\/api\/agency\/inventory\/\$\{itemId\}`,/,'el movimiento persiste contra el endpoint de inventario');
assert.match(inventory,/onMoved\(\)/,'el movimiento refresca el catálogo tras soltar');
// La tarjeta entera es arrastrable y el ⋮⋮ es sólo la señal visual.
assert.match(inventory,/<article ref=\{draggable\.setNodeRef\} \{\.\.\.draggable\.listeners\} \{\.\.\.draggable\.attributes\}/,'la tarjeta del pipeline se arrastra desde cualquier punto');
assert.match(inventory,/const disabled=!canManage\|\|item\.location_type==='checked_out';/,'sin permiso o en préstamo la tarjeta no se arrastra');
assert.match(inventory,/<span className="select-none text-mute" role="img" aria-label=\{`Mover \$\{item\.name\}`\} title=\{`Mover \$\{item\.name\}`\}>⋮⋮<\/span>/,'el ⋮⋮ del pipeline se anuncia como señal visual, no como un segundo control');
assert.doesNotMatch(inventory,/style=\{draggable\.transform/,'la tarjeta no se duplica: el arrastre lo dibuja el DragOverlay');
assert.match(inventory,/onMoveLocally=\{moveItemLocally\}/,'el panel cablea el movimiento optimista del catálogo');

// ── Tablero de Producción: las 7 etapas son destino y la transición se resuelve
//    por columna o por tarjeta (la lógica vive en el shell, se verifica acá).
assert.equal(statuses.length,7,'el diccionario tiene las siete etapas');
assert.match(board,/useDroppable\(\{ id: `status-\$\{status\.id\}` \}\)/,'cada etapa del tablero es destino de arrastre');
assert.match(productionSection,/statuses\.map\(\(status/,'el tablero renderiza las siete etapas, sin filtrar destinos');
assert.match(productionSection,/<DndContext sensors=\{sensors\}/,'el tablero usa sensores explícitos');
assert.match(productionSection,/useSensor\(MouseSensor,\{activationConstraint:\{distance:6\}\}\)/,'mouse con margen para no robar el clic');
assert.match(productionSection,/useSensor\(TouchSensor,\{activationConstraint:\{delay:250,tolerance:8\}\}\)/,'touch con pulsación sostenida');
assert.match(productionSection,/useSensor\(KeyboardSensor\)/,'teclado soportado');
assert.match(board,/\{\.\.\.draggable\.listeners\}\s*\{\.\.\.draggable\.attributes\}/,'la tarjeta del tablero se arrastra desde cualquier punto');
assert.match(board,/const canMove=roleCan\(role,'work-orders\.edit'\);/,'arrastrar depende de la capacidad de editar piezas');
assert.match(board,/useDraggable\(\{ id: order\.id,disabled:!canMove \}\)/,'sin permiso la tarjeta no se arrastra');
assert.match(board,/cursor-grab/,'la tarjeta arrastrable lo insinúa con el cursor');
assert.doesNotMatch(board,/translate3d/,'la tarjeta no se duplica con el DragOverlay');
// Shell (no se toca desde OPS): la caída resuelve estado, aplica optimista y revierte.
assert.match(shell,/if \(!target\.startsWith\("status-"\)\) \{/,'soltar sobre una tarjeta resuelve por etapa');
assert.match(shell,/const status = target\.replace\("status-", ""\) as Status;/,'el id de columna se traduce al estado real');
assert.match(shell,/if \(!current \|\| current\.status === status\) return;/,'soltar en la misma etapa no dispara el PATCH');
assert.match(shell,/items\.map\(\(order\) => \(order\.id === id \? \{ \.\.\.order, status \} : order\)\)/,'la actualización optimista mueve la tarjeta al soltar');
assert.match(shell,/shouldRollbackOrderMutation/,'un fallo del API revierte el movimiento');
assert.match(shell,/setToast\(\s*cause instanceof Error \? cause\.message : "No se pudo mover la orden\."/,'un fallo del API avisa con el motivo');
assert.match(shell,/body: JSON\.stringify\(\{ status \}\)/,'el PATCH envía sólo el estado');

// ── Reservas de inventario: sus transiciones son por acción explícita (retiro,
//    devolución, cancelación) y el calendario se pide por mes.
assert.match(inventory,/setAction\(\{kind:'checkout'/,'registrar retiro sigue disponible');
assert.match(inventory,/setAction\(\{kind:'return'/,'registrar devolución sigue disponible');
assert.match(inventory,/kind:'cancel'/,'cancelar reserva sigue disponible');
assert.match(inventory,/useInventoryCatalog\(month,refresh\)/,'el mes pedido gobierna las reservas');

console.log('PASS drag & drop OPS: matriz de transiciones del pipeline, destino por etapa en el tablero, sensores táctiles, movimiento optimista con reversión y permisos.');
