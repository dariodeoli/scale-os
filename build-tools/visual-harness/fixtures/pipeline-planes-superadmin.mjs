/*
 * Fixtures: Pipeline · Métricas · Planes · Superadmin · Shell transversal.
 *
 * Markup mirrors the shipped JSX (file + lines cited per surface); classes are
 * copied verbatim so the harness renders them with the built CSS. Stress values
 * are deliberate: long company/plan names, big amounts (Gs 1.234.567.890 /
 * USD 12.345,67), long free text, chips and empty states.
 *
 * State variants: `metricas-crecimiento` renders `<details open>` (the daily
 * table is only measurable expanded); `planes-comparacion` includes an archived
 * plan and a plan with no items ("No disponible" / "Sin ítems guardados").
 *
 * Surfaces:
 *  - app/suite.tsx CatalogWorkspace kind='leads' (LeadCard/LeadColumn lines 39-40,
 *    workspace lines 41-73) + app/pipeline-summary.css + app/suite.css. The card
 *    actions live in one <footer class="inline-actions"> (SOS-COM, #12): "Ver
 *    oportunidad" + RemoveRecord share the footer, never loose siblings.
 *  - app/live-visitors.tsx lines 41-46 + app/live-visitors.css
 *  - app/growth-dashboard.tsx lines 16-22 + app/growth-dashboard.css
 *  - app/suite.tsx CatalogWorkspace kind='plans' (line 68) + app/plan-comparison.tsx
 *    lines 46-73 + app/plan-comparison.css
 *  - app/superadmin/page.tsx (StatusBadge 183-195, stats 579-633, agencies 635-812,
 *    two columns 939-1160, audit 1162-1215, shell 1222-1248)
 *  - app/platform-access-panel.tsx lines 37-69 + app/platform-access.css:
 *    NOT registered — `platform-access.css` is not part of the shipped CSS
 *    (0 of the 24 built chunks) because PlatformAccessPanel has no route, so the
 *    harness would measure unstyled markup. Kept as a named export ready to
 *    register once the component is wired (see `platformAccessFixture`).
 *  - app/desktop-sidebar.tsx (riel v2 con RAIL_ITEM; sin hoja propia)
 *  - app/scale-workspace.tsx topbar (clases v2; sin hoja propia)
 *  - app/mobile-navigation.tsx (drawer v2; sin hoja propia)
 *  - app/notification-inbox.tsx lines 66-83 + app/notification-center.tsx 12/18
 *    (+ app/notifications.css / app/toast.css)
 *  - app/workspace-footer.tsx lines 4-6 + app/workspace-footer.css
 */

import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {AyudaModulo, CampanaAvisos, PaletaComandos, ProductFooter} from 'owncoding-ui';
import {Building2, Menu, Sparkles, Sun} from 'lucide-react';

/* Versión real del pie: se lee de release/version.json al armar el fixture. */
const releaseVersion = JSON.parse(readFileSync(new URL('../../../release/version.json', import.meta.url), 'utf8')).version;
const markup = (type, props = {}, ...children) => renderToStaticMarkup(React.createElement(type, props, ...children));

