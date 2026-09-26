import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionPath,parentSection,childSections} from '../app/navigation';
import {visibleModule} from '../app/workspace-access';
// El tablero v2 vive en app/production-board.tsx + app/sections/produccion.tsx.
// La hoja `production-focus.css` se retiró (issue #66): el contrato real se mide
// sobre la fuente v2.
const board=readFileSync('app/production-board.tsx','utf8');
const section=readFileSync('app/sections/produccion.tsx','utf8');
assert(section.includes('flex snap-x snap-mandatory gap-3 overflow-x-auto'),'el tablero scrollea por bloques con snap');
assert(section.includes('role="region" aria-label="Tablero de Producción, desplazable por bloques de etapas"'),'el tablero es una región desplazable etiquetada');
assert(board.includes('w-[calc((100%-(var(--board-cols)-1)*0.75rem)/var(--board-cols))] shrink-0'),'las columnas fluidas conservan su ancho por página (nada de auto por tarjeta)');
assert(!board.includes('max-h-')&&!board.includes('overflow-y-auto'),'las columnas no scrollean por dentro: la página es el scroll');
assert(board.includes('flex-col gap-2 rounded-xl border'),'las columnas tienen contenedor redondeado propio');
const ui=readFileSync('app/scale-workspace.tsx','utf8')+readFileSync('app/production-board.tsx','utf8');
assert(!ui.includes('Enlace directo a Producción'));
assert(!ui.includes('<summary>Detalles y acciones</summary>'));
assert(ui.includes('Ver más'));
assert.equal(sectionPath('Actividad'),'/equipo/actividad');
assert.equal(sectionPath('Historial de trabajo'),'/equipo/historial');
assert.equal(parentSection('Actividad'),'Equipo');
assert(childSections('Equipo').includes('Historial de trabajo'));
assert(!visibleModule('Actividad','editor'));
assert(visibleModule('Historial de trabajo','editor'),'el historial propio lo ve cualquier rol (API)');
assert(visibleModule('Historial de trabajo','viewer'));
console.log('PASS: page-scrolling production, rounded headers, visible editing and permission-preserving team tabs');
