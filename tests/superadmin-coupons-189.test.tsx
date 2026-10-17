import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act, create, type ReactTestInstance, type ReactTestRenderer} from 'react-test-renderer';
import {AppRouterContext} from 'next/dist/shared/lib/app-router-context.shared-runtime';

// #189: cupones de gracia (columnas y alta), «Aplicar cupón», gracia en un clic y
// eliminación con Google primero. Componentes reales; solo se doblan el portal, el
// DOM que Dialog toca al montar y el navegador (ubicación, sesión, eventos).
require.extensions['.css'] = () => {};
Object.assign(globalThis, {React});
const reactDOM = require('react-dom');
reactDOM.createPortal = (children: React.ReactNode) => children;
const documentListeners=new Map<string,Set<(event:any)=>void>>();
const hostDocument = {body: {style: {overflow: ''}}, activeElement: null as unknown, addEventListener(type:string,listener:(event:any)=>void) {if(!documentListeners.has(type))documentListeners.set(type,new Set());documentListeners.get(type)!.add(listener);}, removeEventListener(type:string,listener:(event:any)=>void) {documentListeners.get(type)?.delete(listener);}};
Object.defineProperty(globalThis, 'document', {configurable: true, value: hostDocument});
const hostNode = () => ({value:'',setCustomValidity(_message:string){},tagName: 'DIV', tabIndex: -1, isConnected: true, clientWidth: 1600, querySelectorAll: () => [], querySelector: () => null, closest: () => null, contains: () => true, focus() {}});

const bus = new EventTarget();
const store = new Map<string, string>();
const assigned: string[] = [];
const location = {search: '', pathname: '/superadmin', hash: '', assign: (value: string) => { assigned.push(value); }};
Object.assign(globalThis, {
  addEventListener: bus.addEventListener.bind(bus), removeEventListener: bus.removeEventListener.bind(bus), dispatchEvent: bus.dispatchEvent.bind(bus),
  location, history: {replaceState() {}},
  sessionStorage: {getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); }},
});
Object.defineProperties(globalThis, {window: {value: globalThis, configurable: true}, self: {value: globalThis, configurable: true}});
class FakeResizeObserver {
  constructor(public callback: () => void) {}
  observe() {}
  disconnect() {}
}
Object.assign(globalThis, {ResizeObserver: FakeResizeObserver});
const toasts: {tone: string; message: string}[] = [];
bus.addEventListener('scale:feedback', (event) => toasts.push((event as CustomEvent).detail));

const {PlatformCatalog} = require('../app/superadmin/catalog') as typeof import('../app/superadmin/catalog');
const {ApplyCouponDialog} = require('../app/superadmin/apply-coupon-dialog') as typeof import('../app/superadmin/apply-coupon-dialog');
const {PlatformConfirmDialog} = require('../app/superadmin/confirm') as typeof import('../app/superadmin/confirm');
const {SubscriptionDialog, GRACE_REASON} = require('../app/superadmin/subscription-dialog') as typeof import('../app/superadmin/subscription-dialog');
const {PlatformAccess} = require('../app/superadmin/access') as typeof import('../app/superadmin/access');
const {PlatformAgencies} = require('../app/superadmin/agencies') as typeof import('../app/superadmin/agencies');
const {SelectCustom} = require('../app/profile-controls') as typeof import('../app/profile-controls');
const {default: PlatformAdmin} = require('../app/superadmin/page') as typeof import('../app/superadmin/page');
type Coupon = import('../app/superadmin/model').Coupon;
type Agency = import('../app/superadmin/model').Agency;
type Person = import('../app/superadmin/model').Person;

const text = (node: ReactTestInstance | string | null | undefined): string => typeof node === 'string' ? node : node ? node.children.map(text).join('') : '';
let renderer: ReactTestRenderer | undefined;
async function mount(element: React.ReactElement) {
  await act(async () => { renderer = create(element, {createNodeMock: hostNode}); });
  return renderer!.root;
}
async function unmount() { await act(async () => renderer?.unmount()); renderer = undefined; }
const buttons = (root: ReactTestInstance) => root.findAllByType('button');
const button = (root: ReactTestInstance, label: string) => buttons(root).find((entry) => text(entry).trim() === label)!;
const flush = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });

