import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import type {ErrorGroup, ErrorPage, ReportPage, UserReport} from '../app/superadmin/model';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
// El detalle usa el Dialog real: solo se doblan el portal y el DOM que toca al montar.
const reactDOM = require('react-dom');
reactDOM.createPortal = (children: React.ReactNode) => children;
const listeners = new Map<string, Set<unknown>>();
const hostDocument = {body: {style: {overflow: ''}}, activeElement: null as unknown, addEventListener(name: string, fn: unknown) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name)!.add(fn); }, removeEventListener(name: string, fn: unknown) { listeners.get(name)?.delete(fn); }};
Object.defineProperty(globalThis, 'document', {configurable: true, value: hostDocument});
const hostNode = () => ({tagName: 'DIV', tabIndex: -1, isConnected: true, querySelectorAll: () => [], querySelector: () => null, closest: () => null, contains: () => true, focus() { hostDocument.activeElement = this; }, getBoundingClientRect: () => ({right: 900})});
const {PlatformErrors, ErrorsKpi, errorsQuery} = require('../app/superadmin/errors') as typeof import('../app/superadmin/errors');
const {PlatformReports, reportsQuery} = require('../app/superadmin/reports') as typeof import('../app/superadmin/reports');
const {PLATFORM_SECTIONS, resolveSection} = require('../app/superadmin/sections') as typeof import('../app/superadmin/sections');
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';
const rendered = (renderer: ReactTestRenderer) => text(renderer.toJSON());

function browser() {
  const previous = {self: Object.getOwnPropertyDescriptor(globalThis, 'self'), window: Object.getOwnPropertyDescriptor(globalThis, 'window'), fetch: globalThis.fetch, ro: globalThis.ResizeObserver};
  Object.defineProperties(globalThis, {self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true}});
  Object.assign(globalThis, {dispatchEvent: () => true, ResizeObserver: class { observe() {} disconnect() {} }});
  return () => {
    globalThis.fetch = previous.fetch;
    Object.assign(globalThis, {ResizeObserver: previous.ro});
    for (const key of ['self', 'window'] as const) { const descriptor = previous[key]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  };
}
const wide = () => ({...hostNode(), clientWidth: 1400, scrollIntoView() {}});

const errors: ErrorGroup[] = [
  {id: 7, source: 'web', message: 'TypeError: Cannot read properties of undefined (reading \'map\')', route: '/clientes/:id', occurrences: 1284, first_seen_at: '2026-10-13T10:00:00Z', last_seen_at: '2026-10-14T15:00:00Z', status: 'new', resolved_at: null, resolved_by_email: null},
  {id: 5, source: 'api', message: 'HTTP 500 · No se pudo completar la solicitud', route: '/api/agency/budgets/:id', occurrences: 3, first_seen_at: '2026-10-12T10:00:00Z', last_seen_at: '2026-10-13T09:00:00Z', status: 'resolved', resolved_at: '2026-10-13T12:00:00Z', resolved_by_email: 'platform@scale.example'},
];
const errorPage = (rows: ErrorGroup[]): ErrorPage => ({errors: rows, total: rows.length, hasMore: false, limit: 50, offset: 0, counts: {new: rows.filter(r => r.status === 'new').length, resolved: rows.filter(r => r.status === 'resolved').length, ignored: 0}, last24h: {groups: 1, new_groups: 0}});

test('las dos secciones nuevas quedan registradas en el panel', () => {
  // Una entrada cada una en la lista única del shell (sections.tsx), con componente y deep link.
  for (const id of ['errores', 'reportes']) {
    assert.equal(PLATFORM_SECTIONS.filter(item => item.id === id).length, 1, `una sola entrada ${id}`);
    assert.ok(PLATFORM_SECTIONS.find(item => item.id === id)!.component, `${id} monta su componente`);
    assert.equal(resolveSection(id).id, id, `?vista=${id}`);
  }
  assert.equal(errorsQuery('', ''), '/api/platform/errors?limit=50');
  assert.equal(errorsQuery('new', 'web', 50), '/api/platform/errors?limit=50&offset=50&status=new&source=web');
  assert.equal(reportsQuery('in_progress'), '/api/platform/reports?limit=50&status=in_progress');
});

