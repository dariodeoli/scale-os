// Panel global «Tráfico y demos» y analítica de primera parte (landing y demo).
// Sin red: lógica pura (períodos de Asunción, deltas, scroll, duraciones), render del
// tab con datos y sin datos, y el tracker de la landing ejecutado con dobles del DOM;
// cada payload que manda el navegador pasa el validador real del API.
import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import type {TrafficPayload} from '../app/superadmin/traffic-model';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const model = require('../app/superadmin/traffic-model') as typeof import('../app/superadmin/traffic-model');
const {PlatformTraffic} = require('../app/superadmin/traffic') as typeof import('../app/superadmin/traffic');
const {demoSection, demoTrackingDisabled} = require('../app/demo-analytics') as typeof import('../app/demo-analytics');
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';

test('períodos en días de Asunción: hoy, 7/30/90, mes actual y mes anterior', () => {
  const late = new Date('2026-10-14T01:00:00Z'); // todavía 13-oct en Asunción
  assert.deepEqual(model.trafficRange('hoy', late), {from: '2026-10-13', to: '2026-10-13'});
  const now = new Date('2026-10-14T15:00:00Z');
  assert.deepEqual(model.trafficRange('hoy', now), {from: '2026-10-14', to: '2026-10-14'});
  assert.deepEqual(model.trafficRange('7', now), {from: '2026-10-08', to: '2026-10-14'});
  assert.deepEqual(model.trafficRange('30', now), {from: '2026-09-15', to: '2026-10-14'});
  assert.deepEqual(model.trafficRange('90', now), {from: '2026-07-17', to: '2026-10-14'});
  assert.deepEqual(model.trafficRange('mes', now), {from: '2026-10-01', to: '2026-10-14'});
  assert.deepEqual(model.trafficRange('mes-anterior', now), {from: '2026-09-01', to: '2026-09-30'});
  assert.deepEqual(model.trafficRange('mes-anterior', new Date('2026-01-10T15:00:00Z')), {from: '2025-12-01', to: '2025-12-31'}, 'enero → diciembre del año anterior');
  assert.deepEqual(model.trafficRange('mes-anterior', new Date('2026-03-05T15:00:00Z')), {from: '2026-02-01', to: '2026-02-28'});
  assert.equal(model.trafficQuery('7', now), '?from=2026-10-08&to=2026-10-14');
  assert.equal(model.TRAFFIC_PERIODS.length, 6);
});

test('deltas contra el período anterior: sin base no se inventa un porcentaje', () => {
  assert.deepEqual(model.trafficDelta(12, 10), {pct: 20, tone: 'up', label: '+20 % vs anterior'});
  assert.deepEqual(model.trafficDelta(5, 10), {pct: -50, tone: 'down', label: '−50 % vs anterior'});
  assert.deepEqual(model.trafficDelta(10, 10), {pct: 0, tone: 'flat', label: '= vs anterior'});
  assert.equal(model.trafficDelta(5, 0).pct, null);assert.equal(model.trafficDelta(5, 0).label, 'sin base anterior');
  assert.equal(model.trafficDelta(0, 0).label, 'sin variación medible');
  assert.equal(model.trafficDelta(null, 30).pct, null);
});

test('tiempo, scroll y sparkline', () => {
  assert.equal(model.formatDuration(null), '—');assert.equal(model.formatDuration(45), '45 s');
  assert.equal(model.formatDuration(125), '2 min 05 s');assert.equal(model.formatDuration(3720), '1 h 02 min');
  assert.equal(model.formatPercent(57.6), '58 %');assert.equal(model.formatPercent(null), '—');
  assert.deepEqual(model.scrollDistribution({scrolled: 4, s25: 4, s50: 3, s75: 1, s100: 0}).map(row => row.share), [100, 75, 25, 0]);
  assert.deepEqual(model.scrollDistribution({scrolled: 0, s25: 0, s50: 0, s75: 0, s100: 0}).map(row => row.share), [null, null, null, null], 'sin vistas medidas no hay porcentaje');
  assert.equal(model.sparkPath([]), '');
  assert.equal(model.sparkPath([0, 0]), 'M0.0 23.0L96.0 23.0', 'todo cero = línea base');
  assert.equal(model.sparkPath([0, 10, 5]), 'M0.0 23.0L48.0 1.0L96.0 12.0');
  assert.equal(model.sparkPath([null, 4]), 'M0.0 23.0L96.0 1.0');
  assert.equal(model.referrerLabel(null), 'Directo o sin origen');
  assert.equal(model.roleLabel('finance'), 'Finanzas');assert.equal(model.sectionLabel('/'), 'Inicio');
});

