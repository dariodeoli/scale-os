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
const PERSON_COLS = 'grid-cols-[minmax(10rem,1.2fr)_minmax(7rem,.9fr)_minmax(8rem,.9fr)_minmax(8rem,.9fr)_6.5rem]';
const CONTRACT_COLS = 'grid-cols-[minmax(0,1fr)_9rem_9rem_9rem]';
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


/* --------------- Finanzas: cuentas (cuadrícula) ---------------------- */
const finanzasCuentas = {
  id: 'finanzas-cuentas',
  section: 'Finanzas',
  surface: 'Cuentas por moneda (cuadrícula)',
  kind: 'workspace',
  grids: [{container: '.finance-account-grid', card: '.finance-account-card', label: 'Finanzas · cuentas', minHeight: 200}],
  body: `
<div class="kpi-strip" aria-label="Resumen financiero">
 <article class="kpi-card tone-brand">
  <p class="eyebrow">DISPONIBLE</p>
  <div class="kpi-amounts"><span>Gs. 1.987.654.321</span><span>USD 987.654</span></div>
  <small>Saldo actual de cuentas activas por moneda</small>
 </article>
 <article class="kpi-card tone-warning">
  <p class="eyebrow">POR COBRAR</p>
  <div class="kpi-amounts"><span>Gs. 1.234.567.890</span><span>USD 12.345</span></div>
  <small>Facturas emitidas o parciales con saldo pendiente</small>
 </article>
 <article class="kpi-card tone-blue">
  <p class="eyebrow">FACTURAS CON SALDO</p>
  <strong>12</strong>
  <small>18 facturas cargadas</small>
 </article>
</div>
<section class="finance-grid">
 <section class="panel">
  ${financePanelHeading('DISPONIBILIDAD', 'Cuentas', `<div class="inline-actions"><button class="text-button" type="button">${plusIcon(14)}+ Cuenta</button><button class="text-button" type="button">${transferIcon(14)}Transferir</button></div>`)}
  <div class="finance-account-grid">
   ${financeAccountCard({
     name: 'Banco Continental S.A.E.C.A. · Cuenta corriente operativa',
     type: 'Bancaria',
     currency: 'PYG',
     balance: 'Gs. 1.987.654.321',
     number: '0012-34567890-01',
     holder: 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.',
   })}
   ${financeAccountCard({name: 'Caja Chica Estudio', type: 'Efectivo', currency: 'PYG', balance: 'Gs. 12.345.678', holder: 'Administración'})}
   ${financeAccountCard({
     name: 'Wise Business · Cuenta internacional USD',
     type: 'Digital',
     currency: 'USD',
     balance: 'USD 987.654,32',
     number: '8310-2299-4410',
     custodian: 'tesoreria.internacional@estudiocomunicacionparaguay.com.py',
   })}
   ${financeAccountCard({
     name: 'Fondo de inversión a plazo fijo · Banco Atlas',
     type: 'Inversión',
     currency: 'PYG',
     balance: 'Gs. 0',
     number: '7890-11223344-00',
     active: false,
   })}
  </div>
 </section>
</section>`,
};