const page = {limit: 50, offset: 0, total: 3, hasMore: false};
const base = {discount_value: '7', currency: null, max_redemptions: null};
const coupons: Coupon[] = [
  {...base, id: 1, code: 'GRACE7', discount_type: 'days', active: true, max_redemptions: 25, redemptions: 2, expires_at: '2099-12-31T02:59:59.000Z', organization_id: null, organization_name: null, note: null, expired: false},
  {...base, id: 2, code: 'OLD30', discount_type: 'days', active: true, redemptions: 1, expires_at: '2020-01-01T02:59:59.000Z', organization_id: 20, organization_name: 'Agency Two', note: 'Gracia acordada', expired: true},
  {...base, id: 3, code: 'PAUSED', discount_type: 'days', active: false, redemptions: 0, expires_at: null, organization_id: null, organization_name: null, note: null, expired: false},
];
const agency = (id: number, extra: Partial<Agency> = {}): Agency => ({id, name: `Agency ${id}`, slug: `agency-${id}`, active: true, active_users: 2, subscription_status: 'active', subscription_currency: 'USD', subscription_amount: '10', trial_ends_at: null, due_at: '2099-01-01T00:00:00Z', ...extra});
const state = (over: Partial<import('../app/superadmin/model').State> = {}) => ({
  overview: {agencies: {total: 2, active: 2}, users: {total: 2}, subscriptions: [], coupons: {total: 3, active: 2}},
  agencies: [agency(10, {owner_name: 'Ana Dueña', owner_email: 'ana@agency.example', owner_photo_url: null, extra_admins: 2}), agency(20)], users: [], coupons, audit: [],
  pages: {agencies: page, users: page, coupons: page, audit: page}, ...over,
});

test('cupones: columnas Vence, Empresa, Usos y Estado con vigente, vencido y pausado', async () => {
  const draft = {code: '', discount_value: '10', discount_type: 'percent' as const, currency: 'USD', expires_at: '', organization_id: '', note: ''};
  const root = await mount(<PlatformCatalog busy={false} state={state()} page={page} onMore={() => {}} writable coupon={draft} setCoupon={() => {}} toggleCoupon={async () => {}} createCoupon={async () => {}}/>);
  const headers = root.findAllByProps({role: 'columnheader'}).map((node) => text(node));
  for (const label of ['Cupón', 'Descuento', 'Vence', 'Empresa', 'Usos', 'Estado', 'Acciones']) assert.ok(headers.includes(label), `columna ${label}`);
  const body = text(renderer!.root);
  assert.ok(body.includes('Vigente') && body.includes('Vencido') && body.includes('Pausado'), 'estados vigente/vencido/pausado');
  assert.ok(body.includes('2/25') && body.includes('1/∞'), 'usos como n/max');
  assert.ok(body.includes('Agency Two') && body.includes('Todas'), 'empresa o «Todas»');
  assert.equal(root.findAllByProps({role: 'columnheader'}).length, 7);
  // El alta suma Vence (date), Empresa (selector) y Nota (textarea).
  const {DateInput}=require('../app/ui/temporal') as typeof import('../app/ui/temporal');
  assert.ok(root.findAllByType(DateInput).length>0, 'Vence usa la fecha civil canónica con edición parcial y calendario');
  assert.ok(root.findAllByType('input').some(node=>node.props.placeholder==='AAAA-MM-DD'),'Formato esperado visible al escribir');
  assert.ok(root.findAllByType('textarea').length === 1, 'Nota es un textarea');
  assert.ok(root.findAllByType(SelectCustom).some((node) => node.props.label === 'Empresa · Opcional'), 'Empresa es un SelectCustom');
  await unmount();
});

test('agencias y accesos: administra con foto, nombre y correo; usuarios con nombre real y agencias', async () => {
  const root = await mount(<PlatformAgencies busy={false} state={state()} page={page} onMore={() => {}} writable setConfirming={() => {}} manageSubscription={async () => {}} applyCoupon={() => {}}/>);
  assert.ok(root.findAllByProps({role: 'columnheader'}).map((node) => text(node)).includes('Administra'));
  const body = text(renderer!.root);
  assert.ok(body.includes('Ana Dueña') && body.includes('ana@agency.example') && body.includes('+2'), 'administrador principal y +N');
  await unmount();
  const users: Person[] = [{id: 1, email: 'ana@agency.example', full_name: 'Ana Dueña', photo_url: null, agency_names: ['Agency One', 'Agency Two'], active_agencies: 3, platform_admin: false}];
  const access = await mount(<PlatformAccess busy={false} state={state({users})} page={page} onMore={() => {}} writable={false} setConfirming={() => {}} selfRow={() => false} setPlatformAccess={async () => {}}/>);
  const accessText = text(renderer!.root);
  assert.ok(accessText.includes('Ana Dueña') && accessText.includes('ana@agency.example') && accessText.includes('Agency One, Agency Two +1'));
  assert.ok(access.findAllByProps({role: 'columnheader'}).map((node) => text(node)).includes('Agencias'));
  await unmount();
});

