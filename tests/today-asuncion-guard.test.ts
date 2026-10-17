import assert from 'node:assert/strict';
import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {todayAsuncion} from '../app/client-format';

// «Hoy» de la empresa es el día civil de America/Asuncion (UTC-3), no el día UTC:
// después de las 21:00 locales `new Date().toISOString().slice(0,10)` ya es mañana.
assert.equal(todayAsuncion(new Date('2026-10-15T01:30:00Z')), '2026-10-14', 'a las 22:30 de Asunción sigue siendo hoy (el día UTC ya es mañana)');
assert.equal(new Date('2026-10-15T01:30:00Z').toISOString().slice(0, 10), '2026-10-15', 'el atajo UTC daría mañana en ese mismo instante');
assert.equal(todayAsuncion(new Date('2026-10-15T02:59:59Z')), '2026-10-14', 'último segundo del día local');
assert.equal(todayAsuncion(new Date('2026-10-15T03:00:00Z')), '2026-10-15', 'medianoche de Asunción cambia el día');
assert.equal(todayAsuncion(new Date('2027-01-01T02:30:00Z')), '2026-12-31', 'el borde de año también sigue el día local');
assert.match(todayAsuncion(), /^\d{4}-\d{2}-\d{2}$/);

// Guarda estática: en app/ ningún valor por defecto sale del día UTC. Los usos
// permitidos son aritmética o validación de fechas civiles ancladas en UTC a
// propósito (T00:00Z/T12:00Z o Date.UTC), donde el día UTC es el día civil.
const allowlist: Record<string, {count: number; why: string}> = {
  'app/blog-data.ts': {count: 1, why: 'valida AAAA-MM-DD ida y vuelta anclada a T12:00Z'},
  'app/client-commercial-lifecycle-data.ts': {count: 1, why: 'valida AAAA-MM-DD ida y vuelta'},
  'app/client-format.ts': {count: 1, why: 'addCivilDays: suma días civiles anclados a T12:00Z'},
  'app/client-reporting-data.ts': {count: 1, why: 'valida AAAA-MM-DD ida y vuelta'},
  'app/commercial-change-context.ts': {count: 1, why: 'valida una fecha civil escrita con round-trip UTC; el mes por defecto usa todayAsuncion'},
  'app/ia-cobro-data.ts': {count: 1, why: 'valida AAAA-MM-DD ida y vuelta anclada a T12:00Z'},
  'app/inventory-data.ts': {count: 1, why: 'aritmética de días civiles anclados a T00:00Z'},
  'app/production-filter.ts': {count: 2, why: 'semana civil calculada sobre T12:00Z'},
  'app/studio-data.ts': {count: 1, why: 'días del mes generados con Date.UTC'},
  'app/weekly-automatic.tsx': {count: 3, why: 'lunes y domingo de una semana civil anclada a T12:00Z'},
};
const root = join(__dirname, '..');
const files: string[] = [];
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(ts|tsx)$/.test(name)) files.push(path);
  }
};
walk(join(root, 'app'));
const utcDay = /toISOString\(\)\s*\.\s*(?:slice|substring|substr)\(\s*0\s*,\s*10\s*\)|toISOString\(\)\s*\.\s*split\(\s*['"]T['"]\s*\)\s*\[\s*0\s*\]/g;
const offenders: string[] = [];
for (const file of files) {
  const rel = relative(root, file).split('\\').join('/');
  const source = readFileSync(file, 'utf8');
  const count = source.match(utcDay)?.length ?? 0;
  if (/new Date\(\)\s*\.toISOString\(\)\s*\.\s*(?:slice|substring|substr|split)/.test(source)) offenders.push(`${rel}: «hoy» calculado en UTC; usá todayAsuncion()`);
  const allowed = allowlist[rel]?.count ?? 0;
  if (count > allowed) offenders.push(`${rel}: ${count} usos de toISOString() recortado a día (permitidos ${allowed}); usá todayAsuncion() o documentá el uso UTC en la allowlist`);
}
assert.deepEqual(offenders, [], offenders.join('\n'));
for (const [rel, entry] of Object.entries(allowlist)) assert.ok(entry.why.length > 0 && files.some(file => relative(root, file).split('\\').join('/') === rel), `${rel} sigue existiendo y su excepción está justificada`);

console.log('PASS: todayAsuncion devuelve el día de Asunción (22:30 local sigue siendo hoy) y app/ no calcula valores por defecto con el día UTC');
