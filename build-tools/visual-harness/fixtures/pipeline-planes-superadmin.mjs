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
 *  - app/desktop-sidebar.tsx lines 10-13 + app/desktop-sidebar.css
 *  - app/scale-workspace.tsx topbar lines 997-1026 + app/workspace-density.css
 *  - app/mobile-navigation.tsx lines 17-22/36-37 + app/mobile-navigation.css
 *  - app/notification-inbox.tsx lines 66-83 + app/notification-center.tsx 12/18
 *    (+ app/notifications.css / app/toast.css)
 *  - app/workspace-footer.tsx lines 4-6 + app/workspace-footer.css
 */

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

/* ============================================================ 1. PIPELINE ==
 * app/suite.tsx LeadCard line 39 / LeadColumn line 40 / CatalogWorkspace 41-73.
 * The board shows the six fixed stages plus one loose/deactivated stage (the
 * `looseSlugs` + `readOnly` path), each with its own `.lead-card` footer.
 *
 * The board is a kanban: per the 17-09 decision it keeps its own cards, so this
 * fixture declares no list/grid. Its two real defects are not expressible as a
 * harness declaration and were measured with a CDP probe against audit.html at
 * 1440 (2026-09-20, current main):
 *  - `.suite-column` widths (`.suite-board` at 1440): 590/549/387/414/280/280/319
 *    px although the CSS pins `flex-basis: 280px` (the column `min-width: auto`
 *    gives in to the nowrap opportunity name/email).
 *  - `.suite-column > .lead-card` takes `height: 100%` from the shared capsule
 *    rule (app/ui-system.css lines 294-300): every card measures 511 px, the
 *    first card's bottom (947) falls below the column bottom (920) and the second
 *    starts at y 957; `.suite-board` clips the overflow (clientHeight 551 /
 *    scrollHeight 1125).
 * ========================================================================= */
const leadCard = ({name, amount, currency, probability, email, level}) => `
  <article class="ops-card lead-card" style="opacity:1">
   <header class="lead-card-head"><b title="${name}">${name}</b><button class="icon-button" type="button" title="Mover ${name}" aria-label="Mover ${name}">${svg(I.grip, 16)}</button></header>
   <strong class="lead-card-amount">${money(amount, currency)}</strong>
   <div class="lead-card-chips"><span class="lead-prob" data-level="${level}">${probability}%</span>${email ? `<span class="lead-contact" title="${email}">${email}</span>` : ''}</div>
   <footer class="inline-actions"><button class="text-button" type="button">${svg(I.eye, 14)}Ver oportunidad</button>${removeRecordButton('leads', name)}</footer>
  </article>`;

const leadColumn = ({stage, label, readOnly = false, cards, pondered = []}) => `
  <section class="suite-column" data-stage="${stage}">
   <h3>${label}${readOnly ? ' · desactivada' : ''} · ${cards.length}</h3>
   ${pondered.map((value) => `<small>${value} ponderado</small>`).join('')}
   ${cards.join('')}
  </section>`;

