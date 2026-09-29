/*
 * Fixtures v2 de la tanda 3 (issue #46): estados del panel global, seguridad de
 * cuenta y alcance del perfil.
 *
 * Espejan `app/superadmin/states.tsx` (#102: filas compactas), 
 * `app/account-security.tsx` y `app/my-profile.tsx` con las clases de
 * `app/ui-v2.tsx`.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge} from 'owncoding-ui';

const h = React.createElement;
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const StateChip = ({tone = 'mute', children}) => h(Badge, {color: CHIP[tone], className: 'whitespace-nowrap'}, children);
const ROW = 'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3';
const ICON = 'grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute';


const states = h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-3'},
  h('section', {className: `${ROW} border-bad/30`, role: 'alert'},
    h('span', {className: `${ICON} text-bad`}, '⚠'),
    h('div', {className: 'min-w-0'},
      h('b', {className: 'block text-[13.5px] font-semibold text-fore'}, 'No pudimos actualizar el control global'),
      h('p', {className: 'mt-0.5 text-xs text-mute'}, 'La sesión venció. Volvé a iniciar sesión para reintentar.'))),
  h('section', {className: `${ROW} border-warn/40`, role: 'status'},
    h('span', {className: `${ICON} text-warn`}, '▲'),
    h('div', {className: 'min-w-0'},
      h('b', {className: 'block text-[13.5px] font-semibold text-fore'}, 'Primer acceso global pendiente'),
      h('p', {className: 'mt-0.5 text-xs text-mute', title: 'Este diagnóstico no expone correos ni secretos.'}, 'La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia.'))));

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
  {id: 'v2-plt-superadmin-estados', section: 'Configuración', surface: 'Estados del panel global v2', kind: 'plain', body: renderToStaticMarkup(h('main', {className: 'platform-admin-page'}, states))},
  {id: 'v2-plt-perfil-seguridad', section: 'Equipo', surface: 'Seguridad de cuenta v2', kind: 'workspace', body: renderToStaticMarkup(h('div', {className: 'grid grid-cols-[minmax(0,1fr)] gap-4'}, profileScope, security))},
];
