/*
 * Fixtures: Finanzas (/pagos), Mora (/pagos/mora), Previsión (/pagos/prevision),
 * Informes (/informes) y Comisiones (/equipo/comisiones).
 *
 * El markup espeja el JSX real (sin clases inventadas):
 *  - app/scale-workspace.tsx 1490-1686 · Finanzas: kpi-strip, cuentas, transferencias,
 *    cobros pendientes y cobros registrados.
 *  - app/scale-workspace.tsx 1185-1292 · Mora: kpi-strip, toolbar y mora-list.
 *  - app/financial-forecast.tsx 73-74 · Previsión (mes, proyección, contratos);
 *    sin salary.view los importes por persona llegan en null: salario y cierre
 *    muestran "Sin dato" y la fila no dibuja acciones de salario.
 *  - app/reports-workspace.tsx 67-205 · Informes (tiles, chart, tablas, distribución).
 *  - app/operations.tsx 500-750 modo commissions · liquidación, tarjetas y egresos.
 *
 * Datos de estrés deliberados: montos PYG/USD grandes y negativos, nombres y
 * referencias largas, estados con dato y columnas sin dato (moneda nula,
 * ajuste inexistente, contrato sin factura, salario oculto por salary.view)
 * para medir el lugar reservado.
 */

const icon = (size, path, extra = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"${extra}>${path}</svg>`;
const plusIcon = (size = 14) => icon(size, '<path d="M12 5v14M5 12h14"/>');
const transferIcon = (size = 14) => icon(size, '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>');
const pencilIcon = (size = 16) => icon(size, '<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>');
const slidersIcon = (size = 16) => icon(size, '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>');
const trashIcon = (size = 16) => icon(size, '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
const searchIcon = (size = 16) => icon(size, '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>');
const checkIcon = (size = 14) => icon(size, '<path d="M20 6 9 17l-5-5"/>');
const banknoteIcon = (size = 14) => icon(size, '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>');
const xIcon = (size = 14) => icon(size, '<path d="M18 6 6 18M6 6l12 12"/>');
const undoIcon = (size = 14) => icon(size, '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>');
const chevronIcon = (size = 16) => icon(size, '<path d="m6 9 6 6 6-6"/>');

/* ActorIdentity sin foto ni timestamp, como en las filas financieras (app/actor-identity.tsx 16-27). */
const actorIdentity = (initials, name) => `<span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${name}">${name}</span></span></span>`;

/* SelectCustom cerrado (app/profile-controls.tsx 45-58). */
const selectCustom = (label, value, labelId) => `<div class="ops-select"><span class="ops-label" id="${labelId}-label">${label}</span><button type="button" class="ops-select-trigger" title="${value}" aria-labelledby="${labelId}-label ${labelId}-value" aria-haspopup="listbox" aria-expanded="false"><span id="${labelId}-value">${value}</span>${chevronIcon(16)}</button></div>`;

/* RemoveRecord (app/archive-controls.tsx 22-26). */
const removeRecord = (name) => `<button class="icon-button record-remove" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: ${name}">${trashIcon(16)}</button>`;

/* SearchField (app/search-field.tsx 9-12). */
const searchField = (className, label, placeholder, inputId, hidden = false) => `<label class="search-field ${className}" for="${inputId}"><span class="${hidden ? 'sr-only' : 'search-field-label'}">${label}</span><span class="search-field-box">${searchIcon(16)}<input id="${inputId}" type="search" value="" placeholder="${placeholder}" autocomplete="off"></span></label>`;

const moraChip = (tone, label) => `<span class="mora-chip ${tone}">${label}</span>`;

/* ------------------------------------------------------------------ Finanzas */

/* Cuenta como tarjeta: app/scale-workspace.tsx 1539-1557 + app/operations.css 361-371. */
const financeAccountCard = ({name, type, currency, balance, number, holder, custodian, active = true}) => `
<article class="finance-account-card"${active ? ' data-active="true"' : ''}>
 <header class="finance-account-head">
  <b title="${name}">${name}</b>
  <span class="hub-chip">${type} · ${currency}</span>
 </header>
 <strong class="finance-account-balance">${balance}</strong>
 <dl class="finance-facts">
  ${number ? `<div><dt>N.º</dt><dd title="${number}">${number}</dd></div>` : ''}
  ${holder ? `<div><dt>Titular</dt><dd title="${holder}">${holder}</dd></div>` : ''}
  ${custodian ? `<div><dt>Custodia</dt><dd title="${custodian}">${custodian}</dd></div>` : ''}
 </dl>
 <footer class="finance-card-actions">${removeRecord(name)}</footer>
</article>`;

/* Fila de transferencia: app/scale-workspace.tsx 1573-1589. */
const transferRow = ({from, to, date, actor, initials, reference, amount, received}) => `
<div class="payment-row finance-transfer-row">
 <div>
  <b>${from} → ${to}</b>
  <small>${date} · ${actorIdentity(initials, actor)}${reference ? ` · ${reference}` : ''}</small>
  ${received ? `<small>Recibido: ${received}</small>` : ''}
 </div>
 <strong>${amount}</strong>
</div>`;

/* Fila de cobro pendiente: app/scale-workspace.tsx 1624-1638. */
const invoiceRow = ({number, client, status, statusLabel, pending, total}) => `
<div class="payment-row finance-invoice-row">
 <div>
  <b>${number} · ${client}</b>
  <small><span class="finance-state" data-status="${status}">${statusLabel}</span> · pendiente ${pending}</small>
 </div>
 <strong>${total}</strong>
</div>`;

/* Fila de cobro registrado: app/scale-workspace.tsx 1657-1673 (+ ReceiptReversal). */
const paymentRow = ({client, invoice, date, account, accountType, actor, initials, reference, amount, reversed}) => `
<div class="payment-row finance-payment-row">
 <div>
  <b>${client} · ${invoice}</b>
  <small>${date} · ${account} (${accountType}) · recibió ${actorIdentity(initials, actor)}${reference ? ` · ${reference}` : ''}</small>
  ${reversed ? `<small>Revertido · ${reversed}</small>` : `<button class="text-button warn" type="button">${undoIcon(14)}Revertir cobro</button>`}
 </div>
 <strong>${amount}</strong>
</div>`;

const financePanelHeading = (eyebrow, title, actions = '') => `
<div class="panel-heading">
 <div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div>
 ${actions}
</div>`;

/* ------------------------------------------------------------------------ Mora */

/* Fila de mora: app/scale-workspace.tsx 1252-1283 + app/client-directory.css 51-58. */
const moraRow = ({initial, tone, name, statusText, chip, invoices, amount}) => `
<div class="client-row">
 <div class="client-avatar ${tone}">${initial}</div>
 <div>
  <b>${name}</b>
  <small>${statusText}${chip}${invoices}</small>
 </div>
 <span class="client-row-amount">${amount}</span>
</div>`;

/* ------------------------------------------------- Sistema v2 (Tailwind + owncoding-ui)
   Previsión (app/financial-forecast.tsx), Informes (app/reports-workspace.tsx),
   conciliación (app/daily-controls.tsx) y producción semanal (app/weekly-automatic.tsx):
   tarjetas, KPIs, chips, barras y listas de fila finita con plantilla compartida
   (scroll horizontal silencioso cuando la plantilla no entra). */
const CARD = 'rounded-xl border border-fono/30 bg-ink-800 p-5';
const BUTTON_OUTLINE = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 font-semibold transition h-11 md:h-9 text-sm bg-transparent text-fore border border-ink-500';
const INPUT = 'w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-fore h-11 md:h-9 text-base md:text-sm outline-none transition';
const LIST_HEAD = 'grid gap-x-2 border-b border-ink-600 px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-mute';
const LIST_ROW = 'grid min-h-11 items-center gap-x-2 border-b border-ink-600/60 px-2 py-1 last:border-0';
const PERSON_COLS = 'grid-cols-[minmax(16rem,1.2fr)_minmax(7rem,.9fr)_minmax(8rem,.9fr)_minmax(8rem,.9fr)_6.5rem]';
const CONTRACT_COLS = 'grid-cols-[minmax(22rem,1fr)_9rem_9rem_9rem]';
const EXPENSE_COLS = 'grid-cols-[minmax(0,1fr)_8.5rem_5rem]';
const PLANNED_COLS = 'grid-cols-[minmax(0,1fr)_7rem_8.5rem_5rem]';
const STATEMENT_COLS = 'grid-cols-[minmax(0,1fr)_7rem_8.5rem_5rem]';
const CHIP_TONES = {ok: 'bg-ok/15 text-ok border-ok/25', warn: 'bg-warn/15 text-warn border-warn/25', bad: 'bg-bad/15 text-bad border-bad/25', info: 'bg-fono/15 text-fono-light border-fono/25', mute: 'bg-ink-600 text-mute border-ink-500'};
const BAR_TONES = {fono: 'bg-fono', ok: 'bg-ok', warn: 'bg-warn', bad: 'bg-bad'};
const chip = (tone, text, title = '') => `<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${CHIP_TONES[tone] || CHIP_TONES.mute}"${title ? ` title="${title}"` : ''}>${text}</span>`;
const barra = (valor, max, tono = 'fono', etiqueta = '') => {
  const porcentaje = Math.min(100, Math.max(0, Number(valor) / (Number(max) || 100) * 100));
  return `<div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(porcentaje)}" aria-label="${etiqueta}" class="overflow-hidden rounded-full bg-fore/10 h-1.5"><span class="block h-full rounded-full ${BAR_TONES[tono]}" style="width:${porcentaje}%"></span></div>`;
};
const field = (label, control) => `<div><label class="block text-[11px] font-medium uppercase tracking-wider text-mute mb-1.5">${label}</label>${control}</div>`;
const segmented = (items, activeIndex = 0, aria = 'Horizonte de proyección') => `<div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1" role="group" aria-label="${aria}">${items.map((label, index) => `<button type="button" class="inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${index === activeIndex ? 'bg-fono/15 text-fono-light' : 'text-mute'}">${label}</button>`).join('')}</div>`;
const iconAction = (path, label, tone = 'mute') => {
  const tones = {ok: 'border-ok/30 text-ok', warn: 'border-warn/30 text-warn', bad: 'border-bad/30 text-bad', mute: 'border-transparent text-mute'};
  return `<button type="button" title="${label}" aria-label="${label}" class="inline-flex h-7 w-7 items-center justify-center rounded-lg border ${tones[tone] || tones.mute}">${icon(16, path)}</button>`;
};
const cell = (content, extra = '') => `<span class="min-w-0 ${extra}">${content}</span>`;
const listWrap = (minWidth, content) => `<div class="min-w-0 overflow-x-auto"><div class="min-w-[${minWidth}]">${content}</div></div>`;
const filaDato = (label, valor, tono = '') => `<div class="flex items-center justify-between gap-3"><span class="min-w-0 text-mute">${label}</span><span class="shrink-0 font-semibold tabular-nums ${tono}">${valor}</span></div>`;
const nota = (tono, text) => {
  const tones = {warn: 'border-warn/30 bg-warn/10', info: 'border-info/25 bg-info/10', neutro: 'border-ink-600 bg-ink-800/40'};
  return `<p class="border text-mute rounded-xl p-3 text-sm ${tones[tono] || tones.warn}">${text}</p>`;
};
const aviso = (tono, text) => {
  const tones = {error: 'border-bad/30 bg-bad/10 text-bad', ok: 'border-ok/30 bg-ok/10 text-ok'};
  return `<p role="${tono === 'error' ? 'alert' : 'status'}" class="rounded-lg border px-3 py-2 text-sm ${tones[tono]}">${text}</p>`;
};
const kpi = (label, valor, hint = '') => `<div class="relative overflow-hidden rounded-xl border p-4 border-ink-600 bg-ink-800"><div class="text-[11px] font-medium uppercase tracking-wider text-mute">${label}</div><div class="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl text-fore">${valor}</div>${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="text-mute">${hint}</span></div>` : ''}</div>`;
const tableBlock = (labels, rows) => `<div class="hidden max-h-[70vh] overflow-auto md:block"><table class="w-full text-sm"><thead class="sticky top-0 z-10 bg-ink-800"><tr class="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mute">${labels.map(([label, align]) => `<th class="px-2.5 py-1.5 font-medium${align === 'right' ? ' text-right' : ''}">${label}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr class="border-b border-ink-600/60 last:border-0">${cells.map(([value, align]) => `<td class="px-2.5 py-1.5 text-fore${align === 'right' ? ' text-right' : ''}">${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;


/* Secciones FIN (app/sections/{finanzas,mora,comisiones}.tsx): ui-v2 + Tailwind.
   Estas helpers espejan `ListGrid`/`ListRow`/`Kpi` de app/ui-v2.tsx. */
const v2Card = 'grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4';
const v2Kpi = (label, valor, hint = '', destacado = false) => `<div class="relative overflow-hidden rounded-xl border p-4 ${destacado ? 'border-fono/30 bg-gradient-to-br from-fono-dark via-fono to-fono' : 'border-ink-600 bg-ink-800'}"><div class="text-[11px] font-medium uppercase tracking-wider ${destacado ? 'text-onbrand/75' : 'text-mute'}">${label}</div><div class="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl ${destacado ? 'text-onbrand' : 'text-fore'}">${valor}</div>${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="${destacado ? 'text-onbrand/75' : 'text-mute'}">${hint}</span></div>` : ''}</div>`;
const v2KpiStrip = (items) => `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">${items.join('')}</div>`;
const v2Grid = ({label, template, columns, rows, minWidth = 'min-w-[58rem]'}) => `<div role="table" aria-label="${label}" class="silent-scroll min-w-0 overflow-x-auto"><div class="${minWidth}"><div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}">${columns.map((column, index) => `<span role="columnheader" class="${index === columns.length - 1 ? 'text-right ' : ''}whitespace-nowrap">${column}</span>`).join('')}</div><div role="rowgroup">${rows}</div></div></div>`;
const v2Row = (template, cells) => `<div role="row" class="grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${template}">${cells}</div>`;
const v2Empty = (title, description = '') => `<div role="status" class="rounded-xl border border-ink-600 bg-ink-800 p-4"><div class="flex flex-col items-center justify-center px-6 py-6 text-center"><div class="grid h-12 w-12 place-items-center rounded-2xl border border-ink-500 bg-ink-700 text-mute">${icon(20, '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>')}</div><p class="mt-3 text-sm font-semibold text-fore">${title}</p>${description ? `<p class="mt-1 max-w-xs text-xs leading-5 text-mute">${description}</p>` : ''}</div></div>`;
const actorCompact = (initials, name) => `<span class="inline-flex min-w-0 items-center gap-1.5 text-xs text-mute"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span><span class="truncate" title="${name}">${name}</span></span>`;
const moneyCell = (text) => `<span class="whitespace-nowrap font-semibold tabular-nums text-fore">${text}</span>`;
const chipMute = (text) => chip('mute', text);

/* --------------- Finanzas: KPIs y cuentas (sección v2) ----------------- */
const finanzasCuentas = {
  id: 'finanzas-cuentas',
  section: 'Finanzas',
  surface: 'KPIs, cuentas y saldos (sección v2)',
  kind: 'workspace',
  grids: [{container: 'section[aria-labelledby="finance-accounts-title"] .grid', card: 'article', label: 'Finanzas · cuentas', minHeight: 200}],
  body: `
<section class="grid gap-4" aria-label="Finanzas">
 ${v2KpiStrip([
   v2Kpi('DISPONIBLE', '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 1.234.567.890</span><span>USD 45.678</span></span>', 'Saldo actual de cuentas activas por moneda', true),
   v2Kpi('POR COBRAR', '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 987.654.321</span><span>USD 12.500</span></span>', 'Facturas emitidas o parciales con saldo pendiente'),
   v2Kpi('FACTURAS CON SALDO', '7', '24 facturas cargadas'),
 ])}
 <section class="${v2Card}" aria-labelledby="finance-accounts-title">
  <div class="flex flex-wrap items-center justify-between gap-2">
   <div class="min-w-0"><h3 id="finance-accounts-title" class="text-[17px] font-semibold tracking-tight text-fore">Cuentas</h3><p class="mt-1 text-xs text-mute">Disponibilidad por cuenta y custodia.</p></div>
   <div class="flex flex-wrap items-center gap-1"><button class="text-button" type="button">+ Cuenta</button><button class="text-button" type="button">Transferir</button></div>
  </div>
  <div class="grid gap-3 sm:grid-cols-2">
   <article class="flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <header class="flex items-start justify-between gap-2"><b class="min-w-0 text-[13.5px] font-semibold text-fore" title="Banco Regional — Operativa">Banco Regional — Operativa</b>${chipMute('Bancaria · PYG')}</header>
    <strong class="text-xl font-semibold tabular-nums text-fore">Gs. 1.100.000.000</strong>
    <dl class="grid gap-1 text-[11.5px]">
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Institución</dt><dd class="min-w-0 text-right text-fore" title="Banco Regional S.A.">Banco Regional S.A.</dd></div>
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">N.º</dt><dd class="min-w-0 whitespace-nowrap text-right tabular-nums text-fore" title="0012-3456789-00">0012-3456789-00</dd></div>
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Titular</dt><dd class="min-w-0 text-right text-fore">Estudio Scale S.A.</dd></div>
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Custodia</dt><dd class="min-w-0 text-right text-fore">finanzas@estudio.com.py</dd></div>
    </dl>
    <footer class="mt-auto flex items-center justify-end gap-1 border-t border-ink-600 pt-3"><button class="icon-button" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: Banco Regional — Operativa">${trashIcon(16)}</button></footer>
   </article>
   <article class="flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <header class="flex items-start justify-between gap-2"><b class="min-w-0 text-[13.5px] font-semibold text-fore" title="Caja Chica Estudio">Caja Chica Estudio</b>${chipMute('Efectivo · PYG')}</header>
    <strong class="text-xl font-semibold tabular-nums text-fore">Gs. 134.567.890</strong>
    <dl class="grid gap-1 text-[11.5px]">
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">Custodia</dt><dd class="min-w-0 text-right text-fore">caja@estudio.com.py</dd></div>
    </dl>
    <footer class="mt-auto flex items-center justify-end gap-1 border-t border-ink-600 pt-3"><button class="icon-button" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: Caja Chica Estudio">${trashIcon(16)}</button></footer>
   </article>
   <article class="flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <header class="flex items-start justify-between gap-2"><b class="min-w-0 text-[13.5px] font-semibold text-fore" title="Tarjeta corporativa USD">Tarjeta corporativa USD</b>${chipMute('Digital · USD')}</header>
    <strong class="text-xl font-semibold tabular-nums text-fore">USD 45.678</strong>
    <dl class="grid gap-1 text-[11.5px]">
     <div class="flex items-baseline justify-between gap-2"><dt class="text-[9.5px] font-bold uppercase tracking-[.06em] text-mute">N.º</dt><dd class="min-w-0 whitespace-nowrap text-right tabular-nums text-fore" title="**** 4821">**** 4821</dd></div>
    </dl>
    <footer class="mt-auto flex items-center justify-end gap-1 border-t border-ink-600 pt-3"><button class="icon-button" type="button" title="Mover a la papelera" aria-label="Mover a la papelera: Tarjeta corporativa USD">${trashIcon(16)}</button></footer>
   </article>
  </div>
 </section>
</section>`,
};

/* --------------- Finanzas: transferencias (sección v2) ----------------- */
const finanzasTransferencias = {
  id: 'finanzas-movimientos',
  section: 'Finanzas',
  surface: 'Transferencias entre cuentas (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Transferencias entre cuentas"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Finanzas · transferencias', rowHeight: [44, 52]},
  ],
  body: `
<section class="${v2Card}" aria-labelledby="finance-transfers-title">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <div class="min-w-0"><h3 id="finance-transfers-title" class="text-[17px] font-semibold tracking-tight text-fore">Transferencias</h3><p class="mt-1 text-xs text-mute">Movimientos entre cuentas con su tipo de cambio real.</p></div>
  <span class="whitespace-nowrap text-xs tabular-nums text-mute">4 movimientos</span>
 </div>
 ${v2Grid({label: 'Transferencias entre cuentas', template: 'grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]', columns: ['Transferencia', 'Fecha', 'Recibió', 'Referencia', 'Monto'], minWidth: 'min-w-[64rem]', rows: [
  v2Row('grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Banco Regional — Operativa → Tarjeta corporativa USD">Banco Regional — Operativa → Tarjeta corporativa USD</b><small class="block truncate text-[11px] text-mute" title="Compra de dólares para campaña internacional">Compra de dólares para campaña internacional</small></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="17-sept-26 · 10:00">17-sept</span></div><div class="min-w-0">${actorCompact('FD', 'Fredd D.')}</div><div class="min-w-0 truncate text-[11.5px] text-mute" title="TRF-2026-0917">TRF-2026-0917</div><div class="min-w-0 text-right">${moneyCell('Gs. 7.300.000')}<small class="ml-2 whitespace-nowrap tabular-nums text-mute">→ USD 1.000</small></div>`),
  v2Row('grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Caja Chica Estudio → Banco Regional — Operativa">Caja Chica Estudio → Banco Regional — Operativa</b></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="15-sept-26 · 16:40">15-sept</span></div><div class="min-w-0">${actorCompact('MG', 'María González')}</div><div class="min-w-0 text-[11.5px] text-mute">Sin referencia</div><div class="min-w-0 text-right">${moneyCell('Gs. 45.000.000')}</div>`),
  v2Row('grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Banco Regional — Operativa → Caja Chica Estudio">Banco Regional — Operativa → Caja Chica Estudio</b></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="12-sept-26 · 09:15">12-sept</span></div><div class="min-w-0">${actorCompact('FD', 'Fredd D.')}</div><div class="min-w-0 truncate text-[11.5px] text-mute" title="Reposición de caja">Reposición de caja</div><div class="min-w-0 text-right">${moneyCell('Gs. 12.000.000')}</div>`),
  v2Row('grid-cols-[minmax(20rem,1.6fr)_7rem_minmax(9rem,1.1fr)_minmax(9rem,1fr)_10rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Tarjeta corporativa USD → Banco Regional — Operativa">Tarjeta corporativa USD → Banco Regional — Operativa</b></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="10-sept-26 · 11:05">10-sept</span></div><div class="min-w-0">${actorCompact('LG', 'Luis Giménez')}</div><div class="min-w-0 truncate text-[11.5px] text-mute" title="Venta de excedente">Venta de excedente</div><div class="min-w-0 text-right">${moneyCell('USD 2.500')}<small class="ml-2 whitespace-nowrap tabular-nums text-mute">→ Gs. 18.250.000</small></div>`),
 ]})}
