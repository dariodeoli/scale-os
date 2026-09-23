#!/usr/bin/env node
/*
 * SOS-DSN visual harness runner.
 *
 * Loads the app's built CSS (exact shipped chunks), renders static fixtures
 * (or the shipped landing document) in headless Chrome through CDP, emulates
 * each target width and measures geometry: overflow, bleed, truncated text,
 * overlaps, row heights, header/row templates and collapsed columns.
 *
 * Usage:
 *   node build-tools/visual-harness/run.mjs                 # all fixtures, standard widths
 *   node build-tools/visual-harness/run.mjs --only clientes,equipo
 *   node build-tools/visual-harness/run.mjs --widths 390,768,1440
 *   node build-tools/visual-harness/run.mjs --out work/visual-harness/run1
 */
import {createServer} from 'node:http';
import {readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, statSync} from 'node:fs';
import {extname, join, resolve, dirname} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {launchChrome, openTarget, defaultChromePath} from './chrome.mjs';
import {buildFindings, renderBaselineMarkdown} from './report.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = process.argv.slice(2);
function option(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (value === undefined || value.startsWith('--')) return true;
  return value;
}

const widths = String(option('widths', '360,390,430,768,1024,1440'))
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const only = option('only', '');
const keep = Boolean(option('keep', false));
const outDir = resolve(repo, String(option('out', 'work/visual-harness/latest')));
const chromePath = String(option('chrome', process.env.CHROME_PATH || defaultChromePath));
const viewportHeight = Number(option('height', 900));

if (!existsSync(join(repo, '.next', 'static', 'css'))) {
  console.error('Missing .next/static/css. Run `npx next build` first (the harness needs the shipped CSS).');
  process.exit(1);
}

