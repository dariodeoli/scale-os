#!/usr/bin/env node
/*
 * Verificación funcional en producción de las proyecciones COM (#73, refs #67/#71):
 *   - Resumen: ventana de órdenes con la proyección (buscador, alertas, KPIs)
 *   - Pipeline: ?fields= en leads
 *   - Presupuestos: ?fields= en budgets
 *   - Alertas exactas de vencidos (?due=overdue) para roles sin finanzas
 *
 * Comprueba contra la API desplegada que las proyecciones que pide el front se
 * acepten, que no falte ningún campo que la UI dibuja, que los conteos por
 * etapa sigan exactos (chips vs summary) y que la ventana no arrastre las fotos
 * base64 de responsables (`assignee_names`, fix de #73).
 *
 * Uso: node build-tools/verify-prod-com.mjs
 * Env: APP_ORIGIN (default https://app.scaleparaguay.com).
 * La sesión se crea con la puerta pública de /demo (no toca datos reales).
 */
import {readFileSync} from 'node:fs';

const APP = (process.env.APP_ORIGIN || 'https://app.scaleparaguay.com').replace(/\/$/, '');
const ORIGIN_DEMO = 'https://sistema.scaleparaguay.com';

const log = [];
let failed = false;
const check = (label, value, expected = true) => {
  const ok = value === expected;
  if (!ok) failed = true;
  log.push(`${ok ? '✓' : '✗'} ${label}: ${JSON.stringify(value)}${ok ? '' : ` (esperado ${JSON.stringify(expected)})`}`);
};
const note = (text) => log.push(`· ${text}`);

// Constantes reales del front (única fuente: app/shell-data.ts).
const shellData = readFileSync(new URL('../app/shell-data.ts', import.meta.url), 'utf8');
const grab = (name) => shellData.match(new RegExp(`export const ${name} = '([^']+)'`))?.[1];
const ORDER_FIELDS_SUMMARY = grab('ORDER_FIELDS_SUMMARY');
const LEAD_LIST_FIELDS = grab('LEAD_LIST_FIELDS');
const BUDGET_LIST_FIELDS = grab('BUDGET_LIST_FIELDS');
if (!ORDER_FIELDS_SUMMARY || !LEAD_LIST_FIELDS || !BUDGET_LIST_FIELDS) throw new Error('No se pudieron leer las proyecciones de app/shell-data.ts');

// Sesión demo (misma puerta que el botón público de /demo).
const startRes = await fetch(`${APP}/core-api/api/demo/start`, {method: 'POST', headers: {'content-type': 'application/json', origin: ORIGIN_DEMO}, body: '{}'});
check('demo: la sesión se crea', startRes.status, 201);
const cookie = (startRes.headers.get('set-cookie') || '').match(/scale_session=[^;]+/)?.[0];
check('demo: hay cookie de sesión', Boolean(cookie));

const call = async (base, path, headers = {}) => {
  const res = await fetch(`${base}/core-api${path}`, {headers: {cookie: cookie || '', ...headers}});
  const body = await res.text();
  let json = null;
  try { json = JSON.parse(body); } catch {}
  return {status: res.status, bytes: Buffer.byteLength(body, 'utf8'), json};
};
const fieldsOf = (projection) => projection.split(',').map((field) => field.trim());
const missing = (rows, projection) => {
  const wanted = fieldsOf(projection);
  const absent = new Set();
  for (const row of rows) for (const field of wanted) if (!(field in row) || row[field] === undefined) absent.add(field);
  return [...absent];
};

// Resumen: ventana + proyección de buscador/alertas/planificador.
const orders = await call(APP, `/api/agency/work-orders?limit=300&fields=${ORDER_FIELDS_SUMMARY}`);
check('Resumen: la API acepta la proyección de órdenes', orders.status, 200);
const orderRows = orders.json?.workOrders || [];
check('Resumen: la ventana trae filas', orderRows.length > 0);
check('Resumen: la ventana respeta el tope de 300', orderRows.length <= 300);
check('Resumen: ningún campo de la proyección falta', missing(orderRows, ORDER_FIELDS_SUMMARY).length, 0);
if (missing(orderRows, ORDER_FIELDS_SUMMARY).length) note(`  faltan: ${missing(orderRows, ORDER_FIELDS_SUMMARY).join(', ')}`);
check('Resumen: la ventana no arrastra las fotos base64 de responsables', ORDER_FIELDS_SUMMARY.includes('assignee_names') && !ORDER_FIELDS_SUMMARY.includes('effective_assignees'));
const kb = Math.round(orders.bytes / 1024);
check('Resumen: la ventana proyectada es liviana (<600 KB con 300 filas)', kb < 600);
if (orderRows[0] && 'effective_assignees' in orderRows[0]) note('  la respuesta todavía incluye effective_assignees (payload pesado)');
const withNames = orderRows.filter((row) => Array.isArray(row.assignee_names));
check('Resumen: el nombre liviano de responsables llega en toda la ventana', withNames.length, orderRows.length);
const searchable = orderRows.filter((row) => row.title && row.client_name && row.project_name && row.due_date !== undefined);
check('Resumen: la ventana sirve al buscador (título, cliente y proyecto)', searchable.length, orderRows.length);
const planned = orderRows.filter((row) => row.status && row.work_type !== undefined && row.checklist_total !== undefined && Array.isArray(row.assignee_names));
check('Resumen: el planificador tiene sus campos (estado, tipo, checklist, responsables)', planned.length, orderRows.length);
note(`producción: ventana ${orderRows.length} filas · ${kb} KB JSON`);

