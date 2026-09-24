/*
 * Fixtures v2 del dominio PLT (issue #46): Roles y permisos, Invitaciones,
 * Papelera, Preferencias y sus estados.
 *
 * El markup de los objetos compartidos se genera con `renderToStaticMarkup`
 * sobre `owncoding-ui`; los patrones de aplicación replican `app/ui-v2.tsx`
 * (PageHeader, KpiStrip/Kpi, ListGrid/ListRow, StateChip, estados) con las
 * mismas clases, y la estructura espeja los componentes reales:
 *   - app/permissions-matrix.tsx → MATRIX_TEMPLATE/MATRIX_COLUMNS, Switch por cargo
 *   - app/invite-links.tsx       → REQUESTS_TEMPLATE/LINKS_TEMPLATE (filas de 6 y 5 columnas)
 *   - app/archive-controls.tsx   → TRASH_TEMPLATE (registro + auditoría en una línea)
 *   - app/sections/preferencias.tsx
 * Datos reales del API de PLT (access-requests, invite-links, trash, permisos),
 * sin campos inventados. Cuando los componentes cambien, se re-sincroniza.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, CeldaMoneda, EmptyState, ErrorState, Skeleton, Stat, Switch} from 'owncoding-ui';

const h = React.createElement;
const noop = () => {};

/* ── Réplica de app/ui-v2.tsx (mismas clases) ─────────────────────────────── */
const CARD = 'rounded-xl border border-ink-600 bg-ink-800 p-4';
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