/* ---------------------------------------------------------------- icons --- */
/* Inline stand-ins for the lucide icons used by the JSX, at the same sizes. */
const svg = (body, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const I = {
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  pencil: '<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  panelLeftOpen: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>',
  panelLeftClose: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="m16 9-3 3 3 3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 4v5h-5"/>',
  shieldAlert: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v4M12 16h.01"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
  arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  arrowUpRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  ticket: '<path d="M2 9a3 3 0 0 1 0 6v3h20v-3a3 3 0 0 1 0-6V6H2Z"/><path d="M13 6v2M13 12v2M13 18v2"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/>',
  messageCircle: '<path d="M21 12a9 9 0 1 1-3.2-6.9L21 3l-1 4.2A8.9 8.9 0 0 1 21 12Z"/>',
  trendingUp: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  check: '<path d="m5 12 5 5L20 6"/>',
  checkCheck: '<path d="m2 13 4 4 8-8"/><path d="m10 17 10-10"/>',
  externalLink: '<path d="M15 3h6v6M21 3l-9 9"/><path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/>',
  pauseCircle: '<circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/>',
  playCircle: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z"/>',
  moon: '<path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z"/>',
};

/* --------------------------------------------------------------- helpers -- */
const money = (value, currency) =>
  new Intl.NumberFormat('es-PY', {style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2}).format(Number(value));
const whole = (value) => new Intl.NumberFormat('es-PY', {maximumFractionDigits: 0}).format(Number(value));

const removeRecordButton = (kind, name) => {
  if (!['leads', 'plans'].includes(kind)) return '';
  return `<button class="icon-button record-remove" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: ${name}">${svg(I.trash, 16)}</button>`;
};

/* ===================================================== 2. VISITANTES WEB ==
 * app/live-visitors.tsx lines 41-46 (counts state). `peopleContainer` mirrors
 * app/person-container.tsx lines 14-27 (title on name and secondary) and is
 * reused by the shell sidebar/profile.
 * ========================================================================= */
const peopleContainer = ({name, secondary, initials}) => `
  <span class="person-container person-container-md">
   <span class="foto-perfil" aria-hidden="true">${initials}</span>
   <span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span>${secondary ? `<span class="person-container-secondary" title="${secondary}">${secondary}</span>` : ''}</span>
  </span>`;

const liveVisitorsPanel = `
<section class="panel live-visitors" aria-label="Visitantes en la web">
 <div class="live-visitors-heading"><h2>Visitantes en la web</h2><span>Activos ahora · estimación</span></div>
 <p class="live-visitors-note">Sesiones anónimas con una página visible en los últimos 90 segundos. No identifica personas. Se actualiza cada 30 segundos.</p>
 <div class="live-visitors-sites" aria-live="polite" aria-atomic="true">
  <article><span>www.estudiocomunicacionparaguay.com.py</span><strong>1.234</strong><small>sesiones activas estimadas</small></article>
  <article><span>portal.clientes.escaleparaguay.com</span><strong>98.765</strong><small>sesiones activas estimadas</small></article>
  <article><span>landing.campana-verano-2027.example.com</span><strong>7</strong><small>sesiones activas estimadas</small></article>
 </div>
 <p class="live-visitors-note">Una sesión puede abarcar varias pestañas del mismo sitio. Navegadores, dominios distintos y bloqueadores pueden cambiar la estimación.</p>
</section>`;

/* ======================================================= 3. MÉTRICAS ======
 * app/growth-dashboard.tsx (rediseño v2): Stat de la librería, barras con
 * utilidades Tailwind y datos diarios con la tabla compartida.
 * ========================================================================= */
const growthPointCounts = [
  1024, 987, 0, 1540, 2331, 1204, 876, 990, 1105, 1502, 998, 744, 1310, 1622, 1805, 1201, 933, 1010, 1475, 1320, 1188, 902, 1210, 1660, 1902, 1433, 1108, 995, 1215, 1889,
];
const growthPointDays = growthPointCounts.map((_, index) => {
  const date = new Date(Date.UTC(2026, 7, 21 + index, 12));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
});
const growthMax = Math.max(1, ...growthPointCounts);
const growthBars = growthPointCounts
  .map((count, index) => `<div class="min-w-0 flex-1 rounded-t bg-fono" style="height:${Math.max(1, (count / growthMax) * 100)}%" title="${growthPointDays[index]}: ${count} vistas"></div>`)
  .join('');

const growthCard = (label, value, change, sub) => `
 <div class="relative overflow-hidden rounded-xl border border-ink-600 bg-ink-800 p-4">
  <div class="text-[11px] font-medium uppercase tracking-wider text-mute">${label}</div>
  <div class="mt-1.5 text-2xl font-semibold tracking-tight text-fore md:text-3xl">${value}</div>
  <div class="mt-1.5 flex items-center gap-2 text-xs"><span class="font-medium ${change ? 'text-ok' : 'text-ok'}">${change}</span><span class="text-mute">${sub}</span></div>
 </div>`;

const growthDashboard = `
<section class="grid gap-4 rounded-xl border border-fono/30 bg-ink-800 p-5">
 <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
  <div class="min-w-0"><p class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Captación digital</p><h2 class="mt-1 text-[17px] font-bold tracking-tight text-fore">Visitas y crecimiento</h2></div>
  <label class="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Período
   <select aria-label="Período" class="h-11 w-44 cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm">
    <option>Últimos 7 días</option><option selected>Últimos 30 días</option><option>Últimos 90 días</option>
   </select>
  </label>
 </header>
 <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
  ${growthCard('Páginas vistas', '37.479', '128.4%', 'vs. período anterior')}
  ${growthCard('Vistas desde móvil', '18.240', '—', 'Sin base anterior')}
  ${growthCard('Clics en WhatsApp', '1.284', '12.5%', 'vs. período anterior')}
 </div>
 <section aria-labelledby="growth-evolution">
  <h3 id="growth-evolution" class="text-sm font-bold text-fore">Evolución diaria · páginas vistas</h3>
  <div class="mt-2 flex h-40 items-end gap-[3px] rounded-t-lg border border-b-ink-500 border-ink-600 bg-ink-900 px-2 pt-2" role="img" aria-label="Páginas vistas durante 30 días. 37.479 en total.">${growthBars}</div>
  <div class="mt-1 flex justify-between gap-2 text-[11px] tabular-nums text-mute"><span>${growthPointDays[0]}</span><span>${growthPointDays[growthPointDays.length - 1]}</span></div>
 </section>
 <p class="rounded-lg border border-info/25 bg-info/10 p-2 text-xs text-mute">Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</p>
 <details class="text-sm text-fore" open><summary class="cursor-pointer font-semibold">Ver datos diarios</summary>
  <div class="mt-2"><table class="w-full text-sm"><thead class="sticky top-0 z-10 bg-ink-800"><tr class="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mute"><th class="px-2.5 py-1.5 font-medium">Fecha</th><th class="px-2.5 py-1.5 text-right font-medium">Páginas vistas</th></tr></thead><tbody>${growthPointCounts.map((count, index) => `<tr class="border-b border-ink-600/60 last:border-0"><td class="px-2.5 py-1.5 text-fore">${growthPointDays[index]}</td><td class="px-2.5 py-1.5 text-right text-fore tabular-nums">${count}</td></tr>`).join('')}</tbody></table></div>
 </details>
</section>`;

/* ======================================================== 4. PLANES =======
 * app/plan-comparison.tsx PlanComparison lines 46-73 + Deliverables 40-44.
 * Amounts keep their own currency; an invalid/missing value renders `No
 * disponible`, and a semicolon list is one priced package (same model as the
 * component: descriptions are split on ';', never invented per-line prices).
 * ========================================================================= */
const currencyCodes = ['PYG', 'USD', 'EUR', 'BRL', 'ARS', 'MXN'];
const validCurrency = (currency) => currencyCodes.includes(currency);
const numberLabel = (value) => new Intl.NumberFormat('es-PY', {maximumFractionDigits: 20}).format(Number(value));
const planAmount = (value, currency) => value !== null && Number.isFinite(value) && validCurrency(currency) ? money(value, currency) : 'No disponible';
const planTotal = (items) => items.length && items.every((item) => item.subtotal !== null) ? items.reduce((sum, item) => sum + item.subtotal, 0) : null;

const planActions = (name) => `<div class="mt-2 flex flex-wrap gap-1.5"><button type="button" class="text-button">${svg(I.pencil, 14)}Editar</button>${removeRecordButton('plans', name)}</div>`;

const planHeader = (plan) => `
  <th scope="col" class="sticky top-0 z-[1] border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top last:border-r-0">
   <h3 class="whitespace-normal text-sm font-bold leading-snug text-fore">${plan.name}</h3>
   <span class="mt-1 block text-[11px] font-medium leading-4 text-mute">${validCurrency(plan.currency) ? plan.currency : 'Moneda no disponible'} · ${plan.items.length} ${plan.items.length === 1 ? 'ítem' : 'ítems'}</span>
   ${plan.archived ? '<span class="mt-1 block text-[11px] font-medium leading-4 text-mute">Archivado</span>' : ''}
   ${planActions(plan.name)}
  </th>`;

/* app/plan-comparison.tsx Deliverables: split(';'), one package. */
const planDeliverables = (description) => {
  const parts = description.split(';');
  return parts.length > 1
    ? `<ul class="list-disc pl-4">${parts.map((part, index) => `<li>${part.trim()}${index < parts.length - 1 ? ';' : ''}</li>`).join('')}</ul>`
    : `<p class="whitespace-pre-wrap">${description}</p>`;
};

const planItems = (plan) => plan.items
  .map((item) => `
   <li data-plan-item class="grid gap-2 border-b border-ink-600/60 pb-2 text-xs leading-relaxed last:border-0 last:pb-0">
    ${planDeliverables(item.description)}
    <div data-plan-item-price class="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-900 p-2 text-[11px] text-mute"><span class="whitespace-nowrap">Cantidad del ítem: ${item.quantity === null ? 'No disponible' : numberLabel(item.quantity)}</span><span class="whitespace-nowrap">Precio unitario: ${planAmount(item.price, plan.currency)}</span><strong class="whitespace-nowrap text-xs text-fore">Subtotal: ${planAmount(item.subtotal, plan.currency)}</strong></div>
   </li>`)
  .join('')
  .trim();

const comparisonPlans = [
  {
    name: 'Producción audiovisual integral para campaña de lanzamiento regional · 12 meses',
    currency: 'PYG',
    archived: false,
    notes: 'Contrato anual con renovación automática.\nFacturación el día 5 de cada mes. Incluye dos rondas de ajustes por pieza.\nLos traslados fuera de Asunción se presupuestan aparte.',
    items: [
      {
        description: 'Dirección creativa y guion técnico; Rodaje en locación: 3 jornadas completas; Edición, color y mezcla final; Entrega de master y cortes para redes',
        quantity: 12,
        price: 102880657.5,
        subtotal: 1234567890,
      },
    ],
  },
  {
    name: 'Retainer mensual de contenidos y social media',
    currency: 'USD',
    archived: false,
    notes: 'Se factura por adelantado, sin IVA. El plan conserva su moneda: no se convierte a guaraníes.',
    items: [
      {description: 'Planificación mensual de contenidos; Reporte de métricas; Community management', quantity: 1, price: 10000, subtotal: 10000},
      {description: 'Producción de piezas gráficas adicionales', quantity: 3, price: 781.89, subtotal: 2345.67},
    ],
  },
  {
    name: 'Plan archivado sin ítems guardados',
    currency: 'PYG',
    archived: true,
    notes: 'Sin notas guardadas.',
    items: [],
  },
];

const planCell = 'border-b border-r border-ink-600 px-3 py-3 text-left align-top text-[13px] leading-relaxed last:border-r-0';
const planRowHead = `${planCell} sticky left-0 z-[2] w-44 bg-ink-900 font-bold text-fore`;

const planComparison = `
<div class="min-w-0 max-w-full text-fore">
 <p class="max-w-[76ch] text-xs leading-5 text-mute">Todos los entregables y precios guardados, sin IVA. El IVA se define en el presupuesto. Cada plan conserva su moneda. Desplazá la tabla horizontalmente para comparar.</p>
 <div class="mt-3 max-w-full overflow-x-auto rounded-xl border border-ink-600 bg-ink-800" role="region" aria-label="Comparación de planes" tabindex="0">
  <table class="w-full table-fixed border-separate border-spacing-0 tabular-nums" style="min-width:${11 + comparisonPlans.length * 17}rem">
   <caption class="border-b border-ink-600 bg-ink-900 px-3 py-3 text-left text-xs font-semibold text-mute">Planes, precios y entregables incluidos</caption>
   <thead><tr><th scope="col" class="sticky left-0 z-[3] w-44 border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top">Comparar</th>${comparisonPlans.map(planHeader).join('')}</tr></thead>
   <tbody>
    <tr data-plan-total><th scope="row" class="${planRowHead} border-t-2 border-t-fono/60">Total de ítems <small class="mt-1 block text-[11px] font-medium text-mute">Sin IVA</small></th>${comparisonPlans.map((plan) => `<td class="${planCell} border-t-2 border-t-fono/60 bg-fono/10"><strong class="text-base font-bold tracking-tight text-fore">${planAmount(planTotal(plan.items), plan.currency)}</strong>${plan.items.length ? '' : '<small class="mt-1 block text-[11px] font-medium text-mute">Sin ítems guardados</small>'}</td>`).join('')}</tr>
    <tr><th scope="row" class="${planRowHead}">Entregables incluidos</th>${comparisonPlans.map((plan) => `<td class="${planCell}">${plan.items.length ? `<ol class="grid gap-2">${planItems(plan)}</ol>` : '<span class="text-[11px] font-medium text-mute">Sin entregables guardados.</span>'}</td>`).join('')}</tr>
    <tr><th scope="row" class="${planRowHead}">Condiciones y fuente</th>${comparisonPlans.map((plan) => `<td class="${planCell} whitespace-pre-wrap text-xs leading-relaxed text-mute">${plan.notes}</td>`).join('')}</tr>
   </tbody>
  </table>
 </div>
</div>`;

/* ============================================ 5. PLANES SIN CUADRÍCULA ====
 * `CatalogWorkspace kind='plans'` renders <PlanComparison> only (app/suite.tsx
 * line 68). The `.ops-grid` branch of the same component belongs to
 * kind='inventory', which no route calls today (Inventario uses
 * app/inventory-workspace.tsx), so its `.ops-card.catalog-card` markup is
 * unreachable. The former `planes-cuadricula` fixture measured that dead markup
 * and was removed from the registry.
 * ========================================================================= */

/* ==================================================== 6. SUPERADMIN =======
 * app/superadmin/*.tsx (rediseño #80): KPIs v2, paneles del sistema y listas
 * densas (`ListGrid`/`ListRow`/`ListActions`) con tarjetas cuando la plantilla
 * no entra. Mismos datos de ejemplo que la ronda anterior.
 * ========================================================================= */
const CHIP = {
  ok: 'bg-ok/15 text-ok-text border-ok/25',
  warn: 'bg-warn/15 text-warn-text border-warn/25',
  info: 'bg-fono/15 text-fono-text border-fono/25',
  mute: 'bg-ink-600 text-mute border-ink-500',
};
const chip = (label, tone = 'mute') => `<span class="v2-chip inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${CHIP[tone]}">${label}</span>`;

const platformHeader = `
<div class="platform-admin-top">
 <a class="platform-admin-brand" href="#" aria-label="Scale OS"><span class="workspace-brand" role="img" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></a>
 <header class="ui-page-header mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-0 min-w-0 flex-[1_1_20rem] !mb-0">
  <div class="ui-page-header-main min-w-0 flex-1 xl:flex xl:min-w-0 xl:items-baseline xl:gap-3">
   <p class="mb-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-mute xl:mb-0 xl:shrink-0">Administración global</p>
   <h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl xl:shrink-0">Control de Scale OS</h1>
   <p class="ui-page-header-subtitle mt-1.5 text-[13px] leading-[1.5] text-mute xl:mt-0 xl:min-w-0 xl:line-clamp-1"><span class="platform-admin-meta">Operación, acceso y catálogo comercial</span></p>
  </div>
  <div class="header-actions flex min-w-0 flex-wrap items-center gap-2 max-md:w-full max-md:justify-start xl:flex-nowrap"><div class="platform-admin-actions"><button type="button" class="secondary">${svg(I.refresh, 16)}Actualizar</button><a class="secondary" href="/">${svg(I.arrowLeft, 16)}Panel</a></div></div>
 </header>
</div>`;

const platformNotice = `
<section class="platform-admin-notice grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 sm:grid-cols-[auto_minmax(0,1fr)]">${svg(I.shieldAlert, 18)}<span><strong>Acceso separado por plataforma.</strong> Ser dueño de una agencia no habilita este panel ni sus datos.</span></section>`;

/* Kpi/KpiStrip de app/ui-v2.tsx (Stat de owncoding-ui). */
const kpi = (label, value, hint, destacado = false) => `
<div class="relative overflow-hidden rounded-xl border p-4 ${destacado ? 'border-fono/30 bg-gradient-to-br from-fono-dark via-fono to-fono' : 'border-ink-600 bg-ink-800'}">
 <div class="text-[11px] font-medium uppercase tracking-wider ${destacado ? 'text-onbrand/75' : 'text-mute'}">${label}</div>
 <div class="mt-1.5 text-2xl font-semibold md:text-3xl ${destacado ? 'text-onbrand' : 'text-fore'}">${value}</div>
 <div class="mt-1.5 flex items-center gap-2 text-xs"><span class="${destacado ? 'text-onbrand/75' : 'text-mute'}">${hint}</span></div>
</div>`;

const platformStats = `
<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Resumen de plataforma">
 ${kpi('Agencias activas', whole(1284), `de ${whole(1301)} agencias`, true)}
 ${kpi('Usuarios registrados', whole(9840), 'Cuentas de todas las agencias')}
 ${kpi('Cupones activos', whole(42), `de ${whole(148)} códigos`)}
 ${kpi('Suscripciones', whole(118), `${whole(118)} active · ${whole(24)} trial · ${whole(6)} past_due · ${whole(2)} suspended`)}
</div>`;

/* Lista densa v2: ListGrid/ListRow/ListActions de app/ui-v2.tsx. */
const listGrid = ({label, template, minWidth = 'min-w-[48rem]', columns, rows, className = '', pinned = false}) => `
<div role="table" aria-label="${label}" class="silent-scroll relative min-w-0 overflow-x-auto ${className}">
 <div class="${minWidth}">
  <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}">
   ${columns.map((column, index) => `<span role="columnheader" class="${index === columns.length - 1 ? `text-right${pinned ? ' list-actions-head' : ''}` : 'text-left'} whitespace-nowrap">${column}</span>`).join('')}
  </div>
  <div role="rowgroup">${rows}</div>
 </div>
</div>`;
const listRow = (template, cells) => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:min-h-11 md:py-2 ${template}">${cells}</div>`;
const listActions = (content) => `<div role="cell" class="list-actions">${content}</div>`;

const AGENCY_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]';
const agencies = [
  {
    name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    slug: 'estudio-comunicacion-produccion-paraguay',
    active: true,
    users: 148,
    plan: money(2500000, 'PYG'),
    state: 'Acceso manual activo',
    tone: 'info',
    expiry: '31-oct',
  },
  {
    name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    slug: 'coopservicios',
    active: false,
    users: 9,
    plan: money(199, 'USD'),
    state: 'Acceso manual suspendido',
    tone: 'warn',
    expiry: '30-sept',
  },
  {
    name: 'Agencia Digital Global LLC · Sucursal Paraguay',
    slug: 'agencia-digital-global-llc',
    active: true,
    users: 1234,
    plan: money(1234567890, 'PYG'),
    state: 'Sin cambio manual',
    tone: 'mute',
    expiry: '15-oct',
  },
];