test('aplicar cupón: lista los aplicables, confirma y refresca la fila', async () => {
  const requests: {url: string; init: RequestInit}[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    requests.push({url: String(input), init});
    if (String(input).includes('/coupons/apply')) return new Response(JSON.stringify({ok: true, message: 'Cupón GRACE7 aplicado: se agregaron 7 días a la suscripción.'}), {status: 200});
    return new Response(JSON.stringify({coupons: [coupons[0]]}), {status: 200});
  }) as typeof fetch;
  let applied = 0, closed = 0;
  try {
    const root = await mount(<ApplyCouponDialog agency={agency(20)} onClose={() => { closed++; }} onApplied={() => { applied++; }} onFailure={() => false}/>);
    await flush();
    assert.ok(requests[0].url.includes('/api/platform/coupons?organization=20'), 'pide solo los cupones aplicables a la agencia');
    const select = root.findByType(SelectCustom);
    assert.deepEqual(select.props.choices.map((choice: {label: string}) => choice.label), ['GRACE7 · 7 días gratis']);
    // Sin elegir cupón no se envía nada.
    await act(async () => { root.findByType('form').props.onSubmit({preventDefault() {}}); });
    assert.equal(requests.length, 1);
    act(() => select.props.onChange('1'));
    await act(async () => { root.findAllByType('input')[0].props.onChange({target: {value: 'Gracia por mora'}}); });
    await act(async () => { root.findByType('form').props.onSubmit({preventDefault() {}}); });
    const post = requests.find((entry) => entry.url.endsWith('/api/platform/agencies/20/coupons/apply'))!;
    assert.equal(post.init.method, 'POST');
    assert.deepEqual(JSON.parse(String(post.init.body)), {coupon_id: 1, reason: 'Gracia por mora'});
    assert.ok(String((post.init.headers as Record<string, string>)['Idempotency-Key']).length >= 8, 'viaja con clave de idempotencia');
    assert.equal(applied, 1);
    assert.equal(closed, 1);
    assert.ok(toasts.some((toast) => toast.tone === 'success' && toast.message.includes('GRACE7')), 'notify() informa el resultado');
  } finally {
    globalThis.fetch = previous;
    await unmount();
  }
});

test('estado manual: gracias en un clic con un solo botón primario y opciones avanzadas plegadas', async () => {
  const calls: {days: number; reason: string}[] = [];
  const noop = () => {};
  const props = {busy: false, subscriptionAgency: agency(20), setSubscriptionAgency: noop, subscription: {internal_state: 'active' as const, internal_reason: null, internal_expires_at: '2099-03-10T15:00:00Z'}, setSubscription: noop, subscriptionLoaded: true, setSubscriptionLoaded: noop, subscriptionError: '', setSubscriptionError: noop, subscriptionRequest: {current: 0}, subscriptionState: 'active' as const, setSubscriptionState: noop, subscriptionReason: '', setSubscriptionReason: noop, subscriptionExpiryValue: '', setSubscriptionExpiryValue: noop, extendDays: '30', setExtendDays: noop, extendReason: 'x', setExtendReason: noop, manageSubscription: async () => {}, saveSubscription: async () => {}, saveExtension: async () => {}, grantGrace: async (days: number, reason: string) => { calls.push({days, reason}); return ''; }, applyCoupon: noop};
  const root = await mount(<SubscriptionDialog {...props}/>);
  const labels = buttons(root).map((entry) => text(entry).trim()).filter(Boolean);
  assert.deepEqual(labels.slice(0, 4), ['+7 días', '+1 mes', '+3 meses', 'Aplicar cupón']);
  assert.equal(buttons(root).filter((entry) => entry.props.className === 'primary').length, 1, 'un solo botón primario arriba');
  assert.ok(text(renderer!.root).includes('Acceso manual activo') && text(renderer!.root).includes('Vence'), 'estado y vencimiento visibles');
  assert.ok(root.findByType('details').findByType('summary'), 'opciones avanzadas plegadas');
  assert.equal(text(root.findByType('summary')), 'Opciones avanzadas');
  await act(async () => { button(root, '+3 meses').props.onClick(); });
  const reason = root.findAllByType('input').find((node) => node.props.value === GRACE_REASON)!;
  assert.ok(reason, 'motivo por defecto editable');
  await act(async () => { reason.props.onChange({target: {value: 'Acuerdo comercial'}}); });
  const confirm = root.findAllByType('form').find((form) => form.props.className === 'confirm-dialog')!;
  await act(async () => { confirm.props.onSubmit({preventDefault() {}}); });
  assert.deepEqual(calls, [{days: 90, reason: 'Acuerdo comercial'}]);
  await unmount();
});

