/*
 * Fixtures: Equipo, Historial de trabajo, Actividad y Configuración (las
 * superficies PLT que todavía viven en markup legacy).
 *
 * Las pantallas ya migradas a la v2 (Invitaciones, Roles y permisos, Papelera,
 * Preferencias, Mi perfil, Superadmin, Acceso) se miden en `plt-v2.mjs`,
 * `plt-superadmin-v2.mjs` y `acceso-v2.mjs`; este archivo no las duplica.
 *
 * Espeja el JSX real de: app/team-workspace.tsx (PeopleWorkspace: ListPage + ListGrid +
 * CompactCard), app/team-person-sheet.tsx + app/person-sheet.tsx (ficha con pestañas),
 * app/work-history.tsx
 * (historial v2 de OPS: feed de bloques apilados), app/suite.tsx (Activity/Settings),
 * app/presence.tsx UsagePanel, app/company-settings.tsx y app/scale-workspace.tsx
 * (ajustes).
 * CSS contracts: app/operations.css, app/settings-slice.css, app/company-settings.css,
 * app/dialog.css y los primitivos de app/ui-system.css.
 *
 * #186: Equipo es `ListPage` + `FilterToolbar` (SegmentedField + búsqueda), lista
 * `ListGrid` (Persona · Datos · Estado · Acceso · Acciones, una plantilla), tarjetas
 * `CompactCard` y el menú ⋯ (Perfil · Acceso · Eliminar); la ficha de persona es un
 * `Dialog` drawer con pestañas Perfil · Acceso · Remuneración.
 *
 * Datos de estrés deliberados: nombres/correos largos, montos grandes, fechas con
 * vencimiento y accesos suspendidos. Este archivo no arregla dominio.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, EmptyState, ListGridToggle, SearchField, SegmentedField} from 'owncoding-ui';

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
  return `<span class="actor-identity"><span class="foto-perfil" aria-hidden="true">${avatar}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${label}">${label}</span>${timestamp ? `<time class="actor-identity-time" datetime="${timestamp}" title="${timeText || listDateFull(timestamp)}">${timeText || listDateFull(timestamp)}</time>` : ''}${imported ? '<span class="actor-identity-source">Autor de registro importado</span>' : ''}</span></span>`;
};
const selectCustom = ({label, value}) => `<div class="ops-select"><span class="ops-label">${label}</span><button type="button" class="ops-select-trigger" title="${value}" aria-haspopup="listbox" aria-expanded="false"><span>${value}</span>${svg(ICON.chevron, 16)}</button></div>`;
const searchField = ({label, placeholder, className = ''}) => `<label class="search-field${className ? ' ' + className : ''}"><span class="search-field-label">${label}</span><span class="search-field-box">${svg(ICON.search, 16)}<input type="search" value="" placeholder="${placeholder}" autocomplete="off"></span></label>`;
/* Ficha de persona (app/team-person-sheet.tsx + app/person-sheet.tsx): Dialog
   drawer con pestañas Perfil · Acceso · Remuneración; cada pestaña guarda por
   separado. En ≤540 el Dialog es hoja inferior (app/dialog.css). */