const pipelineColumns = [
  leadColumn({
    stage: 'lead',
    label: 'Nuevo lead',
    cards: [
      leadCard({
        name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada · Sucursal Asunción',
        amount: 1234567890,
        currency: 'PYG',
        probability: 10,
        email: 'licitaciones.compras.institucionales@coopservicios.com.py',
        level: 'low',
      }),
      leadCard({name: 'Fundación Niñez y Comunidad', amount: 0, currency: 'PYG', probability: 10, email: '', level: 'low'}),
    ],
  }),
  leadColumn({
    stage: 'contacted',
    label: 'Contactado',
    cards: [
      leadCard({
        name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.',
        amount: 12500000,
        currency: 'PYG',
        probability: 25,
        email: 'produccion@estudiocomunicacionparaguay.com.py',
        level: 'low',
      }),
    ],
  }),
  leadColumn({
    stage: 'proposal',
    label: 'Propuesta',
    pondered: [money(89750000, 'PYG'), money(12345.67, 'USD')],
    cards: [
      leadCard({name: 'Cervecería del Este · Campaña verano 2027', amount: 89750000, currency: 'PYG', probability: 55, email: 'marketing@cervezadeldeste.com.py', level: 'mid'}),
      leadCard({name: 'Agencia Digital Global LLC', amount: 12345.67, currency: 'USD', probability: 55, email: 'proposals@digital-global-international.example.com', level: 'mid'}),
    ],
  }),
  leadColumn({
    stage: 'negotiation',
    label: 'Negociación',
    cards: [
      leadCard({name: 'Gobierno Departamental · Licitación 4521/2026', amount: 999999999, currency: 'PYG', probability: 75, email: 'compras@gobernacion.example.gov.py', level: 'high'}),
    ],
  }),
  leadColumn({stage: 'won', label: 'Ganado', cards: [leadCard({name: 'Textil Paraguaya S.A.', amount: 45000000, currency: 'PYG', probability: 100, email: 'gerencia@textilparaguaya.com.py', level: 'high'})]}),
  leadColumn({stage: 'lost', label: 'Perdido', cards: [leadCard({name: 'Importadora Ñandú S.R.L.', amount: 8000000, currency: 'PYG', probability: 0, email: '', level: 'low'})]}),
  leadColumn({
    stage: 'propuesta-2025',
    label: 'Propuesta 2025',
    readOnly: true,
    cards: [leadCard({name: 'Hotel Guaraní · Rebranding 2025', amount: 25000000, currency: 'PYG', probability: 40, email: 'reservas@hotelguarani.com.py', level: 'mid'})],
  }),
].join('');

/* ===================================================== 2. VISITANTES WEB ==
 * app/live-visitors.tsx lines 41-46 (counts state). `peopleContainer` mirrors
 * app/person-container.tsx lines 14-27 (title on name and secondary) and is
 * reused by the shell sidebar/profile.
 * ========================================================================= */
const peopleContainer = ({name, secondary, initials}) => `
  <span class="person-container person-container-md">
   <span class="person-container-avatar" aria-hidden="true">${initials}</span>
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
  <div class="min-w-0"><div class="text-xs font-bold uppercase tracking-[.18em] text-fono-light">Captación digital</div><h2 class="mt-1 text-xl font-bold text-fore">Visitas y crecimiento</h2></div>
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
  <div class="mt-2 max-h-[70vh] overflow-auto"><table class="w-full text-sm"><thead class="sticky top-0 z-10 bg-ink-800"><tr class="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mute"><th class="px-2.5 py-1.5 font-medium">Fecha</th><th class="px-2.5 py-1.5 text-right font-medium">Páginas vistas</th></tr></thead><tbody>${growthPointCounts.map((count, index) => `<tr class="border-b border-ink-600/60 last:border-0"><td class="px-2.5 py-1.5 text-fore">${growthPointDays[index]}</td><td class="px-2.5 py-1.5 text-right text-fore tabular-nums">${count}</td></tr>`).join('')}</tbody></table></div>
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
 * app/superadmin/page.tsx. StatusBadge 183-195; stats 579-633;
 * agencies 635-812; users/coupons 939-1160; audit 1162-1215.
 * ========================================================================= */
const badge = (label, tone = 'neutral') => `<span class="platform-admin-badge" data-tone="${tone}">${label}</span>`;

const platformHeader = `
<header class="platform-admin-header">
 <a href="/" aria-label="Scale OS"><span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></a>
 <div class="platform-admin-title"><p class="eyebrow">ADMINISTRACIÓN GLOBAL</p><h1>Control de Scale OS</h1><span>Operación, acceso y catálogo comercial</span></div>
 <div class="platform-admin-actions"><button type="button" class="secondary">${svg(I.refresh, 16)}Actualizar</button><a class="text-button" href="/">${svg(I.arrowLeft, 16)}Panel</a></div>
