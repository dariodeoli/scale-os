import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #115 PDP en Operaciones — guarda de anonimato y minimización.
// Fija lo que deja el pase: fixtures y orígenes sin datos reales, proyecciones
// sin campos que ninguna UI lee y correos internos servidos por rol en los
// endpoints de OPS (mismo contrato que `/productivity/people`).

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const opsFixtures=['ops-inventario-estudio.mjs','ops-produccion-proyectos.mjs','ops-detalles-formularios.mjs']
 .map(name=>read(`build-tools/visual-harness/fixtures/${name}`)).join('\n');

// 1) Sin el elenco, clientes ni la persona real del harness anterior.
for(const banned of ['Fredd','Fabrizio','Dellacasa','Mical Herrera','Renée','Banco Atlas','Alicorp','Casa Rica','Visión Banco','Ministerio de Educación','Fundación Niñez','Cooperativa Multiactiva']){
 assert(!opsFixtures.includes(banned),`fixture OPS sin «${banned}»`);
}
assert(!read('build-tools/visual-harness/run.mjs').includes('Fredd'),'la persona del shell del harness ya no es real');
assert(!read('tests/loading-screen.test.tsx').includes('Fredd'),'el fixture de carga usa la persona demo');

// 2) El origen Trello quedó anonimizado (sin tablero, gente ni correo del dueño).
const source=read('backend/scale-source-data.mjs');
for(const banned of ['trello.com/b/OLqcnrOx','Eric Baccon','Ucraniano90','Jake Andino','Zampy','LEDBOX','Ponderoso','Tiendy','dariodeoli']){
 assert(!source.includes(banned),`origen Trello sin «${banned}»`);
}
assert(!read('backend/email-preview.mjs').includes('dariodeoli@gmail.com'),'el preview de correos usa un correo de ejemplo');

// 3) Proyecciones sin campos que ninguna UI lee.
const projection=read('app/api-projection.ts');
const reservationFields=projection.match(/INVENTORY_RESERVATION_FIELDS='([^']*)'/)?.[1]||'';
assert(reservationFields&&!reservationFields.includes('checkout_note')&&!reservationFields.includes('return_note'),'la reserva no pide notas sin lector');
assert(!read('app/inventory-data.ts').includes('event_data'),'el rastro no declara el campo muerto event_data');
assert(!read('app/inventory-workspace.tsx').includes('event_data'),'el detalle del inventario no lee event_data');

// 4) Correos internos por rol en los endpoints de OPS.
const assignees=read('backend/project-assignees.js');
assert.match(assignees,/case when \$4::boolean then i\.email else null end as email/,'los responsables ocultan el correo según el rol');
assert.match(assignees,/case when \$2::boolean then i\.email else null end as email/,'el selector de integrantes oculta el correo según el rol');
assert.match(read('backend/productivity.js'),/case when \$3::boolean then i\.email else null end as author_email/,'el comentario oculta el correo del autor según el rol');

// 5) El sello de verificación trunca dentro de su celda (fix del desborde).
assert.match(read('app/inventory-workspace.tsx'),/<span className="flex min-w-0 items-center gap-1\.5" data-tone=\{tone\}>/,'el sello de verificación es flexible y trunca el nombre');
assert.match(read('build-tools/visual-harness/fixtures/ops-inventario-estudio.mjs'),/class="flex min-w-0 items-center gap-1\.5"/,'el fixture espeja el sello corregido');

console.log('PASS pdp-ops: fixtures anonimizados, proyecciones sin campos muertos y contacto interno por rol.');
