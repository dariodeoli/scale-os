import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// #110 Equipo · Personas (vista Lista): el nombre debe verse completo.
// La columna Persona tiene la mayor porción de la plantilla y, dentro de la
// identidad, el nombre no cede ancho: el cargo (secundario) absorbe el recorte
// primero y el nombre sólo entra en ellipsis como último recurso.
// La medición real (scrollWidth vs clientWidth) y las capturas antes/después
// viven en docs/qa/equipo-nombres/README.md.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const css=read('app/operations.css');
const operations=read('app/operations.tsx');

const template=css.match(/--person-cols:([^}]+)}/)?.[1]?.trim();
assert.ok(template,'la fila finita declara --person-cols');
const columns=template!.split(/\s+(?=minmax\(|[0-9.]+rem)/).map(column=>column.trim());
assert.equal(columns.length,7,'la plantilla mantiene sus 7 columnas');

// Persona: la mayor porción relativa y un mínimo que ya no corta nombres de dos
// palabras con su cargo al lado.
const persona=columns[0].match(/minmax\(([\d.]+)rem,([\d.]+)fr\)/);
assert.ok(persona,'la columna Persona es flexible');
assert.ok(Number(persona![1])>=12,`Persona reserva al menos 12rem (hoy ${persona![1]}rem)`);
const frs=columns.map(column=>Number(column.match(/,([\d.]+)fr\)/)?.[1]||0));
assert.equal(frs[0],Math.max(...frs),'Persona tiene el mayor factor de crecimiento');

// El nombre no cede ancho: flex-shrink 1 contra el 999 del cargo y ellipsis sólo
// como último recurso (la columna y el `title` siguen siendo la salida).
assert.match(css,/\.person-hub-card\.is-list \.person-container-name\{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap/,'el nombre conserva su ancho y sólo trunca como último recurso');
assert.match(css,/\.person-hub-card\.is-list \.person-container-secondary\{flex:0 999 auto;min-width:3\.5rem/,'el cargo absorbe el recorte primero, con un mínimo visible');
assert.match(operations,/<PersonContainer size="md" name=\{p\.full_name\}[\s\S]{0,140}secondary=\{p\.job_title\|\|'Sin cargo'\}/,'la fila finita comparte el contenedor de persona con nombre y cargo');

// Correo: puede truncar, pero con `title` como salida.
assert.match(operations,/<p className="person-hub-mail" title=\{p\.email\|\|undefined\}>/,'el correo truncado conserva su tooltip');

// Móvil (≤860 px) la fila se apila: el nombre envuelve y no se corta.
assert.match(css,/\.person-hub-card\.is-list \.person-container-name\{overflow:visible;text-overflow:clip;white-space:normal/,'en móvil el nombre envuelve completo');

// El encabezado de columnas comparte la misma plantilla que las filas.
assert.match(css,/\.person-hub-head-row\{display:grid;grid-template-columns:var\(--person-cols\)/,'el encabezado usa la misma plantilla');

console.log('PASS: #110 — Equipo · Personas prioriza la columna Persona, el nombre no se corta en la vista Lista y el cargo trunca primero con tooltip.');
