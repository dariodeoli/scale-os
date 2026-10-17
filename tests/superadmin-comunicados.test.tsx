import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import type {PlatformAnnouncement} from '../app/superadmin/announcements';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const reactDOM = require('react-dom'); reactDOM.createPortal = (children: React.ReactNode) => children;
const {PlatformAnnouncements, announcementPayload, draftFrom, readLabel, EMPTY_ANNOUNCEMENT} = require('../app/superadmin/announcements') as typeof import('../app/superadmin/announcements');
const {PlatformMaintenance, maintenancePayload} = require('../app/superadmin/maintenance') as typeof import('../app/superadmin/maintenance');
const {AnnouncementBanner, AnnouncementBannerView, fetchActiveAnnouncement} = require('../app/announcement-banner') as typeof import('../app/announcement-banner');
const {MaintenanceGate, MaintenanceScreen, fetchMaintenanceStatus, maintenanceBlocks} = require('../app/maintenance-gate') as typeof import('../app/maintenance-gate');

const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text((node as {children: unknown}).children) : '';
const rendered = (renderer: ReactTestRenderer) => text(renderer.toJSON());
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status});
function browser() {
  const previous = {self: Object.getOwnPropertyDescriptor(globalThis, 'self'), window: Object.getOwnPropertyDescriptor(globalThis, 'window'), document: Object.getOwnPropertyDescriptor(globalThis, 'document'), fetch: globalThis.fetch, ro: globalThis.ResizeObserver};
  Object.defineProperties(globalThis, {self: {value: globalThis, configurable: true}, window: {value: globalThis, configurable: true}, document: {value: {hidden: false, activeElement: null, body: {style: {overflow: ''}}, addEventListener() {}, removeEventListener() {}}, configurable: true}});
  Object.assign(globalThis, {dispatchEvent: () => true, ResizeObserver: class { observe() {} disconnect() {} }, setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval});
  return () => {
    globalThis.fetch = previous.fetch;
    Object.assign(globalThis, {ResizeObserver: previous.ro});
    for (const key of ['self', 'window', 'document'] as const) { const descriptor = previous[key]; if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  };
}
const wide = () => ({clientWidth: 1400, scrollIntoView() {}, focus() {},closest:()=>null});

const items: PlatformAnnouncement[] = [
  {id: 7, title: 'Nueva vista de producción', message: 'Probá el tablero nuevo.', kind: 'novedad', priority: 1, organization_id: null, organization_name: null, starts_at: '2026-10-14T12:00:00Z', ends_at: null, published_at: '2026-10-14T12:00:00Z', created_at: '2026-10-14T12:00:00Z', status: 'active', audience_users: 3, reads: 1, read_pct: 33.3},
  {id: 6, title: 'Cambio de plan', message: 'Solo Norte.', kind: 'aviso', priority: 3, organization_id: 9, organization_name: 'Agencia Norte', starts_at: '2026-10-13T12:00:00Z', ends_at: '2026-10-20T12:00:00Z', published_at: null, created_at: '2026-10-13T12:00:00Z', status: 'draft', audience_users: 1, reads: 0, read_pct: 0},
];

test('payload del comunicado: límites, prioridad, vigencia y fechas en hora de Asunción', () => {
  const base = {...EMPTY_ANNOUNCEMENT, title: 'Hola', message: 'Mensaje'};
  assert.deepEqual(announcementPayload(base), {title: 'Hola', message: 'Mensaje', kind: 'info', priority: 3, organizationId: null, startsAt: null, endsAt: null});
  assert.throws(() => announcementPayload({...base, title: ' '}), /título/);
  assert.throws(() => announcementPayload({...base, title: 'x'.repeat(81)}), /80/);
  assert.throws(() => announcementPayload({...base, message: 'x'.repeat(501)}), /500/);
  assert.throws(() => announcementPayload({...base, priority: '6'}), /prioridad/);
  assert.throws(() => announcementPayload({...base, startsAt: '2026-10-20T10:00', endsAt: '2026-10-19T10:00'}), /terminar después/);
  const ok = announcementPayload({...base, organizationId: '9', startsAt: '2026-10-20T10:00', endsAt: '2026-10-21T10:00'});
  assert.equal(ok.startsAt, '2026-10-20T13:00:00.000Z', 'Asunción UTC-3');assert.equal(ok.organizationId, '9');
  assert.deepEqual(draftFrom(items[1]), {title: 'Cambio de plan', message: 'Solo Norte.', kind: 'aviso', priority: '3', organizationId: '9', startsAt: '2026-10-13T09:00', endsAt: '2026-10-20T09:00'});
  assert.match(readLabel(items[0]), /^33[,.]3 %$/);
});

test('Comunicados: lista con % leídas, vista previa escapada y alta + publicación', async () => {
  const restore = browser();
  const calls: {url: string; method: string; body?: string}[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input), method = init?.method || 'GET';
    calls.push({url, method, body: init?.body as string | undefined});
    if (method === 'POST' && url.endsWith('/announcements')) return json({announcement: {...items[1], id: 8, ...JSON.parse(String(init?.body)), organization_id: null, status: 'draft', published_at: null}}, 201);
    if (method === 'POST' && url.endsWith('/8/publish')) return json({announcement: {...items[1], id: 8, title: '<b>Hola</b>', status: 'active', published_at: '2026-10-14T13:00:00Z'}});
    if(url.endsWith('/unpublish'))return json({announcement:{...items[0],published_at:null,status:'draft'}});
    return json({announcements: items});
  }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformAnnouncements writable agencies={[{id: 9, name: 'Agencia Norte'}]} onError={() => false}/>, {createNodeMock: wide}); });
    assert.equal(calls[0].url, '/core-api/api/platform/announcements');
    const table = renderer.root.findByProps({role: 'table'});
    assert.equal(table.props['aria-label'], 'Comunicados de la plataforma');
    const html = rendered(renderer);
    for (const label of ['Comunicado', 'Tipo', 'Audiencia', 'Vigencia', 'Leídas', 'Estado', 'Nueva vista de producción', 'Todas las agencias', 'Agencia Norte', 'Publicado', 'Borrador', 'Novedad', 'Vista previa'])
      assert.ok(html.includes(label), `falta «${label}»`);
    assert.ok(/33[,.]3 %/.test(html), '% leídas');
    // Vista previa: el texto con etiquetas se muestra literal (React escapa), nunca como HTML.
    const title = renderer.root.find(node => node.type === 'input' && node.props.maxLength === 80);
    await act(async () => { title.props.onChange({target: {value: '<b>Hola</b>'}}); });
    await act(async () => { renderer.root.find(node => node.type === 'textarea' && node.props.maxLength === 500).props.onChange({target: {value: 'Línea 1\n<script>x</script>'}}); });
    const preview = renderer.root.find(node => node.props['data-preview'] === 'true');
    assert.ok(text(preview.children).includes('<b>Hola</b>') && text(preview.children).includes('<script>x</script>'));
    assert.equal(renderer.root.findAll(node => node.props.dangerouslySetInnerHTML).length, 0, 'sin innerHTML');
    const publish = renderer.root.findAllByType('button').find(node => text(node.children) === 'Publicar' && node.props.type === 'button' && !String(node.props.className).includes('inline-action'))!;
    await act(async () => { publish.props.onClick(); });
    const post = calls.find(call => call.method === 'POST' && call.url.endsWith('/announcements'))!;
    assert.deepEqual(JSON.parse(post.body!), {title: '<b>Hola</b>', message: 'Línea 1\n<script>x</script>', kind: 'info', priority: 3, organizationId: null, startsAt: null, endsAt: null});
    assert.ok(calls.some(call => call.url === '/core-api/api/platform/announcements/8/publish'), 'publica después de crear');
    assert.equal(renderer.root.findAllByProps({role: 'row'}).length, 4, 'encabezado + 3 filas');
    // Despublicar desde la fila.
    const unpublish = renderer.root.findAllByType('button').find(node => text(node.children) === 'Despublicar')!;
    await act(async () => { unpublish.props.onClick(); });
    assert.ok(calls.at(-1)!.url.endsWith('/unpublish'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('Comunicados en solo lectura: sin formulario ni acciones', async () => {
  const restore = browser();
  globalThis.fetch = (async () => json({announcements: items})) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformAnnouncements writable={false} agencies={[]} onError={() => false}/>, {createNodeMock: wide}); });
    assert.equal(renderer.root.findAllByType('form').length, 0);
    assert.equal(renderer.root.findAllByType('button').some(node => /Publicar|Despublicar/.test(text(node.children))), false);
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
});