</section>`,
};

/* --------------- Finanzas: cobros pendientes y registrados (v2) -------- */
const finanzasCobros = {
  id: 'finanzas-cobros',
  section: 'Finanzas',
  surface: 'Cobros pendientes y registrados (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Cobros pendientes"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Finanzas · cobros pendientes', rowHeight: [44, 52]},
    {container: '[role="table"][aria-label="Cobros registrados"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Finanzas · cobros registrados', rowHeight: [44, 52]},
  ],
  body: `
<section class="grid gap-4">
 <section class="${v2Card}" aria-labelledby="finance-invoices-title">
  <div class="flex flex-wrap items-center justify-between gap-2">
   <div class="min-w-0"><h3 id="finance-invoices-title" class="text-[17px] font-semibold tracking-tight text-fore">Cobros pendientes</h3><p class="mt-1 text-xs text-mute">Facturas con saldo; el cobro descuenta la cuenta elegida.</p></div>
   <div class="flex flex-wrap items-center gap-1"><button class="text-button" type="button">+ Factura</button><button class="primary" type="button">+ Registrar cobro</button></div>
  </div>
  <div class="mb-4 flex flex-wrap items-end gap-3">
   <div class="flex flex-wrap gap-1"><button class="choice active" type="button">Todas</button><button class="choice" type="button">Con saldo</button><button class="choice" type="button">Vencidas</button><button class="choice" type="button">Vencen en 7 días</button><button class="choice" type="button">Borradoras</button><button class="choice" type="button">Canceladas</button></div>
   <label class="grid w-full gap-1.5 sm:w-64"><span class="sr-only">Buscar factura o cliente</span><span class="relative"><input type="search" class="w-full pl-7" placeholder="Número o cliente…" autocomplete="off"></span></label>
   <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">5 de 24</p>
  </div>
  ${v2Grid({label: 'Cobros pendientes', template: 'grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]', columns: ['Factura', 'Estado', 'Vence', 'Pendiente', 'Total', 'Acciones'], minWidth: 'min-w-[60rem]', rows: [
   v2Row('grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="F-2026-0417 · Industrias del Sur Sociedad Anónima">F-2026-0417 · Industrias del Sur Sociedad Anónima</b></div><div class="min-w-0">${chip('warn', 'Parcial')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums font-semibold text-warn" title="18-sept-26">18-sept</span></div><div class="min-w-0 text-right">${moneyCell('Gs. 45.678.900')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 90.000.000')}</div><div class="flex min-w-0 items-center justify-end gap-1"><button class="text-button" type="button">+ Registrar cobro</button></div>`),
   v2Row('grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="F-2026-0412 · Grupo Comercial del Este SRL">F-2026-0412 · Grupo Comercial del Este SRL</b></div><div class="min-w-0">${chip('bad', 'Vencida')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums font-semibold text-warn" title="05-sept-26">05-sept</span></div><div class="min-w-0 text-right">${moneyCell('USD 12.500')}</div><div class="min-w-0 text-right">${moneyCell('USD 12.500')}</div><div class="flex min-w-0 items-center justify-end gap-1"><button class="text-button" type="button">+ Registrar cobro</button></div>`),
   v2Row('grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="F-2026-0420 · Fundación Cultural Paraguaya">F-2026-0420 · Fundación Cultural Paraguaya</b></div><div class="min-w-0">${chip('info', 'Emitida')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="30-sept-26">30-sept</span></div><div class="min-w-0 text-right">${moneyCell('Gs. 8.500.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 8.500.000')}</div><div class="flex min-w-0 items-center justify-end gap-1"><button class="text-button" type="button">+ Registrar cobro</button></div>`),
   v2Row('grid-cols-[minmax(18rem,1.6fr)_7rem_6.5rem_8.5rem_8.5rem_8rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="F-2026-0399 · Cliente sin factura emitida">F-2026-0399 · Cliente sin factura emitida</b></div><div class="min-w-0">${chipMute('Borrador')}</div><div class="min-w-0"><span class="text-[11px] text-mute">Sin fecha</span></div><div class="min-w-0 text-right"><span class="whitespace-nowrap text-[11px] text-mute">Sin saldo</span></div><div class="min-w-0 text-right">${moneyCell('Gs. 1.000.000')}</div><div class="flex min-w-0 items-center justify-end gap-1"></div>`),
  ]})}
  <div class="flex justify-end"><button class="secondary" type="button">Ver todas las facturas</button></div>
 </section>
 <section class="${v2Card}" aria-labelledby="finance-payments-title">
  <div class="min-w-0"><h3 id="finance-payments-title" class="text-[17px] font-semibold tracking-tight text-fore">Quién cobró y dónde quedó</h3><p class="mt-1 text-xs text-mute">Cada cobro queda en la cuenta elegida y conserva su reversión en el historial.</p></div>
  ${v2Grid({label: 'Cobros registrados', template: 'grid-cols-[minmax(18rem,1.6fr)_6.5rem_minmax(9rem,1.1fr)_minmax(9rem,1.1fr)_minmax(8rem,1fr)_8.5rem_8rem]', columns: ['Cobro', 'Fecha', 'Cuenta', 'Recibió', 'Referencia', 'Monto', 'Acciones'], minWidth: 'min-w-[68rem]', rows: [
   v2Row('grid-cols-[minmax(18rem,1.6fr)_6.5rem_minmax(9rem,1.1fr)_minmax(9rem,1.1fr)_minmax(8rem,1fr)_8.5rem_8rem]', `<div class="flex min-w-0 items-center gap-2"><b class="truncate text-[13.5px] font-semibold text-fore" title="Industrias del Sur Sociedad Anónima · F-2026-0417">Industrias del Sur Sociedad Anónima · F-2026-0417</b></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="16-sept-26 · 15:20">16-sept</span></div><div class="min-w-0 truncate text-[11.5px] text-fore" title="Banco Regional — Operativa · Bancaria">Banco Regional — Operativa · Bancaria</div><div class="min-w-0">${actorCompact('MG', 'María González')}</div><div class="min-w-0 truncate text-[11.5px] text-mute" title="Transferencia 8842">Transferencia 8842</div><div class="min-w-0 text-right">${moneyCell('Gs. 44.321.100')}</div><div class="flex min-w-0 items-center justify-end gap-1"><button class="text-button warn" type="button">${undoIcon(14)}Revertir cobro</button></div>`),
   v2Row('grid-cols-[minmax(18rem,1.6fr)_6.5rem_minmax(9rem,1.1fr)_minmax(9rem,1.1fr)_minmax(8rem,1fr)_8.5rem_8rem]', `<div class="flex min-w-0 items-center gap-2"><b class="truncate text-[13.5px] font-semibold text-fore" title="Grupo Comercial del Este SRL · F-2026-0390">Grupo Comercial del Este SRL · F-2026-0390</b><span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-warn/25 bg-warn/15 px-2 py-0.5 text-xs font-medium text-warn" title="Cobro imputado a la cuenta equivocada">Revertido</span></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="09-sept-26 · 11:40">09-sept</span></div><div class="min-w-0 truncate text-[11.5px] text-fore" title="Tarjeta corporativa USD · Digital">Tarjeta corporativa USD · Digital</div><div class="min-w-0">${actorCompact('FD', 'Fredd D.')}</div><div class="min-w-0 text-[11.5px] text-mute">Sin referencia</div><div class="min-w-0 text-right">${moneyCell('USD 3.250,75')}</div><div class="flex min-w-0 items-center justify-end gap-1"></div>`),
  ]})}
 </section>
