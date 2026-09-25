/*
 * Fixtures v2 de los helpers PLT (issue #46): bandeja de notificaciones,
 * panel de suscripción y zona de peligro. Espejan el markup real de
 * `app/notification-inbox.tsx`, `app/subscription-panel.tsx` y
 * `app/deletion-danger-zone.tsx` (clases Tailwind + tokens v2) con datos de
 * estrés; cuando esos componentes cambien, se re-sincroniza.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, Button} from 'owncoding-ui';

const h = React.createElement;
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const StateChip = ({tone = 'mute', className = '', children}) => h(Badge, {color: CHIP[tone], className: `whitespace-nowrap ${className}`.trim()}, children);
const ICON_ACTION = 'icon-button !h-11 !w-11';
const CARD = 'grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800 p-4';
const CARD_UNREAD = 'grid min-w-0 gap-2 rounded-xl border border-ink-600 border-l-4 border-l-fono bg-ink-700 p-4';
const title = (text, tag = 'h3', className = 'min-w-0 whitespace-pre-wrap text-sm font-semibold leading-[1.3] text-fore [overflow-wrap:anywhere]') => h(tag, {className}, text);

/* ── Bandeja de notificaciones (app/notification-inbox.tsx) ───────────────── */
const NOTICES = [
  {title: 'Asignación propia de proyecto con un nombre largo para medir el ajuste', body: 'Te asignaron una pieza con un comentario extenso que debe envolver sin recortarse en ningún ancho de pantalla.', kind: 'Asignación', time: '23 sept 26 · 14:32', state: 'Sin leer · Pendiente', unread: true},
  {title: 'Mención en un comentario', body: 'Aviso resuelto con su estado.', kind: 'Mención o comentario', time: '22 sept 26 · 09:05', state: 'Leída · Resuelta', unread: false},
];

const noticeCard = (notice) => h('article', {key: notice.title, className: notice.unread ? CARD_UNREAD : CARD},
  h('div', {className: 'flex min-w-0 flex-wrap items-baseline gap-2'},
    title(notice.title),
    h(StateChip, {tone: 'mute', className: 'uppercase tracking-[.05em]'}, notice.kind)),
  h('p', {className: 'min-w-0 whitespace-pre-wrap text-[12.5px] leading-[1.45] text-mute [overflow-wrap:anywhere]'}, notice.body),
  h('time', {className: 'whitespace-nowrap text-[11px] tabular-nums text-mute'}, notice.time),
  h('p', {className: 'whitespace-nowrap text-[10px] font-semibold uppercase tracking-[.075em] text-mute'}, notice.state),
  h('div', {className: 'flex flex-wrap items-center gap-1 border-t border-ink-600 pt-2'},
    h('button', {key: 'open', type: 'button', className: ICON_ACTION, title: 'Ver pieza', 'aria-label': `Ver pieza: ${notice.title}`}, '↗'),
    notice.unread ? h('button', {key: 'read', type: 'button', className: `${ICON_ACTION} notification-action-icon is-confirm`, title: 'Marcar como leída', 'aria-label': `Marcar como leída: ${notice.title}`}, '✓') : null,
    h('button', {key: 'resolve', type: 'button', className: `${ICON_ACTION} notification-action-icon ${notice.unread ? 'is-confirm' : ''}`, title: notice.unread ? 'Resolver aviso' : 'Reabrir aviso', 'aria-label': `${notice.unread ? 'Resolver aviso' : 'Reabrir aviso'}: ${notice.title}`}, notice.unread ? '◉' : '↺')));