/* ------------------------------------------------------------------ CSS */
function shippedCss() {
  const cssDir = join(repo, '.next', 'static', 'css');
  const files = readdirSync(cssDir).filter((name) => name.endsWith('.css'));
  const order = [];
  const routeHtml = join(repo, '.next', 'server', 'app', 'index.html');
  if (existsSync(routeHtml)) {
    const html = readFileSync(routeHtml, 'utf8');
    for (const match of html.matchAll(/\/_next\/static\/css\/([^"]+\.css)/g)) {
      if (!order.includes(match[1])) order.push(match[1]);
    }
  }
  for (const name of files.sort()) if (!order.includes(name)) order.push(name);
  return order.map((name) => `/* ${name} */\n${readFileSync(join(cssDir, name), 'utf8')}`).join('\n');
}

/* ------------------------------------------------------------ fixtures */
const fixturesDir = join(here, 'fixtures');
const registry = [];
for (const name of readdirSync(fixturesDir).sort()) {
  if (!name.endsWith('.mjs') || name.startsWith('_') || name === 'helpers.mjs') continue;
  const module = await import(pathToFileURL(join(fixturesDir, name)).href);
  const list = module.default;
  if (Array.isArray(list)) registry.push(...list);
  else if (list) registry.push(list);
}
const filtered = only
  ? registry.filter((fixture) => String(only).split(',').some((value) => fixture.id.includes(value.trim())))
  : registry;
if (filtered.length === 0) {
  console.error(`No fixtures selected (${registry.length} registered).`);
  process.exit(1);
}

const RAIL_ITEM = 'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none transition';
const shellAside = (active) => `
<aside class="desktop-sidebar hidden shrink-0 flex-col border-r border-ink-600 bg-ink-800 min-[761px]:sticky min-[761px]:top-0 min-[761px]:flex min-[761px]:h-dvh min-[761px]:!w-48 [&_.sidebar-brand]:flex [&_.sidebar-brand]:items-center [&_.sidebar-brand]:px-3 [&_.sidebar-brand]:pt-2 [&_.sidebar-brand]:!mb-4">
 <div class="flex justify-end p-2"><button type="button" class="sidebar-collapse grid h-10 w-10 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore" aria-label="Colapsar barra lateral" title="Colapsar barra lateral" aria-expanded="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/></svg></button></div>
 <div class="sidebar-brand"><span class="workspace-brand"><span class="workspace-wordmark">Scale<span>OS</span></span></span></div>
 <p class="nav-caption mt-4 px-3 font-mono text-[10px] uppercase tracking-[.13em] text-mute">Espacio de trabajo</p>
 <nav class="grid gap-0.5 px-2" aria-label="Secciones">
  ${['Resumen','Producción','Clientes','Proyectos','Presupuestos','Finanzas','Mora','Previsión','Informes','Pipeline','Planes','Inventario','Estudio','Equipo'].map((label) => `<a href="#" class="${RAIL_ITEM} ${label === active ? 'active bg-fono/10 text-fono-light' : 'text-mute hover:bg-ink-700 hover:text-fore'}"${label === active ? ' aria-current="page"' : ''}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><rect x="3" y="3" width="18" height="18" rx="4"/></svg><span class="nav-label min-w-0 break-words">${label}</span></a>`).join('')}
  <button type="button" class="nav-logout ${RAIL_ITEM} text-mute hover:bg-ink-700 hover:text-fore" aria-label="Cerrar sesión" title="Cerrar sesión"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg><span class="nav-label">Cerrar sesión</span></button>
 </nav>
 <div class="sidebar-bottom mt-auto grid grid-cols-[minmax(0,1fr)] gap-1 border-t border-ink-600 p-2"><div class="profile-footer min-w-0"><button class="user" aria-label="Abrir mi perfil"><span class="person-container"><span class="person-identity"><span class="person-avatar" aria-hidden="true">FD</span><span class="person-text"><b>Fredd D.</b><small>Propietario</small></span></span></span></button></div></div>
</aside>`;

function fixtureSection(fixture) {
  const dataLists = JSON.stringify(fixture.lists || []).replace(/'/g, '&#39;');
  const dataGrids = JSON.stringify(fixture.grids || []).replace(/'/g, '&#39;');
  const body = fixture.kind === 'workspace'
    ? `<main class="shell control-shell">${shellAside(fixture.section)}<section class="content min-w-0 min-[761px]:!w-[calc(100%-192px)]">
       <div class="workspace-topbar sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 px-4 py-2 max-md:z-30 max-md:grid max-md:grid-cols-1 max-md:gap-2" role="toolbar" aria-label="Controles del espacio de trabajo"><div class="topbar-primary flex min-w-0 items-center gap-3"><div class="topbar-identity flex min-w-0 items-center gap-2"></div><div class="topbar-workspace-context flex min-w-0 items-center gap-3"><div class="topbar-company min-w-0 [&_.company-name]:truncate [&_.workspace]:min-w-0 [&_.workspace]:overflow-hidden">Empresa de prueba</div></div></div><div class="topbar-utilities flex min-w-0 items-center gap-3 max-md:contents"><div class="topbar-status flex items-center gap-2 max-md:col-span-full max-md:row-start-2"></div><div class="topbar-utility-actions flex min-w-0 items-center gap-2 [&>*]:min-h-10 [&>*]:min-w-10 max-md:[&>*]:min-h-11 max-md:[&>*]:min-w-11"><span class="icon-button" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg></span></div></div></div>
       ${fixture.body}
       </section></main>`
    : fixture.body;
  return `<section class="harness-fixture" data-fixture="${fixture.id}" data-section="${fixture.section}" data-kind="${fixture.kind || 'plain'}" data-lists='${dataLists}' data-grids='${dataGrids}'>${body}</section>`;
}

const css = shippedCss();
const measure = readFileSync(join(here, 'measure.js'), 'utf8');
const overrides = `
/* harness stabilization: no motion, static sidebar */
*,*::before,*::after{animation:none!important;transition:none!important}
[data-harness-hide-before]::before{display:none!important}
[data-harness-hide-after]::after{display:none!important}
.harness-fixture .desktop-sidebar{position:static!important;height:auto!important;min-height:640px}
.harness-fixture{margin:0 0 2px;outline:1px dashed rgb(0 0 0 / 8%)}
`;

const inlineFixtures = filtered.filter((fixture) => fixture.kind !== 'external');
const pages = new Map();
pages.set('/audit.html', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,minimum-scale=1"><title>Scale OS visual harness</title>
<style>${css}${overrides}</style></head><body>
${inlineFixtures.map(fixtureSection).join('\n')}
<script>${measure}</script>
</body></html>`);

for (const fixture of filtered.filter((item) => item.kind === 'external')) {
  const source = resolve(repo, fixture.source);
  let html = readFileSync(source, 'utf8');
  const externalStyle = `<style>*,*::before,*::after{animation:none!important;transition:none!important}[data-harness-hide-before]::before{display:none!important}[data-harness-hide-after]::after{display:none!important}</style>`;
  html = html.replace(/<body([^>]*)>/i, `<body$1 data-fixture="${fixture.id}" data-section="${fixture.section}" data-kind="external">${externalStyle}`);
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `<script>${measure}</script></body>`);
  } else if (/<\/html>/i.test(html)) {
    html = html.replace(/<\/html>/i, `<script>${measure}</script></html>`);
  } else {
    html += `<script>${measure}</script>`;
  }
  pages.set(`/${fixture.id}.html`, html);
}

/* --------------------------------------------------------------- server */
const mime = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json'};
const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  let path = decodeURIComponent(url.pathname);
  if (path === '/') path = '/audit.html';
  if (pages.has(path)) {
    response.writeHead(200, {'content-type': 'text/html; charset=utf-8'});
    response.end(pages.get(path));
    return;
  }
  const local = resolve(repo, 'public', path.replace(/^\//, ''));
  if (local.startsWith(resolve(repo, 'public')) && existsSync(local) && statSync(local).isFile()) {
    response.writeHead(200, {'content-type': mime[extname(local)] || 'application/octet-stream'});
    response.end(readFileSync(local));
    return;
  }
  response.writeHead(404);
  response.end('not found');
});
await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const origin = `http://127.0.0.1:${server.address().port}`;

/* --------------------------------------------------------------- Chrome */
const chrome = await launchChrome({chromePath});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Emulation.setEmulatedMedia', {features: [{name: 'prefers-reduced-motion', value: 'reduce'}]});

async function navigate(url) {
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', {url});
  await loaded;
  await cdp.evaluate('document.fonts.ready.then(() => true)');
  await new Promise((resolveWait) => setTimeout(resolveWait, 150));
}

const page = pages.has('/audit.html') && inlineFixtures.length === 0
  ? `/${filtered[0].id}.html`
  : '/audit.html';
const pageUrls = [];
if (inlineFixtures.length > 0 || page === '/audit.html') pageUrls.push('/audit.html');
for (const fixture of filtered.filter((item) => item.kind === 'external')) pageUrls.push(`/${fixture.id}.html`);

const runsByWidth = new Map(widths.map((width) => [width, {width, docOverflow: 0, clientWidth: width, fixtures: []}]));
for (const pageUrl of pageUrls) {
  await navigate(`${origin}${pageUrl}`);
  for (const width of widths) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width,
      height: viewportHeight,
      deviceScaleFactor: 1,
      mobile: width < 768,
      screenWidth: width,
      screenHeight: viewportHeight,
    });
    await new Promise((resolveWait) => setTimeout(resolveWait, 120));
    const measured = await cdp.evaluate('window.__visualHarness.measure()');
    const run = runsByWidth.get(width);
    run.docOverflow = Math.max(run.docOverflow, measured.docOverflow);
    run.clientWidth = measured.clientWidth;
    run.fixtures.push(...measured.fixtures);
  }
}
const runs = widths.map((width) => runsByWidth.get(width));
for (const run of runs) {
  const findings = buildFindings(run, run.width);
  console.log(`${String(run.width).padStart(4)}px  fixtures=${run.fixtures.length}  findings=${findings.length}  docOverflow=${run.docOverflow}`);
}
cdp.close();
await chrome.close();
server.close();

mkdirSync(outDir, {recursive: true});
const payload = {
  generatedAt: new Date().toISOString(),
  repo,
  cssChunks: (css.match(/\/\* [^*]+ \*\//g) || []).map((entry) => entry.replace(/\/\*|\*\//g, '').trim()),
  widths,
  chrome: chrome.version.Browser,
  fixtureCount: filtered.length,
  runs,
};
writeFileSync(join(outDir, 'results.json'), JSON.stringify(payload, null, 2));
writeFileSync(join(outDir, 'audit.html'), pages.get('/audit.html'));
for (const [route, html] of pages) {
  if (route === '/audit.html') continue;
  writeFileSync(join(outDir, `page${route.replace(/\//g, '-')}`), html);
}
const baseline = renderBaselineMarkdown(payload);
writeFileSync(join(outDir, 'baseline.md'), baseline);
if (!keep) {
  /* audit.html is written on purpose: it is the reproducible artifact. */
}
console.log(`\nWrote ${join(outDir, 'results.json')}`);
console.log(`Wrote ${join(outDir, 'baseline.md')}`);
console.log(`Wrote ${join(outDir, 'audit.html')}`);
