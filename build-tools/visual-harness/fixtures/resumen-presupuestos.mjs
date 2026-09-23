/*
 * Fixtures: Resumen (centro de control), Producción (tablero), Proyectos y Presupuestos.
 *
 * Markup mirrors the real JSX (file + lines):
 *  - app/control-center.tsx (ControlCenter) líneas 36-40 → .control-signals/.control-signal,
 *    41-48 (resumen comercial), 49-61 (.financial-summary/.section-caption, .financial-strip/
 *    .financial-stat/.financial-amounts, .commercial-bars, .finance-compare, .inventory-summary)
 *    y 62-68 (.due-alert/.due-details/.due-group).
 *    CSS: app/control-center.css (líneas 39-43, 68-71).
 *  - app/scale-workspace.tsx líneas 1139-1156 → toolbar .production-view-menu.production-toolbar
 *    (SelectCustom de app/profile-controls.tsx: .ops-select/.ops-label/.ops-select-trigger),
 *    .production-filters, .production-filter-summary, .form-note.
 *  - app/scale-workspace.tsx líneas 1159-1183 → .panel.production-panel.production-focus,
 *    .kanban, .board-note.
 *  - app/production-board.tsx líneas 42-85 → DraggableOrder (.work-card/.card-top/.card-meta/
 *    .order-actions) y 86-115 → KanbanColumn (.column/.column-title/.dot).
 *    CSS: app/globals.css (línea 11) + app/production-focus.css (líneas 3, 11).
 *  - app/scale-workspace.tsx líneas 1401-1403 + app/project-card.tsx líneas 24-34 →
 *    .project-list/.project-entry-head/.project-entry y .project-grid/.project-entry.
 *    CSS: app/project-card.css (10-13, 22-31) + app/ui-system.css (272-344, 356-361).
 *  - app/scale-workspace.tsx líneas 1457-1473 → .budget-hub-grid + article.ops-card.budget-hub-card
 *    con app/suite.tsx (BudgetActions, línea 136) y app/archive-controls.tsx (RemoveRecord, 22-37).
 *    CSS: app/operations.css (406-425) + app/ui-system.css (219, 272-344).
 *
 * Notas de medición:
 *  - `.kanban` es un scroll horizontal intencional (7 carriles de 252-286 px,
 *    overflow-x:auto en app/production-focus.css): NO se declara como lista ni
 *    cuadrícula; su desborde interno sale como 'scrollable' y queda excluido.
 *  - `.project-list` declara template `--project-cols`, rowHeight 44-52 y
 *    exemptBelow 1240: la tabla completa sólo se muestra cuando entra (≥1241 px);
 *    por debajo el CSS apila la fila a propósito y la altura no se mide.
 *  - `.project-grid` y `.budget-hub-grid` se declaran como cuadrículas (≥200 px).
 *  - Los <details> de vencimientos van `open`: el detalle sólo es medible abierto
 *    (es un estado real de uso).
 *  - La tarjeta de presupuesto lleva el importe sin IVA en `.budget-hub-fact-amount`
 *    (ocupa las dos columnas de la ficha) y con `title`: es el contrato vigente.
 *  - Datos de estrés: nombres largos, Gs 1.234.567.890 / USD 12.345,67, fechas
 *    reales y estados vacíos (Sin Drive, Sin responsables, Responsables no
 *    disponibles, carriles vacíos, all-clear).
 */

/* Iconos lucide-like recortados para el fixture (misma forma que usa la app). */
const svg = (size, paths) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICON = {
  calendarClock: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M12 14v3l2 1"/>',
  fileQuestion: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M9.1 14.5a3 3 0 1 1 4.9 2.3c-.9.7-1.5 1.1-1.5 2.2M12 21h.01"/>',
  packageSearch: '<path d="m7.5 4.3 9 5.2M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l.5-.3"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="m20.3 17.3 2.2 2.2"/>',
  arrowUpRight: '<path d="M7 7h10v10M7 17 17 7"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  slidersHorizontal: '<path d="M3 6h8M15 6h6M3 12h4M11 12h10M3 18h10M18 18h3"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  rotateCcw: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  alertCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  checkCircle: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m9 11 3 3L22 4"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  pencil: '<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  messageSquare: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
};