</header>`;

const platformNotice = `
<section class="platform-admin-notice">${svg(I.shieldAlert, 18)}<span><strong>Acceso separado por plataforma.</strong> Ser dueño de una agencia no habilita este panel ni sus datos.</span></section>`;

const platformStats = `
<section class="platform-admin-stats" aria-label="Resumen de plataforma">
 <article class="platform-admin-stat-card"><span class="platform-admin-stat-icon">${svg(I.building, 16)}</span><div class="platform-admin-stat-copy"><small>Agencias activas</small><strong>${whole(1284)} <span>/ ${whole(1301)}</span></strong></div></article>
 <article class="platform-admin-stat-card"><span class="platform-admin-stat-icon">${svg(I.users, 16)}</span><div class="platform-admin-stat-copy"><small>Usuarios registrados</small><strong>${whole(98765)}</strong></div></article>
 <article class="platform-admin-stat-card"><span class="platform-admin-stat-icon">${svg(I.ticket, 16)}</span><div class="platform-admin-stat-copy"><small>Cupones activos</small><strong>${whole(42)} <span>/ ${whole(148)}</span></strong></div></article>
 <article class="platform-admin-stat-card"><span class="platform-admin-stat-icon">${svg(I.checkCircle, 16)}</span><div class="platform-admin-stat-copy"><small>Suscripciones</small><strong class="platform-admin-subscription-summary">${whole(118)} active · ${whole(24)} trial · ${whole(6)} past_due · ${whole(2)} suspended</strong></div></article>
</section>`;

const agencies = [
  {
    name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    slug: 'estudio-comunicacion-produccion-paraguay',
    active: true,
    users: 148,
    plan: money(2500000, 'PYG'),
    state: badge('Acceso manual activo', 'neutral'),
    expiry: '30 sept 2026',
  },
  {
    name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    slug: 'coopservicios',
    active: false,
    users: 9,
    plan: money(199, 'USD'),
    state: badge('Acceso manual suspendido', 'warning'),
    expiry: '—',
  },
  {
    name: 'Agencia Digital Global LLC · Sucursal Paraguay',
    slug: 'agencia-digital-global-llc',
    active: true,
    users: 1234,
    plan: money(1234567890, 'PYG'),
    state: badge('Sin cambio manual', 'neutral'),
    expiry: '15 ago 2026',
  },
];

const agencyLedger = `
<div class="platform-admin-table-wrap">
 <table class="platform-admin-ledger">
  <thead><tr><th>Agencia</th><th>Estado</th><th>Plan</th><th>Usuarios</th><th>Prueba / vencimiento</th></tr></thead>
  <tbody>
   ${agencies.map((agency) => `
   <tr>
    <td><b>${agency.name}</b><small>${agency.slug}</small></td>
    <td><div class="platform-admin-cell-stack">${badge(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'success' : 'neutral')}${agency.state}</div></td>
    <td>${agency.plan}</td>
    <td>${whole(agency.users)}</td>
    <td><div class="platform-admin-cell-stack"><span>${agency.expiry}</span><button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar agencia</button></div></td>
   </tr>`).join('')}
  </tbody>
 </table>
</div>`;

const agencyCards = `
<div class="platform-admin-agency-cards">
 ${agencies.map((agency) => `
 <article class="platform-admin-agency-card">
  <div><b>${agency.name}</b><small>${agency.slug}</small></div>
  <div class="platform-admin-card-badges">${badge(agency.active ? 'Activa' : 'Inactiva', agency.active ? 'success' : 'neutral')}${agency.state}</div>
  <dl><div><dt>Plan</dt><dd>${agency.plan}</dd></div><div><dt>Usuarios</dt><dd>${whole(agency.users)}</dd></div><div><dt>Vencimiento</dt><dd>${agency.expiry}</dd></div></dl>
  <button type="button" class="text-button platform-admin-inline-action">Gestionar estado manual</button>
  <button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar agencia</button>
 </article>`).join('')}
</div>`;

const superadminAgencies = `
${platformHeader}
${platformNotice}
${platformStats}
<section class="platform-admin-section platform-admin-agencies">
 <div class="platform-admin-section-heading"><div><p class="eyebrow">AGENCIAS</p><h2>Agencias y suscripciones</h2></div><small>Gestioná el acceso manual junto a cada registro</small></div>
 ${agencyLedger}
 ${agencyCards}
