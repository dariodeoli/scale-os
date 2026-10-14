import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {UsagePayload} from '../app/superadmin/model';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const {PlatformUsage, usageQuery} = require('../app/superadmin/usage') as typeof import('../app/superadmin/usage');
const {niceScale, dayLabel} = require('../app/superadmin/usage-charts') as typeof import('../app/superadmin/usage-charts');
const {default: PlatformAdmin} = require('../app/superadmin/page') as typeof import('../app/superadmin/page');
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';
const charts = (renderer: ReactTestRenderer) => renderer.root.findAllByType('svg').filter(node => String(node.props['aria-label'] || '').includes('Los datos están en la tabla'));
const rendered = (renderer: ReactTestRenderer) => text(renderer.toJSON());

const days = Array.from({length: 7}, (_, i) => `2026-10-${String(8 + i).padStart(2, '0')}`);
const payload: UsagePayload = {
  range: {from: '2026-10-08', to: '2026-10-14', days: 7, previous_from: '2026-10-01', previous_to: '2026-10-07', timezone: 'America/Asuncion'},
  totals: {unique_users: 12, recurring_users: 5, sessions: 40, previous_unique_users: 10, active_now: 2},
  daily: days.map((day, i) => ({day, users: i + 1, sessions: i + 2, previous_day: `2026-10-0${i + 1}`, previous_users: i})),
  signups: days.map((day, i) => ({day, users: i % 2, agencies: i % 3 === 0 ? 1 : 0})),
  hourly: Array.from({length: 24}, (_, hour) => ({hour, users: hour % 5})),
  monthly: [{month: '2026-07', signups: 3, active_users: 9}, {month: '2026-08', signups: 4, active_users: 11}, {month: '2026-09', signups: 5, active_users: 13}, {month: '2026-10', signups: 2, active_users: 12}],
  agencies: [
    {id: 1, name: 'Agencia Norte', active7: 3, active30: 6, sessions: 20, last_seen_at: '2026-10-14T15:00:00Z', owner: {name: 'Ana Dueña', avatar_url: null, email: 'ana@norte.example'}},
    {id: 2, name: 'Agencia Sur', active7: 1, active30: 2, sessions: 9, last_seen_at: '2026-10-10T15:00:00Z', owner: null},
  ],
  users: [{id: 7, name: 'Beto Pérez', avatar_url: null, email: 'beto@norte.example', agency: 'Agencia Norte', last_seen_at: '2026-10-14T15:00:00Z', sessions: 4}],
};

function browser() {
  const previous = {self: Object.getOwnPropertyDescriptor(globalThis, 'self'), window: Object.getOwnPropertyDescriptor(globalThis, 'window'), fetch: globalThis.fetch};
  Object.defineProperties(globalThis, {self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true}});
  return () => {
    globalThis.fetch = previous.fetch;
    for (const key of ['self', 'window'] as const) { const descriptor = previous[key]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  };
}

test('usage helpers: Asunción range, nice axis and day labels', () => {
  assert.equal(usageQuery(7, new Date('2026-10-14T01:00:00Z')), '?from=2026-10-07&to=2026-10-13', '01:00Z todavía es el día anterior en Asunción');
  assert.equal(usageQuery(30, new Date('2026-10-14T15:00:00Z')), '?from=2026-09-15&to=2026-10-14');
  assert.deepEqual(niceScale(0), {ceil: 1, ticks: [0, 1]});
  assert.equal(niceScale(37).ceil, 40);
  assert.equal(dayLabel('2026-10-04'), '04-oct');
  assert.equal(dayLabel(null), '');
});

