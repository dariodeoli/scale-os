#!/usr/bin/env node
/*
 * Verificación de las tablas densas COM (ronda 14, #62, refs #43).
 *
 * Mide el `audit.html` del harness (mismo CSS construido y misma emulación que
 * `run.mjs`) y comprueba:
 *   - en la tabla densa, la columna de acciones queda fija al borde derecho
 *     (`position:sticky`, `right:0`) y nunca se corta del scroll silencioso;
 *   - el ancho scrolleable queda reportado (los montos se alcanzan con scroll);
 *   - la vista tarjeta de anchos medios conserva su contrato (≥200 px);
 *   - el vacío de Presupuestos expone el CTA contextual.
 *
 * Uso:
 *   node build-tools/visual-harness/run.mjs --only clientes,seccion-presupuestos --widths 390,1024,1280
 *   node build-tools/visual-harness/verify-com-tables.mjs --html work/visual-harness/latest/audit.html
 */
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = process.argv.slice(2);
const option = (name, fallback = '') => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
};
const htmlPath = resolve(repo, option('html', 'work/visual-harness/latest/audit.html'));
const widths = option('widths', '390,1024,1280').split(',').map(Number).filter(Boolean);
if (!existsSync(htmlPath)) {
  console.error(`Falta ${htmlPath}. Corré run.mjs primero (con --only clientes,seccion-presupuestos).`);
  process.exit(1);
}

const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml'};
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  const local = path === '/' ? htmlPath : resolve(repo, 'public', path.replace(/^\//, ''));
  if (local === htmlPath) {
    response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    response.end(readFileSync(local));
    return;
  }
  if (local.startsWith(resolve(repo, 'public')) && existsSync(local) && statSync(local).isFile()) {
    response.writeHead(200, {'content-type': mime[extname(local)] || 'application/octet-stream'});
    response.end(readFileSync(local));
    return;
  }
  response.writeHead(404).end('not found');
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));

const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
const loaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/`});
await loaded;
await cdp.evaluate('document.fonts.ready.then(() => true)');

const log = [];
let failed = false;
const check = (label, value, expected = true) => {
  const ok = value === expected;
  if (!ok) failed = true;
  log.push(`${ok ? '✓' : '✗'} ${label}: ${JSON.stringify(value)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`);
};
const note = (text) => log.push(`· ${text}`);

const measureTable = (fixture) => `(() => {
  const f = document.querySelector('[data-fixture="${fixture}"]');
  const table = f && f.querySelector('[role="table"]');
  if (!table) return null;
  const header = table.querySelector('[role="row"]');
  const row = table.querySelector('[role="rowgroup"] [role="row"]');
  const headerCell = header.lastElementChild;
  const cell = row.lastElementChild;
  const box = table.getBoundingClientRect();
  const cellBox = cell.getBoundingClientRect();
  const headerBox = headerCell.getBoundingClientRect();
  const style = getComputedStyle(cell);
  return {
    scrollWidth: table.scrollWidth,
    clientWidth: table.clientWidth,
    sticky: style.position,
    right: style.right,
    headerSticky: getComputedStyle(headerCell).position,
    cellWidth: Math.round(cellBox.width),
    cellScroll: cell.scrollWidth,
    cellClient: cell.clientWidth,
    cut: Math.max(0, Math.round(cellBox.right - box.right)),
    headerCut: Math.max(0, Math.round(headerBox.right - box.right)),
  };
})()`;

const measureCards = (fixture) => `(() => {
  const f = document.querySelector('[data-fixture="${fixture}"]');
  if (!f) return null;
  const cards = [...f.querySelectorAll('.budget-hub-card, .client-hub-card')];
  return {cards: cards.length, minHeight: cards.length ? Math.round(Math.min(...cards.map(card => card.getBoundingClientRect().height))) : 0};
})()`;

const tables = [
  ['clientes-lista', 'Clientes · lista'],
  ['seccion-presupuestos', 'Presupuestos · lista'],
  ['seccion-presupuestos-lote', 'Presupuestos · lote'],
];
const cards = [
  ['seccion-presupuestos-cuadricula', 'Presupuestos · tarjetas'],
  ['clientes-cuadricula', 'Clientes · tarjetas'],
];

for (const width of widths) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: 900, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: 900});
  await new Promise((done) => setTimeout(done, 120));
  for (const [fixture, label] of tables) {
    const data = await cdp.evaluate(measureTable(fixture));
    if (!data) { check(`${label} @${width}: fixture presente`, false, true); continue; }
    check(`${label} @${width}: acciones fijas (sticky right:0)`, data.sticky === 'sticky' && data.right === '0px');
    check(`${label} @${width}: encabezado de acciones fijo`, data.headerSticky === 'sticky');
    check(`${label} @${width}: sin corte de acciones`, data.cut, 0);
    check(`${label} @${width}: sin corte del encabezado`, data.headerCut, 0);
    if (data.scrollWidth <= data.clientWidth + 1) {
      check(`${label} @${width}: la celda de acciones no scrollea`, data.cellScroll <= data.cellClient + 1, true);
    }
    note(`${label} @${width}: ancho ${data.clientWidth} px · scroll ${data.scrollWidth} px · celda de acciones ${data.cellWidth} px (contenido ${data.cellScroll} px)`);
  }
  for (const [fixture, label] of cards) {
    const data = await cdp.evaluate(measureCards(fixture));
    if (!data || !data.cards) continue;
    check(`${label} @${width}: tarjetas ≥200 px`, data.minHeight >= 200, true);
    note(`${label} @${width}: ${data.cards} tarjetas · mínima ${data.minHeight} px`);
  }
}

const empty = await cdp.evaluate(`(() => {
  const f = document.querySelector('[data-fixture="seccion-presupuestos-vacio"]');
  if (!f) return null;
  const button = [...f.querySelectorAll('button')].find(node => /Nuevo presupuesto/.test(node.textContent || ''));
  return {fixture: true, cta: Boolean(button), copy: (f.textContent || '').includes('Todavía no hay presupuestos')};
})()`);
if (empty) {
  check('Presupuestos vacío: explicación honesta', empty.copy);
  check('Presupuestos vacío: CTA contextual', empty.cta);
}

console.log(log.join('\n'));
console.log(failed ? 'FALLÓ la verificación de tablas COM' : 'PASS tablas COM: acciones siempre visibles y tarjetas de anchos medios verificadas.');
cdp.close();
await chrome.close();
server.close();
process.exit(failed ? 1 : 0);