</section>`,
};

/* --------------- Finanzas: conciliación por extracto (v2) ------------- */
const statementRow = ({date, reference, matched, amount}) => `
<div role="row" class="${LIST_ROW} ${STATEMENT_COLS}">
 ${cell(`<b class="font-semibold text-fore">${date}</b><small class="ml-2 text-xs text-mute">${reference}</small>`, 'text-sm')}
 ${cell(chip(matched ? 'ok' : 'warn', matched ? 'Conciliado' : 'Pendiente'))}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${amount}</strong>`, 'text-right')}
 ${cell(iconAction(matched ? '<path d="M18 6 6 18M6 6l12 12"/>' : '<path d="M20 6 9 17l-5-5"/>', matched ? `Desvincular movimiento: ${reference}` : `Conciliar ${reference}`, matched ? 'bad' : 'ok'), 'flex justify-end')}
</div>`;
const finanzasConciliacion = {
  id: 'finanzas-conciliacion',
  section: 'Finanzas',
  surface: 'Conciliación por extracto (v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Movimientos del extracto"]', head: '[aria-hidden="true"]', row: '[role="row"]', label: 'Finanzas · conciliación', rowHeight: [44, 52]},
  ],
  body: `
<div class="${CARD} grid gap-3">
 <div class="grid gap-1">
  <h3 class="text-sm font-semibold text-fore">Conciliación por extracto</h3>
  <p class="text-xs text-mute">Compará el extracto con los movimientos registrados. Importar y conciliar no modifica saldos. El cruce automático exige fecha, importe y referencia exactos, sin coincidencias ambiguas.</p>
 </div>
 ${field('Cuenta a conciliar', `<div class="w-full sm:w-72">${selectCustom('Cuenta a conciliar', 'Banco Regional — Operativa · PYG', 'conc-account')}</div>`)}
 <div class="flex flex-wrap gap-2">
  <button type="button" class="${BUTTON_OUTLINE}">Importar CSV</button>
  <button type="button" class="${BUTTON_OUTLINE}">Conciliar coincidencias exactas</button>
 </div>
 <p class="text-sm text-mute">2 pendientes de 4 movimientos importados (hasta 1.000 visibles).</p>
 ${listWrap('40rem', `<div role="table" aria-label="Movimientos del extracto">
  <div class="${LIST_HEAD} ${STATEMENT_COLS}" aria-hidden="true"><span>Extracto</span><span>Estado</span><span class="text-right">Monto</span><span class="text-right">Acciones</span></div>
  ${statementRow({date: '10-sept', reference: 'TRANSFERENCIA RECIBIDA CLIENTE INDUSTRIAS DEL SUR SA', matched: false, amount: 'Gs. 1.234.567.890'})}
  ${statementRow({date: '09-sept', reference: 'PAGO PROVEEDOR 8842', matched: true, amount: '-Gs. 45.678.900'})}
  ${statementRow({date: '08-sept', reference: 'COMISION BANCARIA INTERNACIONAL USD', matched: false, amount: '-USD 1.250,75'})}
  ${statementRow({date: '07-sept', reference: 'COBRO', matched: true, amount: 'Gs. 300.000'})}
 </div>`)}
 ${aviso('ok', '3 coincidencias conciliadas.')}
</div>`,
};