const Kpi = ({label, valor, hint, destacado}) => h(Stat, {label, destacado, sub: hint, valor});
const KpiStrip = ({children}) => h('div', {className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'}, children);
const StateChip = ({tone = 'mute', title, children}) => h(Badge, {color: CHIP[tone], title, className: 'whitespace-nowrap'}, children);
const Header = ({eyebrow, title, subtitle}) => h('header', {className: 'mb-4 flex flex-wrap items-start justify-between gap-3'},
  h('div', {className: 'min-w-0'},
    h('p', {className: 'mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, eyebrow),
    h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, title),
    h('p', {className: 'mt-1 text-sm text-mute'}, subtitle)));
const Grid = ({label, template, columns, children, minWidthClass = 'min-w-[48rem]'}) => h('div', {role: 'table', 'aria-label': label, className: 'silent-scroll min-w-0 overflow-x-auto'},
  h('div', {className: minWidthClass},
    h('div', {role: 'row', className: `grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}`},
      columns.map((column, index) => h('span', {key: column.key, role: 'columnheader', className: `${index === columns.length - 1 ? 'text-right' : 'text-left'} whitespace-nowrap`}, column.label))),
    h('div', {role: 'rowgroup'}, children)));
/** Fila finita v2: mismas clases que app/ui-v2.tsx (`ListRow`). */
const ListRow = ({template, children, className = '', ...props}) => h('div', {role: 'row', ...props, className: `grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${template} ${className}`}, children);
/** Densidad de fila finita (app/invite-links.tsx): identidad compacta. */
const ROW_DENSITY = '[&_.actor-identity]:py-0.5 [&_.actor-identity-name]:truncate md:[&_.actor-identity-avatar]:h-6 md:[&_.actor-identity-avatar]:w-6 md:[&_.actor-identity-avatar]:flex-none';
/** Réplica de `ActorIdentity` (app/actor-identity.tsx) con sus clases. */
const ActorIdentity = ({name, photo = '/brand/icon-192.png'}) => h('span', {className: 'actor-identity'},
  h('span', {className: 'actor-identity-avatar', 'aria-hidden': 'true'}, photo ? h('img', {src: photo, alt: '', referrerPolicy: 'no-referrer'}) : null),
  h('span', {className: 'actor-identity-details'}, h('span', {className: 'actor-identity-name', title: name}, name)));
const SectionCard = ({title, subtitle, meta, children}) => h('div', {className: `${CARD} grid gap-3`},
  h('div', {className: 'flex flex-wrap items-center justify-between gap-2'},
    h('div', {className: 'min-w-0'},
      h('h3', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, title),
      subtitle ? h('p', {className: 'mt-1 text-xs text-mute'}, subtitle) : null),
    meta ? h('span', {className: 'whitespace-nowrap text-xs tabular-nums text-mute'}, meta) : null),
  children);
const EmptyBlock = ({title, description}) => h('div', {role: 'status', className: CARD}, h(EmptyState, {title, description, compact: true}));
const ErrorBlock = ({title, description}) => h('div', {role: 'alert', className: CARD}, h(ErrorState, {title, description, onRetry: noop}));
const LoadingBlock = ({label, lines}) => h('div', {role: 'status', 'aria-busy': 'true', 'aria-label': label, className: 'grid gap-2'},
  h(Skeleton, {className: 'h-4 w-1/3'}),
  Array.from({length: lines}, (_, index) => h(Skeleton, {key: index, className: 'h-10 w-full'})));

/* ── Roles y permisos (app/permissions-matrix.tsx) ────────────────────────── */
const MATRIX_TEMPLATE = 'grid-cols-[minmax(15rem,1.4fr)_minmax(0,2.6fr)]';
const MATRIX_COLUMNS = [{key: 'capability', label: 'Capacidad'}, {key: 'roles', label: 'Permisos por cargo'}];
const ROLES = [
  ['owner', 'Dueño', true], ['admin', 'Administrador', true], ['management', 'Gerencia', false],
  ['finance', 'Finanzas', false], ['sales', 'Ventas', false], ['production', 'Producción', false],
  ['editor', 'Edición', false], ['viewer', 'Solo lectura', false], ['collaborator', 'Colaborador', false],
];
const CAPABILITIES = [
  {label: 'Gestionar equipo y accesos', description: 'Invitar, aprobar solicitudes y cambiar cargos.', overrides: 2},
  {label: 'Ver finanzas y salarios', description: 'Incluye montos de compensación y facturación.', overrides: 1},
  {label: 'Administrar clientes', description: 'Alta, edición, archivo y términos comerciales largos para probar el ajuste de línea sin recortes.', overrides: 0},
];

const roleToggle = (label, checked) => h('label', {key: label, className: "relative flex items-center gap-2 whitespace-nowrap after:absolute after:inset-x-0 after:-inset-y-2.5 after:content-['']"},
  h(Switch, {checked, disabled: false, ariaLabel: label, onChange: noop}),
  h('span', {className: 'text-[11.5px] text-mute'}, label));

const capabilityRow = (capability) => {
  const manual = capability.overrides ? h('small', {className: 'whitespace-nowrap text-[10.5px] text-info tabular-nums', title: `${capability.overrides} ajustes manuales`}, `· ${capability.overrides} ajuste(s)`) : null;
  const identity = h('div', {className: 'flex min-w-0 items-baseline gap-2'},
    h('b', {className: 'whitespace-nowrap text-[13.5px] font-semibold leading-[1.2] text-fore'}, capability.label),
    h('small', {className: 'min-w-0 truncate text-[11.5px] text-mute', title: capability.description}, capability.description),
    manual);
  const toggles = h('div', {className: 'flex min-w-0 items-center gap-x-4 whitespace-nowrap'}, ROLES.map(([, label, checked]) => roleToggle(label, checked)));
  return h(ListRow, {key: capability.label, template: MATRIX_TEMPLATE}, identity, toggles);
};

const roleSummary = h('details', {className: 'group rounded-xl border border-ink-600 bg-ink-800'},
  h('summary', {className: 'flex cursor-pointer flex-col items-start gap-2 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2'},
    h('span', {className: 'text-sm font-semibold text-fore'}, 'Colaborador'),
    h('span', {className: 'min-w-0 flex-1 text-xs text-mute'}, 'Colaborador: trabaja clientes, proyectos, producción, presupuestos, pipeline, estudio e inventario sin ver finanzas, salarios, accesos ni actividad.'),
    h('span', {className: 'flex items-center gap-2 sm:contents'},
      h(StateChip, {tone: 'mute'}, '24 de 42'),
      h('svg', {className: 'shrink-0 text-mute', width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, 'aria-hidden': 'true'}, h('path', {d: 'm6 9 6 6 6-6'})))));

const permisosPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Equipo', title: 'Roles y permisos', subtitle: 'Un permiso por capacidad y cargo; el Dueño conserva todo.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'cap', label: 'Capacidades', valor: 42, hint: 'Acciones que controla el panel', destacado: true}),
    h(Kpi, {key: 'roles', label: 'Cargos', valor: 9, hint: 'Roles configurables de la empresa'}),
    h(Kpi, {key: 'manual', label: 'Ajustes manuales', valor: 3, hint: 'Permisos fuera del valor por defecto'})),
  roleSummary,
  h(Grid, {label: 'Roles y permisos', template: MATRIX_TEMPLATE, columns: MATRIX_COLUMNS, minWidthClass: 'min-w-[84rem]'}, CAPABILITIES.map(capabilityRow)));

