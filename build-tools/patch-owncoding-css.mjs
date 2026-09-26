/*
 * Parche temporal del CSS de owncoding-ui (fundación v0.39, #75).
 *
 * v0.39.0/v0.40.0 publican un comentario con la secuencia `bg-*` seguida de
 * `/10-15`: ese `*` + `/` cierra el comentario antes de tiempo y PostCSS corta
 * el build con "Unknown word 10-15". Este script reescribe SOLO esa secuencia
 * de texto (`bg-*` + `/` → `bg-* /`) en `dist/styles.css` y `dist/tokens.css`;
 * no cambia ninguna regla. Corre en `postinstall` (npm ci / npm install) y es
 * idempotente. Se retira cuando la librería publique el tag corregido
 * (reportado en dariodeoli/owncoding-ui#6).
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';

const files = [
  'node_modules/owncoding-ui/dist/styles.css',
  'node_modules/owncoding-ui/dist/tokens.css',
];
const broken = 'bg-*' + '/';
let patched = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  if (!source.includes(broken)) continue;
  writeFileSync(file, source.replaceAll(broken, 'bg-* /'));
  patched += 1;
}
console.log(`owncoding-ui css: ${patched ? `${patched} archivo(s) corregido(s)` : 'sin cambios'}`);