/* --------------- Mora: cobranza y mora (sección v2) -------------------- */
const moraCobranzas = {
  id: 'mora-cobranzas',
  section: 'Finanzas',
  surface: 'Semáforo, DSO y lista de cobranza (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Cobranza por cliente"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Mora · cobranza por cliente', rowHeight: [44, 52]},
  ],
  body: `
<section class="grid gap-4" aria-label="Cobranza y mora">
 <header class="flex flex-wrap items-end justify-between gap-3">
  <div class="min-w-0"><p class="mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute">Finanzas · cobranzas</p><h2 class="text-lg font-semibold tracking-tight text-fore">Estado de pagos</h2><p class="mt-1 text-xs text-mute">Saldo pendiente por antigüedad y días en calle por moneda.</p></div>
  <span class="whitespace-nowrap text-xs tabular-nums text-mute">Actualizado 22-sept-26 · 09:30</span>
 </header>
 ${v2KpiStrip([v2Kpi('AL DÍA', '86', 'Sin saldo vencido'), v2Kpi('POR VENCER', '12', 'Vencen en los próximos días'), v2Kpi('EN MORA', '9', 'Tarde o mora grave', true), v2Kpi('SIN FACTURA', '4', 'Sin facturas registradas')])}
 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
  ${v2Kpi('MORA 1–15 DÍAS', '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 45.678.900</span><span>USD 1.250</span></span>', '4 clientes con saldo vencido')}
  ${v2Kpi('MORA 16–30 DÍAS', '<span>Gs. 12.345.600</span>', '3 clientes con saldo vencido')}
  ${v2Kpi('MORA CRÍTICA (+30 DÍAS)', '<span>Gs. 89.000.000</span>', '2 clientes con saldo vencido', true)}
  ${v2Kpi('DSO · DÍAS EN CALLE', '<span class="flex flex-wrap items-baseline gap-2"><span class="whitespace-nowrap tabular-nums">PYG 23 días</span><span class="whitespace-nowrap tabular-nums">USD 47 días</span></span>', 'Saldo pendiente sobre lo facturado del mes, por moneda')}
 </div>
 <div class="mb-4 flex flex-wrap items-end gap-3">
  <div class="flex flex-wrap gap-1" role="group" aria-label="Filtrar estado de cobro"><button class="choice active" type="button">Todos</button><button class="choice" type="button">Al día</button><button class="choice" type="button">Por vencer</button><button class="choice" type="button">En mora</button><button class="choice" type="button">Mora grave</button><button class="choice" type="button">Sin factura</button></div>
  <label class="grid w-full gap-1.5 sm:w-72"><span class="sr-only">Buscar cliente en cobranza</span><input type="search" class="w-full" placeholder="Buscar cliente…" autocomplete="off"></label>
  <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">9 de 111</p>
 </div>
 ${v2Grid({label: 'Cobranza por cliente', template: 'grid-cols-[minmax(11rem,1.5fr)_minmax(9rem,1.1fr)_6.5rem_9rem_6rem_8.5rem]', columns: ['Cliente', 'Estado', 'Vence', 'Antigüedad', 'Facturas', 'Pendiente'], minWidth: 'min-w-[58rem]', rows: [
  v2Row('grid-cols-[minmax(11rem,1.5fr)_minmax(9rem,1.1fr)_6.5rem_9rem_6rem_8.5rem]', `<div class="min-w-0"><strong class="block text-[13.5px] font-semibold text-fore">Industrias del Sur Sociedad Anónima</strong><small class="block truncate text-[11px] text-mute">PYG</small></div><div class="min-w-0">${chip('bad', '45 días de mora')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums font-semibold text-warn" title="18-sept-26">18-sept</span></div><div class="min-w-0">${chip('bad', '+30 días')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="3 facturas">3</span></div><div class="min-w-0 text-right"><span class="whitespace-nowrap font-semibold tabular-nums text-fore">Gs. 45.678.900</span></div>`),
  v2Row('grid-cols-[minmax(11rem,1.5fr)_minmax(9rem,1.1fr)_6.5rem_9rem_6rem_8.5rem]', `<div class="min-w-0"><strong class="block text-[13.5px] font-semibold text-fore">Grupo Comercial del Este SRL</strong><small class="block truncate text-[11px] text-mute">USD</small></div><div class="min-w-0">${chip('warn', 'Vence 24-sept')}</div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="24-sept-26">24-sept</span></div><div class="min-w-0"><span class="text-[11px] text-mute">Sin mora</span></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="1 factura">1</span></div><div class="min-w-0 text-right"><span class="whitespace-nowrap font-semibold tabular-nums text-fore">USD 12.500</span></div>`),
  v2Row('grid-cols-[minmax(11rem,1.5fr)_minmax(9rem,1.1fr)_6.5rem_9rem_6rem_8.5rem]', `<div class="min-w-0"><strong class="block text-[13.5px] font-semibold text-fore">Fundación Cultural Paraguaya</strong><small class="block truncate text-[11px] text-mute">PYG</small></div><div class="min-w-0">${chip('ok', 'Al día')}</div><div class="min-w-0"><span class="text-[11px] text-mute">Sin fecha</span></div><div class="min-w-0"><span class="text-[11px] text-mute">Sin mora</span></div><div class="min-w-0"><span class="text-[11px] text-mute">Sin facturas</span></div><div class="min-w-0 text-right"><span class="whitespace-nowrap text-[11px] text-mute">Sin saldo pendiente</span></div>`),
 ]})}
</section>`,
};

/* --------------- Previsión: resumen del mes (v2) ---------------------- */
const personnelRow = ({name, initials, base, override, total, negative = false, noBase = false, masked = false}) => `
<div class="${LIST_ROW} ${PERSON_COLS} forecast-person-row">
 ${cell(`<span class="forecast-person-who flex min-w-0 items-center gap-2"><span class="grid h-6 w-6 flex-none place-items-center overflow-hidden rounded-full bg-ink-700 text-[10px] font-semibold">${initials}</span><span class="min-w-0 truncate text-sm font-semibold leading-snug text-fore" title="${name}">${name}</span>${noBase ? '<small class="ml-2 flex-none text-[10px] font-bold uppercase tracking-wider text-mute">Sin salario fijo</small>' : ''}</span>`)}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${masked ? 'Sin dato' : base}</strong>`, 'forecast-person-base')}
 ${override ? cell(`<span class="whitespace-nowrap text-sm font-semibold tabular-nums text-warn">${override}</span>`) : '<span class="forecast-person-override is-empty hidden md:block" aria-hidden="true"></span>'}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums ${negative ? 'text-bad' : 'text-fore'}">${masked ? 'Sin dato' : total}</strong>`, 'forecast-person-total')}
 ${masked ? '<span aria-hidden="true"></span>' : `<span class="forecast-person-actions flex justify-end gap-1.5">${iconAction('<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>', `Editar salario: ${name}`)}${iconAction('<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/>', `Ajuste del mes: ${name}`)}${override ? iconAction('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', `Quitar ajuste del mes: ${name}`, 'bad') : ''}</span>`}
