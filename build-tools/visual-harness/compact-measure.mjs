#!/usr/bin/env node
/*
 * Medición del pase de compactación desktop (#89, SOS-DSN).
 *
 * Mide, sobre el artifact del harness visual (markup real + CSS construido), la
 * geometría de los primitivos compartidos: fila de encabezado, tabs, KPIs,
 * toolbars y contenedores. Sirve para fijar los criterios con números y para el
 * antes/después de cada cambio.
 *
 * Uso:
 *   node build-tools/visual-harness/compact-measure.mjs --label antes
 *   node build-tools/visual-harness/compact-measure.mjs --width 390 --label antes-mobile
 *   node build-tools/visual-harness/compact-measure.mjs --only clientes,equipo,inventario
 */
import {createServer} from 'node:http';
import {readFileSync, existsSync, statSync, writeFileSync, mkdirSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = process.argv.slice(2);
function option(name, fallback = '') {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback;
}

const width = Number(option('width', '1440'));
const height = Number(option('height', '900'));
const input = resolve(repo, option('input', 'work/visual-harness/latest/audit.html'));
const label = option('label', `w${width}`);
const only = option('only', '').split(',').map(value => value.trim()).filter(Boolean);
if (!existsSync(input)) {
  console.error(`Falta ${input}. Corré antes: node build-tools/visual-harness/run.mjs --only <fixtures>`);
  process.exit(1);
}

/* Targets del pase: un selector primario + alias, con el criterio del issue. */
const TARGETS = [
  {key: 'header', label: 'Fila de encabezado', selectors: ['.workspace-page-header', '.ui-page-header'], criterio: '56–64 px en ≥1280'},
  {key: 'headerActions', label: 'Acciones del encabezado', selectors: ['.workspace-page-header .header-actions', '.ui-page-header .header-actions'], criterio: 'misma fila'},
  {key: 'tabs', label: 'Barra de tabs', selectors: ['.section-tabs'], criterio: 'horizontal compacta'},
  {key: 'tabsItem', label: 'Ítem de tab', selectors: ['.section-tabs > a'], criterio: '≥44 px en móvil'},
  {key: 'kpi', label: 'KPI', selectors: ['.ui-kpi', '.kpi-card', '.metric'], criterio: '112–140 px desktop'},
  {key: 'toolbar', label: 'Toolbar de filtros', selectors: ['[data-toolbar="filtros"]', '.client-directory-toolbar', '.team-filters'], criterio: 'una fila ≥1280, gap 12–16'},
  {key: 'card', label: 'Card', selectors: ['.ops-card', '.inventory-equipment', '.client-hub-card'], criterio: 'padding 16–20'},
  {key: 'panel', label: 'Panel/sección', selectors: ['.panel'], criterio: 'padding 16–24'},
];

const MEASURE_JS = `(() => {
 const TARGETS = ${JSON.stringify(TARGETS.map(({key, label, selectors, criterio}) => ({key, label, selectors, criterio})))};
 const round = (value) => Math.round(value * 10) / 10;
 const style = (node, property) => getComputedStyle(node).getPropertyValue(property);
 return [...document.querySelectorAll('[data-fixture]')].map((fixture) => {
  const rows = [];
  for (const target of TARGETS) {
   let node = null;
   for (const selector of target.selectors) { node = fixture.querySelector(selector); if (node) break; }
   if (!node) continue;
   const box = node.getBoundingClientRect();
   const count = target.selectors.reduce((total, selector) => total + fixture.querySelectorAll(selector).length, 0);
   const heights = [...fixture.querySelectorAll(target.selectors.join(','))].map((element) => round(element.getBoundingClientRect().height));
   rows.push({
    key: target.key, label: target.label, criterio: target.criterio,
    selector: target.selectors.find((selector) => fixture.querySelector(selector)) || target.selectors[0],
    height: round(box.height), min: Math.min(...heights), max: Math.max(...heights), count,
    paddingTop: style(node, 'padding-top'), paddingBottom: style(node, 'padding-bottom'),
    paddingInline: style(node, 'padding-left') + '/' + style(node, 'padding-right'),
    gap: style(node, 'gap'), wrap: style(node, 'flex-wrap'),
   });
  }
  return {fixture: fixture.getAttribute('data-fixture'), section: fixture.getAttribute('data-section'), rows};
 });
})()`;

const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json'};
const server = createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidates = pathname.startsWith('/fonts/') || pathname.startsWith('/brand/')
    ? [join(repo, 'public', pathname)]
    : [join(dirname(input), pathname), join(repo, 'public', pathname)];
  for (const candidate of candidates) {
    if (existsSync(candidate) && !candidate.endsWith('/') && statSync(candidate).isFile()) {
      response.writeHead(200, {'Content-Type': mime[extname(candidate)] || 'application/octet-stream'});
      response.end(readFileSync(candidate));
      return;
    }
  }
  response.writeHead(404).end('not found');
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));

const chrome = await launchChrome({chromePath: process.env.CHROME_PATH || defaultChromePath});
const cdp = await openTarget(chrome.port);
try {
  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile: width < 768, screenWidth: width, screenHeight: height});
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/audit.html`});
  await loaded;
  await cdp.evaluate('document.fonts.ready.then(() => true)');
  const fixtures = await cdp.evaluate(MEASURE_JS);
  const selected = fixtures.filter((fixture) => !only.length || only.some((value) => String(fixture.fixture).includes(value)));
  const outDir = resolve(repo, 'work/visual-harness');
  mkdirSync(outDir, {recursive: true});
  const jsonPath = join(outDir, `compact-${label}.json`);
  writeFileSync(jsonPath, `${JSON.stringify({width, height, label, fixtures: selected}, null, 1)}\n`);
  console.log(`# Medición compacta ${label} · ${width}×${height} px\n`);
  for (const fixture of selected) {
    console.log(`\n## ${fixture.fixture} (${fixture.section})`);
    console.log('| target | selector | alto | rango | n | padding | gap | wrap |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const row of fixture.rows) {
      console.log(`| ${row.label} | \`${row.selector}\` | ${row.height}px | ${row.min}–${row.max} | ${row.count} | ${row.paddingTop}/${row.paddingBottom} ${row.paddingInline} | ${row.gap} | ${row.wrap} |`);
    }
  }
  console.log(`\nJSON: ${jsonPath}`);
} finally {
  cdp.close();
  server.close();
  await chrome.close();
}