test('Errores: lista agrupada con origen, ruta sin query, ocurrencias, estado, detalle con stack y acciones de admin', async () => {
  const restore = browser();
  const calls: {url: string; method: string; body?: string}[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method || 'GET';
    calls.push({url, method, body: init?.body as string | undefined});
    if (method === 'PATCH') return new Response(JSON.stringify({error: {...errors[0], status: JSON.parse(String(init?.body)).status, resolved_at: '2026-10-14T16:00:00Z', resolved_by_email: 'platform@scale.example'}, counts: {new: 0, resolved: 2, ignored: 0}, last24h: {groups: 1, new_groups: 0}}), {status: 200});
    if (/\/errors\/7$/.test(url)) return new Response(JSON.stringify({error: {...errors[0], sample_stack: 'TypeError: x\n    at renderRow (app/sections/clientes.tsx:120:15)', sample_meta: {kind: 'error', version: '1.0.187'}}}), {status: 200});
    return new Response(JSON.stringify(url.includes('source=api') ? errorPage([errors[1]]) : errorPage(errors)), {status: 200});
  }) as typeof fetch;
  const counts: unknown[] = [];
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformErrors writable onError={() => false} onCounts={value => counts.push(value)}/>, {createNodeMock: wide}); });
    assert.equal(calls[0].url, '/core-api/api/platform/errors?limit=50');
    assert.equal(renderer.root.findByProps({role: 'table'}).props['aria-label'], 'Errores agrupados');
    const html = rendered(renderer);
    for (const label of ['Mensaje', 'Origen', 'Ruta', 'Ocurrencias', 'Última vez', 'Estado', 'Acciones', 'Web', 'API', '/clientes/:id', 'Nuevo', 'Resuelto', '1 nuevo', '1 en 24 h'])
      assert.ok(html.includes(label), `falta «${label}»`);
    assert.ok(html.includes('1.284'), 'ocurrencias con separador de miles');
    assert.deepEqual(counts[0], {new: 1, resolved: 1, ignored: 0});
    // Detalle con el stack de muestra.
    const detailButton = renderer.root.findAllByType('button').find(node => text(node.children) === 'Ver detalle')!;
    await act(async () => { detailButton.props.onClick(); });
    assert.ok(calls.some(call => call.url === '/core-api/api/platform/errors/7'));
    const stack = renderer.root.find(node => node.type === 'pre');
    assert.ok(text(stack.children).includes('at renderRow'));
    assert.ok(rendered(renderer).includes('1.0.187'), 'metadatos de la muestra');
    // Marcar resuelto desde el detalle → PATCH solo con el estado.
    const resolve = renderer.root.findAllByType('button').find(node => text(node.children) === 'Marcar resuelto')!;
    await act(async () => { resolve.props.onClick(); });
    const patch = calls.find(call => call.method === 'PATCH')!;
    assert.equal(patch.url, '/core-api/api/platform/errors/7');
    assert.deepEqual(JSON.parse(patch.body!), {status: 'resolved'});
    assert.deepEqual(counts.at(-1), {new: 0, resolved: 2, ignored: 0});
    // Filtro por origen: se pide al API.
    await act(async () => { renderer.root.findByProps({label: 'Filtrar errores por origen',hideLabel:true}).props.onChange('api'); });
    assert.equal(calls.at(-1)!.url, '/core-api/api/platform/errors?limit=50&source=api');
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('Errores: el visor global no ve acciones de escritura; vacío y error con reintento', async () => {
  const restore = browser();
  globalThis.fetch = (async () => new Response(JSON.stringify(errorPage(errors)), {status: 200})) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformErrors writable={false} onError={() => false}/>, {createNodeMock: () => ({...hostNode(), clientWidth: 360})}); });
    assert.equal(renderer.root.findAllByProps({role: 'table'}).length, 0);
    assert.equal(renderer.root.findAllByType('article').length, 2, 'tarjetas en mobile');
    assert.equal(renderer.root.findAllByType('button').some(node => /Marcar resuelto|Ignorar|Reabrir/.test(text(node.children))), false);
    act(() => renderer.unmount());
    globalThis.fetch = (async () => new Response(JSON.stringify(errorPage([])), {status: 200})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformErrors writable onError={() => false}/>, {createNodeMock: wide}); });
    assert.ok(rendered(renderer).includes('Sin errores registrados.'));
    act(() => renderer.unmount());
    globalThis.fetch = (async () => new Response(JSON.stringify({error: 'Base no disponible'}), {status: 500})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformErrors writable onError={() => false}/>, {createNodeMock: wide}); });
    assert.ok(rendered(renderer).includes('Base no disponible'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

const reports: UserReport[] = [
  {id: 11, category: 'error', message: 'Al guardar el presupuesto aparece un error y no se guarda.', route: '/presupuestos/:id', app_version: '1.0.187', status: 'new', note: null, handled_at: null, handled_by_email: null, created_at: '2026-10-14T15:00:00Z', organization_name: 'Estudio Audiovisual', user_email: 'ana@estudio.example', user_name: 'Ana Benítez'},
  {id: 10, category: 'sugerencia', message: 'Estaría bueno exportar el kanban.', route: '/produccion', app_version: null, status: 'in_progress', note: 'Lo vemos en la próxima', handled_at: '2026-10-14T16:00:00Z', handled_by_email: 'platform@scale.example', created_at: '2026-10-13T15:00:00Z', organization_name: null, user_email: null, user_name: null},
];
const reportPage = (rows: UserReport[]): ReportPage => ({reports: rows, total: rows.length, hasMore: false, limit: 50, offset: 0, counts: {new: rows.filter(r => r.status === 'new').length, in_progress: rows.filter(r => r.status === 'in_progress').length, resolved: 0}});

test('Reportes: estado, agencia, usuario, fecha; tomar, cambiar estado + nota', async () => {
  const restore = browser();
  const calls: {url: string; method: string; body?: string}[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method || 'GET';
    calls.push({url, method, body: init?.body as string | undefined});
    if (method === 'PATCH') return new Response(JSON.stringify({report: {...reports[0], ...JSON.parse(String(init?.body))}, counts: {new: 0, in_progress: 2, resolved: 0}}), {status: 200});
    return new Response(JSON.stringify(reportPage(reports)), {status: 200});
  }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformReports writable onError={() => false}/>, {createNodeMock: wide}); });
    assert.equal(calls[0].url, '/core-api/api/platform/reports?limit=50');
    const html = rendered(renderer);
    for (const label of ['Fecha', 'Agencia / usuario', 'Reporte', 'Ruta y versión', 'Estado', 'Estudio Audiovisual', 'Ana Benítez', 'Algo no funciona', 'Sugerencia', '/presupuestos/:id', 'v1.0.187', 'Sin versión', 'Sin agencia', 'Usuario eliminado', 'Nuevo', 'En curso', 'Nota: Lo vemos en la próxima', '1 nuevo'])
      assert.ok(html.includes(label), `falta «${label}»`);
    const take = renderer.root.findAllByType('button').find(node => text(node.children) === 'Tomar')!;
    await act(async () => { take.props.onClick(); });
    let patch = calls.filter(call => call.method === 'PATCH').at(-1)!;
    assert.equal(patch.url, '/core-api/api/platform/reports/11');
    assert.deepEqual(JSON.parse(patch.body!), {status: 'in_progress'});
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('Reportes: el visor no ve acciones', async () => {
  const restore = browser();
  globalThis.fetch = (async () => new Response(JSON.stringify(reportPage(reports)), {status: 200})) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformReports writable={false} onError={() => false}/>, {createNodeMock: wide}); });
    assert.equal(renderer.root.findAllByType('button').some(node => /Tomar|Marcar|nota/i.test(text(node.children))), false);
    assert.ok(rendered(renderer).includes('Estudio Audiovisual'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('Resumen: KPI «Errores 24 h» con el componente compartido y acceso a la sección', async () => {
  const restore = browser();
  const urls: string[] = [];const went: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify({...errorPage(errors), last24h: {groups: 12, new_groups: 3}}), {status: 200}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<ErrorsKpi onGoTo={view => went.push(view)}/>, {createNodeMock: wide}); });
    assert.deepEqual(urls, ['/core-api/api/platform/errors?limit=1']);
    const html = rendered(renderer);
    assert.ok(html.includes('Errores 24 h') && html.includes('12') && html.includes('3 nuevos'));
    assert.ok(html.includes('Errores agrupados'), 'nota fuente · cálculo');
    await act(async () => { renderer.root.findAllByType('button')[0].props.onClick(); });
    assert.deepEqual(went, ['errores']);
    act(() => renderer.unmount());
    globalThis.fetch = (async () => { throw new Error('red'); }) as typeof fetch;
    await act(async () => { renderer = create(<ErrorsKpi/>, {createNodeMock: wide}); });
    assert.ok(rendered(renderer).includes('Errores 24 h'), 'si falla, el Resumen sigue');
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});
