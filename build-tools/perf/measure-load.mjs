/*
 * Medición de carga de datos del workspace (SOS-DSN, ronda "tarda mucho").
 * Chrome headless (1440×900) contra un `next start` local, API interceptada
 * con fixtures y latencias fijas. Dos fases:
 *   - boot: carga dura de /resumen (caché de datos vacía)
 *   - spa:  navegación por el riel entre secciones (donde el shell repetía)
 * Por ruta: llamadas API, duplicados por URL, ms de suma, primer/último dato
 * y el detalle de cada llamada.
 *
 * Uso: node work/measure-load.mjs --label antes|despues [--port 3105]
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {launchChrome, openTarget} from '../visual-harness/chrome.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback;};
const label = option('--label', 'antes');
const port = Number(option('--port', '3105'));
const gapMs = Number(option('--gap', '16000'));
const only = option('--only', '');
const hardOnly = args.includes('--hard');
const here = resolve(process.cwd());
const outDir = join(here, 'work/medicion');
mkdirSync(outDir, {recursive: true});
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const LATENCY = [
  [/\/work-orders/, 900],
  [/\/agency\/projects/, 450],
  [/\/presence\/projects/, 250],
  [/\/summary/, 250],
  [/\/agency\/clients/, 150],
  [/\/auth\/me/, 120],
  [/\/auth\/providers/, 60],
  [/\/presence\/heartbeat/, 80],
  [/\/leads/, 200],
  [/\/budgets/, 200],
  [/\/dashboard/, 300],
  [/\/control-center/, 250],
  [/\/notifications/, 120],
];
const latencyFor = (url) => (LATENCY.find(([pattern]) => pattern.test(url)) || [null, 150])[1];

const client = (index) => ({id: String(index), name: `Cliente Demo ${String(index).padStart(2, '0')}`, active: true, status: 'active', email: `cliente${index}@demo.test`, phone: '+595 981 000 000', created_at: '2026-01-15T10:00:00.000Z', work_orders: index});
const project = (index) => ({id: String(index), title: `Proyecto Demo ${String(index).padStart(2, '0')}`, client_id: String((index % 6) + 1), client_name: client((index % 6) + 1).name, status: 'active', due_date: '2026-11-30', start_date: '2026-10-01', work_orders: 2});
const order = (index) => ({id: String(index), title: `Orden Demo ${String(index).padStart(2, '0')}`, status: 'in_progress', project_id: String((index % 4) + 1), client_id: String((index % 6) + 1), due_date: '2026-11-20', due_time: '15:00', responsible: 'Equipo', effective_assignees: []});
const user = {id: '1', organization_id: '1', email: 'duenio@demo.test', full_name: 'Duenio Demo', role: 'owner', organization_name: 'Demo SA', organization_slug: 'demo', default_currency: 'PYG', photo_url: null, subscription: {hasAccess: true, status: 'active', plan: 'pro', trial_ends_at: null}, demo_owner_user_id: '1'};

const fixtures = (url) => {
  const path = new URL(url).pathname + new URL(url).search;
  if (path.includes('/auth/me')) return {user};
  if (path.includes('/auth/providers')) return {google: false};
  if (path.includes('/auth/organizations')) return {organizations: [{id: '1', name: 'Demo SA', slug: 'demo', role: 'owner', current: true}]};
  if (path.includes('/agency/clients')) return {clients: Array.from({length: 6}, (_, index) => client(index + 1))};
  if (path.includes('/agency/projects')) return {projects: Array.from({length: 4}, (_, index) => project(index + 1))};
  if (path.includes('/agency/work-orders')) return {workOrders: Array.from({length: 8}, (_, index) => order(index + 1))};
  if (path.includes('/agency/summary')) return {summary: {active_clients: 6, active_projects: 4, open_orders: 8, unanswered_budgets: 1, unverified_inventory: 2, upcoming_deliveries: 3}};
  if (path.includes('/agency/client-payment-status')) return {clients: []};
  if (path.includes('/agency/control-center')) return {kpis: [], pipeline: [], alerts: [], stage_counts: {}};
  if (path.includes('/agency/dashboard')) return {cash: [], receivables: [], collections: [], inventory: [], expenses: [], personnel: [], expected: [], alerts: []};
  if (path.includes('/agency/leads')) return {leads: []};
  if (path.includes('/agency/budgets')) return {budgets: []};
  if (path.includes('/agency/notifications/preferences')) return {preferences: {}};
  if (path.includes('/agency/notifications')) return {notifications: [], records: []};
  if (path.includes('/agency/schedules')) return {schedules: []};
  if (path.includes('/agency/productivity/internal-tasks')) return {records: []};
  if (path.includes('/presence/projects')) return {people: []};
  if (path.includes('/presence/heartbeat')) return {ok: true};
  if (path.includes('/presence/usage')) return {people: []};
  return {};
};

const chrome = await launchChrome({});
const cdp = await openTarget(chrome.port);
await cdp.send('Page.enable');
await cdp.send('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
await cdp.send('Fetch.enable', {patterns: [{urlPattern: '*/core-api/api/*'}, {urlPattern: '*/api/auth/*'}]});

const requests = [];
cdp.on('Fetch.requestPaused', (params) => {
  const {requestId, request} = params;
  const started = Date.now();
  const delay = latencyFor(request.url);
  setTimeout(() => {
    requests.push({method: request.method, url: request.url.replace(/^https?:\/\/[^/]+/, ''), started, delay, done: started + delay});
    cdp.send('Fetch.fulfillRequest', {requestId, responseCode: 200, responseHeaders: [{name: 'Content-Type', value: 'application/json'}], body: Buffer.from(JSON.stringify(fixtures(request.url))).toString('base64')}).catch(() => {});
  }, delay);
});

const results = [];
async function measure(route, nav, hard) {
  requests.length = 0;
  await cdp.evaluate('performance.clearResourceTimings&&performance.clearResourceTimings()').catch(() => {});
  const navigation = Date.now();
  if (hard) {
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', {url: `http://127.0.0.1:${port}${route.path}`});
    await loaded;
  } else {
    await cdp.evaluate(`(()=>{const link=[...document.querySelectorAll('a[title]')].find(node=>node.getAttribute('title')===${JSON.stringify(route.label)});if(link)link.click();})()`);
  }
  let landed = '';
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    landed = await cdp.evaluate('location.pathname').catch(() => '');
    const pending = requests.some((item) => item.done > Date.now() - 900);
    const hasData = await cdp.evaluate(`document.body.innerText.includes('Demo')`).catch(() => false);
    if (landed === route.path && !pending && hasData) break;
    await sleep(250);
  }
  const entries = JSON.parse(await cdp.evaluate(`JSON.stringify(performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/core-api/api/')).map(entry=>({name:new URL(entry.name).pathname+new URL(entry.name).search,start:Math.round(entry.startTime),end:Math.round(entry.responseEnd),ms:Math.round(entry.duration)})))`));
  const counts = new Map();
  for (const entry of entries) counts.set(entry.name, (counts.get(entry.name) || 0) + 1);
  const duplicates = [...counts.values()].reduce((total, value) => total + Math.max(0, value - 1), 0);
  const result = {
    route: route.path,
    nav,
    landed,
    api: entries.length,
    duplicates,
    urls: [...counts.keys()].map((url) => url.replace('/core-api/api/agency', '')),
    apiMs: Math.round(entries.reduce((total, entry) => total + entry.ms, 0)),
    ttFirst: entries.length ? Math.round(Math.min(...entries.map((entry) => entry.start))) : 0,
    ttLast: entries.length ? Math.round(Math.max(...entries.map((entry) => entry.end))) : 0,
    detail: requests.map((item) => ({url: item.url.replace('/core-api/api/agency', ''), delay: item.delay, start: Math.round(item.started - navigation)})),
  };
  results.push(result);
  console.log(`${nav} ${route.path} (${landed || 'sin ruta'}): api=${result.api} dups=${result.duplicates} apiMs=${result.apiMs} ttLast=${result.ttLast}`);
  return result;
}

const ROUTES = {
  resumen: {path: '/resumen', label: 'Resumen'},
  clientes: {path: '/clientes', label: 'Clientes'},
  proyectos: {path: '/proyectos', label: 'Proyectos'},
  produccion: {path: '/produccion', label: 'Producción'},
  presupuestos: {path: '/presupuestos', label: 'Presupuestos'},
  finanzas: {path: '/finanzas', label: 'Finanzas'},
};

if (hardOnly) {
  for (const key of (only ? only.split(',') : ['produccion'])) await measure(ROUTES[key], 'boot', true);
} else {
  await measure(ROUTES.resumen, 'boot', true);
  for (const [index, key] of ['clientes', 'proyectos', 'produccion', 'presupuestos', 'finanzas', 'resumen'].entries()) {
    if (index > 0) await sleep(gapMs);
    await measure(ROUTES[key], 'spa', false);
  }
}

writeFileSync(join(outDir, `${label}.json`), JSON.stringify({label, at: new Date().toISOString(), routes: results}, null, 2));
const table = ['| Fase | Ruta | Llamadas API | Duplicadas | API ms (suma) | Último dato (ms) | Endpoints |', '|---|---|---|---|---|---|---|',
  ...results.map((item) => `| ${item.nav} | ${item.route} | ${item.api} | ${item.duplicates} | ${item.apiMs} | ${item.ttLast} | ${item.urls.join(' · ')} |`)].join('\n');
writeFileSync(join(outDir, `${label}.md`), `${table}\n`);
console.log(`\n${table}`);
cdp.close();
await chrome.close();
