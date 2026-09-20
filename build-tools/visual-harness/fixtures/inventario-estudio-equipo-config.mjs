/*
 * Fixtures: Inventario, Estudio, Equipo, Invitaciones, Roles y permisos,
 * Historial de trabajo, Actividad, Configuración, Preferencias, Mi perfil y
 * Papelera.
 *
 * Markup mirrored from the real JSX (class names copied verbatim):
 *  - app/inventory-workspace.tsx: VerificationStamp (46-56), EquipmentCard (58-93),
 *    InventorySummary (121-138), toolbar + list head + rows (300-310),
 *    reservation rows (312), InventoryCalendar (442-449)
 *  - app/studio-workspace.tsx: spaces list (35), reservation list (36), calendar (55)
 *  - app/operations.tsx: people mode (533-624), person-hub card (555-617),
 *    PhotoViewer (app/photo-viewer.tsx 18-21), avatar (operations.css 64-76)
 *  - app/team-access.tsx (16-26)
 *  - app/person-container.tsx (14-27)
 *  - app/invite-links.tsx (18-27)
 *  - app/permissions-matrix.tsx: panel (100-109), explorer (37-62), table (73-93)
 *  - app/work-history.tsx (21-27)
 *  - app/suite.tsx: ActivityWorkspace (137-142), SettingsWorkspace (167-193),
 *    CouponRedeem (146-166)
 *  - app/presence.tsx UsagePanel (83-87)
 *  - app/archive-controls.tsx TrashWorkspace (41-62)
 *  - app/company-settings.tsx (31-49), app/workspace-guide.tsx NewCompany (61-68)
 *  - app/scale-workspace.tsx: settings page (1080-1088), preferences card (1089-1092),
 *    papelera (1093)
 *  - app/my-profile.tsx (30-49), app/profile-photo.tsx (72-91)
 * CSS contracts cited per fixture: app/inventory-workspace.css,
 * app/studio-workspace.css, app/operations.css, app/invite-links.css,
 * app/permissions-matrix.css, app/work-history.css, app/settings-slice.css,
 * app/company-settings.css, app/my-profile.css, app/dialog.css y los primitivos
 * de app/ui-system.css.
 *
 * Datos de estrés deliberados: nombres/correos/seriales largos, montos grandes,
 * fechas con vencimiento, equipos sin foto/serie/verificación y accesos suspendidos.
 * Los hallazgos del baseline son el objetivo; este archivo no arregla dominio.
 */

/* ------------------------------------------------------------------ icons */
const svg = (path, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${path}</svg>`;
const ICON = {
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
  tag: '<path d="M20 12.5 12.5 20a2 2 0 0 1-2.8 0L4 14.3V4h10.3l5.7 5.7a2 2 0 0 1 0 2.8Z"/><path d="M8 8h.01"/>',
  clipboard: '<path d="M9 4h6v3H9z"/><path d="M9 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3"/><path d="m9.5 14 2 2 3.5-4"/>',
  pencil: '<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
  badgeCheck: '<path d="m12 3 2.2 1.6 2.7-.3 1 2.5 2.4 1.2-.6 2.7.6 2.7-2.4 1.2-1 2.5-2.7-.3L12 21l-2.2-1.7-2.7.3-1-2.5-2.4-1.2.6-2.7-.6-2.7 2.4-1.2 1-2.5 2.7.3Z"/><path d="m9 12 2 2 4-4"/>',
  triangle: '<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
  circleX: '<circle cx="12" cy="12" r="9"/><path d="m9.5 9.5 5 5M14.5 9.5l-5 5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5"/>',
  package: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3"/>',
  drive: '<path d="M4 5h16v14H4z"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  zoomIn: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  star: '<path d="m12 4 2.4 5 5.6.8-4 4 1 5.5-5-2.7-5 2.7 1-5.5-4-4 5.6-.8Z"/>',
  building: '<path d="M4 21V4h10v17M14 9h6v12M7 8h3M7 12h3M7 16h3M17 13h1M17 17h1"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5"/><path d="M12 8v4l3 2"/>',
  shield: '<path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6Z"/><path d="m9 12 2 2 4-4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  columns: '<rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="18" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/>',
  link2: '<path d="M9 15 15 9"/><path d="M10.5 6.5 13 4a4 4 0 0 1 6 6l-2.5 2.5"/><path d="M13.5 17.5 11 20a4 4 0 0 1-6-6l2.5-2.5"/>',
  userCheck: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 2.7-5.5 6-5.5 1.4 0 2.7.5 3.7 1.3"/><path d="m15 18 2 2 4-4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>',
  rotateCcw: '<path d="M3 4v5h5"/><path d="M3.5 9a9 9 0 1 0 2.5-4.7"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
  chart: '<path d="M4 20V6M10 20V10M16 20v-7M22 20H2"/>',
  linkOff: '<path d="M9 15 15 9"/><path d="M10.5 6.5 13 4a4 4 0 0 1 6 6l-2.5 2.5"/><path d="m3 3 18 18"/>',
  ticket: '<path d="M3 9V6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6Z"/><path d="M12 7v10"/>',
  alert: '<path d="M12 4 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
};

const iconButton = ({title, label, path, tone = '', disabled = false}) => `<button class="icon-button${tone ? ' ' + tone : ''}" type="button" title="${title}" aria-label="${label}"${disabled ? ' disabled' : ''}>${svg(path)}</button>`;
/* Formatos de app/list-format.tsx: el sello de tiempo del actor se dibuja con
   listDateFull (24 h, America/Asuncion), nunca con el ISO crudo. */
const asuncion = 'America/Asuncion';
const listDateFull = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Intl.DateTimeFormat('es-PY', {timeZone: asuncion, day: '2-digit', month: 'short', year: '2-digit'}).format(date).replace(/\./g, '');
  const clock = new Intl.DateTimeFormat('es-PY', {timeZone: asuncion, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date).slice(0, 5);
  return `${day} · ${clock}`;
};
const listDateShort = (value) => new Intl.DateTimeFormat('es-PY', {timeZone: asuncion, day: '2-digit', month: 'short'}).format(new Date(`${String(value).slice(0, 10)}T12:00:00Z`)).replace(/\./g, '').replace(/\s+/g, '-');
const actorIdentity = ({name, photo = '', timestamp = '', timeText = '', verified = true, imported = false}) => {
  const label = name || (imported ? 'Autor importado' : 'Sistema');
  const initials = label.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((word) => Array.from(word)[0]).join('').toLocaleUpperCase('es');
  const avatar = verified && photo ? `<img src="${photo}" alt="" referrerpolicy="no-referrer">` : initials;
  return `<span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${avatar}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${label}">${label}</span>${timestamp ? `<time class="actor-identity-time" datetime="${timestamp}" title="${timeText || listDateFull(timestamp)}">${timeText || listDateFull(timestamp)}</time>` : ''}${imported ? '<span class="actor-identity-source">Autor de registro importado</span>' : ''}</span></span>`;
};
const selectCustom = ({label, value}) => `<div class="ops-select"><span class="ops-label">${label}</span><button type="button" class="ops-select-trigger" title="${value}" aria-haspopup="listbox" aria-expanded="false"><span>${value}</span>${svg(ICON.chevron, 16)}</button></div>`;
const searchField = ({label, placeholder}) => `<label class="search-field"><span class="search-field-label">${label}</span><span class="search-field-box">${svg(ICON.search, 16)}<input type="search" value="" placeholder="${placeholder}" autocomplete="off"></span></label>`;
const serialTexto = (value) => `<span class="serial-text" title="${value}">${value.slice(0, -4)}<b>${value.slice(-4)}</b></span>`;
const amountCell = (text) => `<dd class="list-amount">${text}</dd>`;
/* app/field-rules.ts: único mensaje de ayuda del teléfono. */
const PHONE_HELP = 'Elegí el país y escribí solo dígitos, sin el 0 inicial. Paraguay: 9 dígitos para móvil, 8 para fijo; el resto: 6 a 12.';

/* ------------------------------------------------------------- inventario */
const verificationStamp = ({result, label, verifier, initials, time, stampClass, empty}) => {
  if (!time) return empty;
  const icon = result === 'confirmed' ? ICON.badgeCheck : result === 'difference' ? ICON.triangle : ICON.circleX;
  return `<span class="inventory-verify-stamp ${stampClass}" data-result="${result}">
   <span class="inventory-verify-check" role="img" title="Control: ${label}" aria-label="Control: ${label}">${svg(icon, 14)}</span>
   <span class="inventory-control-avatar"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span></span>
   <span class="inventory-verify-name" title="${verifier}">${verifier}</span>
   <time class="inventory-verify-time" datetime="2026-09-17T09:48:00-03:00">${time}</time>
  </span>`;
};

const equipmentCard = ({name, code, photo = '', status, statusLabel, category, categoryIcon, location, serial = '', value, selectable = true, selected = false, canManage = true, verification, returning = ''}) => `
<article class="inventory-equipment" data-status="${status}">
 <div class="panel-heading inventory-card-head">
  <div class="inventory-item-title">
   ${selectable ? `<label class="inventory-item-select" title="Seleccionar para operar en lote"><input type="checkbox" aria-label="Seleccionar ${name}"${selected ? ' checked' : ''}></label>` : ''}
   ${photo ? `<img class="inventory-item-photo" src="${photo}" alt="Foto de ${name}">` : ''}
   <div class="inventory-item-name"><h3 title="${name}">${name}</h3><code class="inventory-code">${code}</code></div>
  </div>
  <span class="inventory-state" data-status="${status}">${statusLabel}</span>
 </div>
 <div class="inventory-item-facts">
  <dl class="inventory-facts-inline">
   <div class="inventory-fact"><dt>Categoría</dt><dd title="${category}">${categoryIcon}${category}</dd></div>
   <div class="inventory-fact"><dt>Serie / IMEI</dt><dd title="${serial || 'Sin registrar'}">${serial ? serialTexto(serial) : 'Sin registrar'}</dd></div>
   <div class="inventory-fact"><dt>Valor</dt>${amountCell(value)}</div>
  </dl>
  <dl class="inventory-fact inventory-fact-location"><dt>Ubicación</dt><dd title="${location}">${location}</dd></dl>
 </div>
 <div class="inventory-card-foot">
  <div class="inventory-card-control">
   ${verificationStamp(verification)}
   ${canManage ? iconButton({title: 'Marcar verificado', label: `Marcar verificado: ${name}`, path: ICON.checkCircle, tone: 'positive inventory-verify-action'}) : ''}
   ${returning ? `<span class="hub-chip inventory-return-chip" title="${returning}">${returning}</span>` : ''}
  </div>
  <div class="inline-actions inventory-item-actions">
   ${iconButton({title: 'Detalle y trazabilidad', label: `Detalle y trazabilidad: ${name}`, path: ICON.eye})}
   ${iconButton({title: 'Imprimir etiqueta', label: `Imprimir etiqueta: ${name}`, path: ICON.tag})}
   ${canManage ? iconButton({title: 'Verificar con detalle', label: `Verificar con detalle: ${name}`, path: ICON.clipboard, tone: 'positive'}) + iconButton({title: 'Editar equipo', label: `Editar equipo: ${name}`, path: ICON.pencil}) + iconButton({title: 'Archivar equipo', label: `Archivar equipo: ${name}`, path: ICON.archive, tone: 'warn'}) : ''}
  </div>
 </div>
</article>`;