test('banner: muestra el vigente, cerrar registra la lectura y llega el siguiente; sin red no muestra nada', async () => {
  const restore = browser();
  const calls: {url: string; method: string}[] = [];
  const queue = [{id: 1, title: 'Primero <i>', message: 'Uno', kind: 'aviso', priority: 1}, {id: 2, title: 'Segundo', message: 'Dos', kind: 'info', priority: 2}];
  const fetcher = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({url: String(input), method: init?.method || 'GET'});
    if (init?.method === 'POST') return json({ok: true, announcement: queue[1], pending: 1});
    return json({announcement: queue[0], pending: 2});
  }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<AnnouncementBanner fetcher={fetcher}/>); });
    assert.equal(calls[0].url, '/core-api/api/agency/announcements/active');
    let html = rendered(renderer);
    assert.ok(html.includes('Primero <i>') && html.includes('Aviso · 1 de 2'));
    const close = renderer.root.findByProps({'aria-label': 'Cerrar comunicado: Primero <i>'});
    await act(async () => { close.props.onClick(); });
    assert.deepEqual(calls.at(-1), {url: '/core-api/api/agency/announcements/1/dismiss', method: 'POST'});
    html = rendered(renderer);
    assert.ok(html.includes('Segundo') && !html.includes('Primero'));
    act(() => renderer.unmount());
    await act(async () => { renderer = create(<AnnouncementBanner fetcher={(async () => { throw new Error('offline'); }) as typeof fetch}/>); });
    assert.equal(renderer.toJSON(), null, 'sin red: sin banner');
    assert.equal(await fetchActiveAnnouncement((async () => json({error: 'x'}, 402)) as typeof fetch), null);
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
  const view = create(<AnnouncementBannerView announcement={{title: 'T', message: 'M', kind: 'novedad'}}/>);
  assert.equal(view.root.findAllByType('button').length, 0, 'sin onDismiss no hay botón');
});