test('demo: solo la sección viaja y DNT/GPC apaga la medición', () => {
  assert.equal(demoSection('/produccion/proyecto/123?order=9#x'), '/produccion');
  assert.equal(demoSection('/Clientes'), '/clientes');
  assert.equal(demoSection(null), '/');assert.equal(demoSection('/%20raro'), '/');
  assert.equal(demoTrackingDisabled({doNotTrack: '1'}), true);
  assert.equal(demoTrackingDisabled({globalPrivacyControl: true}), true);
  assert.equal(demoTrackingDisabled({doNotTrack: null}), false);
});

const days = Array.from({length: 7}, (_, i) => `2026-10-${String(8 + i).padStart(2, '0')}`);
const totals = {views: 40, visitors: 25, avg_seconds: 75, timed: 30, avg_scroll: 62, scrolled: 30, s25: 28, s50: 20, s75: 12, s100: 6, mobile: 18, cta_clicks: 9, signups: 2};
const payload: TrafficPayload = {
  range: {from: '2026-10-08', to: '2026-10-14', days: 7, previous_from: '2026-10-01', previous_to: '2026-10-07', today: '2026-10-14', timezone: 'America/Asuncion'},
  landing: {
    today: {day: '2026-10-14', views: 7, visitors: 5},
    totals, previous: {...totals, views: 32, visitors: 25, avg_seconds: 60, cta_clicks: 0},
    daily: days.map((day, i) => ({day, views: i + 3, visitors: i + 2, avg_seconds: 60 + i, avg_scroll: 50 + i, cta_clicks: i % 2})),
    pages: [{path: '/', views: 35, visitors: 22, avg_seconds: 80, avg_scroll: 64}, {path: '/scale-os.html', views: 5, visitors: 3, avg_seconds: 40, avg_scroll: 30}],
    referrers: [{domain: 'google.com', views: 20, visitors: 14}, {domain: null, views: 15, visitors: 9}],
    ctas: [{cta: 'trial', clicks: 5, previous: 0, visitors: 4}, {cta: 'demo', clicks: 3, previous: 0, visitors: 3}, {cta: 'contact', clicks: 1, previous: 0, visitors: 1}, {cta: 'whatsapp', clicks: 0, previous: 0, visitors: 0}],
  },
  demo: {
    totals: {started: 6, views: 30, demos_with_views: 5, avg_seconds: 410, timed_demos: 5, role_changes: 4},
    previous: {started: 3, views: 12, demos_with_views: 3, avg_seconds: 300, timed_demos: 3},
    kinds: [{kind: 'publica', started: 5, previous: 3}, {kind: 'privada', started: 1, previous: 0}],
    daily: days.map((day, i) => ({day, started: i % 3})),
    roles: [{role: 'finance', changes: 3, demos: 2}, {role: 'editor', changes: 1, demos: 1}],
    screens: [{path: '/produccion', views: 14, demos: 5, avg_seconds: 95}, {path: '/finanzas', views: 6, demos: 3, avg_seconds: 50}],
    conversion: {measurable: false, reason: 'La demo es anónima y el registro vive en app.scaleparaguay.com: no se cruzan identidades entre ambos.'},
  },
};
const zero = {views: 0, visitors: 0, avg_seconds: null, timed: 0, avg_scroll: null, scrolled: 0, s25: 0, s50: 0, s75: 0, s100: 0, mobile: 0, cta_clicks: 0, signups: 0};
const empty: TrafficPayload = {
  ...payload,
  landing: {...payload.landing, today: {day: '2026-10-14', views: 0, visitors: 0}, totals: zero, previous: zero, daily: days.map(day => ({day, views: 0, visitors: 0, avg_seconds: null, avg_scroll: null, cta_clicks: 0})), pages: [], referrers: [], ctas: payload.landing.ctas.map(row => ({...row, clicks: 0, previous: 0, visitors: 0}))},
  demo: {...payload.demo, totals: {started: 0, views: 0, demos_with_views: 0, avg_seconds: null, timed_demos: 0, role_changes: 0}, previous: {started: 0, views: 0, demos_with_views: 0, avg_seconds: null, timed_demos: 0}, kinds: payload.demo.kinds.map(row => ({...row, started: 0, previous: 0})), daily: days.map(day => ({day, started: 0})), roles: [], screens: []},
};

function browser() {
  const previous = {self: Object.getOwnPropertyDescriptor(globalThis, 'self'), window: Object.getOwnPropertyDescriptor(globalThis, 'window'), fetch: globalThis.fetch};
  Object.defineProperties(globalThis, {self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true}});
  return () => {
    globalThis.fetch = previous.fetch;
    for (const key of ['self', 'window'] as const) { const descriptor = previous[key]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  };
}