test('eliminar: Google primero, palabra corta y alternativas secundarias', async () => {
  let google = 0;
  const base = {request: {kind: 'user' as const, person: {id: 5, email: 'colab@x.com', full_name: 'Colab', active_agencies: 1, platform_admin: false}}, busy: false, self: false, error: '', emailSending: false, googleStarting: false, googleVerified: false, confirmPassword: '', setConfirmPassword: () => {}, authMethod: 'google' as const, setAuthMethod: () => {}, emailSent: false, emailCode: '', setEmailCode: () => {}, onClose: () => {}, onGoogle: () => { google++; }, onRequestEmailCode: () => {}, onRemove: () => {}};
  const root = await mount(<PlatformConfirmDialog {...base}/>);
  const labels = buttons(root).map((entry) => text(entry).trim());
  assert.ok(labels.indexOf('Confirmar con Google') < labels.indexOf('Usar mi contraseña'), 'Google va primero');
  assert.ok(labels.includes('Recibir un código por correo'));
  assert.equal(button(root, 'Confirmar con Google').props.className, 'primary');
  act(() => button(root, 'Confirmar con Google').props.onClick());
  assert.equal(google, 1);
  assert.ok(text(renderer!.root).includes('Escribí ELIMINAR para confirmar'));
  assert.equal(text(renderer!.root).includes('colab@x.com para confirmar'), false, 'ya no se pide el correo exacto');
  await unmount();
});

test('eliminar usuario con Google: vuelve con ticket, confirma con la palabra corta y envía la prueba', async () => {
  const preview = {id: 'p'.repeat(43), confirmation: 'colab@x.com'};
  store.set('scale.platform.recent-auth-google', JSON.stringify({preview, request: {kind: 'user', id: 5, email: 'colab@x.com', full_name: 'Colab'}}));
  location.search = '?recentAuthTicket=' + 't'.repeat(43);
  const requests: {url: string; init: RequestInit}[] = [];
  const previous = globalThis.fetch;
  const data: Record<string, unknown> = {
    '/api/platform/overview': {agencies: {total: 0, active: 0}, users: {total: 2}, coupons: {total: 0, active: 0}, subscriptions: []},
    '/api/platform/agencies': {agencies: []}, '/api/platform/users': {users: [{id: 5, email: 'colab@x.com', full_name: 'Colab', active_agencies: 0, platform_admin: false}]},
    '/api/platform/coupons': {coupons: []}, '/api/platform/audit': {actions: []},
    '/api/auth/me': {user: {id: 1, platform_role: 'admin'}}, '/api/platform/bootstrap-status': {initialized: true},
    '/api/auth/account/recent-auth/google/complete': {proof: 'g'.repeat(43), method: 'google'},
    '/api/platform/users/5': {deleted: {userId: 5, self: false, agencies: []}},
  };
  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    requests.push({url: String(input), init});
    return new Response(JSON.stringify(data[String(input).replace('/core-api', '').split('?')[0]] ?? {}), {status: 200});
  }) as typeof fetch;
  try {
    await act(async () => { renderer = create(<AppRouterContext.Provider value={{replace() {}} as never}><PlatformAdmin/></AppRouterContext.Provider>, {createNodeMock: hostNode}); });
    await flush();
    const root = renderer!.root;
    const completion = requests.find((entry) => entry.url.endsWith('/recent-auth/google/complete'))!;
    assert.deepEqual(JSON.parse(String(completion.init.body)), {ticket: 't'.repeat(43)}, 'canjea el ticket por la prueba');
    assert.equal(store.has('scale.platform.recent-auth-google'), false, 'la eliminación pendiente se consume');
    assert.ok(text(root).includes('Identidad confirmada con Google'), 'la identidad ya viene confirmada');
    const word = root.findAllByType('input').find((node) => node.props.name === 'confirmation')!;
    await act(async () => { word.props.onChange({target: {value: 'ELIMINAR'}}); });
    await act(async () => { root.findAllByType('form').find((form) => form.props.className === 'confirm-dialog')!.props.onSubmit({preventDefault() {}}); });
    await flush();
    const removal = requests.find((entry) => entry.url.endsWith('/api/platform/users/5') && entry.init.method === 'DELETE')!;
    assert.deepEqual(JSON.parse(String(removal.init.body)), {previewId: preview.id, confirmation: 'colab@x.com', recentAuthProof: 'g'.repeat(43)}, 'el API recibe su propio texto de confirmación y la prueba');
    assert.equal(requests.some((entry) => entry.url.includes('/recent-auth/password')), false, 'no pide contraseña');
  } finally {
    globalThis.fetch = previous;
    location.search = '';
    await unmount();
  }
});