const bandeja = h('div', {className: 'grid min-w-0 max-w-full gap-3 [overflow-wrap:anywhere]'},
  h('div', {className: 'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-700 px-3 py-2'},
    h('p', {role: 'status', className: 'text-[13px] tabular-nums text-mute'}, '2 sin leer · 3 pendientes'),
    h('div', {className: 'flex flex-wrap items-center gap-1', 'aria-label': 'Acciones de notificaciones'},
      h('button', {key: 'prefs', type: 'button', className: ICON_ACTION, title: 'Preferencias'}, '⚙'),
      h('button', {key: 'all', type: 'button', className: `${ICON_ACTION} notification-action-icon is-confirm`, title: 'Marcar todas como leídas'}, '✓✓'),
      h('button', {key: 'refresh', type: 'button', className: ICON_ACTION, title: 'Actualizar'}, '↻'))),
  h('p', {className: 'whitespace-pre-wrap text-[12px] leading-[1.45] text-mute'}, 'Leer, resolver o reabrir cambia solo tu propia bandeja; no completa la pieza ni modifica el aviso de otras personas.'),
  h('div', {role: 'group', 'aria-label': 'Filtrar notificaciones', className: 'flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1'},
    ['Todas', 'Sin leer', 'Pendientes', 'Resueltas'].map((label, index) => h('button', {key: label, type: 'button', 'aria-pressed': index === 0, title: label, className: `inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${index === 0 ? 'bg-fono/15 text-fono-light' : 'text-mute'}`}, label))),
  h('div', {className: 'grid gap-2'}, NOTICES.map(noticeCard)),
  h(Button, {variant: 'outline'}, 'Ver avisos anteriores'));

/* ── Suscripción (app/subscription-panel.tsx) ─────────────────────────────── */
const SUB_STATUS = 'subscription-status subscription-status--trialing grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-l-[3px] border-fono/30 bg-fono/10 p-4 text-fono-light max-md:grid-cols-1';
const SUB_BADGE = 'subscription-badge inline-flex min-h-6 items-center rounded-full border border-current/30 px-2 py-0.5 text-[11px] font-bold leading-tight [white-space:nowrap]';
const SUB_DATE = 'grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2';
const SUB_DT = 'text-[11px] font-bold uppercase tracking-[.035em] text-mute';
const SUB_DD = 'text-sm font-bold tabular-nums text-fore';
const SUB_PRIMARY = 'subscription-primary inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg border border-fono bg-fono px-4 py-2 text-center text-[13px] font-bold leading-5 text-onbrand [overflow-wrap:anywhere]';
const SUB_SECONDARY = 'subscription-secondary inline-flex min-h-11 min-w-11 max-w-full items-center justify-center gap-2 whitespace-normal rounded-lg border border-ink-600 bg-ink-800 px-4 py-2 text-center text-[13px] font-bold leading-5 text-fore [overflow-wrap:anywhere] max-md:w-full';