const sheetTabs = (labels, active) => `<div class="view-tabs max-lg:min-w-0 max-lg:max-w-full lg:shrink-0">${renderToStaticMarkup(h(SegmentedField, {className: 'max-lg:flex-nowrap [&>button]:min-h-11 [&>button]:max-lg:shrink-0 [&>button]:whitespace-nowrap md:[&>button]:min-h-8', ariaLabel: 'Secciones de la ficha', value: active, onChange: () => {}, options: labels.map((label) => [label, label])}))}</div>`;
const equipoDialog = (tab = 'Perfil') => `<div class="grid min-w-0 gap-4">
 <div class="mx-auto flex w-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-ink-600 bg-ink-800" style="max-height:min(88dvh,calc(100dvh - env(safe-area-inset-top)))">
  <div class="dialog-heading"><h2 class="min-w-0">Editar persona</h2><button type="button" class="icon-button" title="Cerrar" aria-label="Cerrar">${svg(ICON.x, 18)}</button></div>
  <div class="dialog-body">
   <div class="person-sheet grid min-w-0 gap-4">
    ${sheetTabs(['Perfil', 'Acceso', 'Remuneración'], tab)}
    ${tab === 'Perfil' ? `<div role="group" aria-label="Perfil" class="grid min-w-0 gap-4">
     <p class="form-note">El estado laboral no modifica el acceso al panel.</p>
     <section class="ops-profile-section profile-photo-section is-compact person-photo-field" aria-label="Foto de perfil">
      <div class="profile-photo-summary">
       <button type="button" class="foto-perfil foto-perfil-xl foto-perfil-circulo foto-perfil-persona" aria-label="Cambiar foto de ${people[0].name}"><img src="/brand/icon-192.png" alt=""></button>
       <div class="profile-photo-controls">
        <label class="photo-upload">Elegir foto<input type="file" aria-label="Elegir foto (JPG, PNG, WebP o HEIC; hasta 4 MB)"></label>
        <button type="button" class="text-button">${svg(ICON.link2, 14)}Usar enlace</button>
        <button type="button" class="text-button danger">${svg(ICON.trash, 14)}Quitar foto</button>
       </div>
      </div>
      <p class="form-note">JPG, PNG, WebP o HEIC · Hasta 4 MB. Al subir se guarda automáticamente.</p>
     </section>
     <form class="form-stack ops-form-grid" novalidate>
      <div><label><span>Nombre completo</span><input value="${people[0].name}" maxlength="120"></label></div>
      <div><label><span>Correo de contacto<span class="field-optional"> · Opcional</span></span><input type="email" value="${people[0].email}"></label></div>
      <div><label><span>Cargo<span class="field-optional"> · Opcional</span></span><input value="${people[0].cargo}"></label></div>
      <div>${selectCustom({label: 'Estado laboral', value: 'Activo'})}</div>
      <details class="ops-profile-section ops-wide" open><summary>Fechas</summary><div class="ops-form-grid">
       <div><label><span>Fecha de ingreso<span class="field-optional"> · Opcional</span></span><input type="date" value="2023-03-14"></label></div>
       <div><label><span>Fecha de salida<span class="field-optional"> · Opcional</span></span><input type="date" value=""></label></div>
      </div></details>
      <div class="ops-wide"><label><span>Condiciones y notas<span class="field-optional"> · Opcional</span></span><textarea maxlength="2000">Coordina la planificación trimestral de producción y la relación con los clientes de mayor volumen.</textarea></label></div>
      <div class="ops-wide"><div class="dialog-actions"><button type="submit" class="primary">Guardar perfil</button></div></div>
     </form>
    </div>` : tab === 'Acceso' ? `<section class="grid min-w-0 gap-3" aria-label="Acceso al panel">
     <section class="team-access" aria-label="Acceso al panel">${chipEstado({estado:'activo', etiqueta:'Acceso habilitado', tono:'ok', icono:'badgeCheck'})}</section>
     <div class="ops-form-grid">
      ${selectCustom({label: 'Permiso', value: 'Gerencia'})}
      ${selectCustom({label: 'Estado de acceso', value: 'Activo'})}
     </div>
     <p class="form-note">Cambiar el permiso o suspender el acceso cierra sus sesiones en esta empresa.</p>
     <div class="inline-actions"><button type="button" class="primary">Guardar acceso</button><button type="button" class="secondary">Reenviar invitación</button>${iconButton({title: 'Quitar acceso', label: 'Quitar acceso: ' + people[0].email, path: ICON.trash, tone: 'record-remove'})}</div>
    </section>` : `<div role="group" aria-label="Remuneración" class="grid min-w-0 gap-4">
     <p class="form-note">La remuneración solo la ven y editan administración y finanzas.</p>
     <form class="form-stack ops-form-grid" novalidate>
      ${selectCustom({label: 'Modalidad', value: 'Fijo mensual'})}
      <div><label><span>Importe acordado</span><span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input type="text" inputmode="numeric" value="4.500.000"></span></label></div>
      ${selectCustom({label: 'Moneda', value: 'Guaraníes (PYG)'})}
      ${selectCustom({label: '¿Emite factura?', value: 'Sí'})}
      ${selectCustom({label: 'Día de pago (1–31)', value: '15'})}
      <div class="ops-wide"><div class="dialog-actions"><button type="submit" class="primary">Guardar remuneración</button></div></div>
     </form>
    </div>`}
   </div>
  </div>
  <div class="dialog-footer"></div>
 </div>
</div>`;

/* «Mi perfil» (app/my-profile.tsx): la misma ficha en modo propio — Perfil · Acceso ·
   Mis datos, sin Remuneración. Identidad, foto (PersonPhotoField) y nombre. */
