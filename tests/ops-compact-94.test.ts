import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #94 Compactación del resto de Operaciones — guarda de layout.
// Fija lo que el pase deja armado: encabezados y toolbars en una fila en desktop,
// barras de lote que aparecen con la selección (sin ocupar alto cuando no hay),
// encabezados con descripción truncada + tooltip y calendario del estudio más denso.
// La medición del pliegue vive en docs/qa/compact-ops/README.md.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const production=read('app/sections/produccion.tsx');
const projects=read('app/sections/proyectos.tsx');
const studio=read('app/studio-workspace.tsx');
const history=read('app/work-history.tsx');

// ── Producción: una fila en desktop, con el filtro de cliente en línea.
assert.match(production,/production-command-toolbar mb-4 flex min-w-0 flex-col gap-3 lg:mb-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-3/,'la barra de Producción va en una fila en desktop');
assert.match(production,/<label className="production-client-filter flex items-center gap-2">/,'el filtro de cliente va en línea');
assert.match(production,/<TabScroller className="production-view-tabs max-lg:min-w-0 max-lg:max-w-full lg:shrink-0" label="vistas">/,'los tabs scrollean con chevrones en mobile y no se comprimen en desktop (#137)');
assert.match(production,/<DndContext sensors=\{sensors\}/,'el tablero conserva el drag & drop');
assert.match(production,/<KanbanColumn/,'las columnas por etapa siguen siendo el objeto del tablero');

// ── Proyectos: toolbar en una fila y lote solo con selección.
assert.match(projects,/<FilterToolbar className="mb-0"/,'la toolbar de Proyectos no agrega margen propio');
assert.match(projects,/<label className="flex items-center gap-2">/,'el filtro de cliente de Proyectos va en línea');
assert.match(projects,/\{canManageProjects&&selectedProjects\.length\?<div className="bulk-bar"/,'el lote de Proyectos aparece con la selección');
assert.match(projects,/title=\{`Selecciona hasta \$\{BATCH_LIMITS\.projects\} proyectos visibles/,'el acceso directo conserva la pista en el title');

// ── Estudio: encabezado en una fila, calendario denso y lote con selección.
assert.match(studio,/<div className="flex min-w-0 flex-wrap items-center gap-3">\s*<h2 className="text-\[17px\] font-semibold tracking-tight text-fore">Calendario del estudio<\/h2>/,'el encabezado del Estudio va en una fila');
assert.match(studio,/min-\[769px\]:min-h-14/,'las celdas del calendario del estudio son más densas en desktop');
assert.match(studio,/<Label htmlFor="studio-month" className="whitespace-nowrap">Mes<\/Label>/,'el mes del estudio comparte la fila con su rótulo');
assert.match(studio,/\{selectedReservations\.length\?<div className="bulk-bar"/,'el lote del Estudio aparece con la selección');

// ── Historial: encabezado en una fila y filtros en línea.
assert.match(history,/<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">/,'el encabezado del Historial va en una fila');
assert.match(history,/className="min-w-0 flex-1 truncate text-xs leading-5 text-mute" title=\{source\?/,'la descripción del Historial se trunca con tooltip');
assert.match(history,/<FilterToolbar className="mb-0" summary=\{range\}>/,'la toolbar del Historial no agrega margen propio');
assert.match(history,/\[&>div\]:lg:!flex \[&>div\]:lg:items-center \[&>div\]:lg:gap-2 \[&_\.ops-label\]:lg:mb-0/,'los filtros del Historial van con rótulo en línea en desktop');
assert.match(history,/INTERNAL_TASKS_WINDOW=50/,'los pendientes internos conservan su ventana');

console.log('PASS: compactación de Operaciones (#94) — toolbars en una fila, lote con selección, encabezados compactos y calendario denso.');
