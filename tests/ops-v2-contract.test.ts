import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const inventory=read('app/inventory-workspace.tsx'),studio=read('app/studio-workspace.tsx');
const uiV2=read('app/ui-v2.tsx');

// ── Contrato v2 de OPS (campaña #41, spec #44): Tailwind + owncoding-ui +
// primitivas de app/ui-v2.tsx. Reemplaza al contrato del rediseño anterior.
for(const [name,source] of [['inventario',inventory],['estudio',studio]] as const){
 assert.match(source,/from 'owncoding-ui'/,'${name} usa objetos de la librería'.replace('${name}',name));
 assert.match(source,/from '\.\/ui-v2'/,'la pantalla usa las primitivas v2 (KPI/chip/carga)');
 assert.doesNotMatch(source,/-workspace\.css'/,'no quedan hojas de componente');
}
assert(!existsSync(new URL('../app/inventory-workspace.css',import.meta.url)),'la hoja plana de inventario se retiró');
assert(!existsSync(new URL('../app/studio-workspace.css',import.meta.url)),'la hoja plana de estudio se retiró');

// ── Un solo chip, un solo KPI y una sola carga.
assert.match(uiV2,/export function StateChip/);assert.match(uiV2,/export function Kpi\b/);assert.match(uiV2,/export function LoadingBlock/);
assert.match(inventory,/StateChip/);assert.match(inventory,/KpiStrip/);assert.match(inventory,/LoadingBlock/);
assert.match(studio,/StateChip/);assert.match(studio,/LoadingBlock/);
for(const source of [inventory,studio])assert.doesNotMatch(source,/kpi-card|state-chip|class(Name)?="metric/,'no se recrean chips ni KPIs por pantalla');

// ── Estados de la página: vacío, error y aviso con datos reales.
for(const [name,source] of [['inventario',inventory],['estudio',studio]] as const){
 for(const primitive of ['EmptyState','ErrorState','Aviso']){
  assert.match(source,new RegExp(primitive),`${name} usa ${primitive}`);
 }
}

// ── Listas: una sola plantilla por lista, compartida entre encabezado y filas.
assert.match(inventory,/const EQUIPMENT_COLS='\[--eq-cols:[\s\S]*?const EQUIPMENT_GRID='grid grid-cols-\[var\(--eq-cols\)\] items-center gap-x-2'/,'una sola plantilla de equipos');
assert.match(inventory,/const RESERVATION_COLS='\[--rsv-cols:[\s\S]*?const RESERVATION_GRID='grid grid-cols-\[var\(--rsv-cols\)\] items-center gap-x-2'/,'una sola plantilla de reservas');
assert.match(studio,/const RESERVATION_COLS='\[--studio-cols:[\s\S]*?const RESERVATION_GRID='grid grid-cols-\[var\(--studio-cols\)\] items-center gap-x-2'/,'una sola plantilla de reservas del estudio');
assert.equal((inventory.match(/\$\{EQUIPMENT_GRID\}/g)||[]).length,2,'el encabezado y las filas de equipos comparten la plantilla');
assert.equal((inventory.match(/\$\{RESERVATION_GRID\}/g)||[]).length,2,'el encabezado y las filas de reservas comparten la plantilla');
assert.equal((studio.match(/\$\{RESERVATION_GRID\}/g)||[]).length,2,'el encabezado y las filas del estudio comparten la plantilla');

// ── Nada de elipsis en montos, fechas, códigos ni seriales: el texto largo se
// recorta con elipsis + `title` (AGENTS.md) y el valor completo queda a mano.
for(const [name,source] of [['inventario',inventory],['estudio',studio]] as const){
 for(const line of source.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),`${name}: cada texto recortado lleva title`);
 assert.doesNotMatch(source,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,`${name} no recorta montos, fechas ni seriales`);
 assert.doesNotMatch(source,/text-ellipsis|line-clamp/,`${name} no usa otros recortes`);
}
assert.match(inventory,/shrink-0 whitespace-nowrap font-mono/,'el código de inventario va nowrap');
assert.match(inventory,/whitespace-nowrap tabular-nums/,'las fechas de las listas van nowrap');
assert.match(inventory,/SerialTexto/,'los seriales mantienen la cola visible');
assert.match(inventory,/CeldaMoneda/,'los montos salen del formateador compartido');
assert.match(inventory,/listDate(Full|Short)/,'las fechas salen de list-format');
assert.match(studio,/listDateFull/,'las fechas del estudio salen de list-format');
for(const source of [inventory,studio])assert.doesNotMatch(source,/toLocaleDateString|timeStyle:\s*'short'/,'sin formatos de fecha sueltos');

// ── Acciones: ícono del set compartido, con etiqueta que nombra la acción.
const iconActions=[...inventory.matchAll(/IconAction[^>]*?label=(?:\{`([^`]+)`\}|"([^"]+)")/g)].map(match=>match[1]||match[2]);
assert(iconActions.length>=10,'inventario usa acciones de ícono para sus filas');
assert(iconActions.every(label=>label.includes('${')||label.length>3),'cada acción nombra lo que hace');
assert(iconActions.some(label=>label.startsWith('Detalle y trazabilidad')),'la acción de la ficha se anuncia');
assert(iconActions.some(label=>label.startsWith('Archivar equipo')),'la acción de archivar se anuncia');
assert.match(inventory,/title=\{`Mover \$\{item\.name\}`\}/,'el arrastre del pipeline se anuncia');
assert.doesNotMatch(inventory,/<button[^>]*className="icon-button/,'no quedan botones de ícono del rediseño viejo');

// ── Pipeline de ubicaciones y registro de íconos de categoría.
assert.match(inventory,/categoryIconMap/);
const iconKeys=['camera','video','mic','lamp','lightbulb','monitor','laptop','speaker','hard-drive','battery-charging','package','home'];
assert(iconKeys.filter(key=>inventory.includes(`'${key}'`)).length>=8,'al menos 8 de las 12 categorías tienen ícono');
assert.match(inventory,/\['pipeline','Ubicaciones','store'\]/,'la vista de pipeline de ubicaciones está cableada');
assert.match(inventory,/buildInventoryPipelineColumns/,'las columnas del pipeline salen de la capa de datos');
assert.match(inventory,/role="region" aria-label="Pipeline de ubicaciones"/,'el pipeline declara su región desplazable');

// ── Barcode, drawer de trazabilidad y búsqueda real del API.
assert.match(inventory,/<InventoryBarcode code=\{code\}/);
assert.match(inventory,/variant="drawer"/,'la ficha de trazabilidad abre en drawer');
assert.match(inventory,/busyVerification|\/api\/agency\/inventory\/\$\{item\.id\}/);

// ── Accesibilidad de las grillas: encabezados de columna y control de vistas.
assert.match(inventory,/aria-hidden="true"/,'el encabezado de columnas se anuncia aparte');
assert.match(inventory,/ariaLabel="Vista de inventario"/);
assert.match(inventory,/ariaLabel="Vistas de inventario"/);
assert.match(studio,/studioCanManageReservation/,'los permisos de la reserva siguen en la capa de datos');
assert.match(studio,/\^\\d\{4\}-\(0\[1-9\]\|1\[0-2\]\)\$/,'el mes del estudio se valida antes de aplicarlo');

console.log('PASS contrato v2 OPS: Tailwind + owncoding-ui + primitivas, una plantilla por lista sin elipsis, acciones y estados en inventario y estudio.');