</section>`;

const platformUsers = [
  /* Self row, writable: badge + "Eliminar mi cuenta" only (page.tsx 974-997). */
  {email: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', agencies: 12, self: true, badge: badge('Admin global', 'success'), actions: `<button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar mi cuenta</button>`},
  /* Acceso de agencia: "Hacer admin global" + "Solo lectura" + delete (998-1045). */
  {email: 'compras@coopservicios.com.py', agencies: 3, self: false, badge: badge('Acceso de agencia'), actions: `<button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">${svg(I.eye, 14)}Solo lectura</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar usuario</button>`},
  /* Viewer: "Quitar acceso" replaces "Solo lectura" (1000-1031). */
  {email: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', agencies: 1, self: false, badge: badge('Solo lectura', 'success'), actions: `<button type="button" class="text-button">${svg(I.shieldCheck, 14)}Hacer admin global</button><button type="button" class="text-button">Quitar acceso</button><button type="button" class="text-button platform-admin-danger">${svg(I.trash, 14)}Eliminar usuario</button>`},
];

const superadminUsers = `
<section class="platform-admin-section platform-admin-users">
 <div class="platform-admin-section-heading"><div><p class="eyebrow">USUARIOS</p><h2>Accesos entre agencias</h2></div><small>${whole(platformUsers.length)} registrados</small></div>
 <ul class="platform-admin-list">
  <li class="platform-admin-list-head" aria-hidden="true"><span>Usuario</span><span>Acciones</span></li>
  ${platformUsers.map((person) => `
  <li>
   <span><b title="${person.email}">${person.email}</b><small>${whole(person.agencies)} agencias activas${person.self ? ' · Vos' : ''}</small></span>
   <div class="platform-admin-user-actions">${person.badge}${person.actions}</div>
  </li>`).join('')}
 </ul>
</section>`;

const coupons = [
  {code: 'SCALE-LANZAMIENTO-2026-PARAGUAY', detail: '10% · Sin límite de usos', active: true},
  {code: 'TRIAL-EXTENDIDO-90-DIAS', detail: '90 días gratis · 250 usos máximos', active: true},
  {code: 'BLACK-FRIDAY-2025-AGOTADO-Y-PAUSADO', detail: money(150, 'USD') + ' · 2.000 usos máximos', active: false},
];

const superadminCoupons = `
<section class="platform-admin-section platform-admin-commercial">
 <div class="platform-admin-section-heading"><div><p class="eyebrow">CUPONES</p><h2>Catálogo comercial</h2></div><small>${whole(coupons.length)} códigos</small></div>
 <form class="platform-admin-coupon">
  <label>Código<input value="SCALE10" placeholder="SCALE10" required minlength="3" maxlength="40"></label>
  <div class="ops-select"><span class="ops-label" id="coupon-type-label">Tipo</span><button type="button" class="ops-select-trigger" title="Monto fijo" aria-labelledby="coupon-type-label coupon-type-value" aria-haspopup="listbox" aria-expanded="false"><span id="coupon-type-value">Monto fijo</span>${svg(I.chevronDown, 16)}</button></div>
  <label>Valor<input value="150" inputmode="decimal" maxlength="10" required></label>
  <div class="ops-select"><span class="ops-label" id="coupon-currency-label">Moneda</span><button type="button" class="ops-select-trigger" title="USD" aria-labelledby="coupon-currency-label coupon-currency-value" aria-haspopup="listbox" aria-expanded="false"><span id="coupon-currency-value">USD</span>${svg(I.chevronDown, 16)}</button></div>
  <button class="primary" disabled>Crear cupón</button>
 </form>
 <ul class="platform-admin-list">
  <li class="platform-admin-list-head" aria-hidden="true"><span>Cupón</span><span>Acciones</span></li>
  ${coupons.map((coupon) => `
  <li>
   <span><b title="${coupon.code}">${coupon.code}</b><small>${coupon.detail}</small></span>
   <span class="platform-admin-list-actions">${badge(coupon.active ? 'Activo' : 'Pausado', coupon.active ? 'success' : 'neutral')}<button type="button" class="text-button ${coupon.active ? 'warn' : 'positive'}">${coupon.active ? svg(I.pauseCircle, 14) + 'Pausar' : svg(I.playCircle, 14) + 'Reactivar'}</button></span>
  </li>`).join('')}
 </ul>
</section>`;