const agencyLedger = listGrid({
  label: 'Agencias y suscripciones',
  template: AGENCY_TEMPLATE,
  minWidth: 'min-w-[73.5rem]',
  columns: ['Agencia', 'Estado', 'Plan', 'Usuarios', 'Prueba / vencimiento', 'Acciones'],
  className: 'platform-admin-table-wrap',
  pinned: true,
  rows: agencies.map((agency) => listRow(AGENCY_TEMPLATE, `
   <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${agency.name}">${agency.name}</b><small class="list-secondary" title="${agency.slug}">${agency.slug}</small></div>
   <div role="cell" class="flex min-w-0 flex-wrap items-center gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(agency.state, agency.tone)}</div>
   <span role="cell" class="text-right"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-fore">${agency.plan}</span></span>
   <span role="cell" class="text-right text-[12.5px] font-semibold tabular-nums text-fore">${whole(agency.users)}</span>
   <span role="cell" class="list-date min-w-0">${agency.expiry}</span>
   ${listActions(`<button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar agencia</button>`)}
  `)).join(''),
});

const agencyCards = `
<div class="platform-admin-agency-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
 ${agencies.map((agency) => `
 <article class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
  <div class="min-w-0"><b class="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title="${agency.name}">${agency.name}</b><small class="mt-0.5 block text-[11px] text-mute">${agency.slug}</small></div>
  <div class="flex flex-wrap gap-1.5">${chip(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'ok' : 'mute')}${chip(agency.state, agency.tone)}</div>
  <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
   <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Plan</dt><dd class="mt-0.5 font-semibold text-fore">${agency.plan}</dd></div>
   <div><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usuarios</dt><dd class="mt-0.5 font-semibold tabular-nums text-fore">${whole(agency.users)}</dd></div>
   <div class="col-span-2"><dt class="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Prueba / vencimiento</dt><dd class="list-date mt-0.5">${agency.expiry}</dd></div>
  </dl>
  <div class="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3"><button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar agencia</button></div>
 </article>`).join('')}
</div>`;