/* ── Invitaciones (app/invite-links.tsx) ──────────────────────────────────── */
const REQUESTS_TEMPLATE = 'grid-cols-[minmax(11rem,1.5fr)_minmax(12rem,1.5fr)_6.5rem_7.5rem_5.5rem_14rem]';
const REQUESTS_COLUMNS = [{key: 'person', label: 'Persona'}, {key: 'email', label: 'Correo'}, {key: 'role', label: 'Rol'}, {key: 'status', label: 'Estado'}, {key: 'date', label: 'Fecha'}, {key: 'actions', label: 'Acciones'}];
const LINKS_TEMPLATE = 'grid-cols-[minmax(12rem,1.6fr)_8rem_minmax(11rem,1.2fr)_minmax(10rem,1.2fr)_12rem]';
const LINKS_COLUMNS = [{key: 'link', label: 'Enlace'}, {key: 'status', label: 'Estado'}, {key: 'activity', label: 'Actividad'}, {key: 'author', label: 'Autor'}, {key: 'actions', label: 'Acciones'}];
const REQUESTS = [
  {name: 'Validación de nombre largo para medir el ajuste', email: 'persona.con.correo.largo@estudiodecomunicacion.com.py', role: 'Solo lectura', status: 'pending', reason: null},
  {name: 'Solicitud con enlace revocado', email: 'revocado@example.invalid', role: 'Solo lectura', status: 'unavailable', reason: 'El enlace fue revocado.'},
];
const LINKS = [
  {role: 'Producción', mode: 'Con aprobación', tone: 'ok', state: 'Vence 17-oct', clicks: 12, accounts: 3, joined: 3},
  {role: 'Solo lectura', mode: 'Un solo uso', tone: 'warn', state: 'Vence 14-oct', clicks: 4, accounts: 0, joined: 0},
  {role: 'Finanzas', mode: 'Un solo uso', tone: 'bad', state: 'Revocado', clicks: 30, accounts: 0, joined: 0},
];

const requestRow = (request) => {
  const unavailable = request.status !== 'pending';
  return h(ListRow, {key: request.email, template: REQUESTS_TEMPLATE, className: ROW_DENSITY},
    h(ActorIdentity, {name: request.name}),
    h('span', {className: 'min-w-0 truncate text-[12px] text-mute', title: request.email}, request.email),
    h('span', {className: 'whitespace-nowrap text-[12.5px] text-fore'}, request.role),
    h('span', {className: 'flex min-w-0 items-center gap-2'},
      h(StateChip, {tone: unavailable ? 'mute' : 'info'}, unavailable ? 'No disponible' : 'Pendiente'),
      request.reason ? h('span', {className: 'min-w-0 truncate text-[11.5px] text-mute', title: request.reason}, request.reason) : null),
    h('span', {className: 'whitespace-nowrap text-[12px] tabular-nums text-mute'}, '18-sept'),
    h('span', {className: 'flex min-w-0 items-center justify-end gap-1 whitespace-nowrap'},
      request.status === 'pending' ? h('button', {key: 'approve', className: 'text-button positive'}, 'Aprobar acceso') : null,
      h('button', {key: 'reject', className: 'text-button danger'}, 'Rechazar')));
};

const linkRow = (link) => {
  const joinedUsers = Array.from({length: link.joined}, (_, index) => `Persona unida ${index + 1}`);
  const activity = `${link.clicks} clics · ${link.accounts} cuentas creadas · ${link.joined ? `${link.joined} unidos` : 'Nadie se unió todavía'}`;
  return h(ListRow, {key: link.role + link.mode, template: LINKS_TEMPLATE, className: ROW_DENSITY},
    h('strong', {className: 'min-w-0 truncate text-[13.5px] font-semibold text-fore', title: `${link.role} · ${link.mode}`}, `${link.role} · ${link.mode}`),
    h(StateChip, {tone: link.tone}, link.state),
    h('span', {className: 'min-w-0 truncate text-[11.5px] tabular-nums text-mute', title: joinedUsers.length ? `${activity} · Se unieron ${joinedUsers.join(', ')}` : activity}, activity),
    h(ActorIdentity, {name: 'María Fernanda Giménez'}),
    h('span', {className: 'flex min-w-0 items-center justify-end gap-1 whitespace-nowrap'},
      h('button', {key: 'copy', className: 'text-button'}, 'Copiar enlace'),
      h('button', {key: 'end', className: 'text-button'}, link.joined ? 'Revocar' : 'Eliminar')));
};

const invitacionesPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Equipo', title: 'Invitaciones y solicitudes', subtitle: 'Atendé las solicitudes pendientes, generá enlaces temporales y limpiá los que ya cumplieron su ciclo.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'pending', label: 'Solicitudes pendientes', valor: 2, hint: 'Esperan aprobación o rechazo', destacado: true}),
    h(Kpi, {key: 'links', label: 'Enlaces activos', valor: 1, hint: 'Sin revocar ni usar'}),
    h(Kpi, {key: 'joined', label: 'Personas unidas', valor: 3, hint: 'Ingresaron con un enlace'})),
  h(SectionCard, {title: 'Solicitudes', subtitle: 'Aprobá solo los accesos disponibles; el estado actual lo confirma el API.', meta: '2 de 2 pendientes'},
    h(Grid, {label: 'Solicitudes de acceso', template: REQUESTS_TEMPLATE, columns: REQUESTS_COLUMNS, minWidthClass: 'min-w-[60rem]'}, REQUESTS.map(requestRow))),
  h(SectionCard, {title: 'Enlaces recientes', subtitle: 'Los enlaces agotados o revocados se pueden eliminar; los que tuvieron ingresos conservan su historial.', meta: '3 enlaces'},
    h(Grid, {label: 'Enlaces de invitación', template: LINKS_TEMPLATE, columns: LINKS_COLUMNS, minWidthClass: 'min-w-[56rem]'}, LINKS.map(linkRow))));

/* ── Papelera (app/archive-controls.tsx) ──────────────────────────────────── */
const TRASH_TEMPLATE = 'grid-cols-[2rem_7rem_minmax(16rem,2.4fr)_7rem]';
const TRASH_COLUMNS = [{key: 'select', label: ''}, {key: 'kind', label: 'Tipo'}, {key: 'record', label: 'Registro'}, {key: 'actions', label: 'Acciones'}];
const TRASHED = [
  {kind: 'Cliente', name: 'Estudio de Comunicación Audiovisual y Producción del Paraguay S.A.', by: 'María Fernanda Giménez Caballero', when: '18 sept 26 · 14:32'},
  {kind: 'Presupuesto', name: 'Presupuesto 2026-0148 · Campaña integral', by: 'Sistema', when: '12 sept 26 · 09:05'},
  {kind: 'Colaborador', name: 'Juan Carlos Domínguez', by: 'Dario De Oliveira', when: '02 sept 26 · 18:47'},
];

const trashRow = (record) => {
  const check = h('label', {className: "relative flex items-center after:absolute after:-inset-3.5 after:content-['']", title: 'Seleccionar registro'}, h('input', {type: 'checkbox', 'aria-label': `Seleccionar ${record.name}`}));
  const kind = h('span', {className: 'whitespace-nowrap text-[11.5px] text-mute'}, record.kind);
  const identity = h('div', {className: 'flex min-w-0 items-baseline gap-2 overflow-hidden'},
    h('b', {className: 'min-w-0 truncate text-[13.5px] font-semibold leading-[1.2] text-fore', title: record.name}, record.name),
    h('small', {className: 'flex min-w-0 items-baseline gap-2 text-[11.5px] text-mute'},
      h('span', {className: 'min-w-0 truncate', title: `Movido a Papelera por ${record.by}`}, `Movido a Papelera por ${record.by}`),
      h('span', {className: 'shrink-0 whitespace-nowrap'}, `· ${record.when}`)));
  const actions = h('div', {className: 'flex justify-end'}, h('button', {className: 'text-button'}, 'Restaurar'));
  return h(ListRow, {key: record.name, template: TRASH_TEMPLATE}, check, kind, identity, actions);
};

const papeleraPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Configuración', title: 'Papelera de esta empresa', subtitle: 'Solo ves registros que tu permiso permite recuperar. No se borran de forma definitiva: los accesos retirados se devuelven con una nueva invitación desde Equipo.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'total', label: 'Registros en papelera', valor: 3, hint: 'Recuperables con tu permiso actual', destacado: true}),
    h(Kpi, {key: 'kinds', label: 'Tipos de registro', valor: 3, hint: 'Clasificación del API'}),
    h(Kpi, {key: 'selected', label: 'Seleccionados', valor: 0, hint: 'Para restaurar en lote'})),
  h(SectionCard, {title: 'Registros recuperables', subtitle: 'Seleccioná varios para restaurar en lote.', meta: '3 registros'},
    h(Grid, {label: 'Papelera', template: TRASH_TEMPLATE, columns: TRASH_COLUMNS, minWidthClass: 'min-w-[40rem]'}, TRASHED.map(trashRow))));

/* ── Preferencias (app/sections/preferencias.tsx) ─────────────────────────── */
const preferenciasPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Configuración', title: 'Preferencias del espacio', subtitle: 'Se guardan solo para vos en Estudio de Comunicación y Producción, en este navegador.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'start', label: 'Inicio configurado', valor: 'Resumen', hint: 'Solo se aplica al entrar a la raíz'}),
    h(Kpi, {key: 'filters', label: 'Filtros del tablero', valor: 2, hint: 'Se editan desde Producción'}),
    h(Kpi, {key: 'scope', label: 'Alcance', valor: 'Este navegador', hint: 'No se sincroniza entre dispositivos'})),
  h(SectionCard, {title: 'Filtros guardados del tablero', subtitle: 'Se aplican a Producción con la semana de lunes a domingo según la hora local de tu dispositivo.'},
    h('div', {className: 'flex flex-wrap items-center gap-2'},
      h(StateChip, {key: 'mine', tone: 'info'}, 'Solo mis órdenes'),
      h(StateChip, {key: 'week', tone: 'info'}, 'Semana actual'),
      h(StateChip, {key: 'client', tone: 'mute'}, 'Todos los clientes'))));

/* ── Estados v2 de PLT ────────────────────────────────────────────────────── */
const statesPage = h('section', {className: 'grid gap-4'},
  h(EmptyBlock, {key: 'empty', title: 'No hay solicitudes pendientes', description: 'Cuando alguien pida acceso con un enlace de aprobación, aparece acá.'}),
  h(ErrorBlock, {key: 'error', title: 'No pudimos cargar la papelera', description: 'Revisá tu conexión e intentá de nuevo.'}),
  h('div', {key: 'loading', className: CARD}, h(LoadingBlock, {label: 'Cargando permisos…', lines: 3})));

export default [
  {
    id: 'v2-permisos',
    section: 'Equipo',
    surface: 'Roles y permisos v2',
    kind: 'workspace',
    lists: [{container: '[role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Permisos · lista v2', rowHeight: [44, 52]}],
    body: renderToStaticMarkup(permisosPage),
  },
  {
    id: 'v2-invitaciones',
    section: 'Equipo',
    surface: 'Invitaciones y solicitudes v2',
    kind: 'workspace',
    lists: [
      {container: '[aria-label="Solicitudes de acceso"]', head: '[role="row"]', row: '[aria-label="Solicitudes de acceso"] [role="rowgroup"] [role="row"]', label: 'Solicitudes · lista v2', rowHeight: [44, 52]},
      {container: '[aria-label="Enlaces de invitación"]', head: '[role="row"]', row: '[aria-label="Enlaces de invitación"] [role="rowgroup"] [role="row"]', label: 'Enlaces · lista v2', rowHeight: [44, 52]},
    ],
    body: renderToStaticMarkup(invitacionesPage),
  },
  {
    id: 'v2-papelera',
    section: 'Configuración',
    surface: 'Papelera v2',
    kind: 'workspace',
    lists: [{container: '[role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Papelera · lista v2', rowHeight: [44, 52]}],
    body: renderToStaticMarkup(papeleraPage),
  },
  {id: 'v2-preferencias', section: 'Configuración', surface: 'Preferencias v2', kind: 'workspace', body: renderToStaticMarkup(preferenciasPage)},
  {id: 'v2-plt-estados', section: 'Primitivas', surface: 'Estados PLT v2', kind: 'plain', body: renderToStaticMarkup(statesPage)},
];
