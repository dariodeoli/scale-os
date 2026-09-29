import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #99 Densidad integral en Operaciones — guarda del pase.
// Fija lo que la auditoría dejó corregido sobre #89–#96: tarjetas del tablero sin
// redundancias, tarjetas de equipo/proyecto sin altura artificial, responsables en
// una línea compacta, selección masiva contextual y metadatos con salida (tooltip).
// La medición del pliegue y las capturas viven en docs/qa/densidad-ops/README.md.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const board=read('app/production-board.tsx');
const inventory=read('app/inventory-workspace.tsx');
const projects=read('app/sections/proyectos.tsx');
const studio=read('app/studio-workspace.tsx');
const planner=read('app/productivity-ui.tsx');
const projectCard=read('app/project-card.tsx');
const assigned=read('app/assigned-people.tsx');
const assignedCss=read('app/assigned-people.css');
const history=read('app/work-history.tsx');

// ── Tablero: la etapa vive en la columna y la auditoría en el detalle.
assert.doesNotMatch(board,/STATUS_TONE\[order\.status\]/,'la tarjeta no repite el chip de etapa');
assert.doesNotMatch(board,/Actualizada \{fechaLista/,'la tarjeta no repite la fecha de auditoría');
assert.match(board,/title=\{`Horas: \$\{hours\}`\}/,'las horas viajan con su tooltip');
assert.match(board,/aria-label=\{`\$\{order\.checklist_completed\|\|0\} de \$\{order\.checklist_total\} pasos completados`\}/,'los pasos conservan su etiqueta accesible');
assert.match(board,/<DndContext|<DraggableOrder/,'la tarjeta sigue siendo arrastrable');
assert.match(board,/STATUS_TONE\[status\.id\]/,'la columna conserva su badge de etapa');

// ── Sin altura artificial en las tarjetas del dominio (#99).
assert.doesNotMatch(inventory,/min-h-\[200px\]/,'la tarjeta de equipo no reserva altura');
assert.doesNotMatch(projectCard,/min-h-\[200px\]/,'la tarjeta de proyecto no reserva altura');

// ── Responsables: una línea compacta, sin caja ni altura reservada.
assert.match(assigned,/className="assigned-people-label">\{inherited\?'Responsables del proyecto':'Responsables'\}/,'el rótulo de responsables es inline');
assert.match(assigned,/assigned-people-state" role="status">Cargando responsables…/,'la carga es una línea auxiliar');
assert.match(assigned,/assigned-people-state" role="status" title=\{error\|\|undefined\}>Responsables no disponibles/,'el faltante es una línea con tooltip del motivo');
assert.match(assignedCss,/\.assigned-people\{display:flex/,'los responsables no vuelven a ser una caja');
assert.doesNotMatch(assignedCss,/\.assigned-people\{[^}]*border:1px solid/,'sin borde de caja');

// ── Selección masiva contextual (solo con selección).
assert.match(planner,/\{selected\.length\?<><button className="secondary" onClick=\{\(\)=>setBatch\(true\)\}>Cambiar \{selected\.length\} piezas<\/button>/,'el lote del planificador aparece con la selección');
assert.match(planner,/\{managers\.includes\(role\)\?<button className="text-button" onClick=\{\(\)=>setTemplatesOpen\(true\)\}/,'las plantillas siguen accesibles sin selección');
assert.match(inventory,/\{view!=='reservations'&&selectedItems\.length\?<div className="flex flex-wrap items-center justify-between/,'el lote del inventario es contextual');
assert.match(projects,/\{canManageProjects&&selectedProjects\.length\?<div className="bulk-bar"/,'el lote de proyectos es contextual');
assert.match(studio,/\{selectedReservations\.length\?<div className="bulk-bar"/,'el lote del estudio es contextual');

// ── Metadatos y notas con salida (tooltip), sin recortes mudos.
assert.match(studio,/line-clamp-2 text-xs leading-5 text-mute" title=\{space\.notes\}/,'las notas del espacio tienen tooltip');
assert.doesNotMatch(studio,/max-h-10 overflow-hidden/,'no quedan notas recortadas sin salida');

// ── Densidad de calendarios (56 px en desktop) y encabezados en una fila.
assert.match(studio,/min-\[769px\]:min-h-14/,'el calendario del estudio es denso en desktop');
assert.match(inventory,/min-\[769px\]:min-h-14/,'el calendario de inventario es denso en desktop');
assert.match(inventory,/<Label htmlFor="inventory-calendar-month" className="whitespace-nowrap">Mes<\/Label>/,'el mes del inventario comparte la fila');
assert.match(history,/<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">/,'el encabezado del historial sigue en una fila');

// ── Nada de mega-cards para una fila de controles.
assert.match(inventory,/data-inventory-toolbar/,'el toolbar del inventario sigue fuera de una card');
assert.match(projects,/<FilterToolbar className="mb-0"/,'la toolbar de proyectos no agrega margen propio');
assert.match(planner,/label:'Pasos'/,'el planificador conserva el microcopy es-PY');

console.log('PASS: densidad #99 en Operaciones — tablero sin redundancias, tarjetas sin altura artificial, responsables compactos y selección contextual.');