const suscripcion = h('section', {className: 'subscription-panel min-w-0 max-w-full [overflow-wrap:anywhere]'},
  h('div', {className: 'grid gap-4'},
    h('header', {className: SUB_STATUS},
      h('span', {className: SUB_BADGE, role: 'status'}, 'Estado actual'),
      h('div', {className: 'grid min-w-0 gap-1'},
        h('h3', {className: 'text-[17px] font-semibold tracking-tight'}, 'Prueba gratuita'),
        h('p', {className: 'text-[13px] leading-[1.5]'}, '30 días gratis. 30 días de prueba restantes.'))),
    h('dl', {className: 'subscription-dates grid gap-2 sm:grid-cols-2 xl:grid-cols-3', 'aria-label': 'Fechas de la suscripción'},
      h('div', {className: SUB_DATE, key: 'plan'}, h('dt', {className: SUB_DT}, 'Plan'), h('dd', {className: SUB_DD}, 'USD 10/mes')),
      h('div', {className: SUB_DATE, key: 'trial'}, h('dt', {className: SUB_DT}, 'Fin de prueba'), h('dd', {className: SUB_DD}, '10 oct 26')),
      h('div', {className: SUB_DATE, key: 'due'}, h('dt', {className: SUB_DT}, 'Vencimiento'), h('dd', {className: SUB_DD}, '10 oct 26')),
      h('div', {className: SUB_DATE, key: 'days'}, h('dt', {className: SUB_DT}, 'Días para vencer'), h('dd', {className: SUB_DD}, 'Faltan 30 días'))),
    h('div', {className: 'subscription-explainer grid gap-1 border-l-2 border-ink-600 pl-3 text-[13px] leading-[1.5] text-mute'},
      h('p', null, h('strong', {className: 'text-fore'}, 'Después de los 30 días gratis: US$ 10 o Gs. 50.000 por mes, por agencia'), '. Son precios de lanzamiento por moneda, no una conversión.'),
      h('p', null, h('strong', {className: 'text-fore'}, 'Beneficio para clientes fundadores.'), ' El precio puede cambiar en el futuro y conservarás una tarifa preferencial.'),
      h('p', null, 'Todos los integrantes y todos los módulos están incluidos. No hay cobro por usuario. Los permisos de cada rol se mantienen: el plan no amplía los accesos de los integrantes.'),
      h('p', null, 'Hay 2 días de gracia; desde el tercer día se suspende el acceso sin borrar tus datos.')),
    h('fieldset', {className: 'subscription-currency grid min-w-0 gap-2'},
      h('legend', {className: 'p-0 text-xs font-bold text-fore'}, 'Moneda mensual'),
      h('div', {className: 'subscription-currency-segments grid grid-cols-[repeat(2,minmax(0,1fr))] gap-1 rounded-[10px] border border-ink-600 bg-ink-700 p-1'},
        [['USD 10/mes', true], ['Gs. 50.000/mes', false]].map(([label, on]) => h('label', {key: String(label), 'data-selected': on || undefined, className: `flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2.5 py-2 text-center text-[13px] font-bold leading-[1.3] ${on ? 'bg-fono/15 text-fono-light' : 'text-mute'}`}, h('span', null, label)))),
      h('small', {className: 'text-xs leading-[1.45] text-mute'}, 'La moneda elegida al registrar la empresa queda fija para esta suscripción.')),
    h('div', {className: 'subscription-manual grid gap-3 rounded-lg border border-ink-600 bg-ink-700 p-3'},
      h('p', null, h('strong', {className: 'text-fore'}, 'Activación con pago coordinado.'), ' El cobro en línea no está disponible en esta instalación, pero podés activar la suscripción igual:'),
      h('ol', {className: 'subscription-manual-steps grid list-decimal gap-1 pl-5 text-[13px] leading-[1.5]'},
        h('li', null, 'Si tenés un cupón, canjealo en Configuración → Cupones.'),
        h('li', null, 'Transferí el monto del plan a la cuenta de Scale OS.'),
        h('li', null, 'Enviá el comprobante por WhatsApp.')),
      h('dl', {className: 'subscription-transfer grid gap-1 rounded-lg border border-ink-600 bg-ink-800 p-3', 'aria-label': 'Datos para la transferencia'},
        [['Titular', 'SCALE STRATEGY GROUP E.A.S.', false], ['RUC', '80168807-8', true], ['Banco', 'Banco Continental · Caja de ahorro en guaraníes', false], ['Cuenta', '310056630007', true]].map(([label, value, code]) => h('div', {key: String(label), className: 'flex items-baseline justify-between gap-3'},
          h('dt', {className: 'shrink-0 text-xs text-mute'}, label),
          h('dd', {className: `min-w-0 text-right text-[12.5px] font-semibold tabular-nums ${code ? 'subscription-transfer-code whitespace-nowrap' : '[overflow-wrap:anywhere]'}`}, value)))),
      h('a', {className: `${SUB_PRIMARY} subscription-manual-link no-underline`, href: 'https://wa.me/595993391354'}, 'Enviar comprobante por WhatsApp')),
    h('div', {className: 'subscription-refresh mt-3 flex justify-start'}, h('button', {type: 'button', className: SUB_SECONDARY}, 'Actualizar estado'))));

/* ── Zona de peligro (app/deletion-danger-zone.tsx) ───────────────────────── */
const DEL_FLOW = 'grid min-w-0 gap-3 rounded-xl border border-bad/25 bg-ink-800 p-4 shadow-xs';
const DEL_DETAILS = 'grid gap-3 rounded-lg border border-ink-600 bg-ink-700 p-3';
const DEL_STEP = 'flex items-start gap-3 pt-1';
const DEL_MARK = 'grid size-6 shrink-0 place-items-center rounded-full bg-bad/15 text-[11px] font-extrabold text-bad';
const DEL_INPUT = 'h-11 w-full min-w-0 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none md:text-sm';
const DEL_ALERT = 'm-0 rounded-lg border-l-[3px] border-bad bg-bad/10 p-3 text-xs leading-5 text-fore';

