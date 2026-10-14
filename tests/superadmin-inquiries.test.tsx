import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {Inquiry, InquiryPage} from '../app/superadmin/model';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const {PlatformInquiries, whatsappHref, mailtoHref, inquiriesQuery} = require('../app/superadmin/inquiries') as typeof import('../app/superadmin/inquiries');
const {default: PlatformAdmin} = require('../app/superadmin/page') as typeof import('../app/superadmin/page');
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';
const rendered = (renderer: ReactTestRenderer) => text(renderer.toJSON());

const long = 'Queremos ordenar la producción de 14 clientes y dejar de usar planillas. ' + 'Detalle '.repeat(40);
const inquiries: Inquiry[] = [
  {id: 3, name: 'Ana Benítez', company: 'Estudio Audiovisual', email: 'ana@estudio.example', whatsapp: '+595 981123456', message: long, consent: true, source: 'landing', source_url: null, status: 'new', note: null, handled_at: null, handled_by_email: null, created_at: '2026-10-14T15:00:00Z'},
  {id: 2, name: 'Compras Coop', company: 'Cooperativa', email: 'compras@coop.example', whatsapp: null, message: '', consent: true, source: 'landing', source_url: null, status: 'contacted', note: 'Llamar el lunes', handled_at: '2026-10-14T16:00:00Z', handled_by_email: 'platform@scale.example', created_at: '2026-10-13T15:00:00Z'},
];
const pageOf = (rows: Inquiry[]): InquiryPage => ({inquiries: rows, total: rows.length, hasMore: false, limit: 50, offset: 0, counts: {new: rows.filter(r => r.status === 'new').length, contacted: rows.filter(r => r.status === 'contacted').length, closed: 0}});

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
const wide = () => ({clientWidth: 1400, scrollIntoView() {}});

test('helpers: WhatsApp link, reply mail and paginated/filtered query', () => {
  assert.equal(whatsappHref('+595 981 123-456'), 'https://wa.me/595981123456');
  assert.equal(whatsappHref(null), '');
  assert.match(mailtoHref({email: 'ana@estudio.example', company: 'Estudio & Co'}), /^mailto:ana@estudio\.example\?subject=Tu%20consulta%20sobre%20Scale%20OS%20%C2%B7%20Estudio%20%26%20Co$/);
  assert.equal(inquiriesQuery(''), '/api/platform/inquiries?limit=50');
  assert.equal(inquiriesQuery('contacted', 50), '/api/platform/inquiries?limit=50&offset=50&status=contacted');
});