const equipment = [
  {
    name: 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)',
    code: 'SC-000128',
    photo: '/brand/icon-192.png',
    status: 'in_use',
    statusLabel: 'En uso',
    category: 'Almacenamiento',
    categoryIcon: svg(ICON.drive, 14),
    location: 'Con Fabrizio Dellacasa Reyes · Rodaje de contenidos · Campaña Primavera 2026 · Banco Atlas',
    serial: 'SD128GB-UHSII-SANDISK-2024-000123456789',
    value: 'Gs 1.234.567.890',
    selected: true,
    verification: {result: 'confirmed', label: 'Confirmado', verifier: 'Fabrizio', initials: 'FD', time: '17 sept 26 · 09:48', stampClass: 'inventory-verify-chip', empty: ''},
    returning: 'Devuelve María José Fernández de la Vega y Rivarola · previsto <span class="list-date" data-tone="warn">21 sept 26 · 18:00</span>',
  },
  {
    name: 'Cámara Sony FX6 Full Frame con montura E, visor OLED y tarjeta CFexpress de 512 GB',
    code: 'SC-000341',
    photo: '/brand/icon-192.png',
    status: 'available',
    statusLabel: 'Disponible',
    category: 'Cámara',
    categoryIcon: svg(ICON.camera, 14),
    location: 'Depósito Central · Estante A3 · fila 2',
    serial: 'SONY-FX6-0147852-2024-000998877',
    value: 'USD 12.345,67',
    verification: {result: 'difference', label: 'Con diferencias', verifier: 'Ana Paula', initials: 'AB', time: '12 sept 26 · 15:10', stampClass: 'inventory-verify-chip', empty: ''},
  },
  {
    name: 'Micrófono inalámbrico DJI Mic 2 (doble canal) con estuche de carga y accesorios de cámara',
    code: 'SC-000402',
    status: 'maintenance',
    statusLabel: 'Mantenimiento',
    category: 'Audio',
    categoryIcon: svg(ICON.drive, 14),
    location: 'Depósito Central · Estante B2',
    value: 'Gs 4.850.000',
    verification: {empty: '<span class="hub-chip muted">Sin verificación física</span>'},
  },
  {
    name: 'Monitor de campo SmallHD Cine 7 con jaula, baterías V-Mount y cables SDI de 60 cm',
    code: 'SC-000517',
    status: 'retired',
    statusLabel: 'Dado de baja',
    category: 'Monitor',
    categoryIcon: svg(ICON.drive, 14),
    location: 'Ubicación sin registrar',
    serial: 'SMALLHD-CINE7-000451',
    value: 'USD 3.499,00',
    selectable: false,
    canManage: false,
    verification: {empty: '<span class="hub-chip muted">Sin verificación física</span>'},
  },
  {
    name: 'Trípode Manfrotto 504X con cabezal fluido, patas de carbono y bolso de transporte rígido',
    code: 'SC-000623',
    status: 'available',
    statusLabel: 'Disponible',
    category: 'Soporte',
    categoryIcon: svg(ICON.drive, 14),
    location: 'Depósito Central · Estante B1 · fila 1',
    serial: 'MANFROTTO-504X-CARBON-00000712',
    value: 'Gs 9.750.000',
    verification: {result: 'missing', label: 'No encontrado', verifier: 'Carlos', initials: 'CO', time: '05 ago 26 · 11:02', stampClass: 'inventory-verify-chip', empty: ''},
  },
  {
    name: 'Lente Canon RF 24-70mm f/2.8L IS USM con parasol, filtro UV y estuche original',
    code: 'SC-000744',
    photo: '/brand/icon-192.png',
    status: 'available',
    statusLabel: 'Disponible',
    category: 'Lente',
    categoryIcon: svg(ICON.camera, 14),
    location: 'Depósito Central · Estante A1 · fila 4',
    serial: 'CN-RF2470-2.8L-000918273',
    value: 'USD 2.199,00',
    verification: {empty: '<span class="hub-chip muted">Sin verificación física</span>'},
  },
];

const equipmentSummary = `
<div class="kpi-strip" aria-label="Métricas de inventario">
 <article class="kpi-card tone-brand"><p class="eyebrow">VALOR TOTAL</p><strong>6 equipos</strong><div class="kpi-amounts"><span>Gs 1.249.167.890</span><span>USD 18.043,67</span></div></article>
 <article class="kpi-card tone-blue"><p class="eyebrow">EN USO</p><strong>1</strong><small>Retirados o en rodaje</small></article>
 <article class="kpi-card tone-warning"><p class="eyebrow">MANTENIMIENTO</p><strong>1</strong><small>No asignables a rodaje</small></article>
 <article class="kpi-card tone-green"><p class="eyebrow">DISPONIBLES</p><strong>3</strong><small>Listos para reservar</small></article>
</div>`;

const inventoryBulkBar = `
<div class="inventory-bulk-bar" role="status" aria-live="polite">
 <span class="inventory-bulk-count"><b>1</b> seleccionado</span>
 <div class="inline-actions inventory-bulk-actions">
  <button type="button" class="secondary">Reservar</button>
  <button type="button" class="secondary">Verificar</button>
  <button type="button" class="secondary">Mover ubicación</button>
  <button type="button" class="text-button">Limpiar</button>
 </div>
</div>`;

const inventoryToolbar = `
<div class="inventory-toolbar">
 <div class="panel-heading inventory-title-block"><div><h2>Inventario y reservas</h2><p class="form-note">Ubicación registrada y préstamo de equipos por producción.</p></div></div>
 <div class="inline-actions inventory-header-actions"><button type="button" class="secondary">Agregar equipo</button></div>
 <div class="inventory-toolbar-meta">
  <div class="inline-actions inventory-tabs" role="group" aria-label="Vistas de inventario"><button type="button" class="secondary" aria-pressed="true">Equipos</button><button type="button" class="text-button" aria-pressed="false">Calendario y reservas</button></div>
  <p class="form-note inventory-refresh-note" role="status">Sincroniza cada 30 s mientras esta pestaña esté visible. Actualizado 15:42</p>
 </div>
 <div class="inventory-toolbar-controls"><div class="inventory-form-grid inventory-filters">${searchField({label: 'Buscar equipo o ubicación', placeholder: 'Memoria, DJI Mic, estante…'})}${selectCustom({label: 'Categoría', value: 'Todas'})}</div>
 <div class="inventory-collection-toolbar"><p class="directory-summary" aria-live="polite">6 equipos visibles</p><div class="inventory-view-options" role="group" aria-label="Vista de inventario">
  <button type="button" aria-label="Ver como cuadrícula" aria-pressed="false" title="Ver como cuadrícula">${svg(ICON.grid, 18)}</button>
  <button type="button" class="active" aria-label="Ver como lista" aria-pressed="true" title="Ver como lista">${svg(ICON.list, 18)}</button>
  <button type="button" aria-label="Ver como pipeline de ubicaciones" aria-pressed="false" title="Ver como pipeline de ubicaciones">${svg(ICON.columns, 18)}</button>
 </div><button type="button" class="text-button inventory-select-visible">Seleccionar visibles</button></div>
 ${inventoryBulkBar}
 </div>
</div>`;

const inventoryEquipmentHead = '<div class="inventory-equipment-head" aria-hidden="true"><span>Foto</span><span></span><span>Artículo</span><span>Detalles</span><span>Estado</span><span>Ubicación</span><span>Verificación</span><span>Acciones</span></div>';

/* Reservas y calendario (app/inventory-workspace.tsx 312, 442-449). */
const reservationRow = ({title, status, statusLabel, project, dates, items, responsibles, returns, actions = '', audit = ''}) => `
<article class="inventory-reservation" data-status="${status}">
 <div class="inventory-reservation-title"><h3 title="${title}">${title}</h3><span class="inventory-status inventory-status-${status}">${statusLabel}</span></div>
 <span class="inventory-reservation-cell" title="${project}">${project}</span>
 <span class="inventory-reservation-cell" title="${dates}">${dates}</span>
 <span class="inventory-reservation-cell" title="${items}">${items}</span>
 <span class="inventory-reservation-cell" title="${responsibles}">${responsibles}</span>
 <span class="inventory-reservation-cell" title="${returns}">${returns}</span>
 ${actions}${audit}
</article>`;

const reservationHead = '<div class="inventory-reservation-head" aria-hidden="true"><span>Producción</span><span>Proyecto</span><span>Fechas</span><span>Equipos</span><span>Responsables</span><span>Devuelve</span><span>Acciones</span></div>';

