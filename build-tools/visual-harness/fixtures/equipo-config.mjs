/*
 * Fixtures: Equipo, Historial de trabajo, Actividad y Configuración (las
 * superficies PLT que todavía viven en markup legacy).
 *
 * Las pantallas ya migradas a la v2 (Invitaciones, Roles y permisos, Papelera,
 * Preferencias, Mi perfil, Superadmin, Acceso) se miden en `plt-v2.mjs`,
 * `plt-superadmin-v2.mjs` y `acceso-v2.mjs`; este archivo no las duplica.
 *
 * Espeja el JSX real de: app/operations.tsx (PeopleWorkspace), app/work-history.tsx
 * (historial v2 de OPS: feed de bloques apilados), app/suite.tsx (Activity/Settings),
 * app/presence.tsx UsagePanel, app/company-settings.tsx y app/scale-workspace.tsx
 * (ajustes).
 * CSS contracts: app/operations.css, app/settings-slice.css, app/company-settings.css,
 * app/dialog.css y los primitivos de app/ui-system.css.
 *
 * Ronda 14 (#62): la toolbar de Equipo junta búsqueda, filtros, contador, vista y
 * acciones en una fila (app/operations.css `.team-filters`), el nombre de las
 * tarjetas usa dos líneas (`.person-container-name` en `.ops-grid`) y el estado
 * vacío lleva CTA ("Agregar primera persona").
 *
 * Datos de estrés deliberados: nombres/correos largos, montos grandes, fechas con
 * vencimiento y accesos suspendidos. Este archivo no arregla dominio.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {EmptyState, ListGridToggle} from 'owncoding-ui';

const h = React.createElement;
/* Vista lista/cuadrícula v2: envuelve ListGridToggle como app/ui-v2.tsx (ViewSwitch). */
const viewSwitch = (value = 'grid') => renderToStaticMarkup(h(ListGridToggle, {
  value,
  onChange: () => {},
  className: '[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-9 md:[&>button]:w-9',
}));
/* EmptyBlock v2: EmptyState de la librería sobre la superficie de panel (app/ui-v2.tsx).
   `action` va como elemento React: un string se escaparía en el render. */
const emptyBlock = ({title, description, action, className = ''}) => renderToStaticMarkup(h('div', {
  role: 'status',
  className: `rounded-xl border border-ink-600 bg-ink-800 p-5 shadow-[0_1px_2px_rgb(37_28_41_/_4%)] max-md:p-4 ${className}`,
}, h(EmptyState, {title, description, action})));


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
const searchField = ({label, placeholder, className = ''}) => `<label class="search-field${className ? ' ' + className : ''}"><span class="search-field-label">${label}</span><span class="search-field-box">${svg(ICON.search, 16)}<input type="search" value="" placeholder="${placeholder}" autocomplete="off"></span></label>`;
/* Toolbar del equipo (app/operations.tsx): búsqueda, filtros, contador, vista y
   acciones en la misma fila (`.team-filters`). */
const teamToolbar = (count = '5 de 5 personas') => `<div class="team-filters" aria-label="Controles del equipo">
 ${searchField({label: 'Buscar persona', placeholder: 'Nombre, correo o cargo', className: 'team-search'})}
 <div class="choice-list compact" role="group" aria-label="Filtrar por estado laboral"><button type="button" class="choice active" aria-pressed="true">Todos</button><button type="button" class="choice" aria-pressed="false">Activos</button><button type="button" class="choice" aria-pressed="false">Inactivos</button></div>
 <p class="team-count" role="status" aria-atomic="true">${count}</p>
 <div class="workspace-view-controls">${viewSwitch('grid')}</div>
 <div class="team-actions"><button type="button" class="secondary">Permisos del panel</button><button type="button" class="primary">${svg(ICON.plus, 16)}Agregar persona</button></div>
</div>`;
const serialTexto = (value) => `<span class="serial-text" title="${value}">${value.slice(0, -4)}<b>${value.slice(-4)}</b></span>`;
const amountCell = (text) => `<dd class="list-amount">${text}</dd>`;
/* app/field-rules.ts: único mensaje de ayuda del teléfono. */
const PHONE_HELP = 'Elegí el país y escribí solo dígitos, sin el 0 inicial. Paraguay: 9 dígitos para móvil, 8 para fijo; el resto: 6 a 12.';

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
    salaryMissing: true,
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
  // En lista la app baja el contenedor a 32px (PersonContainer md) y en cuadrícula a 48px (lg).
  const initials = person.name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();
  const avatar = `<div class="ops-person" title="${person.name}"><span class="person-container person-container-${list ? 'md' : 'lg'}"><span class="person-container-avatar" aria-hidden="true">${person.photo ? `<img src="${person.photo}" alt="" referrerpolicy="no-referrer">` : initials}</span><span class="person-container-details"><span class="person-container-name" title="${person.name}">${person.name}</span>${person.role ? `<span class="person-container-secondary" title="${person.role}">${person.role}</span>` : ''}</span></span></div>`;
  const stateLabel = isMember ? (person.memberActive ? 'Acceso activo' : 'Acceso suspendido') : person.state;
  const stateAttr = isMember ? (person.memberActive ? 'active' : 'inactive') : (person.state === 'Activo' ? 'active' : 'inactive');
  const chips = isMember
    ? `<div class="person-hub-chips">${person.salaryMissing ? '<span class="hub-chip warn" title="Sin salario definido: abrí Perfil y completá la remuneración.">Sin salario definido</span>' : ''}<span class="hub-chip muted">Sin ficha laboral: agregala para registrar remuneración, fechas y pagos.</span></div>`
    : `<div class="person-hub-chips">${person.salaryMissing ? '<span class="hub-chip warn" title="Sin salario definido: abrí Perfil y completá la remuneración.">Sin salario definido</span>' : ''}${person.chips}</div>`;
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