const perfilPropio = () => `<div class="grid min-w-0 gap-4">
 <div class="mx-auto flex w-full min-w-0 flex-col overflow-hidden rounded-[20px] border border-ink-600 bg-ink-800" style="max-height:min(88dvh,calc(100dvh - env(safe-area-inset-top)))">
  <div class="dialog-heading"><h2 class="min-w-0">Mi perfil</h2><button type="button" class="icon-button" title="Cerrar" aria-label="Cerrar">${svg(ICON.x, 18)}</button></div>
  <div class="dialog-body">
   <div class="person-sheet grid min-w-0 gap-4">
    ${sheetTabs(['Perfil', 'Acceso', 'Mis datos'], 'Perfil')}
    <div role="group" aria-label="Perfil" class="grid min-w-0 gap-4">
     <section class="grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4" data-profile-section="identity">
      <p class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Identidad personal</p>
      <div class="flex min-w-0 items-center gap-3"><span class="foto-perfil foto-perfil-2xl foto-perfil-circulo foto-perfil-persona" aria-hidden="true"><span class="foto-perfil-iniciales">LA</span></span><div class="min-w-0"><h3 class="truncate text-[15px] font-semibold text-fore">Lucía Acosta</h3><p class="break-words text-[12px] text-mute">lucia.acosta.con.un.correo.largo@estudiocomunicacionparaguay.com.py</p></div></div>
      <p class="text-[11.5px] text-mute">Tu correo de acceso se mantiene protegido. Nombre y foto se comparten entre tus empresas.</p>
     </section>
     <section class="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" data-profile-section="edit">
      <p class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Editar perfil</p>
      <section class="ops-profile-section profile-photo-section is-compact person-photo-field" aria-label="Foto de perfil">
       <div class="profile-photo-summary">
        <button type="button" class="foto-perfil foto-perfil-xl foto-perfil-circulo foto-perfil-persona" aria-label="Elegir foto de Lucía Acosta"><span class="foto-perfil-iniciales" aria-hidden="true">LA</span></button>
        <div class="profile-photo-controls"><label class="photo-upload">Elegir foto<input type="file" aria-label="Elegir foto (JPG, PNG, WebP o HEIC; hasta 4 MB)"></label><button type="button" class="text-button">${svg(ICON.link2, 14)}Usar enlace</button></div>
       </div>
       <p class="form-note">JPG, PNG, WebP o HEIC · Hasta 4 MB. Al subir se guarda automáticamente.</p>
      </section>
      <form class="form-stack" novalidate><div><label><span>Nombre completo</span><input value="Lucía Acosta" maxlength="120"></label></div><div class="dialog-actions"><button type="button" class="secondary">Cancelar</button><button type="submit" class="primary">Guardar nombre</button></div></form>
      <p class="text-[11.5px] text-mute">Al guardar el nombre, esta ventana se cierra. La foto se guarda por separado.</p>
     </section>
    </div>
   </div>
  </div>
  <div class="dialog-footer"></div>
 </div>
</div>`;

/* Encabezado + toolbar del equipo (app/team-workspace.tsx): ListPage con acción
   primaria + ViewSwitch a la derecha y FilterToolbar con filtros segmentados. */
const teamHeader = (view = 'list') => `<div class="grid gap-3"><header class="ui-page-header mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-0 !mb-0"><div class="ui-page-header-main min-w-0 flex-1 xl:flex xl:min-w-0 xl:items-baseline xl:gap-3"></div><div class="header-actions flex min-w-0 flex-wrap items-center gap-2 max-md:w-full max-md:justify-start xl:flex-nowrap"><button type="button" class="secondary">Permisos del panel</button><button type="button" class="primary">${svg(ICON.plus, 16)}Agregar persona</button>${viewSwitch(view)}</div></header></div>`;
const teamToolbar = (count = '5 de 5 personas') => `<div data-toolbar="filtros" class="mb-0 flex flex-wrap items-end gap-3 xl:flex-nowrap">
 ${renderToStaticMarkup(h(SegmentedField, {className: '[&>button]:min-h-11 md:[&>button]:min-h-8', ariaLabel: 'Filtrar por estado laboral', value: 'all', onChange: () => {}, options: [['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']]}))}
 ${renderToStaticMarkup(h(SearchField, {value: '', onChange: () => {}, onClear: () => {}, placeholder: 'Nombre, correo o cargo', ariaLabel: 'Buscar persona', className: 'w-full sm:w-72'}))}
 <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute"><span role="status" aria-atomic="true">${count}</span></p>
</div>`;
const serialTexto = (value) => `<span class="serial-text" title="${value}">${value.slice(0, -4)}<b>${value.slice(-4)}</b></span>`;
const amountCell = (text) => `<dd class="list-amount">${text}</dd>`;
/* app/field-rules.ts: único mensaje de ayuda del teléfono. */
const PHONE_HELP = 'Elegí el país y escribí solo dígitos, sin el 0 inicial. Paraguay: 9 dígitos para móvil, 8 para fijo; el resto: 6 a 12.';