/* --------------- Finanzas: movimientos (listas) ---------------------- */
const finanzasMovimientos = {
  id: 'finanzas-movimientos',
  section: 'Finanzas',
  surface: 'Movimientos y cobros (listas)',
  kind: 'workspace',
  lists: [
    {
      container: 'section.finance-grid > section.panel:nth-of-type(1) .client-list',
      head: '.finance-row-head',
      row: '.finance-transfer-row',
      label: 'Finanzas · transferencias',
      template: '--finance-cols',
      rowHeight: [44, 52],
    },
    {
      container: 'section.finance-grid > section.panel:nth-of-type(2) > .client-list:nth-of-type(2)',
      head: '.finance-row-head',
      row: '.finance-invoice-row',
      label: 'Finanzas · cobros pendientes',
      template: '--finance-cols',
      rowHeight: [44, 52],
    },
    {
      container: 'section.finance-grid > section.panel:nth-of-type(2) > .client-list:nth-of-type(4)',
      head: '.finance-row-head',
      row: '.finance-payment-row',
      label: 'Finanzas · cobros registrados',
      template: '--finance-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<section class="finance-grid">
 <section class="panel">
  <div class="section-caption"><div><p class="eyebrow">TRAZABILIDAD</p><h3>Transferencias recientes</h3></div></div>
  <div class="client-list">
   <div class="finance-row-head" aria-hidden="true"><span>Transferencia</span><span>Monto</span></div>
   ${transferRow({
     from: 'Banco Continental S.A.E.C.A. · Cuenta corriente operativa',
     to: 'Caja Chica Estudio',
     date: '17-sept',
     actor: 'Fredd Deoli',
     initials: 'FD',
     reference: 'REF-2026-0091',
     amount: 'Gs. 98.765.432',
   })}
   ${transferRow({
     from: 'Wise Business · Cuenta internacional USD',
     to: 'Banco Atlas · Caja de ahorro en dólares',
     date: '04-sept',
     actor: 'María del Carmen Rojas Villalba',
     initials: 'MR',
     amount: 'USD 12.345,67',
     received: 'Gs. 90.123.456',
   })}
  </div>
 </section>
 <section class="panel">
  ${financePanelHeading('FACTURACIÓN', 'Cobros pendientes', `<div class="inline-actions"><button class="text-button" type="button">${plusIcon(14)}+ Factura</button><button class="primary" type="button">${plusIcon(16)} Registrar cobro</button></div>`)}
  <div class="client-list">
   <div class="finance-row-head" aria-hidden="true"><span>Factura</span><span>Total</span></div>
   ${invoiceRow({
     number: 'F-2026-001234',
     client: 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.',
     status: 'overdue',
     statusLabel: 'Vencida',
     pending: 'Gs. 1.234.567.890',
     total: 'Gs. 1.234.567.890',
   })}
   ${invoiceRow({
     number: 'F-2026-001187',
     client: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
     status: 'partial',
     statusLabel: 'Parcial',
     pending: 'USD 12.345,67',
     total: 'USD 24.691,34',
   })}
   ${invoiceRow({
     number: 'F-2026-001102',
     client: 'Fundación Niñez y Comunidad',
     status: 'issued',
     statusLabel: 'Emitida',
     pending: 'Gs. 0',
     total: 'Gs. 12.345.678',
   })}
  </div>
  <div class="section-caption"><div><p class="eyebrow">COBROS REGISTRADOS</p><h3>Quién cobró y dónde quedó</h3></div></div>
  <div class="client-list">
   <div class="finance-row-head" aria-hidden="true"><span>Cobro</span><span>Monto</span></div>
   ${paymentRow({
     client: 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.',
     invoice: 'F-2026-001091',
     date: '17-sept',
     account: 'Banco Continental S.A.E.C.A. · Cuenta corriente operativa',
     accountType: 'bank',
     actor: 'María del Carmen Rojas Villalba',
     initials: 'MR',
     reference: 'REF-88123',
     amount: 'Gs. 987.654.321',
   })}
   ${paymentRow({
     client: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
     invoice: 'F-2026-001044',
     date: '04-sept',
     account: 'Wise Business · Cuenta internacional USD',
     accountType: 'digital',
     actor: 'Fredd Deoli',
     initials: 'FD',
     amount: 'USD 12.345,67',
     reversed: 'Cobro duplicado en la conciliación bancaria',
   })}
  </div>
 </section>
</section>`,
};

/* --------------- Mora ------------------------------------------------ */
const moraCobranzas = {
  id: 'mora-cobranzas',
  section: 'Mora',
  surface: 'Semáforo y lista de cobranzas',
  kind: 'workspace',
  lists: [
    {
      container: '.mora-list',
      head: '.mora-list-head',
      row: '.mora-list .client-row',
      label: 'Mora · clientes en cobranza',
      template: '--mora-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<section class="panel directory">
 <div class="panel-heading">
  <div><p class="eyebrow">CRM · COBRANZAS</p><h2>Estado de pagos</h2></div>
  <span>Actualizado 14:32</span>
 </div>
 <div class="kpi-strip" aria-label="Semáforo de mora por antigüedad">
  <article class="kpi-card tone-blue">
   <p class="eyebrow">Mora 1–15 días</p>
   <strong>4 clientes</strong>
   <div class="kpi-amounts"><span>Gs. 98.765.432</span><span>USD 4.500</span></div>
  </article>
  <article class="kpi-card tone-warning">
   <p class="eyebrow">Mora 16–30 días</p>
   <strong>2 clientes</strong>
   <div class="kpi-amounts"><span>Gs. 234.567.890</span></div>
  </article>
  <article class="kpi-card tone-danger">
   <p class="eyebrow">Mora crítica (+30 días)</p>
   <strong>3 clientes</strong>
   <div class="kpi-amounts"><span>Gs. 12.543.210.790</span><span>USD 12.345</span></div>
  </article>
  <article class="kpi-card tone-brand">
   <p class="eyebrow">DSO · DÍAS EN CALLE</p>
   <strong>PYG 41 días · USD 12 días</strong>
   <small>Saldo pendiente sobre lo facturado del mes, por moneda.</small>
  </article>
 </div>
 <div class="mora-toolbar">
  <div class="choice-list compact" aria-label="Filtrar estado de cobro">
   <button type="button" class="choice active">Todos</button>
   <button type="button" class="choice">Al día</button>
   <button type="button" class="choice">Por vencer</button>
   <button type="button" class="choice">En mora</button>
   <button type="button" class="choice">Mora grave</button>
   <button type="button" class="choice">Sin factura</button>
  </div>
  ${searchField('mora-search', 'Buscar cliente en cobranza', 'Buscar cliente…', 'mora-search-input', true)}
 </div>
 <div class="client-list mora-list">
  <div class="mora-list-head" aria-hidden="true"><span></span><span>Cliente</span><span>Pendiente</span></div>
  ${moraRow({
    initial: 'E',
    tone: 'green',
    name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
    statusText: '45 días de mora',
    chip: moraChip('mora-critical', '+30 días'),
    invoices: ' · 3 facturas',
    amount: 'Gs. 1.234.567.890',
  })}
  ${moraRow({
    initial: 'C',
    tone: 'yellow',
    name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
    statusText: '23 días de mora',
    chip: moraChip('mora-medium', '16–30 días'),
    invoices: ' · 1 factura',
    amount: 'USD 12.345,67',
  })}
  ${moraRow({
    initial: 'M',
    tone: 'purple',
    name: 'Municipalidad de Asunción · Dirección de Cultura y Turismo',
    statusText: 'Vence 30-oct',
    chip: '',
    invoices: ' · 4 facturas',
    amount: 'Gs. 987.654.321',
  })}
  ${moraRow({initial: 'F', tone: 'blue', name: 'Fundación Niñez y Comunidad', statusText: 'Al día', chip: '', invoices: ' · 2 facturas', amount: 'Gs. 0'})}
  ${moraRow({
    initial: 'G',
    tone: 'green',
    name: 'Grupo Inversor del Sur Sociedad Anónima · División Medios',
    statusText: '180 días de mora',
    chip: moraChip('mora-critical', '+30 días'),
    invoices: ' · 7 facturas',
    amount: 'Gs. 12.345.678.900',
  })}
  ${moraRow({initial: 'S', tone: 'yellow', name: 'Servicios Integrales del Este S.A.', statusText: '8 días de mora', chip: moraChip('mora-early', '1–15 días'), invoices: ' · Sin facturas', amount: 'Sin saldo pendiente'})}
 </div>
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

/* --------------- Previsión: resumen del mes (v2) ---------------------- */
const personnelRow = ({name, initials, base, override, total, negative = false, noBase = false, masked = false}) => `
<div class="${LIST_ROW} ${PERSON_COLS} forecast-person-row">
 ${cell(`<span class="forecast-person-who flex min-w-0 items-center gap-2"><span class="grid h-6 w-6 flex-none place-items-center overflow-hidden rounded-full bg-ink-700 text-[10px] font-semibold">${initials}</span><span class="min-w-0 text-sm font-semibold text-fore">${name}${noBase ? '<small class="ml-2 text-[10px] font-bold uppercase tracking-wider text-mute">Sin salario fijo</small>' : ''}</span></span>`)}
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
    ${listWrap('46rem', `<div class="forecast-person-list" role="table" aria-label="Personal proyectado">
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
 ${cell(`<b class="font-semibold text-fore">${name}</b><small class="ml-2 text-xs text-mute">${currency}${endsOn ? ` · hasta ${endsOn}` : ''}${invoiceRequired ? ' · factura requerida' : ' · sin factura requerida'}</small>`, 'text-sm')}
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
 ${listWrap('44rem', `<div role="table" aria-label="Contratos vigentes contra facturación">
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

/* --------------- Comisiones: liquidación del mes ---------------------- */
const comisionesLiquidacion = {
  id: 'comisiones-liquidacion',
  section: 'Equipo',
  surface: 'Comisiones · liquidación por colaborador',
  kind: 'workspace',
  lists: [
    {
      container: '.settlement-table',
      head: '.settlement-head',
      row: '.settlement-row',
      label: 'Comisiones · liquidación del mes',
      template: '--settlement-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<div class="ops-stack">
 <section class="panel">
  <div class="panel-heading">
   <div><p class="eyebrow">VENTAS Y RECOMENDACIONES</p><h2>Comisiones y referidos</h2></div>
   <div class="inline-actions"><button class="primary" type="button">${plusIcon(16)}Comisión</button></div>
  </div>
  <div class="commission-settlement">
   <div class="panel-heading">
    <h3>Comisiones del mes por colaborador</h3>
    <label>Mes<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
   </div>
   <p class="form-note">Esperado: acuerdos comerciales vigentes con comisión asignada. Registrado, aprobado, pagado y pendiente: comisiones del mes según la fecha de la factura vinculada.</p>
   <div class="settlement-table" aria-label="Comisiones del mes por colaborador">
    <div class="settlement-head" aria-hidden="true"><span>Colaborador</span><span>Esperado</span><span>Registrado</span><span>Aprobado</span><span>Pagado</span><span>Pendiente</span></div>
    <div class="settlement-row">
     <div class="settlement-name"><b title="María del Carmen Rojas Villalba">María del Carmen Rojas Villalba</b><small>PYG</small></div>
     <strong data-label="Esperado" class="settlement-value">Gs. 12.500.000</strong>
     <strong data-label="Registrado" class="settlement-value">Gs. 9.800.000</strong>
     <strong data-label="Aprobado" class="settlement-value">Gs. 7.400.000</strong>
     <strong data-label="Pagado" class="settlement-value">Gs. 5.200.000</strong>
     <strong data-label="Pendiente" class="settlement-value">Gs. 4.600.000</strong>
    </div>
    <div class="settlement-row">
     <div class="settlement-name"><b title="Juan Carlos Benítez Ocampos">Juan Carlos Benítez Ocampos</b><small>PYG</small></div>
     <strong data-label="Esperado" class="settlement-value">Gs. 8.000.000</strong>
     <strong data-label="Registrado" class="settlement-value">Gs. 8.000.000</strong>
     <strong data-label="Aprobado" class="settlement-value">Gs. 8.000.000</strong>
     <strong data-label="Pagado" class="settlement-value">Gs. 8.000.000</strong>
     <strong data-label="Pendiente" class="settlement-value">Gs. 0</strong>
    </div>
    <div class="settlement-row">
     <div class="settlement-name"><b title="Sin colaborador vinculado">Sin colaborador vinculado</b><small>USD</small></div>
     <strong data-label="Esperado" class="settlement-value">USD 1.250,00</strong>
     <strong data-label="Registrado" class="settlement-value">USD 640,00</strong>
     <strong data-label="Aprobado" class="settlement-value">USD 0,00</strong>
     <strong data-label="Pagado" class="settlement-value">USD 0,00</strong>
     <strong data-label="Pendiente" class="settlement-value">USD 640,00</strong>
    </div>
    <div class="settlement-row">
     <div class="settlement-name"><b title="Valeria Isabel González Núñez">Valeria Isabel González Núñez</b><small>USD</small></div>
     <strong data-label="Esperado" class="settlement-value">USD 3.400,00</strong>
     <strong data-label="Registrado" class="settlement-value">USD 3.400,00</strong>
     <strong data-label="Aprobado" class="settlement-value">USD 2.100,00</strong>
     <strong data-label="Pagado" class="settlement-value">USD 2.100,00</strong>
     <strong data-label="Pendiente" class="settlement-value">USD 1.300,00</strong>
    </div>
   </div>
  </div>
  <div class="choice-list compact">
   <button class="choice active" type="button">Todas</button>
   <button class="choice" type="button">Pendiente</button>
   <button class="choice" type="button">Aprobada</button>
   <button class="choice" type="button">Pagada</button>
   <button class="choice" type="button">Cancelada</button>
  </div>
 </section>
</div>`,
};

/* --------------- Comisiones: tarjetas --------------------------------- */
const comisionesTarjetas = {
  id: 'comisiones-tarjetas',
  section: 'Equipo',
  surface: 'Comisiones · tarjetas',
  kind: 'workspace',
  grids: [{container: '.ops-grid', card: '.commission-hub-card', label: 'Comisiones · tarjetas', minHeight: 200}],
  body: `
<div class="ops-stack">
 <section class="panel">
  <div class="choice-list compact">
   <button class="choice active" type="button">Todas</button>
   <button class="choice" type="button">Pendiente</button>
   <button class="choice" type="button">Aprobada</button>
   <button class="choice" type="button">Pagada</button>
   <button class="choice" type="button">Cancelada</button>
  </div>
  <div class="ops-grid">
   <article class="ops-card commission-hub-card">
    <header class="commission-hub-head"><span class="hub-chip">Venta</span><span class="commission-state" data-status="pending">Pendiente</span></header>
    <h3>María del Carmen Rojas Villalba</h3>
    <strong class="commission-hub-amount">Gs. 4.250.000</strong>
    <dl class="commission-hub-facts"><div><dt>Factura</dt><dd>F-2026-001234</dd></div><div><dt>Vence</dt><dd>30-oct</dd></div></dl>
    <p class="form-note">5% sobre Gs. 85.000.000 facturados al registrar</p>
    <div class="commission-hub-actions inline-actions"><button class="text-button positive" type="button">${checkIcon(14)}Aprobar</button><button class="text-button danger" type="button">${xIcon(14)}Cancelar</button></div>
   </article>
   <article class="ops-card commission-hub-card">
    <header class="commission-hub-head"><span class="hub-chip">Referido</span><span class="commission-state" data-status="approved">Aprobada</span></header>
    <h3>Juan Carlos Benítez Ocampos</h3>
    <strong class="commission-hub-amount">Gs. 1.500.000</strong>
    <dl class="commission-hub-facts"><div><dt>Factura</dt><dd title="Sin factura vinculada">Sin factura vinculada</dd></div><div><dt>Vence</dt><dd title="07-nov">07-nov</dd></div></dl>
    <p class="form-note">Importe fijo</p>
    <div class="commission-hub-actions inline-actions"><button class="text-button" type="button">${banknoteIcon(14)}Registrar pago</button><button class="text-button danger" type="button">${xIcon(14)}Cancelar</button></div>
   </article>
   <article class="ops-card commission-hub-card">
    <header class="commission-hub-head"><span class="hub-chip">Venta</span><span class="commission-state" data-status="paid">Pagada</span></header>
    <h3>Valeria Isabel González Núñez</h3>
    <strong class="commission-hub-amount">USD 1.250,00</strong>
    <dl class="commission-hub-facts"><div><dt>Factura</dt><dd>F-2026-000987</dd></div><div><dt>Vence</dt><dd>17-sept</dd></div></dl>
    <p class="form-note">3% sobre USD 41.666,67 cobrados al registrar</p>
    <div class="commission-hub-actions inline-actions"></div>
   </article>
   <article class="ops-card commission-hub-card">
    <header class="commission-hub-head"><span class="hub-chip">Referido</span><span class="commission-state" data-status="cancelled">Cancelada</span></header>
    <h3>Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima</h3>
    <strong class="commission-hub-amount">Gs. 12.345.678.900</strong>
    <dl class="commission-hub-facts"><div><dt>Factura</dt><dd>F-2026-001102</dd></div><div><dt>Vence</dt><dd>Sin fecha</dd></div></dl>
    <p class="form-note">2% sobre Gs. 617.283.945.000 facturados al registrar</p>
    <div class="commission-hub-actions inline-actions"></div>
   </article>
  </div>
  <p class="form-note">Los porcentajes se calculan al registrar la comisión. Los cobros posteriores no modifican acuerdos ya registrados.</p>
 </section>
</div>`,
};

/* --------------- Comisiones: egresos registrados ---------------------- */
const comisionesPagos = {
  id: 'comisiones-pagos',
  section: 'Equipo',
  surface: 'Comisiones · pagos registrados',
  kind: 'workspace',
  lists: [
    {
      container: 'section.panel',
      head: '.finance-row-head',
      row: '.payment-row.finance-payout-row',
      label: 'Comisiones · egresos registrados',
      template: '--finance-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<section class="panel">
 <h2>Pagos registrados</h2>
 <p class="form-note">Cada pago descuenta el saldo de la cuenta elegida.</p>
 <div class="finance-row-head" aria-hidden="true"><span>Egreso</span><span>Monto</span></div>
 <div class="payment-row finance-payout-row">
  <div><b>María del Carmen Rojas Villalba</b><small>17-sept · Banco Continental S.A.E.C.A. · Cuenta corriente operativa · REF-2026-0091</small></div>
  <strong>Gs. 5.200.000</strong>
 </div>
 <div class="payment-row finance-payout-row">
  <div><b>Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima</b><small>04-sept · Wise Business · Cuenta internacional USD · REF-2026-0087</small></div>
  <strong>USD 12.345,67</strong>
 </div>
 <div class="payment-row finance-payout-row">
  <div><b>Valeria Isabel González Núñez</b><small>11-sept · Caja Chica Estudio · Sin referencia</small></div>
  <strong>Gs. 987.654.321</strong>
 </div>
</section>`,
};

export default [
  finanzasCuentas,
  finanzasConciliacion,
  finanzasMovimientos,
  moraCobranzas,
  previsionResumen,
  previsionContratos,
  previsionProyeccion,
  informesIndicadores,
  informesTablas,
  comisionesLiquidacion,
  comisionesTarjetas,
  comisionesPagos,
];
