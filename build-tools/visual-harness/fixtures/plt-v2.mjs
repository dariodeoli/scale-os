/*
 * Fixtures v2 del dominio PLT (issue #46): Roles y permisos, Invitaciones,
 * Papelera, Preferencias y sus estados.
 *
 * El markup de los objetos compartidos se genera con `renderToStaticMarkup`
 * sobre `owncoding-ui`; los patrones de aplicación replican `app/ui-v2.tsx`
 * (PageHeader, KpiStrip/Kpi, ListGrid/ListRow, StateChip, estados) con las
 * mismas clases, y la estructura espeja los componentes reales:
 *   - app/permissions-matrix.tsx → MATRIX_TEMPLATE/MATRIX_COLUMNS, Switch por cargo
 *   - app/invite-links.tsx       → REQUESTS_TEMPLATE/LINKS_TEMPLATE
 *   - app/archive-controls.tsx   → TRASH_TEMPLATE
 *   - app/sections/preferencias.tsx
 * Datos reales del API de PLT (access-requests, invite-links, trash, permisos),
 * sin campos inventados. Cuando los componentes cambien, se re-sincroniza.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, Button, CeldaMoneda, EmptyState, ErrorState, Skeleton, Stat, Switch} from 'owncoding-ui';

const h = React.createElement;
const noop = () => {};

/* ── Réplica de app/ui-v2.tsx (mismas clases) ─────────────────────────────── */
const CARD = 'rounded-xl border border-ink-600 bg-ink-800 p-4';
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

const Kpi = ({label, valor, hint, destacado}) => h(Stat, {label, destacado, sub: hint, valor});
const KpiStrip = ({children}) => h('div', {className: 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'}, children);
const StateChip = ({tone = 'mute', title, children}) => h(Badge, {color: CHIP[tone], title, className: 'whitespace-nowrap'}, children);
const Row = ({children}) => h('div', {className: 'flex items-center gap-2'}, children);
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
const ListRow = ({template, children}) => h('div', {role: 'row', className: `grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-2 last:border-0 md:min-h-11 ${template}`}, children);
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

const roleToggle = (label, checked) => h('span', {key: label, className: 'flex items-center gap-2 whitespace-nowrap'},
  h(Switch, {checked, disabled: false, ariaLabel: label, onChange: noop}),
  h('span', {className: 'text-[11.5px] text-mute'}, label));

const capabilityRow = (capability) => {
  const manual = capability.overrides ? h('small', {className: 'mt-1 block text-[10.5px] text-info tabular-nums'}, `${capability.overrides} ajuste(s) manual(es)`) : null;
  const identity = h('div', {className: 'min-w-0'},
    h('b', {className: 'block text-[13.5px] font-semibold leading-[1.2] text-fore'}, capability.label),
    h('small', {className: 'block text-[11.5px] text-mute'}, capability.description),
    manual);
  const toggles = h('div', {className: 'flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2'}, ROLES.map(([, label, checked]) => roleToggle(label, checked)));
  return h(ListRow, {key: capability.label, template: MATRIX_TEMPLATE}, identity, toggles);
};

const roleSummary = h('details', {className: 'group rounded-xl border border-ink-600 bg-ink-800'},
  h('summary', {className: 'flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 p-4'},
    h('span', {className: 'text-sm font-semibold text-fore'}, 'Colaborador'),
    h('span', {className: 'min-w-0 flex-1 text-xs text-mute'}, 'Colaborador: trabaja clientes, proyectos, producción, presupuestos, pipeline, estudio e inventario sin ver finanzas, salarios, accesos ni actividad.'),
    h(StateChip, {tone: 'mute'}, '24 de 42')));

const permisosPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Equipo', title: 'Roles y permisos', subtitle: 'Un permiso por capacidad y cargo; el Dueño conserva todo.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'cap', label: 'Capacidades', valor: 42, hint: 'Acciones que controla el panel', destacado: true}),
    h(Kpi, {key: 'roles', label: 'Cargos', valor: 9, hint: 'Roles configurables de la empresa'}),
    h(Kpi, {key: 'manual', label: 'Ajustes manuales', valor: 3, hint: 'Permisos fuera del valor por defecto'})),
  roleSummary,
  h(Grid, {label: 'Roles y permisos', template: MATRIX_TEMPLATE, columns: MATRIX_COLUMNS, minWidthClass: 'min-w-[52rem]'}, CAPABILITIES.map(capabilityRow)));

/* ── Invitaciones (app/invite-links.tsx) ──────────────────────────────────── */
const REQUESTS_TEMPLATE = 'grid-cols-[minmax(16rem,2.4fr)_15rem]';
const REQUESTS_COLUMNS = [{key: 'request', label: 'Solicitud'}, {key: 'actions', label: 'Acciones'}];
const LINKS_TEMPLATE = 'grid-cols-[minmax(18rem,2.4fr)_15rem]';
const LINKS_COLUMNS = [{key: 'link', label: 'Enlace'}, {key: 'actions', label: 'Acciones'}];
const REQUESTS = [
  {name: 'Validación de nombre largo para medir el ajuste', email: 'persona.con.correo.largo@estudiodecomunicacion.com.py', role: 'Solo lectura', status: 'pending', reason: null},
  {name: 'Solicitud con enlace revocado', email: 'revocado@example.invalid', role: 'Solo lectura', status: 'unavailable', reason: 'El enlace fue revocado.'},
];
const LINKS = [
  {role: 'Producción', mode: 'Con aprobación', tone: 'ok', state: 'Vence 17-oct', clicks: 12, accounts: 3, joined: 3},
  {role: 'Solo lectura', mode: 'Un solo uso', tone: 'bad', state: 'Revocado', clicks: 4, accounts: 0, joined: 0},
];