test('el tab muestra hoy, KPIs con delta y sparkline, notas de fuente y la demo aparte', async () => {
  const restore = browser();
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(payload), {status: 200}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformTraffic/>); });
    assert.equal(urls.length, 1);
    assert.match(urls[0], /^\/core-api\/api\/platform\/traffic\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    const html = text(renderer.toJSON());
    for (const expected of ['Hoy (14-oct)', '7 cargas de la web · 5 visitantes', 'Cargas de página', 'Visitantes únicos', 'Tiempo promedio', '1 min 15 s', 'Scroll promedio', '62 %', 'Clics en CTA', '+25 % vs anterior', 'sin base anterior', 'Profundidad de scroll', 'Páginas más vistas', 'Origen de las visitas', 'Directo o sin origen', 'google.com', 'Registro («Empezar gratis»)',
      'Demos', 'Separado del resto del panel', 'Demos iniciadas', '+100 % vs anterior', '6 min 50 s', 'Demo pública (landing)', 'Finanzas', 'produccion', 'No medible todavía.'])
      assert.ok(html.includes(expected), `falta «${expected}»`);
    assert.ok((html.match(/ · /g) || []).length >= 8, 'cada gráfico o lista lleva su nota «fuente · cálculo»');
    assert.ok(renderer.root.findAll(node => node.type === 'svg' && String(node.props.className || '').includes('traffic-spark')).length >= 4, 'sparklines en las tarjetas');
    assert.equal(renderer.root.findAll(node => node.type === 'svg' && String(node.props['aria-label'] || '').includes('Los datos están en la tabla')).length, 2, 'gráfico de la landing y de la demo, con su tabla');
    await act(async () => { renderer.root.findAllByType('button').find(node => text(node.children) === 'Mes anterior')!.props.onClick(); });
    assert.equal(urls.length, 2, 'cambiar de período vuelve a pedir el rango');
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('sin datos: «sin datos todavía», sin gráficos vacíos ni números inventados; error del API visible', async () => {
  const restore = browser();
  let renderer!: ReactTestRenderer;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify(empty), {status: 200})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformTraffic/>); });
    const html = text(renderer.toJSON());
    assert.equal((html.match(/Sin datos todavía\./g) || []).length, 2, 'landing y demo');
    assert.ok(html.includes('Sin cargas todavía hoy'));
    assert.equal(renderer.root.findAll(node => node.type === 'svg' && (String(node.props.className || '').includes('traffic-spark') || String(node.props['aria-label'] || '').includes('Los datos están en la tabla'))).length, 0, 'sin datos no hay gráficos ni sparklines');
    assert.ok(!/NaN|undefined/.test(html));
    act(() => renderer.unmount());
    globalThis.fetch = (async () => new Response(JSON.stringify({error: 'No tenés acceso a la administración global.'}), {status: 403})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformTraffic onError={() => false}/>); });
    assert.ok(text(renderer.toJSON()).includes('No tenés acceso'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('el componente cliente no importa módulos que toquen la base', () => {
  for (const file of ['app/superadmin/traffic.tsx', 'app/superadmin/traffic-model.ts', 'app/demo-analytics.ts']) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /from ['"](?:\.\.\/)+backend|pg['"]|@prisma|pglite|server-only|node:/, file);
  }
  const page = readFileSync('app/superadmin/page.tsx', 'utf8');
  assert.match(page, /\{id: "trafico", label: "Tráfico y demos"/, 'la sección está en la navegación del panel');
});

// ── Tracker de la landing (segundo <script> de scale-os.html) con dobles del DOM ──
const html = readFileSync('public/scale-os.html', 'utf8');
const scripts = [...html.matchAll(/<script>\s*([\s\S]*?)<\/script>/g)].map(match => match[1]);
const tracker = scripts.find(source => source.includes('FIRST-PARTY ANALYTICS'))!;

function landing({origin = 'https://sistema.scaleparaguay.com', dnt, gpc = false, referrer = 'https://www.google.com/search?q=secreto', beacon = true}: {origin?: string; dnt?: string; gpc?: boolean; referrer?: string; beacon?: boolean} = {}) {
  const sent: {url: string; body: Record<string, unknown>; via: string}[] = [];
  const listeners: Record<string, ((event?: any) => void)[]> = {};
  const on = (name: string, fn: (event?: any) => void) => { (listeners[name] ||= []).push(fn); };
  const storage = new Map<string, string>();
  const doc: any = {visibilityState: 'visible', referrer, documentElement: {scrollHeight: 3000, scrollTop: 0}, body: {scrollHeight: 3000}, addEventListener: on, getElementById: (id: string) => id === 'contact-form' ? {addEventListener: (name: string, fn: () => void) => on('form:' + name, fn)} : null};
  const win: any = {scrollY: 0, innerHeight: 1000, addEventListener: on, crypto: {getRandomValues: (array: Uint8Array) => { array.forEach((_, i) => { array[i] = (i * 7) % 256; }); return array; }}};
  const context: any = {
    window: win, document: doc, location: new URL(`${origin}/?utm_source=x&token=secreto#top`), crypto: win.crypto,
    navigator: {doNotTrack: dnt, globalPrivacyControl: gpc, sendBeacon: beacon ? (url: string, blob: Blob) => { sent.push({url, body: JSON.parse((blob as any).__text), via: 'beacon'}); return true; } : undefined},
    localStorage: {getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value)},
    matchMedia: () => ({matches: true}), requestAnimationFrame: (fn: () => void) => fn(), Intl, JSON, Date, URL, Math, String, Array, Uint8Array,
    Blob: class { __text: string; constructor(parts: string[]) { this.__text = parts.join(''); } },
    fetch: async (url: string, init: RequestInit) => { sent.push({url, body: JSON.parse(String(init.body)), via: 'fetch'}); return {ok: true}; },
  };
  win.doNotTrack = undefined;
  runInNewContext(tracker, context);
  const fire = (name: string, event?: unknown) => (listeners[name] || []).forEach(fn => fn(event));
  return {sent, fire, doc, win, storage};
}

test('landing: vista sin query ni referer completo, tiempo visible, scroll máximo y CTA, todo válido para el API', async () => {
  // Validador real del API (JS sin tipos): cada payload del navegador tiene que pasarlo.
  const corePath = '../backend/public-analytics-core.js';
  const {parseAnalyticsEvent} = await import(corePath) as {parseAnalyticsEvent: (raw: unknown) => unknown};
  const page = landing();
  assert.equal(page.sent.length, 1);
  const view = page.sent[0];
  assert.equal(view.url, '/core-api/api/public/analytics/collect');
  assert.deepEqual(Object.keys(view.body).sort(), ['event', 'mobile', 'path', 'referrer', 'surface', 'view', 'visitor']);
  assert.equal(view.body.path, '/');assert.equal(view.body.referrer, 'www.google.com');
  assert.doesNotMatch(JSON.stringify(page.sent), /secreto|utm_|token|#top/);
  assert.equal(JSON.parse(page.storage.get('scale.visit.v1')!).id, view.body.visitor, 'visitante diario en localStorage, sin cookies');
  page.win.scrollY = 1500;page.fire('scroll');
  page.doc.visibilityState = 'hidden';page.fire('visibilitychange');
  const engagement = page.sent.at(-1)!;
  assert.equal(engagement.via, 'beacon');assert.equal(engagement.body.event, 'engagement');assert.equal(engagement.body.view, view.body.view);
  assert.equal(engagement.body.scroll, 83, '(1500+1000)/3000');assert.equal(typeof engagement.body.seconds, 'number');
  page.fire('pagehide');assert.equal(page.sent.length, 2, 'sin cambios no se repite el envío');
  page.win.scrollY = 2000;page.fire('scroll');page.fire('pagehide');
  assert.equal(page.sent.at(-1)!.body.scroll, 100, 'llegar al final cuenta como 100 %');
  const anchor = (attrs: Record<string, string>) => ({closest: () => ({getAttribute: (name: string) => attrs[name] ?? null})});
  page.fire('click', {target: anchor({'data-cta': 'trial', href: 'https://app.scaleparaguay.com/registro'})});
  page.fire('click', {target: anchor({'data-cta': 'demo', href: 'https://sistema.scaleparaguay.com/demo'})});
  page.fire('click', {target: anchor({href: 'https://wa.me/595000000000'})});
  page.fire('form:submit');
  assert.deepEqual(page.sent.filter(row => row.body.event === 'cta_click').map(row => row.body.cta), ['trial', 'demo', 'whatsapp', 'contact']);
  for (const row of page.sent) assert.doesNotThrow(() => parseAnalyticsEvent(row.body), JSON.stringify(row.body));
  const again = landing();assert.equal(again.sent.length, 1);
});

test('landing: DNT, GPC u otro origen no miden nada', () => {
  assert.equal(landing({dnt: '1'}).sent.length, 0);
  assert.equal(landing({gpc: true}).sent.length, 0);
  assert.equal(landing({origin: 'https://evil.example'}).sent.length, 0);
  const fallback = landing({beacon: false, referrer: ''});
  assert.equal(fallback.sent[0].via, 'fetch');assert.equal(fallback.sent[0].body.referrer, undefined);
});
