/*
 * Panel admin (superadmin) — rediseño a ciegas (#102, SOS-DSN).
 *
 * Fixtures de medición y evidencia:
 *   - `admin-antes`: réplica fiel del diseño anterior (scroll largo: header,
 *     avisos, KPIs, agencias, dos columnas y auditoría) con su CSS de pantalla
 *     embebido y acotado, para el antes/después.
 *   - `admin-resumen` / `admin-agencias` / `admin-cupones` / `admin-accesos` /
 *     `admin-auditoria`: la consola nueva (encabezado compacto, barra de
 *     secciones con contadores y cada vista) espejando
 *     `app/superadmin/{page,overview,agencies,catalog,access,audit}.tsx`.
 *
 * Datos de estrés: nombres y correos largos, montos y fechas reales.
 */
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
const brand = '<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>';

/* ── Datos de estrés ─────────────────────────────────────────────────────── */
const AGENCIES = [
  {name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', slug: 'estudio-comunicacion-py', active: true, users: 12, amount: 'Gs. 50.000', currency: 'PYG', manual: 'active', expiry: '2026-10-03', expiring: true},
  {name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', slug: 'coop-servicios-ltda', active: true, users: 34, amount: 'USD 10,00', currency: 'USD', manual: null, expiry: '2026-11-30'},
  {name: 'Agencia Creativa del Sur S.A.', slug: 'agencia-creativa-sur', active: false, users: 3, amount: 'Gs. 50.000', currency: 'PYG', manual: 'suspended', expiry: '2026-09-20', expiring: true},
  {name: 'Marketing Digital Integral Paraguay', slug: 'marketing-integral-py', active: true, users: 8, amount: null, currency: null, manual: null, expiry: null},
];
const manualLabel = (value) => value === 'active' ? 'Acceso manual activo' : value === 'suspended' ? 'Acceso manual suspendido' : 'Sin cambio manual';
const manualTone = (value) => value === 'active' ? 'info' : value === 'suspended' ? 'warn' : 'mute';
const dueTone = (value, expiring) => expiring ? 'warn' : '';
const shortDate = (value) => value ? `${value.slice(8, 10)}-${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'][Number(value.slice(5, 7)) - 1]}` : '—';
const longDate = (value) => value ? `${value.slice(8, 10)} ${['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'][Number(value.slice(5, 7)) - 1]} ${value.slice(2, 4)} · 18:12` : '—';

const USERS = [
  {email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', agencies: 12, self: true, role: 'admin'},
  {email: 'compras@coopservicios.com.py', agencies: 3, role: null},
  {email: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', agencies: 1, role: 'viewer'},
];
const AUDIT = [
  {action: 'platform.agency.delete', target: 'agency', id: 42, actor: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', when: '2026-09-29T18:12:00.000Z'},
  {action: 'platform.user.access', target: 'user', id: 7, actor: 'compras@coopservicios.com.py', when: '2026-09-29T17:40:00.000Z'},
  {action: 'platform.coupon.create', target: 'coupon', id: 15, actor: 'compras@coopservicios.com.py', when: '2026-09-28T11:05:00.000Z'},
];
const COUPONS = [
  {code: 'FUNDADOR30', detail: '30% · Sin límite de usos', active: true},
  {code: 'LANZAMIENTO', detail: 'Gs. 25.000 · 100 usos máximos', active: true},
  {code: 'PRUEBA-EXTENDIDA', detail: '15 días gratis · 50 usos máximos', active: false},
];

/* ── Encabezado y secciones (consola nueva) ──────────────────────────────── */
const header = (writable = true, updated = '18:12') => `
<header class="platform-admin-header">
 <a class="platform-admin-brand" href="#" aria-label="Scale OS">${brand}</a>
 <div class="platform-admin-identity">
  <p class="eyebrow">Administración global</p>
  <h1>Control de Scale OS</h1>
 </div>
 <div class="platform-admin-meta">${chip(writable ? 'Admin global' : 'Solo lectura', writable ? 'ok' : 'info', 'Rol de tu usuario en la plataforma')}${updated ? `<span class="platform-admin-updated" title="Última actualización ${updated} (hora de Asunción)">Actualizado ${updated}</span>` : ''}</div>
 <div class="platform-admin-actions"><button type="button" class="secondary">${I.refresh}Actualizar</button><a class="secondary" href="#">${I.back}Panel</a></div>
</header>`;

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
 <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${agency.name}">${agency.name}</b><small class="list-secondary" title="${agency.slug}">${agency.slug}</small></div>
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
  <div role="table" aria-label="Agencias y suscripciones" class="silent-scroll min-w-0 overflow-x-auto">
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
  <button type="button" class="primary min-h-11 md:min-h-10">Crear cupón</button>
 </form>
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Cupones" class="silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[25rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(10rem,1fr)_6.5rem_8rem]"><span role="columnheader">Cupón</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${COUPONS.map((coupon) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(10rem,1fr)_6.5rem_8rem]">
     <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${coupon.code}">${coupon.code}</b><small class="list-secondary" title="${coupon.detail}">${coupon.detail}</small></div>
     <span role="cell">${chip(coupon.active ? 'Activo' : 'Pausado', coupon.active ? 'ok' : 'mute')}</span>
     <div role="cell" class="list-actions"><button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? I.pause + 'Pausar' : I.play + 'Reactivar'}</button></div>
    </div>`).join('')}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-mobile-cards grid gap-3 sm:grid-cols-2">
  ${COUPONS.map((coupon) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${coupon.code}">${coupon.code}</b><small class="mt-0.5 block text-[11px] text-mute">${coupon.detail}</small></div>
   <div class="flex flex-wrap items-center gap-2">${chip(coupon.active ? 'Activo' : 'Pausado', coupon.active ? 'ok' : 'mute')}</div>
   <div class="mt-auto border-t border-ink-600 pt-3"><button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? I.pause + 'Pausar' : I.play + 'Reactivar'}</button></div>
  </article>`).join('')}
 </div>
</section>`;

const accessView = () => `
<section class="panel" aria-labelledby="platform-access-title">
 ${panelHead('platform-access-title', 'Accesos entre agencias', '1.284', 'El acceso global no cambia los permisos de cada agencia')}
 ${toolbar('3 de 1.284')}
 <div class="min-w-0 platform-admin-table-wrap">
  <div role="table" aria-label="Accesos entre agencias" class="silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[45rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(11rem,1fr)_7rem_25rem]"><span role="columnheader">Usuario</span><span role="columnheader">Acceso</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${USERS.map((person) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(11rem,1fr)_7rem_25rem]">
     <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${person.email}">${person.email}</b><small class="list-secondary">${person.agencies} agencias activas${person.self ? ' · Vos' : ''}</small></div>
     <span role="cell">${chip(person.role === 'admin' ? 'Admin global' : person.role === 'viewer' ? 'Solo lectura' : 'Acceso de agencia', person.role === 'admin' ? 'ok' : person.role === 'viewer' ? 'info' : 'mute')}</span>
     <div role="cell" class="list-actions"><span class="inline-actions flex flex-nowrap items-center justify-end gap-2">${person.self ? `<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar mi cuenta</button>` : `${person.role !== 'admin' ? `<button type="button" class="text-button">${I.shield}Hacer admin global</button>` : ''}${person.role !== 'viewer' ? `<button type="button" class="text-button">${I.eye}Solo lectura</button>` : ''}${person.role ? '<button type="button" class="text-button">Quitar acceso</button>' : ''}<button type="button" class="text-button platform-admin-danger">${I.trash}Eliminar usuario</button>`}</span></div>
    </div>`).join('')}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-mobile-cards grid gap-3 sm:grid-cols-2">
  ${USERS.map((person) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0"><b class="block text-[13px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${person.email}">${person.email}</b><small class="mt-0.5 block text-[11px] text-mute">${person.agencies} agencias activas${person.self ? ' · Vos' : ''}</small></div>
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
  <div role="table" aria-label="Actividad de administración global" class="silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[49.5rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]"><span role="columnheader">Fecha</span><span role="columnheader">Actor</span><span role="columnheader">Acción</span><span role="columnheader">Destino</span></div>
    <div role="rowgroup">${AUDIT.map((entry) => `
    <div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]">
     <span role="cell" class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${longDate(entry.when)}</span>
     <span role="cell" class="min-w-0 truncate text-[12.5px] text-fore" title="${entry.actor}">${entry.actor}</span>
     <span role="cell" class="min-w-0">${chip(entry.action, 'info', entry.action)}</span>
     <div role="cell" class="min-w-0"><span class="block break-words text-[12.5px] text-fore">${entry.target} #${entry.id}</span><small class="mt-1 block truncate text-[11px] text-mute" title='{"days":30,"reason":"Pago manual recibido"}'>{"days":30,"reason":"Pago manual recibido"}</small></div>
    </div>`).join('')}</div>
   </div>
  </div>
 </div>
</section>`;

const shell = (view, body) => `<main class="platform-admin-page control-shell"><style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${header()}${tabs(view)}${body}</main>`;

/* ── «Antes»: diseño anterior con su CSS acotado ─────────────────────────── */
const OLD_CSS = `<style>
[data-antes] .platform-admin-page{gap:clamp(14px,1.6vw,20px);width:min(1600px,100%);margin:0 auto;padding:clamp(12px,2.4vw,32px)}
[data-antes] .platform-admin-header{position:sticky;top:0;z-index:40;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:clamp(10px,1.6vw,18px);min-height:64px;margin-inline:calc(clamp(12px,2.4vw,32px) * -1);padding:9px clamp(12px,2.4vw,32px);border-bottom:1px solid color-mix(in srgb,var(--line) 86%,transparent);background:color-mix(in srgb,var(--surface,var(--canvas)) 92%,transparent)}
[data-antes] .platform-admin-title{display:grid;min-width:0;gap:2px}
[data-antes] .platform-admin-title h1{margin:0;font-size:clamp(20px,1.8vw,25px);font-weight:760;letter-spacing:-.04em;line-height:1.1}
[data-antes] .platform-admin-title>span{overflow:hidden;color:var(--text-muted);font-size:12px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}
[data-antes] .platform-admin-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
[data-antes] .platform-admin-actions :is(button,a){display:inline-flex;align-items:center;justify-content:center;gap:7px;padding-inline:13px;white-space:nowrap}
[data-antes] .platform-admin-two-columns{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(14px,1.6vw,20px);min-width:0}
[data-antes] .platform-admin-page :is(button,a,input,select,textarea){min-height:44px}
[data-antes] .platform-admin-page .panel{padding:20px}
[data-antes] .platform-admin-page .list-actions :is(button,a){min-height:38px}
[data-antes] .platform-admin-page .list-row{padding-block:4px}
@media(max-width:1080px){[data-antes] .platform-admin-two-columns{grid-template-columns:minmax(0,1fr)}}
@media(max-width:760px){[data-antes] .platform-admin-table-wrap{display:none}}
</style>`;

const oldHeader = `
<header class="platform-admin-header platform-admin-header--global">
 <a href="#" aria-label="Scale OS">${brand}</a>
 <div class="platform-admin-title"><p class="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Control de Scale OS</h1><span>Operación, acceso y catálogo comercial</span></div>
 <div class="platform-admin-actions"><button type="button" class="secondary">${I.refresh}Actualizar</button><a class="text-button" href="#">${I.back}Panel</a></div>
</header>`;

const oldNotice = `
<section class="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
 <span class="grid size-10 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute" aria-hidden="true">${I.shield}</span>
 <span class="min-w-0 text-xs text-mute"><strong class="text-fore">Acceso separado por plataforma.</strong> Ser dueño de una agencia no habilita este panel ni sus datos.</span>
</section>`;

const oldStats = `
<div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
 ${kpi({label: 'Agencias activas', valor: '128', hint: 'de 134 agencias', destacado: true})}
 ${kpi({label: 'Usuarios registrados', valor: '1.284', hint: 'Cuentas de todas las agencias'})}
 ${kpi({label: 'Cupones activos', valor: '6', hint: 'de 9 códigos'})}
 ${kpi({label: 'Suscripciones', valor: '121', hint: '121 active · 13 trialing'})}
</div>`;

const oldAuditPanel = `
<section class="panel" aria-labelledby="platform-audit-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Auditoría</p><h2 id="platform-audit-title" class="text-[17px] font-semibold tracking-tight text-fore">Actividad de administración global</h2></div><span class="whitespace-nowrap text-xs tabular-nums text-mute">50 acciones recientes</span></div>
 <div class="min-w-0"><div role="table" aria-label="Actividad de administración global" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[49.5rem]">
  <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]"><span role="columnheader">Fecha</span><span role="columnheader">Actor</span><span role="columnheader">Acción</span><span role="columnheader">Destino</span></div>
  <div role="rowgroup">${AUDIT.map((entry) => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]"><span role="cell" class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${longDate(entry.when)}</span><span role="cell" class="min-w-0 truncate text-[12.5px] text-fore" title="${entry.actor}">${entry.actor}</span><span role="cell" class="min-w-0">${chip(entry.action, 'info', entry.action)}</span><div role="cell" class="min-w-0"><span class="block break-words text-[12.5px] text-fore">${entry.target} #${entry.id}</span></div></div>`).join('')}</div>
 </div></div></div>
