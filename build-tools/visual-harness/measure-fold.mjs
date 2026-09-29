#!/usr/bin/env node
/*
 * Medidor del pliegue (#94): para cada fixture elegido y cada ancho, dice cuánto
 * espacio ocupan los encabezados/toolbars antes del primer contenido real y
 * cuántas filas/cards entran completas en el alto pedido (1440x900, 390x844).
 *
 *   node build-tools/visual-harness/measure-fold.mjs --fixtures produccion-tablero,proyectos-lista \
 *     --widths 1440,390 --heights 900,844
 *
 * Reutiliza el artefacto de `run.mjs` (work/visual-harness/latest/audit.html) y la
 * emulación de Chrome del harness. El contenido real se detecta por los anclajes
 * que ya usan los fixtures/las pantallas: `[data-list-row]`, `[data-grid-card]`,
 * `[data-board-card]`, `[data-order]`, `[data-list-head]`.
 */
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const fixtures = option('fixtures', 'produccion-tablero,proyectos-lista,estudio-reservas-lista,equipo-historial').split(',').map(value => value.trim()).filter(Boolean);
const widths = option('widths', '1440,390').split(',').map(value => Number(value.trim())).filter(Boolean);
const heights = option('heights', '900,844').split(',').map(value => Number(value.trim())).filter(Boolean);
const htmlPath = resolve(repo, option('input', 'work/visual-harness/latest/audit.html'));
if (!existsSync(htmlPath)) {
  console.error('Corré `node build-tools/visual-harness/run.mjs` primero (necesita work/visual-harness/latest/audit.html).');
  process.exit(1);
}
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json'};
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
  response.writeHead(404);
  response.end('not found');
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
const loaded = cdp.once('Page.loadEventFired');
await cdp.send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/`});
await loaded;
await cdp.evaluate('document.fonts.ready.then(() => true)');

const rows = [];
for (let index = 0; index < widths.length; index += 1) {
  const width = widths[index];
  const height = heights[Math.min(index, heights.length - 1)];
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height});
  await new Promise(done => setTimeout(done, 120));
  const available = await cdp.evaluate(`[...document.querySelectorAll('[data-fixture]')].map(element => element.getAttribute('data-fixture'))`);
  for (const id of fixtures) {
    if (!available.includes(id)) {
      rows.push({width, height, fixture: id, estado: 'no está en el artefacto'});
      continue;
    }
    const data = await cdp.evaluate(`(() => {
      const fixtures = [...document.querySelectorAll('[data-fixture]')];
      fixtures.forEach(element => { element.style.display = element.getAttribute('data-fixture') === ${JSON.stringify(id)} ? '' : 'none'; });
      const element = document.querySelector('[data-fixture=${JSON.stringify(id)}]');
      const panel = element.querySelector('main.shell section.content > div:not(.workspace-topbar) > div') || element;
      const rect = node => node.getBoundingClientRect();
      const anchors = [...panel.querySelectorAll('[data-list-row],[data-grid-card],[data-board-card],[data-order],[data-list-head],[role="rowgroup"]>[role="row"],ol>li')];
      const top = rect(panel).top;
      const first = anchors.length ? anchors[0] : null;
      const filas = anchors.filter(node => rect(node).bottom <= ${height} && rect(node).height > 8);
      const antesDelContenido = first ? Math.round(rect(first).top - top) : null;
      const primerAncla = first ? (first.getAttribute('data-list-row') || first.getAttribute('data-grid-card') || first.getAttribute('data-board-card') || first.getAttribute('data-order') || first.getAttribute('data-list-head')) : null;
      fixtures.forEach(node => { node.style.display = ''; });
      return {
        antesDelContenido,
        filasEnPliegue: filas.length,
        primerAncla,
        _debug: {panel: (panel.className || '').toString().slice(0, 40), panelTop: Math.round(top), anclas: anchors.length},
      };
    })()`);
    rows.push({width, height, fixture: id, ...data});
  }
}
console.log(JSON.stringify(rows, null, 1));
cdp.close();
await chrome.close();
server.close();