const requestRow = (request) => {
  const identity = h('div', {className: 'min-w-0'},
    h('b', {className: 'block break-words text-[13.5px] font-semibold leading-[1.2] text-fore'}, request.name),
    h('p', {className: 'mt-1 whitespace-nowrap text-[11.5px] text-mute'}, `${request.email} · ${request.role}`),
    request.reason ? h('p', {className: 'mt-1 flex flex-wrap items-center gap-2 text-[11.5px] text-mute'}, h(StateChip, {tone: 'mute'}, 'No disponible'), h('span', null, request.reason)) : null);
  const actions = h('div', {className: 'flex min-w-0 flex-wrap items-center justify-end gap-1'},
    request.status === 'pending' ? h(Button, {key: 'approve', variant: 'outline'}, 'Aprobar acceso') : null,
    h(Button, {key: 'reject', variant: 'outline'}, 'Rechazar'));
  return h('article', {role: 'row', key: request.email, className: `grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-3 last:border-0 md:min-h-11 ${REQUESTS_TEMPLATE}`}, identity, actions);
};

const linkRow = (link) => {
  const usage = h('p', {className: 'mt-1 text-[11.5px] text-mute'},
    h('span', {className: 'whitespace-nowrap tabular-nums'}, `${link.clicks} clics · ${link.accounts} cuentas creadas`),
    link.joined ? h('span', {className: 'ml-2 whitespace-nowrap text-info'}, `${link.joined} unidos`) : h('span', {className: 'ml-2'}, 'Nadie se unió todavía'));
  const identity = h('div', {className: 'min-w-0'},
    h(Row, null,
      h('strong', {className: 'text-[13.5px] font-semibold text-fore'}, `${link.role} · ${link.mode}`),
      h(StateChip, {tone: link.tone}, link.state)),
    usage);
  const actions = h('div', {className: 'flex min-w-0 flex-wrap items-center justify-end gap-1'},
    h(Button, {key: 'copy', variant: 'outline'}, 'Copiar enlace'),
    h(Button, {key: 'end', variant: 'outline'}, link.joined ? 'Revocar' : 'Eliminar'));
  return h(ListRow, {key: link.role + link.mode, template: LINKS_TEMPLATE}, identity, actions);
};

const invitacionesPage = h('section', {className: 'grid gap-4'},
  h(Header, {eyebrow: 'Equipo', title: 'Invitaciones y solicitudes', subtitle: 'Atendé las solicitudes pendientes, generá enlaces temporales y limpiá los que ya cumplieron su ciclo.'}),
  h(KpiStrip, null,
    h(Kpi, {key: 'pending', label: 'Solicitudes pendientes', valor: 2, hint: 'Esperan aprobación o rechazo', destacado: true}),
    h(Kpi, {key: 'links', label: 'Enlaces activos', valor: 1, hint: 'Sin revocar ni usar'}),
    h(Kpi, {key: 'joined', label: 'Personas unidas', valor: 3, hint: 'Ingresaron con un enlace'})),
  h(SectionCard, {title: 'Solicitudes', subtitle: 'Aprobá solo los accesos disponibles; el estado actual lo confirma el API.', meta: '2 de 2 pendientes'},
    h(Grid, {label: 'Solicitudes de acceso', template: REQUESTS_TEMPLATE, columns: REQUESTS_COLUMNS, minWidthClass: 'min-w-[36rem]'}, REQUESTS.map(requestRow))),
  h(SectionCard, {title: 'Enlaces recientes', subtitle: 'Los enlaces agotados o revocados se pueden eliminar; los que tuvieron ingresos conservan su historial.', meta: '2 enlaces'},
    h(Grid, {label: 'Enlaces de invitación', template: LINKS_TEMPLATE, columns: LINKS_COLUMNS, minWidthClass: 'min-w-[38rem]'}, LINKS.map(linkRow))));

/* ── Papelera (app/archive-controls.tsx) ──────────────────────────────────── */
const TRASH_TEMPLATE = 'grid-cols-[2rem_7rem_minmax(16rem,2.4fr)_7rem]';
const TRASH_COLUMNS = [{key: 'select', label: ''}, {key: 'kind', label: 'Tipo'}, {key: 'record', label: 'Registro'}, {key: 'actions', label: 'Acciones'}];
const TRASHED = [
  {kind: 'Cliente', name: 'Estudio de Comunicación Audiovisual y Producción del Paraguay S.A.', by: 'María Fernanda Giménez Caballero', when: '18 sept 26 · 14:32'},
  {kind: 'Presupuesto', name: 'Presupuesto 2026-0148 · Campaña integral', by: 'Sistema', when: '12 sept 26 · 09:05'},
  {kind: 'Colaborador', name: 'Juan Carlos Domínguez', by: 'Dario De Oliveira', when: '02 sept 26 · 18:47'},
];

const trashRow = (record) => {
  const check = h('label', {className: 'flex items-center'}, h('input', {type: 'checkbox', 'aria-label': `Seleccionar ${record.name}`}));
  const kind = h('span', {className: 'whitespace-nowrap text-[11.5px] text-mute'}, record.kind);
  const identity = h('div', {className: 'min-w-0'},
    h('b', {className: 'block break-words text-[13.5px] font-semibold leading-[1.2] text-fore', title: record.name}, record.name),
    h('small', {className: 'mt-1 block text-[11.5px] text-mute'}, h('span', {className: 'whitespace-nowrap'}, `Movido a Papelera por ${record.by}`), h('span', {className: 'ml-2 whitespace-nowrap'}, `· ${record.when}`)));
  const actions = h('div', {className: 'flex justify-end'}, h(Button, {variant: 'outline'}, 'Restaurar'));
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
