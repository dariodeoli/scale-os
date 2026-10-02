import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #90 Inventario compacto — guarda de layout del pase de compactación.
// El toolbar no vuelve a una card contenedora, la fila principal es una sola
// fila en ≥1280, la atención explica solo al expandir y la vista/selección
// quedan como controles secundarios. La medición antes/después vive en
// docs/qa/compact-inventario/README.md (top del contenido → primer equipo).

const source=readFileSync(new URL('../app/inventory-workspace.tsx',import.meta.url),'utf8');
const fixture=readFileSync(new URL('../build-tools/visual-harness/fixtures/ops-inventario-estudio.mjs',import.meta.url),'utf8');

// ── El toolbar es hijo directo del panel: sin card contenedora.
const panelStart=source.indexOf('return <div className="grid min-w-0 gap-4">');
const toolbarStart=source.indexOf('data-inventory-toolbar');
assert(panelStart>=0&&toolbarStart>panelStart,'el toolbar vive en el panel de inventario');
assert.doesNotMatch(source.slice(panelStart,toolbarStart),/<Card/,'el toolbar no vuelve a una card contenedora (#90)');
assert.match(source,/data-inventory-toolbar/,'el toolbar queda identificado para el contrato');

// ── Una fila principal en ≥1280, con los controles y las acciones a la derecha.
assert.match(source,/flex min-w-0 flex-wrap items-end gap-3 xl:flex-nowrap/,'la fila principal no envuelve en ≥1280');
assert.match(source,/<div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto">/,'contador y acciones cierran la fila principal');
assert.match(source,/Agregar equipo<\/Button>/);
assert.match(source,/Reservar equipos<\/Button>/);
assert.match(source,/\[&>button\]:whitespace-nowrap/,'los tabs no parten su texto');

// ── Chips de atención con explicación solo al expandir.
assert.match(source,/aria-expanded=\{attentionHelp\}/,'la explicación tiene estado expandible');
assert.match(source,/attentionHelp\?<Nota tono="info" compact/,'la explicación es una nota compacta y condicional');
assert.doesNotMatch(source,/basis-full text-\[11px\] leading-4 text-mute">Control pendiente/,'la explicación no vuelve a ser un párrafo fijo');
assert.match(source,/className="text-button" onClick=\{selectVisible\}>Seleccionar visibles<\/button>/,'Seleccionar visibles es una acción secundaria discreta');
assert.match(source,/ariaLabel="Vista de inventario"/,'el selector de vista sigue siendo el objeto compartido');
assert.match(source,/\{visible\.length\} de \{items\.length\}\{updatedAt\?` · \$\{updatedAt\}`:''\}/,'el contador es compacto');
assert.match(source,/title=\{`Mostrando \$\{visible\.length\} de \$\{items\.length\} equipos/,'el detalle del contador vive en el tooltip');

// ── Etiqueta de Categoría en línea en desktop (sin apilar en la fila).
assert.match(source,/\[&>div\]:lg:!flex \[&>div\]:lg:items-center \[&>div\]:lg:gap-2 \[&_\.ops-label\]:lg:mb-0 \[&_\.ops-label\]:lg:whitespace-nowrap/,'el select de categoría alinea su rótulo en desktop');

// ── Mobile: tabs con scroll horizontal y targets de 44 px.
assert.match(source,/max-lg:flex-nowrap/,'los tabs no envuelven a una segunda línea en mobile (#137)');
assert.match(source,/<TabScroller[^>]*label="vistas"/,'los tabs usan el carril desplazable con chevrones (#137)');
assert.match(source,/\[&>button\]:min-h-11/,'los tabs conservan el target de 44 px en mobile');
assert.match(source,/min-w-\[8rem\] flex-1 lg:max-w-72/,'la búsqueda es flexible y no empuja la fila');

// ── El fixture del harness mide las dos caras del antes/después.
assert.match(fixture,/id: 'inventario-equipos-lista-antes-90'/,'el fixture conserva la referencia del antes para reproducir la medición');
assert.match(fixture,/id: 'inventario-equipos-lista'/);
assert.doesNotMatch(fixture.slice(fixture.indexOf("id: 'inventario-equipos-lista',"),fixture.indexOf("id: 'inventario-equipos-cuadricula'")),/rounded-xl border border-fono\/30 bg-ink-800 p-5"><div class="grid min-w-0 gap-3">\$\{inventoryToolbar\}<\/div><\/div>/,'el fixture no mide el toolbar dentro de una card');

console.log('PASS: inventario compacto (#90) — toolbar sin card, fila única en ≥1280, atención expandible, contador compacto y targets mobile.');
