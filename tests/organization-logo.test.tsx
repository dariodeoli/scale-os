import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';

// Logo de la agencia y fotos del panel global: el selector de empresa del TopBar
// dibuja el logo (o el edificio), el panel global muestra logo o iniciales con la
// cápsula única y las fotos data:/https/medio interno pasan sin perderse.
require.extensions['.css'] = () => {};
Object.assign(globalThis, {React});
const bus = new EventTarget();
Object.assign(globalThis, {
  addEventListener: bus.addEventListener.bind(bus), removeEventListener: bus.removeEventListener.bind(bus), dispatchEvent: bus.dispatchEvent.bind(bus),
  sessionStorage: {getItem: () => '1', setItem() {}, removeItem() {}},
});
Object.defineProperties(globalThis, {window: {value: globalThis, configurable: true}, self: {value: globalThis, configurable: true}});
const dialogId = require.resolve('../app/dialog');
require.cache[dialogId] = {id: dialogId, filename: dialogId, loaded: true, exports: {
  Dialog: ({children}: {children: React.ReactNode}) => <section>{children}</section>,
  FormActions: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  useDialogClose: () => undefined,
  useDialogPending: () => undefined,
}} as NodeModule;
class FakeResizeObserver { observe() {} disconnect() {} }
Object.assign(globalThis, {ResizeObserver: FakeResizeObserver});

const {safePhoto} = require('../app/actor-identity') as typeof import('../app/actor-identity');
const {CompanySelector, COMPANY_LOGO_EVENT} = require('../app/operations') as typeof import('../app/operations');
const {PlatformAgencies} = require('../app/superadmin/agencies') as typeof import('../app/superadmin/agencies');
const {PlatformAccess} = require('../app/superadmin/access') as typeof import('../app/superadmin/access');
type Agency = import('../app/superadmin/model').Agency;
type Person = import('../app/superadmin/model').Person;

const hostNode = () => ({tagName: 'DIV', tabIndex: -1, isConnected: true, clientWidth: 1600, querySelectorAll: () => [], querySelector: () => null, closest: () => null, contains: () => true, focus() {}});
let renderer: ReactTestRenderer | undefined;
async function mount(element: React.ReactElement) {
  await act(async () => { renderer = create(element, {createNodeMock: hostNode}); });
  return renderer!.root;
}
async function unmount() { await act(async () => renderer?.unmount()); renderer = undefined; }
const images = (root: ReactTestInstance) => root.findAllByType('img').map((node) => String(node.props.src));
const LOGO = 'https://cdn.example/logo-agencia.webp';
const DATA = 'data:image/webp;base64,UklGRiQAAABXRUJQ';

test('safePhoto acepta el medio interno del logo de la empresa', () => {
  assert.equal(safePhoto('/core-api/api/agency/media/organization/10?v=abcdef0123'), '/core-api/api/agency/media/organization/10?v=abcdef0123');
  assert.equal(safePhoto(DATA), DATA, 'las fotos data: (perfil de agencia) pasan');
  assert.equal(safePhoto('/core-api/api/agency/media/otra/10?v=abcdef0123'), '', 'otros tipos no');
});

test('selector de empresa: logo con el objeto de foto o edificio como respaldo, y se actualiza al cambiarlo', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({organizations: [{id: 1, name: 'Agencia A', role: 'owner'}], currentOrganizationId: 1})) as typeof fetch;
  try {
    let root = await mount(<CompanySelector name="Agencia A" logo="/core-api/api/agency/media/organization/1?v=abcdef0123"/>);
    assert.deepEqual(images(root), ['/core-api/api/agency/media/organization/1?v=abcdef0123'], 'el logo reemplaza al edificio');
    assert.ok(root.findAll((node) => typeof node.props.className === 'string' && node.props.className.includes('foto-perfil-logo')).length > 0, 'variante logo (contain)');
    await act(async () => { bus.dispatchEvent(new CustomEvent(COMPANY_LOGO_EVENT, {detail: {logo: null}})); });
    assert.deepEqual(images(root), [], 'quitar el logo vuelve al edificio sin recargar');
    await unmount();
    root = await mount(<CompanySelector name="Agencia A"/>);
    assert.deepEqual(images(root), [], 'sin logo: edificio');
    await act(async () => { bus.dispatchEvent(new CustomEvent(COMPANY_LOGO_EVENT, {detail: {logo: LOGO}})); });
    assert.deepEqual(images(root), [LOGO], 'el logo nuevo aparece al guardarlo en Configuración');
    await unmount();
  } finally { globalThis.fetch = previous; }
});

const agency = (id: number, extra: Partial<Agency> = {}): Agency => ({id, name: `Agency ${id}`, slug: `agency-${id}`, active: true, active_users: 2, subscription_status: 'active', subscription_currency: 'USD', subscription_amount: '10', trial_ends_at: null, due_at: null, ...extra});
const page = {limit: 50, offset: 0, total: 2, hasMore: false};
const state = (over: Partial<import('../app/superadmin/model').State> = {}) => ({
  overview: {agencies: {total: 2, active: 2}, users: {total: 1}, subscriptions: [], coupons: {total: 0, active: 0}},
  agencies: [agency(10, {logo_url: LOGO, owner_name: 'Ana Dueña', owner_email: 'ana@agency.example', owner_photo_url: DATA}), agency(20)], users: [], coupons: [], audit: [],
  pages: {agencies: page, users: page, coupons: page, audit: page}, ...over,
});

test('panel global: logo de la agencia o iniciales, y foto del responsable', async () => {
  const root = await mount(<PlatformAgencies busy={false} state={state()} page={page} onMore={() => {}} writable={false} setConfirming={() => {}} manageSubscription={async () => {}} applyCoupon={() => {}}/>);
  const srcs = images(root);
  assert.ok(srcs.includes(LOGO), 'el logo de la agencia se dibuja');
  assert.ok(srcs.includes(DATA), 'la foto data: del responsable se dibuja');
  const initials = root.findAll((node) => node.props.className === 'foto-perfil-iniciales').map((node) => node.children.join(''));
  assert.ok(initials.includes('A2'), 'sin logo: iniciales del nombre de la agencia');
  await unmount();
  const users: Person[] = [{id: 1, email: 'ana@agency.example', full_name: 'Ana Dueña', photo_url: DATA, agency_names: ['Agency 10'], active_agencies: 1, platform_admin: false}];
  const access = await mount(<PlatformAccess busy={false} state={state({users})} page={page} onMore={() => {}} writable={false} setConfirming={() => {}} selfRow={() => false} setPlatformAccess={async () => {}}/>);
  assert.ok(images(access).includes(DATA), 'accesos dibuja la foto de la persona');
  await unmount();
});