/* ---------------------------------------------------------------- equipo */
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const stateChip = (tone, text, title = '') => renderToStaticMarkup(h(Badge, {color: CHIP[tone], title: title || undefined, className: 'whitespace-nowrap'}, text));
/* ChipEstado de owncoding-ui v0.39: mismo markup y tonos que el objeto. */
const CHIP_TONES = {ok:'border-ok/30 bg-ok/10 text-ok-text',warn:'border-warn/30 bg-warn/10 text-warn-text',bad:'border-bad/30 bg-bad/10 text-bad-text',mute:'border-ink-600 bg-ink-800/40 text-mute'};
const chipEstado = ({estado = 'pendiente', etiqueta, tono = 'mute', icono = 'circleX'}) => `<span data-estado="${estado}" title="${etiqueta}" class="inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-semibold ${CHIP_TONES[tono]}">${svg(ICON[icono], 14)}${etiqueta}</span>`;
const TEAM_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(12rem,1.3fr)_6rem_minmax(9rem,0.9fr)_4.5rem]';
const ACCESS = {
  activo: ['ok', 'Habilitado', 'Acceso habilitado'],
  suspendido: ['bad', 'Suspendido', 'Acceso suspendido'],
  anulado: ['mute', 'Retirado', 'Acceso retirado'],
  pendiente: ['mute', 'Sin acceso', 'Sin acceso al panel'],
};
const menuTrigger = (label) => `<button type="button" aria-haspopup="menu" aria-expanded="false" class="inline-flex items-center gap-2 rounded-lg transition"><span class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7" role="img" aria-hidden="true">⋮</span><span class="sr-only">${label}</span></button>`;
const initialsOf = (name) => name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join('').toUpperCase();
const personContainer = (person) => `<span class="person-container person-container-md"><span class="foto-perfil foto-perfil-lg foto-perfil-circulo foto-perfil-persona" aria-hidden="true">${person.photo ? `<img src="${person.photo}" alt="" referrerpolicy="no-referrer">` : `<span class="foto-perfil-iniciales" aria-hidden="true">${initialsOf(person.name)}</span>`}</span><span class="person-container-details"><span class="person-container-name" title="${person.name}">${person.name}</span>${person.cargo ? `<span class="person-container-secondary" title="${person.cargo}">${person.cargo}</span>` : ''}</span></span>`;
const people = [
  {kind: 'profile', name: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', cargo: 'Gerente de producción', email: 'maria.jose.fernandez.delavega@estudiocomunicacionparaguay.com.py', meta: ['Ingreso 14-mar', 'Fijo mensual'], active: true, role: 'Gerencia', access: 'activo'},
  {kind: 'profile', name: 'Carlos Ramón Ovelar Giménez', photo: '', cargo: 'Productor audiovisual', email: 'carlos.ramon.ovelar.gimenez@productora-paraguay.com.py', meta: ['Ingreso 02-feb', 'Salió 12-sept', 'Por hora'], active: false, role: 'Producción', access: 'suspendido'},
  {kind: 'profile', name: 'Ana Paula Benítez de la Cruz', photo: '/brand/icon-192.png', cargo: 'Contadora', email: 'ana.paula.benitez.delacruz@estudiocomunicacionparaguay.com.py', meta: ['Ingreso 20-jul', 'Sin salario definido'], active: true, role: 'Finanzas', access: 'activo'},
  {kind: 'profile', name: 'Lucía Fernanda Centurión Aquino', photo: '', cargo: '', email: 'lucia@estudio.com.py', meta: ['Ingreso 05-ene'], active: true, role: 'Ventas', access: 'pendiente'},
  {kind: 'member', name: 'Fabrizio Dellacasa Reyes', photo: '/brand/icon-192.png', cargo: '', email: 'fabrizio.dellacasa.reyes@estudiocomunicacionparaguay.com.py', meta: [], active: true, role: 'Producción', access: 'activo'},
  {kind: 'member', name: 'Ramón Augusto Villalba de Jesús', photo: '', cargo: '', email: 'ramon.augusto.villalba.dejesus@estudiocomunicacionparaguay.com.py', meta: [], active: false, role: 'Editor', access: 'suspendido'},
];
const factsTitle = (person) => [person.email, ...person.meta].join(' · ');
const statusChip = (person) => person.kind === 'member' ? stateChip('mute', 'Sin ficha', 'Agregá la ficha laboral para registrar fechas y pagos.') : person.active ? stateChip('ok', 'Activo') : stateChip('warn', 'Inactivo');
const accessChipOf = (person) => { const [tone, label, title] = ACCESS[person.access]; return stateChip(tone, label, title); };
const teamRow = (person) => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:min-h-11 md:py-2 team-row ${TEAM_TEMPLATE}">
 <div role="cell" class="flex min-w-0 items-center gap-1"><label class="select-check flex h-11 w-8 shrink-0 items-center justify-center md:h-8" title="Seleccionar integrante"><input type="checkbox" aria-label="Seleccionar ${person.name}"></label><div class="min-w-0" title="${person.name}">${personContainer(person)}</div></div>
 <span role="cell" class="min-w-0 truncate text-[12px] leading-tight text-mute" title="${factsTitle(person)}">${person.email}${person.meta.map((item) => ` · ${item}`).join('')}</span>
 <span role="cell" class="min-w-0">${statusChip(person)}</span>
 <span role="cell" class="flex min-w-0 items-center gap-1.5" title="${person.role} · ${ACCESS[person.access][2]}"><span class="min-w-0 truncate text-[12px] text-mute">${person.role}</span>${accessChipOf(person)}</span>
 <div role="cell" class="list-actions">${menuTrigger('Acciones de ' + person.name)}</div>
</div>`;
const teamList = (rows) => `<div role="table" aria-label="Equipo" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[48rem]">
 <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${TEAM_TEMPLATE}"><span role="columnheader" class="text-left whitespace-nowrap">Persona</span><span role="columnheader" class="text-left whitespace-nowrap">Datos</span><span role="columnheader" class="text-left whitespace-nowrap">Estado</span><span role="columnheader" class="text-left whitespace-nowrap">Acceso</span><span role="columnheader" class="text-right whitespace-nowrap list-actions-head">Acciones</span></div>
 <div role="rowgroup">${rows.map(teamRow).join('')}</div>
</div></div>`;
const teamCard = (person) => `<article data-compact-card class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3 shadow-sm">
 <header class="flex min-w-0 items-start justify-between gap-2">
  <button type="button" class="min-h-11 min-w-0 flex-1 text-left text-[13.5px] font-semibold leading-5 text-fore outline-none transition-colors hover:text-fono-light md:min-h-0" aria-label="Abrir ${person.name}">${personContainer(person)}</button>
  <span class="flex shrink-0 items-center gap-1"><label class="select-check flex h-11 w-8 shrink-0 items-center justify-center md:h-8" title="Seleccionar integrante"><input type="checkbox" aria-label="Seleccionar ${person.name}"></label><div class="relative">${menuTrigger('Acciones de ' + person.name)}</div></span>
 </header>
 <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-4 text-mute"><span class="min-w-0 truncate" title="${person.email}">${person.email}</span>${person.meta.map((item) => `<span class="whitespace-nowrap">· ${item}</span>`).join('')}</div>
 <div class="flex min-w-0 flex-wrap items-center gap-1">${statusChip(person)}<span class="text-[11.5px] text-mute">${person.role}</span>${accessChipOf(person)}</div>
</article>`;
const bulkBar = (count) => `<div role="status" aria-live="polite" data-bulk-bar class="bulk-bar"><span class="bulk-count"><b>${count}</b> de 50 seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="text-button min-h-11 md:min-h-8">Seleccionar visibles</button><button type="button" class="secondary min-h-11 md:min-h-10">Suspender acceso</button><button type="button" class="secondary min-h-11 md:min-h-10">Reactivar acceso</button><button type="button" class="text-button min-h-11 md:min-h-8">Limpiar</button></div></div>`;

/* ---------------------------------------------------- historial / actividad */
/* app/work-history.tsx (HISTORY_TEMPLATE) + ListGrid/ListRow de app/ui-v2.tsx. */
const HISTORY_TEMPLATE = 'grid-cols-[minmax(12rem,1.1fr)_minmax(14rem,2fr)_minmax(10rem,1fr)]';
const listGridV2 = ({label, template, columns, rows, minWidth = 'min-w-[40rem]', aligns = []}) => `<div role="table" aria-label="${label}" class="silent-scroll min-w-0 overflow-x-auto"><div class="${minWidth}"><div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}">${columns.map((column, index) => `<span role="columnheader" class="${aligns[index] === 'end' ? 'text-right' : 'text-left'} whitespace-nowrap">${column}</span>`).join('')}</div><div role="rowgroup">${rows.join('')}</div></div></div>`;
const listRowV2 = (template, cells, extra = '') => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:min-h-11 md:py-2 ${template} ${extra}">${cells}</div>`;
const historyLine = ({actor, photo = '', timestamp, title, meta}) => listRowV2(HISTORY_TEMPLATE, `<div role="cell" class="min-w-0">${actorIdentity({name: actor, photo, timestamp})}</div><p role="cell" class="m-0 truncate text-[13px] font-semibold text-fore" title="${title}">${title}</p><p role="cell" class="m-0 truncate text-xs text-mute" title="${meta}">${meta}</p>`, 'work-history-row');

