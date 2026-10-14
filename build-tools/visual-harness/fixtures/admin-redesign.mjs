/*
 * Panel admin (superadmin) — rediseño a ciegas (#102, SOS-DSN).
 *
 * Fixtures de medición y evidencia:
 *   - `admin-resumen` / `admin-agencias` / `admin-cupones` / `admin-accesos` /
 *     `admin-auditoria`: la consola nueva (encabezado compacto, barra de
 *     secciones con contadores y cada vista) espejando
 *     `app/superadmin/{page,overview,agencies,catalog,access,audit}.tsx`.
 *
 * Datos de estrés: nombres y correos largos, montos y fechas reales.
 */
import {adminShell, SKELETON} from './_admin-shell.mjs';

const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const I = {
  refresh: icon('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
  back: icon('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
  trash: icon('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>', 14),
  shield: icon('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', 14),
  eye: icon('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>', 14),
  search: icon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>', 15),
  arrow: icon('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', 14),
  pause: icon('<circle cx="12" cy="12" r="10"/><path d="M10 15V9"/><path d="M14 15V9"/>', 14),
  play: icon('<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>', 14),
};
const chip = (text, tone = 'mute', title = '') => {
  const tones = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
  return `<span class="badge badge-${tones[tone] || 'slate'} whitespace-nowrap"${title ? ` title="${title}"` : ''}>${text}</span>`;
};
const brand = '<span class="workspace-brand" role="img" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>';

/* ── Datos de estrés ─────────────────────────────────────────────────────── */
const AGENCIES = [
  {name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', slug: 'estudio-comunicacion-py', active: true, users: 12, amount: 'Gs. 50.000', currency: 'PYG', manual: 'active', expiry: '2026-10-03', expiring: true, owner: {name: 'Ana María Benítez de la Cruz', email: 'ana.benitez@estudiocomunicacionparaguay.com.py', extra: 2}},
  {name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', slug: 'coop-servicios-ltda', active: true, users: 34, amount: 'USD 10,00', currency: 'USD', manual: null, expiry: '2026-11-30', owner: {name: 'Compras Cooperativa', email: 'compras@coopservicios.com.py', extra: 0}},
  {name: 'Agencia Creativa del Sur S.A.', slug: 'agencia-creativa-sur', active: false, users: 3, amount: 'Gs. 50.000', currency: 'PYG', manual: 'suspended', expiry: '2026-09-20', expiring: true, owner: {name: '', email: 'direccion@agenciacreativadelsur.example.com', extra: 1}},
  {name: 'Marketing Digital Integral Paraguay', slug: 'marketing-integral-py', active: true, users: 8, amount: null, currency: null, manual: null, expiry: null, owner: null},
];
const initialsOf = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || '?';
/* PersonContainer size="sm" (app/person-container.tsx): avatar + nombre + secundario. */
const personSm = (name, secondary) => `<span class="person-container person-container-sm"><span class="foto-perfil foto-perfil-sm foto-perfil-circulo foto-perfil-persona" aria-hidden="true"><span class="foto-perfil-iniciales" aria-hidden="true">${initialsOf(name)}</span></span><span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span>${secondary ? `<span class="person-container-secondary" title="${secondary}">${secondary}</span>` : ''}</span></span>`;
/* Identidad de la agencia (app/superadmin/agencies.tsx): PersonContainer size="sm" variante logo; sin logo, iniciales. */
const agencyIdentity = (agency) => `<span class="person-container person-container-sm"><span class="foto-perfil foto-perfil-sm foto-perfil-circulo foto-perfil-logo" aria-hidden="true"><span class="foto-perfil-iniciales" aria-hidden="true">${initialsOf(agency.name)}</span></span><span class="person-container-details"><span class="person-container-name" title="${agency.name}">${agency.name}</span><span class="person-container-secondary" title="${agency.slug}">${agency.slug}</span></span></span>`;
const ownerCell = (owner) => owner ? `<span class="flex min-w-0 items-center gap-1.5" title="${owner.name ? owner.name + ' · ' : ''}${owner.email}">${personSm(owner.name || owner.email, owner.name ? owner.email : '')}${owner.extra ? chip('+' + owner.extra, 'mute', owner.extra + ' administradores más') : ''}</span>` : '<span class="list-secondary">—</span>';
const manualLabel = (value) => value === 'active' ? 'Acceso manual activo' : value === 'suspended' ? 'Acceso manual suspendido' : 'Sin cambio manual';
const manualTone = (value) => value === 'active' ? 'info' : value === 'suspended' ? 'warn' : 'mute';
const dueTone = (value, expiring) => expiring ? 'warn' : '';
const shortDate = (value) => value ? `${value.slice(8, 10)}-${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'][Number(value.slice(5, 7)) - 1]}` : '—';
const longDate = (value) => value ? `${value.slice(8, 10)} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'][Number(value.slice(5, 7)) - 1]} ${value.slice(2, 4)} · 18:12` : '—';

const USERS = [
  {email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', name: 'Administración y Facturación Estudio Comunicación', agencyNames: 'Estudio de Comunicación y Producción Audiovisual, Cooperativa Multiactiva, Agencia Creativa del Sur +9', agencies: 12, self: true, role: 'admin'},
  {email: 'compras@coopservicios.com.py', name: 'Compras Cooperativa', agencyNames: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', agencies: 3, role: null},
  {email: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', name: '', agencyNames: 'Sin agencias activas', agencies: 1, role: 'viewer'},
];
const AUDIT = [
  {action: 'platform.agency.delete', target: 'agency', id: 42, actor: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', when: '2026-09-29T18:12:00.000Z'},
  {action: 'platform.user.access', target: 'user', id: 7, actor: 'compras@coopservicios.com.py', when: '2026-09-29T17:40:00.000Z'},
  {action: 'platform.coupon.create', target: 'coupon', id: 15, actor: 'compras@coopservicios.com.py', when: '2026-09-28T11:05:00.000Z'},
];
const COUPONS = [
  {code: 'FUNDADOR30', detail: '30% · Sin límite de usos', discount: '30%', uses: '12/∞', expiry: null, company: 'Todas', status: 'Vigente', tone: 'ok', active: true, note: ''},
  {code: 'GRACIA-AGOSTO-ESTUDIO-COMUNICACION', detail: '15 días gratis · 1 uso máximo', discount: '15 días', uses: '1/1', expiry: '2026-09-30', company: 'Estudio de Comunicación y Producción Audiovisual del Paraguay', status: 'Vencido', tone: 'warn', active: true, expired: true, note: 'Gracia acordada por WhatsApp con administración'},
  {code: 'PRUEBA-EXTENDIDA', detail: '15 días gratis · 50 usos máximos', discount: '15 días', uses: '0/50', expiry: '2026-12-31', company: 'Todas', status: 'Pausado', tone: 'mute', active: false, note: ''},
];

/* ── Encabezado y secciones (consola nueva) ──────────────────────────────── */
const header = (writable = true, updated = '18:12') => `
<div class="platform-admin-top">
 <a class="platform-admin-brand" href="#" aria-label="Scale OS">${brand}</a>
 <header class="ui-page-header mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-0 min-w-0 flex-[1_1_20rem] !mb-0">
  <div class="ui-page-header-main min-w-0 flex-1 xl:flex xl:min-w-0 xl:items-baseline xl:gap-3">
   <h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl xl:shrink-0">Control de Scale OS</h1>
   <p class="ui-page-header-subtitle mt-1.5 text-[13px] leading-[1.5] text-mute xl:mt-0 xl:min-w-0 xl:line-clamp-1"><span class="platform-admin-meta">${chip(writable ? 'Admin global' : 'Solo lectura', writable ? 'ok' : 'info', `${writable ? 'Tu usuario puede administrar la plataforma' : 'Tu usuario solo puede consultar la plataforma'}. Acceso separado por plataforma: ser dueño de una agencia no habilita este panel ni sus datos.`)}${updated ? `<span class="platform-admin-updated" title="Última actualización ${updated} (hora de Asunción)">Actualizado ${updated}</span>` : ''}</span></p>
  </div>
  <div class="header-actions flex min-w-0 flex-wrap items-center gap-2 max-md:w-full max-md:justify-start xl:flex-nowrap"><div class="platform-admin-actions"><button type="button" class="secondary" aria-label="Actualizar" title="Actualizar los datos del panel">${I.refresh}<span class="platform-admin-action-label">Actualizar</span></button><a class="secondary" href="#" aria-label="Volver al panel" title="Volver al panel de la agencia">${I.back}<span class="platform-admin-action-label">Panel</span></a></div></div>
 </header>
</div>`;

const tabs = (active, counts = {agencias: 4, cupones: 3, accesos: 3, auditoria: 50}) => `
<div class="platform-admin-tabs silent-scroll">
 <div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1 w-max flex-nowrap" role="group" aria-label="Secciones del panel global">
 ${[['resumen', 'Resumen', 'overview', undefined], ['agencias', 'Agencias', 'building', counts.agencias], ['cupones', 'Cupones', 'tag', counts.cupones], ['accesos', 'Accesos', 'shield', counts.accesos], ['auditoria', 'Auditoría', 'audit', counts.auditoria]].map(([id, label, , count]) => `<button type="button" aria-pressed="${id === active}" aria-label="${label}${count === undefined ? '' : ` (${count})`}" title="${label}" class="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium md:min-h-8 ${id === active ? 'bg-fono/15 text-fono-text' : 'text-mute'}">${label}${count === undefined ? '' : `<span class="text-xs opacity-75">${count}</span>`}</button>`).join('')}
 </div>
</div>`;

const kpi = ({label, valor, hint, destacado}) => `
<div class="ui-kpi relative overflow-hidden rounded-xl border p-4 ${destacado ? 'border-fono/30 bg-gradient-to-br from-fono-dark via-fono to-fono' : 'border-ink-600 bg-ink-800'}">
 <div class="text-[11px] font-medium uppercase tracking-wider ${destacado ? 'text-onbrand/75' : 'text-mute'}">${label}</div>
 <div class="v2-numero mt-1.5 text-2xl font-semibold md:text-3xl ${destacado ? 'text-onbrand' : 'text-fore'}">${valor}</div>
 ${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="min-w-0 flex-1 truncate ${destacado ? 'text-onbrand/75' : 'text-mute'}" title="${hint}">${hint}</span></div>` : ''}
</div>`;

const row = (left, right) => `<div class="flex min-w-0 items-center justify-between gap-3 border-b border-ink-600/60 py-2 last:border-0">${left}${right}</div>`;

const overview = () => `
<div class="grid min-w-0 gap-4">
 <div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de plataforma">
  ${kpi({label: 'Agencias activas', valor: '128', hint: 'de 134 agencias', destacado: true})}
  ${kpi({label: 'Usuarios registrados', valor: '1.284', hint: 'Cuentas de todas las agencias'})}
  ${kpi({label: 'Cupones activos', valor: '6', hint: 'de 9 códigos'})}
  ${kpi({label: 'Suscripciones', valor: '121', hint: '121 active · 13 trialing'})}
 </div>
 <div class="grid min-w-0 gap-4 lg:grid-cols-2">
  <section class="panel" aria-labelledby="platform-expiring-title">
   <div class="mb-2 flex min-w-0 items-center justify-between gap-3"><h2 id="platform-expiring-title" class="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Agencias por vencer</h2><button type="button" class="text-button min-h-11 md:min-h-8">Ver agencias${I.arrow}</button></div>
   <div>${AGENCIES.slice(0, 3).map((agency) => row(
    `<span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${agency.name}">${agency.name}</b><small class="block truncate text-[11px] text-mute" title="${agency.slug}">${agency.slug}</small></span>`,
    `<span class="flex shrink-0 items-center gap-2">${chip(manualLabel(agency.manual), manualTone(agency.manual))}<span class="list-date text-[12px] tabular-nums" data-tone="${dueTone(agency.expiry, agency.expiring)}" title="Vence ${agency.expiry}">${shortDate(agency.expiry)}</span></span>`)).join('')}</div>
  </section>
  <section class="panel" aria-labelledby="platform-recent-title">
   <div class="mb-2 flex min-w-0 items-center justify-between gap-3"><h2 id="platform-recent-title" class="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Últimas acciones</h2><button type="button" class="text-button min-h-11 md:min-h-8">Ver auditoría${I.arrow}</button></div>
   <div>${AUDIT.map((entry) => row(
    `<span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${entry.actor}">${entry.actor}</b><small class="block truncate text-[11px] text-mute" title="${entry.action} · ${entry.target} #${entry.id}">${entry.target} #${entry.id}</small></span>`,
    `<span class="flex shrink-0 items-center gap-2">${chip(entry.action, 'info', entry.action)}<span class="list-date text-[12px] tabular-nums" title="${longDate(entry.when)}">${shortDate(entry.when)}</span></span>`)).join('')}</div>
  </section>
 </div>
</div>`;

const agencyRows = AGENCIES.map((agency) => `
<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]">
 <div role="cell" class="min-w-0">${agencyIdentity(agency)}</div>
 <div role="cell" class="flex min-w-0 flex-wrap items-center gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(manualLabel(agency.manual), manualTone(agency.manual))}</div>
 <span role="cell" class="text-right"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-fore">${agency.amount || '—'}</span></span>
 <span role="cell" class="text-right text-[12.5px] font-semibold tabular-nums text-fore">${agency.users}</span>
 <span role="cell" class="list-date min-w-0" data-tone="${dueTone(agency.expiry, agency.expiring)}" title="${agency.expiry ? `Vence ${agency.expiry}` : 'Sin vencimiento registrado'}">${shortDate(agency.expiry)}</span>
 <div role="cell" class="list-actions"><span class="inline-actions flex flex-nowrap items-center justify-end gap-2"><button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button><button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar agencia</button></span></div>
</div>`).join('');

/* SearchField de owncoding-ui v0.61 (icono + Input con `w-full`) + Select; el
   label visual no existe en la fuente: el placeholder y el aria-label nombran. */
const toolbar = (summary, extra = '', placeholder = 'Nombre o identificador', ariaLabel = 'Buscar agencia') => `
<div data-toolbar="filtros" class="mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap" style="gap:12px">
 <div class="relative min-w-0 min-w-[12rem] flex-1 sm:max-w-72">
  <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
  <input type="search" aria-label="${ariaLabel}" placeholder="${placeholder}" value="" class="w-full rounded-lg border border-interactivo bg-ink-800 px-3.5 pl-9 pr-9 text-fore h-11 md:h-9 text-base md:text-sm outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 placeholder:text-mute/60"/>
 </div>
 <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Estado<select aria-label="Filtrar por estado" class="min-w-[11rem]"><option>Todas</option><option>Activas</option><option>Inactivas</option><option>Con cambio manual</option><option>Vencen en 7 días</option></select></label>
 ${extra}
 <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">${summary}</p>
</div>`;

const panelHead = (id, title, count, note) => `
<div class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
 <div class="flex min-w-0 items-center gap-2"><h2 id="${id}" class="text-[15px] font-semibold tracking-tight text-fore">${title}</h2>${chip(count, 'mute', 'Registros cargados')}</div>
 <small class="text-[12px] leading-[1.35] text-mute">${note}</small>
</div>`;

const agenciesView = () => `
<section class="panel" aria-labelledby="platform-agencies-title">
 ${panelHead('platform-agencies-title', 'Agencias y suscripciones', '134', 'Gestioná el acceso manual junto a cada registro')}
 ${toolbar('4 de 134')}
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Agencias y suscripciones" class="silent-scroll relative min-w-0 overflow-x-auto">
   <div class="min-w-[73.5rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]">
     <span role="columnheader">Agencia</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Plan</span><span role="columnheader" class="text-right">Usuarios</span><span role="columnheader">Prueba / vencimiento</span><span role="columnheader" class="text-right list-actions-head">Acciones</span>
    </div>
    <div role="rowgroup">${agencyRows}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-agency-cards platform-admin-mobile-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   ${AGENCIES.map((agency) => `
   <article class="flex min-h-[140px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
    <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${agency.name}">${agency.name}</b><small class="mt-0.5 block text-[11px] text-mute">${agency.slug}</small></div>
    <div class="flex flex-wrap gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(manualLabel(agency.manual), manualTone(agency.manual))}</div>
    <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
     <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Plan</dt><dd class="mt-0.5 font-semibold text-fore">${agency.amount || '—'}</dd></div>
     <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usuarios</dt><dd class="mt-0.5 font-semibold tabular-nums text-fore">${agency.users}</dd></div>
     <div class="col-span-2"><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Prueba / vencimiento</dt><dd class="list-date mt-0.5" data-tone="${dueTone(agency.expiry, agency.expiring)}">${agency.expiry || '—'}</dd></div>
    </dl>
    <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3"><button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button><button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar agencia</button></div>
   </article>`).join('')}
 </div>
</section>`;

const couponsView = () => `
<section class="panel" aria-labelledby="platform-catalog-title">
 ${panelHead('platform-catalog-title', 'Catálogo comercial', '9', 'Crear un cupón no inicia cobros ni activa un proveedor de pagos')}
 <form class="platform-admin-coupon">
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Código<input value="SCALE10" autocomplete="off"/></label>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Tipo<select><option>Porcentaje</option><option>Monto fijo</option><option>Días gratis</option></select></label>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Valor<input value="10" inputmode="numeric"/></label>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Vence (opcional)<input type="date" value="2026-12-31"/></label>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Empresa (opcional)<select><option>Todas las empresas</option></select></label>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute platform-admin-coupon-note">Nota interna (opcional)<textarea rows="2" maxlength="2000" placeholder="Ej.: gracia acordada por WhatsApp"></textarea></label>
  <button type="button" class="primary min-h-11 md:min-h-10">Crear cupón</button>
 </form>
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Cupones" class="silent-scroll relative min-w-0 overflow-x-auto">
   <div class="min-w-[62rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(9rem,1.3fr)_8rem_5.5rem_minmax(7rem,1fr)_5rem_5.5rem_7rem]"><span role="columnheader">Cupón</span><span role="columnheader" class="text-right">Descuento</span><span role="columnheader">Vence</span><span role="columnheader">Empresa</span><span role="columnheader" class="text-right">Usos</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${COUPONS.map((coupon) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(9rem,1.3fr)_8rem_5.5rem_minmax(7rem,1fr)_5rem_5.5rem_7rem]">
     <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${coupon.code}">${coupon.code}</b></div>
     <span role="cell" class="text-right"><span class="list-amount text-fore">${coupon.discount}</span></span>
     <span role="cell" class="min-w-0"><span class="list-date" data-tone="${coupon.expired ? 'warn' : ''}" title="${coupon.expiry ? 'Vence ' + coupon.expiry : 'Sin vencimiento'}">${shortDate(coupon.expiry)}</span></span>
     <span role="cell" class="list-secondary min-w-0" title="${coupon.company}${coupon.note ? ' · ' + coupon.note : ''}">${coupon.company}</span>
     <span role="cell" class="whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums text-fore">${coupon.uses}</span>
     <span role="cell">${chip(coupon.status, coupon.tone)}</span>
     <div role="cell" class="list-actions"><button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? I.pause + 'Pausar' : I.play + 'Reactivar'}</button></div>
    </div>`).join('')}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-mobile-cards grid gap-3 sm:grid-cols-2">
  ${COUPONS.map((coupon) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${coupon.code}">${coupon.code}</b><small class="mt-0.5 block text-[11px] text-mute">${coupon.detail}</small></div>
   <div class="flex flex-wrap items-center gap-2">${chip(coupon.status, coupon.tone)}</div>
   <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
    <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Vence</dt><dd class="mt-0.5"><span class="list-date" data-tone="${coupon.expired ? 'warn' : ''}">${shortDate(coupon.expiry)}</span></dd></div>
    <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usos</dt><dd class="mt-0.5 font-semibold tabular-nums text-fore">${coupon.uses}</dd></div>
    <div class="col-span-2"><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Empresa</dt><dd class="mt-0.5 text-fore [overflow-wrap:anywhere]">${coupon.company}</dd></div>
    ${coupon.note ? `<div class="col-span-2"><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Nota</dt><dd class="mt-0.5 text-mute [overflow-wrap:anywhere]">${coupon.note}</dd></div>` : ''}
   </dl>
   <div class="mt-auto border-t border-ink-600 pt-3"><button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? I.pause + 'Pausar' : I.play + 'Reactivar'}</button></div>
  </article>`).join('')}
 </div>
</section>`;

const accessView = () => `
<section class="panel" aria-labelledby="platform-access-title">
 ${panelHead('platform-access-title', 'Accesos entre agencias', '1.284', 'El acceso global no cambia los permisos de cada agencia')}
 ${toolbar('3 de 1.284')}
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Accesos entre agencias" class="silent-scroll relative min-w-0 overflow-x-auto">
   <div class="min-w-[60rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,1fr)_8rem_25rem]"><span role="columnheader">Usuario</span><span role="columnheader">Agencias</span><span role="columnheader">Acceso</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${USERS.map((person) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,1fr)_8rem_25rem]">
     <div role="cell" class="min-w-0">${personSm(person.name || person.email, person.name ? person.email + (person.self ? ' · Vos' : '') : (person.self ? 'Vos' : ''))}</div>
     <span role="cell" class="list-secondary min-w-0" title="${person.agencyNames}">${person.agencyNames}</span>
     <span role="cell">${chip(person.role === 'admin' ? 'Admin global' : person.role === 'viewer' ? 'Solo lectura' : 'Acceso de agencia', person.role === 'admin' ? 'ok' : person.role === 'viewer' ? 'info' : 'mute')}</span>
     <div role="cell" class="list-actions"><span class="inline-actions flex flex-nowrap items-center justify-end gap-2">${person.self ? `<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar mi cuenta</button>` : `${person.role !== 'admin' ? `<button type="button" class="text-button">${I.shield}Hacer admin global</button>` : ''}${person.role !== 'viewer' ? `<button type="button" class="text-button">${I.eye}Solo lectura</button>` : ''}${person.role ? '<button type="button" class="text-button">Quitar acceso</button>' : ''}<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar usuario</button>`}</span></div>
    </div>`).join('')}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-mobile-cards grid gap-3 sm:grid-cols-2">
  ${USERS.map((person) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0">${personSm(person.name || person.email, person.name ? person.email + (person.self ? ' · Vos' : '') : (person.self ? 'Vos' : ''))}</div>
   <small class="block text-[11px] text-mute [overflow-wrap:anywhere]">${person.agencies} agencias activas · ${person.agencyNames}</small>
   <div class="flex flex-wrap gap-1.5">${chip(person.role === 'admin' ? 'Admin global' : person.role === 'viewer' ? 'Solo lectura' : 'Acceso de agencia', person.role === 'admin' ? 'ok' : person.role === 'viewer' ? 'info' : 'mute')}</div>
   <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">${person.self ? `<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar mi cuenta</button>` : `${person.role !== 'admin' ? `<button type="button" class="text-button">${I.shield}Hacer admin global</button>` : ''}${person.role ? '<button type="button" class="text-button">Quitar acceso</button>' : ''}<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar usuario</button>`}</div>
  </article>`).join('')}
 </div>
</section>`;

const auditView = () => `
<section class="panel" aria-labelledby="platform-audit-title">
 ${panelHead('platform-audit-title', 'Actividad de administración global', '50', 'Cada operación sensible queda registrada con actor, acción y destino')}
 ${toolbar('3 de 50', '<label class="grid gap-1.5 text-[11px] font-semibold text-mute">Acción<select aria-label="Filtrar por acción" class="min-w-[13rem]"><option>Todas las acciones</option><option>platform.agency.delete</option></select></label>')}
 <div class="min-w-0">
  <style>.admin-audit-fixture-cards{display:none}@media(max-width:855px){.admin-audit-fixture-table{display:none}.admin-audit-fixture-cards{display:grid}}</style>
  <div role="table" aria-label="Actividad de administración global" class="admin-audit-fixture-table silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[49.5rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]"><span role="columnheader">Fecha</span><span role="columnheader">Actor</span><span role="columnheader">Acción</span><span role="columnheader">Destino</span></div>
    <div role="rowgroup">${AUDIT.map((entry) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]">
     <span role="cell" class="list-date" title="${longDate(entry.when)}">${longDate(entry.when)}</span>
     <span role="cell" class="list-identity text-fore" title="${entry.actor}">${entry.actor}</span>
     <span role="cell" class="min-w-0">${chip(entry.action, 'info', entry.action)}</span>
     <span role="cell" class="list-secondary text-[12.5px] text-fore" title='${entry.target} #${entry.id} · {"days":30,"reason":"Pago manual recibido"}'>${entry.target} #${entry.id}<span class="text-mute"> · {"days":30,"reason":"Pago manual recibido"}</span></span>
    </div>`).join('')}</div>
   </div>
  </div>
  <div class="admin-audit-fixture-cards platform-admin-audit-cards grid gap-3 sm:grid-cols-2">
   ${AUDIT.map(entry => `<article class="min-w-0 rounded-xl border border-ink-600 bg-ink-800 p-4"><dl class="grid gap-3 [&_dd]:mt-0.5 [&_dd]:text-[12.5px] [&_dd]:leading-normal [&_dd]:text-fore [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-[.06em] [&_dt]:text-mute"><div><dt>Fecha</dt><dd>${longDate(entry.when)}</dd></div><div><dt>Actor</dt><dd>${entry.actor}</dd></div><div><dt>Acción</dt><dd>${entry.action}</dd></div><div><dt>Destino</dt><dd>${entry.target} #${entry.id}</dd></div><div><dt>Metadatos</dt><dd>{"days":30,"reason":"Pago manual recibido"}</dd></div></dl></article>`).join('')}
  </div>
 </div>
</section>`;


/* ── Consultas de la landing (app/superadmin/inquiries.tsx) ─────────────────
 * ListGrid: Fecha · Nombre/empresa · Contacto (correo + WhatsApp) · Mensaje
 * (2 líneas con title) · Estado · Acciones (primaria + ⋯); tarjetas en mobile. */
const INQUIRIES = [
  {name: 'Ana María Benítez de la Cruz', company: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', email: 'ana.benitez@estudiocomunicacionparaguay.com.py', whatsapp: '+595 981123456', message: 'Queremos ordenar la producción de 14 clientes y dejar de usar planillas. ¿Tienen migración de datos desde Excel y capacitación para el equipo comercial y de producción?', status: 'new', note: '', when: '2026-10-14T18:12:00.000Z'},
  {name: 'Compras Cooperativa', company: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', email: 'compras@coopservicios.com.py', whatsapp: null, message: '', status: 'contacted', note: 'Llamar el lunes a las 10, pidió demo para 5 usuarios', when: '2026-10-13T11:05:00.000Z'},
  {name: 'Luis Ramírez', company: 'Agencia Creativa del Sur', email: 'luis@creativasur.example.com', whatsapp: '+54 91155550000', message: 'Precio para 5 usuarios.', status: 'closed', note: '', when: '2026-10-11T09:40:00.000Z'},
];
const INQ_STATUS = {new: ['Nueva', 'warn'], contacted: ['Contactada', 'info'], closed: ['Cerrada', 'mute']};
const INQ_TEMPLATE = 'grid-cols-[8.5rem_minmax(12rem,1.1fr)_minmax(14rem,1fr)_minmax(14rem,1.4fr)_7rem_13rem]';
const waHref = (value) => value ? `https://wa.me/${value.replace(/\D/g, '')}` : '';
const inqWho = (q) => `<span class="grid min-w-0 gap-0.5"><b class="list-identity truncate text-[13px] font-semibold text-fore" title="${q.name}">${q.name}</b><small class="truncate text-[12px] text-mute" title="${q.company}">${q.company}</small></span>`;
const inqContact = (q) => `<span class="grid min-w-0 gap-0.5"><a class="list-secondary truncate text-[12.5px] text-fore underline-offset-2 hover:underline" href="mailto:${q.email}" title="Escribir a ${q.email}">${q.email}</a>${q.whatsapp ? `<a class="truncate text-[12px] text-mute underline-offset-2 hover:underline" href="${waHref(q.whatsapp)}" target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp con ${q.whatsapp}">WhatsApp ${q.whatsapp}</a>` : '<span class="text-[12px] text-mute">Sin WhatsApp</span>'}</span>`;
const inqMessage = (q) => `<span class="grid min-w-0 gap-0.5"><span class="line-clamp-2 text-[12.5px] leading-snug ${q.message ? 'text-fore' : 'text-mute'}" title="${q.message || 'Sin mensaje'}">${q.message || 'Sin mensaje'}</span>${q.note ? `<small class="truncate text-[11.5px] text-mute" title="Nota: ${q.note}">Nota: ${q.note}</small>` : ''}</span>`;
const inqActions = (q) => `${q.status === 'new' ? '<button type="button" class="text-button platform-admin-inline-action">Marcar contactada</button>' : ''}<button type="button" class="ui-action-menu-trigger" aria-label="Acciones de la consulta de ${q.name}" title="Más acciones">⋯</button>`;
const inquiriesView = () => `
<section class="panel" aria-labelledby="platform-inquiries-title">
 <div class="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1"><div class="flex min-w-0 items-center gap-2"><h2 id="platform-inquiries-title" class="text-[15px] font-semibold tracking-tight text-fore">Consultas de la landing</h2>${chip('1 nueva', 'warn', 'Consultas nuevas sin atender')}</div><small class="text-[12px] leading-[1.35] text-mute">Formulario «¿Tenés alguna duda?» · cada consulta también llega por correo</small></div>
 <div data-toolbar="filtros" class="mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap" style="gap:12px"><label class="grid gap-1.5 text-[11px] font-semibold text-mute">Estado<select aria-label="Filtrar consultas por estado" class="min-w-[12rem]"><option>Todas (3)</option><option>Nuevas (1)</option><option>Contactadas (1)</option><option>Cerradas (1)</option></select></label><p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">3 de 3</p></div>
 <div class="min-w-0">
  <style>.admin-inq-fixture-cards{display:none}@media(max-width:1180px){.admin-inq-fixture-table{display:none}.admin-inq-fixture-cards{display:grid}}</style>
  <div role="table" aria-label="Consultas de la landing" class="admin-inq-fixture-table silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[70rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${INQ_TEMPLATE}"><span role="columnheader">Fecha</span><span role="columnheader">Nombre / empresa</span><span role="columnheader">Contacto</span><span role="columnheader">Mensaje</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Acciones</span></div>
    <div role="rowgroup">${INQUIRIES.map((q) => `
    <div role="row" data-status="${q.status}" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 ${INQ_TEMPLATE}">
     <span role="cell" class="list-date" title="${longDate(q.when)}">${longDate(q.when)}</span>
     <div role="cell" class="min-w-0">${inqWho(q)}</div>
     <div role="cell" class="min-w-0">${inqContact(q)}</div>
     <div role="cell" class="min-w-0">${inqMessage(q)}</div>
     <span role="cell" class="min-w-0">${chip(INQ_STATUS[q.status][0], INQ_STATUS[q.status][1])}</span>
     <div role="cell" class="list-actions">${inqActions(q)}</div>
    </div>`).join('')}</div>
   </div>
  </div>
  <div class="admin-inq-fixture-cards platform-admin-inquiry-cards grid gap-3 sm:grid-cols-2">
   ${INQUIRIES.map((q) => `<article data-status="${q.status}" class="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4"><div class="flex min-w-0 items-start justify-between gap-2">${inqWho(q)}${chip(INQ_STATUS[q.status][0], INQ_STATUS[q.status][1])}</div>${inqContact(q)}${inqMessage(q)}<small class="list-date text-[12px]">${longDate(q.when)}</small><div class="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">${inqActions(q)}</div></article>`).join('')}
  </div>
 </div>
</section>`;

// Marco real del shell (riel lateral + barra superior, guía §2/§7): generado desde los componentes.
const shell = (view, body) => adminShell(view, `<style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${body}`, {period: view === 'resumen'});


/* Carga inicial: app/loading-screen.tsx sin sesión (variante neutra). */
const loadingPage = `
<div class="loading-page" role="status" aria-live="polite">
 <div class="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800/95 px-6 py-7 text-center shadow-[0_24px_60px_rgb(37_28_41_/_12%)] max-md:px-5" data-loading-card>
  ${brand}
  <div class="flex w-full min-w-0 flex-col items-center gap-3 border-t border-ink-600 pt-4">
   <span class="h-1 w-28 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span class="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"></span></span>
   <p class="text-[11.5px] text-mute">Un momento, estamos preparando todo…</p>
  </div>
 </div>
</div>`;

/* ── Rediseño #155 fase 2 (después) ─────────────────────────────────────────
 * Espeja el panel con la propuesta aprobada: Resumen con riel de atención y
 * atajos, tabs con Accesos antes que Cupones, skeleton propio, acciones de
 * agencia (primaria + ⋯) y tarjetas de 200 px. El CSS real (platform-admin.css)
 * aporta el indicador activo y la sombra de scroll del wrapper. */
const tabs2 = (active, counts = {consultas: 12, agencias: 4, accesos: 3, cupones: 3, auditoria: 50}) => `
<div class="platform-admin-tabs-wrap">
 <div class="platform-admin-tabs silent-scroll">
  <div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1 w-max flex-nowrap" role="group" aria-label="Secciones del panel global">
   ${[['resumen', 'Resumen', undefined], ['consultas', 'Consultas', counts.consultas], ['agencias', 'Agencias', counts.agencias], ['accesos', 'Accesos', counts.accesos], ['cupones', 'Cupones', counts.cupones], ['auditoria', 'Auditoría', counts.auditoria], ['uso', 'Uso', undefined]].map(([id, label, count]) => `<button type="button" aria-pressed="${id === active}" aria-label="${label}${count === undefined ? '' : ` (${count})`}" title="${label}" class="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium md:min-h-8 ${id === active ? 'bg-fono/15 text-fono-text' : 'text-mute'}">${label}${count === undefined ? '' : `<span class="text-xs opacity-75">${count}</span>`}</button>`).join('')}
  </div>
 </div>
</div>`;

const overview2 = () => `
<div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
 <div class="grid min-w-0 gap-4">
  <div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de plataforma">
   ${kpi({label: 'Agencias activas', valor: '128', hint: 'de 134 agencias', destacado: true})}
   ${kpi({label: 'Usuarios registrados', valor: '1.284', hint: 'Cuentas de todas las agencias'})}
   ${kpi({label: 'Cupones activos', valor: '6', hint: 'de 9 códigos'})}
   ${kpi({label: 'Suscripciones', valor: '121', hint: '121 active · 13 trialing'})}
  </div>
  <div class="grid min-w-0 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
   <section class="panel" aria-labelledby="platform-expiring-title">
    <div class="mb-2 flex min-w-0 items-center justify-between gap-3"><h2 id="platform-expiring-title" class="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Agencias por vencer</h2><button type="button" class="text-button min-h-11 md:min-h-8">Ver agencias${I.arrow}</button></div>
    <div>${AGENCIES.slice(0, 3).map((agency) => row(
      `<span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${agency.name}">${agency.name}</b><small class="block truncate text-[11px] text-mute" title="${agency.slug}">${agency.slug}</small></span>`,
      `<span class="flex shrink-0 items-center gap-2">${chip(manualLabel(agency.manual), manualTone(agency.manual))}<span class="list-date text-[12px] tabular-nums" data-tone="${dueTone(agency.expiry, agency.expiring)}" title="Vence ${agency.expiry}">${shortDate(agency.expiry)}</span></span>`)).join('')}</div>
   </section>
   <section class="panel" aria-labelledby="platform-recent-title">
    <div class="mb-2 flex min-w-0 items-center justify-between gap-3"><h2 id="platform-recent-title" class="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Últimas acciones</h2><button type="button" class="text-button min-h-11 md:min-h-8">Ver auditoría${I.arrow}</button></div>
    <div>${AUDIT.map((entry) => row(
      `<span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${entry.actor}">${entry.actor}</b><small class="block truncate text-[11px] text-mute" title="${entry.action} · ${entry.target} #${entry.id}">${entry.target} #${entry.id}</small></span>`,
      `<span class="flex shrink-0 items-center gap-2">${chip(entry.action, 'info', entry.action)}<span class="list-date text-[12px] tabular-nums" title="${longDate(entry.when)}">${shortDate(entry.when)}</span></span>`)).join('')}</div>
   </section>
   <section class="panel" aria-labelledby="platform-subscriptions-title">
    <div class="mb-2 flex min-w-0 items-center justify-between gap-3"><h2 id="platform-subscriptions-title" class="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Suscripciones por estado</h2><button type="button" class="text-button min-h-11 md:min-h-8">Ver agencias${I.arrow}</button></div>
    <div>${[['active', '121'], ['trialing', '13']].map(([status, total]) => row(
      `<span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${status}">${status}</b><small class="block text-[11px] text-mute">Estado informado por la plataforma</small></span>`,
      `<span class="shrink-0 text-[13px] font-semibold tabular-nums text-fore">${total}</span>`)).join('')}</div>
   </section>
  </div>
 </div>
 <aside class="grid min-w-0 content-start gap-4" aria-label="Requiere tu atención">
  <section class="panel" aria-labelledby="platform-attention-title">
   <h2 id="platform-attention-title" class="mb-2 text-[15px] font-semibold tracking-tight text-fore">Requiere tu atención</h2>
   <div>
    <button type="button" class="flex w-full min-w-0 items-start justify-between gap-3 border-b border-ink-600/60 py-2.5 text-left transition last:border-0 hover:bg-ink-700/40"><span class="min-w-0"><b class="block text-[13px] font-semibold leading-snug text-fore">1 agencia con acceso suspendido</b><small class="mt-0.5 block text-[11px] text-mute">Revisá el estado manual</small></span>${chip('Revisar', 'bad')}</button>
    <button type="button" class="flex w-full min-w-0 items-start justify-between gap-3 border-b border-ink-600/60 py-2.5 text-left transition last:border-0 hover:bg-ink-700/40"><span class="min-w-0"><b class="block text-[13px] font-semibold leading-snug text-fore">2 agencias vencen en 7 días</b><small class="mt-0.5 block text-[11px] text-mute">Prueba o facturación</small></span>${chip('Atender', 'warn')}</button>
    <button type="button" class="flex w-full min-w-0 items-start justify-between gap-3 border-b border-ink-600/60 py-2.5 text-left transition last:border-0 hover:bg-ink-700/40"><span class="min-w-0"><b class="block text-[13px] font-semibold leading-snug text-fore">13 suscripciones fuera de «active»</b><small class="mt-0.5 block text-[11px] text-mute">Seguimiento de cobro</small></span>${chip('Seguir', 'info')}</button>
   </div>
  </section>
  <section class="panel" aria-labelledby="platform-shortcuts-title">
   <h2 id="platform-shortcuts-title" class="mb-2 text-[15px] font-semibold tracking-tight text-fore">Atajos</h2>
   <div class="grid gap-1.5">
    ${[['Gestionar agencias', 'Estado manual, plan y vencimiento'], ['Crear cupón', 'Código, tipo y valor'], ['Revisar accesos', 'Roles globales y límites'], ['Ver auditoría', 'Últimas operaciones sensibles']].map(([label, detail]) => `<button type="button" class="flex min-h-11 items-center gap-3 rounded-lg border border-ink-600 px-3 py-2 text-left transition hover:border-fono hover:bg-fono/10"><span class="shrink-0 text-fono" aria-hidden="true">◆</span><span class="min-w-0"><b class="block truncate text-[13px] font-semibold text-fore">${label}</b><small class="block truncate text-[11px] text-mute">${detail}</small></span></button>`).join('')}
   </div>
  </section>
 </aside>