const auditEntries = [
  {date: '18 sept 2026', actor: 'solo.lectura.auditoria.externa@consultora-internacional.example.com', action: 'plataforma.acceso_actualizado', target: 'usuario #14823', metadata: '{"from":"viewer","to":"admin","agencies":12,"reason":"pedido del cliente"}', open: false},
  {date: '17 sept 2026', actor: 'Sistema', action: 'plataforma.suscripcion_vencida', target: 'agencia #982', metadata: '{"expires_at":"2026-09-17T23:59:59-03:00","plan":"enterprise-anual-regional","amount":1234567890,"currency":"PYG"}', open: true},
  {date: '17 sept 2026', actor: 'administracion.facturacion@estudiocomunicacionparaguay.com.py', action: 'plataforma.cupon_creado', target: 'cupon #4521', metadata: '{"code":"SCALE-LANZAMIENTO-2026-PARAGUAY","type":"percent","value":10,"max_redemptions":null}', open: true},
];

const superadminAudit = `
<section class="platform-admin-section platform-admin-audit">
 <div class="platform-admin-section-heading"><div><p class="eyebrow">AUDITORÍA</p><h2>Actividad de administración global</h2></div><small>${whole(auditEntries.length)} acciones recientes</small></div>
 <div class="platform-admin-table-wrap">
  <table class="platform-admin-ledger">
   <thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Destino</th></tr></thead>
   <tbody>
    ${auditEntries.map((entry) => `
    <tr><td>${entry.date}</td><td>${entry.actor}</td><td>${entry.action}</td><td>${entry.target}${entry.open ? `<small title="${entry.metadata.replace(/"/g, '&quot;')}">${entry.metadata}</small>` : ''}</td></tr>`).join('')}
   </tbody>
  </table>
 </div>
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
 * app/scale-workspace.tsx lines 953-984 (sidebarContent + shell) and
 * app/desktop-sidebar.tsx lines 10-13 (collapsed state).
 * ========================================================================= */
const navItems = [
  ['Resumen', false], ['Producción', false], ['Clientes', false], ['Proyectos', false], ['Presupuestos', false],
  ['Finanzas', false], ['Mora', false], ['Previsión', false], ['Informes', false], ['Pipeline', true],
  ['Planes', false], ['Inventario', false], ['Estudio', false], ['Equipo', false], ['Actividad', false],
  ['Configuración', false], ['Preferencias', false], ['Papelera', false],
];
const navLink = ([label, active]) =>
  `<a href="#"${active ? ' class="active" aria-current="page"' : ''} title="${label}" aria-label="${label}">${svg(I.target, 18)}<span class="nav-label">${label}</span></a>`;

const sidebar = ({collapsed = false, active = 'Resumen'} = {}) => `
<aside class="desktop-sidebar${collapsed ? ' is-collapsed' : ''}">
 <button type="button" class="sidebar-collapse" aria-label="${collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}" title="${collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}" aria-expanded="${collapsed ? 'false' : 'true'}">${collapsed ? svg(I.panelLeftOpen, 18) : svg(I.panelLeftClose, 18)}</button>
 <div class="sidebar-brand"><span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></div>
 <div class="mobile-sidebar-brand"><span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></div>
 <p class="nav-caption">Espacio de trabajo</p>
 <nav aria-label="Menú principal">${navItems.map((item) => navLink([item[0], item[0] === active || item[1]])).join('')}<button type="button" class="nav-logout" aria-label="Cerrar sesión" title="Cerrar sesión">${svg(I.logout, 18)}<span class="nav-label">Cerrar sesión</span></button></nav>
 <div class="sidebar-bottom"><div class="profile-footer"><button class="user" aria-label="Abrir mi perfil">${peopleContainer({name: 'Fredd D.', secondary: 'Propietario', initials: 'FD'})}</button></div></div>
</aside>`;

const workspaceShell = ({collapsed = false, active = 'Resumen', content}) => `
<main class="shell control-shell">
 ${sidebar({collapsed, active})}
 <section class="content">${content}</section>
