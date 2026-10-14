import assert from 'node:assert/strict';
import {teamWorkspaceSource} from './team-source';

// #110 Equipo · Personas (vista Lista): el nombre debe verse completo.
// Desde #186 la lista es un `ListGrid` v2: la columna Persona tiene la mayor
// porción de la plantilla y la identidad (`PersonContainer`) recorta el cargo
// antes que el nombre. La medición real (scrollWidth vs clientWidth) y las
// capturas antes/después viven en docs/qa/equipo-nombres/README.md.

const team=teamWorkspaceSource();

const template=team.match(/const TEAM_TEMPLATE='grid-cols-\[([^']+)\]'/)?.[1];
assert.ok(template,'la lista declara su plantilla única');
const columns=template!.split('_');
assert.equal(columns.length,5,'la plantilla mantiene sus 5 columnas (Persona · Datos · Estado · Acceso · Acciones)');

// Persona: la mayor porción relativa y un mínimo que no corta nombres de dos
// palabras con su cargo al lado.
const persona=columns[0].match(/minmax\(([\d.]+)rem,([\d.]+)fr\)/);
assert.ok(persona,'la columna Persona es flexible');
assert.ok(Number(persona![1])>=12,`Persona reserva al menos 12rem (hoy ${persona![1]}rem)`);
const frs=columns.map(column=>Number(column.match(/,([\d.]+)fr\)/)?.[1]||0));
assert.equal(frs[0],Math.max(...frs),'Persona tiene el mayor factor de crecimiento');

// La identidad comparte el contenedor de persona (nombre + cargo) y conserva el
// nombre completo en el tooltip; el recorte lo resuelve `person-container.css`.
assert.match(team,/<PersonContainer size="md" name=\{facts\.name\} photoUrl=\{facts\.photo\|\|undefined\} secondary=\{facts\.secondary\} verified\/>/,'la fila comparte el contenedor de persona con nombre y cargo');
assert.match(team,/<div className="min-w-0" title=\{facts\.name\}>/,'el nombre truncado conserva su tooltip');

// Correo y datos: pueden truncar, pero con `title` como salida.
assert.match(team,/text-\[12px\] leading-tight text-mute" title=\{\[facts\.emailTitle\|\|facts\.email,\.\.\.facts\.meta\]\.join\(' · '\)\}/,'el correo truncado conserva su tooltip');

// Tarjeta: el nombre se lee completo (el título de CompactCard no se trunca).
assert.match(team,/title=\{<PersonContainer size="md" name=\{facts\.name\}/,'la cuadrícula usa el mismo contenedor de persona');

console.log('PASS: #110 — Equipo · Personas prioriza la columna Persona, el nombre no se corta en la vista Lista y el cargo trunca primero con tooltip.');
