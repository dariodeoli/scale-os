import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type {AuditAction} from '../app/superadmin/model';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
const {PlatformAudit} = require('../app/superadmin/audit') as typeof import('../app/superadmin/audit');
const {default: PlatformAdmin} = require('../app/superadmin/page') as typeof import('../app/superadmin/page');
const metadata = {reason: 'A'.repeat(230), days: 30};
const audit: AuditAction[] = [{id: '1', actor_email: 'long-administrator@example.com', action: 'platform.agency.subscription.extend', target_type: 'agency', target_id: '27', created_at: '2026-10-05T15:00:00Z', metadata}];
const page = {limit: 50, offset: 0, total: 2, hasMore: true};
const text = (node: unknown): string => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' && 'children' in node ? text(node.children) : '';

function observeWidth(initial: number) {
  const previous = globalThis.ResizeObserver;
  let width = initial;
  const callbacks = new Set<() => void>();
  Object.assign(globalThis, {ResizeObserver: class {
    callback: () => void;
    constructor(callback: () => void) {this.callback = callback; callbacks.add(callback);}
    observe() {}
    disconnect() {callbacks.delete(this.callback);}
  }});
  return {
    node: {get clientWidth() {return width;}},
    resize(next: number) {width = next; act(() => callbacks.forEach(callback => callback()));},
    restore() {Object.assign(globalThis, {ResizeObserver: previous});},
  };
}

test('audit switches by measured container width, preserving full cards, filters and pagination', async () => {
  const observer = observeWidth(326);
  let renderer!: ReactTestRenderer;
  let more = 0;
  try {
    await act(async () => {renderer = create(<PlatformAudit audit={audit} page={page} busy={false} onMore={() => more++}/>, {createNodeMock: () => observer.node});});
    assert.equal(renderer.root.findAllByProps({role: 'table'}).length, 0);
    assert.equal(renderer.root.findAllByType('article').length, 1);
    assert.deepEqual(renderer.root.findAllByType('dt').map(node => text(node.children)), ['Fecha', 'Actor', 'Acción', 'Destino', 'Metadatos']);
    assert.ok(text(renderer.toJSON()).includes(JSON.stringify(metadata)), 'metadata must not be sliced');
    assert.ok(text(renderer.toJSON()).includes(audit[0].actor_email!));
    assert.ok(text(renderer.toJSON()).includes('agency #27'));
    act(() => renderer.root.findAllByType('button').find(node => text(node.children).includes('Ver más'))!.props.onClick());
    assert.equal(more, 1);
    observer.resize(900);
    assert.equal(renderer.root.findAllByProps({role: 'table'}).length, 1);
    assert.equal(renderer.root.findAllByType('article').length, 0);
    observer.resize(768); // Narrow desktop containers also need cards.
    assert.equal(renderer.root.findAllByType('article').length, 1);
    act(() => renderer.root.findByType('select').props.onChange({target: {value: 'no-match'}}));
    assert.equal(renderer.root.findAllByType('article').length, 0);
    assert.ok(text(renderer.toJSON()).includes('Sin acciones que coincidan'));
    act(() => renderer.root.findAllByType('button').find(node => text(node.children) === 'Limpiar filtros')!.props.onClick());
    assert.equal(renderer.root.findAllByType('article').length, 1);
  } finally {if (renderer) act(() => renderer.unmount()); observer.restore();}
});

test('tabs and Overview shortcuts share scroll reset; same view and refresh preserve scroll', async () => {
  const observer = observeWidth(326);
  const previousSelf = Object.getOwnPropertyDescriptor(globalThis, 'self');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  // Browser aliases share one global object, including Next Link's idle timers.
  Object.defineProperties(globalThis, {
    self: {value: globalThis, configurable: true},
    window: {value: globalThis, configurable: true},
  });
  const previousFetch = globalThis.fetch;
  let scrolls = 0;
  const data: Record<string, unknown> = {
    '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 0}, coupons: {total: 0, active: 0}, subscriptions: []},
    '/api/platform/agencies': {agencies: []}, '/api/platform/users': {users: []},
    '/api/platform/coupons': {coupons: []}, '/api/platform/audit': {actions: audit},
    '/api/auth/me': {user: {id: 1, platform_role: 'viewer'}},
    '/api/platform/bootstrap-status': {initialized: true},
  };
  globalThis.fetch = async input => new Response(JSON.stringify(data[String(input).replace('/core-api', '').split('?')[0]]), {status: 200});
  let renderer!: ReactTestRenderer;
  try {
    await act(async () => {renderer = create(<AppRouterContext.Provider value={{replace() {}} as any}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: element => element.type === 'header' ? {scrollIntoView(options: ScrollIntoViewOptions) {assert.equal(options.block, 'start'); scrolls++;}} : observer.node});});
    assert.equal(scrolls, 0, 'initial load does not scroll');
    const tabs = () => renderer.root.findByProps({'aria-label': 'Secciones del panel global'}).findAllByType('button');
    assert.equal(tabs().length, 5);
    act(() => tabs()[2].props.onClick());
    assert.equal(scrolls, 1);
    act(() => tabs()[2].props.onClick());
    assert.equal(scrolls, 1, 'same-view selection is a no-op');
    await act(async () => renderer.root.findAllByType('button').find(node => text(node.children).includes('Actualizar'))!.props.onClick());
    assert.equal(scrolls, 1, 'refresh keeps reading position');
    act(() => tabs()[0].props.onClick());
    assert.equal(scrolls, 2);
    act(() => renderer.root.findAllByType('button').find(node => text(node.children).startsWith('Ver auditoría'))!.props.onClick());
    assert.equal(scrolls, 3, 'Overview uses the same handler');
    assert.equal(tabs()[4].props['aria-pressed'], true);
  } finally {
    if (renderer) act(() => renderer.unmount());
    globalThis.fetch = previousFetch;
    observer.restore();
    for (const [key, descriptor] of [['self', previousSelf], ['window', previousWindow]] as const) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