</div>`;

const agencyRows2 = AGENCIES.map((agency) => `
<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1.1fr)_minmax(15rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]">
 <div role="cell" class="min-w-0">${agencyIdentity(agency)}</div>
 <div role="cell" class="min-w-0">${ownerCell(agency.owner)}</div>
 <div role="cell" class="flex min-w-0 flex-wrap items-center gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(manualLabel(agency.manual), manualTone(agency.manual))}</div>
 <span role="cell" class="text-right"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-fore">${agency.amount || '—'}</span></span>
 <span role="cell" class="text-right text-[12.5px] font-semibold tabular-nums text-fore">${agency.users}</span>
 <span role="cell" class="list-date min-w-0" data-tone="${dueTone(agency.expiry, agency.expiring)}" title="${agency.expiry ? `Vence ${agency.expiry}` : 'Sin vencimiento registrado'}">${shortDate(agency.expiry)}</span>
 <div role="cell" class="list-actions"><span class="inline-actions flex flex-nowrap items-center justify-end gap-2"><button type="button" class="text-button platform-admin-inline-action" title="Activar, suspender o extender el acceso manual">Gestionar suscripción</button><span class="relative"><button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de la agencia: ${agency.name}" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7"><span role="img" aria-hidden="true">⋮</span></button></span></span></div>
