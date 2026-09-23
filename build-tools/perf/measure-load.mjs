/*
 * Medición de carga de datos del workspace (SOS-DSN).
 * Chrome headless contra un `next start` local, API interceptada con fixtures
 * escaladas a producción (órdenes ~1,4 KB por fila; sin `?limit=` devuelve
 * ~1450 filas ≈ 2 MB, con `?limit=300` ≈ 420 KB) y latencias fijas.
 *
 * Mide por ruta: llamadas API, duplicadas, payload (bytes ≈ transferSize),
 * ms de la suma y primer/último dato; además el detalle por endpoint.
 *
 * Uso:
 *   node build-tools/perf/measure-load.mjs --label antes --port 3105
 *   node build-tools/perf/measure-load.mjs --label despues --port 3105 --width 390
 *   node build-tools/perf/measure-load.mjs --label antes --port 3105 --boot-only
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {launchChrome, openTarget} from '../visual-harness/chrome.mjs';

const args = process.argv.slice(2);
const option = (name, fallback) => {const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback;};
const label = option('--label', 'antes');
const port = Number(option('--port', '3105'));
const width = Number(option('--width', '1440'));
const gapMs = Number(option('--gap', '16000'));
const only = option('--only', '');
const bootOnly = args.includes('--boot-only');
const hardOnly = args.includes('--hard');
const here = resolve(process.cwd());
const outDir = join(here, 'work/medicion');
mkdirSync(outDir, {recursive: true});
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

// Latencias por endpoint (ms), fijas y comparables entre corridas.
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

// Órdenes ~1,4 KB por fila (mismo perfil que producción: o.* + proyecto/cliente
// + asignados + checklist). La respuesta escalada reproduce 2 MB sin `?limit=`.
const ORDER_ROWS = 1450;
const client = (index) => ({id: String(index), name: `Cliente Demo ${String(index).padStart(2, '0')}`, active: index % 9 !== 0, status: index % 9 === 0 ? 'paused' : 'active', email: `cliente${index}@demo.test`, phone: '+595 981 000 000', ruc: `80012345-${index}`, address: `Av. Demo ${index}, Asunción`, created_at: '2026-01-15T10:00:00.000Z', payment_status: index % 3 === 0 ? 'late' : 'up_to_date', has_invoice: index % 4 !== 0, work_orders: index % 7});
const project = (index) => ({id: String(index), title: `Proyecto Demo ${String(index).padStart(2, '0')}`, client_id: String((index % 240) + 1), client_name: client((index % 240) + 1).name, status: index % 5 === 0 ? 'completed' : 'active', active: index % 11 !== 0, due_date: '2026-11-30', start_date: '2026-10-01', urgency: index % 3 === 0 ? 'high' : null, drive_url: `https://drive.demo/proyecto-${index}`, description: `Proyecto de producción audiovisual ${index} con entregables mensuales y revisiones del cliente.`, work_order_count: index % 12, work_orders: index % 12, assignees: [{id: String(index % 9), full_name: `Responsable ${index % 9}`, photo_url: null, is_primary: true}, {id: String((index + 3) % 9), full_name: `Responsable ${(index + 3) % 9}`, photo_url: null, is_primary: false}]});
const order = (index) => ({id: String(index), title: `Orden Demo ${String(index).padStart(4, '0')}`, status: ['to_record', 'in_progress', 'review', 'approved', 'published', 'paused'][index % 6], project_id: String((index % 500) + 1), project_name: `Proyecto Demo ${String((index % 500) + 1).padStart(2, '0')}`, client_id: String((index % 400) + 1), client_name: client((index % 400) + 1).name, assignee_email: `equipo${index % 9}@demo.test`, responsible: `Responsable ${index % 9}`, work_type: ['video', 'reedicion', 'foto', 'produccion'][index % 4], description: `Orden de trabajo ${index}: armado, edición y entrega con revisión del cliente y ajustes solicitados en la reunión de producción.`, due_date: '2026-11-20', due_time: '15:00', effective_date: null, created_at: '2026-10-01T09:00:00.000Z', updated_at: `2026-11-0${(index % 9) + 1}T12:00:00.000Z`, urgency: index % 5 === 0 ? 'high' : null, drive_url: `https://drive.demo/orden-${index}`, checklist_total: 6, checklist_completed: index % 5, checklist: Array.from({length: 6}, (_, step) => ({id: (index * 6) + step, label: `Paso ${step + 1} del flujo de producción con revisión interna y del cliente`, completed: step < (index % 5)})), assignees: [{id: String(index % 9), user_id: String(index % 9), full_name: `Responsable ${index % 9}`, photo_url: null, is_primary: true}], project_assignees: [{id: String(index % 9), full_name: `Responsable ${index % 9}`, is_primary: true}], effective_assignees: [{id: String(index % 9), full_name: `Responsable ${index % 9}`, source: 'project', is_primary: true}]});
const user = {id: '1', organization_id: '1', email: 'duenio@demo.test', full_name: 'Duenio Demo', role: 'owner', organization_name: 'Demo SA', organization_slug: 'demo', default_currency: 'PYG', photo_url: null, subscription: {hasAccess: true, status: 'active', plan: 'pro', trial_ends_at: null}, demo_owner_user_id: '1'};

const fixtures = (rawUrl) => {
  const url = new URL(rawUrl);
  const path = url.pathname + url.search;
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw === null ? null : Math.min(Math.max(Number(limitRaw) || 0, 0), 2000);
  const rows = (count) => Array.from({length: count}, (_, index) => index + 1);
  if (path.includes('/auth/me')) return {user};
  if (path.includes('/auth/providers')) return {google: false};
  if (path.includes('/auth/organizations')) return {organizations: [{id: '1', name: 'Demo SA', slug: 'demo', role: 'owner', current: true}]};
  if (path.includes('/agency/clients')) return {clients: rows(400).map(client)};
  if (path.includes('/agency/projects')) return {projects: rows(250).map(project)};
  if (path.includes('/agency/work-orders')) {
    const count = limit === null ? ORDER_ROWS : Math.min(limit, ORDER_ROWS);
    return {workOrders: rows(count).map(order), ...(limit === null ? {} : {page: {limit, offset: 0, hasMore: count < ORDER_ROWS}})};
  }
  if (path.includes('/agency/summary')) return {summary: {active_clients: 356, active_projects: 210, open_orders: 1180, unanswered_budgets: 7, unverified_inventory: 23, upcoming_deliveries: 41}};
  if (path.includes('/agency/client-payment-status')) return {clients: []};
  if (path.includes('/agency/control-center')) return {active_clients: 356, active_prospects: 12, contracted_billing: {available: false, reason: 'permission'}};
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
const requests = [];
cdp.on('Fetch.requestPaused', (params) => {
  const {requestId, request} = params;
  const started = Date.now();
  const delay = latencyFor(request.url);
  const body = JSON.stringify(fixtures(request.url));
  const bytes = Buffer.byteLength(body);
  setTimeout(() => {
    requests.push({method: request.method, url: request.url.replace(/^https?:\/\/[^/]+/, ''), started, delay, bytes, done: started + delay});
    cdp.send('Fetch.fulfillRequest', {requestId, responseCode: 200, responseHeaders: [{name: 'Content-Type', value: 'application/json'}], body: Buffer.from(body).toString('base64')}).catch(() => {});
  }, delay);
});
await cdp.send('Emulation.setDeviceMetricsOverride', {width, height: width < 768 ? 780 : 900, deviceScaleFactor: 1, mobile: width < 768});
await cdp.send('Fetch.enable', {patterns: [{urlPattern: '*/core-api/api/*'}, {urlPattern: '*/api/auth/*'}]});

const results = [];
const kb = (bytes) => Math.round(bytes / 1024);
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
  const entries = JSON.parse(await cdp.evaluate(`JSON.stringify(performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/core-api/api/')).map(entry=>({name:new URL(entry.name).pathname,start:Math.round(entry.startTime),end:Math.round(entry.responseEnd),ms:Math.round(entry.duration)})))`));
  const counts = new Map();
  for (const entry of entries) counts.set(entry.name, (counts.get(entry.name) || 0) + 1);
  const duplicates = [...counts.values()].reduce((total, value) => total + Math.max(0, value - 1), 0);
  const apiRequests = requests.filter((item) => item.method === 'GET');
  const payload = requests.reduce((total, item) => total + item.bytes, 0);
  const result = {
    route: route.path,
    nav,
    landed,
    api: entries.length,
    duplicates,
    payloadKB: kb(payload),
    apiMs: Math.round(entries.reduce((total, entry) => total + entry.ms, 0)),
    ttFirst: entries.length ? Math.round(Math.min(...entries.map((entry) => entry.start))) : 0,
    ttLast: entries.length ? Math.round(Math.max(...entries.map((entry) => entry.end))) : 0,
    detail: requests.map((item) => ({url: item.url.replace('/core-api/api/agency', '').replace('/core-api/api', ''), delay: item.delay, kb: kb(item.bytes), start: Math.round(item.started - navigation)})),
    heaviest: apiRequests.sort((a, b) => b.bytes - a.bytes).slice(0, 3).map((item) => `${item.url.replace('/core-api/api/agency', '')} ${kb(item.bytes)} KB`),
  };
  results.push(result);
  console.log(`${nav} ${route.path} (${landed || 'sin ruta'}): api=${result.api} dups=${result.duplicates} payload=${result.payloadKB} KB apiMs=${result.apiMs} ttLast=${result.ttLast}`);
  return result;
}

const ROUTES = {
  resumen: {path: '/resumen', label: 'Resumen'},
  clientes: {path: '/clientes', label: 'Clientes'},
  proyectos: {path: '/proyectos', label: 'Proyectos'},
  produccion: {path: '/produccion', label: 'Producción'},
  presupuestos: {path: '/presupuestos', label: 'Presupuestos'},
  finanzas: {path: '/pagos', label: 'Finanzas'},
  inventario: {path: '/inventario', label: 'Inventario'},
  estudio: {path: '/estudio', label: 'Estudio'},
  informes: {path: '/informes', label: 'Informes'},
};

if (hardOnly) {
  for (const key of (only ? only.split(',') : ['produccion'])) await measure(ROUTES[key], 'boot', true);
} else if (bootOnly) {
  for (const key of (only ? only.split(',') : Object.keys(ROUTES))) await measure(ROUTES[key], 'boot', true);
} else {
  await measure(ROUTES.resumen, 'boot', true);
  for (const [index, key] of ['clientes', 'proyectos', 'produccion', 'presupuestos', 'finanzas', 'resumen'].entries()) {
    if (index > 0) await sleep(gapMs);
    await measure(ROUTES[key], 'spa', false);
  }
}

const suffix = `${label}${width === 1440 ? '' : `-${width}`}`;
writeFileSync(join(outDir, `${suffix}.json`), JSON.stringify({label, width, at: new Date().toISOString(), routes: results}, null, 2));
const table = ['| Fase | Ruta | Llamadas API | Duplicadas | Payload (KB) | API ms (suma) | Último dato (ms) | Más pesado |', '|---|---|---|---|---|---|---|---|',
  ...results.map((item) => `| ${item.nav} | ${item.route} | ${item.api} | ${item.duplicates} | ${item.payloadKB} | ${item.apiMs} | ${item.ttLast} | ${item.heaviest.join(' · ')} |`)].join('\n');
writeFileSync(join(outDir, `${suffix}.md`), `${table}\n`);
console.log(`\n${table}`);
cdp.close();
await chrome.close();
