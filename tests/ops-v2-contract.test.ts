import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const inventory=read('app/inventory-workspace.tsx'),studio=read('app/studio-workspace.tsx');
const board=read('app/production-board.tsx'),planner=read('app/productivity-ui.tsx'),projects=read('app/sections/proyectos.tsx'),projectCard=read('app/project-card.tsx'),productionSection=read('app/sections/produccion.tsx'),history=read('app/work-history.tsx');
const uiV2=read('app/ui-v2.tsx');
const boardData=read('app/board-data.ts'),boardHook=read('app/use-board-data.ts');
const checklistCss=read('app/work-checklist.css'),orderLinks=read('app/work-order-links.tsx');
const inventoryHook=read('app/use-inventory-data.ts'),studioHook=read('app/use-studio-data.ts');
const workspaceShell=read('app/scale-workspace.tsx'),dataCacheSource=read('app/data-cache.ts');

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
 // #99: `truncate` o `line-clamp` valen solo con `title` en la misma línea.
 for(const line of source.split('\n'))if(line.includes('truncate')||line.includes('line-clamp'))assert(line.includes('title='),`${name}: cada texto recortado lleva title`);
 assert.doesNotMatch(source,/(truncate|line-clamp)[^>]*(CeldaMoneda|SerialTexto|listDate)/,`${name} no recorta montos, fechas ni seriales`);
 assert.doesNotMatch(source,/text-ellipsis/,`${name} no usa otros recortes`);
}
assert.match(inventory,/shrink-0 whitespace-nowrap font-mono/,'el código de inventario va nowrap');
assert.match(inventory,/whitespace-nowrap tabular-nums/,'las fechas de las listas van nowrap');
assert.match(inventory,/SerialTexto/,'los seriales mantienen la cola visible');
assert.match(inventory,/CeldaMoneda/,'los montos salen del formateador compartido');
assert.match(inventory,/fechaLista(Corta)?\(/,'las fechas de inventario salen de owncoding-ui');
assert.match(studio,/fechaLista\(/,'las fechas del estudio salen de owncoding-ui');
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
assert.match(inventory,/<Drawer open/,'la ficha de trazabilidad abre en el Drawer de owncoding-ui');
assert.match(inventory,/busyVerification|\/api\/agency\/inventory\/\$\{item\.id\}/);

// ── Accesibilidad de las grillas: encabezados de columna y control de vistas.
assert.match(inventory,/aria-hidden="true"/,'el encabezado de columnas se anuncia aparte');
assert.match(inventory,/ariaLabel="Vista de inventario"/);
assert.match(inventory,/ariaLabel="Vistas de inventario"/);
assert.match(studio,/studioCanManageReservation/,'los permisos de la reserva siguen en la capa de datos');
// ── Lote en Reservas de Estudio (#59): patrón `bulk-bar` de Equipo/Clientes.
assert.match(studio,/const \[selectedReservations,setSelectedReservations\]=useState<string\[\]>/,'el estudio guarda la selección de reservas');
assert.match(studio,/const reservationSelectable=\(reservation:StudioReservation\)=>Boolean\(context&&studioCanManageReservation\(context,reservation\)&&reservation\.status==='reserved'\)/,'solo se seleccionan reservas gestionables y vigentes');
assert.match(studio,/<div className="bulk-bar" role="status" aria-live="polite">/,'la barra de lote es la canónica');
assert.match(studio,/className="bulk-count"/,'el contador usa la clase compartida');
assert.match(studio,/Seleccionar visibles/,'la barra ofrece seleccionar visibles');
assert.match(studio,/limitSelection\(visibleSelectable,BATCH_LIMITS\.studioReservations\)/,'la selección respeta el tope del endpoint');
assert.match(studio,/\/api\/agency\/studio-reservations\/batch/,'el lote llama al endpoint de batch (#59)');
assert.match(studio,/\/api\/agency\/studio-reservations\/\$\{id\}\/cancel/,'sin endpoint de lote cae a los cancels unitarios con versión');
assert.match(studio,/expected_version:row\?\.version/,'el respaldo conserva la versión por fila');
const studioListAt=studio.indexOf('data-list="studio-reservations"');
assert(studio.indexOf('bulk-bar')<studioListAt,'la barra de lote vive antes de la lista');
assert(studio.indexOf('Seleccionar visibles')<studioListAt,'la acción de seleccionar vive antes de la lista');
assert.match(studio,/<label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar reserva para operar en lote">/,'la celda de selección es táctil de 44 px en mobile');
assert.match(studio,/\[--studio-cols:2\.25rem_/,'la plantilla compartida suma la columna de selección');
const capabilities=read('app/capabilities.ts');
assert.match(capabilities,/studioReservations: 50/,'el tope del lote del estudio queda declarado');
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
// #99: la etapa no se repite en la tarjeta (vive en la columna) y la auditoría
// de la pieza queda en el detalle, no en la tarjeta.
assert.doesNotMatch(board,/Actualizada \{fechaLista/,'la tarjeta no repite la fecha de auditoría');
assert.doesNotMatch(board,/STATUS_TONE\[order\.status\]/,'la tarjeta no repite el chip de etapa de su columna');
assert.match(productionSection,/productionView==="Tablero"/,'la vista Tablero sigue cableada al shell');
assert.match(productionSection,/<DragOverlay>/,'el overlay de arrastre se conserva');
assert.match(productionSection,/onDragCancel/,'cancelar el arrastre limpia el estado');
assert.match(productionSection,/initialView=\{productionView\}/,'el planificador conserva la API que consume Resumen');
assert.match(productionSection,/productionView==="Tablero"&&\s*<section/,'el tablero es una sección propia');
// ── Tablero por columna (campaña #57): contrato `?status=` + `?counts=1`.
assert.match(boardData,/boardCountsUrl='\/api\/agency\/work-orders\?counts=1&limit=1&fields=id'/,'los totales exactos salen del contrato');
assert.match(boardData,/status=\$\{encodeURIComponent\(status\)\}/,'cada columna pide su etapa');
assert.match(boardData,/limit=\$\{window\+1\}/,'la columna pide la ventana +1 para saber si hay más');
assert.match(boardHook,/filtered\?\{orders:rows,hasMore:false\}/,'con filtros la columna va completa');
assert.match(boardData,/PLANNER_EXTRA_FIELDS='assigned_user_id,assigned_user_ids'/,'"Mi día" necesita los campos de asignación en su ventana');
assert.match(boardHook,/boardPlannerUrl\(plannerFields\(ORDER_FIELDS_BOARD\)/,'el planificador pide su proyección completa');
assert.match(projectCard,/PROJECT_PIECES_LIMIT/,'el detalle de proyecto resume las piezas (no dibuja miles)');
assert.match(projectCard,/fetchProjectPieces\(project\.id,/,'el detalle pide las piezas con el filtro negociado por proyecto (#58)');
assert.match(projectCard,/remainingPiecesLabel\(piecesTotal/,'el resumen del resto usa el total del proyecto (registro de la lista)');
assert.match(projectCard,/const piecesTotal=Math\.max\(Number\(record\.work_order_count/,'el total combina el registro del detalle y el de la lista');
const projectPieces=read('app/project-pieces.ts');
assert.match(projectPieces,/PROJECT_PIECES_FIELDS='id,title,status,due_date,due_time,project_id'/,'la proyección mínima vive en el módulo de piezas');
assert.match(projectPieces,/project_id=\$\{encodeURIComponent\(projectId\)\}/,'el filtro por proyecto se manda cuando el API lo soporta');
assert.match(projectPieces,/projectFilterHonored/,'el soporte se negocia con una prueba real de filas');
assert.match(boardHook,/api<CountsResponse>\(boardCountsUrl\)/,'el tablero pide los totales exactos');
assert.match(boardHook,/statuses\.map\(async status=>/,'las siete columnas se piden por etapa');
assert.match(boardHook,/const filtered=boardFiltersActive\(filters\)/,'los filtros deciden ventana o columna completa');
assert.match(boardHook,/void api<CountsResponse>\(boardCountsUrl\)\.then/,'tras mover se refrescan los conteos exactos');
assert.match(boardHook,/moveOrderInColumns\(before,id,toStatus\)/,'el movimiento entre columnas es optimista');
assert.match(boardHook,/setColumns\(before\)/,'si el PATCH falla la tarjeta vuelve');
assert.match(boardHook,/versions\.current/,'el movimiento conserva la cola y la versión por orden');
assert.match(productionSection,/const boardData=useBoardData\(/,'la sección es dueña de los datos del tablero');
assert.match(productionSection,/counts=\{filtered\?undefined:boardData\.counts\[status\.id\]\}/,'cada columna recibe su total exacto; con filtros el badge cuenta lo visible');
assert.match(productionSection,/hasMore=\{boardData\.hasMore\[status\.id\]\}/,'la columna sabe si quedan piezas');
assert.match(productionSection,/onLoadMore=\{\(\)=>boardData\.loadMore\(status\.id\)\}/,'"Ver más" extiende la columna');
assert.match(productionSection,/boardData\.move\(id,target\)/,'soltar mueve con el estado optimista del tablero');
assert.match(productionSection,/orders=\{boardData\.plannerOrders\}/,'el planificador usa la ventana del tablero');
// ── Ronda 14 (#62): el riel dice cuántas etapas se ven y los vacíos no mienten.
assert.match(boardData,/export function boardVisibleWindow/,'la ventana visible es una función pura testeable');
assert.match(boardData,/export function boardWindowLabel/,'la etiqueta "N de M etapas" sale de la capa pura');
assert.match(productionSection,/boardVisibleWindow\(columns,viewport\)/,'el indicador mide las columnas reales');
assert.match(productionSection,/data-board-window/,'el indicador se marca para medirlo');
assert.match(productionSection,/data-board-prev/,'la flecha anterior del riel existe');
assert.match(productionSection,/data-board-next/,'la flecha siguiente del riel existe');
assert.match(productionSection,/aria-label="Ver etapas anteriores"/,'la flecha anterior se anuncia');
assert.match(productionSection,/aria-label="Ver etapas siguientes"/,'la flecha siguiente se anuncia');
assert.match(productionSection,/boardWindowLabel\(boardWindow,statuses\.length\)/,'la etiqueta dice cuántas de las 7 etapas se ven');
assert.match(productionSection,/prefers-reduced-motion/,'el avance del riel respeta la preferencia de movimiento');
assert.match(productionSection,/Cargando órdenes…/,'la primera carga no se anuncia como 0 órdenes');
assert.match(productionSection,/'Sin órdenes'/,'sin órdenes el contador no muestra un cero engañoso');
assert.match(productionSection,/Todavía no hay órdenes en producción\./,'el tablero vacío tiene un estado propio');
assert.match(productionSection,/Creá la primera pieza y seguila por las siete etapas/,'el vacío explica qué hacer');
assert.match(productionSection,/>Nueva pieza<\/Button>/,'el vacío ofrece crear la primera pieza');
assert.match(productionSection,/Ninguna orden coincide con los filtros guardados\./,'el filtro sin resultados explica por qué');
assert.match(productionSection,/Restablecer filtros<\/Button>/,'el filtro sin resultados trae su acción');
assert.match(productionSection,/loading=\{boardData\.loading\}/,'cada columna sabe si está cargando');
assert.match(board,/\{loading\?'Cargando piezas…':'Sin piezas en esta etapa'\}/,'la columna no dice "sin piezas" mientras carga');
assert.match(board,/loading&&counts===undefined/,'el badge no inventa un 0 durante la carga');
assert.match(board,/data-column/,'las columnas conservan su ancla de medición');
assert.match(read('app/scale-workspace.tsx'),/createOrder=\{canCreateRecord\('Producción'\)\?\(\)=>setModal\('order'\):undefined\}/,'el CTA del vacío reutiliza el modal real del shell');
// ── Ronda 14 (#62): toolbar compacta de inventario y vacíos con CTA.
// #90: la búsqueda es flexible, más angosta en la fila única del toolbar.
assert.match(inventory,/min-w-\[8rem\] flex-1 lg:max-w-72/,'la búsqueda del inventario comparte la línea de la toolbar');
assert.match(inventory,/visible\.length\} de \{items\.length\}\{updatedAt/,'el contador compacto dice visibles de total');
assert.match(inventory,/title=\{`Mostrando \$\{visible\.length\} de \$\{items\.length\} equipos/,'el detalle del contador viaja en el title');
assert.match(inventory,/onAddValue=\{context\?\.can_manage&&itemWithoutValue\?/,'el valor ausente ofrece la edición de un equipo');
assert.match(inventory,/>Agregar valor<\/button>/,'el CTA del valor se nombra "Agregar valor"');
assert.match(inventory,/Todavía no hay equipos en el inventario\./,'el catálogo vacío tiene su estado con CTA');
assert.match(inventory,/No hay equipos que coincidan con la búsqueda\./,'el filtro sin resultados se distingue del catálogo vacío');
assert.match(inventory,/>Limpiar búsqueda<\/Button>/,'el filtro sin resultados ofrece limpiar');
assert.match(studio,/\{!spaces\.length\?<EmptyState compact icon="store"/,'el estudio vacío usa el vacío compacto');
assert.match(studio,/\{\(spaces\.length\|\|reservations\.length\)\?<Card/,'sin espacios ni reservas no se dibuja el calendario');
assert.match(studio,/para reservarlo después/,'el vacío explica para qué crear el espacio');
assert.match(productionSection,/\[--board-cols:1\] sm:\[--board-cols:2\] lg:\[--board-cols:4\]/,'el tablero muestra 1/2/4 etapas completas por página');
assert.match(board,/w-\[calc\(\(100%-\(var\(--board-cols\)-1\)\*0\.75rem\)\/var\(--board-cols\)\)\]/,'el ancho de columna reparte la página sin cortar etapas');
assert.match(productionSection,/node\.clientWidth\+12/,'la flecha avanza una página completa de etapas');
assert.match(board,/line-clamp-2 text-\[11\.5px\] leading-5 text-mute/,'la descripción se resume a dos líneas');
assert.match(board,/>Ver detalle<\/button>/,'el recorte de la descripción ofrece "Ver detalle"');
assert.match(board,/node\.scrollHeight-node\.clientHeight>1/,'"Ver detalle" solo aparece si la descripción quedó recortada');
assert.match(checklistCss,/\.work-checklist-check input\[type=checkbox\]\{width:24px;height:24px;min-width:24px/,'el checkbox del checklist usa el control de 24 px');
assert.equal((checklistCss.match(/input\[type=checkbox\]\{width:/g)||[]).length,1,'el checklist declara un solo tamaño de checkbox');
assert.match(orderLinks,/className="h-6 w-6 p-0 accent-fono"/,'el checkbox de visibilidad del enlace usa el mismo control de 24 px');
assert.match(orderLinks,/min-h-11 items-center gap-2 md:min-h-0/,'el checkbox de enlace tiene target de 44 px en móvil');
assert.match(planner,/className="h-6 w-6 p-0 accent-fono"/,'la selección de piezas del planificador también es de 24 px');
// ── Ronda 16 (#70) + compactación #94: el lote aparece con la selección y la
// pista viaja en el title del acceso directo del toolbar.
assert.match(studio,/\{selectedReservations\.length\?<div className="bulk-bar"/,'el lote del Estudio aparece con la selección');
assert.match(studio,/title=\{`Selecciona hasta \$\{BATCH_LIMITS\.studioReservations\} reservas/,'la pista del lote de Estudio viaja en el title');
assert.match(projects,/\{canManageProjects&&selectedProjects\.length\?<div className="bulk-bar"/,'el lote de Proyectos aparece con la selección');
assert.match(projects,/title=\{`Selecciona hasta \$\{BATCH_LIMITS\.projects\} proyectos visibles/,'la pista del lote de Proyectos viaja en el title');
assert.match(orderLinks,/className="comment-link-chip min-h-11 md:min-h-0"/,'el chip de enlace de la pieza es táctil en mobile');
assert.match(inventory,/grid h-11 w-11 place-items-center rounded-lg border md:h-9 md:w-9/,'el selector de íconos de categoría es táctil en mobile');
assert.match(inventory,/className="mt-0\.5 h-6 w-6 p-0 accent-fono"/,'los ítems de reserva usan el checkbox de 24 px');
assert.match(inventory,/className="h-6 w-6 p-0 accent-fono" checked=\{adjust\}/,'el ajuste de verificación usa el checkbox de 24 px');
assert.match(inventory,/className="flex min-h-11 items-center gap-2 text-sm text-fore md:min-h-0"/,'los toggles de ubicación y categoría tienen target de 44 px');
assert.match(studio,/className="h-6 w-6 p-0 accent-fono" checked=\{members\.includes/,'los responsables de estudio usan el checkbox de 24 px');
// ── Ronda 19 (#74) + compactación #94: el mes no corta el año y el rótulo va en línea.
assert.match(studio,/<Label htmlFor="studio-month" className="whitespace-nowrap">Mes<\/Label><Input id="studio-month" className="w-44" type="month"/,'el mes del estudio no corta el año');
assert.match(inventory,/<Label htmlFor="inventory-calendar-month" className="whitespace-nowrap">Mes<\/Label>\s*<Input id="inventory-calendar-month" className="w-44" type="month"/,'el mes del calendario de inventario comparte la fila con su rótulo (#99)');
assert.match(planner,/grid w-52 gap-1\.5/,'el mes del planificador no corta el año');
// ── Ronda 17 (#71): casilla de la grilla 44×44 y adopción de ?fields=.
assert.match(inventory,/mt-0\.5 flex h-11 w-11 shrink-0 items-center justify-center md:h-6 md:w-6/,'la casilla de la grilla de inventario completa 44×44 en mobile');
assert.match(inventoryHook,/from '\.\/api-projection'/,'el catálogo de inventario adopta ?fields=');
assert.match(inventoryHook,/fields:INVENTORY_FIELDS/,'el catálogo pide su proyección');
assert.match(inventoryHook,/fields:INVENTORY_RESERVATION_FIELDS/,'las reservas del mes piden su proyección');
assert.match(inventoryHook,/projectionRejected\(section\.path,reason\)/,'si el API rechaza la proyección, se reintenta sin fields');
assert.match(studioHook,/readProjected<\{spaces:StudioSpace\[\]}>/,'el estudio proyecta los espacios');
assert.match(studioHook,/STUDIO_RESERVATION_FIELDS/,'las reservas del estudio piden su proyección');
// ── Ronda 14 (#62): el vacío de Proyectos también trae su CTA contextual.
assert.match(projects,/Todavía no hay proyectos\./,'el vacío de Proyectos tiene estado propio');
assert.match(projects,/>Nuevo proyecto<\/Button>/,'el vacío de Proyectos ofrece crearlo');
assert.match(projects,/Primero cargá un cliente; después vas a poder crear el proyecto\./,'sin clientes el vacío explica el orden correcto');
assert.match(read('app/scale-workspace.tsx'),/createProject=\{canCreateRecord\('Proyectos'\)\?\(\)=>setModal\('project'\):undefined\}/,'el CTA de Proyectos usa el modal real del shell');
assert.match(board,/counts \?\? orders\.length/,'el badge prefiere el total exacto del contrato');
assert.match(board,/aria-label=\{`Ver más piezas en \$\{status\.label\}`\}/,'"Ver más" se anuncia con la etapa');
assert.doesNotMatch(productionSection,/productionOrders\.map/,'el tablero ya no filtra una lista global');
assert.match(productionSection,/Legado del shell/,'los props legados quedan documentados para la limpieza (#57)');
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
assert.doesNotMatch(projectCard,/min-h-\[200px\]/,'la cuadrícula no reserva 200 px: la altura la define el contenido (#99)');
assert.match(projectCard,/<Drawer open/,'el detalle del proyecto abre en el Drawer de owncoding-ui');
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

// ── Pasada mobile (360/390/430): recortes con title, targets táctiles, scroll
// contenido, toolbars que envuelven y hojas con la geometría real del diálogo.
for(const [name,source] of [['inventario',inventory],['estudio',studio],['tablero',board],['planificador',planner],['proyectos',projects],['ficha de proyecto',projectCard],['producción',productionSection],['historial',history]] as const){
 for(const line of source.split('\n'))if(line.includes('truncate'))assert(line.includes('title='),`${name}: cada texto recortado lleva title en mobile`);
}
for(const [name,source] of [['inventario',inventory],['estudio',studio],['ficha de proyecto',projectCard]] as const){
 assert.match(source,/const ICON_TARGETS='\[&>button\]:h-11 \[&>button\]:w-11 md:/,`${name}: acciones de ícono de 44 px en mobile`);
}
assert.match(inventory,/const ROW_ICON_TARGETS='\[&>button\]:h-11 \[&>button\]:w-11 md:\[&>button\]:h-7 md:\[&>button\]:w-7'/,'las filas de inventario son táctiles en mobile');
assert.match(studio,/const ROW_ICON_TARGETS='\[&>button\]:h-11 \[&>button\]:w-11 md:\[&>button\]:h-7 md:\[&>button\]:w-7'/,'las filas del estudio son táctiles en mobile');
assert.match(board,/role="img" aria-label=\{`Mover \$\{order\.title\}`\}/,'el ⋮⋮ se anuncia como señal de movimiento (la tarjeta entera arrastra)');
assert.match(planner,/Subtabs[^>]*\[&>button\]:min-h-11 md:\[&>button\]:min-h-9/,'los subtabs del planificador son táctiles en mobile');
assert.match(planner,/\[&_a\]:inline-flex \[&_a\]:min-h-11/,'los enlaces de Drive de la pieza son táctiles');
assert.match(projectCard,/\[&_a\]:inline-flex \[&_a\]:min-h-11/,'los enlaces de Drive de la ficha de proyecto son táctiles');
// Scroll contenido: el documento no scrollea de costado; las listas y el tablero sí, dentro de su caja.
assert.match(uiV2,/silent-scroll min-w-0 overflow-x-auto/,'las listas v2 contienen su scroll horizontal');
assert.match(productionSection,/silent-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto/,'el tablero contiene su scroll por bloques');
// Toolbars que envuelven y campos a ancho completo en mobile (#94: fila única en desktop).
assert.match(uiV2,/mb-4 flex flex-wrap items-end gap-3/,'la toolbar de filtros envuelve en mobile');
assert.match(productionSection,/production-command-toolbar mb-4 flex min-w-0 flex-col gap-3 lg:mb-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3/,'la barra de producción apila en mobile y va en una fila en desktop');
assert.match(productionSection,/<label className="production-client-filter flex items-center gap-2">/,'el filtro de cliente va en línea con su rótulo');
assert.match(projects,/<label className="flex items-center gap-2">/,'el filtro de proyectos va en línea con su rótulo');
// Hojas mobile: el harness mide la geometría real del diálogo (cabe y scrollea adentro).
const fixtures=read('build-tools/visual-harness/fixtures/ops-detalles-formularios.mjs');
assert.match(fixtures,/const sheet = \(heading, body\) =>/,'el harness mide la hoja mobile');
assert.match(fixtures,/class="dialog-body"/,'la hoja usa el cuerpo desplazable del diálogo');
assert.match(fixtures,/class="dialog-actions"/,'las acciones de la hoja salen del diálogo');
for(const id of ['ops-sheet-inventario','ops-sheet-pieza','ops-sheet-form-equipo'])assert(fixtures.includes(`'${id}'`),`el fixture ${id} está registrado en el harness`);
// Selección en lote: el checkbox (24 px) vive en un label táctil de 44 en mobile.
assert((inventory.match(/title="Seleccionar para operar en lote"/g)||[]).length>=2,'las dos variantes del inventario (tarjeta y fila) ofrecen el label táctil');
assert.match(inventory,/label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0"/,'la celda de selección de fila es un label de 44 px en mobile');
assert.match(planner,/label className="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0"/,'la selección del planificador también es un label táctil');
// Calendario del planificador: piezas con target táctil en mobile y densidad de grilla desde 769.
assert.match(planner,/flex min-h-11 min-w-0 flex-col justify-center text-left/,'abrir una pieza desde la lista es táctil en mobile');
assert.match(projectCard,/inline-flex min-h-11 items-center whitespace-nowrap text-\[11\.5px\] font-semibold text-fono-light hover:underline md:min-h-0/,'el enlace «Abrir Drive» del listado es táctil en mobile');
assert.match(planner,/grid min-h-11 gap-0\.5 rounded-md border border-fono\/30[^"]*min-\[769px\]:min-h-0/,'las piezas del calendario son táctiles en mobile');
assert.match(planner,/<input type="month"[\s\S]{0,200}?className="min-h-11"/,'el selector de mes mide 44 px');
const prodFixtures=read('build-tools/visual-harness/fixtures/ops-produccion-proyectos.mjs');
assert.match(prodFixtures,/id: 'produccion-calendario'/,'el calendario del planificador tiene fixture propio');



// ── Ronda 7: conmutador v2 y fila con acciones de ícono en Proyectos ─────────
const shell=read('app/scale-workspace.tsx');
assert.match(shell,/<ViewSwitch value={projectView as 'list'\|'grid'} onChange={changeProjectView}\/>/,'Proyectos usa el conmutador v2 (ViewSwitch) con la persistencia compartida');
assert.match(shell,/const ROW_ICON_ACTION='grid h-11 w-11 min-h-0[^']*md:h-7 md:w-7'/,'la acción de ícono de la fila fija 44/28 sin el min-height legado');
assert.match(shell,/function projectRowEntry\(project:Project\)\{/,'la fila de Proyectos la aporta el shell (no los children de la tarjeta)');
assert.match(shell,/title=\{archived\?'Reactivar proyecto':'Archivar proyecto'\}/,'la acción de archivar/reactivar describe la acción');
assert.match(projects,/<ListRow key=\{project\.id\} template="grid-cols-\[var\(--project-cols\)\]">\{projectRow\(project\)\}<\/ListRow>/,'la vista lista usa ListRow con la plantilla compartida');
assert.match(projects,/projectRow: \(project: Project\) => ReactNode/,'la sección recibe la fila del shell');
assert.match(prodFixtures,/row: '\.project-list \[role="rowgroup"\] > \[role="row"\]'/,'el fixture de la lista mide las filas del cuerpo');
assert.match(prodFixtures,/projectListRow/,'y espeja la fila con acciones de ícono');
console.log('PASS contrato ronda 7: conmutador v2 en Proyectos y fila con acciones de ícono (44-52)');

// ── Identidad sin foto vieja (issue #81): el tablero no decora con la lista de
// clientes/proyectos mientras el shell la relee, y editarla la invalida.
assert.match(workspaceShell,/identityLoading/,'el shell expone si la identidad se está releyendo');
assert.match(productionSection,/identityLoading\?undefined:client\?\.logo_url/,'el tablero no pinta el logo viejo durante la relectura');
assert.match(workspaceShell,/identityLoading\?undefined:clients\.find/,'las tarjetas de Proyectos tampoco pintan la identidad vieja');
assert.match(dataCacheSource,/scale:data-mutated/,'las mutaciones avisan para invalidar la identidad');
assert.match(workspaceShell,/addEventListener\('scale:data-mutated'/,'el shell escucha las mutaciones');
assert(shell.includes('^(clients|projects):'),'el shell expira solo la frescura de clientes/proyectos');