const reservations = [
  {
    title: 'Rodaje campaña Primavera 2026 · Banco Atlas (estudio y exteriores)',
    status: 'reserved',
    statusLabel: 'Reservado',
    project: 'Campaña Primavera 2026 · Banco Atlas',
    dates: '17 sept 26 · 08:00 → 18 sept 26 · 19:30',
    items: 'Memoria SD UHS-II de 128 GB · Cámara Sony FX6 Full Frame · Lente Canon RF 24-70mm · Trípode Manfrotto 504X',
    responsibles: 'María José Fernández de la Vega y Rivarola, Fabrizio Dellacasa Reyes, Carlos Ramón Ovelar Giménez',
    returns: 'María José Fernández de la Vega y Rivarola',
    actions: `<div class="inline-actions inventory-reservation-actions">${iconButton({title: 'Editar reserva', label: 'Editar reserva: Rodaje campaña Primavera 2026', path: ICON.pencil})}${iconButton({title: 'Registrar retiro', label: 'Registrar retiro: Rodaje campaña Primavera 2026', path: ICON.package, tone: 'positive'})}${iconButton({title: 'Cancelar reserva', label: 'Cancelar reserva: Rodaje campaña Primavera 2026', path: ICON.x, tone: 'warn'})}</div>`,
    audit: `<p class="inventory-reservation-audit"><span>Reservado por ${actorIdentity({name: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png'})}</span><span class="inventory-late">Devolución pendiente desde 18 sept 26 · 19:30</span></p>`,
  },
  {
    title: 'Cobertura evento corporativo · Cooperativa Multiactiva de Servicios Múltiples Limitada',
    status: 'checked_out',
    statusLabel: 'Retirado',
    project: 'Aniversario 60 años · Cooperativa Multiactiva',
    dates: '19 sept 26 · 06:30 → 20 sept 26 · 23:00',
    items: 'Cámara Sony FX6 Full Frame · Monitor de campo SmallHD Cine 7 · Micrófono inalámbrico DJI Mic 2',
    responsibles: 'Carlos Ramón Ovelar Giménez',
    returns: 'Carlos Ramón Ovelar Giménez · Fabrizio Dellacasa Reyes',
    actions: `<div class="inline-actions inventory-reservation-actions">${iconButton({title: 'Registrar devolución', label: 'Registrar devolución: Cobertura evento corporativo', path: ICON.refresh, tone: 'positive'})}</div>`,
    audit: `<p class="inventory-reservation-audit"><span>Retiro por ${actorIdentity({name: 'Carlos Ramón Ovelar Giménez', photo: ''})}</span></p>`,
  },
  {
    title: 'Podcast mensual · Episodio 42 con invitados internacionales',
    status: 'returned',
    statusLabel: 'Devuelto',
    project: 'Contenido recurrente · Estudio de Comunicación',
    dates: '10 sept 26 · 09:00 → 10 sept 26 · 13:00',
    items: 'Micrófono inalámbrico DJI Mic 2 · Trípode Manfrotto 504X',
    responsibles: 'Ana Paula Benítez de la Cruz, María José Fernández de la Vega y Rivarola',
    returns: 'Ana Paula Benítez de la Cruz',
    actions: '<div class="inline-actions inventory-reservation-actions"></div>',
    audit: `<p class="inventory-reservation-audit"><span>Devolución por ${actorIdentity({name: 'Ana Paula Benítez de la Cruz', photo: ''})}</span></p>`,
  },
  {
    title: 'Entrevista institucional · Ministerio de Educación y Ciencias (cancelada por el cliente)',
    status: 'cancelled',
    statusLabel: 'Cancelado',
    project: 'Campaña institucional · MEC',
    dates: '21 sept 26 · 14:00 → 21 sept 26 · 17:00',
    items: 'Cámara Sony FX6 Full Frame',
    responsibles: 'Fabrizio Dellacasa Reyes',
    returns: '—',
    actions: '<div class="inline-actions inventory-reservation-actions"></div>',
  },
];

const calendarEvent = ({title, count, status, statusLabel}) => `<div class="inventory-calendar-event inventory-status-${status}"><b>${title}</b><small>${count} equipo(s) · ${statusLabel}</small></div>`;
const calendarDays = (() => {
  const events = {
    17: [calendarEvent({title: 'Rodaje campaña Primavera 2026', count: 4, status: 'reserved', statusLabel: 'Reservado'})],
    18: [calendarEvent({title: 'Rodaje campaña Primavera 2026', count: 4, status: 'reserved', statusLabel: 'Reservado'})],
    19: [calendarEvent({title: 'Cobertura evento corporativo', count: 3, status: 'checked_out', statusLabel: 'Retirado'})],
    22: [calendarEvent({title: 'Grabación de spots · Banco Atlas', count: 2, status: 'reserved', statusLabel: 'Reservado'})],
    25: [calendarEvent({title: 'Podcast mensual · Episodio 42', count: 2, status: 'returned', statusLabel: 'Devuelto'})],
  };
  const cells = ['<div class="inventory-calendar-blank"></div>'];
  for (let day = 1; day <= 30; day += 1) {
    const key = String(day).padStart(2, '0');
    cells.push(`<div class="inventory-calendar-day" aria-label="2026-09-${key}"><time datetime="2026-09-${key}">${day}</time>${events[day] ? events[day].join('') : ''}</div>`);
  }
  return cells.join('');
})();
const inventoryCalendar = `
<label class="inventory-month">Mes del calendario<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
<p class="form-note">Horarios de Asunción. Se incluyen retiros pendientes de devolución aunque sean de otro mes.</p>
<div class="inventory-calendar" aria-label="Calendario mensual de reservas">
 <div class="inventory-weekdays" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div>
 <div class="inventory-calendar-grid">${calendarDays}</div>
</div>`;

/* --------------------------------------------------------------- estudio */
const studioSpaces = [
  {name: 'Estudio Principal · Ciclorama verde y control de sonido', scenario: 'Ciclorama verde 6×4 m con parrilla de luces y aislamiento acústico', notes: 'Requiere coordinación previa para cambio de fondo. Capacidad máxima: 12 personas.', active: true},
  {name: 'Cabina de podcast insonorizada con mesa de 6 posiciones', scenario: 'Mesa de mezcla Rodecaster Pro II y 6 micrófonos dinámicos', notes: 'Los micrófonos y auriculares se retiran de Inventario por separado.', active: true},
  {name: 'Estudio fotográfico de producto con mesa y fondos infinitos', scenario: 'Fondos infinitos blanco, negro y cromo', notes: '', active: true},
  {name: 'Set de streaming temporal para lanzamientos en vivo', scenario: 'Fondo LED y switcher de 4 cámaras', notes: 'Espacio reconfigurado; verificá el aforo antes de reservar.', active: false},
];
const studioSpaceCard = (space) => `
<article class="studio-space">
 <div><h3>${space.name}</h3><p>${space.scenario || 'Escenario sin especificar'}</p>${space.notes ? `<small>${space.notes}</small>` : ''}</div>
 <div>${space.active ? '<span class="studio-state">Disponible</span>' : '<span class="studio-state muted">Inactivo</span>'}<button class="text-button">${svg(ICON.pencil, 14)}Editar</button></div>
</article>`;

const studioReservations = [
  {
    title: 'Grabación de campaña · Banco Atlas (día completo con set armado)',
    space: 'Estudio Principal · Ciclorama verde y control de sonido',
    scenario: 'Ciclorama verde 6×4 m con parrilla de luces y aislamiento acústico',
    type: 'Video / Reels',
    schedule: '17 sept 26 · 08:00 → 17 sept 26 · 19:30',
    project: 'Campaña Primavera 2026 · Banco Atlas',
    members: ['María José Fernández de la Vega y Rivarola', 'Fabrizio Dellacasa Reyes', 'Carlos Ramón Ovelar Giménez'],
    status: 'Reservada',
    cancelled: false,
    actor: 'María José Fernández de la Vega y Rivarola',
    notes: 'Traer el set de luces adicional del depósito. El cliente llega 07:30.',
  },
  {
    title: 'Podcast · Episodio 42 con invitados internacionales',
    space: 'Cabina de podcast insonorizada con mesa de 6 posiciones',
    scenario: 'Mesa de mezcla Rodecaster Pro II y 6 micrófonos dinámicos',
    type: 'Podcast',
    schedule: '22 sept 26 · 09:00 → 22 sept 26 · 12:30',
    project: null,
    members: ['Ana Paula Benítez de la Cruz'],
    status: 'Reservada',
    cancelled: false,
    actor: 'Ana Paula Benítez de la Cruz',
    notes: '',
  },
  {
    title: 'Sesión de fotos de producto · catálogo completo de temporada',
    space: 'Estudio fotográfico de producto con mesa y fondos infinitos',
    scenario: 'Fondos infinitos blanco, negro y cromo',
    type: 'Foto',
    schedule: '25 sept 26 · 13:00 → 25 sept 26 · 18:00',
    project: 'Catálogo Primavera 2026 · Casa del Sur',
    members: ['Carlos Ramón Ovelar Giménez', 'Fabrizio Dellacasa Reyes'],
    status: 'Reservada',
    cancelled: false,
    actor: 'Fabrizio Dellacasa Reyes',
    notes: '',
  },
  {
    title: 'Streaming de lanzamiento · 4 horas continuas con dos cámaras',
    space: 'Set de streaming temporal para lanzamientos en vivo',
    scenario: 'Fondo LED y switcher de 4 cámaras',
    type: 'Streaming',
    schedule: '28 sept 26 · 18:00 → 28 sept 26 · 22:00',
    project: 'Lanzamiento de producto · Nova',
    members: ['María José Fernández de la Vega y Rivarola'],
    status: 'Cancelada',
    cancelled: true,
    actor: 'María José Fernández de la Vega y Rivarola',
    notes: 'Cancelada por reprogramación del cliente.',
  },
];

const studioReservationRow = (reservation) => `
<article class="studio-reservation">
 <div class="studio-reservation-identity"><h3 title="${reservation.title}">${reservation.title}</h3><small title="${reservation.space}${reservation.scenario ? ' · ' + reservation.scenario : ''} · ${reservation.type}">${reservation.space}${reservation.scenario ? ' · ' + reservation.scenario : ''} · ${reservation.type}</small></div>
 <span class="studio-reservation-schedule">${reservation.schedule}</span>
 <span class="studio-reservation-project" title="${reservation.project || 'Sin proyecto vinculado'}">${reservation.project || 'Sin proyecto vinculado'}</span>
 <span class="studio-members"><span>Responsables:</span>${reservation.members.map((name) => actorIdentity({name, photo: ''})).join('')}</span>
 <span class="${reservation.cancelled ? 'studio-state muted' : 'studio-state'}">${reservation.status}</span>
 ${reservation.cancelled ? '' : `<div class="inline-actions studio-reservation-actions">${iconButton({title: 'Editar reserva', label: `Editar reserva: ${reservation.title}`, path: ICON.pencil})}${iconButton({title: 'Cancelar reserva', label: `Cancelar reserva: ${reservation.title}`, path: ICON.x, tone: 'warn'})}</div>`}
 ${reservation.actor ? `<p class="form-note studio-reservation-note">Creada por ${actorIdentity({name: reservation.actor, photo: '', verified: false})}</p>` : ''}
 ${reservation.notes ? `<p class="form-note studio-reservation-note">${reservation.notes}</p>` : ''}
</article>`;