// Resumen: conteos exactos (chips) y vencidos exactos (alertas sin finanzas).
const summary = await call(APP, '/api/agency/summary');
check('Resumen: el resumen responde', summary.status, 200);
const stageCounts = summary.json?.summary?.stage_counts || {};
const totalStages = Object.values(stageCounts).reduce((sum, value) => sum + Number(value || 0), 0);
const openOrders = Number(summary.json?.summary?.open_orders || 0);
const openStages = ['blocked', 'to_record', 'recorded', 'editing', 'review'].reduce((sum, status) => sum + Number(stageCounts[status] || 0), 0);
check('Resumen: los chips suman todas las órdenes visibles', totalStages > 0);
check('Resumen: órdenes abiertas = suma de etapas abiertas', openOrders, openStages);
note(`producción: chips ${totalStages} órdenes (${Object.entries(stageCounts).map(([key, value]) => `${key}:${value}`).join(' · ')}) · abiertas ${openOrders}`);
const overdue = await call(APP, '/api/agency/work-orders?due=overdue&limit=30&fields=id,title,status,project_id,project_name,client_name,due_date');
check('Resumen: los vencidos exactos responden', overdue.status, 200);
const overdueRows = overdue.json?.workOrders || [];
check('Resumen: los vencidos traen nombre y contexto', overdueRows.every((row) => row.title && row.client_name && row.project_name), true);
note(`producción: vencidos ${overdueRows.length}${overdue.json?.page?.hasMore ? '+' : ''} · primero «${overdueRows[0]?.title || '—'}»`);

// Pipeline: ?fields= en leads.
const leads = await call(APP, `/api/agency/leads?fields=${LEAD_LIST_FIELDS}`);
check('Pipeline: la API acepta la proyección de leads', leads.status, 200);
const leadRows = leads.json?.records || [];
check('Pipeline: hay oportunidades', leadRows.length > 0);
check('Pipeline: ningún campo de la proyección falta', missing(leadRows, LEAD_LIST_FIELDS).length, 0);
if (missing(leadRows, LEAD_LIST_FIELDS).length) note(`  faltan: ${missing(leadRows, LEAD_LIST_FIELDS).join(', ')}`);
const leadReady = leadRows.filter((row) => row.name && row.stage && row.amount !== undefined && row.probability !== undefined);
check('Pipeline: las tarjetas tienen nombre, etapa, monto y probabilidad', leadReady.length, leadRows.length);
note(`producción: leads ${leadRows.length} filas · ${Math.round(leads.bytes / 1024)} KB JSON`);

// Presupuestos: ?fields= en budgets.
const budgets = await call(APP, `/api/agency/budgets?fields=${BUDGET_LIST_FIELDS}`);
check('Presupuestos: la API acepta la proyección de budgets', budgets.status, 200);
const budgetRows = budgets.json?.budgets || [];
check('Presupuestos: hay presupuestos', budgetRows.length > 0);
check('Presupuestos: ningún campo de la proyección falta', missing(budgetRows, BUDGET_LIST_FIELDS).length, 0);
if (missing(budgetRows, BUDGET_LIST_FIELDS).length) note(`  faltan: ${missing(budgetRows, BUDGET_LIST_FIELDS).join(', ')}`);
const budgetReady = budgetRows.filter((row) => row.number && row.title && row.status && row.total !== undefined && row.currency);
check('Presupuestos: las filas/tarjetas tienen número, estado, total y moneda', budgetReady.length, budgetRows.length);
note(`producción: budgets ${budgetRows.length} filas · ${Math.round(budgets.bytes / 1024)} KB JSON`);

// El front desplegado pide las proyecciones (chunks de las rutas COM).
const chunks = async (route) => {
  const html = await (await fetch(`${APP}${route}`)).text();
  return [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((match) => match[0]))];
};
const routeChunks = [...(await chunks('/pipeline')), ...(await chunks('/presupuestos')), ...(await chunks('/resumen'))];
let projected = {leads: false, budgets: false, summary: false};
for (const chunk of [...new Set(routeChunks)].slice(0, 80)) {
  const source = await (await fetch(`${APP}${chunk}`)).text().catch(() => '');
  // Las constantes viven como literales y la URL se arma por concatenación:
  // alcanza con encontrar cada proyección en el JS desplegado.
  if (source.includes(LEAD_LIST_FIELDS)) projected.leads = true;
  if (source.includes(BUDGET_LIST_FIELDS)) projected.budgets = true;
  if (source.includes(ORDER_FIELDS_SUMMARY)) projected.summary = true;
}
check('front desplegado: pide la proyección de leads', projected.leads);
check('front desplegado: pide la proyección de budgets', projected.budgets);
check('front desplegado: pide la ventana proyectada de Resumen', projected.summary);

console.log(log.join('\n'));
console.log(failed ? 'FALLÓ la verificación en producción' : 'PASS verificación en producción: proyecciones COM sin datos faltantes, ventana liviana y conteos exactos.');
process.exit(failed ? 1 : 0);