test('Consultas tab lists the inquiries with contact links, truncated message, status filter and admin actions', async () => {
  const restore = browser();
  const calls: {url: string; method: string; body?: string}[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method || 'GET';
    calls.push({url, method, body: init?.body as string | undefined});
    if (method === 'PATCH') {
      const body = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({inquiry: {...inquiries[0], ...body, handled_at: '2026-10-14T17:00:00Z'}, counts: {new: 0, contacted: 2, closed: 0}}), {status: 200});
    }
    return new Response(JSON.stringify(url.includes('status=closed') ? pageOf([]) : pageOf(inquiries)), {status: 200});
  }) as typeof fetch;
  const counts: unknown[] = [];
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformInquiries writable onError={() => false} onCounts={value => counts.push(value)}/>, {createNodeMock: wide}); });
    assert.equal(calls[0].url, '/core-api/api/platform/inquiries?limit=50');
    const table = renderer.root.findByProps({role: 'table'});
    assert.equal(table.props['aria-label'], 'Consultas de la landing');
    const html = rendered(renderer);
    for (const label of ['Fecha', 'Nombre / empresa', 'Contacto', 'Mensaje', 'Estado', 'Acciones', 'Ana Benítez', 'Estudio Audiovisual', 'ana@estudio.example', 'WhatsApp +595 981123456', 'Sin WhatsApp', 'Nueva', 'Contactada', 'Nota: Llamar el lunes', '1 nueva'])
      assert.ok(html.includes(label), `falta «${label}»`);
    // Correo y WhatsApp son enlaces reales; el mensaje largo se recorta con su texto completo en title.
    assert.ok(renderer.root.findAll(node => node.type === 'a' && String(node.props.href).startsWith('mailto:ana@estudio.example')).length >= 1);
    const wa = renderer.root.find(node => node.type === 'a' && node.props.href === 'https://wa.me/595981123456');
    assert.equal(wa.props.target, '_blank');assert.equal(wa.props.rel, 'noopener noreferrer');
    const message = renderer.root.find(node => node.type === 'span' && node.props.title === long.trim());
    assert.match(String(message.props.className), /line-clamp-2/);
    assert.deepEqual(counts[0], {new: 1, contacted: 1, closed: 0});
    // Acción primaria: marcar contactada (PATCH con solo el estado).
    const primary = renderer.root.findAllByType('button').find(node => text(node.children) === 'Marcar contactada')!;
    await act(async () => { primary.props.onClick(); });
    const patch = calls.find(call => call.method === 'PATCH')!;
    assert.equal(patch.url, '/core-api/api/platform/inquiries/3');
    assert.deepEqual(JSON.parse(patch.body!), {status: 'contacted'});
    assert.deepEqual(counts.at(-1), {new: 0, contacted: 2, closed: 0}, 'los contadores vuelven al marco');
    assert.equal(renderer.root.findAllByType('button').some(node => text(node.children) === 'Marcar contactada'), false);
    // Filtro por estado: se pide al API.
    await act(async () => { renderer.root.findByProps({'aria-label': 'Filtrar consultas por estado'}).props.onChange({target: {value: 'closed'}}); });
    assert.equal(calls.at(-1)!.url, '/core-api/api/platform/inquiries?limit=50&status=closed');
    assert.ok(rendered(renderer).includes('Sin consultas con este estado.'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('a read-only global viewer sees the inquiries without mutating actions; narrow containers get cards', async () => {
  const restore = browser();
  globalThis.fetch = (async () => new Response(JSON.stringify(pageOf(inquiries)), {status: 200})) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformInquiries writable={false} onError={() => false}/>, {createNodeMock: () => ({clientWidth: 360})}); });
    assert.equal(renderer.root.findAllByProps({role: 'table'}).length, 0);
    assert.equal(renderer.root.findAllByType('article').length, 2, 'tarjetas en mobile');
    assert.equal(renderer.root.findAllByType('button').some(node => /Marcar contactada|Cerrar consulta|nota/i.test(text(node.children))), false, 'sin acciones de escritura');
    assert.ok(rendered(renderer).includes('ana@estudio.example'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('the API error is shown with retry and a 403 is delegated to the panel gate', async () => {
  const restore = browser();
  globalThis.fetch = (async () => new Response(JSON.stringify({error: 'No tenés acceso a la administración global.'}), {status: 403})) as typeof fetch;
  let renderer!: ReactTestRenderer;
  const delegated: unknown[] = [];
  try {
    await act(async () => { renderer = create(<PlatformInquiries writable onError={cause => { delegated.push(cause); return true; }}/>, {createNodeMock: wide}); });
    assert.equal(delegated.length, 1);
    act(() => renderer.unmount());
    globalThis.fetch = (async () => new Response(JSON.stringify({error: 'Base no disponible'}), {status: 500})) as typeof fetch;
    await act(async () => { renderer = create(<PlatformInquiries writable onError={() => false}/>, {createNodeMock: wide}); });
    assert.ok(rendered(renderer).includes('Base no disponible'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('panel: Consultas item with the new-inquiries badge, compact header without the access notice', async () => {
  const restore = browser();
  const urls: string[] = [];
  const data: Record<string, unknown> = {
    '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 0}, coupons: {total: 0, active: 0}, subscriptions: []},
    '/api/platform/agencies': {agencies: []}, '/api/platform/users': {users: []}, '/api/platform/coupons': {coupons: []}, '/api/platform/audit': {actions: []},
    '/api/auth/me': {user: {id: 1, platform_role: 'admin'}}, '/api/platform/bootstrap-status': {initialized: true},
    '/api/platform/inquiries': {...pageOf(inquiries), counts: {new: 4, contacted: 1, closed: 0}},
  };
  globalThis.fetch = (async (input: RequestInfo | URL) => { urls.push(String(input)); return new Response(JSON.stringify(data[String(input).replace('/core-api', '').split('?')[0]]), {status: 200}); }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={{replace() {}} as never}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: wide}); });
    const tabs = renderer.root.findByProps({'aria-label': 'Secciones del panel global'}).findAllByType('button');
    assert.equal(tabs.length, 7);
    assert.equal(tabs[1].props['aria-label'], 'Consultas (4)', 'la pestaña cuenta las consultas nuevas');
    assert.ok(urls.includes('/core-api/api/platform/inquiries?limit=1'), 'el contador sale del mismo endpoint');
    const html = rendered(renderer);
    assert.equal(html.includes('Acceso separado por plataforma'), false, 'el aviso ya no ocupa una fila');
    assert.equal(html.includes('Administración global'), false, 'sin rótulo redundante sobre el título');
    const chip = renderer.root.find(node => typeof node.props.title === 'string' && node.props.title.includes('Acceso separado por plataforma'));
    assert.ok(text(chip.children).includes('Admin global'), 'el aviso queda en el tooltip del permiso');
    for (const label of ['Actualizar', 'Volver al panel']) assert.ok(renderer.root.findAll(node => node.props['aria-label'] === label && (node.type === 'button' || node.type === 'a' || typeof node.type !== 'string')).length >= 1, `acción ${label} con nombre accesible`);
    await act(async () => { tabs[1].props.onClick(); });
    assert.ok(rendered(renderer).includes('Consultas de la landing'));
    assert.ok(urls.includes('/core-api/api/platform/inquiries?limit=50'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('header and sidebar CSS contract: one compact row, icon-only mobile actions, scrollable section strip', () => {
  const styles = readFileSync(new URL('../app/superadmin/platform-admin.css', import.meta.url), 'utf8');
  assert.match(styles, /\.platform-admin-actions :is\(\.secondary\) \{ display: inline-flex; align-items: center; gap: 6px; min-height: 36px;/);
  assert.match(styles, /\.platform-admin-top \{ flex-wrap: nowrap; gap: 8px \}/);
  assert.match(styles, /\.platform-admin-action-label \{ position: absolute; width: 1px; height: 1px;/);
  assert.match(styles, /\.platform-shell nav\.platform-sidebar-nav \{ flex-direction: row; gap: 4px; overflow-x: auto;/);
  assert.match(styles, /\.platform-nav-badge\[data-attention\] \{ background: var\(--brand-700\)/);
  assert.doesNotMatch(readFileSync(new URL('../app/superadmin/states.tsx', import.meta.url), 'utf8'), /Acceso separado por plataforma/);
});