</div>`;
const plannedRow = ({category, kind, cadence, note, amount}) => `
<div role="row" class="${LIST_ROW} ${PLANNED_COLS}">
 ${cell(`<b class="font-semibold text-fore">${category}</b>${kind ? `<span class="ml-2 text-[10px] font-bold uppercase tracking-wider text-mute">${kind}</span>` : ''}<small class="ml-2 text-xs text-mute">${note}</small>`, 'text-sm')}
 ${cell(`<span class="text-sm text-fore">${cadence}</span>`)}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${amount}</strong>`, 'text-right')}
 ${cell(iconAction('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', `Quitar gasto planificado: ${category}`, 'bad'), 'flex justify-end')}
</div>`;
const realExpenseRow = ({category, kind, date, account, reference, createdBy, amount}) => `
<div role="row" class="${LIST_ROW} ${EXPENSE_COLS}">
 ${cell(`<b class="font-semibold text-fore">${category}${kind ? ` · ${kind}` : ''}</b><small class="ml-2 text-xs text-mute">${date} · ${account}${reference ? ` · ${reference}` : ''}${createdBy ? ` · registró ${createdBy}` : ''}</small>`, 'text-sm')}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${amount}</strong>`, 'text-right')}
 ${cell(iconAction('<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>', `Revertir gasto real: ${category}`, 'bad'), 'flex justify-end')}
</div>`;
const previsionResumen = {
  id: 'prevision-resumen',
  section: 'Previsión',
  surface: 'Ingresos vs gastos, resumen por moneda, personal y gastos (v2)',
  kind: 'workspace',
  lists: [
    {container: '.forecast-person-list', head: '[aria-hidden="true"]', row: '.forecast-person-row', label: 'Previsión · personal proyectado', rowHeight: [44, 52]},
    {container: '[role="table"][aria-label="Gastos planificados del mes"]', head: '[aria-hidden="true"]', row: '[role="row"]', label: 'Previsión · gastos planificados', rowHeight: [44, 52]},
    {container: '[role="table"][aria-label="Gastos reales del mes"]', head: '[aria-hidden="true"]', row: '[role="row"]', label: 'Previsión · gastos reales', rowHeight: [44, 52]},
  ],
  body: `
<section class="grid gap-4" aria-label="Previsión financiera">
 <div class="flex flex-wrap items-end justify-between gap-3">
  <div><p class="text-xs font-bold uppercase tracking-[.18em] text-fono-light">Planificación mensual</p><h2 class="text-lg font-semibold tracking-tight text-fore">Previsión financiera</h2></div>
  <div class="flex flex-wrap items-end gap-3">
   ${field('Mes', `<input type="month" class="${INPUT} w-44" value="2026-09">`)}
   <div class="grid gap-1.5"><span class="text-[11px] font-medium uppercase tracking-wider text-mute">Horizonte</span>${segmented(['1 mes', '3 meses', '6 meses', '12 meses'], 0)}</div>
  </div>
 </div>
 ${nota('neutro', 'Planificación mensual por moneda. No mezcla monedas ni convierte planes, facturas, cobros o gastos en hechos contables.')}
 <div class="${CARD} grid gap-3">
  <div class="grid gap-1"><h3 class="text-sm font-semibold text-fore">Ingresos vs gastos del mes</h3><p class="text-xs text-mute">Ingresos = emitido más aceptado sin factura. Gastos = personal, comisiones, gastos planificados y gastos reales. Resultado = ingresos menos gastos.</p></div>
  <div class="grid gap-3 lg:grid-cols-2">
   <article class="forecast-balance-card grid gap-2 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <span class="text-xs font-bold uppercase tracking-wider text-mute">PYG</span>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Ingresos</span>${barra(1691356890, 1691356890, 'ok', 'Ingresos en PYG')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">Gs. 1.691.356.890</strong></div>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Gastos</span>${barra(130894332, 1691356890, 'bad', 'Gastos en PYG')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">Gs. 130.894.332</strong></div>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Resultado</span>${barra(1560462558, 1691356890, 'fono', 'Resultado en PYG')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">Gs. 1.560.462.558</strong></div>
   </article>
   <article class="forecast-balance-card grid gap-2 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <span class="text-xs font-bold uppercase tracking-wider text-mute">USD</span>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Ingresos</span>${barra(14445, 18350, 'ok', 'Ingresos en USD')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">USD 14.445</strong></div>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Gastos</span>${barra(18350, 18350, 'bad', 'Gastos en USD')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">USD 18.350</strong></div>
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-2"><span class="text-xs font-medium text-mute">Resultado</span>${barra(3905, 18350, 'bad', 'Resultado en USD')}<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-bad">−USD 3.905</strong></div>
   </article>
  </div>
 </div>
 <div class="${CARD} grid gap-3">
  <h3 class="text-sm font-semibold text-fore">Resumen por moneda</h3>
  <div class="grid gap-3 lg:grid-cols-2">
   <article class="forecast-currency grid gap-1.5 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <span class="text-xs font-bold uppercase tracking-wider text-mute">PYG · planificación del mes</span>
    ${filaDato('Recurrente contratado', 'Gs. 250.000.000')}${filaDato('Emitido / facturado (12 facturas)', 'Gs. 1.234.567.890')}${filaDato('Cobrado', 'Gs. 987.654.321')}${filaDato('Saldo inicial de caja', 'Gs. 620.000.000')}${filaDato('Personal', 'Gs. 69.765.432')}${filaDato('Comisiones de clientes', 'Gs. 45.678.900')}${filaDato('Gastos planificados (4)', 'Gs. 12.000.000')}${filaDato('Gastos reales', 'Gs. 3.450.000')}${filaDato('Aceptado sin factura (7 presupuestos · 2 sin fecha)', 'Gs. 456.789.000')}
   </article>
   <article class="forecast-currency grid gap-1.5 rounded-xl border border-ink-600 bg-ink-900 p-4">
    <span class="text-xs font-bold uppercase tracking-wider text-mute">USD · planificación del mes</span>
    ${filaDato('Recurrente contratado', 'USD 12.500')}${filaDato('Emitido / facturado (3 facturas)', 'USD 14.445')}${filaDato('Cobrado', 'USD 9.800')}${filaDato('Saldo inicial de caja', 'USD 21.400')}${filaDato('Personal', 'USD 8.350')}${filaDato('Comisiones de clientes', 'USD 1.200')}${filaDato('Gastos planificados (2)', 'USD 4.300')}${filaDato('Gastos reales', 'USD 4.500')}${filaDato('Aceptado sin factura (1 presupuesto)', 'USD 2.400')}
   </article>
  </div>
 </div>
 <div class="${CARD} grid gap-3">
  <div class="grid gap-1"><h3 class="text-sm font-semibold text-fore">Personal proyectado</h3><p class="text-xs text-mute">Gasto esperado al cierre de 01-sept, sin pagos ni comisiones registrados.</p></div>
  <p role="status" class="text-xs text-mute">4 colaborador(es) activo(s) incluido(s).</p>
  <div class="grid gap-4">
   <div class="forecast-personnel-card grid gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-2"><span class="text-xs font-bold uppercase tracking-wider text-mute">PYG · gasto esperado al cierre</span><strong class="whitespace-nowrap text-lg font-semibold tabular-nums text-fore">Gs. 69.765.432</strong></div>
    <div class="flex flex-wrap gap-x-6 gap-y-1 text-xs text-mute"><span>Salario base (3): <b class="font-semibold tabular-nums text-fore">Gs. 68.565.432</b></span><span>Ajustes del mes (1): <b class="font-semibold tabular-nums text-fore">Gs. 1.200.000</b></span></div>
    ${listWrap('56rem', `<div class="forecast-person-list" role="table" aria-label="Personal proyectado">
     <div class="${LIST_HEAD} ${PERSON_COLS}" aria-hidden="true"><span>Persona</span><span>Salario base</span><span>Ajuste del mes</span><span>Cierre del mes</span><span class="text-right">Acciones</span></div>
     ${personnelRow({name: 'Ana López Fernández de la Cruz', initials: 'AL', base: 'Gs. 24.500.000', override: 'Gs. 1.200.000', total: 'Gs. 25.700.000'})}
     ${personnelRow({name: 'Bruno Villalba', initials: 'BV', base: 'Gs. 32.000.000', override: '', total: 'Gs. 32.000.000'})}
     ${personnelRow({name: 'Salario variable sin base fija', initials: 'SV', base: 'Gs. 0', override: 'Gs. 2.065.432', total: 'Gs. 2.065.432', noBase: true})}
     ${personnelRow({name: 'Salario enmascarado por salary.view', initials: 'SM', base: '', override: '', total: '', masked: true})}
    </div>`)}
   </div>
  </div>
 </div>
 <div class="${CARD} grid gap-4">
  <div class="grid gap-3">
   <div class="grid gap-1"><h3 class="text-sm font-semibold text-fore">Gastos planificados · 01-sept</h3><p class="text-xs text-mute">Esto es planificación interna; no registra un pago, una factura ni una cuenta por pagar.</p></div>
   <div class="grid gap-3 sm:grid-cols-2">
    <article class="forecast-planned-card grid gap-1 rounded-xl border border-ink-600 bg-ink-900 p-4"><span class="text-xs font-bold uppercase tracking-wider text-mute">PYG · total planificado</span><strong class="text-xl font-semibold tabular-nums text-fore">Gs. 12.000.000</strong><small class="planned-expenses-kinds text-xs text-mute">2 fijos · 2 variables</small></article>
    <article class="forecast-planned-card grid gap-1 rounded-xl border border-ink-600 bg-ink-900 p-4"><span class="text-xs font-bold uppercase tracking-wider text-mute">USD · total planificado</span><strong class="text-xl font-semibold tabular-nums text-fore">USD 4.300</strong><small class="planned-expenses-kinds text-xs text-mute">1 fijos · 1 variables</small></article>
   </div>
  </div>
  ${listWrap('44rem', `<div role="table" aria-label="Gastos planificados del mes">
   <div class="${LIST_HEAD} ${PLANNED_COLS}" aria-hidden="true"><span>Gasto</span><span>Cadencia</span><span class="text-right">Monto</span><span class="text-right">Acciones</span></div>
   ${plannedRow({category: 'Herramientas', kind: 'Fijo', cadence: 'Recurrente', note: 'Licencias de edición y almacenamiento en la nube', amount: 'Gs. 9.000.000'})}
   ${plannedRow({category: 'Marketing', kind: 'Variable', cadence: 'Solo este mes', note: '', amount: 'USD 4.300'})}
   ${plannedRow({category: 'Administración', kind: 'Fijo', cadence: 'Recurrente', note: 'Honorarios contables mensuales', amount: 'Gs. 3.000.000'})}
  </div>`)}
 </div>
 <div class="${CARD} grid gap-4">
  <div class="grid gap-3">
   <div class="grid gap-1"><h3 class="text-sm font-semibold text-fore">Gastos reales del mes · 01-sept</h3><p class="text-xs text-mute">Registra el pago contra una cuenta: descuenta el saldo y queda en el historial de movimientos. Revertir acredita de nuevo la cuenta.</p></div>
  </div>
  ${listWrap('40rem', `<div role="table" aria-label="Gastos reales del mes">
   <div class="${LIST_HEAD} ${EXPENSE_COLS}" aria-hidden="true"><span>Gasto</span><span class="text-right">Monto</span><span class="text-right">Acciones</span></div>
   ${realExpenseRow({category: 'Herramientas', kind: 'Fijo', date: '12-sept', account: 'Banco Regional — Operativa', reference: 'Licencia Adobe Creative Cloud anual', createdBy: 'finanzas@estudio.com.py', amount: 'Gs. 3.450.000'})}
   ${realExpenseRow({category: 'Marketing', kind: 'Variable', date: '10-sept', account: 'Tarjeta corporativa USD', reference: 'Campaña Meta Ads', createdBy: '', amount: 'USD 4.500'})}
  </div>`)}
  ${aviso('error', 'No se pudo revertir el gasto real: la cuenta no tiene saldo suficiente para la corrección.')}
 </div>
 ${nota('warn', '2 presupuesto(s) aceptado(s) sin fecha: excluidos del total mensual.')}
</section>`,
};

/* --------------- Previsión: contratos vs facturación (v2) ------------- */
const contractedRow = ({name, currency, endsOn, invoiceRequired, contracted, invoiced, missing}) => `
<div role="row" class="${LIST_ROW} ${CONTRACT_COLS}">
 ${cell(`<b class="font-semibold text-fore">${name}</b><small class="ml-2 whitespace-nowrap text-xs text-mute">${currency}${endsOn ? ` · hasta ${endsOn}` : ''}</small>`, 'truncate text-sm')}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${contracted}</strong>`, 'text-right')}
 ${cell(`<strong class="whitespace-nowrap text-sm font-semibold tabular-nums text-fore">${invoiced}</strong>`, 'text-right')}
 ${cell(missing ? chip('bad', 'Sin factura', 'Contrato con facturación requerida y sin factura emitida en el mes') : chip('ok', 'Al día'), 'flex justify-end')}
</div>`;
const previsionContratos = {
  id: 'prevision-contratos',
  section: 'Previsión',
  surface: 'Contratos vs facturación del mes (v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Contratos vigentes contra facturación"]', head: '[aria-hidden="true"]', row: '[role="row"]', label: 'Previsión · contratos vs facturación', rowHeight: [44, 52]},
  ],
  body: `
<div class="${CARD} grid gap-3">
 <h3 class="text-sm font-semibold text-fore">Contratos vs facturación del mes</h3>
 ${listWrap('56rem', `<div role="table" aria-label="Contratos vigentes contra facturación">
  <div class="${LIST_HEAD} ${CONTRACT_COLS}" aria-hidden="true"><span>Cliente</span><span class="text-right">Contratado</span><span class="text-right">Facturado</span><span class="text-right">Estado</span></div>
  ${contractedRow({name: 'Industrias del Sur Sociedad Anónima', currency: 'PYG', endsOn: '31-dic-26', invoiceRequired: true, contracted: 'Gs. 45.000.000', invoiced: 'Gs. 90.000.000', missing: false})}
  ${contractedRow({name: 'Grupo Comercial del Este SRL', currency: 'USD', endsOn: '', invoiceRequired: true, contracted: 'USD 12.500', invoiced: 'USD 0', missing: true})}
  ${contractedRow({name: 'Fundación Cultural Paraguaya', currency: 'PYG', endsOn: '30-nov-26', invoiceRequired: false, contracted: 'Gs. 8.500.000', invoiced: 'Gs. 8.500.000', missing: false})}
 </div>`)}
</div>`,
};