test('mantenimiento en el shell: fail-open, bypass del administrador global y pantalla con fin estimado', async () => {
  assert.equal(await fetchMaintenanceStatus((async () => { throw new Error('offline'); }) as typeof fetch), null);
  assert.equal(await fetchMaintenanceStatus((async () => json({}, 500)) as typeof fetch), null);
  assert.equal(maintenanceBlocks(null), false, 'sin estado: abierto');
  assert.equal(maintenanceBlocks({maintenance: true, message: '', until: null, bypass: true}), false);
  assert.equal(maintenanceBlocks({maintenance: true, message: '', until: null, bypass: false}), true);
  const restore = browser();
  let renderer!: ReactTestRenderer;
  const child = <p>Espacio</p>;
  try {
    await act(async () => { renderer = create(<MaintenanceGate fetcher={(async () => { throw new Error('offline'); }) as typeof fetch}>{child}</MaintenanceGate>); });
    assert.equal(rendered(renderer), 'Espacio', 'falla de lectura → abierto');
    act(() => renderer.unmount());
    await act(async () => { renderer = create(<MaintenanceGate fetcher={(async () => json({maintenance: true, message: 'Volvemos <pronto>', until: '2026-10-14T23:30:00Z', bypass: true})) as typeof fetch}>{child}</MaintenanceGate>); });
    assert.equal(rendered(renderer), 'Espacio', 'el administrador global sigue entrando');
    act(() => renderer.unmount());
    await act(async () => { renderer = create(<MaintenanceGate fetcher={(async () => json({maintenance: true, message: 'Volvemos <pronto>', until: '2026-10-14T23:30:00Z', bypass: false})) as typeof fetch}>{child}</MaintenanceGate>); });
    const html = rendered(renderer);
    assert.ok(html.includes('Estamos en mantenimiento') && html.includes('Volvemos <pronto>') && !html.includes('Espacio'));
    assert.match(html, /Fin estimado: 14 oct[a-z.]* 26 · 20:30/, 'fin estimado en 24 h de Asunción');
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
  const screen = create(<MaintenanceScreen message="" until={null}/>);
  assert.ok(rendered(screen).includes('Volvé a intentar en unos minutos'));
  assert.equal(rendered(screen).includes('Fin estimado'), false);
});

test('Mantenimiento en el panel: estado, confirmación al encender y PATCH con mensaje y fin estimado', async () => {
  assert.deepEqual(maintenancePayload(true, '  Hola ', '2026-10-14T20:30'), {enabled: true, message: 'Hola', until: '2026-10-14T23:30:00.000Z'});
  assert.deepEqual(maintenancePayload(false, '', ''), {enabled: false, message: '', until: null});
  assert.throws(() => maintenancePayload(true, 'x'.repeat(501), ''), /500/);
  const restore = browser();
  const calls: {method: string; body?: string}[] = [];
  let current = {enabled: false, message: '', until: null as string | null, updated_at: null, updated_by_email: null};
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({method: init?.method || 'GET', body: init?.body as string | undefined});
    if (init?.method === 'PATCH') current = {...current, ...JSON.parse(String(init.body)), updated_at: '2026-10-14T13:00:00Z', updated_by_email: 'platform@scale.example'};
    return json({maintenance: current});
  }) as typeof fetch;
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => { renderer = create(<PlatformMaintenance writable onError={() => false}/>); });
    assert.ok(rendered(renderer).includes('Plataforma abierta'));
    const textarea = renderer.root.findByType('textarea');
    await act(async () => { textarea.props.onChange({target: {value: 'Actualizamos la base.'}}); });
    const toggle = renderer.root.find(node => node.props.role === 'switch' && node.type === 'input');
    await act(async () => { toggle.props.onChange({target: {checked: true}}); });
    assert.equal(calls.filter(call => call.method === 'PATCH').length, 0, 'encender pide confirmación');
    const confirm = renderer.root.findAllByType('button').find(node => text(node.children) === 'Activar')!;
    await act(async () => { confirm.props.onClick?.(); renderer.root.findAllByType('form').at(-1)!.props.onSubmit({preventDefault() {}}); });
    const patch = calls.find(call => call.method === 'PATCH')!;
    assert.deepEqual(JSON.parse(patch.body!), {enabled: true, message: 'Actualizamos la base.', until: null});
    assert.ok(rendered(renderer).includes('La plataforma está en mantenimiento'));
  } finally { if (renderer) act(() => renderer.unmount()); restore(); }
  globalThis.fetch = (async () => json({maintenance: {enabled: true, message: 'x', until: null, updated_at: null, updated_by_email: null}})) as typeof fetch;
  const restore2 = browser();
  try {
    await act(async () => { renderer = create(<PlatformMaintenance writable={false} onError={() => false}/>); });
    assert.equal(renderer.root.find(node => node.props.role === 'switch' && node.type === 'input').props.disabled, true, 'el visor no cambia el interruptor');
  } finally { if (renderer) act(() => renderer.unmount()); restore2(); }
});

