/*
 * Fixtures: Finanzas (/pagos), Mora (/pagos/mora), Previsión (/pagos/prevision),
 * Informes (/informes) y Comisiones (/equipo/comisiones).
 *
 * El markup espeja el JSX real (sin clases inventadas):
 *  - app/scale-workspace.tsx 1488-1681 · Finanzas: kpi-strip, cuentas, transferencias,
 *    cobros pendientes y cobros registrados.
 *  - app/scale-workspace.tsx 1183-1289 · Mora: kpi-strip, toolbar y mora-list.
 *  - app/financial-forecast.tsx 71-72 · Previsión (mes, proyección, contratos).
 *  - app/reports-workspace.tsx 67-205 · Informes (tiles, chart, tablas, distribución).
 *  - app/operations.tsx 500-750 modo commissions · liquidación, tarjetas y egresos.
 *
 * Datos de estrés deliberados: montos PYG/USD grandes y negativos, nombres y
 * referencias largas, estados con dato y columnas sin dato (moneda nula,
 * ajuste inexistente, contrato sin factura) para medir el lugar reservado.
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
const actorIdentity = (initials, name) => `<span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span><span class="actor-identity-details"><span class="actor-identity-name">${name}</span></span></span>`;

/* SelectCustom cerrado (app/profile-controls.tsx 45-58). */
const selectCustom = (label, value, labelId) => `<div class="ops-select"><span class="ops-label" id="${labelId}-label">${label}</span><button type="button" class="ops-select-trigger" aria-labelledby="${labelId}-label ${labelId}-value" aria-haspopup="listbox" aria-expanded="false"><span id="${labelId}-value">${value}</span>${chevronIcon(16)}</button></div>`;

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

/* ------------------------------------------------------------------ Previsión */

/* Tarjeta por moneda: app/financial-forecast.tsx 71 (resumen, personal, planificado). */
const forecastCurrencyCard = ({label, strong = '', dl = '', small = '', list = ''}) => `
<article class="forecast-currency">
 <span>${label}</span>
 ${strong ? `<strong>${strong}</strong>` : ''}
 ${dl ? `<dl>${dl}</dl>` : ''}
 ${small ? `<small class="planned-expenses-kinds">${small}</small>` : ''}
 ${list}
</article>`;

const forecastFact = (term, value) => `<div><dt>${term}</dt><dd>${value}</dd></div>`;

/* Fila de personal: app/financial-forecast.tsx 71 + app/financial-forecast.css 73-96. */
const forecastPersonRow = ({name, initials, currency, base, override, total, negative = false, noBase = false}) => `
<div class="forecast-person-list-row">
 <span class="forecast-person-who"><span class="forecast-person-avatar"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span></span><span class="forecast-person-name">${name}${noBase ? '<small class="forecast-person-no-base">Sin salario fijo</small>' : ''}</span></span>
 <span class="forecast-person-base"><small>Salario base</small><strong>${base}</strong></span>
 ${override ? `<span class="forecast-person-override"><small>Ajuste del mes</small><strong>${override}</strong></span>` : '<span class="forecast-person-override is-empty" aria-hidden="true"></span>'}
 <span class="forecast-person-total"><small>Cierre del mes</small><strong${negative ? ' data-negative="true"' : ''}>${total}</strong></span>
 <span class="forecast-person-actions">
  <button class="icon-button" type="button" title="Editar salario" aria-label="Editar salario: ${name}">${pencilIcon(16)}</button>
  <button class="icon-button" type="button" title="Ajuste del mes" aria-label="Ajuste del mes: ${name}">${slidersIcon(16)}</button>
  ${override ? `<button class="icon-button warn" type="button" title="Quitar ajuste del mes" aria-label="Quitar ajuste del mes: ${name}">${trashIcon(16)}</button>` : ''}
 </span>
</div>`;

/* Fila de gasto real: app/financial-forecast.tsx 71 + app/financial-forecast.css 55. */
const plannedExpenseRow = ({category, kind, date, account, reference, amount}) => `
<li>
 <div>
  <b>${category}${kind ? ` · ${kind}` : ''}</b>
  <small>${date} · ${account}${reference ? ` · ${reference}` : ''}</small>
 </div>
 <div class="inline-actions"><strong>${amount}</strong><button type="button" class="text-button danger">Revertir</button></div>
</li>`;