/* app/suite.tsx (ACTIVITY_TEMPLATE) + ListGrid/ListRow. */
const ACTIVITY_TEMPLATE = 'grid-cols-[minmax(12rem,1.1fr)_minmax(16rem,2fr)_7rem]';
const activityDay = ({label, count, rows}) => `<div role="row" class="activity-day-row"><h3 role="cell" class="activity-day-title">${label} <span>${count}</span></h3></div>${rows.map((row) => listRowV2(ACTIVITY_TEMPLATE, `<div role="cell" class="min-w-0">${actorIdentity({name: row.actor, photo: row.photo || '', timestamp: row.timestamp})}</div><div role="cell" class="activity-feed-event" title="${row.table} · ${row.operation}"><p><b>${row.table}</b> · ${row.operation}</p><small class="activity-feed-tech">${row.table}.${row.operation.toLowerCase()}</small></div><small role="cell" class="activity-feed-record" title="Identificador técnico del registro">Registro ${row.record}</small>`, 'activity-list-row')).join('')}`;

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
/* app/company-settings.tsx (COMPANY_TEMPLATE) + ListGrid/ListRow + StateChip. */
const COMPANY_TEMPLATE = 'grid-cols-[minmax(12rem,2fr)_8rem_9rem_9rem]';
const stateChip = (tone, text) => `<span class="inline-flex whitespace-nowrap rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${tone === 'ok' ? 'border-ok/30 bg-ok/10 text-ok' : 'border-info/30 bg-info/10 text-info'}">${text}</span>`;
const companySettingsRow = (company) => listRowV2(COMPANY_TEMPLATE, `<div role="cell" class="company-settings-name"><span class="company-settings-icon">${svg(ICON.building, 18)}</span><strong title="${company.name}">${company.name}</strong></div><span role="cell" class="company-settings-role">${company.role}</span><div role="cell">${company.current ? stateChip('ok', 'Empresa abierta') : company.preferred ? stateChip('info', 'Predeterminada') : '<span class="company-settings-role" aria-hidden="true">—</span>'}</div><div role="cell" class="company-settings-actions">${company.current ? '' : '<button class="secondary company-settings-open">Abrir</button>'}<button class="secondary company-settings-default" aria-label="${company.preferred ? 'Empresa predeterminada' : 'Usar al iniciar sesión'}" aria-pressed="${company.preferred}" title="${company.preferred ? 'Empresa predeterminada' : 'Usar al iniciar sesión'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="${company.preferred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" aria-hidden="true">${ICON.star}</svg><span class="company-settings-sr-only">${company.preferred ? 'Predeterminada' : 'Usar al iniciar sesión'}</span></button></div>`, `company-settings-row${company.current ? ' is-current' : ''}${company.preferred ? ' is-default' : ''}`);