const escape=()=>{const event={key:'Escape',defaultPrevented:false,target:{tagName:'INPUT'},preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){}};for(const listener of [...documentListeners.get('keydown')||[]])listener(event);};

test('cupón: Escape protege borrador, doble submit envía un canje y refresh fallido conserva éxito',async()=>{
 const previous=globalThis.fetch;let requests=0,closed=0,resolvePost!:(value:Response)=>void;
 globalThis.fetch=(async(input:RequestInfo|URL)=>String(input).includes('/coupons/apply')?(requests++,new Promise<Response>(resolve=>{resolvePost=resolve;})):new Response(JSON.stringify({coupons:[coupons[0]]}))) as typeof fetch;
 try{
  const root=await mount(<ApplyCouponDialog agency={agency(20)} onClose={()=>closed++} onApplied={async()=>{throw Error('refresh offline');}} onFailure={()=>false}/>);
  await act(async()=>root.findByType(SelectCustom).props.onChange('1'));
  await act(async()=>escape());assert.equal(closed,0);assert(text(root).includes('¿Descartar los cambios?'));
  await act(async()=>button(root,'Seguir editando').props.onClick());assert.equal(root.findByType(SelectCustom).props.value,'1');
  const form=root.findByType('form');
  await act(async()=>{form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});});
  assert.equal(requests,1);assert(root.findAllByType('fieldset').some(n=>n.props.disabled===true));assert.equal(root.findByType(SelectCustom).props.disabled,true);
  await act(async()=>escape());assert.equal(closed,0,'pending blocks dismissal');
  await act(async()=>resolvePost(new Response(JSON.stringify({message:'Cupón aplicado.'}))));await flush();
  assert.equal(closed,1);assert.equal(requests,1);assert(toasts.some(t=>t.tone==='warning'&&t.message.includes('ya fue aplicado')));assert(!text(root).includes('No pudimos aplicar el cupón'));
 }finally{globalThis.fetch=previous;await unmount();}
});