/* ---------------------------------------------------- historial / actividad */
const historyLine = ({actor, photo = '', timestamp, title, meta}) => `<li class="grid min-w-0 gap-1 rounded-xl border border-ink-600/60 bg-ink-800/40 p-3">
 ${actorIdentity({name: actor, photo, timestamp})}
 <p class="break-words text-[13px] text-fore" title="${title}">${title}</p>
 <p class="text-xs text-mute">${meta}</p>
</li>`;

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

/* -------------------------------------------------------------- export */
export default [

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
 <div class="mb-3 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Personas, accesos y remuneraciones</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Equipo de Estudio de Comunicación y Producción Audiovisual del Paraguay: directorio, roles y estado de cada integrante.</p></div>
 ${teamToolbar()}
 <div class="ops-grid ops-grid-list">
  <div class="bulk-bar" role="status" aria-live="polite"><span class="bulk-count"><b>2</b> seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="text-button">Seleccionar visibles</button><button type="button" class="secondary">Suspender acceso</button><button type="button" class="secondary">Reactivar acceso</button><button type="button" class="text-button">Limpiar</button></div></div>
  <div class="person-hub-head-row" aria-hidden="true"><span>Persona</span><span>Datos</span><span>Estado</span><span>Ficha</span><span>Acceso</span><span>Acciones</span></div>
  ${people.map((person) => personCard(person, true)).join('')}
 </div>
</section>`,
  },

  {
    id: 'equipo-vacio',
    section: 'Equipo',
    surface: 'Personas · estado vacío con CTA',
    kind: 'workspace',
    body: `
<section class="panel">
 <div class="mb-3 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Personas, accesos y remuneraciones</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Equipo de Estudio de Comunicación y Producción Audiovisual del Paraguay: directorio, roles y estado de cada integrante.</p></div>
 ${teamToolbar('0 de 0 personas')}
 <div class="ops-grid">
  ${emptyBlock({title: 'Todavía no hay personas', description: 'Agregá la primera persona del equipo para registrar accesos y remuneraciones.', action: h('button', {type: 'button', className: 'primary'}, h('svg', {width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': 'true'}, h('path', {d: 'M12 5v14M5 12h14'})), 'Agregar primera persona'), className: '[grid-column:1/-1]'})}
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
    id: 'equipo-historial',
    section: 'Historial de trabajo',
    surface: 'Auditoría operativa',
    kind: 'workspace',
    lists: [{
      container: '[aria-label="Historial de trabajo"]',
      head: null,
      row: 'li',
      label: 'Historial · actividad',
      template: null,
      // El historial es un feed de bloques apilados (excepción de AGENTS.md),
      // no una lista de filas finitas: se mide el rango del bloque.
      rowHeight: [120, 260],
      exemptBelow: 0,
    }],
    body: `
<section class="grid min-w-0 gap-4 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-label="Historial de trabajo">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="min-w-0"><h2 class="text-lg font-bold text-fore">Historial de trabajo</h2><p class="mt-1 text-xs leading-5 text-mute">Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.</p></div>
  <button class="text-button shrink-0">${svg(ICON.history, 14)}Ver historial importado de Trello</button>
 </div>
 <div class="mb-4 flex flex-wrap items-end gap-3">
  <div class="w-full sm:w-72">${selectCustom({label: 'Persona', value: 'Todo el equipo'})}</div>
  <div class="w-44">${selectCustom({label: 'Registros por página', value: '100'})}</div>
  <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">1–4</p>
 </div>
 <ol class="grid min-w-0 gap-2">
  ${historyLine({actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-18T16:20:00-03:00', title: 'Rodaje campaña Primavera 2026 · Banco Atlas (estudio y exteriores)', meta: 'Creó ·  → reservado'})}
  ${historyLine({actor: 'Fabrizio Dellacasa Reyes', timestamp: '2026-09-17T09:48:00-03:00', title: 'Cámara Sony FX6 Full Frame con montura E, visor OLED y tarjeta CFexpress de 512 GB', meta: 'Actualizó · disponible → en uso'})}
  ${historyLine({actor: 'Ana Paula Benítez de la Cruz', photo: '/brand/icon-192.png', timestamp: '2026-09-16T15:10:00-03:00', title: 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)', meta: 'Actualizó · en uso → disponible'})}
  ${historyLine({actor: 'Carlos Ramón Ovelar Giménez', timestamp: '2026-09-15T11:02:00-03:00', title: 'Presupuesto N.º 2026-0148 · Producción audiovisual integral y difusión en vía pública', meta: 'Eliminó'})}
 </ol>
 <div class="flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3"><span class="mr-auto text-xs tabular-nums text-mute" role="status">1–4</span><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore md:h-9" disabled>Anterior</button><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore md:h-9">Siguiente</button></div>
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
 <div class="mb-4 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Actividad del equipo</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Últimos 6 cambios registrados por el servidor en esta empresa. Se muestran 6.</p></div>
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
 <div class="mb-4 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Uso del equipo</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Solo para dueños · Últimos 30 días. Se registra desde la activación de esta función; no reconstruye accesos anteriores.</p></div>
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



];
