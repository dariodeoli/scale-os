import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {traceLabel} from '../app/inventory-data';
import {STUDIO_PRODUCTION_TYPES} from '../app/studio-data';

// §15 transversales (owncoding-ui v0.51.0) — contrato de Operaciones (#86).
// Fija lo corregido en la auditoría: estados honestos (nada de éxito ni de vacío
// falso), vacíos con acción, error con reintento, microcopy es-PY, targets de
// 44 px y listas acotadas. Lo que depende de la fundación de la dependencia
// (#82) queda documentado en docs/qa/tanda51-ops/README.md, no acá.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const board=read('app/sections/produccion.tsx');
const kanban=read('app/production-board.tsx');
const planner=read('app/productivity-ui.tsx');
const inventory=read('app/inventory-workspace.tsx');
const studio=read('app/studio-workspace.tsx');
const history=read('app/work-history.tsx');
const historySection=read('app/sections/historial.tsx');
const projects=read('app/sections/proyectos.tsx');
const projectCard=read('app/project-card.tsx');
const shell=read('app/scale-workspace.tsx');

// ── §15.1 Cero éxito falso: ningún fallo se silencia.
// El tablero y el planificador avisan con el reintento canónico.
assert.match(board,/ErrorBlock title="No se pudo cargar el tablero\." description=\{boardData\.error\} onRetry=\{\(\)=>void boardData\.reload\(\)\}/,'el error del tablero va con ErrorBlock y reintento');
assert.match(board,/ErrorBlock title="No se pudo cargar el planificador\."/,'el planificador tiene su propio estado de error');
assert.match(board,/\{productionView!=="Tablero"&&\(boardData\.error/, 'el planificador no se dibuja con error');
assert.match(board,/\?<LoadingBlock label="Cargando producción…" lines=\{5\}\/>/, 'con la primera carga el planificador muestra esqueleto, no vacío');

// El historial no convierte un fallo de la lista del equipo en un filtro vacío.
assert.match(history,/setPeopleError\(cause instanceof Error\?cause\.message:'No se pudo cargar el equipo\.'\)/,'el fallo de personas se registra');
assert.match(history,/No se pudo cargar la lista del equipo: \{peopleError\}/,'el fallo de personas se muestra');
assert.match(history,/<button type="button" className="text-button" onClick=\{\(\)=>setPeopleVersion\(v=>v\+1\)\}>Reintentar<\/button>/,'el fallo de personas ofrece reintento');

// El lote del estudio cuenta por fila: nunca da por cancelada una reserva sin respuesta.
assert.match(studio,/let cancelled=0;let failed:string\[\]=\[\];/);
assert.match(studio,/catch\{failed\.push\(id\);\}/,'la fila fallida se cuenta, no se saltea');
assert.match(studio,/if\(!confirmedByBatch\)\{cancelled=0;failed=\[\];for\(const id of selection\)await cancelOne\(id\);\}/,'sin detalle en la respuesta se cae a los cancels unitarios');
assert.match(studio,/No se pudieron cancelar \$\{failed\.length\} de \$\{selection\.length\} reservas/,'el aviso dice cuántas quedaron sin cancelar');
assert.match(studio,/setSelectedReservations\(failed\);/,'las fallidas quedan seleccionadas para reintentar');
assert.doesNotMatch(studio,/la fila se saltea/,'no quedan filas salteadas en silencio');

// Los responsables del proyecto no se declaran "sin responsables" cuando la lectura falla.
assert.match(projectCard,/setAssigneesError\(head\.failed\)/);
assert.match(projectCard,/No se pudieron cargar los responsables\./,'el fallo de responsables se nombra');
assert.match(projectCard,/<button type="button" className="text-button" onClick=\{\(\)=>setReload\(value=>value\+1\)\}>Reintentar<\/button>/,'el fallo de responsables ofrece reintento');

// ── §15.3 Cuatro estados: vacío con acción y error con reintento.
assert.match(board,/action=\{createOrder\?<Button type="button" onClick=\{createOrder\}><Plus size=\{16\}\/>Nueva pieza<\/Button>:undefined\}/,'el tablero vacío ofrece crear la primera pieza');
assert.match(planner,/action=\{<Button type="button" variant="outline" onClick=\{\(\)=>navigate\('Producción'\)\}>Abrir el tablero de Producción<\/Button>\}/,'el planificador vacío abre el tablero');
assert.match(planner,/className="text-button" onClick=\{\(\)=>\{setError\(''\);void load\(\)\.catch\(cause=>setError\(errorText\(cause\)\)\);\}\}>Reintentar<\/button>/,'el detalle de la pieza falla con reintento');
assert.match(history,/action=\{!source&&navigate\?<Button type="button" variant="outline" onClick=\{\(\)=>navigate\('Producción'\)\}>Abrir Producción<\/Button>:undefined\}/,'el historial vacío ofrece una salida');
assert.match(historySection,/navigate=\{navigate\}/,'la sección pasa la navegación');
assert.match(shell,/<HistorialSection user=\{user\} navigate=\{setActive\}\/>/,'el shell cablea la navegación del historial');
assert.match(projects,/action=\{projectClientFilter \? <Button type="button" variant="outline" onClick=\{\(\)=>setProjectClientFilter\(''\)\}>Limpiar filtro<\/Button> : undefined\}/,'el vacío filtrado limpia el filtro');
assert.match(inventory,/<EmptyState icon="calendar" title="Sin reservas en este mes\." description="Elegí equipos y fechas para planificar una producción\." action=\{/,'las reservas vacías ofrecen reservar');
assert.match(inventory,/<EmptyState icon="box" title="No hay equipos para mostrar en el pipeline\." description="Arrastrá los equipos entre ubicaciones para ordenar dónde se guarda cada uno\." action=\{/,'el pipeline vacío ofrece agregar equipo');
assert.match(studio,/title="No hay reservas en este mes\." description="Elegí un espacio y una franja para reservarlo\." action=\{/,'el estudio vacío ofrece reservar');

// Un fallo de acción no reemplaza el contenido cargado (inventario y estudio).
assert.match(inventory,/const error=loadError;/,'el error de acción no bloquea la vista del inventario');
assert.doesNotMatch(inventory,/const error=actionError\|\|loadError;/);
assert.match(inventory,/\{actionError\?<Aviso tono="error">\{actionError\}<\/Aviso>:null\}/,'el error de acción se avisa aparte');
assert.match(inventory,/\{refreshError\?<Aviso tono="warn">/,'el refresco fallido no borra lo visible');
assert.match(inventory,/\{error\?<ErrorState title="No se pudo cargar el inventario\." description=\{error\} onRetry=\{\(\)=>setRefresh\(n=>n\+1\)\}\/>:null\}/);
assert.match(inventory,/\{loading&&!error\?<LoadingBlock label="Cargando inventario…" lines=\{6\}\/>:null\}/,'la carga del inventario vale para las dos vistas');
assert.match(inventory,/\{view==='reservations'&&!loading&&!error\?<Card/,'las reservas esperan la carga y el error');
assert.match(inventory,/await api<\{verified:number\}>|data\.verified\?\?/,'verificar en lote usa el conteo del API');
assert.match(studio,/const error=loadError;/,'el error de acción no bloquea la vista del estudio');
assert.match(studio,/\{actionError\?<Aviso tono="error">\{actionError\}<\/Aviso>:null\}/,'el error del lote se muestra en el estudio');
assert.match(studio,/\{actionError\?<Aviso tono="error" className="mt-3">\{actionError\}<\/Aviso>:null\}/,'el error del lote se muestra dentro del modal');

// ── §15.4 Toque 44: los controles propios de OPS crecen en móvil.
assert.match(inventory,/<button type="button" className="flex min-h-11 min-w-0 items-center gap-2 text-left md:min-h-0" title=\{`Abrir detalle/,'la tarjeta del pipeline tiene target de 44 px');
assert.match(projectCard,/className="mt-0\.5 flex min-h-11 min-w-0 items-center text-left/,'la identidad del proyecto tiene target de 44 px');

// ── §15.6 Microcopy es-PY.
assert.match(planner,/\{key:'checklist',label:'Pasos',align:'end'\}/,'la columna del planificador dice Pasos');
assert.doesNotMatch(planner,/label:'Checklist'/,'no queda el anglicismo Checklist');
assert.match(planner,/título \| día del mes \| horas estimadas \| pasos opcionales/,'la plantilla se explica en es-PY');
assert.equal(traceLabel('custom.event'),'Movimiento registrado','un evento nuevo se dice en es-PY');
assert.equal(STUDIO_PRODUCTION_TYPES.find(type=>type.value==='ads')?.label,'Publicidad','el tipo de producción no queda en inglés');
assert.match(history,/export const internalTaskStatusLabel=\(status:string\)=>internalTaskStatuses\[status\]\|\|'Sin estado';/,'un estado nuevo no se inventa');

// ── §15.11 Rendimiento: las listas sin paginación del API se acotan igual.
assert.match(history,/export const INTERNAL_TASKS_WINDOW=50;/);
assert.match(history,/const visible=rows\.slice\(0,INTERNAL_TASKS_WINDOW\);/);
assert.match(history,/Mostrando \{visible\.length\} de \{rows\.length\} pendientes internos\./,'el resto de la lista se avisa');
assert.match(planner,/visible\.slice\(0,100\)/,'el planificador no monta más de 100 filas');
assert.match(planner,/Mostrando 100 de \{visible\.length\}/);
assert.match(kanban,/\{hasMore && onLoadMore \? <button/, 'el tablero conserva «Ver más» por columna');

console.log('PASS: §15 transversales en Operaciones — estados honestos, vacíos con acción, reintento, microcopy es-PY, targets 44 y listas acotadas (#86).');
