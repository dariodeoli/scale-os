import assert from 'node:assert/strict';

// Capa pura del tablero por columna (#57): URLs del contrato, ventanas,
// unión de páginas sin duplicados, agrupación y movimiento optimista. Ronda 14
// (#62): ventana visible para el indicador "N de 7 etapas".

require.extensions['.css']=()=>{};
const {BOARD_COLUMN_WINDOW,BOARD_PLANNER_WINDOW,plannerFields,adjustCounts,boardColumnUrl,boardCountsUrl,boardFiltersActive,boardPlannerUrl,boardVisibleWindow,boardWindowLabel,countsFromOrders,emptyColumns,groupOrdersByStatus,mergeColumnPage,moveOrderInColumns,readColumnPage}=require('../app/board-data') as typeof import('../app/board-data');
const {statuses}=require('../app/production-board') as typeof import('../app/production-board');

import type {Status} from '../app/production-board';
const order=(id:string,status:Status)=>({id,status,title:`Pieza ${id}`,project_id:'2',project_name:'P',client_name:'C',description:null,drive_url:null});

assert.equal(boardCountsUrl,'/api/agency/work-orders?counts=1&limit=1&fields=id','los totales exactos salen del contrato ?counts=1');
assert.equal(boardColumnUrl('editing','id,status'),`/api/agency/work-orders?status=editing&fields=id,status&limit=${BOARD_COLUMN_WINDOW+1}`,'la columna pide su etapa con la ventana +1');
assert.equal(boardColumnUrl('editing','id,status',{offset:BOARD_COLUMN_WINDOW}),`/api/agency/work-orders?status=editing&fields=id,status&limit=${BOARD_COLUMN_WINDOW+1}&offset=${BOARD_COLUMN_WINDOW}`,'"Ver más" pagina con offset sin cambiar el tope');
assert.equal(boardColumnUrl('editing','id,status',{full:true}),'/api/agency/work-orders?status=editing&fields=id,status','con filtros la columna va completa (el contrato no filtra cliente ni fecha)');
assert.equal(boardPlannerUrl('id,status'),`/api/agency/work-orders?limit=${BOARD_PLANNER_WINDOW}&fields=id,status`,'el planificador usa una ventana única');
assert.equal(plannerFields('id,status'),'id,status,assigned_user_id,assigned_user_ids','Mi día necesita los campos de asignación en la ventana');
assert.equal(boardFiltersActive({clientId:'',mine:false,week:false,userId:'2',today:'2026-09-24'}),false,'sin filtros');
assert.equal(boardFiltersActive({clientId:'7',mine:false,week:false,userId:'2',today:'2026-09-24'}),true,'el cliente filtra');

// Ventana: se guardan `window` filas y hasMore avisa si había más.
const page=readColumnPage(Array.from({length:BOARD_COLUMN_WINDOW+1},(_,index)=>order(String(index),'editing')),BOARD_COLUMN_WINDOW);
assert.equal(page.orders.length,BOARD_COLUMN_WINDOW,'la ventana no se pasa del tope');
assert.equal(page.hasMore,true,'la fila extra anuncia que hay más');
assert.equal(readColumnPage([order('1','editing')],BOARD_COLUMN_WINDOW).hasMore,false,'una columna corta no tiene más');

// Unión de páginas sin duplicados por id.
const merged=mergeColumnPage([order('1','editing'),order('2','editing')],[order('2','editing'),order('3','editing')]);
assert.deepEqual(merged.map(row=>row.id),['1','2','3'],'la página siguiente se une sin repetir');

// Agrupación y conteos de respaldo.
const grouped=groupOrdersByStatus([order('1','blocked'),order('2','blocked'),order('3','published')]);
assert.equal(grouped.blocked.length,2);
assert.equal(grouped.published.length,1);
assert.equal(grouped.editing.length,0,'cada etapa existe aunque esté vacía');
assert.equal(emptyColumns().to_record.length,0);
const counts=countsFromOrders([order('1','blocked'),order('2','review')]);
assert.equal(counts.blocked,1);
assert.equal(counts.review,1);
assert.equal(statuses.every(status=>status.id in counts),true,'el respaldo cubre las siete etapas');

// Movimiento optimista: sale de su columna con su nuevo estado y ajusta conteos.
const columns=emptyColumns();
columns.blocked=[order('9','blocked'),order('10','blocked')];
columns.editing=[order('11','editing')];
const moved=moveOrderInColumns(columns,'9','editing');
assert.equal(moved.from,'blocked');
assert.equal(moved.columns.blocked.length,1);
assert.equal(moved.columns.editing.length,2);
assert.equal(moved.columns.editing[0].id,'9','la tarjeta movida queda primero en el destino');
assert.equal(moved.columns.editing[0].status,'editing','la tarjeta cambia de estado');
assert.equal(moveOrderInColumns(columns,'sin-columna','editing').from,null,'una pieza que no está no inventa movimiento');
assert.equal(moveOrderInColumns(columns,'9','blocked').from,'blocked','mover a la misma etapa no cambia la tarjeta');
const adjusted=adjustCounts({blocked:2,editing:1},'blocked','editing');
assert.equal(adjusted.blocked,1);
assert.equal(adjusted.editing,2);
assert.equal(adjustCounts({blocked:0,editing:1},'blocked','editing').blocked,0,'un conteo no baja de cero');

// Indicador del riel: cuenta la columna parcialmente visible del borde.
const cols=(widths:number[],gap=12)=>widths.map((width,index)=>({left:index*(width+gap),right:index*(width+gap)+width}));
assert.deepEqual(boardVisibleWindow(cols([288,288,288,288,288,288,288]),{left:0,right:992}),{first:1,last:4,count:4},'a 1280 entran 4 de las 7 etapas');
assert.equal(boardWindowLabel({first:1,last:4},7),'Etapas 1–4 de 7','la etiqueta del bloque dice el rango visible');
assert.equal(boardWindowLabel({first:4,last:7},7),'Etapas 4–7 de 7','la última página se ancla al final sin cortar etapas');
assert.equal(boardWindowLabel({first:3,last:3},7),'Etapa 3 de 7','en mobile una sola etapa visible usa singular');
assert.deepEqual(boardVisibleWindow(cols([288,288,288,288,288,288,288]),{left:600,right:1592}),{first:3,last:6,count:4},'scroll a la derecha: la ventana avanza y cuenta las 4 que entran');
assert.deepEqual(boardVisibleWindow(cols([288,288,288,288,288,288,288]),{left:1000,right:1992}),{first:4,last:7,count:4},'al final del riel la última etapa entra en la ventana');
assert.deepEqual(boardVisibleWindow(cols([288,288]),{left:-500,right:10}),{first:1,last:1,count:1},'sin columnas dentro se conserva una ventana válida');
assert.deepEqual(boardVisibleWindow(cols([288]),{left:0,right:1}),{first:1,last:1,count:1},'sin nada visible cae a la primera etapa');

console.log('PASS board-data: contrato por columna (counts + status), ventanas, unión de páginas, indicador visible y movimiento optimista.');
