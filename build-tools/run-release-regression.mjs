/*
 * Runner de la cadena de regresión (issue #160).
 *
 * La cadena ya no vive en una línea de `package.json`: se arma con los
 * fragmentos `tests/release-regression.d/*.list` (orden lexicográfico, una
 * entrada por línea). Cada rama que suma tests crea SU PROPIO fragmento
 * (`<NN>-<slot>-<issue>.list`) en vez de editar un archivo compartido, así no
 * hay conflicto al integrar. El archivo `00-base.list` es el preludio histórico.
 *
 * Uso:
 *   npm run test:release-regression          # cadena completa, fail-fast
 *   node build-tools/run-release-regression.mjs --list
 *   node build-tools/run-release-regression.mjs --only seo-158
 */
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(repo, 'tests/release-regression.d');
const args = process.argv.slice(2);
const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? (args[i + 1] || '') : null; };
const list = args.includes('--list');
const only = flag('only');

if (!existsSync(dir)) {
  console.error(`Falta ${dir}. Restaurá los fragmentos de la cadena de regresión.`);
  process.exit(1);
}
const entries = [];
for (const file of readdirSync(dir).filter(name => name.endsWith('.list')).sort()) {
  for (const raw of readFileSync(join(dir, file), 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    entries.push({line, file});
  }
}
if (!entries.length) {
  console.error('La cadena de regresión está vacía: revisá tests/release-regression.d/*.list');
  process.exit(1);
}
const selected = only ? entries.filter(entry => entry.line.includes(only)) : entries;
if (only && !selected.length) {
  console.error(`--only ${only} no coincide con ninguna entrada (${entries.length} en total).`);
  process.exit(1);
}

if (list) {
  for (const entry of selected) console.log(`${entry.line}  [${entry.file}]`);
  console.log(`\n${selected.length} entradas (${entries.length} en la cadena).`);
  process.exit(0);
}

const bin = name => {
  const local = join(repo, 'node_modules/.bin', name);
  return existsSync(local) ? local : name;
};
for (const [index, entry] of selected.entries()) {
  const number = `[${index + 1}/${selected.length}]`;
  console.log(`\n${number} ${entry.line}  (${entry.file})`);
  let command, commandArgs;
  if (entry.line.startsWith('npm ')) {
    command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    commandArgs = entry.line.split(' ').slice(1);
  } else {
    const [runner, ...rest] = entry.line.split(/\s+/);
    if (!['node', 'tsx'].includes(runner)) {
      console.error(`Entrada inválida en ${entry.file}: ${entry.line}`);
      process.exit(1);
    }
    command = runner === 'node' ? process.execPath : bin('tsx');
    commandArgs = rest;
  }
  const result = spawnSync(command, commandArgs, {cwd: repo, stdio: 'inherit', env: process.env});
  if (result.error) {
    console.error(`\n✖ No se pudo ejecutar ${entry.line}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`\n✖ Falló ${entry.line} (exit ${result.status})`);
    process.exit(result.status || 1);
  }
}
console.log(`\nPASS: cadena de regresión completa (${selected.length} entradas en ${new Set(entries.map(entry => entry.file)).size} fragmentos).`);