test('catálogo: doble submit usa una operación, bloquea campos y conserva el borrador',async()=>{
 const draft={code:'RETRY',discount_value:'10',discount_type:'percent' as const,currency:'USD',expires_at:'',organization_id:'',note:'Conservar'};let calls=0;
 let release!:()=>void;const next=await mount(<PlatformCatalog busy={false} state={state()} page={page} onMore={()=>{}} writable coupon={draft} setCoupon={()=>{}} toggleCoupon={async()=>{}} createCoupon={async()=>{calls++;await new Promise<void>(resolve=>{release=resolve;});}}/>);
 await act(async()=>{next.findByType('form').props.onSubmit({preventDefault(){}});next.findByType('form').props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert(next.findAllByType('fieldset').some(n=>n.props.disabled));
 await act(async()=>release());assert(next.findAllByType('input').some(n=>n.props.value==='RETRY'));assert(next.findAllByType('textarea').some(n=>n.props.value==='Conservar'));await unmount();
});

test('catálogo: error del callback conserva nodo/valores y permite reintentar',async()=>{
 const draft={code:'RETRY',discount_value:'10',discount_type:'percent' as const,currency:'USD',expires_at:'',organization_id:'',note:'Conservar'};let calls=0;
 const root=await mount(<PlatformCatalog busy={false} state={state()} page={page} onMore={()=>{}} writable coupon={draft} setCoupon={()=>{}} toggleCoupon={async()=>{}} createCoupon={async()=>{calls++;throw Error('Conflicto recuperable');}}/>);
 const input=root.findAllByType('input').find(n=>n.props.value==='RETRY')!;
 await act(async()=>root.findByType('form').props.onSubmit({preventDefault(){}}));assert(text(root).includes('Conflicto recuperable'));assert.equal(root.findAllByType('input').find(n=>n.props.value==='RETRY'),input);
 assert(root.findAllByType('fieldset').every(n=>!n.props.disabled));
 await act(async()=>root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(calls,2);await unmount();
});

test('gracia: doble confirmación comparte vuelo, motivo pendiente y error quedan para retry',async()=>{
 let calls=0,finish!:(failure:string)=>void;const noop=()=>{};
 const props={busy:false,subscriptionAgency:agency(20),setSubscriptionAgency:noop,subscription:{internal_state:'active' as const,internal_reason:null,internal_expires_at:'2099-03-10T15:00:00Z'},setSubscription:noop,subscriptionLoaded:true,setSubscriptionLoaded:noop,subscriptionError:'',setSubscriptionError:noop,subscriptionRequest:{current:0},subscriptionState:'active' as const,setSubscriptionState:noop,subscriptionReason:'Original',setSubscriptionReason:noop,subscriptionExpiryValue:'',setSubscriptionExpiryValue:noop,extendDays:'30',setExtendDays:noop,extendReason:'Pago manual',setExtendReason:noop,manageSubscription:async()=>{},saveSubscription:async()=>{},saveExtension:async()=>{},grantGrace:async()=>{calls++;return await new Promise<string>(resolve=>{finish=resolve;});},applyCoupon:noop};
 const root=await mount(<SubscriptionDialog {...props}/>);
 await act(async()=>button(root,'+7 días').props.onClick());
 const reason=root.findAllByType('input').find(n=>n.props.value===GRACE_REASON)!;await act(async()=>reason.props.onChange({target:{value:'Mantener motivo'}}));
 const form=root.findAllByType('form').find(n=>n.props.className==='confirm-dialog')!;
 await act(async()=>{form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert(root.findAllByType('fieldset').some(n=>n.props.disabled));
 await act(async()=>finish('Gracia no guardada'));assert(text(root).includes('Gracia no guardada'));assert(root.findAllByType('input').some(n=>n.props.value==='Mantener motivo'));
 await act(async()=>form.props.onSubmit({preventDefault(){}}));assert.equal(calls,2);await act(async()=>finish(''));await unmount();
});

test('estado avanzado: cambios sobreviven Escape y error; dos submits comparten el mismo guard',async()=>{
 const noop=()=>{};let calls=0,fail!:(cause:Error)=>void;
 const props={busy:false,subscriptionAgency:agency(20),setSubscriptionAgency:noop,subscription:{internal_state:'active' as const,internal_reason:null,internal_expires_at:'2099-03-10T15:00:00Z'},setSubscription:noop,subscriptionLoaded:true,setSubscriptionLoaded:noop,subscriptionError:'',setSubscriptionError:noop,subscriptionRequest:{current:0},subscriptionState:'active' as const,setSubscriptionState:noop,subscriptionReason:'Original',setSubscriptionReason:noop,subscriptionExpiryValue:'',setSubscriptionExpiryValue:noop,extendDays:'30',setExtendDays:noop,extendReason:'Pago manual',setExtendReason:noop,manageSubscription:async()=>{},saveSubscription:async()=>{calls++;await new Promise<void>((resolve,reject)=>{fail=reject;});},saveExtension:async()=>{},grantGrace:async()=>'',applyCoupon:noop};
 const root=await mount(<SubscriptionDialog {...props}/>);
 await act(async()=>renderer!.update(<SubscriptionDialog {...props} subscriptionReason="Motivo editado"/>));
 await act(async()=>escape());assert(text(root).includes('¿Descartar los cambios?'));await act(async()=>button(root,'Seguir editando').props.onClick());
 const form=root.findAllByType('form')[0];await act(async()=>{form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});});assert.equal(calls,1);assert(root.findAllByType('fieldset').some(n=>n.props.disabled));
 await act(async()=>fail(Error('Estado no guardado')));assert(text(root).includes('Estado no guardado'));assert(root.findAllByType('textarea').some(n=>n.props.value==='Motivo editado'));assert(root.findAllByType('fieldset').every(n=>!n.props.disabled));await unmount();
});