/* ---------------------------------------------------------------- átomos compartidos */

/* app/client-identity.tsx líneas 14-20 */
const clientIdentity = (name, initials, color = 'violet', compact = false) =>
  `<span class="client-identity identity-${color}${compact ? ' compact' : ''}"><span class="identity-avatar" aria-hidden="true">${initials}</span><span class="identity-name" title="${name}">${name}</span></span>`;

/* app/assigned-people.tsx líneas 11-17 + app/actor-identity.tsx líneas 16-26 */
const assignedPeople = (people, inherited = false) => `
<section class="assigned-people" aria-label="${inherited ? 'Responsables del proyecto' : 'Responsables asignados'}">
 <span class="assigned-people-label">${inherited ? 'Responsables del proyecto' : 'Responsables'}</span>
 ${people === null || people === undefined
    ? '<p class="assigned-people-state" role="status">Responsables no disponibles</p>'
    : people.length === 0
      ? '<p class="assigned-people-state">Sin responsables</p>'
      : `<ul class="assigned-people-list">${people.map((person) => `<li class="assigned-person"><span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${person.initials}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${person.name}">${person.name}</span></span></span>${person.primary ? `<span class="assigned-person-primary">${inherited ? 'Principal del proyecto' : 'Principal'}</span>` : ''}</li>`).join('')}</ul>`}
</section>`;

/* app/archive-controls.tsx líneas 22-37 (RemoveRecord) */
const removeRecord = (name) =>
  `<button class="icon-button record-remove" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: ${name}">${svg(16, ICON.trash)}</button>`;

/* app/suite.tsx línea 134 (RecordEditor: Editar + papelera; el control de revisión
   del cliente queda fuera: está condicionado por rol y no cambia la fila) */
const recordEditorIcons = (name) =>
  `<button class="icon-button" type="button" title="Editar" aria-label="Editar ${name}">${svg(16, ICON.pencil)}</button>${removeRecord(name)}`;

/* app/profile-controls.tsx líneas 34-59 (SelectCustom) */
const selectCustom = (label, value, id) => `
<div class="ops-select">
 <span class="ops-label" id="${id}-label">${label}</span>
 <button type="button" class="ops-select-trigger" title="${value}" aria-labelledby="${id}-label ${id}-value" aria-haspopup="listbox" aria-expanded="false"><span id="${id}-value">${value}</span>${svg(16, ICON.chevronDown)}</button>
</div>`;

/* --------------------------------------------------------------------- Resumen */

/* app/control-center.tsx líneas 36-40 */
const controlSignals = `
<section class="control-signals" aria-label="Señales accionables">
 <button type="button" class="control-signal"><span class="control-signal-icon" aria-hidden="true">${svg(16, ICON.calendarClock)}</span><span class="control-signal-text"><b>9 entregas próximas</b><small>Vencen en los próximos 7 días</small></span>${svg(14, ICON.arrowUpRight)}</button>
 <button type="button" class="control-signal"><span class="control-signal-icon" aria-hidden="true">${svg(16, ICON.fileQuestion)}</span><span class="control-signal-text"><b>14 presupuestos sin respuesta</b><small>Enviados y todavía sin definición</small></span>${svg(14, ICON.arrowUpRight)}</button>
 <button type="button" class="control-signal"><span class="control-signal-icon" aria-hidden="true">${svg(16, ICON.packageSearch)}</span><span class="control-signal-text"><b>1 equipo sin verificar</b><small>Sin control físico en más de 30 días</small></span>${svg(14, ICON.arrowUpRight)}</button>
</section>`;