const studioCalendar = (() => {
  const events = {
    17: [['Estudio Principal', 'Grabación de campaña · Banco Atlas']],
    22: [['Cabina de podcast', 'Podcast · Episodio 42']],
    25: [['Estudio fotográfico', 'Catálogo Primavera 2026']],
  };
  const cells = ['<div class="studio-calendar-blank"></div>'];
  for (let day = 1; day <= 30; day += 1) {
    const key = String(day).padStart(2, '0');
    cells.push(`<div class="studio-calendar-day"><time datetime="2026-09-${key}">${day}</time>${events[day] ? events[day].map(([space, title]) => `<div class="studio-calendar-event"><b>${space}</b><span>${title}</span></div>`).join('') : ''}</div>`);
  }
  return `<div class="studio-calendar" aria-label="Calendario mensual del estudio"><div class="studio-weekdays" aria-hidden="true"><span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span></div><div class="studio-calendar-grid">${cells.join('')}</div></div>`;
})();

/* ---------------------------------------------------------------- equipo */
/* El perfil laboral reserva las tres filas (Correo, Acceso, Ingreso); el miembro
   sin ficha solo muestra Correo y Acceso (operations.tsx 572-605). */
const personFacts = ({email, accessRole, accessState, startedOn}, member = false) => `<dl class="person-hub-facts">
 <div class="person-hub-fact-wide"><dt>Correo</dt><dd title="${email}">${email}</dd></div>
 <div><dt>Acceso</dt><dd title="${accessRole} · ${accessState}">${accessRole} · ${accessState}</dd></div>
 ${member ? '' : `<div><dt>Ingreso</dt><dd class="list-date">${startedOn || 'Sin fecha'}</dd></div>`}
</dl>`;
const teamAccess = ({statusLabel, statusClass, action}) => `<section class="team-access" aria-label="Acceso al panel">
 <header class="team-access-header"><h3>Acceso al panel</h3><span class="team-access-status ${statusClass}" data-access-state="${statusClass.slice(3)}">${statusLabel}</span></header>
 ${action ? `<div class="team-access-actions"><button type="button" class="secondary">${action}</button></div>` : ''}
</section>`;
const personActions = (person) => `<footer class="person-hub-actions">
 <div class="person-hub-buttons">${person.actions.profile ? `<button class="text-button">${svg(ICON.pencil, 14)}Perfil</button>` : ''}</div>
 ${person.actions.remove ? `<div class="ops-card-actions">${iconButton({title: 'Mover a la papelera', label: `Mover a la papelera: ${person.name}`, path: ICON.trash, tone: 'record-remove'})}</div>` : ''}
</footer>`;

const people = [
  {
    kind: 'profile',
    name: 'María José Fernández de la Vega y Rivarola',
    photo: '/brand/icon-192.png',
    role: 'Gerencia',
    state: 'Activo',
    facts: {email: 'maria.jose.fernandez.delavega@estudiocomunicacionparaguay.com.py', accessRole: 'Gerencia', accessState: 'Acceso habilitado', startedOn: '14-mar'},
    chips: '<span class="person-hub-comp">Fijo mensual</span><span class="hub-chip">Día de pago 15</span><span class="hub-chip">Emite factura</span>',
    notes: 'Coordina la planificación trimestral de producción, el calendario de rodajes y la relación con los clientes de mayor volumen.',
    access: {statusLabel: 'Acceso habilitado', statusClass: 'is-active', action: ''},
    actions: {profile: true, remove: true},
  },
  {
    kind: 'profile',
    name: 'Carlos Ramón Ovelar Giménez',
    photo: '',
    role: 'Producción',
    state: 'Inactivo',
    facts: {email: 'carlos.ramon.ovelar.gimenez@productora-paraguay.com.py', accessRole: 'Producción', accessState: 'Acceso suspendido', startedOn: '02-feb'},
    chips: '<span class="person-hub-comp">Por hora</span><span class="hub-chip">Día de pago 30</span><span class="hub-chip warn">Salió el 12-sept</span>',
    notes: 'Acceso suspendido mientras se revisa la asignación de equipos del último rodaje. Conserva pagos y comentarios.',
    access: {statusLabel: 'Acceso suspendido', statusClass: 'is-suspended', action: ''},
    actions: {profile: true, remove: true},
  },
  {
    kind: 'profile',
    name: 'Ana Paula Benítez de la Cruz',
    photo: '/brand/icon-192.png',
    role: 'Finanzas',
    state: 'Activo',
    facts: {email: 'ana.paula.benitez.delacruz@estudiocomunicacionparaguay.com.py', accessRole: 'Finanzas', accessState: 'Acceso habilitado', startedOn: '20-jul-2023'},
    chips: '<span class="person-hub-comp">Fijo mensual</span><span class="hub-chip">Día de pago 5</span><span class="hub-chip">Emite factura</span>',
    notes: '',
    access: {statusLabel: 'Acceso habilitado', statusClass: 'is-active', action: ''},
    actions: {profile: true, remove: true},
  },
  {
    kind: 'member',
    name: 'Fabrizio Dellacasa Reyes',
    photo: '/brand/icon-192.png',
    memberActive: true,
    accessRole: 'Producción',
    accessState: 'Acceso habilitado',
    facts: {email: 'fabrizio.dellacasa.reyes@estudiocomunicacionparaguay.com.py', accessRole: 'Producción', accessState: 'Acceso habilitado', startedOn: ''},
    access: {statusLabel: 'Acceso habilitado', statusClass: 'is-active', action: 'Invitar al panel'},
    actions: {profile: false, remove: false},
  },
  {
    kind: 'member',
    name: 'Ramón Augusto Villalba de Jesús',
    photo: '',
    memberActive: false,
    accessRole: 'Editor',
    accessState: 'Acceso suspendido',
    facts: {email: 'ramon.augusto.villalba.dejesus@estudiocomunicacionparaguay.com.py', accessRole: 'Editor', accessState: 'Acceso suspendido', startedOn: ''},
    access: {statusLabel: 'Acceso suspendido', statusClass: 'is-suspended', action: 'Reinvitar'},
    actions: {profile: false, remove: false},
  },
];

const personCard = (person, list = false) => {
  const isMember = person.kind === 'member';
  // En lista la app baja foto y contenedor a 32px (PhotoViewer size / PersonContainer md);
  // en cuadrícula usa 48px (operations.tsx 561, 599).
  const avatarSize = list ? 32 : 48;
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();
  const avatar = isMember
    ? `<div class="ops-person"><span class="person-container person-container-${list ? 'md' : 'lg'}"><span class="person-container-avatar" aria-hidden="true">${person.photo ? `<img src="${person.photo}" alt="" referrerpolicy="no-referrer">` : initials}</span><span class="person-container-details"><span class="person-container-name" title="${person.name}">${person.name}</span></span></span></div>`
    : `<div class="ops-person">${person.photo ? `<button type="button" class="photo-preview-button" style="width:${avatarSize}px;height:${avatarSize}px" aria-label="Ampliar foto de ${person.name}"><img src="${person.photo}" alt="Foto de ${person.name}" referrerpolicy="no-referrer"><span aria-hidden="true">${svg(ICON.zoomIn, 13)}</span></button>` : `<span class="avatar">${initials}</span>`}<div><h3 title="${person.name}">${person.name}</h3><small>${person.role}</small></div></div>`;
  const stateLabel = isMember ? (person.memberActive ? 'Acceso activo' : 'Acceso suspendido') : person.state;
  const stateAttr = isMember ? (person.memberActive ? 'active' : 'inactive') : (person.state === 'Activo' ? 'active' : 'inactive');
  const chips = isMember
    ? '<div class="person-hub-chips"><span class="hub-chip muted">Sin ficha laboral: agregala para registrar remuneración, fechas y pagos.</span></div>'
    : `<div class="person-hub-chips">${person.chips}</div>`;
  // Las notas son hijas directas de la tarjeta: en lista ocupan la fila 2
  // (.person-hub-card.is-list>.ops-note-preview) y nunca viajan dentro del pie.
  const note = person.notes ? `<p class="ops-note-preview" title="${person.notes}">${person.notes}</p>` : '';
  const tail = `<div class="person-hub-tail">${teamAccess(person.access)}${isMember ? `<footer class="person-hub-actions"><div class="person-hub-buttons"><button class="text-button">${svg(ICON.plus, 14)}Agregar ficha laboral</button><button class="text-button">${svg(ICON.pencil, 14)}Editar</button></div></footer>` : personActions(person)}</div>`;
  return `
<article class="ops-card person-hub-card${list ? ' is-list' : ''}">
 <header class="person-hub-head">
  <label class="select-check" title="Seleccionar integrante"><input type="checkbox" aria-label="Seleccionar ${person.name}"></label>
  ${avatar}
  <span class="person-hub-state" data-state="${stateAttr}">${stateLabel}</span>
 </header>
 ${personFacts(person.facts, isMember)}
 ${chips}
 ${note}
 ${tail}
</article>`;
};

/* ----------------------------------------------------------- invitaciones */
/* El encabezado nombra la columna de cada lista: «Solicitud» en solicitudes y
   «Enlace» en enlaces recientes (invite-links.tsx 22-27). */
const inviteHead = (label) => `<div class="invite-link-head" aria-hidden="true"><span>${label}</span><span>Acciones</span></div>`;
const inviteRequests = [
  {
    actor: 'Ramón Augusto Villalba de Jesús',
    email: 'ramon.augusto.villalba.dejesus@estudiocomunicacionparaguay.com.py',
    role: 'Editor',
    status: 'pending',
    timestamp: '2026-09-18T10:24:00-03:00',
    unavailable: '',
  },
  {
    actor: 'Lucía Fernanda Centurión Aquino',
    email: 'lucia.fernanda.centurion.aquino@productora-paraguay.com.py',
    role: 'Solo lectura',
    status: 'unavailable',
    timestamp: '2026-09-11T16:02:00-03:00',
    unavailable: 'Solicitud no disponible. El enlace venció.',
  },
];
const inviteRequestRow = (request) => `
<article class="payment-row invite-link-row">
 <div class="invite-link-person">${actorIdentity({name: request.actor, photo: '', timestamp: request.timestamp})}<p>${request.email} · ${request.role}</p>${request.status !== 'pending' ? `<p role="status">${request.unavailable}</p>` : ''}</div>
 <div class="actions invite-link-actions">${request.status === 'pending' ? '<button class="secondary">Aprobar acceso</button>' : ''}<button class="text-button danger">${svg(ICON.x, 14)}Rechazar</button></div>
</article>`;