</section>`;

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
const tabs2 = (active, counts = {agencias: 4, accesos: 3, cupones: 3, auditoria: 50}) => `
<div class="platform-admin-tabs-wrap">
 <div class="platform-admin-tabs silent-scroll">
  <div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1 w-max flex-nowrap" role="group" aria-label="Secciones del panel global">
   ${[['resumen', 'Resumen', undefined], ['agencias', 'Agencias', counts.agencias], ['accesos', 'Accesos', counts.accesos], ['cupones', 'Cupones', counts.cupones], ['auditoria', 'Auditoría', counts.auditoria]].map(([id, label, count]) => `<button type="button" aria-pressed="${id === active}" aria-label="${label}${count === undefined ? '' : ` (${count})`}" title="${label}" class="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium md:min-h-8 ${id === active ? 'bg-fono/15 text-fono-text' : 'text-mute'}">${label}${count === undefined ? '' : `<span class="text-xs opacity-75">${count}</span>`}</button>`).join('')}
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
  <div class="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
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
<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]">
 <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${agency.name}">${agency.name}</b><small class="list-secondary" title="${agency.slug}">${agency.slug}</small></div>
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
  <div role="table" aria-label="Agencias y suscripciones" class="silent-scroll min-w-0 overflow-x-auto">
   <div class="min-w-[73.5rem]">
    <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]"><span role="columnheader">Agencia</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Plan</span><span role="columnheader" class="text-right">Usuarios</span><span role="columnheader">Prueba / vencimiento</span><span role="columnheader" class="text-right list-actions-head">Acciones</span></div>
    <div role="rowgroup">${agencyRows2}</div>
   </div>
  </div>
 </div>
 <div class="platform-admin-agency-cards platform-admin-mobile-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
  ${AGENCIES.map((agency) => `
  <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
   <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${agency.name}">${agency.name}</b><small class="mt-0.5 block text-[11px] text-mute">${agency.slug}</small></div>
   <div class="flex flex-wrap gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(manualLabel(agency.manual), manualTone(agency.manual))}</div>
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
 <div class="relative inline-flex w-fit flex-col items-end">
  <button type="button" aria-haspopup="menu" aria-expanded="true" aria-label="Acciones de la agencia: Cooperativa Multiactiva de Servicios Múltiples Limitada" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7"><span role="img" aria-hidden="true">⋮</span></button>
  <div role="menu" aria-label="Acciones de la agencia" class="absolute right-0 top-12 z-20 min-w-48 rounded-xl border border-ink-500 bg-ink p-1 shadow-float md:top-9">
   <button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-bad-text transition hover:bg-bad/10">${I.trash}<span class="min-w-0 flex-1 truncate">Eliminar agencia</span></button>
  </div>
 </div>
</div>`;

const skeleton2 = `
<header class="platform-admin-header" aria-hidden="true">
 <span class="block h-9 w-9 animate-pulse rounded-xl bg-fore/5"></span>
 <div class="platform-admin-identity"><span class="block h-3 w-28 animate-pulse rounded-lg bg-fore/5"></span><span class="mt-1 block h-5 w-44 animate-pulse rounded-lg bg-fore/5"></span></div>
 <div class="platform-admin-meta"><span class="block h-6 w-24 animate-pulse rounded-full bg-fore/5"></span><span class="block h-3 w-24 animate-pulse rounded-lg bg-fore/5"></span></div>
 <div class="platform-admin-actions"><span class="block h-11 w-28 animate-pulse rounded-lg bg-fore/5 md:h-9"></span><span class="block h-11 w-24 animate-pulse rounded-lg bg-fore/5 md:h-9"></span></div>
</header>
<div class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
 <div class="silent-scroll flex w-max gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1" aria-hidden="true">
  ${['w-24', 'w-28', 'w-24', 'w-20', 'w-28'].map((size) => `<span class="block h-11 ${size} animate-pulse rounded-lg bg-fore/5 md:h-8"></span>`).join('')}
 </div>
 <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
  <div class="grid min-w-0 gap-4">
   <div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
    ${[0, 1, 2, 3].map(() => '<div class="rounded-xl border border-ink-600 bg-ink-800 p-4"><span class="block h-3 w-24 animate-pulse rounded-lg bg-fore/5"></span><span class="mt-2 block h-7 w-20 animate-pulse rounded-lg bg-fore/5"></span><span class="mt-2 block h-3 w-28 animate-pulse rounded-lg bg-fore/5"></span></div>').join('')}
   </div>
   <div class="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
    ${[0, 1, 2].map(() => '<div class="panel grid gap-2"><span class="block h-4 w-36 animate-pulse rounded-lg bg-fore/5"></span><span class="block h-10 w-full animate-pulse rounded-lg bg-fore/5"></span><span class="block h-10 w-full animate-pulse rounded-lg bg-fore/5"></span></div>').join('')}
   </div>
  </div>
  <div class="grid content-start gap-4">
   ${[0, 1].map(() => '<div class="panel grid gap-2"><span class="block h-4 w-32 animate-pulse rounded-lg bg-fore/5"></span><span class="block h-10 w-full animate-pulse rounded-lg bg-fore/5"></span><span class="block h-10 w-full animate-pulse rounded-lg bg-fore/5"></span></div>').join('')}
  </div>
 </div>
</div>`;

const notices2 = `
<div class="grid gap-3">
 <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[12px] leading-[1.45] text-mute"><strong class="font-semibold text-fore">Acceso separado por plataforma.</strong><span>Ser dueño de una agencia no habilita este panel ni sus datos.</span></p>
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
    id: 'admin-antes',
    section: 'Superadmin',
    surface: 'Panel admin — diseño anterior (#80/v1.0.143, scroll largo)',
    kind: 'plain',
    lists: [
      {container: '.platform-admin-table-wrap [role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · agencias (antes)', exemptBelow: 760},
    ],
    body: `${OLD_CSS}<div data-antes><main class="platform-admin-page">${oldHeader}${oldNotice}${oldStats}${agenciesView().replace('<section class="panel" aria-labelledby="platform-agencies-title">', '<section class="panel platform-admin-agencies" aria-labelledby="platform-agencies-title">')}<div class="platform-admin-two-columns" aria-label="Catálogo comercial y accesos">${couponsView()}${accessView()}</div>${oldAuditPanel}</main></div>`,
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
      {container: '[role="table"][aria-label="Actividad de administración global"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · auditoría (#102)', rowHeight: [44, 52]},
    ],
    body: shell('auditoria', auditView()),
  },

  /* ── #155 fase 2 (después) ─────────────────────────────────────────────── */
  {
    id: 'admin2-resumen',
    section: 'Superadmin',
    surface: 'Resumen con riel de atención/atajos y suscripciones (#155)',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell"><style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${header()}${tabs2('resumen')}${overview2()}</main>`,
  },
  {
    id: 'admin2-agencias',
    section: 'Superadmin',
    surface: 'Agencias: acción primaria + ⋯, tarjetas 200 px (#155 D)',
    kind: 'plain',
    lists: [
      {container: '.platform-admin-table-wrap [role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · agencias (#155)', exemptBelow: 760},
    ],
    body: `<main class="platform-admin-page control-shell"><style>.platform-admin-mobile-cards{display:none}@media(max-width:760px){.platform-admin-mobile-cards{display:grid}}</style>${header()}${tabs2('agencias')}${agenciesView2()}</main>`,
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
    body: `<main class="platform-admin-page control-shell">${header()}${tabs2('cupones')}${couponsView()}</main>`,
  },
  {
    id: 'admin2-accesos',
    section: 'Superadmin',
    surface: 'Accesos antes que Cupones en la barra (#155 B)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Accesos entre agencias"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · accesos (#155)', exemptBelow: 430},
    ],
    body: `<main class="platform-admin-page control-shell">${header()}${tabs2('accesos')}${accessView()}</main>`,
  },
  {
    id: 'admin2-auditoria',
    section: 'Superadmin',
    surface: 'Auditoría con el nuevo encabezado de secciones (#155)',
    kind: 'plain',
    lists: [
      {container: '[role="table"][aria-label="Actividad de administración global"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Superadmin · auditoría (#155)', rowHeight: [44, 52]},
    ],
    body: `<main class="platform-admin-page control-shell">${header()}${tabs2('auditoria')}${auditView()}</main>`,
  },
  {
    id: 'admin2-skeleton',
    section: 'Superadmin',
    surface: 'Skeleton propio del panel durante la carga (#155 C)',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell" aria-busy="true">${skeleton2}</main>`,
  },
  {
    id: 'admin2-avisos',
    section: 'Superadmin',
    surface: 'Avisos con borde de contraste y Reintentar (#155 C)',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell">${header()}${notices2}</main>`,
  },
];