/* app/control-center.tsx líneas 41-48 (resumen comercial) */
const commercialSummary = `
<section class="financial-summary commercial-summary" aria-labelledby="commercial-title">
 <div class="section-caption"><div class="section-head"><p class="section-eyebrow">Comercial</p><h2 id="commercial-title">Resumen comercial</h2></div><button class="text-button">Ver pipeline ${svg(14, ICON.arrowUpRight)}</button></div>
 <div class="financial-strip" aria-busy="false">
  <article class="financial-stat"><span>Clientes activos</span><div class="financial-amounts"><strong>38</strong></div><small>Con relación comercial activa.</small></article>
  <article class="financial-stat"><span>Prospectos activos</span><div class="financial-amounts"><strong>143</strong></div><small>Leads que todavía no están ganados ni perdidos.</small></article>
  <article class="financial-stat financial-primary"><span>Facturación mensual contratada</span><div class="financial-amounts"><strong>Gs 1.234.567.890</strong><strong>USD 12.345,67</strong></div><div class="commercial-bars" aria-hidden="true"><span class="commercial-bar-row"><span class="commercial-bar-currency">PYG</span><span class="commercial-bar-track"><span class="commercial-bar-fill" style="width:100%"></span></span></span><span class="commercial-bar-row"><span class="commercial-bar-currency">USD</span><span class="commercial-bar-track"><span class="commercial-bar-fill" style="width:12%"></span></span></span></div><small>Expectativa comercial vigente; no es el forecast ni el efectivo cobrado.</small></article>
 </div>
</section>`;

/* app/control-center.tsx líneas 49-61 (resumen financiero + comparativa + patrimonio) */
const financeSummary = `
<section class="financial-summary" aria-labelledby="financial-title">
 <div class="section-caption"><div class="section-head"><p class="section-eyebrow">Finanzas</p><h2 id="financial-title">Resumen financiero</h2></div><button class="text-button">Ver movimientos ${svg(14, ICON.arrowUpRight)}</button></div>
 <div class="financial-strip" aria-busy="false">
  <article class="financial-stat financial-primary"><span>Disponible</span><div class="financial-amounts"><strong>Gs 1.984.567.890</strong><strong>USD 87.654,32</strong></div><small>Saldo actual en cuentas</small></article>
  <article class="financial-stat"><span>Por cobrar</span><div class="financial-amounts"><strong>Gs 2.345.678.901</strong><strong>USD 45.678,90</strong></div><small>Facturas pendientes</small></article>
  <article class="financial-stat"><span>Cobrado este mes</span><div class="financial-amounts"><strong>Gs 876.543.210</strong></div><small>Neto de reversiones</small></article>
  <article class="financial-stat"><span>Gastos planificados</span><div class="financial-amounts"><strong>Gs 1.234.567.890</strong><strong>USD 12.345,67</strong></div><small>Mes actual · fijos y variables</small></article>
  <article class="financial-stat"><span>Personal</span><div class="financial-amounts"><strong>Gs 3.456.789.012</strong></div><small>Salarios esperados al cierre del mes</small></article>
  <article class="financial-stat financial-result"><span>Resultado estimado del mes</span><div class="financial-amounts"><strong data-negative="true">−Gs 456.789.012</strong><strong>USD 1.234,56</strong></div><small>Ingreso esperado − gastos planificados y personal.</small></article>
 </div>
 <div class="finance-compare">
  <div class="finance-compare-group"><p class="finance-compare-currency">PYG</p>
   <div class="finance-compare-row"><span class="finance-compare-label">Disponible</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-cash" style="width:57%"></span></span><strong class="finance-compare-value">Gs 1.984.567.890</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Por cobrar</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-receivables" style="width:68%"></span></span><strong class="finance-compare-value">Gs 2.345.678.901</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Cobrado este mes</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-collections" style="width:25%"></span></span><strong class="finance-compare-value">Gs 876.543.210</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Gastos planificados</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-expenses" style="width:36%"></span></span><strong class="finance-compare-value">−Gs 1.234.567.890</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Personal</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-personnel" style="width:100%"></span></span><strong class="finance-compare-value">Gs 3.456.789.012</strong></div>
  </div>
  <div class="finance-compare-group"><p class="finance-compare-currency">USD</p>
   <div class="finance-compare-row"><span class="finance-compare-label">Disponible</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-cash" style="width:100%"></span></span><strong class="finance-compare-value">USD 87.654,32</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Por cobrar</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-receivables" style="width:52%"></span></span><strong class="finance-compare-value">USD 45.678,90</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Cobrado este mes</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-collections" style="width:14%"></span></span><strong class="finance-compare-value">USD 12.345,67</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Gastos planificados</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-expenses" style="width:14%"></span></span><strong class="finance-compare-value">−USD 12.345,67</strong></div>
   <div class="finance-compare-row"><span class="finance-compare-label">Personal</span><span class="finance-compare-track" aria-hidden="true"><span class="finance-compare-fill tone-personnel" style="width:0%"></span></span><strong class="finance-compare-value">USD 0,00</strong></div>
  </div>
 </div>
 <p class="inventory-summary">Patrimonio en equipos <b>Gs 12.345.678.901 · USD 234.567,89</b><button class="text-button">Ver inventario${svg(14, ICON.arrowUpRight)}</button></p>
</section>`;

