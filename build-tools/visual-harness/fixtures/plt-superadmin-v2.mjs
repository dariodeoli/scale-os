/*
 * Fixtures v2 de la tanda 3 (issue #46): auditoría global, estados del panel
 * global, seguridad de cuenta y alcance del perfil.
 *
 * Espejan `app/superadmin/audit.tsx`, `app/superadmin/states.tsx`,
 * `app/account-security.tsx` y `app/my-profile.tsx` con las clases de
 * `app/ui-v2.tsx`. Datos de ejemplo (auditoría sin `before_state`/`after_state`:
 * deuda de API declarada).
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge} from 'owncoding-ui';

const h = React.createElement;
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const StateChip = ({tone = 'mute', children}) => h(Badge, {color: CHIP[tone], className: 'whitespace-nowrap'}, children);
const CARD = 'grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4';
const SURFACE = 'grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 sm:grid-cols-[auto_minmax(0,1fr)]';
const ICON = 'grid size-10 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute';

const AUDIT_TEMPLATE = 'grid-cols-[11rem_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(12rem,1.4fr)]';
const AUDIT_COLUMNS = [{key: 'date', label: 'Fecha'}, {key: 'actor', label: 'Actor'}, {key: 'action', label: 'Acción'}, {key: 'target', label: 'Destino'}];
const AUDIT = [
  {date: '18 sept 26 · 14:32', actor: 'admin@scaleparaguay.com', action: 'subscription.internal_state.update', target: 'organization_subscription #42', metadata: '{"state":"active","days":30}'},
  {date: '17 sept 26 · 09:05', actor: 'Sistema', action: 'coupon.redeem', target: 'organization_coupon #7', metadata: '{"code":"LANZAMIENTO"}'},
  {date: '12 sept 26 · 18:47', actor: 'otro.admin@estudiodecomunicacion.com.py', action: 'agency.platform_access.grant', target: 'platform_access #3', metadata: null},
];

const auditRow = (entry) => h('div', {role: 'row', key: entry.action + entry.date, className: `grid min-h-11 items-center gap-x-2 border-b border-ink-600/60 px-1 py-1.5 last:border-0 ${AUDIT_TEMPLATE}`},
  h('span', {className: 'whitespace-nowrap text-[11.5px] tabular-nums text-mute'}, entry.date),
  h('span', {className: 'min-w-0 break-words text-[12.5px] text-fore'}, entry.actor),
  h('span', {className: 'min-w-0'}, h(StateChip, {tone: 'info'}, entry.action)),
  h('div', {className: 'min-w-0'},
    h('span', {className: 'block break-words text-[12.5px] text-fore'}, entry.target),
    entry.metadata ? h('small', {className: 'mt-1 block break-words text-[11px] text-mute', title: entry.metadata}, entry.metadata.slice(0, 160)) : null));

const audit = h('section', {className: CARD},
  h('div', {className: 'flex flex-wrap items-center justify-between gap-2'},
    h('div', {className: 'min-w-0'},
      h('p', {className: 'font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, 'Auditoría'),
      h('h2', {className: 'mt-1 text-[17px] font-semibold tracking-tight text-fore'}, 'Actividad de administración global')),
    h('span', {className: 'whitespace-nowrap text-xs tabular-nums text-mute'}, '3 acciones recientes')),
  h('div', {role: 'table', 'aria-label': 'Actividad de administración global', className: 'silent-scroll min-w-0 overflow-x-auto'},
    h('div', {className: 'min-w-[52rem]'},
      h('div', {role: 'row', className: `grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${AUDIT_TEMPLATE}`},
        AUDIT_COLUMNS.map((column) => h('span', {key: column.key, role: 'columnheader', className: 'whitespace-nowrap'}, column.label))),
      h('div', {role: 'rowgroup'}, AUDIT.map(auditRow)))));

const states = h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-3'},
  h('section', {className: SURFACE, role: 'status'},
    h('span', {className: ICON}, '·'),
    h('div', {className: 'min-w-0'},
      h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'No pudimos actualizar el control global'),
      h('p', {className: 'mt-1 break-words text-xs text-bad'}, 'La sesión venció. Volvé a iniciar sesión para reintentar.'))),
  h('section', {className: SURFACE, role: 'status'},
    h('span', {className: ICON}, '·'),
    h('div', {className: 'min-w-0'},
      h('strong', {className: 'block text-[13.5px] text-fore'}, 'Primer acceso global pendiente.'),
      h('span', {className: 'mt-1 block text-xs text-mute'}, 'La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia.'),
      h('small', {className: 'mt-1 block text-[11.5px] text-mute'}, 'Este diagnóstico no expone correos ni secretos.'))));

const security = h('section', {className: 'grid grid-cols-[minmax(0,1fr)] gap-3'},
  h('div', {className: 'min-w-0'},
    h('h3', {className: 'text-[13.5px] font-semibold text-fore'}, 'Seguridad de cuenta'),
    h('p', {className: 'mt-1 text-[11.5px] text-mute'}, 'Tus sesiones son independientes de los accesos de cada empresa.')),
  h('article', {className: 'flex flex-wrap items-center gap-3 rounded-lg border border-ink-600 px-3 py-2'},
    h('span', {className: 'shrink-0 text-mute', 'aria-hidden': 'true'}, '▢'),
    h('div', {className: 'min-w-0 flex-1'},
      h('strong', {className: 'block text-[13px] text-fore'}, 'Esta sesión'),
      h('small', {className: 'block break-words text-[11.5px] tabular-nums text-mute'}, 'Desde 18 sept 26 · 14:32 · vence 18 oct 26 · 14:32')),
    h(StateChip, {tone: 'ok'}, 'Actual'),
    h('button', {className: 'text-button', type: 'button'}, 'Cerrar y salir')));

const profileScope = h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-4'},
  h('section', {className: 'grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4', 'data-profile-section': 'identity'},
    h('p', {className: 'font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, 'Identidad'),
    h('dl', {className: 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]'},
      h('dt', {className: 'text-mute'}, 'Correo de acceso'),
      h('dd', {className: 'min-w-0 break-words text-fore'}, 'persona.con.correo.largo@estudiodecomunicacion.com.py')),
    h('p', {className: 'text-[11.5px] text-mute'}, 'Tu correo de acceso no se modifica desde acá.')),
  h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4', 'data-profile-section': 'scope'},
    h('strong', {className: 'text-[13.5px] text-fore'}, 'Identidad personal'),
    h('p', {className: 'text-xs text-mute'}, 'Tu nombre y foto personales se comparten entre tus empresas. El cargo, sueldo y acceso se mantienen separados en cada empresa.')));

export default [
  {
    id: 'v2-plt-superadmin-auditoria',
    section: 'Configuración',
    surface: 'Auditoría global v2',
    kind: 'plain',
    lists: [{container: '[role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Auditoría · lista v2', rowHeight: [44, 52]}],
    body: renderToStaticMarkup(audit),
  },
  {id: 'v2-plt-superadmin-estados', section: 'Configuración', surface: 'Estados del panel global v2', kind: 'plain', body: renderToStaticMarkup(states)},
  {id: 'v2-plt-perfil-seguridad', section: 'Equipo', surface: 'Seguridad de cuenta v2', kind: 'workspace', body: renderToStaticMarkup(h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-4'}, profileScope, security))},
];