</main>`;

/* ==================================================== 9. TOPBAR / MOBILE ==
 * app/scale-workspace.tsx lines 995-1024 (workspace-topbar) and
 * app/mobile-navigation.tsx lines 17-22 + 36-37 (drawer + trigger).
 * ========================================================================= */
const topbar = `
<div class="workspace-topbar" role="toolbar" aria-label="Controles del espacio de trabajo">
 <div class="topbar-primary">
  <div class="topbar-identity"><button class="icon-button mobile-menu-trigger" type="button" title="Abrir menú" aria-label="Abrir menú" aria-expanded="false" aria-haspopup="dialog">${svg(I.menu, 22)}</button></div>
  <div class="topbar-workspace-context">
   <div class="topbar-company"><button class="workspace" title="Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima">${svg(I.building, 16)}<span class="company-name">Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima</span></button></div>
   <div class="topbar-presence" role="group" aria-label="Personas activas en el espacio"><div class="workspace-presence workspace-presence-compact" title="Fredd D., Ana Giménez, Marcos Rojas, Sofía Benítez, Daniela Ayala, Carlos Núñez, Lucía Ortega · 7 en línea" aria-label="Fredd D., Ana Giménez, Marcos Rojas, Sofía Benítez, Daniela Ayala, Carlos Núñez, Lucía Ortega · 7 en línea"><span class="presence-avatars"><span class="presence-person" title="Fredd D. · Activo en este proyecto" aria-label="Fredd D. · Activo en este proyecto"><span aria-hidden="true">FD</span><i data-active="true"></i></span><span class="presence-person" title="Ana Giménez · Viendo este proyecto" aria-label="Ana Giménez · Viendo este proyecto"><span aria-hidden="true">AG</span><i data-active="false"></i></span><span class="presence-person" title="Marcos Rojas · Activo en este proyecto" aria-label="Marcos Rojas · Activo en este proyecto"><span aria-hidden="true">MR</span><i data-active="true"></i></span><span class="presence-person" title="Sofía Benítez · Activo en este proyecto" aria-label="Sofía Benítez · Activo en este proyecto"><span aria-hidden="true">SB</span><i data-active="true"></i></span><span class="presence-more" title="Daniela Ayala, Carlos Núñez, Lucía Ortega">+3</span></span></div></div>
  </div>
 </div>
 <div class="topbar-utilities">
  <div class="topbar-status"></div>
  <div class="topbar-utility-actions">
   <button type="button" class="theme-toggle" aria-label="Cambiar tema" title="Cambiar tema">${svg(I.moon, 18)}</button>
   <button class="workspace-search-trigger" aria-label="Buscar clientes, proyectos y órdenes">${svg(I.search, 17)}<span>Buscar cliente, proyecto u orden</span></button>
   <button type="button" class="icon-button notification-trigger" title="Notificaciones" aria-haspopup="dialog" aria-expanded="false" aria-label="Notificaciones, 99+ sin leer">${svg(I.bell, 19)}<span class="notification-badge" aria-hidden="true">99+</span></button>
  </div>
 </div>
</div>`;

const mobileDrawer = `
<div class="mobile-sidebar-backdrop">
 <section class="mobile-sidebar" role="dialog" aria-modal="true" aria-label="Menú de Scale OS" tabindex="-1">
  <div class="mobile-sidebar-heading"><strong>Menú principal</strong><button type="button" class="icon-button" title="Cerrar menú" aria-label="Cerrar menú">${svg(I.x, 20)}</button></div>
  <div class="mobile-sidebar-body">
   <div class="mobile-sidebar-brand"><span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span></div>
   <p class="nav-caption">Espacio de trabajo</p>
   <nav aria-label="Menú principal">${navItems.map((item) => navLink([item[0], item[0] === 'Pipeline' || item[1]])).join('')}<button type="button" class="nav-logout" aria-label="Cerrar sesión" title="Cerrar sesión">${svg(I.logout, 18)}<span class="nav-label">Cerrar sesión</span></button></nav>
   <div class="sidebar-bottom"><div class="profile-footer"><button class="user" aria-label="Abrir mi perfil">${peopleContainer({name: 'Fredd D.', secondary: 'Propietario', initials: 'FD'})}</button></div></div>
  </div>
 </section>