test('registro: una entrada por sección, banner en el shell y gate solo en el espacio de trabajo', () => {
  const page = readFileSync(new URL('../app/superadmin/sections.tsx', import.meta.url), 'utf8');
  assert.equal(page.match(/id: "comunicados"/g)?.length, 1);
  assert.equal(page.match(/id: "mantenimiento"/g)?.length, 1);
  const shell = readFileSync(new URL('../app/scale-workspace.tsx', import.meta.url), 'utf8');
  assert.ok(shell.includes('<AnnouncementBanner key='));
  const frame = readFileSync(new URL('../app/workspace-frame.tsx', import.meta.url), 'utf8');
  assert.ok(frame.includes('isWorkspace?<MaintenanceGate>{workspace}</MaintenanceGate>:children'));
});

test('comunicado: doble publicación bloquea campos; fallo parcial conserva ID y reintenta sin duplicar alta',async()=>{
 const restore=browser();let createCalls=0,publishCalls=0,patchCalls=0,release!:()=>void;
 const saved={...items[1],id:80,title:'Mensaje de prueba',message:'Contenido',published_at:null};
 globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(init?.method==='POST'&&url.endsWith('/announcements')){createCalls++;await new Promise<void>(resolve=>{release=resolve;});return json({announcement:saved});}if(url.endsWith('/80/publish')){publishCalls++;return publishCalls===1?json({error:'Publicación no disponible'},503):json({announcement:{...saved,published_at:'2026-10-17T12:00:00Z',status:'active'}});}if(init?.method==='PATCH'){patchCalls++;return json({announcement:saved});}return json({announcements:[]});}) as typeof fetch;
 let renderer!:ReactTestRenderer;
 try{
  await act(async()=>{renderer=create(<PlatformAnnouncements writable agencies={[]} onError={()=>false}/>,{createNodeMock:wide});});
  await act(async()=>renderer.root.findAllByType('input').find(n=>n.props.maxLength===80)!.props.onChange({target:{value:'Mensaje de prueba'}}));
  await act(async()=>renderer.root.findByType('textarea').props.onChange({target:{value:'Contenido'}}));
  const publish=renderer.root.findAllByType('button').find(n=>text(n.children)==='Publicar')!;
  await act(async()=>{publish.props.onClick();publish.props.onClick();});assert.equal(createCalls,1);assert(renderer.root.findAllByType('fieldset').some(n=>n.props.disabled));
  await act(async()=>release());
  assert(rendered(renderer).includes('El borrador se guardó'));assert(renderer.root.findAllByType('input').some(n=>n.props.value==='Mensaje de prueba'));
  const retry=renderer.root.findAllByType('button').find(n=>text(n.children)==='Guardar y publicar')!;await act(async()=>retry.props.onClick());
  assert.equal(createCalls,1);assert.equal(patchCalls,1);assert.equal(publishCalls,2);assert(!renderer.root.findAllByType('input').some(n=>n.props.value==='Mensaje de prueba'));
 }finally{if(renderer)act(()=>renderer.unmount());restore();}
});