</div>`).join('');

const agenciesView2 = () => `
<section class="panel" aria-labelledby="platform-agencies-title">
 ${panelHead('platform-agencies-title', 'Agencias y suscripciones', '134', 'Gestioná el acceso manual junto a cada registro')}
 ${toolbar('4 de 134')}
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Agencias y suscripciones" class="silent-scroll relative min-w-0 overflow-x-auto">
   <div class="min-w-[84rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1.1fr)_minmax(15rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]"><span role="columnheader">Agencia</span><span role="columnheader">Administra</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Plan</span><span role="columnheader" class="text-right">Usuarios</span><span role="columnheader">Prueba / vencimiento</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${agencyRows2}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-agency-cards platform-admin-mobile-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
  ${AGENCIES.map((agency) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${agency.name}">${agency.name}</b><small class="mt-0.5 block text-[11px] text-mute">${agency.slug}</small></div>
   <div class="flex flex-wrap gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(manualLabel(agency.manual), manualTone(agency.manual))}</div>
   <div class="min-w-0">${ownerCell(agency.owner)}</div>
   <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
    <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Plan</dt><dd class="mt-0.5 font-semibold text-fore">${agency.amount || '—'}</dd></div>
    <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usuarios</dt><dd class="mt-0.5 font-semibold tabular-nums text-fore">${agency.users}</dd></div>
    <div class="col-span-2"><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Prueba / vencimiento</dt><dd class="list-date mt-0.5" data-tone="${dueTone(agency.expiry, agency.expiring)}">${agency.expiry || '—'}</dd></div>
   </dl>
   <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3"><button type="button" class="text-button platform-admin-inline-action" title="Activar, suspender o extender el acceso manual">Gestionar suscripción</button><span class="relative"><button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de la agencia: ${agency.name}" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7"><span role="img" aria-hidden="true">⋮</span></button></span></div>
  </article>`).join('')}
 </div>
</section>`;

const menuOpen2 = `
<div class="grid gap-2">
 <p class="text-xs text-mute">El ⋯ de cada agencia es el menú del sistema; la eliminación vive ahí y conserva la confirmación reforzada.</p>
 <div class="relative inline-flex w-fit flex-col items-start">
  <button type="button" aria-haspopup="menu" aria-expanded="true" aria-label="Acciones de la agencia: Cooperativa Multiactiva de Servicios Múltiples Limitada" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7"><span role="img" aria-hidden="true">⋮</span></button>
  <div role="menu" aria-label="Acciones de la agencia" class="absolute left-0 top-12 z-20 min-w-48 rounded-xl border border-ink-500 bg-ink p-1 shadow-float md:top-9">
   <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fore transition hover:bg-ink-700/60"><span class="min-w-0 flex-1 truncate">Aplicar cupón</span></button>
   <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-bad-text transition hover:bg-bad/10">${I.trash}<span class="min-w-0 flex-1 truncate">Eliminar agencia</span></button>
  </div>
 </div>
</div>`;

const notices2 = `
<div class="grid gap-3">
 <section class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 border-warn-text/45" role="status">
  <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-warn" aria-hidden="true">▲</span>
  <div class="min-w-0"><b class="block text-[13.5px] font-semibold text-fore">Primer acceso global pendiente</b><p class="mt-0.5 text-xs text-mute">La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia.</p></div>
 </section>
 <section class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 border-bad-text/40" role="alert">
  <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-bad" aria-hidden="true">⚠</span>
  <div class="min-w-0"><b class="block text-[13.5px] font-semibold text-fore">No pudimos actualizar el control global</b><span class="mt-1 inline-flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[12px] text-fore">La sesión venció. Volvé a iniciar sesión para reintentar.</span>
   <button type="button" class="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8">↻ Reintentar</button>
  </div>
 </section>
</div>`;

export default [
  {
    id: 'admin-carga',
    section: 'Superadmin',
    surface: 'Panel admin · carga inicial (#102)',
    kind: 'plain',
    body: loadingPage,
  },
  {
    id: 'admin-resumen',
    section: 'Superadmin',
    surface: 'Panel admin · Resumen (#102)',
    kind: 'plain',
    body: shell('resumen', overview()),
  },
  {
    id: 'admin-agencias',
    section: 'Superadmin',
    surface: 'Panel admin · Agencias (#102)',
    kind: 'plain',
    lists: [
      {container: '.platform-admin-table-wrap [role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · agencias (#102)', exemptBelow: 760},
    ],
    body: shell('agencias', agenciesView()),
  },
  {
    id: 'admin-cupones',
    section: 'Superadmin',
    surface: 'Panel admin · Cupones (#102)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Cupones"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · cupones (#102)', exemptBelow: 430},
    ],
    body: shell('cupones', couponsView()),
  },
  {
    id: 'admin-accesos',
    section: 'Superadmin',
    surface: 'Panel admin · Accesos (#102)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Accesos entre agencias"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · accesos (#102)', exemptBelow: 430},
    ],
    body: shell('accesos', accessView()),
  },
  {
    id: 'admin-auditoria',
    section: 'Superadmin',
    surface: 'Panel admin · Auditoría (#102)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Actividad de administración global"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · auditoría (#102)', rowHeight: [44, 52], exemptBelow: 856},
    ],
    body: shell('auditoria', auditView()),
  },

  /* ── #155 fase 2 (después) ─────────────────────────────────────────────── */
  {
    id: 'admin2-resumen',
    section: 'Superadmin',
    surface: 'Resumen con riel de atención/atajos y suscripciones (#155)',
    kind: 'plain',
    body: adminShell('resumen', `<style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${overview2()}`, {period: true}),
  },
  {
    id: 'admin2-agencias',
    section: 'Superadmin',
    surface: 'Agencias: acción primaria + ⋯, tarjetas 200 px (#155 D)',
    kind: 'plain',
    lists: [
      {container: '.platform-admin-table-wrap [role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · agencias (#155)', exemptBelow: 760},
    ],
    body: adminShell('agencias', `<style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${agenciesView2()}`, {period: false}),
  },
  {
    id: 'admin2-menu',
    section: 'Superadmin',
    surface: 'Menú ⋯ de agencia con la eliminación (#155 D)',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell">${menuOpen2}</main>`,
  },
  {
    id: 'admin2-cupones',
    section: 'Superadmin',
    surface: 'Cupones con el orden de tabs aprobado (#155 B)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Cupones"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · cupones (#155)', exemptBelow: 430},
    ],
    body: adminShell('cupones', `${couponsView()}`, {period: false}),
  },
  {
    id: 'admin2-accesos',
    section: 'Superadmin',
    surface: 'Accesos antes que Cupones en la barra (#155 B)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Accesos entre agencias"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · accesos (#155)', exemptBelow: 430},
    ],
    body: adminShell('accesos', `${accessView()}`, {period: false}),
  },
  {
    id: 'admin2-auditoria',
    section: 'Superadmin',
    surface: 'Auditoría con el nuevo encabezado de secciones (#155)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Actividad de administración global"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · auditoría (#155)', rowHeight: [44, 52], exemptBelow: 856},
    ],
    body: adminShell('auditoria', `${auditView()}`, {period: false}),
  },
  {
    id: 'admin3-consultas',
    section: 'Superadmin',
    surface: 'Consultas de la landing con el encabezado compacto (una fila) y la pestaña con insignia',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Consultas de la landing"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · consultas', rowHeight: [44, 52], exemptBelow: 1181},
    ],
    body: adminShell('consultas', `${inquiriesView()}`, {period: false}),
  },
  {
    id: 'admin2-skeleton',
    section: 'Superadmin',
    surface: 'Skeleton propio del panel durante la carga (#155 C)',
    kind: 'plain',
    body: SKELETON,
  },
  {
    id: 'admin2-avisos',
    section: 'Superadmin',
    surface: 'Avisos con borde de contraste y Reintentar (#155 C)',
    kind: 'plain',
    body: adminShell('resumen', notices2),
  },
];
