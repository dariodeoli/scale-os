import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

// #104 «Ubicaciones de guardado» con orden manual: contrato full-stack.
// Fija la migración aditiva y registrada, el endpoint con validación de empresa y
// permisos, el listado por `position`, y el front con reordenamiento optimista,
// reversión y respeto del orden en el pipeline sin romper el arrastre de equipos.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const migrationPath='backend/migrations/20260929_inventory_location_position.sql';
assert(existsSync(new URL(`../${migrationPath}`,import.meta.url)),'la migración existe');

const migration=read(migrationPath);
assert.match(migration,/add column if not exists position integer/,'la columna se agrega de forma aditiva');
assert.match(migration,/row_number\(\) over \(partition by organization_id order by active desc,name\)/,'el valor inicial conserva el orden anterior');
assert.match(migration,/where l\.id = r\.id and l\.position is null/,'la migración es idempotente y re-ejecutable');
assert.match(migration,/create index if not exists agency_inventory_storage_locations_order_idx/,'el orden tiene su índice');

const chain=read('backend/scripts/migration-order.mjs');
assert.match(chain,/20260929_inventory_location_position\.sql/,'la migración está registrada en la cadena curada');
const server=read('backend/server.js');
assert.match(server,/20260929_inventory_location_position\.sql/,'el API la aplica al arrancar');
for(const fixture of ['backend/test-suite.mjs','backend/test-auth.mjs']){
 assert.match(read(fixture),/20260929_inventory_location_position\.sql/,`${fixture} carga la migración`);
}

const api=read('backend/inventory-reservations.js');
assert.match(api,/order by l\.position,l\.name/,'el listado sale ordenado por posición');
assert.match(api,/checkout\|return\|check-out\|check-in\|cancel\|restore\|verify\|batch\|photo\|order/,'la ruta acepta la acción `order`');
assert.match(api,/kind==='inventory-locations'&&action==='order'/,'existe el endpoint de orden');
assert.match(api,/const capability=write\?\(kind==='inventory-reservations'\?'inventory\.book':'inventory\.manage'\):'inventory\.view'/,'el orden queda detrás de inventory.manage');
assert.match(api,/if\(rows\.length!==ids\.length\)fail\('Alguna ubicación no pertenece a esta empresa',404\)/,'valida que los ids sean de la empresa');
assert.match(api,/new Set\(ids\.map\(String\)\)\.size!==ids\.length/,'rechaza ids repetidos');
assert.match(api,/set position=\$1,updated_at=now\(\)/,'persiste posición y updated_at');
assert.match(api,/select coalesce\(max\(position\)\+1,0\) from agency_inventory_storage_locations/,'las ubicaciones nuevas van al final');

const data=read('app/inventory-data.ts');
assert.match(data,/const locationOrder=new Map\(locations\.map\(\(location,index\)=>\[String\(location\.id\),index\]\)\)/,'el pipeline arma su orden con la lista de ubicaciones');
assert.match(data,/if\(aIndex!==undefined&&bIndex!==undefined\)return aIndex-bIndex/,'las columnas guardadas respetan el orden manual');

const hook=read('app/use-inventory-data.ts');
assert.match(hook,/reorderLocations:\(ids:string\[\]\)=>Promise<void>/,'el catálogo expone el reordenamiento');
assert.match(hook,/api<\{locations:StorageTemplate\[\]\}>\(\'\/api\/agency\/inventory-locations\/order\',\{ids:ids\.map\(String\)\},'PATCH'\)/,'persiste contra el endpoint de orden');
assert.match(hook,/catch\(reason\)\{\s*setStorageTemplates\(snapshot\);\s*throw reason;/,'revierte la lista si el API falla');

const inventory=read('app/inventory-workspace.tsx');
assert.match(inventory,/onReorder=\{context\?\.can_manage\?reorderLocations:undefined\}/,'sólo con permiso de gestión se reordena');
assert.match(inventory,/\{id:'before',label:'Mover antes',icono:'back'/,'cada columna guardada ofrece mover antes en el menú ⋯ (#146)');
assert.match(inventory,/\{id:'after',label:'Mover después',icono:'arrow'/,'cada columna guardada ofrece mover después en el menú ⋯ (#146)');
assert.match(inventory,/ariaLabel=\{`Acciones de la ubicación: \$\{column\.title\}`\}/,'el menú de la ubicación se anuncia con su nombre');
assert.match(inventory,/const next=\[...orderIds\];\[next\[index\],next\[target\]\]=\[next\[target\],next\[index\]\];/,'el orden viaja completo al API');
assert.match(inventory,/catch\(reason\)\{setMoveError\(errorMessage\(reason\)\);\}/,'el fallo se avisa');
assert.match(inventory,/<DndContext sensors=\{sensors\}/,'el arrastre de equipos sigue vivo');

const workspaceTest=read('tests/inventory-workspace.test.tsx');
assert.match(workspaceTest,/el reordenamiento llama al endpoint de orden/,'el front tiene test del endpoint');
assert.match(workspaceTest,/si el API falla, la vista vuelve al orden anterior/,'el front tiene test de la reversión');
const apiTest=read('backend/test-inventory-reservations.mjs');
assert.match(apiTest,/order persists the requested sequence/,'el API tiene test del orden persistido');
assert.match(apiTest,/order rejects ids from another tenant/,'el API tiene test de aislamiento por empresa');

console.log('PASS: ubicaciones #104 — migración registrada, endpoint validado y pipeline con orden manual optimista y reversible.');