const inviteLinks = [
  {
    role: 'Producción',
    mode: 'Un solo uso',
    expires: '2026-09-27',
    meta: '0 clics · 0 cuentas creadas',
    actor: 'María José Fernández de la Vega y Rivarola',
    joined: [],
  },
  {
    role: 'Solo lectura',
    mode: 'Con aprobación',
    used: true,
    meta: '48 clics · 3 cuentas creadas',
    actor: 'Ana Paula Benítez de la Cruz',
    joined: [
      {name: 'Ramón Augusto Villalba de Jesús', email: 'ramon.augusto.villalba.dejesus@estudiocomunicacionparaguay.com.py', timestamp: '2026-08-30T09:12:00-03:00'},
      {name: 'Lucía Fernanda Centurión Aquino', email: 'lucia.fernanda.centurion.aquino@productora-paraguay.com.py', timestamp: '2026-08-30T09:40:00-03:00'},
    ],
  },
  {
    role: 'Colaborador',
    mode: 'Un solo uso',
    revoked: true,
    meta: '12 clics · 0 cuentas creadas',
    actor: 'Fabrizio Dellacasa Reyes',
    joined: [],
  },
];
const inviteLinkState = (link) => link.revoked ? 'Revocado' : link.used ? 'Utilizado' : `Vence ${listDateShort(link.expires)}`;
/* Eliminar solo aparece cuando el enlace está agotado o revocado y nadie se unió;
   los que tuvieron ingresos conservan su historial (invite-links.tsx 27). */
const inviteLinkRow = (link) => `
<article class="payment-row invite-link-row">
 <div class="invite-link-person">
  <strong title="${link.role} · ${link.mode}">${link.role} · ${link.mode}</strong>
  <p title="${inviteLinkState(link)} · ${link.meta} · Creado por ${link.actor} · ${link.joined.length ? `Se unieron ${link.joined.map((join) => join.name).join(', ')}` : 'Nadie se unió todavía'}">${inviteLinkState(link)} · ${link.meta}</p>
  ${actorIdentity({name: link.actor, photo: '', verified: false})}${link.joined.length ? `<span class="invite-link-joined-chip" title="Se unieron ${link.joined.map((join) => join.name).join(', ')}">${link.joined.length} unidos</span>` : ''}
 </div>
 <div class="actions invite-link-actions"><button class="secondary">${svg(ICON.copy, 16)}Copiar enlace</button>${!link.joined.length && (link.revoked || link.used) ? `<button class="text-button invite-link-delete">${svg(ICON.trash, 16)}Eliminar</button>` : !link.joined.length ? `<button class="text-button">${svg(ICON.x, 16)}Revocar</button>` : ''}</div>
</article>`;

/* --------------------------------------------------- roles y permisos */
const permissionRoles = ['owner', 'admin', 'management', 'finance', 'sales', 'production', 'editor', 'viewer', 'collaborator'];
/* Etiquetas de app/team-directory.ts (fuente única de cargos). */
const roleLabels = {owner: 'Dueño', admin: 'Administrador', management: 'Gerencia', finance: 'Finanzas', sales: 'Ventas', production: 'Producción', editor: 'Editor', viewer: 'Solo lectura', collaborator: 'Colaborador'};
const permissionGroups = [
  {name: 'Panel', rows: [
    {id: 'dashboard.view', label: 'Ver el resumen operativo de la empresa', description: 'Tablero con piezas por etapa, señales y control center.', defaults: permissionRoles, allowed: permissionRoles},
    {id: 'activity.view', label: 'Ver la actividad del equipo', description: 'Auditoría de cambios operativos registrados por el servidor.', defaults: ['owner', 'admin'], allowed: ['owner', 'admin', 'management']},
    {id: 'preferences.self', label: 'Editar preferencias propias', description: 'Página inicial y perfil personal por navegador.', defaults: permissionRoles, allowed: permissionRoles},
  ]},
  {name: 'Comercial', rows: [
    {id: 'clients.manage', label: 'Gestionar clientes, planes y presupuestos', description: 'Alta, edición, plan contratado y presupuestos del cliente.', defaults: ['owner', 'admin', 'management', 'sales', 'collaborator'], allowed: ['owner', 'admin', 'management', 'sales', 'finance', 'collaborator']},
    {id: 'budgets.publish', label: 'Publicar el enlace público del presupuesto', description: 'Habilita la aceptación del presupuesto por el cliente.', defaults: ['owner', 'admin', 'management', 'sales'], allowed: ['owner', 'admin', 'management', 'sales']},
  ]},
  {name: 'Equipo', rows: [
    {id: 'team.access', label: 'Invitar y administrar accesos del equipo', description: 'Invitaciones, suspensión y reinvitación de integrantes.', defaults: ['owner', 'admin', 'management'], allowed: ['owner', 'admin', 'management']},
    {id: 'salary.view', label: 'Ver salarios y remuneraciones', description: 'Montos de compensación, día de pago y facturación del colaborador.', defaults: ['owner', 'admin', 'finance'], allowed: ['owner', 'admin', 'finance']},
    {id: 'permissions.reset', label: 'Restablecer los permisos por defecto', description: 'Vuelve toda la matriz de permisos a los valores de fábrica.', defaults: ['owner'], allowed: ['owner']},
  ]},
];
const permissionRow = (row) => `<tr>
 <th scope="row"><b>${row.label}</b><small>${row.description}</small></th>
 ${permissionRoles.map((role) => {
    const checked = row.allowed.includes(role);
    const isDefault = row.defaults.includes(role);
    return `<td><label class="permissions-check"><input type="checkbox"${checked ? ' checked' : ''} aria-label="${row.label} · ${roleLabels[role]}"><span class="permissions-state ${checked ? 'is-allowed' : 'is-denied'} ${checked === isDefault ? 'is-default' : 'is-override'}" aria-hidden="true">${checked ? '✓' : '×'}</span></label></td>`;
  }).join('')}
</tr>`;
const permissionsTable = `
<div class="permissions-scroll"><table>
 <thead><tr><th>Capacidad</th>${permissionRoles.map((role) => `<th>${roleLabels[role]}</th>`).join('')}</tr></thead>
 ${permissionGroups.map((group) => `<tbody>${`<tr class="permissions-domain-row"><th colspan="${permissionRoles.length + 1}" scope="colgroup">${group.name}</th></tr>`}${group.rows.map(permissionRow).join('')}</tbody>`).join('')}
</table></div>`;

/* ---------------------------------------------------- historial / actividad */
const historyLine = ({actor, photo = '', timestamp, title, meta}) => `<article class="activity-line">
 <div class="history-author">${actorIdentity({name: actor, photo, timestamp})}</div>
 <p title="${title}">${title}</p>
 <small>${meta}</small>
</article>`;

const activityDay = ({label, count, rows}) => `<section class="activity-day">
 <h3 class="activity-day-title">${label} <span>${count}</span></h3>
 <div class="activity-day-rows">${rows.map((row) => `<div class="activity-feed-row">${actorIdentity({name: row.actor, photo: row.photo || '', timestamp: row.timestamp})}<p title="${row.table} · ${row.operation}"><b>${row.table}</b> · ${row.operation}</p><small>Registro ${row.record}</small></div>`).join('')}</div>
</section>`;

