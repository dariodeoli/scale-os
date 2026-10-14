/*
 * Generador de los fixtures del shell del panel global (guía §2/§7, SOS-PLT).
 *
 * Renderiza con los componentes REALES (riel, barra superior, chips de período,
 * Resumen con indicadores y Uso) a HTML estático y escribe
 * `fixtures/_admin-shell.mjs` (piezas reutilizables por otros fixtures) y
 * `fixtures/admin-shell.mjs` (las vistas medidas/capturadas).
 *
 *   npx tsx build-tools/visual-harness/gen-admin-shell.tsx
 */
import React from 'react';
import {writeFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};
// Fecha fija: las etiquetas de período y los «Actualizado» no cambian entre corridas.
const NOW = new Date('2026-10-14T18:12:00Z');
const RealDate = Date;
class FixedDate extends RealDate {constructor(...args: unknown[]) {super(...((args.length ? args : [NOW.getTime()]) as [number]));} static now() {return NOW.getTime();}}
globalThis.Date = FixedDate as DateConstructor;

const Link = require('next/link').default;
const {WorkspaceBrand} = require('../../app/workspace-brand');
const {PageHeader, StateChip} = require('../../app/ui-v2');
const {PLATFORM_SECTIONS} = require('../../app/superadmin/sections');
const {PlatformSidebar} = require('../../app/superadmin/sidebar');
const {PlatformPeriodChips} = require('../../app/superadmin/period-chips');
const {PlatformOverview} = require('../../app/superadmin/overview');
const {MetricsBody} = require('../../app/superadmin/metrics');
const {UsageBody} = require('../../app/superadmin/usage');
const {RefreshCw, ArrowLeft} = require('lucide-react');
const {PlatformAdminSkeleton} = require('../../app/superadmin/states');