const peligro = h('section', {className: 'grid gap-4'},
  h('div', {className: 'grid items-start gap-3 lg:grid-cols-2'},
    h('article', {className: DEL_FLOW, 'aria-labelledby': 'org-title'},
      h('div', {className: 'flex items-start gap-3'},
        h('span', {className: 'grid size-10 shrink-0 place-items-center rounded-lg bg-bad/15 text-bad', 'aria-hidden': 'true'}, '⛔'),
        h('div', null,
          h('h3', {id: 'org-title', className: 'text-[15px] font-semibold text-fore'}, 'Eliminar esta empresa'),
          h('p', {className: 'mt-1 text-xs leading-5 text-mute'}, 'Esta acción es irreversible: la empresa se desactivará, todos perderán acceso y sus datos quedarán inaccesibles.'))),
      h('div', {className: DEL_STEP},
        h('span', {className: DEL_MARK}, '1'),
        h('div', {className: 'grid gap-0.5'}, h('strong', {className: 'text-[13px] text-fore'}, 'Revisá la vista previa del servidor'), h('small', {className: 'text-[11px] leading-[1.45] text-mute'}, 'Válida hasta 14:32.'))),
      h('div', {className: DEL_DETAILS},
        h('h4', {className: 'text-[13px] font-semibold text-fore'}, 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima'),
        h('p', {className: 'm-0 text-xs leading-[1.45] text-mute'}, '3 miembros activos según la vista previa del servidor.'),
        h('ul', {className: 'grid list-disc gap-1.5 pl-5 text-xs leading-[1.45] text-mute'},
          h('li', null, 'La empresa se desactivará; sus datos quedarán inaccesibles.'),
          h('li', null, 'Se desactivará el acceso de todos sus miembros.'),
          h('li', null, 'Se cerrarán las sesiones vinculadas a esta empresa.'),
          h('li', null, 'Los datos de la empresa se conservarán.'))),
      h('p', {className: DEL_ALERT, role: 'alert'}, 'No se pudo completar la operación.'),
      h('div', {className: DEL_STEP},
        h('span', {className: DEL_MARK}, '2'),
        h('div', {className: 'grid gap-0.5'}, h('strong', {className: 'text-[13px] text-fore'}, 'Confirmá tu identidad'), h('small', {className: 'text-[11px] leading-[1.45] text-mute'}, 'La verificación queda vinculada únicamente a esta vista previa.'))),
      h('div', {className: 'deletion-auth-form'},
        h('div', {className: 'grid gap-2'},
          h('label', {className: 'block text-xs font-bold text-fore', htmlFor: 'del-pass'}, 'Contraseña actual'),
          h('div', {className: 'deletion-inline-field grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 max-md:grid-cols-1'},
            h('input', {id: 'del-pass', type: 'password', className: DEL_INPUT, readOnly: true, value: 'secreto'}),
            h('button', {type: 'button', className: 'secondary max-md:w-full'}, 'Verificar contraseña')))),
      h('div', {className: DEL_STEP},
        h('span', {className: DEL_MARK}, '3'),
        h('div', {className: 'grid gap-0.5'}, h('strong', {className: 'text-[13px] text-fore'}, 'Escribí la confirmación exacta'), h('small', {className: 'text-[11px] leading-[1.45] text-mute'}, 'El botón final solo se habilita cuando el texto coincide.'))),
      h('div', {className: 'deletion-confirm-form'},
        h('div', {className: 'grid gap-2'},
          h('label', {className: 'block text-xs font-bold text-fore', htmlFor: 'del-confirm'}, 'Escribí ', h('strong', null, 'Eliminar')),
          h('input', {id: 'del-confirm', className: DEL_INPUT, readOnly: true, value: 'Eliminar', autoComplete: 'off'}),
          h('small', {className: 'block text-[11px] text-mute'}, 'Se respetan mayúsculas, espacios y acentos.'),
          h('button', {type: 'button', className: 'danger deletion-execute inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-lg bg-bad px-3.5 text-[13px] font-bold text-onbrand max-md:w-full'}, 'Eliminar esta empresa')))),
    h('article', {className: `${DEL_FLOW} deletion-demo-simulation`, 'aria-labelledby': 'demo-exit-title'},
      h('div', {className: 'flex items-start gap-3'},
        h('span', {className: 'grid size-10 shrink-0 place-items-center rounded-lg bg-warn/15 text-warn', 'aria-hidden': 'true'}, '⚠'),
        h('div', null,
          h('h3', {id: 'demo-exit-title', className: 'text-[15px] font-semibold text-fore'}, 'Salir del Demo'),
          h('p', {className: 'mt-1 text-xs leading-5 text-mute'}, 'El Demo no elimina cuentas ni empresas. Salir borra el estado local, cierra la sesión de simulación y vuelve al inicio público.'))),
      h('button', {type: 'button', className: 'secondary justify-self-start max-md:w-full'}, 'Salir y reiniciar simulación'))));

/* ── Diálogos de PLT dentro de la superficie modal (dialog.css) ───────────── */
const DIALOG = (id, title, body) => h('div', {className: 'ops-overlay'},
  h('section', {className: 'ops-dialog unified-dialog', 'data-dialog-size': 'default', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id, tabIndex: -1},
    h('div', {className: 'dialog-heading'}, h('h2', {id}, title), h('button', {className: 'icon-button', type: 'button', title: 'Cerrar', 'aria-label': 'Cerrar'}, '✕')),
    h('div', {className: 'dialog-body'}, body),
    h('div', {className: 'dialog-footer'}, h('div', {className: 'dialog-actions'}, h('button', {className: 'secondary', type: 'button'}, 'Cancelar'), h('button', {className: 'primary ops-wide', type: 'button'}, 'Eliminar definitivamente')))));

const confirmacion = DIALOG('confirm-title', 'Eliminar agencia', h('div', {className: 'grid gap-3'},
  h('p', {className: 'text-sm text-mute'}, 'Se eliminará la agencia Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima con todos sus datos. Esta acción es irreversible.'),
  h('label', {className: 'platform-admin-confirm grid gap-2 text-[12px] font-semibold text-mute'}, 'Escribí ', h('strong', null, 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima'), ' para confirmar', h('input', {className: 'h-11 rounded-lg border border-ink-500 bg-ink-800 px-3', readOnly: true, value: ''})),
  h('label', {className: 'platform-admin-confirm grid gap-2 text-[12px] font-semibold text-mute'}, 'Confirmá tu identidad con tu contraseña actual', h('input', {type: 'password', className: 'h-11 rounded-lg border border-ink-500 bg-ink-800 px-3', readOnly: true, value: 'secreto'})),
  h('button', {type: 'button', className: 'text-button'}, 'No tengo contraseña (usar código por correo)')));

const bandejaDialogo = DIALOG('inbox-title', 'Notificaciones', bandeja);

export default [
  {
    id: 'v2-notificaciones',
    section: 'Notificaciones',
    surface: 'Bandeja de notificaciones v2',
    kind: 'plain',
    body: renderToStaticMarkup(bandeja),
  },
  {
    id: 'v2-notificaciones-dialogo',
    section: 'Notificaciones',
    surface: 'Bandeja dentro del diálogo v2',
    kind: 'plain',
    body: renderToStaticMarkup(bandejaDialogo),
  },
  {
    id: 'v2-superadmin-confirmar',
    section: 'Superadmin',
    surface: 'Confirmación destructiva en diálogo v2',
    kind: 'plain',
    body: renderToStaticMarkup(confirmacion),
  },
  {
    id: 'v2-suscripcion',
    section: 'Configuración',
    surface: 'Panel de suscripción v2',
    kind: 'workspace',
    body: renderToStaticMarkup(suscripcion),
  },
  {
    id: 'v2-peligro',
    section: 'Configuración',
    surface: 'Zona de peligro v2',
    kind: 'workspace',
    body: renderToStaticMarkup(peligro),
  },
];