/* --------------- Previsión: proyección multi-mes (v2) ----------------- */
const projectionTable = (currency, rows) => `
<div class="grid gap-2">
 <span class="text-xs font-bold uppercase tracking-wider text-mute">${currency} · proyección acumulada</span>
 ${tableBlock([['Mes'], ['Proyectado', 'right'], ['Resultado', 'right']], rows.map(([month, cash, result]) => [[month], [`<span class="whitespace-nowrap tabular-nums${cash.startsWith('−') ? ' text-bad' : ''}">${cash}</span>`, 'right'], [`<span class="whitespace-nowrap tabular-nums${result.startsWith('−') ? ' text-bad' : ''}">${result}</span>`, 'right']]))}
</div>`;
const previsionProyeccion = {
  id: 'prevision-proyeccion',
  section: 'Previsión',
  surface: 'Proyección de caja y resultado (6 meses, v2)',
  kind: 'workspace',
  body: `
<div class="${CARD} grid gap-3">
 <h3 class="text-sm font-semibold text-fore">Proyección de caja y resultado · 6 meses</h3>
 <div class="grid gap-4">
  ${projectionTable('PYG', [['01-sept', 'Gs. 620.000.000', 'Gs. 45.000.000'], ['01-oct', 'Gs. 650.000.000', '−Gs. 30.000.000'], ['01-nov', 'Gs. 700.000.000', 'Gs. 50.000.000'], ['01-dic', 'Gs. 1.100.000.000', 'Gs. 400.000.000'], ['01-ene', 'Gs. 1.250.000.000', 'Gs. 150.000.000'], ['01-feb', 'Gs. 1.260.000.000', '−Gs. 90.000.000']])}
  ${projectionTable('USD', [['01-sept', 'USD 21.400', '−USD 3.905'], ['01-oct', 'USD 18.200', '−USD 3.200'], ['01-nov', 'USD 22.000', 'USD 3.800'], ['01-dic', 'USD 26.500', 'USD 4.500'], ['01-ene', 'USD 27.100', 'USD 600'], ['01-feb', 'USD 27.100', '']])}
 </div>
</div>`,
};

/* --------------- Informes: indicadores + gráfico (v2) ----------------- */
const informesIndicadores = {
  id: 'informes-indicadores',
  section: 'Informes',
  surface: 'Indicadores, gráfico y visitantes (v2)',
  kind: 'workspace',
  body: `
<section class="grid gap-4" aria-label="Reportes de la agencia">
 <div class="grid gap-1"><p class="text-xs font-bold uppercase tracking-[.18em] text-fono-light">Informes</p><h2 class="text-lg font-semibold tracking-tight text-fore">Evolución mensual</h2><p class="text-xs text-mute">Importes registrados, no utilidad ni rentabilidad. Las monedas se consultan por separado.</p></div>
 <div class="${CARD} flex flex-wrap items-center justify-between gap-4" role="region" aria-label="Visitantes en vivo del landing">
  <div class="grid gap-1"><h3 class="text-sm font-semibold text-fore">Visitantes en vivo</h3><p class="text-xs text-mute">Personas actualmente en el landing de Scale OS</p></div>
  <div class="text-right"><strong class="block text-2xl font-semibold tabular-nums text-ok">128</strong><span class="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-ok"><span class="h-2 w-2 rounded-full bg-ok" aria-hidden="true"></span>↑ +12%</span></div>
 </div>
 <div class="flex flex-wrap items-end gap-3">
  ${field('Mes a consultar', `<input type="month" class="${INPUT} w-44" value="2026-09">`)}
  <div class="grid gap-1.5"><span class="text-[11px] font-medium uppercase tracking-wider text-mute">Histórico</span>${segmented(['Últimos 6 meses', 'Últimos 12 meses', 'Últimos 24 meses'], 1, 'Meses de histórico')}</div>
  ${field('Moneda', `<div class="w-40">${selectCustom('Moneda', 'PYG', 'informes-currency')}</div>`)}
 </div>
 ${nota('neutro', 'Datos al 10 sept 26 · 12:00 (hora de Asunción). Histórico confiable desde: 01 ene 20 · 00:00.')}
 <div class="flex flex-wrap gap-2"><button type="button" class="${BUTTON_OUTLINE}">Exportar histórico CSV · PYG</button><button type="button" class="${BUTTON_OUTLINE}">Exportar PDF · PYG</button></div>
 <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
  ${kpi('Clientes activos', '128', '+12 · +10,34 %')}
  ${kpi('Clientes incorporados', '14', '+3 · +27,27 %')}
  ${kpi('Bajas de actividad', '5', '-2 · -28,57 %')}
  ${kpi('Retención', '96 %', 'Diferencia en puntos porcentuales / relativa: +1 · +1,05 %')}
  ${kpi('Facturado · incluye impuestos', 'Gs. 1.234.567.890', '+123.456.789 · +11,11 %')}
  ${kpi('Cobrado · neto de reversiones', 'Gs. 987.654.321', '+87.654.321 · +9,74 %')}
  ${kpi('Ticket promedio por factura', 'USD 9.007.199.254.740.993,1234', '+100,25 · +0,01 %')}
  ${kpi('Facturado promedio por cliente facturado', 'Gs. 9.650.000', '-350.000 · -3,50 %')}
 </div>
 <div class="reports-chart overflow-x-auto" role="img" aria-label="Facturado y cobrado mensual en PYG">
  <div class="flex min-w-full items-end gap-2 pb-1">
   ${[['01-may', 62, 48, false], ['01-jun', 78, 55, false], ['01-jul', 100, 70, false], ['01-ago', 84, 66, false], ['01-sept', 90, 74, false], ['01-oct', 40, 30, true]].map(([month, invoiced, collected, partial]) => `<figure class="flex min-w-10 flex-1 flex-col items-center gap-1.5"><div class="flex h-[120px] items-end justify-center gap-[3px]"><span class="w-2.5 rounded-t bg-fono-light${partial ? ' opacity-50' : ''}" title="${month} · Facturado PYG 1.234.567.890" style="height:${invoiced}%"></span><span class="w-2.5 rounded-t bg-ok${partial ? ' opacity-50' : ''}" title="${month} · Cobrado PYG 987.654.321" style="height:${collected}%"></span></div><figcaption class="whitespace-nowrap text-[10px] text-mute">${month}${partial ? ' · parcial' : ''}</figcaption></figure>`).join('')}
  </div>
 </div>
 <p class="text-xs text-mute">Barras: facturado (violeta) y cobrado (verde) por mes, en la moneda seleccionada. Los meses parciales se atenúan; la escala es relativa al valor máximo cargado, sin mezclar monedas.</p>
</section>`,
};