const usageCards = [
  {name: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', status: 'En línea', state: 'active', last: '20 sept 26 · 15:42', summary: '148 sesiones · 312 h 40 min activos aprox.'},
  {name: 'Carlos Ramón Ovelar Giménez', photo: '', status: 'Inactivo', state: 'active', last: '19 sept 26 · 23:58', summary: '96 sesiones · 187 h 12 min activos aprox.'},
  {name: 'Lucía Fernanda Centurión Aquino', photo: '', status: 'Desconectado', state: 'inactive', last: '02 sept 26 · 09:05', summary: '12 sesiones · 8 h 3 min activos aprox.'},
];

/* --------------------------------------------------------- configuración */
/* El Editor dibuja el campo de texto dentro de su <label>; los campos con
   `choices` van directo como SelectCustom y el teléfono usa PhoneField
   (operations.tsx 119-133, phone-field.tsx 20-25). */
const settingsField = ({label: fieldLabel, value, optional = false, help = '', wide = false, control = 'input', type = 'text'}) => {
  const optionalMark = optional ? '<span class="field-optional"> · Opcional</span>' : '';
  if (control === 'select') return `<div${wide ? ' class="ops-wide"' : ''}>${selectCustom({label: `${fieldLabel}${optional ? ' · Opcional' : ''}`, value})}</div>`;
  const inner = control === 'phone'
    ? `<span class="phone-input"><select aria-label="Código de país"><option value="+595">🇵🇾 +595</option></select><input id="settings-phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="981 123 456" maxlength="18" value="${value}"></span>`
    : `<input id="settings-${fieldLabel.toLowerCase().replace(/[^a-z]+/g, '-')}" type="${type}" value="${value}">`;
  return `<div${wide ? ' class="ops-wide"' : ''}>
 <label><span>${fieldLabel}${optionalMark}</span>
  ${inner}
 </label>
 ${help ? `<small class="field-help">${help}</small>` : ''}
</div>`;
};

const integrationRow = (name, description, status) => `<article role="listitem"><div><strong>${name}</strong><p title="${description}">${description}</p></div><span class="settings-status">${status}</span></article>`;
const companySettingsRows = [
  {name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', role: 'Dueño', current: true, preferred: true},
  {name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', role: 'Administración', current: false, preferred: false},
  {name: 'Fundación Niñez y Comunidad', role: 'Lectura', current: false, preferred: false},
];
const companySettingsRow = (company) => `<article class="company-settings-row${company.current ? ' is-current' : ''}${company.preferred ? ' is-default' : ''}">
 <span class="company-settings-icon">${svg(ICON.building, 20)}</span>
 <div class="company-settings-name"><strong>${company.name}</strong><div class="company-settings-meta"><span>${company.role}</span>${company.current ? '<span class="company-settings-state">Empresa abierta</span>' : ''}</div></div>
 <div class="company-settings-actions">${company.current ? '' : '<button class="secondary company-settings-open">Abrir</button>'}<button class="secondary company-settings-default" aria-label="${company.preferred ? 'Empresa predeterminada' : 'Usar al iniciar sesión'}" aria-pressed="${company.preferred}" title="${company.preferred ? 'Empresa predeterminada' : 'Usar al iniciar sesión'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="${company.preferred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON.star}</svg><span class="company-settings-sr-only">${company.preferred ? 'Predeterminada' : 'Usar al iniciar sesión'}</span></button></div>
</article>`;

/* --------------------------------------------------------------- papelera */
const trashRecords = [
  {kind: 'Cliente', name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-18T11:32:00-03:00'},
  {kind: 'Proyecto', name: 'Campaña Primavera 2026 · Banco Atlas (incluye piezas para redes y vía pública)', actor: 'Fabrizio Dellacasa Reyes', photo: '', timestamp: '2026-09-17T17:04:00-03:00'},
  {kind: 'Equipo de inventario', name: 'Cámara Sony FX6 Full Frame con montura E, visor OLED y tarjeta CFexpress', actor: 'Carlos Ramón Ovelar Giménez', photo: '', timestamp: '2026-09-12T09:20:00-03:00'},
  {kind: 'Presupuesto', name: 'Presupuesto N.º 2026-0148 · Producción audiovisual integral y difusión', actor: 'Ana Paula Benítez de la Cruz', photo: '', timestamp: '2026-09-05T14:48:00-03:00'},
  {kind: 'Colaborador', name: 'Ramón Augusto Villalba de Jesús', actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-08-31T08:10:00-03:00'},
];
const trashRow = (record) => `<li class="trash-row">
 <label class="select-check" title="Seleccionar registro"><input type="checkbox" aria-label="Seleccionar ${record.name}"></label>
 <span class="trash-kind">${record.kind}</span>
 <div class="trash-info"><b title="${record.name}">${record.name}</b><small title="Movido a Papelera por ${record.actor} · ${record.timeText}">Movido a Papelera por ${actorIdentity({name: record.actor, photo: record.photo, timestamp: record.timestamp, timeText: record.timeText})}</small></div>
 <button class="secondary trash-restore">Restaurar</button>
</li>`;

/* -------------------------------------------------------------- export */
export default [
  {
    id: 'inventario-equipos-lista',
    section: 'Inventario',
    surface: 'Equipos en lista',
    kind: 'workspace',
    lists: [{
      container: '.inventory-equipment-list',
      head: '.inventory-equipment-head',
      row: '.inventory-equipment',
      label: 'Inventario · equipos',
      template: '--inventory-cols',
      rowHeight: [44, 52],
      exemptBelow: 940,
    }],
    body: `
<div class="ops-stack inventory-workspace">
 <section class="panel">${inventoryToolbar}
 ${equipmentSummary}
 <div class="inventory-equipment-grid inventory-equipment-list">
  ${inventoryEquipmentHead}
  ${equipment.map((item) => equipmentCard(item)).join('')}
 </div>
 </section>
</div>`,
  },

  {
    id: 'inventario-equipos-cuadricula',
    section: 'Inventario',
    surface: 'Equipos en cuadrícula',
    kind: 'workspace',
    grids: [{container: '.inventory-equipment-grid', card: '.inventory-equipment', label: 'Inventario · cuadrícula', minHeight: 210}],
    body: `<div class="inventory-equipment-grid">${equipment.map((item) => equipmentCard(item)).join('')}</div>`,
  },

  {
    id: 'inventario-reservas-lista',
    section: 'Inventario',
    surface: 'Calendario y reservas',
    kind: 'workspace',
    lists: [{
      container: '.inventory-reservation-list',
      head: '.inventory-reservation-head',
      row: '.inventory-reservation',
      label: 'Inventario · reservas',
      template: '--reservation-cols',
      rowHeight: [44, 52],
      exemptBelow: 940,
    }],
    body: `
<div class="ops-stack inventory-workspace">
 <section class="panel">
  <label class="inventory-month">Mes del calendario<input type="month" value="2026-09" min="1900-01" max="9998-12"></label>
  <p class="form-note">Horarios de Asunción. Se incluyen retiros pendientes de devolución aunque sean de otro mes.</p>
  <div class="inventory-reservation-list">${reservationHead}${reservations.map(reservationRow).join('')}</div>
 </section>
</div>`,
  },

  {
    id: 'inventario-calendario',
    section: 'Inventario',
    surface: 'Calendario mensual',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `<div class="ops-stack inventory-workspace"><section class="panel">${inventoryCalendar}</section></div>`,
  },

  {
    id: 'estudio-espacios-cuadricula',
    section: 'Estudio',
    surface: 'Espacios del estudio',
    kind: 'workspace',
    grids: [{container: '.studio-spaces', card: '.studio-space', label: 'Estudio · espacios', minHeight: 190}],
    body: `
<div class="studio-workspace ops-stack">
 <section class="panel">
  <div class="panel-heading"><div><h2>Estudio y reservas</h2><p class="form-note">Espacios, escenarios y franjas de producción. No reserva ni retira equipos.</p></div><div class="inline-actions"><button class="secondary">Agregar espacio</button><button class="primary">Nueva reserva</button></div></div>
  <div class="studio-spaces">${studioSpaces.map(studioSpaceCard).join('')}</div>
 </section>
</div>`,
  },

  {
    id: 'estudio-reservas-lista',
    section: 'Estudio',
    surface: 'Reservas en lista',
    kind: 'workspace',
    lists: [{
      container: '.studio-reservation-list',
      head: '.studio-reservation-head',
      row: '.studio-reservation',
      label: 'Estudio · reservas',
      template: '--studio-cols',
      rowHeight: [44, 52],
      exemptBelow: 980,
    }],
    body: `
<div class="studio-workspace ops-stack">
 <section class="panel">
  <div class="panel-heading"><div><h2>Calendario del estudio</h2><p class="form-note">Horario de Asunción. Una reserva activa bloquea únicamente su espacio.</p></div><label class="studio-month">Mes<input type="month" value="2026-09"></label></div>
  ${studioCalendar}
  <div class="studio-reservation-list">
   <div class="studio-reservation-head" aria-hidden="true"><span>Reserva</span><span>Horario</span><span>Proyecto</span><span>Responsables</span><span>Estado</span><span>Acciones</span></div>
   ${studioReservations.map(studioReservationRow).join('')}
  </div>
 </section>
</div>`,
  },

  {
    id: 'equipo-lista',
    section: 'Equipo',
    surface: 'Personas en lista',
    kind: 'workspace',
    lists: [{
      container: '.ops-grid.ops-grid-list',
      head: '.person-hub-head-row',
      row: '.person-hub-card',
      label: 'Equipo · lista',
      template: '--person-cols',
      rowHeight: [44, 52],
      exemptBelow: 860,
    }],
    body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">PERSONAS, ACCESOS Y REMUNERACIONES</p><h2>Equipo de Estudio de Comunicación y Producción Audiovisual del Paraguay</h2></div><div class="inline-actions"><button class="secondary">Permisos del panel</button><button class="primary">${svg(ICON.plus, 16)}Agregar persona</button></div></div>
 <div class="team-filters">
  ${searchField({label: 'Buscar persona', placeholder: 'Nombre, correo o cargo'})}
  <div class="choice-list compact"><button class="choice active">Todos</button><button class="choice">Activos</button><button class="choice">Inactivos</button></div>
  <div class="workspace-view-controls"><div role="group" aria-label="Vista del equipo"><button type="button" aria-label="Ver como cuadrícula" aria-pressed="false" title="Ver como cuadrícula">${svg(ICON.grid, 18)}</button><button type="button" aria-label="Ver como lista" aria-pressed="true" title="Ver como lista">${svg(ICON.list, 18)}</button></div></div>
 </div>
 <div class="ops-grid ops-grid-list">
  <div class="bulk-bar" role="status" aria-live="polite"><span class="bulk-count"><b>2</b> seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="text-button">Seleccionar visibles</button><button type="button" class="secondary">Suspender acceso</button><button type="button" class="secondary">Reactivar acceso</button><button type="button" class="text-button">Limpiar</button></div></div>
  <div class="person-hub-head-row" aria-hidden="true"><span>Persona</span><span>Datos</span><span>Estado</span><span>Ficha</span><span>Acceso</span><span>Acciones</span></div>
  ${people.map((person) => personCard(person, true)).join('')}
 </div>
</section>`,
  },

  {
    id: 'equipo-cuadricula',
    section: 'Equipo',
    surface: 'Personas en cuadrícula',
    kind: 'workspace',
    grids: [{container: '.ops-grid', card: '.person-hub-card', label: 'Equipo · cuadrícula', minHeight: 200}],
    body: `<div class="ops-grid">${people.map((person) => personCard(person, false)).join('')}</div>`,
  },

  {
    id: 'equipo-invitaciones-solicitudes',
    section: 'Invitaciones',
    surface: 'Solicitudes pendientes',
    kind: 'workspace',
    lists: [{
      container: '.invite-links-section',
      head: '.invite-link-head',
      row: '.invite-link-row',
      label: 'Invitaciones · solicitudes',
      template: '--invite-cols',
      rowHeight: [44, 52],
      exemptBelow: 640,
    }],
    body: `
<section class="panel ops-stack invite-links">
 <header class="invite-links-header"><div><p class="invite-links-kicker">Acceso de equipo</p><h2>${svg(ICON.link2, 20)} Invitaciones y solicitudes</h2><p class="form-note">Atendé las solicitudes pendientes, generá enlaces temporales y limpiá los que ya cumplieron su ciclo.</p></div></header>
 <div class="invite-links-section" aria-labelledby="invite-requests-heading">
  <div class="invite-links-section-heading"><div class="invite-links-section-title"><h3 id="invite-requests-heading">${svg(ICON.userCheck, 18)} Solicitudes</h3><p class="form-note">Aprobá solo los accesos disponibles.</p></div><span class="invite-links-count invite-links-count-live" aria-label="2 solicitudes pendientes">2</span></div>
  ${inviteHead('Solicitud')}
  ${inviteRequests.map(inviteRequestRow).join('')}
 </div>
</section>`,
  },

  {
    id: 'equipo-invitaciones-enlaces',
    section: 'Invitaciones',
    surface: 'Enlaces recientes',
    kind: 'workspace',
    lists: [{
      container: '.invite-links-recent',
      head: '.invite-link-head',
      row: '.invite-link-row',
      label: 'Invitaciones · enlaces',
      template: '--invite-cols',
      rowHeight: [44, 52],
      exemptBelow: 640,
    }],
    body: `
<section class="panel ops-stack invite-links">
 <div class="invite-links-recent">
  <div class="invite-links-section-heading"><div class="invite-links-section-title"><h3>${svg(ICON.link2, 18)} Enlaces recientes</h3><p class="form-note">Los enlaces agotados o revocados se pueden eliminar; los que tuvieron ingresos conservan su historial.</p></div><span class="invite-links-count">3</span></div>
  ${inviteHead('Enlace')}
  ${inviteLinks.map(inviteLinkRow).join('')}
 </div>
</section>`,
  },

  {
    id: 'equipo-permisos',
    section: 'Roles y permisos',
    surface: 'Matriz de permisos',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `
<section class="panel" aria-labelledby="roles-permissions-title">
 <div class="panel-heading"><div><p class="eyebrow">EQUIPO</p><h2 id="roles-permissions-title">Roles y permisos</h2></div></div>
 <div class="permissions-matrix" aria-busy="false">
  <p class="form-note">${svg(ICON.shield, 16)} Definí qué puede hacer cada cargo. El Dueño siempre conserva todos los permisos. Los cambios se guardan por empresa y se auditan.</p>
  <p role="status" class="permissions-notice">Permiso guardado. Los cambios se aplican desde la próxima acción de esa persona.</p>
  <div class="permissions-explorer">
   <details class="permissions-role-card" open>
    <summary><span class="permissions-role-name">Gerencia</span><span class="permissions-role-description">Gerencia: dirige clientes, proyectos, producción y la operación comercial.</span><span class="permissions-role-count">7 de 9</span><svg class="permissions-role-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON.chevron}</svg></summary>
    <div class="permissions-role-lists">
     <div><h4>Qué puede hacer</h4><ul>
      <li><b>Gestionar clientes, planes y presupuestos</b><small>Alta, edición, plan contratado y presupuestos del cliente.</small></li>
      <li><b>Invitar y administrar accesos del equipo</b><small>Invitaciones, suspensión y reinvitación de integrantes.</small></li>
      <li><b>Ver el resumen operativo de la empresa</b><small>Tablero con piezas por etapa, señales y control center.</small></li>
     </ul></div>
     <div><h4>Qué no puede</h4><ul>
      <li><b>Ver salarios y remuneraciones</b><small>Montos de compensación, día de pago y facturación del colaborador.</small></li>
      <li><b>Restablecer los permisos por defecto</b><small>Vuelve toda la matriz de permisos a los valores de fábrica.</small></li>
     </ul></div>
    </div>
   </details>
   <details class="permissions-role-card"><summary><span class="permissions-role-name">Finanzas</span><span class="permissions-role-description">Finanzas: administra pagos, informes, Equipo y comisiones.</span><span class="permissions-role-count">6 de 9</span><svg class="permissions-role-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON.chevron}</svg></summary></details>
   <details class="permissions-role-card"><summary><span class="permissions-role-name">Colaborador</span><span class="permissions-role-description">Colaborador: trabaja clientes, proyectos, producción, presupuestos, pipeline, estudio e inventario sin ver finanzas, salarios, accesos ni actividad.</span><span class="permissions-role-count">4 de 9</span><svg class="permissions-role-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON.chevron}</svg></summary></details>
  </div>
  ${permissionsTable}
  <div class="inline-actions permissions-reset"><button type="button" class="text-button">Restablecer todos los permisos por defecto</button></div>
 </div>
</section>`,
  },

  {
    id: 'equipo-historial',
    section: 'Historial de trabajo',
    surface: 'Auditoría operativa',
    kind: 'workspace',
    lists: [{
      container: '.work-history',
      head: null,
      row: '.activity-line',
      label: 'Historial · actividad',
      template: null,
      rowHeight: [44, 52],
      exemptBelow: 760,
    }],
    body: `
<section class="panel work-history">
 <div class="panel-heading"><h2>Historial de trabajo</h2><button class="text-button">${svg(ICON.history, 14)}Ver historial importado de Trello</button></div>
 <p class="form-note">Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.</p>
 <div class="history-filters">
  ${selectCustom({label: 'Persona', value: 'Todo el equipo'})}
  ${selectCustom({label: 'Registros por página', value: '100'})}
 </div>
 <div aria-busy="false">
  ${historyLine({actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-18T16:20:00-03:00', title: 'Rodaje campaña Primavera 2026 · Banco Atlas (estudio y exteriores)', meta: 'Creó ·  → reservado'})}
  ${historyLine({actor: 'Fabrizio Dellacasa Reyes', timestamp: '2026-09-17T09:48:00-03:00', title: 'Cámara Sony FX6 Full Frame con montura E, visor OLED y tarjeta CFexpress de 512 GB', meta: 'Actualizó · disponible → en uso'})}
  ${historyLine({actor: 'Ana Paula Benítez de la Cruz', photo: '/brand/icon-192.png', timestamp: '2026-09-16T15:10:00-03:00', title: 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)', meta: 'Actualizó · en uso → mantenimiento'})}
  ${historyLine({actor: 'Carlos Ramón Ovelar Giménez', timestamp: '2026-09-15T11:02:00-03:00', title: 'Presupuesto N.º 2026-0148 · Producción audiovisual integral y difusión en vía pública', meta: 'Eliminó'})}
 </div>
 <div class="history-pagination"><span role="status">1–4</span><button class="secondary" disabled>Anterior</button><button class="secondary">Siguiente</button></div>
</section>`,
  },

  {
    id: 'equipo-actividad-feed',
    section: 'Actividad',
    surface: 'Feed de actividad',
    kind: 'workspace',
    lists: [{
      container: '.activity-feed',
      head: null,
      row: '.activity-feed-row',
      label: 'Actividad · feed',
      template: null,
      rowHeight: [44, 52],
      exemptBelow: 700,
    }],
    body: `
<section class="panel activity-feed">
 <div class="panel-heading"><div><h2>Actividad del equipo</h2><p class="form-note">Últimos 6 cambios registrados por el servidor en esta empresa. Se muestran 6.</p></div></div>
 ${activityDay({label: 'jue, 17 sept.', count: 3, rows: [
   {actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-17T14:30:00-03:00', table: 'inventory_reservations', operation: 'INSERT', record: '4821'},
   {actor: 'Fabrizio Dellacasa Reyes', timestamp: '2026-09-17T11:12:00-03:00', table: 'inventory', operation: 'UPDATE', record: '341'},
   {actor: 'Ana Paula Benítez de la Cruz', timestamp: '2026-09-17T09:05:00-03:00', table: 'clients', operation: 'UPDATE', record: '88'},
 ]})}
 ${activityDay({label: 'mié, 16 sept.', count: 3, rows: [
   {actor: 'Carlos Ramón Ovelar Giménez', timestamp: '2026-09-16T18:44:00-03:00', table: 'work_orders', operation: 'UPDATE', record: '1502'},
   {actor: 'Lucía Fernanda Centurión Aquino', timestamp: '2026-09-16T10:20:00-03:00', table: 'studio_reservations_cancelled', operation: 'DELETE', record: '212'},
   {actor: 'Sistema', timestamp: '2026-09-16T03:00:00-03:00', table: 'exchange_rates', operation: 'INSERT', record: '59'},
 ]})}
 <div class="inline-actions activity-more"><button class="secondary">Cargar 50 más</button></div>
</section>`,
  },

  {
    id: 'equipo-uso-panel',
    section: 'Actividad',
    surface: 'Uso del equipo',
    kind: 'workspace',
    grids: [{container: '.usage-grid', card: '.ops-card', label: 'Actividad · uso del equipo', minHeight: 180}],
    body: `
<section class="panel usage-panel">
 <h2>Uso del equipo</h2>
 <p class="form-note">Solo para dueños · Últimos 30 días. Se registra desde la activación de esta función; no reconstruye accesos anteriores.</p>
 <p class="form-note">Tiempo activo estimado: ventana visible e interacción reciente. No equivale a horas trabajadas. Una sesión puede abarcar varios días; recargar no cuenta como otro ingreso.</p>
 <div class="usage-grid">${usageCards.map((card) => `<article class="ops-card"><div class="panel-heading">${actorIdentity({name: card.name, photo: card.photo})}<span class="client-status" data-status="${card.state}">${card.status}</span></div><small>Última conexión: ${card.last}</small><p>${card.summary}</p><button class="text-button">${svg(ICON.eye, 14)}Ver accesos</button></article>`).join('')}</div>
</section>`,
  },

  {
    id: 'configuracion-empresa',
    section: 'Configuración',
    surface: 'Empresa, integraciones y empresas de la cuenta',
    kind: 'workspace',
    lists: [{
      container: '.settings-integration-list',
      head: '.settings-integration-head',
      row: 'article',
      label: 'Configuración · integraciones',
      template: '--settings-cols',
      rowHeight: [44, 52],
      exemptBelow: 700,
    }],
    grids: [],
    body: `
<div class="settings-page"><div class="settings-layout">
 <div class="settings-column">
  <div class="settings-slice ops-stack">
   <section class="panel settings-card settings-company-card" aria-labelledby="company-settings-title">
    <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.building, 18)}</span><div><h2 id="company-settings-title">Empresa</h2><p>Datos que identifican a esta empresa y valores predeterminados para nuevos formularios.</p></div></div>
    <form class="form-stack ops-form-grid" novalidate aria-busy="false">
     ${settingsField({label: 'Nombre de la empresa', value: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima'})}
     ${settingsField({label: 'Moneda predeterminada', value: 'Guaraníes (PYG)', control: 'select'})}
     <details class="ops-profile-section ops-wide" open><summary>Datos fiscales y contacto</summary><div class="ops-form-grid">
      ${settingsField({label: 'Razón social', value: 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.', optional: true, wide: true})}
      ${settingsField({label: 'RUC', value: '80012345-6', optional: true})}
      ${settingsField({label: 'Teléfono', value: '981123456', optional: true, control: 'phone', help: PHONE_HELP})}
      ${settingsField({label: 'Dirección', value: 'Avda. Mcal. López 1234 casi San Martín, Asunción, Paraguay', optional: true, wide: true})}
     </div></details>
     <div class="dialog-actions"><button type="submit" class="primary ops-wide">Guardar</button></div>
    </form>
   </section>
   <section class="panel settings-card" aria-labelledby="exchange-settings-title">
    <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.chart, 18)}</span><div><h2 id="exchange-settings-title">Cotización USD / PYG</h2><p>Referencia por fecha; no modifica saldos ni convierte movimientos anteriores.</p></div></div>
    <form class="form-stack ops-form-grid" novalidate aria-busy="false">
     ${settingsField({label: 'Fecha', value: '2026-09-20', type: 'date'})}
     <div><label><span>Guaraníes por dólar</span><span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input type="text" inputmode="numeric" autocomplete="off" value="6.250" placeholder="1.000.000"></span></label><small class="field-help">Solo enteros entre G. 1.000 y G. 100.000. Referencia indicada: G. 6.000/USD.</small></div>
     <div class="dialog-actions"><button type="submit" class="primary ops-wide">Guardar</button></div>
    </form>
    <details class="settings-disclosure"><summary>Ver cotizaciones guardadas</summary><div class="settings-history"><p><span class="list-date">${listDateShort('2026-09-20')}</span><strong>G. 6.250/USD</strong></p><p><span class="list-date">${listDateShort('2026-09-13')}</span><strong>G. 6.180/USD</strong></p><p><span class="list-date">${listDateShort('2026-08-30')}</span><strong>G. 6.100/USD</strong></p></div></details>
   </section>
   <section class="panel settings-card" aria-labelledby="integration-settings-title">
    <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.linkOff, 18)}</span><div><h2 id="integration-settings-title">Integraciones</h2><p>Estado actual de los servicios que pueden complementar tu flujo de trabajo.</p></div></div>
    <div class="settings-integration-list" role="list" aria-label="Estado de integraciones">
     <div class="settings-integration-head" role="presentation"><span>Integración</span><span>Estado</span></div>
     ${integrationRow('Google y Drive', 'Usá tu correo invitado para entrar y agregá enlaces de Drive en cada registro.', 'No configurado')}
     ${integrationRow('WhatsApp, Instagram y Meta', 'Requieren una conexión y permisos de Meta antes de poder usarse.', 'No configurado')}
    </div>
    <details class="settings-disclosure"><summary>Qué está disponible hoy</summary><p>Este panel no conecta cuentas ni envía mensajes. Los enlaces de Drive se gestionan desde los registros que los usan.</p></details>
   </section>
  </div>
 </div>
 <div class="settings-column settings-side-column">
  <section class="panel settings-card workspace-company-card" aria-labelledby="workspace-company-title"><div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.building, 18)}</span><div><h2 id="workspace-company-title">Empresas</h2><p>Cambiá de empresa o creá un espacio separado para otra operación.</p></div></div>
   <div class="company-settings" aria-busy="false">
    <p class="form-note company-settings-intro">Tus empresas y accesos. Elegí cuál abrir al iniciar sesión; esto no cambia tus permisos ni mezcla los datos.</p>
    ${companySettingsRows.map(companySettingsRow).join('')}
   </div>
   <details class="settings-disclosure"><summary>Cómo funciona una empresa adicional</summary><div><p>Cada empresa tendrá sus propios clientes, equipo, proyectos y finanzas. Solo tu usuario tendrá acceso inicial.</p><p>Las nuevas empresas incluyen 30 días gratis. Después: US$10 o G. 50.000 al mes por empresa, con 2 días de gracia. Al comenzar el tercer día sin pagar se suspende el uso, sin borrar los datos. No se realiza ningún cobro al crearla.</p><p><strong>Precio de lanzamiento.</strong> El precio de lanzamiento puede cambiar en el futuro. Como cliente fundador, conservarás siempre una tarifa preferencial frente a los nuevos clientes, aunque el importe inicial se actualice.</p></div></details>
   <div class="settings-card-actions"><button class="secondary">Crear otra empresa</button></div>
  </section>
  <section class="panel settings-card" aria-labelledby="coupon-redeem-title">
   <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.ticket, 18)}</span><div><h2 id="coupon-redeem-title">Cupones</h2><p>Canjeá un código de la administración global para sumar un mes gratis a tu suscripción.</p></div></div>
   <form class="form-stack" novalidate aria-busy="false"><label>Código del cupón<input value="" placeholder="SCALE10" maxlength="40"></label><button class="primary" type="submit" disabled>Canjear cupón</button></form>
   <p class="form-note">Cada cupón se puede canjear una sola vez por empresa. No cobra ni guarda datos de pago.</p>
  </section>
 </div>
</div></div>`,
  },

  {
    id: 'preferencias-espacio',
    section: 'Preferencias',
    surface: 'Tarjeta de preferencias',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `
<section class="panel settings-card preferences-card" aria-labelledby="workspace-preferences-title">
 <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.settings, 18)}</span><div><h2 id="workspace-preferences-title">Preferencias del espacio</h2><p>Se guardan solo para vos en Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima, en este navegador.</p></div></div>
 <div class="preferences-row">${selectCustom({label: 'Al entrar a Scale OS', value: 'Resumen'})}<p class="form-note">Se aplica en tu próxima entrada al inicio. Los enlaces a secciones, piezas y otros destinos conservan su destino.</p></div>
 <p role="status" class="settings-notice">Se guardó la preferencia para este navegador.</p>
</section>`,
  },

  {
    id: 'mi-perfil',
    section: 'Preferencias',
    surface: 'Diálogo Mi perfil',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `
<div class="ops-overlay">
 <section class="ops-dialog unified-dialog" data-dialog-size="default" role="dialog" aria-modal="true" aria-labelledby="my-profile-title" tabindex="-1">
  <div class="dialog-heading"><h2 id="my-profile-title">Mi perfil</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${svg(ICON.x, 18)}</button></div>
  <div class="dialog-body"><div class="my-profile-content my-profile-editor">
   <section class="my-profile-identity">
    <p class="my-profile-kicker">Identidad</p>
    <dl class="my-profile-login"><dt>Correo de acceso</dt><dd>maria.jose.fernandez.delavega@estudiocomunicacionparaguay.com.py</dd></dl>
    <p class="my-profile-help">Tu correo de acceso no se modifica desde acá.</p>
   </section>
   <details class="my-profile-optional"><summary>Foto de perfil <span>Opcional</span></summary><div class="my-profile-photo">
    <section class="ops-profile-section profile-photo-section" aria-label="Foto de perfil">
     <div class="profile-photo-section-heading"><strong>Foto de perfil</strong><small>Seleccioná la foto para reemplazarla; después podés ajustar el encuadre.</small></div>
     <form class="form-stack profile-photo-form" novalidate>
      <div class="profile-photo-summary">
       <button type="button" class="editable-photo" aria-label="Cambiar foto de María José Fernández de la Vega y Rivarola"><img src="/brand/icon-192.png" referrerpolicy="no-referrer" alt="Foto de María José Fernández de la Vega y Rivarola"></button>
       <div class="profile-photo-controls">
        <label class="photo-upload">Cambiar foto<input aria-label="Elegir foto (JPG, PNG, WebP o HEIC; hasta 4 MB)" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"></label>
        <button type="button" class="text-button">${svg(ICON.link2, 14)}Usar enlace de imagen</button>
       </div>
      </div>
      <p class="form-note">JPG, PNG, WebP o HEIC · Hasta 4 MB. Al subir se guarda automáticamente. Usá el original para mejor nitidez.</p>
      <div class="inline-actions"><button type="button" class="text-button danger">${svg(ICON.trash, 14)}Quitar foto</button></div>
     </form>
    </section>
   </div></details>
   <section class="my-profile-name" aria-labelledby="my-profile-data-title">
    <h4 id="my-profile-data-title">Datos personales</h4>
    <form class="form-stack" id="my-profile-name-form" novalidate aria-busy="false">
     <div><label for="my-profile-full-name"><span>Nombre completo</span><input id="my-profile-full-name" type="text" value="María José Fernández de la Vega y Rivarola"></label></div>
     <span hidden></span>
    </form>
    <p class="my-profile-help">Al guardar el nombre, esta ventana se cierra. La foto se guarda por separado.</p>
   </section>
   <div class="my-profile-google"><strong>Acceso con Google</strong><p>Podés usar Google para entrar a esta misma cuenta si elegís el mismo correo. Google también puede actualizar tu nombre y foto.</p><p class="my-profile-google-state" role="status">Conectado con Google</p></div>
   <details class="my-profile-optional my-profile-access"><summary>Seguridad de cuenta <span>Opcional</span></summary></details>
   <div class="my-profile-scope"><strong>Identidad personal</strong><p>Tu nombre y foto personales se comparten entre tus empresas. El cargo, sueldo y acceso se mantienen separados en cada empresa.</p></div>
  </div></div>
  <div class="dialog-footer"><div class="dialog-actions"><button type="submit" class="primary ops-wide" form="my-profile-name-form">Guardar nombre</button></div></div>
 </section>
</div>`,
  },

  {
    id: 'papelera',
    section: 'Papelera',
    surface: 'Registros recuperables',
    kind: 'workspace',
    lists: [{
      container: '.trash-list',
      head: '.trash-head',
      row: '.trash-row',
      label: 'Papelera · registros',
      template: '--trash-cols',
      rowHeight: [44, 52],
      exemptBelow: 640,
    }],
    body: `
<section class="panel settings-card" aria-labelledby="trash-workspace-title">
 <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.trash, 18)}</span><div><h2 id="trash-workspace-title">Papelera de esta empresa</h2><p>Solo ves registros que tu permiso permite recuperar. No se borran de forma definitiva. Los accesos retirados se devuelven con una nueva invitación desde Equipo.</p></div></div>
 <div class="bulk-bar" role="status" aria-live="polite"><span class="bulk-count"><b>2</b> seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="text-button">Seleccionar todos</button><button type="button" class="secondary">Restaurar</button><button type="button" class="text-button">Limpiar</button></div></div>
 <ul class="trash-list">
  <li class="trash-head" aria-hidden="true"><span></span><span>Tipo</span><span>Registro</span><span>Acciones</span></li>
  ${trashRecords.map(trashRow).join('')}
 </ul>
</section>`,
  },
];