/* Fila de contrato: app/financial-forecast.tsx 72 + app/financial-forecast.css 37-52. */
const contractedRow = ({name, currency, endsOn, contracted, invoiced, missing}) => `
<li>
 <span class="contracted-client-name"><b>${name}</b><small>${currency}${endsOn ? ` · hasta ${endsOn}` : ''}</small></span>
 <span>Contratado <strong>${contracted}</strong></span>
 <span>Facturado <strong>${invoiced}</strong></span>
 ${missing ? '<em class="missing-invoice-chip">Sin factura</em>' : ''}
</li>`;

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
      container: 'section.finance-grid > section.panel:nth-of-type(2) .client-list',
      head: '.finance-row-head',
      row: '.finance-invoice-row',
      label: 'Finanzas · cobros pendientes',
      template: '--finance-cols',
      rowHeight: [44, 52],
    },
    {
      container: 'section.finance-grid > section.panel:nth-of-type(3) .client-list',
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
 </section>
 <section class="panel">
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

/* --------------- Previsión: mes (personal + gastos) ------------------- */
const previsionResumen = {
  id: 'prevision-resumen',
  section: 'Previsión',
  surface: 'Ingresos vs gastos, personal y gastos del mes',
  kind: 'workspace',
  lists: [
    {
      container: '.forecast-personnel-list',
      head: '.forecast-person-head',
      row: '.forecast-person-list-row',
      label: 'Previsión · personal proyectado',
      template: '--forecast-person-cols',
      rowHeight: [44, 52],
    },
    {
      container: '.planned-expenses-list',
      head: '.planned-expenses-list > li.finance-row-head',
      row: '.planned-expenses-list > li:not(.finance-row-head)',
      label: 'Previsión · gastos reales',
      template: '--planned-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<section class="panel financial-forecast" aria-label="Previsión financiera">
 <div class="panel-heading">
  <h2>Previsión financiera</h2>
  <label>Mes<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
  <div class="forecast-horizon" role="group" aria-label="Horizonte de proyección">
   <button type="button" class="is-active" aria-pressed="true">1 mes</button>
   <button type="button" aria-pressed="false">3 meses</button>
   <button type="button" aria-pressed="false">6 meses</button>
   <button type="button" aria-pressed="false">12 meses</button>
  </div>
 </div>
 <p class="form-note">Planificación mensual por moneda. No mezcla monedas ni convierte planes, facturas, cobros o gastos en hechos contables.</p>
 <section class="forecast-balance" aria-labelledby="forecast-balance-title">
  <h3 id="forecast-balance-title">Ingresos vs gastos del mes</h3>
  <p class="form-note">Ingresos = emitido más aceptado sin factura. Gastos = personal, comisiones, gastos planificados y gastos reales. Resultado = ingresos menos gastos.</p>
  <div class="forecast-balance-grid">
   <article class="forecast-balance-card">
    <span class="forecast-balance-currency">PYG</span>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Ingresos</span><span class="forecast-balance-track"><span class="forecast-balance-fill income" style="width:100%"></span></span><strong>PYG 1.691.356.890</strong></div>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Gastos</span><span class="forecast-balance-track"><span class="forecast-balance-fill expense" style="width:8%"></span></span><strong>PYG 130.894.332</strong></div>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Resultado</span><span class="forecast-balance-track"><span class="forecast-balance-fill positive" style="width:92%"></span></span><strong>PYG 1.560.462.558</strong></div>
   </article>
   <article class="forecast-balance-card">
    <span class="forecast-balance-currency">USD</span>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Ingresos</span><span class="forecast-balance-track"><span class="forecast-balance-fill income" style="width:79%"></span></span><strong>USD 14,445</strong></div>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Gastos</span><span class="forecast-balance-track"><span class="forecast-balance-fill expense" style="width:100%"></span></span><strong>USD 18,350</strong></div>
    <div class="forecast-balance-row"><span class="forecast-balance-label">Resultado</span><span class="forecast-balance-track"><span class="forecast-balance-fill negative" style="width:21%"></span></span><strong data-negative="true">−USD 3,905</strong></div>
   </article>
  </div>
 </section>
 <section aria-labelledby="forecast-summary-title">
  <h3 id="forecast-summary-title">Resumen por moneda</h3>
  <div class="forecast-currencies">
   ${forecastCurrencyCard({
     label: 'PYG · planificación del mes',
     dl: [
       forecastFact('Recurrente contratado', 'PYG 250.000.000'),
       forecastFact('Emitido / facturado', 'PYG 1.234.567.890'),
       forecastFact('Cobrado', 'PYG 987.654.321'),
       forecastFact('Personal', 'PYG 69.765.432'),
       forecastFact('Comisiones de clientes', 'PYG 45.678.900'),
       forecastFact('Gastos planificados', 'PYG 12.000.000'),
       forecastFact('Gastos reales', 'PYG 3.450.000'),
       forecastFact('Aceptado sin factura (7)', 'PYG 456.789.000'),
     ].join(''),
   })}
   ${forecastCurrencyCard({
     label: 'USD · planificación del mes',
     dl: [
       forecastFact('Recurrente contratado', 'USD 4,500'),
       forecastFact('Emitido / facturado', 'USD 12,345'),
       forecastFact('Cobrado', 'USD 9,800'),
       forecastFact('Personal', 'USD 8,400'),
       forecastFact('Comisiones de clientes', 'USD 700'),
       forecastFact('Gastos planificados', 'USD 1,200'),
       forecastFact('Gastos reales', 'USD 8,050'),
       forecastFact('Aceptado sin factura (2)', 'USD 2,100'),
     ].join(''),
   })}
  </div>
 </section>
 <div class="forecast-month-tools">
  <section class="forecast-personnel" aria-labelledby="personnel-forecast-title">
   <h3 id="personnel-forecast-title">Personal proyectado</h3>
   <p class="form-note">Gasto esperado al cierre de 01-sept, sin pagos ni comisiones registrados.</p>
   <p role="status">4 colaborador(es) activo(s) incluido(s).</p>
   <div class="forecast-currencies">
    ${forecastCurrencyCard({
      label: 'PYG · gasto esperado al cierre',
      strong: 'PYG 69.765.432',
      dl: [forecastFact('Salario base (3)', 'PYG 72.000.000'), forecastFact('Ajustes del mes (2)', '−PYG 2.234.568')].join(''),
      list: `
    <div class="forecast-personnel-list">
     <div class="forecast-person-head" aria-hidden="true"><span>Persona</span><span>Salario base</span><span>Ajuste del mes</span><span>Cierre del mes</span><span>Acciones</span></div>
     ${forecastPersonRow({name: 'María del Carmen Rojas Villalba', initials: 'MR', base: 'PYG 28.000.000', override: '+PYG 2.000.000', total: 'PYG 30.000.000'})}
     ${forecastPersonRow({name: 'Juan Carlos Benítez Ocampos', initials: 'JB', base: 'PYG 24.000.000', override: '', total: 'PYG 24.000.000'})}
     ${forecastPersonRow({name: 'Lucía Fernanda Sosa Martínez', initials: 'LS', base: 'PYG 20.000.000', override: '−PYG 4.234.568', total: '−PYG 15.765.432', negative: true})}
     ${forecastPersonRow({name: 'Diego Ramón Aquino Cáceres', initials: 'DA', base: 'PYG 0', override: '', total: 'PYG 0', noBase: true})}
    </div>`,
    })}
    ${forecastCurrencyCard({
      label: 'USD · gasto esperado al cierre',
      strong: 'USD 8,400',
      dl: [forecastFact('Salario base (1)', 'USD 8,400')].join(''),
      list: `
    <div class="forecast-personnel-list">
     <div class="forecast-person-head" aria-hidden="true"><span>Persona</span><span>Salario base</span><span>Ajuste del mes</span><span>Cierre del mes</span><span>Acciones</span></div>
     ${forecastPersonRow({name: 'Valeria Isabel González Núñez', initials: 'VG', base: 'USD 8,400', override: '', total: 'USD 8,400'})}
    </div>`,
    })}
   </div>
  </section>
  <section class="planned-expenses" aria-labelledby="planned-expenses-title">
   <h3 id="planned-expenses-title">Gastos planificados · 01-sept</h3>
   <p class="form-note">Esto es planificación interna; no registra un pago, una factura ni una cuenta por pagar.</p>
   <form class="planned-expenses-form" novalidate aria-busy="false">
    ${selectCustom('Frecuencia', 'Solo este mes', 'exp-cadence')}
    ${selectCustom('Categoría', 'Operación', 'exp-category')}
    ${selectCustom('Tipo', 'Variable', 'exp-kind')}
    <label>Monto entero<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="16" value="" placeholder="Sin separadores"></label>
    ${selectCustom('Moneda', 'PYG', 'exp-currency')}
    <label class="planned-expenses-note">Nota opcional<input type="text" maxlength="280" value=""></label>
    <button type="submit">Agregar gasto planificado</button>
   </form>
   <div class="forecast-currencies">
    ${forecastCurrencyCard({label: 'PYG · total planificado', strong: 'PYG 12.000.000', small: '3 fijos · 2 variables'})}
    ${forecastCurrencyCard({label: 'USD · total planificado', strong: 'USD 1,200', small: '1 fijo · 0 variables'})}
   </div>
  </section>
  <section class="planned-expenses" aria-labelledby="real-expenses-title">
   <h3 id="real-expenses-title">Gastos reales del mes · 01-sept</h3>
   <p class="form-note">Registra el pago contra una cuenta: descuenta el saldo y queda en el historial de movimientos. Revertir acredita de nuevo la cuenta.</p>
   <form class="planned-expenses-form" novalidate aria-busy="false">
    ${selectCustom('Cuenta', 'Banco Continental S.A.E.C.A. · PYG', 'real-account')}
    ${selectCustom('Categoría', 'Herramientas', 'real-category')}
    ${selectCustom('Tipo', 'Fijo', 'real-kind')}
    <label>Monto entero<input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="16" value="" placeholder="Sin separadores"></label>
    <label>Fecha<input type="date" value="2026-09-04"></label>
    <label class="planned-expenses-note">Referencia<input type="text" maxlength="180" value=""></label>
    <button type="submit">Registrar gasto real</button>
   </form>
   <ul class="planned-expenses-list">
    <li class="finance-row-head" aria-hidden="true"><span>Gasto</span><span>Monto</span></li>
    ${plannedExpenseRow({category: 'Herramientas', kind: 'Fijo', date: '04-sept', account: 'Banco Continental S.A.E.C.A. · Cuenta corriente operativa', reference: 'REF-2026-0914', amount: 'PYG 1.500.000'})}
    ${plannedExpenseRow({category: 'Marketing', kind: 'Variable', date: '11-sept', account: 'Wise Business · Cuenta internacional USD', reference: 'Campaña institucional Universidad Católica · N.º 2026-4410', amount: 'USD 8.050'})}
    ${plannedExpenseRow({category: 'Administración', kind: '', date: '17-sept', account: 'Caja Chica Estudio', reference: '', amount: 'PYG 3.450.000'})}
   </ul>
  </section>
 </div>
</section>`,
};

/* --------------- Previsión: contratos vs facturación ------------------ */
const previsionContratos = {
  id: 'prevision-contratos',
  section: 'Previsión',
  surface: 'Contratos vs facturación del mes',
  kind: 'workspace',
  lists: [
    {
      container: '.contracted-clients-list',
      head: '.contracted-clients-head',
      row: '.contracted-clients-list > li:not(.contracted-clients-head)',
      label: 'Previsión · contratos del mes',
      template: '--contracted-cols',
      rowHeight: [44, 52],
    },
  ],
  body: `
<section class="panel financial-forecast" aria-label="Previsión financiera">
 <div class="panel-heading">
  <h2>Previsión financiera</h2>
  <label>Mes<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
  <div class="forecast-horizon" role="group" aria-label="Horizonte de proyección">
   <button type="button" class="is-active" aria-pressed="true">1 mes</button>
   <button type="button" aria-pressed="false">3 meses</button>
   <button type="button" aria-pressed="false">6 meses</button>
   <button type="button" aria-pressed="false">12 meses</button>
  </div>
 </div>
 <section class="contracted-clients" aria-labelledby="contracted-clients-title">
  <h3 id="contracted-clients-title">Contratos vs facturación del mes</h3>
  <ul class="contracted-clients-list">
   <li class="contracted-clients-head" aria-hidden="true"><span>Cliente</span><span>Contratado</span><span>Facturado</span><span>Estado</span></li>
   ${contractedRow({
     name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima',
     currency: 'PYG',
     endsOn: '31 dic 26',
     contracted: 'PYG 85.000.000',
     invoiced: 'PYG 42.500.000',
     missing: true,
   })}
   ${contractedRow({
     name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada',
     currency: 'USD',
     endsOn: '07 nov 26',
     contracted: 'USD 4,500',
     invoiced: 'USD 4,500',
     missing: false,
   })}
   ${contractedRow({
     name: 'Municipalidad de Asunción · Dirección de Cultura y Turismo',
     currency: 'PYG',
     endsOn: '',
     contracted: 'PYG 12.000.000',
     invoiced: 'PYG 0',
     missing: true,
   })}
   ${contractedRow({
     name: 'Fundación Niñez y Comunidad',
     currency: 'PYG',
     endsOn: '31 dic 26',
     contracted: 'PYG 3.500.000',
     invoiced: 'PYG 3.500.000',
     missing: false,
   })}
  </ul>
 </section>
</section>`,
};

/* --------------- Previsión: proyección multi-mes ---------------------- */
const previsionProyeccion = {
  id: 'prevision-proyeccion',
  section: 'Previsión',
  surface: 'Proyección de caja y resultado (6 meses)',
  kind: 'workspace',
  body: `
<section class="panel financial-forecast" aria-label="Previsión financiera">
 <div class="panel-heading">
  <h2>Previsión financiera</h2>
  <label>Mes<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
  <div class="forecast-horizon" role="group" aria-label="Horizonte de proyección">
   <button type="button" aria-pressed="false">1 mes</button>
   <button type="button" aria-pressed="false">3 meses</button>
   <button type="button" class="is-active" aria-pressed="true">6 meses</button>
   <button type="button" aria-pressed="false">12 meses</button>
  </div>
 </div>
 <p class="form-note">Planificación mensual por moneda. No mezcla monedas ni convierte planes, facturas, cobros o gastos en hechos contables.</p>
 <section aria-labelledby="forecast-projection-title">
  <h3 id="forecast-projection-title">Proyección de caja y resultado · 6 meses</h3>
  <div class="forecast-currencies">
   <article class="forecast-currency forecast-projection">
    <span>PYG · proyección acumulada</span>
    <table>
     <thead><tr><th scope="col">Mes</th><th scope="col">Proyectado</th><th scope="col">Resultado</th></tr></thead>
     <tbody>
      <tr><th scope="row">01-sept</th><td>PYG 1.234.567.890</td><td>PYG 987.654.321</td></tr>
      <tr><th scope="row">01-oct</th><td>PYG 1.450.000.000</td><td data-negative="true">−PYG 45.678.900</td></tr>
      <tr><th scope="row">01-nov</th><td>PYG 998.765.432</td><td>PYG 12.345.678</td></tr>
      <tr><th scope="row">01-dic</th><td data-negative="true">−PYG 12.345.678</td><td data-negative="true">−PYG 234.567.890</td></tr>
      <tr><th scope="row">01-ene</th><td>PYG 456.789.000</td><td>PYG 0</td></tr>
      <tr><th scope="row">01-feb</th><td>PYG 2.345.678.901</td><td>PYG 1.876.543.210</td></tr>
     </tbody>
    </table>
   </article>
   <article class="forecast-currency forecast-projection">
    <span>USD · proyección acumulada</span>
    <table>
     <thead><tr><th scope="col">Mes</th><th scope="col">Proyectado</th><th scope="col">Resultado</th></tr></thead>
     <tbody>
      <tr><th scope="row">01-sept</th><td>USD 12,345</td><td>USD 9,800</td></tr>
      <tr><th scope="row">01-oct</th><td>USD 24,691</td><td data-negative="true">−USD 3,905</td></tr>
      <tr><th scope="row">01-nov</th><td>USD 41,666</td><td>USD 18,350</td></tr>
      <tr><th scope="row">01-dic</th><td data-negative="true">−USD 987,654</td><td data-negative="true">−USD 1,234,567</td></tr>
      <tr><th scope="row">01-ene</th><td>USD 987,654</td><td>USD 0</td></tr>
      <tr><th scope="row">01-feb</th><td>USD 1,234,567</td><td>USD 1,111,111</td></tr>
     </tbody>
    </table>
   </article>
  </div>
 </section>
</section>`,
};

/* --------------- Informes: indicadores + gráfico ---------------------- */
const informesIndicadores = {
  id: 'informes-indicadores',
  section: 'Informes',
  surface: 'Indicadores, chart y distribución',
  kind: 'workspace',
  body: `
<section class="reports-workspace" aria-label="Reportes de la agencia">
 <h2>Evolución mensual</h2>
 <article class="reports-tiles live-visitors" role="region" aria-label="Visitantes en vivo del landing">
  <article>
   <div class="live-visitors-copy"><h3>Visitantes en vivo</h3><p>Personas actualmente en el landing de Scale OS</p></div>
   <div class="live-visitors-figure"><strong>1.284</strong><span class="live-visitors-trend">↑ +15%</span></div>
  </article>
 </article>
 <p>Importes registrados, no utilidad ni rentabilidad. Las monedas se consultan por separado.</p>
 <div class="reports-filters">
  <label>Mes a consultar<input type="month" value="2026-09" min="1900-01" max="2026-09"></label>
  <label>${selectCustom('Histórico', 'Últimos 12 meses', 'rep-months')}</label>
  <label>${selectCustom('Moneda', 'PYG', 'rep-currency')}</label>
 </div>
 <p class="reports-note">Datos al 20 sept 26 · 08:05 (hora de Asunción). Histórico confiable desde: 01 ago 26.</p>
 <div class="reports-actions"><button type="button">Exportar histórico CSV · PYG</button><button type="button">Exportar PDF · PYG</button></div>
 <p class="reports-note">Exporta los meses cargados de la moneda seleccionada. CSV UTF-8, separado por punto y coma; decimales con punto, sin separador de miles. Celdas vacías: sin datos. Para conservar todos los dígitos, importá los importes como texto en tu planilla.</p>
 <p role="status" class="reports-warning">Mes en curso o cobertura incompleta en el mes seleccionado o anterior; no comparar como meses completos. Se omite la comparación mensual.</p>
 <div class="reports-tiles">
  <article><h3>Clientes activos</h3><strong>38</strong><p>+3 · +8,57 %</p></article>
  <article><h3>Clientes incorporados</h3><strong>4</strong><p>+1 · +33,33 %</p></article>
  <article><h3>Bajas de actividad</h3><strong>2</strong><p>-1 · -33,33 %</p></article>
  <article><h3>Retención</h3><strong>94,7 %</strong><p>Diferencia en puntos porcentuales / relativa: +0,7 · +0,74 %</p></article>
  <article><h3>Facturado · incluye impuestos</h3><strong>PYG 1.234.567.890,50</strong><p>+145.678.900 · +13,38 %</p></article>
  <article><h3>Cobrado · neto de reversiones</h3><strong>PYG 987.654.321,00</strong><p>-12.345.000 · -1,23 %</p></article>
  <article><h3>Ticket promedio por factura</h3><strong>PYG 4.115.226,30</strong><p>+123.456,78 · +3,09 %</p></article>
  <article><h3>Facturado promedio por cliente facturado</h3><strong>PYG 32.488.628,70</strong><p>+1.234.567,89 · +3,95 %</p></article>
 </div>
 <div class="reports-chart" role="img" aria-label="Facturado y cobrado mensual en PYG">
  <figure><div class="chart-bars"><span class="chart-bar" title="01-abr · Facturado PYG 456.789.000" style="height:37%"></span><span class="chart-bar collected" title="01-abr · Cobrado PYG 398.765.432" style="height:32%"></span></div><figcaption>01-abr</figcaption></figure>
  <figure><div class="chart-bars"><span class="chart-bar" title="01-may · Facturado PYG 512.345.678" style="height:41%"></span><span class="chart-bar collected" title="01-may · Cobrado PYG 501.234.567" style="height:41%"></span></div><figcaption>01-may</figcaption></figure>
  <figure><div class="chart-bars"><span class="chart-bar" title="01-jun · Facturado PYG 678.901.234" style="height:55%"></span><span class="chart-bar collected" title="01-jun · Cobrado PYG 612.345.678" style="height:50%"></span></div><figcaption>01-jun</figcaption></figure>
  <figure><div class="chart-bars"><span class="chart-bar" title="01-jul · Facturado PYG 890.123.456" style="height:72%"></span><span class="chart-bar collected" title="01-jul · Cobrado PYG 845.678.901" style="height:68%"></span></div><figcaption>01-jul</figcaption></figure>
  <figure><div class="chart-bars"><span class="chart-bar" title="01-ago · Facturado PYG 1.088.888.990" style="height:88%"></span><span class="chart-bar collected" title="01-ago · Cobrado PYG 999.999.321" style="height:81%"></span></div><figcaption>01-ago</figcaption></figure>
  <figure><div class="chart-bars"><span class="chart-bar is-partial" title="01-sept · Facturado PYG 1.234.567.890" style="height:100%"></span><span class="chart-bar collected is-partial" title="01-sept · Cobrado PYG 987.654.321" style="height:80%"></span></div><figcaption>01-sept · parcial</figcaption></figure>
 </div>
 <p class="reports-note">Barras: facturado (violeta) y cobrado (verde) por mes, en la moneda seleccionada. Los meses parciales se atenúan; la escala es relativa al valor máximo cargado, sin mezclar monedas.</p>
 <p>Antigüedad promedio de clientes activos: <strong>412</strong> días. Fechas conocidas: 35 de 38 clientes activos. Las fechas desconocidas se excluyen del promedio.</p>
 <p class="reports-note">Bajas de actividad: clientes que dejaron de estar activos por pausa, cancelación o archivo, incluso si se reactivaron durante el mismo mes. No implica una pérdida definitiva.</p>
 <div class="reports-distributions">
  <section class="reports-distribution"><h3>Tipos de clientes activos</h3><p>Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p><ul>
   <li><span>Empresa</span><strong>22 · 57,9 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:57.9%"></span></span></li>
   <li><span>Profesional</span><strong>9 · 23,7 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:23.7%"></span></span></li>
   <li><span>Persona particular</span><strong>5 · 13,2 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:13.2%"></span></span></li>
   <li><span>Sin clasificar</span><strong>2 · 5,3 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:5.3%"></span></span></li>
  </ul></section>
  <section class="reports-distribution"><h3>Planes por cantidad de clientes activos</h3><p>Porcentaje sobre todos los clientes activos, incluidos los no clasificados y sin plan.</p><ul>
   <li><span>Plan Integral de Producción Audiovisual Mensual</span><strong>14 · 36,8 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:36.8%"></span></span></li>
   <li><span>Plan Crecimiento</span><strong>12 · 31,6 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:31.6%"></span></span></li>
   <li><span>Plan Inicial</span><strong>8 · 21,1 %</strong><span class="reports-bar" aria-hidden="true"><span style="width:21.1%"></span></span></li>
   <li><span>Sin plan registrado</span><strong>4 · Sin porcentaje</strong></li>
  </ul></section>
 </div>
 <p class="reports-note">La distribución de planes muestra clientes activos, no nuevas contrataciones. “Sin clasificar” y “Sin plan registrado” identifican datos desconocidos, no categorías supuestas.</p>
</section>`,
};

/* --------------- Informes: comparativa + histórico ------------------- */
const informesTablas = {
  id: 'informes-tablas',
  section: 'Informes',
  surface: 'Comparativa de períodos e histórico mensual',
  kind: 'workspace',
  body: `
<section class="reports-workspace" aria-label="Reportes de la agencia">
 <h2>Evolución mensual</h2>
 <section class="reports-comparison">
  <h3>Comparativa del período visible contra el anterior</h3>
  <p class="reports-note">Período visible: 01-oct – 01-sept · período anterior: 01-oct – 01-sept (12 meses por período).</p>
  <div class="reports-comparison-scroll" role="region" aria-label="Comparativa del período visible contra el anterior en PYG, desplazable horizontalmente" tabindex="0">
   <table>
    <thead><tr><th scope="col">Métrica</th><th scope="col">Período visible</th><th scope="col">Período anterior</th><th scope="col">Variación</th></tr></thead>
    <tbody>
     <tr><th scope="row">Clientes activos (último mes con datos)</th><td>38</td><td>35</td><td>+3 · +8,57 %</td></tr>
     <tr><th scope="row">Clientes incorporados (suma del período)</th><td>41</td><td>29</td><td>+12 · +41,38 %</td></tr>
     <tr><th scope="row">Bajas de actividad (suma del período)</th><td>7</td><td>9</td><td>-2 · -22,22 %</td></tr>
     <tr><th scope="row">Facturación (suma del período)</th><td>PYG 12.345.678.901,50</td><td>PYG 10.987.654.321,00</td><td>+1.358.024.580,50 · +12,36 %</td></tr>
     <tr><th scope="row">Cobros (suma del período)</th><td>PYG 11.987.654.321,00</td><td>PYG 10.111.111.111,11</td><td>+1.876.543.209,89 · +18,56 %</td></tr>
     <tr><th scope="row">Ticket promedio por factura</th><td>PYG 4.115.226,30</td><td>PYG 3.991.769,52</td><td>+123.456,78 · +3,09 %</td></tr>
    </tbody>
   </table>
  </div>
 </section>
 <div class="reports-table-scroll" role="region" aria-label="Histórico mensual, desplazable horizontalmente" tabindex="0">
  <table>
   <caption>Evolución mensual · PYG. “Sin datos” no significa cero.</caption>
   <thead><tr><th scope="col">Mes</th><th scope="col">Activos</th><th scope="col">Incorporados</th><th scope="col">Bajas de actividad</th><th scope="col">Retención %</th><th scope="col">Antigüedad (días)</th><th scope="col">Fechas conocidas</th><th scope="col">Facturado con impuestos</th><th scope="col">Cobrado neto</th><th scope="col">Facturas</th><th scope="col">Clientes facturados</th><th scope="col">Ticket por factura</th><th scope="col">Promedio por cliente facturado</th></tr></thead>
   <tbody>
    <tr><th scope="row">2026-09 · parcial</th><td>38</td><td>4</td><td>2</td><td>94,7</td><td>412</td><td>35</td><td>PYG 1.234.567.890,50</td><td>PYG 987.654.321,00</td><td>18</td><td>17</td><td>PYG 4.115.226,30</td><td>PYG 32.488.628,70</td></tr>
    <tr><th scope="row">2026-08</th><td>36</td><td>3</td><td>1</td><td>96,2</td><td>389</td><td>33</td><td>PYG 1.088.888.990,00</td><td>PYG 999.999.321,00</td><td>16</td><td>15</td><td>PYG 3.991.769,52</td><td>PYG 30.123.456,78</td></tr>
    <tr><th scope="row">2026-07</th><td>34</td><td>2</td><td>3</td><td>91,4</td><td>365</td><td>31</td><td>PYG 890.123.456,00</td><td>PYG 845.678.901,00</td><td>14</td><td>13</td><td>PYG 3.786.543.210,00</td><td>PYG 28.765.432.100,00</td></tr>
    <tr><th scope="row">2026-06</th><td>35</td><td>Sin datos</td><td>2</td><td>Sin datos</td><td>Sin datos</td><td>28</td><td>Sin datos</td><td>Sin datos</td><td>Sin datos</td><td>Sin datos</td><td>Sin datos</td><td>Sin datos</td></tr>
   </tbody>
  </table>
 </div>
 <p class="reports-note">Comparaciones contra el mes calendario anterior: diferencia absoluta y variación porcentual sobre el valor absoluto anterior. Sin porcentaje cuando la base es cero; sin comparación si falta información o alguno de los meses es parcial. La antigüedad usa solo fechas de inicio conocidas.</p>
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
    <dl class="commission-hub-facts"><div><dt>Factura</dt><dd>Sin factura vinculada</dd></div><div><dt>Vence</dt><dd>07-nov</dd></div></dl>
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
