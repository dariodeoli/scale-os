import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';

// Regresión real (3a7a646, 23-sep): un comentario sin cerrar en globals.css se
// comió la base de `.panel`, `.metric`, `.text-button`, etc. durante seis días.
// El build no avisa: descarta todo hasta el primer `*/`, así que las reglas base
// dejaron de publicarse y las superficies fuera del `.control-shell` (panel
// global, página de error) se quedaron sin el padding de la tarjeta.
const rootDir = fileURLToPath(new URL('..', import.meta.url));

function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    if (entry.isDirectory()) {
      if (['node_modules', '.next'].includes(entry.name)) continue;
      out.push(...cssFiles(join(dir, entry.name)));
    } else if (entry.name.endsWith('.css')) out.push(join(dir, entry.name));
  }
  return out;
}

function commentSpans(source: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let index = 0, open = -1;
  while (index < source.length) {
    const start = source.indexOf('/*', index), end = source.indexOf('*/', index);
    if (start === -1 && end === -1) break;
    if (start !== -1 && (end === -1 || start < end)) {
      if (open === -1) open = start;
      index = start + 2;
    } else {
      if (open !== -1) { spans.push([open, end + 2]); open = -1; }
      index = end + 2;
    }
  }
  if (open !== -1) spans.push([open, -1]);
  return spans;
}

function stripComments(source: string): string {
  let out = '', cursor = 0;
  for (const [start, end] of commentSpans(source)) {
    out += source.slice(cursor, start);
    cursor = end === -1 ? source.length : end;
  }
  return out + source.slice(cursor);
}

test('los comentarios CSS están cerrados y no se comen reglas', () => {
  const files = cssFiles(join(rootDir, 'app'));
  assert.ok(files.length >= 30, `app/: se esperaban las hojas del sistema (encontradas ${files.length})`);
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const relative = file.slice(rootDir.length + 1);
    for (const [start, end] of commentSpans(source)) {
      assert.notEqual(end, -1, `${relative}: comentario sin cerrar (el build descarta todo hasta el siguiente */)`);
      const text = source.slice(start, end);
      assert.doesNotMatch(text, /\n\s*[.#*][^\n{}]*\{[^{}]*:[^{}]*\}/, `${relative}: hay reglas CSS dentro de un comentario (¿comentario sin cerrar?)`);
    }
  }
});

test('globals.css publica sus reglas base fuera de los comentarios', () => {
  const source = stripComments(readFileSync(join(rootDir, 'app/globals.css'), 'utf8'));
  for (const rule of [
    '.panel{min-width:0;padding:clamp(18px,2.2vw,26px)',
    '.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))',
    '.text-button{padding:3px 0;',
    '.work-card{padding:12px;',
    '.empty-state{padding:72px 20px;',
  ]) assert.ok(source.includes(rule), `falta la regla base ${rule.slice(0, 26)}… fuera de comentarios`);
});
