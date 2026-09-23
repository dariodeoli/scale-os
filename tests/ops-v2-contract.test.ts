import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const inventory=read('app/inventory-workspace.tsx'),studio=read('app/studio-workspace.tsx');
const board=read('app/production-board.tsx'),planner=read('app/productivity-ui.tsx'),projects=read('app/sections/proyectos.tsx'),projectCard=read('app/project-card.tsx'),productionSection=read('app/sections/produccion.tsx'),history=read('app/work-history.tsx');
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

// ── Producción (tablero, Mi día, calendario, lista y lotes).
assert.match(board,/export const statuses/,'el diccionario de etapas sigue siendo la fuente única');
assert.match(board,/roleCan\(role,'work-orders\.edit'\)/,'el arrastre depende de la capacidad de editar piezas');
assert.match(board,/title=\{`Mover \$\{order\.title\}`\}/,'la acción de mover se anuncia con el nombre de la pieza');
assert.match(board,/StateChip/,'las tarjetas usan el chip único');
assert.match(board,/work_type/,'la tarjeta muestra el tipo de trabajo del API');
assert.match(board,/estimated_hours/,'la tarjeta muestra las horas estimadas/reales');
assert.match(board,/approval_step/,'la tarjeta muestra el nivel de aprobación');
assert.match(board,/drive_links/,'la tarjeta cuenta los enlaces múltiples');
assert.match(board,/listDateFull/,'la auditoría de la pieza sale de list-format');
assert.match(productionSection,/productionView==="Tablero"/,'la vista Tablero sigue cableada al shell');
assert.match(productionSection,/<DragOverlay>/,'el overlay de arrastre se conserva');
assert.match(productionSection,/onDragCancel/,'cancelar el arrastre limpia el estado');
assert.match(productionSection,/initialView=\{productionView\}/,'el planificador conserva la API que consume Resumen');
assert.match(productionSection,/productionView==="Tablero"&&\s*<section/,'el tablero es una sección propia');
for(const source of [board,planner])assert.doesNotMatch(source,/truncate[^>]*(CeldaMoneda|SerialTexto|listDate)/,'producción no recorta montos, fechas ni seriales');
// ── Planificador: Mi día, calendario y lista y lotes.
assert.match(planner,/PLANNER_COLUMNS:Column\[\]/,'el planificador declara sus columnas');
assert.match(planner,/PLANNER_TEMPLATE=/,'una sola plantilla para el planificador');
assert.match(planner,/<ListGrid label=\{view==='Lista y lotes'\?'Piezas en lista y lotes':'Piezas'\} template=\{PLANNER_TEMPLATE\}/,'encabezado y filas comparten la plantilla del planificador');
assert.match(planner,/min-\[769px\]:grid-cols-7/,'el calendario es lista en mobile y grilla desde 769');
assert.match(planner,/workStatusLabel/,'el estado nunca se muestra crudo');
assert.match(planner,/<SelectCustom label="Qué cambiar"/,'el lote conserva su editor');
// ── Proyectos: lista con plantilla compartida, KPIs y tarjeta con detalle.
assert.match(projects,/PROJECT_COLUMNS: Column\[\]/,'la lista de proyectos declara sus columnas');
assert.match(projects,/PROJECT_COLS = '\[--project-cols:/,'la sección declara la plantilla compartida');
assert.match(projects,/ListGrid label=\{label\} template="grid-cols-\[var\(--project-cols\)\]" columns=\{PROJECT_COLUMNS\}/,'encabezado y filas comparten --project-cols');
assert.match(projects,/de \{BATCH_LIMITS\.projects\} seleccionado/,'el lote muestra el tope del API');
assert.match(projectCard,/\[\.project-list_&\]:grid-cols-\[var\(--project-cols\)\]/,'la tarjeta consume la plantilla en modo lista');
assert.match(projectCard,/min-h-\[200px\]/,'la cuadrícula mantiene tarjetas de 200 px');
assert.match(projectCard,/variant="drawer"/,'el detalle del proyecto abre en drawer');
assert.match(projectCard,/\/api\/agency\/projects\/\$\{project\.id\}/,'el detalle lee la ficha real del API');
assert.match(projectCard,/approval_levels/,'el detalle muestra los niveles de aprobación');
assert.match(projectCard,/drive_links/,'el detalle muestra todos los enlaces');
assert.match(projectCard,/Piezas del proyecto/,'el detalle lista las piezas del proyecto');
for(const source of [projects,projectCard])assert.doesNotMatch(source,/truncate[^>]*(CeldaMoneda|listDate(Short|Full))\b/,'proyectos no recorta montos ni fechas');

// ── Historial de trabajo (feed de auditoría, tomado de PLT).
assert.match(history,/from 'owncoding-ui'/,'el historial usa la librería');
assert.match(history,/from '\.\/ui-v2'/,'el historial usa las primitivas v2 (carga/vacío/error/aviso)');
assert.match(history,/LoadingBlock/);assert.match(history,/EmptyBlock/);assert.match(history,/ErrorBlock/);
assert.match(history,/const managers=roleCan\('role','work-orders\.manage'\)|const managers=roleCan\(role,'work-orders\.manage'\)/,'el historial completo sigue gateado por capacidad');
assert.match(history,/useState\('10'\)/,'el paginado arranca en 10');
assert.match(history,/URLSearchParams\({limit,offset:String\(offset\)}\)/,'el historial pagina contra el API');
assert.match(history,/imported=\{source\}/,'la fuente importada no atribuye la acción a una cuenta de Scale OS');
assert.doesNotMatch(history,/-history\.css'/,'no queda hoja propia del historial');
assert(!existsSync(new URL('../app/work-history.css',import.meta.url)),'la hoja del historial se retiró');
// InternalTasks (Resumen) no se toca en esta tanda.
assert.match(history,/export function InternalTasks/,'InternalTasks sigue en el módulo');

console.log('PASS contrato v2 OPS: inventario, estudio, producción, proyectos e historial con Tailwind + owncoding-ui, una plantilla por lista, estados y sin recortar datos.');