/* app/control-center.tsx líneas 62-68 (alertas de vencimiento) */
const dueItem = (item) => `
<li>
 <div><b>${item.context}</b><small>#${item.id} · ${item.date}</small></div>
 ${item.type === 'work_order'
    ? recordEditorIcons(item.name)
    : `<button class="text-button">Ver cobranza${svg(14, ICON.arrowUpRight)}</button>`}
</li>`;

const dueGroup = (group) => `
<details class="due-group" open>
 <summary>
  <span class="due-group-cell">${group.name}${group.items.length > 1 ? `<b> ×${group.items.length}</b>` : ''}<span class="due-bar-track" aria-hidden="true"><span class="due-bar-fill tone-${group.tone}" style="width:${group.width}%"></span></span></span>
  <time datetime="${group.due}">${group.short}</time>
  <small>${group.type === 'invoice' ? 'Factura' : 'Producción'}</small>
 </summary>
 <ul>${group.items.map(dueItem).join('')}</ul>
</details>`;

const dueAlertOverdue = `
<section class="due-alert has-overdue" aria-label="Alertas de vencimiento">
 <details open>
  <summary>${svg(18, ICON.alertCircle)}<strong>Pendientes vencidos <span class="count-badge">30+</span></strong><span class="alert-peek">Campaña Aniversario 2026 · Spots para televisión abierta ×3 · 28 ago.</span><span class="alert-toggle">Ver detalle</span></summary>
  <div class="due-details">
   <p class="form-note">Se muestran los primeros 30 vencimientos. Revisá Producción y Cobranza para ver el resto.</p>
   ${dueGroup({
     name: 'Campaña Aniversario 2026 · Spots para televisión abierta',
     due: '2026-08-28',
     short: '28 ago.',
     tone: 'danger',
     width: 100,
     type: 'work_order',
     items: [
       {id: 'wo_01J8Z9K4M7', type: 'work_order', name: 'Campaña Aniversario 2026 · Spots para televisión abierta', date: '28 ago.', context: 'Cooperativa Multiactiva de Servicios Múltiples Limitada · Campaña Aniversario 2026 · Temporada de verano'},
       {id: 'wo_01J8Z9K4M8', type: 'work_order', name: 'Campaña Aniversario 2026 · Spots para televisión abierta', date: '28 ago.', context: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima · Documental institucional del Bicentenario'},
       {id: 'wo_01J8Z9K4M9', type: 'work_order', name: 'Campaña Aniversario 2026 · Spots para televisión abierta', date: '28 ago.', context: 'Fundación Niñez y Comunidad · Cobertura de eventos corporativos 2026'},
     ],
   })}
   ${dueGroup({
     name: 'Documental institucional del Bicentenario — Investigación, rodaje y postproducción completa',
     due: '2026-09-02',
     short: '2 sept.',
     tone: 'warning',
     width: 67,
     type: 'work_order',
     items: [
       {id: 'wo_01J9B2Q7X1', type: 'work_order', name: 'Documental institucional del Bicentenario', date: '2 sept.', context: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima · Documental institucional del Bicentenario'},
       {id: 'wo_01J9B2Q7X2', type: 'work_order', name: 'Documental institucional del Bicentenario', date: '2 sept.', context: 'Ministerio de Educación y Ciencias · Memoria audiovisual 2026'},
     ],
   })}
   ${dueGroup({
     name: 'Factura F-2026-0084 · Cooperativa Multiactiva de Servicios Múltiples Limitada',
     due: '2026-09-15',
     short: '15 sept.',
     tone: 'gold',
     width: 33,
     type: 'invoice',
     items: [
       {id: 'inv_2026_0084', name: 'Factura F-2026-0084', date: '15 sept.', context: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', type: 'invoice'},
     ],
   })}
  </div>
 </details>
</section>`;