const days = Array.from({length: 30}, (_, i) => { const d = new RealDate(RealDate.UTC(2026, 8, 15 + i)); return d.toISOString().slice(0, 10); });
const wave = (base: number, amp: number, i: number) => Math.max(0, Math.round(base + amp * Math.sin(i / 3) + (i % 5)));
const metric = (value: number, previous: number, gen: (i: number) => number, has = true) => ({value, previous, series: days.map((_, i) => gen(i)), has_data: has});
const metrics = {
  range: {from: days[0], to: days[29], days: 30, previous_from: '2026-08-16', previous_to: '2026-09-14', timezone: 'America/Asuncion'},
  days,
  kpis: {
    agencies: metric(14, 11, (i) => i % 4 === 0 ? 1 : 0),
    users: metric(186, 203, (i) => wave(6, 3, i)),
    active_users: metric(1284, 1097, (i) => wave(380, 60, i)),
    sessions: metric(15420, 15420, (i) => wave(510, 90, i)),
    inquiries: metric(23, 0, (i) => i % 3 === 0 ? 2 : 0),
    redemptions: metric(0, 0, () => 0, false),
  },
};
const AGENCIES = [
  {id: 1, name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', slug: 'estudio-comunicacion-py', active: true, active_users: 12, subscription_status: 'active', subscription_currency: 'PYG', subscription_amount: '50000', trial_ends_at: null, due_at: '2026-10-17T03:00:00Z', internal_subscription_state: 'active', internal_subscription_expires_at: '2026-10-17T03:00:00Z'},
  {id: 2, name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', slug: 'coop-servicios-ltda', active: true, active_users: 4, subscription_status: 'trialing', subscription_currency: 'USD', subscription_amount: '10', trial_ends_at: '2026-10-19T03:00:00Z', due_at: null},
  {id: 3, name: 'Agencia Norte', slug: 'agencia-norte', active: true, active_users: 7, subscription_status: 'past_due', subscription_currency: 'PYG', subscription_amount: '50000', trial_ends_at: null, due_at: '2026-10-11T03:00:00Z', internal_subscription_state: 'suspended'},
];
const AUDIT = [
  {id: '1', action: 'subscription.manual_extend', target_type: 'organization_subscription', target_id: '27', metadata: {}, created_at: '2026-10-14T15:00:00Z', actor_email: 'administracion.global@scaleparaguay.com'},
  {id: '2', action: 'coupon.create', target_type: 'coupon', target_id: '12', metadata: {}, created_at: '2026-10-13T12:00:00Z', actor_email: 'dario@scaleparaguay.com'},
  {id: '3', action: 'platform_access.grant', target_type: 'platform_administrator', target_id: '41', metadata: {}, created_at: '2026-10-12T19:00:00Z', actor_email: 'dario@scaleparaguay.com'},
];
const page = (total: number) => ({limit: 50, offset: 0, total, hasMore: false});
const state = {
  overview: {agencies: {total: 48, active: 41}, users: {total: 612}, subscriptions: [{status: 'active', total: 33}, {status: 'trialing', total: 6}, {status: 'past_due', total: 2}], coupons: {total: 9, active: 4}},
  agencies: AGENCIES, users: [], coupons: [], audit: AUDIT,
  pages: {agencies: page(48), users: page(612), coupons: page(9), audit: page(214)},
};
const noop = () => undefined;
const props = {state, busy: false, writable: true, period: '30d', bootstrap: {initialized: true}, inquiryCounts: {new: 4, contacted: 9, closed: 21}, setInquiryCounts: noop, onGoTo: noop, onError: () => false,
  actions: {loadMore: noop, setConfirming: noop, manageSubscription: async () => undefined, applyCoupon: noop, coupon: {}, setCoupon: noop, toggleCoupon: async () => undefined, createCoupon: async () => undefined, selfRow: () => false, setPlatformAccess: async () => undefined}};

function Top({title, viewer = false}: {title: string; viewer?: boolean}) {
  return <div className="platform-admin-top">
    <Link className="platform-admin-brand" href="/" aria-label="Scale OS"><WorkspaceBrand/></Link>
    <PageHeader className="min-w-0 flex-[1_1_20rem] !mb-0" title={title}
      subtitle={<span className="platform-admin-meta">{viewer ? <StateChip tone="info" title="Tu usuario solo puede consultar la plataforma.">Solo lectura</StateChip> : <StateChip tone="ok" title="Tu usuario puede administrar la plataforma.">Admin global</StateChip>}<span className="platform-admin-updated">Actualizado 15:12</span></span>}
      actions={<div className="platform-admin-actions">
        <button type="button" className="secondary" aria-label="Actualizar" title="Actualizar los datos del panel"><RefreshCw aria-hidden="true"/><span className="platform-admin-action-label">Actualizar</span></button>
        <Link className="secondary" href="/" aria-label="Volver al panel" title="Volver al panel de la agencia"><ArrowLeft aria-hidden="true"/><span className="platform-admin-action-label">Panel</span></Link>
      </div>}/>
  </div>;
}
const html = (node: React.ReactElement) => renderToStaticMarkup(node);
const sidebar: Record<string, string> = Object.fromEntries(PLATFORM_SECTIONS.filter((s: {component?: unknown}) => s.component).map((s: {id: string}) => [s.id, html(<PlatformSidebar sections={PLATFORM_SECTIONS} current={s.id} props={props} onSelect={noop}/>)]));
const top: Record<string, string> = Object.fromEntries(PLATFORM_SECTIONS.map((s: {id: string; title?: string; label: string}) => [s.id, html(<Top title={s.title || s.label}/>)]));
const topViewer: Record<string, string> = Object.fromEntries(PLATFORM_SECTIONS.map((s: {id: string; title?: string; label: string}) => [s.id, html(<Top title={s.title || s.label} viewer/>)]));
const skeletonPage = html(<PlatformAdminSkeleton/>);
const chips = html(<PlatformPeriodChips value="30d" onChange={noop}/>);
const skeleton = /<div role="status" aria-busy="true" aria-label="Cargando indicadores del período…"[^]*?<\/div><\/div>/;
let resumen = html(<PlatformOverview state={state} audit={AUDIT} onGoTo={noop} bootstrap={{initialized: true}} period="30d"/>);
assert(skeleton.test(resumen), 'el Resumen trae el lugar de los indicadores');
resumen = resumen.replace(skeleton, html(<MetricsBody data={metrics}/>));

const usageDays = days.map((day, i) => ({day, users: wave(380, 60, i), sessions: wave(510, 90, i), recurring: wave(150, 40, i), previous_day: null, previous_users: wave(340, 50, i + 2), previous_sessions: wave(500, 80, i + 2)}));
const usage = {
  range: metrics.range,
  totals: {unique_users: 1284, recurring_users: 731, sessions: 15420, previous_unique_users: 1097, previous_sessions: 16010, previous_recurring_users: 702, active_now: 18},
  daily: usageDays,
  signups: days.map((day, i) => ({day, users: wave(6, 3, i), agencies: i % 4 === 0 ? 1 : 0})),
  hourly: Array.from({length: 24}, (_, hour) => ({hour, users: Math.round(40 + 120 * Math.max(0, Math.sin((hour - 6) / 5)))})),
  monthly: [{month: '2026-07', signups: 151, active_users: 1012}, {month: '2026-08', signups: 177, active_users: 1150}, {month: '2026-09', signups: 203, active_users: 1239}, {month: '2026-10', signups: 98, active_users: 1003}],
  agencies: AGENCIES.map((a, i) => ({id: a.id, name: a.name, logo_url: null, active7: 9 - i * 3, active30: 12 - i * 3, sessions: 820 - i * 200, last_seen_at: '2026-10-14T17:40:00Z', owner: i === 1 ? null : {name: 'Ana María Benítez de la Cruz', avatar_url: null, email: 'ana.benitez@estudiocomunicacionparaguay.com.py'}})),
  users: [{id: 7, name: 'Beto Pérez Fernández', avatar_url: null, email: 'beto.perez@agencianorte.com.py', agency: 'Agencia Norte', last_seen_at: '2026-10-14T17:40:00Z', sessions: 42}],
  has_data: {sessions: true, users: true},
};
const uso = `<section class="panel usage-viz" aria-labelledby="platform-usage-title"><div class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1"><h2 id="platform-usage-title" class="text-[15px] font-semibold tracking-tight text-fore">Uso de la plataforma</h2><small class="text-[12px] leading-[1.35] text-mute">15-sept → 14-oct · usuarios únicos según sesiones reales; días y horas de Asunción, sin demos</small></div><div>${html(<UsageBody data={usage}/>)}</div></section>`;

function assert(ok: boolean, message: string) { if (!ok) throw new Error(message); }
const out = new URL('./fixtures/', import.meta.url);
const header = '// GENERADO por build-tools/visual-harness/gen-admin-shell.tsx: no editar a mano.\n';
writeFileSync(new URL('_admin-shell.mjs', out), `${header}// Piezas reales del shell del panel global (riel, barra superior, chips) para otros fixtures.
export const SIDEBAR = ${JSON.stringify(sidebar, null, 1)};
export const TOP = ${JSON.stringify(top, null, 1)};
export const TOP_VIEWER = ${JSON.stringify(topViewer, null, 1)};
export const PERIOD_CHIPS = ${JSON.stringify(chips)};
/** Carga inicial real (forma neutra, sin textos del panel). */
export const SKELETON = ${JSON.stringify(skeletonPage)};
/** Marco del shell: riel + barra superior + contenido (con chips si la sección usa período). */
export const adminShell = (view, body, {period = false, viewer = false} = {}) => \`<main class="platform-admin-page control-shell platform-shell">\${SIDEBAR[view] || SIDEBAR.resumen}\${(viewer ? TOP_VIEWER : TOP)[view] || TOP.resumen}<div class="platform-main">\${period ? PERIOD_CHIPS : ''}\${body}</div></main>\`;
`);
writeFileSync(new URL('admin-shell.mjs', out), `${header}/*
 * Panel global · shell con riel lateral (guía §2/§7) y métricas honestas (guía §3).
 * HTML real de los componentes con datos de estrés (nombres largos, 30 días).
 */
import {adminShell} from './_admin-shell.mjs';

const RESUMEN = ${JSON.stringify(resumen)};
const USO = ${JSON.stringify(uso)};

export default [
  {id: 'admin-shell-resumen', section: 'Superadmin', surface: 'Shell con riel lateral · Resumen con indicadores del período', kind: 'plain', body: adminShell('resumen', RESUMEN, {period: true})},
  {id: 'admin-shell-uso', section: 'Superadmin', surface: 'Shell con riel lateral · Uso con período compartido', kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Uso por agencia"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · uso por agencia (shell)', exemptBelow: 1200},
      {container: '[role="table"][aria-label="Usuarios recientes"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · usuarios recientes (shell)', exemptBelow: 760},
    ],
    body: adminShell('uso', USO, {period: true})},
];
`);
globalThis.Date = RealDate;
console.log('fixtures del shell generados');