</div>`;

/* ================================================ 10. NOTIFICACIONES ======
 * app/notification-inbox.tsx lines 66-83 (bell + Dialog content) and
 * app/notification-center.tsx lines 12/18 (toast stack).
 * ========================================================================= */
const notices = [
  {
    unread: true,
    title: 'Campaña de lanzamiento regional · pieza 148 en revisión',
    kind: 'Mención o comentario',
    body: 'Sofía Benítez te mencionó: “@Fredd revisá el corte final con la música licenciada antes del viernes; el cliente pidió bajar 2 segundos el cierre con logo.”',
    time: '18 sept 26 · 17:42',
    state: 'Sin leer · Pendiente',
    actions: true,
  },
  {
    unread: false,
    title: 'Entrega pendiente: Cobertura de evento institucional con transmisión en vivo y postproducción',
    kind: 'Entrega pendiente',
    body: 'La pieza vence hoy a las 18:00 (hora de Asunción). El proyecto tiene 24 piezas activas y dos responsables asignados.',
    time: '17 sept 26 · 09:05',
    state: 'Leída · Resuelta',
    actions: false,
  },
  {
    unread: true,
    title: 'Asignación',
    kind: 'Asignación',
    body: 'Marcos Rojas te asignó la orden #14823 del proyecto “Rebranding Hotel Guaraní 2026”, con 3 niveles de aprobación.',
    time: '16 sept 26 · 21:30',
    state: 'Sin leer · Pendiente',
    actions: true,
  },
];

const noticeArticle = (notice) => `
 <article class="${notice.unread ? 'notice unread' : 'notice'}">
  <div class="notice-identity"><h3>${notice.title}</h3><span class="notice-kind-chip">${notice.kind}</span></div>
  <p class="notice-body">${notice.body}</p>
  <time datetime="2026-09-18T17:42:00-03:00">${notice.time}</time>
  <p class="notification-state">${notice.state}</p>
  <div class="notification-actions">
   ${notice.actions ? `<button type="button" class="icon-button" title="Ver pieza" aria-label="Ver pieza: ${notice.title}">${svg(I.externalLink, 17)}</button>` : ''}
   ${notice.unread ? `<button type="button" class="icon-button notification-action-icon is-confirm" title="Marcar como leída" aria-label="Marcar como leída: ${notice.title}">${svg(I.check, 18)}</button>` : ''}
   <button type="button" class="icon-button notification-action-icon is-confirm" title="Resolver aviso" aria-label="Resolver aviso: ${notice.title}">${svg(I.circleCheck, 18)}</button>
  </div>
 </article>`;

const notificationInbox = `
<div class="ops-overlay">
 <section class="ops-dialog unified-dialog" data-dialog-size="compact" role="dialog" aria-modal="true" aria-labelledby="notif-title" tabindex="-1">
  <div class="dialog-heading"><h2 id="notif-title">Notificaciones</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${svg(I.x, 18)}</button></div>
  <div class="dialog-body">
   <div class="notification-inbox">
    <div class="notification-toolbar"><p role="status">12 sin leer · 4 pendientes</p><div class="notification-actions" aria-label="Acciones de notificaciones"><button type="button" class="icon-button" title="Preferencias" aria-label="Abrir preferencias de notificaciones">${svg(I.settings, 17)}</button><button type="button" class="icon-button notification-action-icon is-confirm" title="Marcar todas como leídas" aria-label="Marcar todas las notificaciones como leídas">${svg(I.checkCheck, 18)}</button><button type="button" class="icon-button" title="Actualizar" aria-label="Actualizar notificaciones">${svg(I.refresh, 17)}</button></div></div>
    <p class="form-note">Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza ni modifica el aviso de otras personas.</p>
    <div class="notification-filters" role="group" aria-label="Filtrar notificaciones"><button type="button" class="choice active" aria-pressed="true">Todas</button><button type="button" class="choice" aria-pressed="false">Sin leer</button><button type="button" class="choice" aria-pressed="false">Pendientes</button><button type="button" class="choice" aria-pressed="false">Resueltas</button></div>
    <div aria-busy="false"><div class="notification-list">${notices.map(noticeArticle).join('')}</div></div>
    <button type="button" class="secondary">Ver avisos anteriores</button>
   </div>
  </div>
  <div class="dialog-footer"></div>
 </section>
</div>`;

const toastStack = `
<div class="feedback-stack" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notificaciones de guardado">
 <div class="feedback-toast" data-tone="success"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.checkCircle, 17)}</span><p>Cambios guardados en la empresa Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima.</p></div>
 <div class="feedback-toast" data-tone="error"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.shieldAlert, 17)}</span><p>No se pudo completar la operación: el monto ingresado supera el límite permitido para la moneda de la empresa.</p></div>
 <div class="feedback-toast" data-tone="warning"><span class="feedback-toast-icon" aria-hidden="true">${svg(I.shieldAlert, 17)}</span><p>2 de 3 registros restaurados. Revisá la Papelera para ver el detalle.</p></div>