/* --------------- Informes: comparativa, distribuciones e histórico (v2) */
const informesTablas = {
  id: 'informes-tablas',
  section: 'Informes',
  surface: 'Comparativa, distribuciones e histórico mensual (v2)',
  kind: 'workspace',
  body: `
<section class="grid gap-4" aria-label="Reportes de la agencia">
 <div class="${CARD} grid gap-3">
  <h3 class="text-sm font-semibold text-fore">Comparativa del período visible contra el anterior</h3>
  <p class="text-xs text-mute">Período visible: 01-oct – 01-sept · período anterior: 01-oct – 01-sept (12 meses por período).</p>
  ${tableBlock([['Métrica'], ['Período visible'], ['Período anterior'], ['Variación']], [
    [['Clientes activos (último mes con datos)'], ['128'], ['116'], ['+12 · +10,34 %']],
    [['Clientes incorporados (suma del período)'], ['14'], ['11'], ['+3 · +27,27 %']],
    [['Bajas de actividad (suma del período)'], ['5'], ['7'], ['-2 · -28,57 %']],
    [['Facturación (suma del período)'], ['PYG 1.234.567.890'], ['PYG 1.111.111.101'], ['+123.456.789 · +11,11 %']],
    [['Cobros (suma del período)'], ['PYG 987.654.321'], ['PYG 899.999.999'], ['+87.654.321 · +9,74 %']],
    [['Ticket promedio por factura'], ['PYG 2.469.135,78'], ['PYG 2.222.222,20'], ['+246.913,58 · +11,11 %']],
  ])}
 </div>
 <div class="grid gap-4 lg:grid-cols-2">
  <div class="${CARD} grid gap-2">
   <h4 class="text-sm font-semibold text-fore">Tipos de clientes activos</h4>
   <p class="text-xs text-mute">Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>
   <ul class="grid gap-2">
    <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><span class="min-w-0 text-fore">Empresa</span><strong class="whitespace-nowrap tabular-nums text-fore">96 · 75,0 %</strong>${barra(75, 100, 'fono', 'Empresa: 75,0 %')}</li>
    <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><span class="min-w-0 text-fore">Sin clasificar</span><strong class="whitespace-nowrap tabular-nums text-fore">32 · 25,0 %</strong>${barra(25, 100, 'fono', 'Sin clasificar: 25,0 %')}</li>
   </ul>
  </div>
  <div class="${CARD} grid gap-2">
   <h4 class="text-sm font-semibold text-fore">Planes por cantidad de clientes activos</h4>
   <p class="text-xs text-mute">Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p>
   <ul class="grid gap-2">
    <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><span class="min-w-0 text-fore">Plan Integral de Producción Audiovisual</span><strong class="whitespace-nowrap tabular-nums text-fore">74 · 57,8 %</strong>${barra(57.8, 100, 'fono', 'Plan Integral: 57,8 %')}</li>
    <li class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><span class="min-w-0 text-fore">Sin plan registrado</span><strong class="whitespace-nowrap tabular-nums text-fore">54 · 42,2 %</strong>${barra(42.2, 100, 'fono', 'Sin plan: 42,2 %')}</li>
   </ul>
  </div>
 </div>
 <div class="grid gap-2">
  <p class="text-sm font-semibold text-fore">Evolución mensual · PYG</p>
  <p class="text-xs text-mute">“Sin datos” no significa cero.</p>
  ${tableBlock([['Mes'], ['Activos', 'right'], ['Incorporados', 'right'], ['Bajas de actividad', 'right'], ['Retención %', 'right'], ['Antigüedad (días)', 'right'], ['Fechas conocidas', 'right'], ['Facturado con impuestos', 'right'], ['Cobrado neto', 'right'], ['Facturas', 'right'], ['Clientes facturados', 'right'], ['Ticket por factura', 'right'], ['Promedio por cliente facturado', 'right']], [
    [['<span class="whitespace-nowrap">2026-09</span>'], ['128', 'right'], ['14', 'right'], ['5', 'right'], ['96', 'right'], ['412', 'right'], ['120', 'right'], ['PYG 1.234.567.890', 'right'], ['PYG 987.654.321', 'right'], ['500', 'right'], ['104', 'right'], ['PYG 2.469.135,78', 'right'], ['PYG 11.870.845,10', 'right']],
    [['<span class="whitespace-nowrap">2026-08</span>'], ['116', 'right'], ['11', 'right'], ['7', 'right'], ['94', 'right'], ['398', 'right'], ['109', 'right'], ['PYG 1.111.111.101', 'right'], ['PYG 899.999.999', 'right'], ['500', 'right'], ['99', 'right'], ['PYG 2.222.222,20', 'right'], ['PYG 11.223.344,45', 'right']],
    [['<span class="whitespace-nowrap">2026-07</span>'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['0', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right'], ['Sin datos', 'right']],
  ])}
 </div>
 <p class="text-xs text-mute">Comparaciones contra el mes calendario anterior: diferencia absoluta y variación porcentual sobre el valor absoluto anterior. Sin porcentaje cuando la base es cero; sin comparación si falta información o alguno de los meses es parcial. La antigüedad usa solo fechas de inicio conocidas.</p>
</section>`,
};

/* --------------- Comisiones: liquidación (sección v2) ------------------ */
const comisionesLiquidacion = {
  id: 'comisiones-liquidacion',
  section: 'Finanzas',
  surface: 'Liquidación del mes por colaborador (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Comisiones del mes por colaborador"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Comisiones · liquidación', rowHeight: [44, 52]},
  ],
  body: `
<section class="grid gap-4" aria-label="Comisiones y referidos">
 <header class="mb-4 flex flex-wrap items-start justify-between gap-3">
  <div class="min-w-0"><p class="mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute">Finanzas</p><h1 class="text-2xl font-bold tracking-tight text-fore">Comisiones y referidos</h1><p class="mt-1 text-sm text-mute">Liquidación del mes, comisiones por venta o recomendación, descuentos y egresos registrados.</p></div>
  <div class="flex flex-wrap items-center gap-2"><button class="primary" type="button">+ Comisión</button></div>
 </header>
 ${v2KpiStrip([v2Kpi('ESPERADO · 01-sept', '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 250.000.000</span><span>USD 12.500</span></span>', 'Acuerdos comerciales vigentes con comisión asignada'), v2Kpi('PAGADO · 01-sept', '<span>Gs. 45.678.900</span>', 'Comisiones pagadas del mes'), v2Kpi('PENDIENTE · 01-sept', '<span>Gs. 12.000.000</span>', 'Registradas o aprobadas sin pagar', true)])}
 <section class="${v2Card}" aria-labelledby="commissions-settlement-title">
  <div class="flex flex-wrap items-center justify-between gap-2">
   <div class="min-w-0"><h3 id="commissions-settlement-title" class="text-[17px] font-semibold tracking-tight text-fore">Liquidación del mes</h3><p class="mt-1 text-xs text-mute">Esperado: acuerdos vigentes. Registrado, aprobado, pagado y pendiente: comisiones del mes según la factura vinculada.</p></div>
   <label class="grid gap-1.5"><span class="text-[11px] font-medium uppercase tracking-wider text-mute">Mes</span><input type="month" class="w-44" value="2026-09"></label>
  </div>
  ${v2Grid({label: 'Comisiones del mes por colaborador', template: 'grid-cols-[minmax(12rem,1.6fr)_9rem_9rem_9rem_9rem_9rem]', columns: ['Colaborador', 'Esperado', 'Registrado', 'Aprobado', 'Pagado', 'Pendiente'], minWidth: 'min-w-[62rem]', rows: [
   v2Row('grid-cols-[minmax(12rem,1.6fr)_9rem_9rem_9rem_9rem_9rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Ana López Fernández de la Cruz">Ana López Fernández de la Cruz</b><small class="block truncate text-[11px] text-mute">PYG</small></div><div class="min-w-0 text-right">${moneyCell('Gs. 150.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 50.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 25.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 10.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 15.000.000')}</div>`),
   v2Row('grid-cols-[minmax(12rem,1.6fr)_9rem_9rem_9rem_9rem_9rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Luis Giménez">Luis Giménez</b><small class="block truncate text-[11px] text-mute">PYG</small></div><div class="min-w-0 text-right">${moneyCell('Gs. 100.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 10.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 10.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 10.000.000')}</div><div class="min-w-0 text-right">${moneyCell('Gs. 0')}</div>`),
   v2Row('grid-cols-[minmax(12rem,1.6fr)_9rem_9rem_9rem_9rem_9rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Sin colaborador vinculado">Sin colaborador vinculado</b><small class="block truncate text-[11px] text-mute">USD</small></div><div class="min-w-0 text-right">${moneyCell('USD 300')}</div><div class="min-w-0 text-right">${moneyCell('USD 150')}</div><div class="min-w-0 text-right">${moneyCell('USD 0')}</div><div class="min-w-0 text-right">${moneyCell('USD 0')}</div><div class="min-w-0 text-right">${moneyCell('USD 150')}</div>`),
  ]})}
 </section>
</section>`,
};

/* --------------- Comisiones: comisiones y referidos (sección v2) ------- */
const comisionesLista = {
  id: 'comisiones-lista',
  section: 'Finanzas',
  surface: 'Comisiones por venta o referido (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Comisiones y referidos"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Comisiones · lista', rowHeight: [44, 52]},
  ],
  body: `
