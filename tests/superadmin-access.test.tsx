import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {NextRequest} from 'next/server';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';

// Acceso al panel global (guía §1) y deep links del shell (guía §2).
Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const {middleware} = require('../middleware') as typeof import('../middleware');
const {default: PlatformAdmin} = require('../app/superadmin/page') as typeof import('../app/superadmin/page');
const {PLATFORM_SECTIONS, resolveSection} = require('../app/superadmin/sections') as typeof import('../app/superadmin/sections');
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';

const visit = (host: string, path: string, cookie = '') => middleware(new NextRequest(`https://${host}${path}`, {headers: {host, ...(cookie ? {cookie} : {})}}));

test('sin sesión, /superadmin vuelve al inicio de la app desde el middleware (sin servir el panel)', () => {
  for (const [host, path] of [['app.scaleparaguay.com', '/superadmin'], ['app.scaleparaguay.com', '/superadmin/trafico'], ['admin.scaleparaguay.com', '/'], ['admin.scaleparaguay.com', '/superadmin']] as const) {
    const response = visit(host, path);
    assert.equal(response.status, 307, `${host}${path}`);
    assert.equal(response.headers.get('location'), 'https://app.scaleparaguay.com/', `${host}${path}: al inicio, sin ?next que delate el panel`);
  }
  // Con sesión decide el API (el guard relee la base): el middleware deja pasar.
  assert.equal(visit('app.scaleparaguay.com', '/superadmin', 'scale_session=abc').status, 200);
  assert.equal(visit('admin.scaleparaguay.com', '/', 'scale_session=abc').headers.get('x-middleware-rewrite'), 'https://admin.scaleparaguay.com/superadmin');
  // Fuera de producción (dev local) no hay cookie de dominio: lo resuelve la página.
  assert.equal(visit('localhost', '/superadmin').status, 200);
  assert.equal(visit('app.scaleparaguay.com', '/superadministrador').status, 200, 'solo la ruta del panel');
});

function browser(search = '') {
  const previous = {self: Object.getOwnPropertyDescriptor(globalThis, 'self'), window: Object.getOwnPropertyDescriptor(globalThis, 'window'), location: Object.getOwnPropertyDescriptor(globalThis, 'location'), history: Object.getOwnPropertyDescriptor(globalThis, 'history'), fetch: globalThis.fetch};
  const replaced: string[] = [];
  Object.defineProperties(globalThis, {
    self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true},
    location: {value: {search, pathname: '/superadmin', hash: ''}, configurable: true},
    history: {value: {replaceState: (_s: unknown, _t: string, url: string) => replaced.push(url)}, configurable: true},
  });
  return {replaced, restore() {
    globalThis.fetch = previous.fetch;
    for (const key of ['self', 'window', 'location', 'history'] as const) { const descriptor = previous[key]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }};
}

for (const status of [401, 403, 404]) test(`con sesión pero sin acceso (${status} del guard) la página vuelve al inicio sin dibujar nada propio`, async () => {
  const env = browser('?vista=agencias');
  const urls: string[] = [];
  const routes: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify({error: 'No encontrado.'}), {status}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={{replace(url: string) { routes.push(url); }} as never}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: () => ({scrollIntoView() {}})}); });
    assert.deepEqual(routes, ['/'], 'vuelve al inicio de la app');
    assert.equal(text(renderer.toJSON()), '', 'ni título, ni motivo, ni «no autorizado»');
    assert.equal(renderer.root.findAllByProps({'aria-label': 'Secciones del panel global'}).length, 0);
    assert.equal(urls.some(url => /\/(agencies|users|coupons|audit|usage|metrics|inquiries)/.test(url) && urls.indexOf(url) > 1), false, 'no sigue pidiendo datos después del rechazo');
  } finally { if (renderer) act(() => renderer.unmount()); env.restore(); }
});

test('deep links ?vista=<id> (con alias «actividad») abren la sección y la URL acompaña los cambios', async () => {
  assert.equal(resolveSection('actividad').id, 'uso');
  assert.equal(resolveSection('CONSULTAS').id, 'consultas');
  assert.equal(resolveSection('no-existe').id, 'resumen');
  assert.equal(resolveSection('trafico').id, 'trafico', 'Tráfico y demos se monta como sección del panel');
  assert.ok(PLATFORM_SECTIONS.every(section => section.id && section.label && typeof section.icon !== 'undefined' && (section.component || section.href)), 'cada entrada declara {id, label, icon, component|href}');
  assert.equal(new Set(PLATFORM_SECTIONS.map(section => section.id)).size, PLATFORM_SECTIONS.length, 'ids únicos');
  const env = browser('?vista=actividad&periodo=7d');
  const urls: string[] = [];
  const data: Record<string, unknown> = {
    '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 0}, coupons: {total: 0, active: 0}, subscriptions: []},
    '/api/platform/agencies': {agencies: []}, '/api/platform/users': {users: []}, '/api/platform/coupons': {coupons: []}, '/api/platform/audit': {actions: []},
    '/api/auth/me': {user: {id: 1, platform_role: 'viewer'}}, '/api/platform/bootstrap-status': {initialized: true},
    '/api/platform/usage': {range: {from: '2026-10-08', to: '2026-10-14', days: 7, previous_from: '2026-10-01', previous_to: '2026-10-07', timezone: 'America/Asuncion'},
      totals: {unique_users: 0, recurring_users: 0, sessions: 0, previous_unique_users: 0, active_now: 0}, daily: [], signups: [], hourly: [], monthly: [], agencies: [], users: [], has_data: {sessions: false, users: false}},
  };
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(data[String(input).replace('/core-api', '').split('?')[0]] ?? {}), {status: 200}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={{replace() {}} as never}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: () => ({scrollIntoView() {}, clientWidth: 1200})}); });
    const items = renderer.root.findByProps({'aria-label': 'Secciones del panel global'}).findAllByType('button');
    assert.equal(items.find(node => node.props['aria-current'] === 'page')!.props.title, 'Uso', '«actividad» abre Uso');
    assert.ok(urls.some(url => url.includes('/api/platform/usage?from=')), 'Uso pide su rango');
    const range = urls.find(url => url.includes('/api/platform/usage'))!;
    const [, from, to] = /from=(\d{4}-\d{2}-\d{2})&to=(\d{4}-\d{2}-\d{2})/.exec(range)!;
    assert.equal((Date.parse(to) - Date.parse(from)) / 86400000 + 1, 7, '?periodo=7d abre los 7 días');
    assert.ok(text(renderer.toJSON()).includes('Uso y actividad'), 'la barra superior titula la sección');
    // Ir al Resumen comparte el período y escribe la vista en la URL.
    await act(async () => { items[0].props.onClick(); });
    assert.ok(env.replaced.at(-1)!.includes('vista=resumen'));
    assert.ok(urls.some(url => url.includes('/api/platform/metrics?from=' + from)), 'el Resumen usa el mismo período');
    const chips = renderer.root.findByProps({'aria-label': 'Período'}).findAllByType('button');
    assert.deepEqual(chips.map(node => text(node.children)), ['Hoy', '7 d', '30 d', '90 d', 'Mes actual', 'Mes anterior']);
    await act(async () => { chips[0].props.onClick(); });
    assert.ok(env.replaced.at(-1)!.includes('periodo=hoy'));
    // Viewer: ningún control mutante en el shell.
    assert.equal(text(renderer.toJSON()).includes('Solo lectura'), true);
  } finally { if (renderer) act(() => renderer.unmount()); env.restore(); }
});