</div>`;

/* ========================================================== 11. FOOTER ===
 * app/workspace-footer.tsx lines 4-6 (workspace variant).
 * ========================================================================= */
const workspaceFooter = `
<footer class="workspace-footer">
 <span>© 2026 Scale OS. Todos los derechos reservados. · v1.0.97</span>
 <span>Desarrollado por <a href="https://owncoding.dev/" target="_blank" rel="noopener noreferrer">Owncoding</a></span>
</footer>`;

/* ======================================================== export default == */
export default [
  {
    id: 'pipeline-tablero',
    section: 'Pipeline',
    surface: 'Tablero de oportunidades (kanban)',
    kind: 'workspace',
    body: `
<div class="ops-stack">
<section class="panel">
 <div class="panel-heading"><h2>Oportunidades</h2><button class="secondary">${svg(I.settings, 16)}Etapas</button><button class="primary">${svg(I.plus, 16)}Agregar</button></div>
 <div class="pipeline-overview">
  <div class="pipeline-overview-counts">
   <article><span>${svg(I.target, 16)}Abiertas</span><strong>${whole(128)}</strong></article>
   <article><span>${svg(I.checkCircle, 16)}Ganadas</span><strong>${whole(1204)}</strong></article>
   <article><span>${svg(I.globe, 16)}Consultas web</span><strong>${whole(37)}</strong></article>
  </div>
  <div class="pipeline-overview-values"><span>Valor abierto · sin convertir monedas</span><b>${money(1234567890, 'PYG')}</b><b>${money(12345.67, 'USD')}</b></div>
 </div>
 <div class="suite-board">${pipelineColumns}</div>
</section>
</div>`,
  },
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
    id: 'superadmin-agencias',
    section: 'Superadmin',
    surface: 'Agencias y suscripciones (tabla + cápsulas)',
    kind: 'plain',
    body: `<main class="platform-admin-page">${superadminAgencies}</main>`,
  },
  {
    id: 'superadmin-accesos',
    section: 'Superadmin',
    surface: 'Accesos entre agencias y catálogo comercial',
    kind: 'plain',
    lists: [
      {container: '.platform-admin-users .platform-admin-list', head: '.platform-admin-list-head', row: '.platform-admin-users .platform-admin-list li:not(.platform-admin-list-head)', label: 'Superadmin · usuarios', exemptBelow: 430},
      {container: '.platform-admin-commercial .platform-admin-list', head: '.platform-admin-list-head', row: '.platform-admin-commercial .platform-admin-list li:not(.platform-admin-list-head)', label: 'Superadmin · cupones', exemptBelow: 430},
    ],
    body: `<main class="platform-admin-page"><div class="platform-admin-two-columns">${superadminUsers}${superadminCoupons}</div></main>`,
  },
  {
    id: 'superadmin-auditoria',
    section: 'Superadmin',
    surface: 'Auditoría global (tabla)',
    kind: 'plain',
    body: `<main class="platform-admin-page">${superadminAudit}</main>`,
  },
  {
    id: 'shell-sidebar-colapsada',
    section: 'Shell',
    surface: 'Sidebar colapsada (60 px)',
    kind: 'plain',
    body: workspaceShell({
      collapsed: true,
      active: 'Pipeline',
      content: `<header class="workspace-page-header"><div class="page-heading"><h1>Pipeline</h1></div></header><div class="ops-stack"><section class="panel"><p class="empty-copy">Contenido de la sección activa.</p></section></div>${workspaceFooter}`,
    }),
  },
  {
    id: 'shell-topbar',
    section: 'Shell',
    surface: 'Topbar del espacio de trabajo',
    kind: 'plain',
    body: workspaceShell({
      active: 'Pipeline',
      content: `${topbar}<header class="workspace-page-header"><div class="page-heading"><h1>Pipeline</h1><span class="page-count">128 oportunidades</span></div></header>${workspaceFooter}`,
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
    id: 'shell-notificaciones',
    section: 'Shell',
    surface: 'Centro de notificaciones (bandeja)',
    kind: 'plain',
    body: notificationInbox,
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