<section class="${v2Card}" aria-labelledby="commissions-list-title">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <div class="min-w-0"><h3 id="commissions-list-title" class="text-[17px] font-semibold tracking-tight text-fore">Comisiones y referidos</h3><p class="mt-1 text-xs text-mute">Los porcentajes se calculan al registrar la comisión; los cobros posteriores no modifican acuerdos ya registrados.</p></div>
  <div class="flex flex-wrap gap-1"><button class="choice active" type="button">Todas</button><button class="choice" type="button">Pendiente</button><button class="choice" type="button">Aprobada</button><button class="choice" type="button">Pagada</button><button class="choice" type="button">Cancelada</button></div>
 </div>
 ${v2Grid({label: 'Comisiones y referidos', template: 'grid-cols-[minmax(26rem,1.5fr)_7rem_20rem_minmax(17rem,1.2fr)_11rem]', columns: ['Beneficiario', 'Estado', 'Importe', 'Factura y vencimiento', 'Acciones'], minWidth: 'min-w-[78rem]', rows: [
  v2Row('grid-cols-[minmax(26rem,1.5fr)_7rem_20rem_minmax(17rem,1.2fr)_11rem]', `<div class="flex min-w-0 items-center gap-2"><b class="truncate text-[13.5px] font-semibold leading-snug text-fore" title="Ana López Fernández de la Cruz">Ana López Fernández de la Cruz</b>${chipMute('Venta')}<small class="truncate text-[11px] text-mute" title="Vinculada a Ana López · alta 12-sept">Vinculada a Ana López · alta 12-sept</small></div><div class="min-w-0">${chip('warn', 'Pendiente')}</div><div class="flex min-w-0 items-baseline justify-end gap-2">${moneyCell('Gs. 45.678.900')}<small class="truncate text-[11px] text-mute" title="10.00% sobre Gs. 456.789.000 facturados al registrar">10.00% sobre Gs. 456.789.000 facturados al registrar</small></div><div class="flex min-w-0 items-baseline gap-2 text-[11.5px] text-mute"><span class="truncate text-fore" title="F-2026-0417 · Acuerdo de temporada alta">F-2026-0417</span><span class="whitespace-nowrap tabular-nums font-semibold text-warn" title="18-sept-26">Vence 18-sept</span></div><div class="flex min-w-0 flex-wrap items-center justify-end gap-1"><button class="text-button positive" type="button">Aprobar</button><button class="text-button danger" type="button">Cancelar</button></div>`),
  v2Row('grid-cols-[minmax(26rem,1.5fr)_7rem_20rem_minmax(17rem,1.2fr)_11rem]', `<div class="flex min-w-0 items-center gap-2"><b class="truncate text-[13.5px] font-semibold leading-snug text-fore" title="Luis Giménez">Luis Giménez</b>${chipMute('Referido')}<small class="truncate text-[11px] text-mute" title="Vinculada a Luis Giménez · alta 08-sept">Vinculada a Luis Giménez · alta 08-sept</small></div><div class="min-w-0">${chip('info', 'Aprobada')}</div><div class="flex min-w-0 items-baseline justify-end gap-2">${moneyCell('USD 1.250,75')}<small class="truncate text-[11px] text-mute" title="Importe fijo">Importe fijo</small></div><div class="flex min-w-0 items-baseline gap-2 text-[11.5px] text-mute"><span class="truncate text-fore" title="F-2026-0390">F-2026-0390</span></div><div class="flex min-w-0 flex-wrap items-center justify-end gap-1"><button class="text-button" type="button">Registrar pago</button><button class="text-button danger" type="button">Cancelar</button></div>`),
  v2Row('grid-cols-[minmax(26rem,1.5fr)_7rem_20rem_minmax(17rem,1.2fr)_11rem]', `<div class="flex min-w-0 items-center gap-2"><b class="truncate text-[13.5px] font-semibold leading-snug text-fore" title="Sofía Benítez">Sofía Benítez</b>${chipMute('Venta')}<small class="truncate text-[11px] text-mute" title="Sin colaborador vinculado · alta 02-sept">Sin colaborador vinculado · alta 02-sept</small></div><div class="min-w-0">${chip('ok', 'Pagada')}</div><div class="flex min-w-0 items-baseline justify-end gap-2">${moneyCell('Gs. 12.000.000')}<small class="truncate text-[11px] text-mute" title="5% sobre Gs. 240.000.000 cobrados al registrar">5% sobre Gs. 240.000.000 cobrados al registrar</small></div><div class="min-w-0 text-[11.5px] text-mute"><span class="block truncate text-fore" title="Sin factura vinculada · Acuerdo especial de temporada alta">Sin factura vinculada</span></div><div class="flex min-w-0 flex-wrap items-center justify-end gap-1"><span class="text-[11px] text-mute">Sin acciones</span></div>`),
 ]})}
</section>`,
};

/* --------------- Comisiones: descuentos y pagos (sección v2) ----------- */
const comisionesPagos = {
  id: 'comisiones-pagos',
  section: 'Finanzas',
  surface: 'Descuentos por referido y pagos registrados (sección v2)',
  kind: 'workspace',
  lists: [
    {container: '[role="table"][aria-label="Descuentos por referido"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Comisiones · descuentos', rowHeight: [44, 52]},
    {container: '[role="table"][aria-label="Pagos registrados"]', head: '[role="table"] > div > [role="row"]', row: '[role="rowgroup"] > [role="row"]', label: 'Comisiones · pagos', rowHeight: [44, 52]},
  ],
  body: `
<section class="grid gap-4">
 <section class="${v2Card}" aria-labelledby="commissions-discounts-title">
  <div class="flex flex-wrap items-center justify-between gap-2">
   <div class="min-w-0"><h3 id="commissions-discounts-title" class="text-[17px] font-semibold tracking-tight text-fore">Descuentos por referido</h3><p class="mt-1 text-xs text-mute">Se descuentan del saldo pendiente de la factura y conservan el motivo y su historial de reversiones.</p></div>
   <button class="secondary" type="button">+ Nuevo descuento</button>
  </div>
  ${v2Grid({label: 'Descuentos por referido', template: 'grid-cols-[minmax(16rem,1.4fr)_minmax(22rem,1.5fr)_7rem_9rem_9rem]', columns: ['Referido', 'Factura y cliente', 'Monto', 'Estado', 'Acciones'], minWidth: 'min-w-[64rem]', rows: [
   v2Row('grid-cols-[minmax(16rem,1.4fr)_minmax(22rem,1.5fr)_7rem_9rem_9rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore">Estudio Contable Ramírez</b><small class="block truncate text-[11px] text-mute">Alta 14-sept</small></div><div class="min-w-0 truncate text-[11.5px] text-mute" title="F-2026-0417 · Industrias del Sur · recomendación directa"><span class="text-fore">F-2026-0417</span><span> · Industrias del Sur · recomendación directa</span></div><div class="min-w-0 text-right">${moneyCell('Gs. 2.000.000')}</div><div class="min-w-0">${chip('ok', 'Aplicado')}</div><div class="flex min-w-0 items-center justify-end gap-1"><button class="text-button warn" type="button">${undoIcon(14)}Revertir</button></div>`),
   v2Row('grid-cols-[minmax(16rem,1.4fr)_minmax(22rem,1.5fr)_7rem_9rem_9rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore">María González</b><small class="block truncate text-[11px] text-mute">Sin fecha de alta</small></div><div class="min-w-0 truncate text-[11.5px] text-mute" title="F-2026-0390 · Grupo Comercial · acuerdo comercial anual"><span class="text-fore">F-2026-0390</span><span> · Grupo Comercial · acuerdo comercial anual</span></div><div class="min-w-0 text-right">${moneyCell('USD 250')}</div><div class="min-w-0">${chipMute('Revertido')}</div><div class="flex min-w-0 items-center justify-end gap-1"></div>`),
  ]})}
 </section>
 <section class="${v2Card}" aria-labelledby="commissions-payouts-title">
  <div class="min-w-0"><h3 id="commissions-payouts-title" class="text-[17px] font-semibold tracking-tight text-fore">Pagos registrados</h3><p class="mt-1 text-xs text-mute">Cada pago descuenta el saldo de la cuenta elegida y conserva quién lo registró.</p></div>
  ${v2Grid({label: 'Pagos registrados', template: 'grid-cols-[minmax(24rem,1.6fr)_6.5rem_minmax(10rem,1.2fr)_minmax(10rem,1.1fr)_8.5rem]', columns: ['Egreso', 'Fecha', 'Cuenta', 'Registró', 'Monto'], minWidth: 'min-w-[70rem]', rows: [
   v2Row('grid-cols-[minmax(24rem,1.6fr)_6.5rem_minmax(10rem,1.2fr)_minmax(10rem,1.1fr)_8.5rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Ana López Fernández de la Cruz">Ana López Fernández de la Cruz</b><small class="block truncate text-[11px] text-mute" title="Comisión F-2026-0390 · agosto 2026">Comisión F-2026-0390 · agosto 2026</small></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="20-sept-26">20-sept</span></div><div class="min-w-0 text-[11.5px] text-fore">Banco Regional — Operativa</div><div class="min-w-0 text-[11.5px] text-mute">finanzas@estudio.com.py</div><div class="min-w-0 text-right">${moneyCell('Gs. 45.678.900')}</div>`),
   v2Row('grid-cols-[minmax(24rem,1.6fr)_6.5rem_minmax(10rem,1.2fr)_minmax(10rem,1.1fr)_8.5rem]', `<div class="min-w-0"><b class="block truncate text-[13.5px] font-semibold text-fore" title="Luis Giménez">Luis Giménez</b><small class="block truncate text-[11px] text-mute">Sin referencia</small></div><div class="min-w-0"><span class="whitespace-nowrap tabular-nums text-fore" title="18-sept-26">18-sept</span></div><div class="min-w-0 text-[11.5px] text-fore">Tarjeta corporativa USD</div><div class="min-w-0 text-[11.5px] text-mute">Sin registrar</div><div class="min-w-0 text-right">${moneyCell('USD 1.250,75')}</div>`),
  ]})}
 </section>
</section>`,
};

export default [
  finanzasCuentas,
  finanzasConciliacion,
  finanzasTransferencias,
  finanzasCobros,
  moraCobranzas,
  previsionResumen,
  previsionContratos,
  previsionProyeccion,
  informesIndicadores,
  informesTablas,
  comisionesLiquidacion,
  comisionesLista,
  comisionesPagos,
];