test('usage tab renders KPIs, charts with data tables and both lists from the API payload', async () => {
  const restore = browser();
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(payload), {status: 200}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformUsage/>); });
    assert.equal(urls.length, 1);
    assert.match(urls[0], /^\/core-api\/api\/platform\/usage\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/);
    const html = rendered(renderer);
    for (const expected of ['Usuarios únicos', 'Recurrentes (≥2 días)', 'Sesiones', 'Activos ahora', '+20 % vs período anterior', 'Usuarios únicos por día', 'Altas por día', 'Usuarios únicos por hora', 'Uso por agencia', 'Usuarios recientes', 'Agencia Norte', 'Ana Dueña', 'ana@norte.example', 'Sin responsable', 'Beto Pérez', 'sept 2026'])
      assert.ok(html.includes(expected), `falta «${expected}»`);
    assert.equal(charts(renderer).length, 3, 'tres gráficos SVG con nombre accesible');
    assert.equal(renderer.root.findAllByType('details').length, 3, 'cada gráfico trae su tabla de datos');
    assert.equal(renderer.root.findAllByProps({role: 'table'}).length, 3, 'meses, agencias y usuarios en tablas de lista');
    assert.equal(renderer.root.findAllByProps({'aria-label': 'Período de uso'})[0] !== undefined, true);
    // Cambiar a 7 días vuelve a pedir el rango real.
    await act(async () => { renderer.root.findAllByType('button').find(node => text(node.children) === '7 días')!.props.onClick(); });
    assert.equal(urls.length, 2);
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('usage tab is honest when there is no activity and when the API fails', async () => {
  const restore = browser();
  const empty: UsagePayload = {...payload, totals: {unique_users: 0, recurring_users: 0, sessions: 0, previous_unique_users: 0, active_now: 0}, signups: payload.signups.map(row => ({...row, users: 0, agencies: 0})), users: [], agencies: []};
  let renderer!: ReactTestRenderer;
  try {
    globalThis.fetch = (async () => new Response(JSON.stringify(empty), {status: 200})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformUsage/>); });
    const html = rendered(renderer);
    assert.ok(html.includes('Sin actividad en el período.'));
    assert.ok(html.includes('Sin período anterior para comparar') || html.includes('vs período anterior'));
    assert.equal(charts(renderer).length, 0, 'sin datos no se dibujan ejes vacíos');
    act(() => renderer.unmount());
    globalThis.fetch = (async () => new Response(JSON.stringify({error: 'Sin permiso'}), {status: 500})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformUsage/>); });
    assert.ok(rendered(renderer).includes('Sin permiso'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('a user without global access never fetches usage and an admin only fetches it from the Uso tab', async () => {
  const restore = browser();
  const urls: string[] = [];
  let renderer!: ReactTestRenderer;
  const admin: Record<string, unknown> = {
    '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 0}, coupons: {total: 0, active: 0}, subscriptions: []},
    '/api/platform/agencies': {agencies: []}, '/api/platform/users': {users: []}, '/api/platform/coupons': {coupons: []}, '/api/platform/audit': {actions: []},
    '/api/auth/me': {user: {id: 1, platform_role: 'admin'}}, '/api/platform/bootstrap-status': {initialized: true}, '/api/platform/usage': payload,
  };
  const mount = () => create(<AppRouterContext.Provider value={{replace() {}} as never}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: () => ({scrollIntoView() {}})});
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify({error: 'No tenés acceso a la administración global.'}), {status: 403}); }) as typeof fetch;
    await act(async () => { renderer = mount(); });
    assert.ok(urls.length > 0);
    assert.equal(urls.some(url => url.includes('/usage')), false, 'un no-admin nunca consulta el uso');
    assert.equal(renderer.root.findAllByProps({'aria-label': 'Secciones del panel global'}).length, 0, 'sin acceso no hay pestañas');
    act(() => renderer.unmount());
    urls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(admin[String(input).replace('/core-api', '').split('?')[0]]), {status: 200}); }) as typeof fetch;
    await act(async () => { renderer = mount(); });
    assert.equal(urls.some(url => url.includes('/usage')), false, 'la carga inicial del panel no pide el uso');
    const tabs = renderer.root.findByProps({'aria-label': 'Secciones del panel global'}).findAllByType('button');
    assert.equal(text(tabs[6].children).includes('Uso'), true);
    await act(async () => { tabs[6].props.onClick(); });
    assert.equal(urls.filter(url => url.includes('/usage')).length, 1);
    assert.ok(rendered(renderer).includes('Uso por agencia'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('a slow response for a previous range never overwrites the range chosen later', async () => {
  const restore = browser();
  const pending: {url: string; resolve: (response: Response) => void}[] = [];
  globalThis.fetch = ((input: RequestInfo | URL) => new Promise<Response>(resolve => { pending.push({url: String(input), resolve}); })) as typeof fetch;
  const weekly: UsagePayload = {...payload, range: {...payload.range, days: 7}, agencies: [{...payload.agencies[0], name: 'Rango de 7 días'}]};
  const monthly: UsagePayload = {...payload, range: {...payload.range, days: 30}, agencies: [{...payload.agencies[0], name: 'Rango de 30 días'}]};
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformUsage/>); });
    assert.equal(pending.length, 1, 'carga inicial de 30 días');
    await act(async () => { renderer.root.findAllByType('button').find(node => text(node.children) === '7 días')!.props.onClick(); });
    assert.equal(pending.length, 2, 'el cambio a 7 días pide su rango');
    // Llega primero la de 7 días (la vigente) y después la de 30 días (vieja).
    await act(async () => { pending[1].resolve(new Response(JSON.stringify(weekly), {status: 200})); });
    await act(async () => { pending[0].resolve(new Response(JSON.stringify(monthly), {status: 200})); });
    const html = rendered(renderer);
    assert.ok(html.includes('Rango de 7 días'), 'queda el rango elegido');
    assert.equal(html.includes('Rango de 30 días'), false, 'la respuesta vieja se descarta');
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});