const superadminAgencies = `
${platformHeader}
${platformNotice}
${platformStats}
<section class="panel" aria-labelledby="platform-agencies-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Agencias</p><h2 id="platform-agencies-title" class="text-[17px] font-semibold tracking-tight text-fore">Agencias y suscripciones</h2></div><small class="text-[12px] leading-[1.35] text-mute">Gestioná el acceso manual junto a cada registro</small></div>
 <div class="min-w-0">${agencyLedger}</div>
</section>`;

const superadminAgencyCards = `
${platformHeader}
${platformNotice}
${platformStats}
<section class="panel" aria-labelledby="platform-agencies-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Agencias</p><h2 id="platform-agencies-title" class="text-[17px] font-semibold tracking-tight text-fore">Agencias y suscripciones</h2></div><small class="text-[12px] leading-[1.35] text-mute">Gestioná el acceso manual junto a cada registro</small></div>
 ${agencyCards}
</section>`;

const platformUsers = [
  /* Fila propia, con escritura: chip + "Eliminar mi cuenta" (regla #22). */
  {email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', agencies: 12, self: true, badge: chip('Admin global', 'ok'), actions: `<button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar mi cuenta</button>`},
  /* Acceso de agencia: "Hacer admin global" + "Solo lectura" + eliminar. */
  {email: 'compras@coopservicios.com.py', agencies: 3, self: false, badge: chip('Acceso de agencia', 'mute'), actions: `<button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">${svg(I.eye, 14)}Solo lectura</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar usuario</button>`},
  /* Viewer: "Quitar acceso" reemplaza a "Solo lectura". */
  {email: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', agencies: 1, self: false, badge: chip('Solo lectura', 'info'), actions: `<button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">Quitar acceso</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar usuario</button>`},
];

const USER_TEMPLATE = 'grid-cols-[minmax(11rem,1fr)_7rem_25rem]';
const superadminUsers = `
<section class="panel h-full platform-admin-users" aria-labelledby="platform-access-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Usuarios</p><h2 id="platform-access-title" class="text-[17px] font-semibold tracking-tight text-fore">Accesos entre agencias</h2></div><small class="text-[12px] leading-[1.35] text-mute">${whole(platformUsers.length)} registrados</small></div>
 <div class="min-w-0">${listGrid({
   label: 'Accesos entre agencias',
   template: USER_TEMPLATE,
   minWidth: 'min-w-[45rem]',
   columns: ['Usuario', 'Acceso', 'Acciones'],
   pinned: true,
   rows: platformUsers.map((person) => listRow(USER_TEMPLATE, `
    <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${person.email}">${person.email}</b><small class="list-secondary">${whole(person.agencies)} agencias activas${person.self ? ' · Vos' : ''}</small></div>
    <span role="cell">${person.badge}</span>
    ${listActions(person.actions)}
   `)).join(''),
 })}</div>
</section>`;

const coupons = [
  {code: 'SCALE-LANZAMIENTO-2026-PARAGUAY', detail: '10% · Sin límite de usos', active: true},
  {code: 'TRIAL-EXTENDIDO-90-DIAS', detail: '90 días gratis · 250 usos máximos', active: true},
  {code: 'BLACK-FRIDAY-2025-AGOTADO-Y-PAUSADO', detail: money(150, 'USD') + ' · 2.000 usos máximos', active: false},
];

const COUPON_TEMPLATE = 'grid-cols-[minmax(10rem,1fr)_6.5rem_8rem]';
const superadminCoupons = `
<section class="panel h-full platform-admin-commercial" aria-labelledby="platform-catalog-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Cupones</p><h2 id="platform-catalog-title" class="text-[17px] font-semibold tracking-tight text-fore">Catálogo comercial</h2></div><small class="text-[12px] leading-[1.35] text-mute">${whole(coupons.length)} códigos</small></div>
 <form class="platform-admin-coupon mb-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1.2fr)_minmax(8rem,.9fr)_minmax(7rem,.8fr)_auto]">
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Código<input value="SCALE10" placeholder="SCALE10" required minlength="3" maxlength="40"></label>
  <div class="ops-select"><span class="ops-label" id="coupon-type-label">Tipo</span><button type="button" class="ops-select-trigger" title="Monto fijo" aria-labelledby="coupon-type-label coupon-type-value" aria-haspopup="listbox" aria-expanded="false"><span id="coupon-type-value">Monto fijo</span>${svg(I.chevronDown, 16)}</button></div>
  <label class="grid gap-1.5 text-[11px] font-semibold text-mute">Valor<input value="150" inputmode="decimal" maxlength="10" required></label>
  <div class="ops-select"><span class="ops-label" id="coupon-currency-label">Moneda</span><button type="button" class="ops-select-trigger" title="USD" aria-labelledby="coupon-currency-label coupon-currency-value" aria-haspopup="listbox" aria-expanded="false"><span id="coupon-currency-value">USD</span>${svg(I.chevronDown, 16)}</button></div>
  <button class="primary" disabled>Crear cupón</button>
 </form>
 <p class="form-note">Crear un cupón no inicia cobros ni activa un proveedor de pagos.</p>
 <div class="mt-3 min-w-0">${listGrid({
   label: 'Cupones',
   template: COUPON_TEMPLATE,
   minWidth: 'min-w-[25rem]',
   columns: ['Cupón', 'Estado', 'Acciones'],
   pinned: true,
   rows: coupons.map((coupon) => listRow(COUPON_TEMPLATE, `
    <div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${coupon.code}">${coupon.code}</b><small class="list-secondary" title="${coupon.detail}">${coupon.detail}</small></div>
    <span role="cell">${chip(coupon.active ? 'Activo' : 'Pausado', coupon.active ? 'ok' : 'mute')}</span>
    ${listActions(`<button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? svg(I.pauseCircle, 14) + 'Pausar' : svg(I.playCircle, 14) + 'Reactivar'}</button>`)}
   `)).join(''),
 })}</div>
</section>`;

const auditEntries = [
  {date: '18 sept 26 · 14:32', actor: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', action: 'plataforma.acceso_actualizado', target: 'usuario #14823', metadata: '{"from":"viewer","to":"admin","agencies":12,"reason":"pedido del cliente"}', open: false},
  {date: '17 sept 26 · 09:05', actor: 'Sistema', action: 'plataforma.suscripcion_vencida', target: 'agencia #982', metadata: '{"expires_at":"2026-09-17T23:59:59-03:00","plan":"enterprise-anual-regional","amount":1234567890,"currency":"PYG"}', open: true},
  {date: '17 sept 26 · 08:47', actor: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', action: 'plataforma.cupon_creado', target: 'cupon #4521', metadata: '{"code":"SCALE-LANZAMIENTO-2026-PARAGUAY","type":"percent","value":10,"max_redemptions":null}', open: true},
];

const AUDIT_TEMPLATE = 'grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]';
const superadminAudit = `
<section class="panel platform-admin-audit" aria-labelledby="platform-audit-title">
 <div class="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><div class="min-w-0"><p class="eyebrow">Auditoría</p><h2 id="platform-audit-title" class="text-[17px] font-semibold tracking-tight text-fore">Actividad de administración global</h2></div><span class="whitespace-nowrap text-xs tabular-nums text-mute">${whole(auditEntries.length)} acciones recientes</span></div>
 ${listGrid({
   label: 'Actividad de administración global',
   template: AUDIT_TEMPLATE,
   minWidth: 'min-w-[49.5rem]',
   columns: ['Fecha', 'Actor', 'Acción', 'Destino'],
   rows: auditEntries.map((entry) => listRow(AUDIT_TEMPLATE, `
    <span role="cell" class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${entry.date}</span>
    <span role="cell" class="min-w-0 truncate text-[12.5px] text-fore" title="${entry.actor}">${entry.actor}</span>
    <span role="cell" class="min-w-0">${chip(entry.action, 'info')}</span>
    <div role="cell" class="min-w-0"><span class="block break-words text-[12.5px] text-fore">${entry.target}</span>${entry.open ? `<small class="mt-1 block truncate text-[11px] text-mute" title="${entry.metadata.replace(/"/g, '&quot;')}">${entry.metadata}</small>` : ''}</div>
   `)).join(''),
 })}
</section>`;

/* ============================================== 7. ADMINISTRACIÓN GLOBAL =
 * app/platform-access-panel.tsx lines 37-69 + app/platform-access.css.
 * Held out of the registry: this stylesheet is absent from the built CSS
 * (`platform-access-*` appears in 0 of the 24 shipped chunks), so any geometry
 * here would be base-HTML noise. See `platformAccessFixture` at the bottom.
 * ========================================================================= */
const platformAccessUsers = [
  {email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', agencies: 12, role: 'Admin global', self: ' · Vos', access: 'self'},
  {email: 'compras@coopservicios.com.py', agencies: 3, role: 'Acceso de agencia', self: '', access: 'none'},
  {email: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', agencies: 1, role: 'Solo lectura', self: '', access: 'viewer'},
];

/* Mirrors platform-access-panel.tsx lines 50-57: admin/viewer rows swap the
 * action for their badge, "Quitar acceso" only exists when a global role is set. */
const platformAccessRow = (person) => `
  <li class="platform-access-row">
   <div class="platform-access-person"><b title="${person.email}">${person.email}</b><small>${whole(person.agencies)} agencias activas · ${person.role}${person.self}</small></div>
   <div class="platform-access-actions">
    ${person.access === 'self'
      ? `<button type="button" class="text-button danger">${svg(I.trash, 14)}Eliminar mi cuenta</button>`
      : person.access === 'admin'
        ? `<span class="platform-access-badge admin">${svg(I.shieldCheck, 13)}Admin global</span><button type="button" class="text-button">${svg(I.eye, 14)}Solo lectura</button><button type="button" class="text-button">Quitar acceso</button><button type="button" class="text-button danger">${svg(I.trash, 14)}Eliminar usuario</button>`
        : person.access === 'viewer'
          ? `<span class="platform-access-badge viewer">${svg(I.eye, 13)}Solo lectura</span><button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">Quitar acceso</button><button type="button" class="text-button danger">${svg(I.trash, 14)}Eliminar usuario</button>`
          : `<button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">${svg(I.eye, 14)}Solo lectura</button><button type="button" class="text-button danger">${svg(I.trash, 14)}Eliminar usuario</button>`}
   </div>
  </li>`;

const platformAccessAgencies = [
  {name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', slug: 'estudio-comunicacion-produccion-paraguay', users: 148, active: true, state: 'Activa'},
  {name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', slug: 'coopservicios', users: 9, active: false, state: 'Inactiva'},
  {name: 'Agencia Digital Global LLC', slug: 'agencia-digital-global-llc', users: 1234, active: true, state: 'Activa'},
];

const platformAccessPanel = `
<section class="panel platform-access" aria-busy="false">
 <div class="panel-heading"><div><p class="eyebrow">SCALE OS</p><h2>Administración global</h2></div><a class="text-button" href="https://admin.scaleparaguay.com/" target="_blank" rel="noreferrer">Panel completo${svg(I.arrowUpRight, 14)}</a></div>
 <p class="form-note">Gestioná quién administra Scale OS, quién solo puede ver y qué cuentas y agencias se eliminan. Cada cambio queda auditado.</p>
 <div class="kpi-strip">
  <article class="kpi-card"><span>${svg(I.users, 14)}Usuarios</span><strong>${whole(98765)}</strong></article>
  <article class="kpi-card"><span>${svg(I.shieldCheck, 14)}Admins globales</span><strong>${whole(42)}</strong></article>
  <article class="kpi-card"><span>${svg(I.eye, 14)}Solo lectura</span><strong>${whole(7)}</strong></article>
  <article class="kpi-card"><span>${svg(I.building, 14)}Agencias</span><strong>${whole(1301)}</strong></article>
 </div>
 <h3>Usuarios</h3>
 <ul class="platform-access-list"><li class="platform-access-head" aria-hidden="true"><span>Usuario</span><span>Acciones</span></li>${platformAccessUsers.map(platformAccessRow).join('')}</ul>
 <h3>Agencias</h3>
 <ul class="platform-access-list"><li class="platform-access-head" aria-hidden="true"><span>Agencia</span><span>Acciones</span></li>${platformAccessAgencies.map((agency) => `
  <li class="platform-access-row">
   <div class="platform-access-person"><b title="${agency.name}">${agency.name}</b><small>${agency.slug} · ${whole(agency.users)} usuarios${agency.active ? ' · Activa' : ' · Inactiva'}</small></div>
   <div class="platform-access-actions"><button type="button" class="text-button danger">${svg(I.trash, 14)}Eliminar agencia</button></div>
  </li>`).join('')}</ul>
</section>`;

/* ===================================================== 8. SHELL / SIDEBAR =
 * app/scale-workspace.tsx (sidebarContent + shell) y app/desktop-sidebar.tsx:
 * un solo corte móvil/escritorio (`md`, 768 px), content por flex (sin calc ni
 * max-width) y pie con un solo divisor (borde del `.sidebar-bottom`).
 * ========================================================================= */
const NAV_GROUPS = [['Resumen',['Resumen']],['Flujo',['Producción','Pipeline','Clientes','Presupuestos','Proyectos']],['Recursos',['Inventario','Estudio','Equipo']],['Finanzas',['Finanzas','Informes']],['Configuración',['Configuración']]];
const RAIL_ITEM = 'flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none no-underline transition hover:no-underline focus-visible:no-underline';
const navItemClass = (active, tone = 'rail') => `${active ? 'active ' : ''}${RAIL_ITEM} ${tone === 'rail'
  ? `relative ${active ? 'bg-white/[0.14] text-white before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-gold' : 'text-white/75 hover:bg-white/[0.08] hover:text-white'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
  : `${active ? 'bg-fono/10 text-fono-light' : 'text-mute hover:bg-ink-700 hover:text-fore'} focus-visible:ring-2 focus-visible:ring-fono/40`}`;
const navIconClass = (active, tone = 'rail') => `nav-icon grid size-7 shrink-0 place-items-center rounded-lg transition ${tone === 'rail' ? (active ? 'bg-white/20 text-white' : 'bg-white/10 text-white/80') : (active ? 'bg-fono/15 text-fono-light' : 'bg-ink-700 text-mute')}`;
const navLink = (label, active, tone = 'rail') => `<a href="#" class="${navItemClass(active, tone)}"${active ? ' aria-current="page"' : ''} title="${label}" aria-label="${label}"><span class="${navIconClass(active, tone)}">${svg(I.target, 16)}</span><span class="nav-label min-w-0 break-words">${label}</span></a>`;
const navGroupButton = (group, active, tone, title) => `<button type="button" class="nav-group-toggle ${navItemClass(active, tone)}" aria-expanded="${active}" title="${title}"><span class="${navIconClass(active, tone)}">${svg(I.target, 16)}</span><span class="nav-label min-w-0 break-words">${group}</span><svg class="nav-chevron ml-auto shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>`;
// Nav v3 (issue #68): 5 grupos; el grupo activo queda expandido con sus hojas.
const navItemsHtml = ({active = 'Resumen', tone = 'rail', collapsed = false} = {}) => NAV_GROUPS.map(([group, modules]) => {
  const containsActive = modules.includes(active);
  if (modules.length === 1 || collapsed) return navLink(group, containsActive, tone);
  const title = containsActive && active !== group ? `${group} · ${active}` : group;
  const leaves = modules.map((module) => navLink(module, module === active, tone)).join('');
  return `<div class="nav-group grid gap-1">${navGroupButton(group, containsActive, tone, title)}${containsActive ? `<div class="nav-leaves grid gap-1 pl-3">${leaves}</div>` : ''}</div>`;
}).join('');
const logoutButton = (tone = 'rail') => `<button type="button" class="nav-logout ${navItemClass(false, tone)}" aria-label="Cerrar sesión" title="Cerrar sesión"><span class="${navIconClass(false, tone)}">${svg(I.logout, 16)}</span><span class="nav-label">Cerrar sesión</span></button>`;

const RAIL_COLLAPSED='is-collapsed [&_.sidebar-brand]:flex-col [&_.sidebar-brand]:gap-2 p-2 md:!w-[60px] [&_.workspace-wordmark]:hidden [&_.nav-caption]:hidden [&_.nav-label]:hidden [&_.nav-chevron]:hidden [&_.nav-leaves]:hidden [&_.person-container-details]:hidden [&_.mobile-sidebar-brand]:justify-center [&_.sidebar-brand]:justify-center [&_.sidebar-brand]:!px-0 [&_nav>a]:h-11 [&_nav>a]:w-11 [&_nav>a]:justify-center [&_nav>a]:!px-0 [&_nav>button]:h-11 [&_nav>button]:w-11 [&_nav>button]:justify-center [&_nav>button]:!px-0 [&_.nav-admin]:h-11 [&_.nav-admin]:w-11 [&_.nav-admin]:justify-center [&_.nav-admin]:!px-0 [&_.profile-footer]:justify-items-center [&_.user]:!m-0 [&_.user]:!border-0 [&_.user]:!p-0 [&_.user]:justify-center [&_.user_.person-container]:justify-center';
const sidebarBrand = `<span class="workspace-brand" role="img" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span>`;
const sidebar = ({collapsed = false, active = 'Resumen'} = {}) => `
<aside class="desktop-sidebar hidden shrink-0 flex-col overflow-hidden border-r border-white/10 text-white/80 [&_.sidebar-brand]:flex [&_.sidebar-brand]:items-center [&_.sidebar-brand]:gap-1 [&_.sidebar-brand]:!px-1 [&_.sidebar-brand]:!pb-2 md:sticky md:top-0 md:flex md:h-dvh md:transition-[width] md:duration-200 md:ease-out motion-reduce:!transition-none ${collapsed ? RAIL_COLLAPSED : 'p-3 md:!w-48'}">
 <div class="sidebar-brand">${sidebarBrand}<button type="button" class="sidebar-collapse grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white [.desktop-sidebar:not(.is-collapsed)_&amp;]:ml-auto" aria-label="${collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}" title="${collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}" aria-expanded="${collapsed ? 'false' : 'true'}">${collapsed ? svg(I.panelLeftOpen, 18) : svg(I.panelLeftClose, 18)}</button></div>
 <div class="mobile-sidebar-brand">${sidebarBrand}</div>
 <p class="nav-caption mb-1 mt-2 px-3 font-mono text-[10px] uppercase tracking-[.14em] text-mute">Espacio de trabajo</p>
 <nav aria-label="Menú principal" class="grid content-start gap-1 [&_a]:no-underline min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">${navItemsHtml({active, tone: 'rail', collapsed})}${logoutButton('rail')}</nav>
 <div class="sidebar-bottom mt-auto grid grid-cols-[minmax(0,1fr)] gap-1.5 border-t border-white/[0.12] pt-3"><a class="nav-admin ${navItemClass(false, 'rail')}" href="https://admin.scaleparaguay.com" target="_blank" rel="noopener noreferrer" title="Administración de Scale" aria-label="Administración de Scale"><span class="${navIconClass(false, 'rail')}">${svg(I.shieldCheck, 16)}</span><span class="nav-label">Administración de Scale</span></a><div class="profile-footer min-w-0"><button class="user w-full min-w-0 justify-start rounded-xl px-2 py-1.5 text-left transition hover:bg-white/10" aria-label="Abrir mi perfil">${peopleContainer({name: 'Lucía Acosta', secondary: 'Propietaria', initials: 'LA'})}</button></div></div>
</aside>`;

const workspaceShell = ({collapsed = false, active = 'Resumen', topbar: topbarHtml = '', content}) => `
<main class="shell control-shell">
 ${sidebar({collapsed, active})}
 <section class="content flex min-h-dvh min-w-0 flex-1 flex-col">${topbarHtml}<div class="workspace-content flex min-w-0 flex-1 flex-col">${content}</div></section>
</main>`;

/* ==================================================== 9. TOPBAR / MOBILE ==
 * app/scale-workspace.tsx (workspace-topbar, ~líneas 1044-1076) y
 * app/mobile-navigation.tsx (trigger). Los objetos de la librería (ayuda,
 * buscador ⌘K y campana) se renderizan reales con renderToStaticMarkup, igual
 * que en la app; lo propio de Scale OS (CompanySelector de app/operations.tsx,
 * presencia de app/presence.tsx, ThemeToggle, IaCargaButton) espeja su JSX.
 * ========================================================================= */
const COMPANY = 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima';
const fotoPerfil = (initials) => `<span class="foto-perfil foto-perfil-md foto-perfil-circulo foto-perfil-persona" aria-hidden="true"><span class="foto-perfil-iniciales" aria-hidden="true">${initials}</span></span>`;
/* CompanyMark: con logo usa FotoPerfil (xs, cuadrado, variante logo); sin logo, el edificio. */
const companyMark = (logo) => logo
  ? `<span class="foto-perfil foto-perfil-xs foto-perfil-cuadrado foto-perfil-logo company-mark" aria-hidden="true"><img src="${logo}" alt="" referrerpolicy="no-referrer" loading="lazy"></span>`
  : markup(Building2, {size: 16});
const companySelector = (logo) => `<button class="workspace" title="${COMPANY}">${companyMark(logo)}<span class="company-name">${COMPANY}</span></button>`;
const presencePeople = [['LA', 'Lucía Acosta'], ['AG', 'Ana Giménez'], ['MR', 'Marcos Rojas'], ['SB', 'Sofía Benítez'], ['DA', 'Daniela Ayala'], ['CN', 'Carlos Núñez'], ['LO', 'Lucía Ortega']];
const presenceLabel = `${presencePeople.map(([, name]) => name).join(', ')} · ${presencePeople.length} en línea`;
const presence = `<div class="workspace-presence workspace-presence-compact" title="${presenceLabel}" aria-label="${presenceLabel}"><span class="presence-avatars">${presencePeople.slice(0, 4).map(([initials, name]) => `<span class="presence-person" role="img" title="${name} · En línea" aria-label="${name} · En línea">${fotoPerfil(initials)}<i data-active="true"></i></span>`).join('')}<span class="presence-more" title="${presencePeople.slice(4).map(([, name]) => name).join(', ')}">+${presencePeople.length - 4}</span></span></div>`;
const themeToggle = `<button type="button" class="theme-toggle" aria-label="Cambiar tema (ahora: Tema claro)" title="Tema claro · clic para el siguiente" data-theme-state="light">${markup(Sun, {size: 18})}</button>`;
const iaCargaButton = `<button type="button" class="secondary ia-carga-button whitespace-nowrap" aria-haspopup="dialog" aria-label="Carga con IA" title="Carga con IA · pegá un texto y revisá antes de crear">${markup(Sparkles, {size: 16, 'aria-hidden': 'true'})}<span class="hidden xl:inline">Carga con IA</span></button>`;
const helpButton = markup(AyudaModulo, {titulo: 'Pipeline', resumen: 'Oportunidades por etapa.', puntos: ['Arrastrá una tarjeta a otra etapa.', 'Filtrá por etapa o moneda.', 'Abrí una oportunidad para ver su historial.'], enlaces: [], etiquetaBoton: 'Guía del panel', abierta: false, onAbrir() {}, onCerrar() {}});
const searchButton = markup(PaletaComandos, {boton: true, textoBoton: 'Buscar cliente, proyecto u orden', titulo: 'Buscar en esta empresa', ariaLabel: 'Buscar clientes, proyectos y órdenes', placeholder: 'Nombre, cliente, proyecto o acción…', buscar: async () => [], onElegir() {}, minimo: 2});
const bellAvisos = Array.from({length: 120}, (_, index) => ({id: String(index), titulo: `Aviso ${index + 1}`, detalle: 'Pieza asignada', tono: 'info', fecha: '2026-10-14T10:00:00Z', leido: false, icono: 'bell'}));
const bellButton = markup(CampanaAvisos, {avisos: bellAvisos, ariaLabel: 'Notificaciones', onAbrir() {}, onElegir() {}, vacioTitulo: 'Sin avisos', vacioDetalle: 'Todo al día.'});
const topbarHtml = ({logo = '/brand/icon-192.png'} = {}) => `
<div class="workspace-topbar sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 py-2 shadow-[0_1px_0_rgb(37_28_41_/_4%)] backdrop-blur motion-reduce:[&_*]:transition-none max-md:z-30 max-md:flex-wrap max-md:gap-2" role="toolbar" aria-label="Controles del espacio de trabajo">
 <div class="topbar-primary flex min-w-0 flex-1 items-center gap-3 max-md:min-w-[12.5rem] md:min-w-[9rem]">
  <div class="topbar-identity flex min-w-0 items-center gap-2 max-md:gap-2"><button class="icon-button mobile-menu-trigger hidden h-11 w-11 place-items-center max-md:grid" type="button" title="Abrir menú" aria-label="Abrir menú" aria-expanded="false" aria-haspopup="dialog">${markup(Menu, {size: 22})}</button></div>
  <div class="topbar-workspace-context flex min-w-0 flex-1 items-center gap-3">
   <div class="topbar-company min-w-0 max-md:min-w-[9rem] md:min-w-[9rem] [&_.company-name]:truncate [&_.workspace]:!m-0 [&_.workspace]:min-w-0 [&_.workspace]:overflow-hidden max-md:[&_.workspace]:min-h-11">${companySelector(logo)}</div>
   <div class="topbar-presence min-w-0 shrink-0 max-[520px]:hidden" role="group" aria-label="Personas activas en el espacio">${presence}</div>
  </div>
 </div>
 <div class="topbar-utilities flex min-w-0 flex-wrap items-center justify-end gap-2 max-md:contents">
  <div class="topbar-status flex items-center gap-2 max-md:order-2"></div>
  <div class="topbar-utility-actions flex min-w-0 items-center gap-2 max-md:order-1 [&>*]:min-h-10 [&>*]:min-w-10 max-md:[&>*]:min-h-11 max-md:[&>*]:min-w-11 [&>div>button]:min-h-10 [&>div>button]:min-w-10 max-md:[&>div>button]:min-h-11 max-md:[&>div>button]:min-w-11 max-xl:[&_button.toque-44>span]:hidden max-xl:[&_button.toque-44>kbd]:hidden">${themeToggle}${helpButton}${iaCargaButton}${searchButton}${bellButton}</div>
 </div>
</div>`;
const topbar = topbarHtml();
const topbarSinLogo = topbarHtml({logo: ''});

const mobileDrawer = `
<div class="relative min-h-[100dvh]">
<div class="mobile-sidebar-backdrop fixed inset-0 z-40 grid bg-black/50 motion-reduce:!transition-none">
 <section class="mobile-sidebar flex h-[100dvh] w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-ink-800 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] [&_.mobile-sidebar-brand]:flex [&_.mobile-sidebar-brand]:items-center [&_.mobile-sidebar-brand]:pb-1" role="dialog" aria-modal="true" aria-label="Menú de Scale OS" tabindex="-1">
  <div class="mobile-sidebar-heading flex items-center justify-between gap-3"><strong class="text-sm font-semibold text-fore">Menú principal</strong><button type="button" class="icon-button" title="Cerrar menú" aria-label="Cerrar menú">${svg(I.x, 20)}</button></div>
  <div class="mobile-sidebar-body grid min-h-0 content-start gap-1 [&_a]:min-h-11 [&_button]:min-h-11">
   <div class="mobile-sidebar-brand flex items-center px-3 pt-2"><span class="workspace-brand" role="img" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></div>
   <p class="nav-caption mt-1 px-3 font-mono text-[10px] uppercase tracking-[.13em] text-mute">Espacio de trabajo</p>
   <nav aria-label="Menú principal" class="grid content-start gap-1 [&_a]:no-underline">${navItemsHtml({active: 'Pipeline', tone: 'light'})}${logoutButton('light')}</nav>
   <div class="sidebar-bottom mt-auto grid grid-cols-[minmax(0,1fr)] gap-1 border-t border-ink-600 pt-3"><div class="profile-footer min-w-0"><button class="user w-full min-w-0 justify-start rounded-lg text-left transition hover:bg-ink-700" aria-label="Abrir mi perfil">${peopleContainer({name: 'Lucía Acosta', secondary: 'Propietaria', initials: 'LA'})}</button></div></div>
  </div>
 </section>
</div>
</div>`;

/* ================================================ 10. NOTIFICACIONES ======
 * La bandeja vive en plt-helpers-v2.mjs (v2-notificaciones), que renderiza el componente real.
 * ========================================================================= */

const toastStack = `
<div class="feedback-stack" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notificaciones de guardado">
 <div class="feedback-toast" data-tone="success"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.checkCircle, 17)}</span><p>Cambios guardados en la empresa Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima.</p></div>
 <div class="feedback-toast" data-tone="error"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.shieldAlert, 17)}</span><p>No se pudo completar la operación: el monto ingresado supera el límite permitido para la moneda de la empresa.</p></div>
 <div class="feedback-toast" data-tone="warning"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.shieldAlert, 17)}</span><p>2 de 3 registros restaurados. Revisá la Papelera para ver el detalle.</p></div>
</div>`;

/* ========================================================== 11. FOOTER ===
 * app/workspace-footer.tsx: el pie real (ProductFooter de owncoding-ui) con la
 * versión de release/version.json y el enlace a Privacidad del marco interno;
 * en el marco va anclado al pie (`mt-auto pt-6`, app/scale-workspace.tsx).
 * ========================================================================= */
const workspaceFooter = `<div class="mt-auto pt-6">${markup(ProductFooter, {nombre: 'Scale OS', version: `v${releaseVersion}`, className: 'workspace-footer'}, React.createElement('a', {href: '/privacidad'}, 'Privacidad'))}</div>`;

/* ======================================================== export default == */
export default [
  {
    id: 'pipeline-visitantes',
    section: 'Pipeline',
    surface: 'Visitantes en la web',
    kind: 'workspace',
    body: `<div class="ops-stack">${liveVisitorsPanel}</div>`,
  },
  {
    id: 'metricas-crecimiento',
    section: 'Métricas',
    surface: 'Visitas y crecimiento (tarjetas, gráfico y tabla diaria)',
    kind: 'workspace',
    body: `<div class="ops-stack">${growthDashboard}</div>`,
  },
  {
    id: 'planes-comparacion',
    section: 'Planes',
    surface: 'Comparación de planes (tabla)',
    kind: 'workspace',
    body: `<div class="ops-stack"><section class="panel">${planComparison}</section></div>`,
  },
  {
    id: 'shell-sidebar-colapsada',
    section: 'Shell',
    surface: 'Sidebar colapsada (60 px)',
    kind: 'plain',
    body: workspaceShell({
      collapsed: true,
      active: 'Pipeline',
      content: `<header class="workspace-page-header mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 max-md:grid max-md:grid-cols-1"><div class="page-heading flex min-w-0 items-center gap-2"><h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">Pipeline</h1></div></header><div class="ops-stack"><section class="panel"><p class="empty-copy">Contenido de la sección activa.</p></section></div>${workspaceFooter}`,
    }),
  },
  {
    id: 'shell-topbar',
    section: 'Shell',
    surface: 'Topbar del espacio de trabajo',
    kind: 'plain',
    body: workspaceShell({
      active: 'Pipeline',
      topbar,
      content: `<header class="workspace-page-header mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 max-md:grid max-md:grid-cols-1"><div class="page-heading flex min-w-0 items-center gap-2"><h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">Pipeline</h1><span class="page-count">128 oportunidades</span></div></header>${workspaceFooter}`,
    }),
  },
  {
    id: 'shell-topbar-sin-logo',
    section: 'Shell',
    surface: 'Topbar sin logo de empresa (fallback al edificio)',
    kind: 'plain',
    body: workspaceShell({
      active: 'Pipeline',
      topbar: topbarSinLogo,
      content: '<header class="workspace-page-header mb-5"><div class="page-heading flex min-w-0 items-center gap-2"><h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">Pipeline</h1></div></header>',
    }),
  },
  {
    id: 'shell-menu-mobile',
    section: 'Shell',
    surface: 'Menú mobile (drawer abierto)',
    kind: 'plain',
    body: mobileDrawer,
  },
  {
    id: 'shell-toasts',
    section: 'Shell',
    surface: 'Toasts de guardado (éxito, error, advertencia)',
    kind: 'plain',
    body: toastStack,
  },
  {
    id: 'shell-footer',
    section: 'Shell',
    surface: 'Footer del espacio de trabajo',
    kind: 'workspace',
    body: workspaceFooter,
  },
];

/*
 * Held out of the registry on purpose.
 *
 * `platform-access.css` ships in none of the 24 built CSS chunks
 * (`grep -l platform-access .next/static/css/*.css` → 0) because
 * `PlatformAccessPanel` is not referenced by any route; the harness renders
 * fixtures with the built CSS only, so registering this fixture today would
 * report geometry of unstyled markup (base-HTML list rows, an email forcing
 * horizontal overflow). Enable it — by adding it to the default export — when
 * the panel is wired to a route and its chunk is built.
 */
export const platformAccessFixture = {
  id: 'platform-access-global',
  section: 'Superadmin',
  surface: 'Administración global (accesos y agencias)',
  kind: 'workspace',
  lists: [
    {container: '.platform-access-list', head: '.platform-access-head', row: '.platform-access-row', label: 'Administración global · usuarios y agencias', exemptBelow: 640},
  ],
  body: `<div class="ops-stack">${platformAccessPanel}</div>`,
};