const dueAlertClear = `
<section class="due-alert all-clear" aria-label="Alertas de vencimiento">
 <div class="clear-message">${svg(17, ICON.checkCircle)}<span>Sin pendientes vencidos</span></div>
</section>`;

/* ----------------------------------------------------------------- Presupuestos */

/* app/scale-workspace.tsx líneas 1457-1473 + app/suite.tsx línea 136 (BudgetActions) */
const budgetCard = (budget) => `
<article class="ops-card budget-hub-card">
 <header class="budget-hub-head"><span class="budget-number">${budget.number}</span><span class="budget-state" data-status="${budget.status.key}">${budget.status.label}</span></header>
 <h3>${budget.title}</h3>
 <p class="budget-client">${budget.client}</p>
 <dl class="budget-hub-facts">
  <div><dt>Ítems</dt><dd>${budget.items}</dd></div>
  <div><dt>Vigencia</dt><dd>${budget.validUntil || 'Sin fecha'}</dd></div>
  <div class="budget-hub-fact-amount"><dt>Sin IVA</dt><dd title="${budget.subtotal}">${budget.subtotal}</dd></div>
 </dl>
 <strong class="budget-hub-total">${budget.total}<small>IVA incl.</small></strong>
 <footer class="budget-hub-actions"><button class="text-button">${svg(14, ICON.eye)}Abrir presupuesto</button>${removeRecord(budget.title)}</footer>
</article>`;

const budgets = [
  {
    number: 'P-2026-0148',
    status: {key: 'sent', label: 'Enviado'},
    title: 'Campaña Aniversario 2026 · Producción audiovisual completa con spots, cápsulas y cobertura del evento',
    client: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    items: 42,
    validUntil: '23-sept',
    subtotal: 'Gs 1.234.567.890',
    total: 'Gs 1.468.835.789',
  },
  {
    number: 'P-2026-0149',
    status: {key: 'accepted', label: 'Aceptado'},
    title: 'Documental institucional del Bicentenario',
    client: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    items: 7,
    validUntil: '30-oct',
    subtotal: 'USD 12.345,67',
    total: 'USD 14.691,35',
  },
  {
    number: 'P-2026-0150',
    status: {key: 'draft', label: 'Borrador'},
    title: 'Memoria audiovisual 2026 · Registro de archivo histórico y digitalización de cintas',
    client: 'Ministerio de Educación y Ciencias',
    items: 0,
    validUntil: null,
    subtotal: 'Gs 0',
    total: 'Gs 0',
  },
  {
    number: 'P-2026-0031',
    status: {key: 'expired', label: 'Vencido'},
    title: 'Reel de lanzamiento para la nueva línea de productos — corte final con subtítulos y corrección de color',
    client: 'Fundación Niñez y Comunidad',
    items: 19,
    validUntil: '02-sept',
    subtotal: 'Gs 987.654.321',
    total: 'Gs 1.174.308.742',
  },
];

/* ---------------------------------------------------------------------- export */

export default [
  {
    id: 'resumen-indicadores',
    section: 'Resumen',
    surface: 'Indicadores del centro de control',
    kind: 'workspace',
    body: `${controlSignals}${commercialSummary}${financeSummary}`,
  },
  {
    id: 'resumen-vencimientos',
    section: 'Resumen',
    surface: 'Alertas de vencimiento',
    kind: 'workspace',
    body: `${dueAlertOverdue}${dueAlertClear}`,
  },
  {
    id: 'presupuestos-cuadricula',
    section: 'Presupuestos',
    surface: 'Propuestas en cuadrícula',
    kind: 'workspace',
    grids: [{container: '.budget-hub-grid', card: '.budget-hub-card', label: 'Presupuestos · cuadrícula', minHeight: 200}],
    body: `<div class="budget-hub-grid">${budgets.map(budgetCard).join('')}</div>`,
  },
];