/* -------------------------------------------------------------- export */
export default [

  {
    id: 'equipo-lista',
    section: 'Equipo',
    surface: 'Personas en lista (ListGrid v2)',
    kind: 'workspace',
    lists: [{
      container: '[role="table"]',
      head: '[role="row"]',
      row: '[role="rowgroup"] [role="row"]',
      label: 'Equipo · lista',
      rowHeight: [44, 52],
      exemptBelow: 767,
    }],
    body: `
<section data-list-page class="grid min-w-0 gap-4 directory grid-cols-[minmax(0,1fr)]" aria-label="Personas, accesos y remuneraciones">
 ${teamHeader('list')}
 ${teamToolbar()}
 ${bulkBar(2)}
 ${teamList(people)}
</section>`,
  },

  {
    id: 'equipo-vacio',
    section: 'Equipo',
    surface: 'Personas · estado vacío con CTA',
    kind: 'workspace',
    body: `
<section data-list-page class="grid min-w-0 gap-4 directory grid-cols-[minmax(0,1fr)]" aria-label="Personas, accesos y remuneraciones">
 ${teamHeader('list')}
 ${teamToolbar('0 de 0 personas')}
 ${emptyBlock({title: 'Todavía no hay personas', description: 'Agregá la primera persona del equipo para registrar accesos y remuneraciones.', action: h('button', {type: 'button', className: 'primary'}, h('svg', {width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': 'true', dangerouslySetInnerHTML: {__html: ICON.plus}}), 'Agregar primera persona')})}
</section>`,
  },

  {
    id: 'equipo-cuadricula',
    section: 'Equipo',
    surface: 'Personas en cuadrícula (CompactCard)',
    kind: 'workspace',
    grids: [],
    body: `
<section data-list-page class="grid min-w-0 gap-4 directory grid-cols-[minmax(0,1fr)]" aria-label="Personas, accesos y remuneraciones">
 ${teamHeader('grid')}
 ${teamToolbar()}
 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${people.map(teamCard).join('')}</div>
</section>`,
  },

  {
    id: 'equipo-dialogo',
    section: 'Equipo',
    surface: 'Ficha de persona · pestaña Perfil (drawer)',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: equipoDialog('Perfil'),
  },

  {
    id: 'equipo-dialogo-acceso',
    section: 'Equipo',
    surface: 'Ficha de persona · pestaña Acceso (drawer)',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: equipoDialog('Acceso'),
  },

  {
    id: 'equipo-dialogo-remuneracion',
    section: 'Equipo',
    surface: 'Ficha de persona · pestaña Remuneración (solo salary.view)',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: equipoDialog('Remuneración'),
  },

  {
    id: 'perfil-ficha-propia',
    section: 'Equipo',
    surface: 'Mi perfil · ficha propia (Perfil · Acceso · Mis datos)',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: perfilPropio(),
  },

  {
    id: 'equipo-historial',
    section: 'Historial de trabajo',
    surface: 'Auditoría operativa',
    kind: 'workspace',
    lists: [{
      container: '[role="table"]',
      head: '[role="row"]',
      row: '[role="rowgroup"] [role="row"]',
      label: 'Historial · actividad',
      template: null,
      rowHeight: [44, 56],
      exemptBelow: 0,
    }],
    body: `
<section class="grid min-w-0 gap-4 rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" aria-label="Historial de trabajo">
 <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
  <h2 class="text-[17px] font-semibold tracking-tight text-fore">Historial de trabajo</h2>
  <p class="min-w-0 flex-1 truncate text-xs leading-5 text-mute" title="Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.">Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.</p>
  <button class="text-button shrink-0">${svg(ICON.history, 14)}Ver historial importado de Trello</button>
 </div>
 <div class="flex flex-wrap items-end gap-3">
  <div class="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap">${selectCustom({label: 'Persona', value: 'Todo el equipo'})}</div>
  <div class="[&>div]:lg:!flex [&>div]:lg:items-center [&>div]:lg:gap-2 [&_.ops-label]:lg:mb-0 [&_.ops-label]:lg:whitespace-nowrap">${selectCustom({label: 'Registros por página', value: '100'})}</div>
  <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">1–4</p>
 </div>
 ${listGridV2({label: 'Historial de trabajo', template: HISTORY_TEMPLATE, columns: ['Persona', 'Registro', 'Cambio'], rows: [
  historyLine({actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-18T16:20:00-03:00', title: 'Rodaje campaña Primavera 2026 · Banco Atlas (estudio y exteriores)', meta: 'Creó ·  → reservado'}),
  historyLine({actor: 'Fabrizio Dellacasa Reyes', timestamp: '2026-09-17T09:48:00-03:00', title: 'Cámara Sony FX6 Full Frame con montura E, visor OLED y tarjeta CFexpress de 512 GB', meta: 'Actualizó · disponible → en uso'}),
  historyLine({actor: 'Ana Paula Benítez de la Cruz', photo: '/brand/icon-192.png', timestamp: '2026-09-16T15:10:00-03:00', title: 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)', meta: 'Actualizó · en uso → disponible'}),
  historyLine({actor: 'Carlos Ramón Ovelar Giménez', timestamp: '2026-09-15T11:02:00-03:00', title: 'Presupuesto N.º 2026-0148 · Producción audiovisual integral y difusión en vía pública', meta: 'Eliminó'})
 ]})}
 <div class="flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3"><span class="mr-auto text-xs tabular-nums text-mute" role="status">1–4</span><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore md:h-9" disabled>Anterior</button><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore md:h-9">Siguiente</button></div>
</section>`,
  },

  {
    id: 'ops-historial-vacio',
    section: 'Historial de trabajo',
    surface: 'Sin actividad · vacío con acción',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `
<section class="grid min-w-0 gap-4 rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4" aria-label="Historial de trabajo">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
  <div class="min-w-0"><p class="text-xs leading-5 text-mute">Cambios operativos del equipo. No incluye sueldos ni movimientos financieros.</p></div>
  <button class="text-button shrink-0">${svg(ICON.history, 14)}Ver historial importado de Trello</button>
 </div>
 <div class="mb-4 flex flex-wrap items-end gap-3">
  <div class="w-full sm:w-72">${selectCustom({label: 'Persona', value: 'Todo el equipo'})}</div>
  <div class="w-44">${selectCustom({label: 'Registros por página', value: '10'})}</div>
  <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute" role="status"></p>
  <p class="w-full basis-full rounded-lg border border-warn/30 bg-warn/10 p-2 text-xs text-mute">No se pudo cargar la lista del equipo: Sin conexión <button type="button" class="text-button">Reintentar</button></p>
 </div>
 <div role="status" class="rounded-xl border border-ink-600 bg-ink-800 p-5 shadow-[0_1px_2px_rgb(37_28_41_/_4%)] max-md:p-4"><div class="flex flex-col items-center justify-center px-6 py-12 text-center"><div class="grid h-12 w-12 place-items-center rounded-2xl border border-ink-500 bg-ink-700 text-mute">${svg(ICON.box || ICON.grid, 20, 'h-5 w-5')}</div><p class="mt-3 text-sm font-semibold text-fore">Sin actividad registrada.</p><p class="mt-1 max-w-xs text-xs leading-5 text-mute">Los cambios operativos del equipo van a aparecer acá.</p><div class="mt-4"><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore transition hover:border-fono hover:bg-fono/10 md:h-9">Abrir Producción</button></div></div></div>
</section>`,
  },
  {
    id: 'equipo-actividad-feed',
    section: 'Actividad',
    surface: 'Feed de actividad',
    kind: 'workspace',
    lists: [{
      container: '.activity-feed [role="table"]',
      head: '[role="row"]',
      row: '.activity-list-row',
      label: 'Actividad · feed',
      template: null,
      rowHeight: [44, 52],
      exemptBelow: 700,
    }],
    body: `
<section class="panel activity-feed">
 <div class="mb-4 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Actividad del equipo</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Últimos 6 cambios registrados por el servidor en esta empresa. Se muestran 6.</p></div>
 ${listGridV2({label: 'Actividad de la empresa', template: ACTIVITY_TEMPLATE, columns: ['Persona', 'Evento', 'Registro'], aligns: [, , 'end'], rows: [activityDay({label: 'jue, 17 sept.', count: 3, rows: [
   {actor: 'María José Fernández de la Vega y Rivarola', photo: '/brand/icon-192.png', timestamp: '2026-09-17T14:30:00-03:00', table: 'inventory_reservations', operation: 'INSERT', record: '4821'},
   {actor: 'Fabrizio Dellacasa Reyes', timestamp: '2026-09-17T11:12:00-03:00', table: 'inventory', operation: 'UPDATE', record: '341'},
   {actor: 'Ana Paula Benítez de la Cruz', timestamp: '2026-09-17T09:05:00-03:00', table: 'clients', operation: 'UPDATE', record: '88'},
 ]}),
 activityDay({label: 'mié, 16 sept.', count: 3, rows: [
   {actor: 'Carlos Ramón Ovelar Giménez', timestamp: '2026-09-16T18:44:00-03:00', table: 'work_orders', operation: 'UPDATE', record: '1502'},
   {actor: 'Lucía Fernanda Centurión Aquino', timestamp: '2026-09-16T10:20:00-03:00', table: 'studio_reservations_cancelled', operation: 'DELETE', record: '212'},
   {actor: 'Sistema', timestamp: '2026-09-16T03:00:00-03:00', table: 'exchange_rates', operation: 'INSERT', record: '59'},
 ]})]})}
 <div class="inline-actions activity-more"><button class="secondary">Cargar 50 más</button></div>
</section>`,
  },

  {
    id: 'equipo-uso-panel',
    section: 'Actividad',
    surface: 'Uso del equipo',
    kind: 'workspace',
    lists: [{container: '.usage-panel [role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Actividad · uso del equipo', exemptBelow: 760}],
    body: `
<section class="panel usage-panel">
 <div class="mb-4 min-w-0"><h2 class="text-[17px] font-semibold tracking-tight text-fore">Uso del equipo</h2><p class="mt-1 text-[13px] leading-[1.5] text-mute">Solo para dueños · Últimos 30 días. Se registra desde la activación de esta función; no reconstruye accesos anteriores.</p></div>
 <p class="form-note">Tiempo activo estimado: ventana visible e interacción reciente. No equivale a horas trabajadas. Una sesión puede abarcar varios días; recargar no cuenta como otro ingreso.</p>
 <div role="table" aria-label="Uso del equipo" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[46rem]">
  <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(11rem,1.6fr)_6.5rem_9rem_minmax(12rem,1.2fr)_8rem]">${['Persona', 'Estado', 'Última conexión', 'Actividad (30 días)', 'Acciones'].map((label, index) => `<span role="columnheader" class="${index === 4 ? 'text-right' : ''} whitespace-nowrap">${label}</span>`).join('')}</div>
  <div role="rowgroup">${usageCards.map((card) => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(11rem,1.6fr)_6.5rem_9rem_minmax(12rem,1.2fr)_8rem]"><span class="min-w-0">${actorIdentity({name: card.name, photo: card.photo})}</span><span><span class="client-status" data-status="${card.state}">${card.status}</span></span><span class="list-date whitespace-nowrap text-[11.5px] text-mute" title="Última conexión">${card.last}</span><span class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${card.summary}</span><span class="flex min-w-0 items-center justify-end"><button type="button" class="text-button" title="Ver accesos: ${card.name}">${svg(ICON.eye, 14)}Ver accesos</button></span></div>`).join('')}</div>
 </div></div>
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
     <details class="ops-profile-section ops-wide" open><summary>Identidad y valores predeterminados</summary><div class="ops-form-grid">
      ${settingsField({label: 'Nombre de la empresa', value: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima'})}
      ${settingsField({label: 'Moneda predeterminada', value: 'Guaraníes (PYG)', control: 'select', help: 'Se aplicará a los nuevos formularios.'})}
     </div></details>
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
    ${listGridV2({label: 'Empresas y accesos', template: COMPANY_TEMPLATE, columns: ['Empresa', 'Rol', 'Estado', 'Acciones'], aligns: [, , , 'end'], minWidth: 'min-w-[36rem]', rows: companySettingsRows.map(companySettingsRow)})}
   </div>
   <details class="settings-disclosure"><summary>Cómo funciona una empresa adicional</summary><div><p>Cada empresa tendrá sus propios clientes, equipo, proyectos y finanzas. Solo tu usuario tendrá acceso inicial.</p><p>Las nuevas empresas incluyen 30 días gratis. Después: US$10 o G. 50.000 al mes por empresa, con 2 días de gracia. Al comenzar el tercer día sin pagar se suspende el uso, sin borrar los datos. No se realiza ningún cobro al crearla.</p><p><strong>Precio de lanzamiento.</strong> El precio de lanzamiento puede cambiar en el futuro. Como cliente fundador, conservarás siempre una tarifa preferencial frente a los nuevos clientes, aunque el importe inicial se actualice.</p></div></details>
   <div class="settings-card-actions"><button class="secondary">Crear otra empresa</button></div>
  </section>
  <section class="panel settings-card" aria-labelledby="coupon-redeem-title">
   <div class="settings-card-heading"><span class="settings-card-icon" aria-hidden="true">${svg(ICON.ticket, 18)}</span><div><h2 id="coupon-redeem-title">Cupones</h2><p>Canjeá un código de la administración global para sumar un mes gratis a tu suscripción.</p></div></div>
   <form class="form-stack" novalidate aria-busy="false">${settingsField({label: 'Código del cupón', value: '', help: 'Ejemplo: SCALE10.'})}<div class="dialog-actions"><button type="submit" class="primary">Canjear cupón</button></div></form>
   <p class="form-note">Cada cupón se puede canjear una sola vez por empresa. No cobra ni guarda datos de pago.</p>
  </section>
 </div>
</div></div>`,
  },



];
