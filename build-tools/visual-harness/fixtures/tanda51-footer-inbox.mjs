/*
 * Tanda owncoding-ui v0.51.0 — evidencia de #82 (pie institucional) y #83
 * (bandeja oficial).
 *
 * - El pie NO es una copia: se renderiza el objeto real, `ProductFooter` de
 *   owncoding-ui, con la identidad de Scale OS (app/workspace-footer.tsx es el
 *   puente de la app).
 * - La bandeja abierta espeja `owncoding-ui/src/components/CampanaAvisos.jsx`
 *   (botón, panel y aviso) con el mapeo de `app/notification-inbox.tsx`
 *   (`avisoDeNotificacion`) sobre datos de estrés: título largo, detalle de una
 *   línea y fecha ya formateada.
 * - Los marcos (acceso, portal, panel) espejan app/access-layout.tsx,
 *   app/cliente/{layout,portal.css} y app/scale-workspace.tsx.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ProductFooter, EmptyState, Icon} from 'owncoding-ui';

const VERSION = '1.0.144';
const icon = (name, className) => renderToStaticMarkup(React.createElement(Icon, {name, className, 'aria-hidden': 'true'}));

const brand = `<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>`;

/** El pie real, tal como lo monta `app/workspace-footer.tsx`. */
const footer = () => renderToStaticMarkup(React.createElement(ProductFooter, {nombre: 'Scale OS', version: `v${VERSION}`, className: 'workspace-footer'}));

/* Campana + panel: `owncoding-ui/src/components/CampanaAvisos.jsx`. */
const bell = (sinLeer) => `
<button type="button" data-testid="campana-avisos" aria-label="Notificaciones" aria-haspopup="menu" aria-expanded="true" title="Notificaciones${sinLeer ? ` · ${sinLeer} sin leer` : ''}" class="relative grid h-9 w-9 place-items-center rounded-lg border border-ink-500 text-mute transition hover:border-fono hover:bg-fono/10 hover:text-fore">
 ${icon('bell', 'h-4 w-4')}
 ${sinLeer ? `<span class="absolute -right-1 -top-1 rounded-full bg-bad px-1 text-[10px] font-bold tabular-nums text-white dark:text-onbrand">${sinLeer > 99 ? '99+' : sinLeer}</span>` : ''}
</button>`;

const panel = ({avisos, sinLeer, pie}) => `
<div role="menu" aria-label="Avisos" class="absolute right-0 z-30 mt-1 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-ink-500 bg-ink shadow-float">
 <header class="flex items-center justify-between gap-2 border-b border-ink-600 px-3 py-2">
  <p class="text-sm font-semibold text-fore">Avisos</p>
  ${sinLeer ? `<span class="text-xs tabular-nums text-mute">${sinLeer > 99 ? '99+' : sinLeer} sin leer</span>` : ''}
 </header>
 <div class="max-h-80 overflow-y-auto p-1">${avisos}</div>
 ${pie ? `<div class="border-t border-ink-600 p-2">${pie}</div>` : ''}
</div>`;

const TONOS = {ok: 'bg-ok/15 text-ok-text', warn: 'bg-warn/15 text-warn-text', bad: 'bg-bad/15 text-bad-text', mute: 'bg-ink-700 text-mute', info: 'bg-info/15 text-info-text'};

/** Aviso según el contrato §16 mapeado por la app. */
const aviso = ({titulo, detalle, tono, fecha, icono, leido}) => `
<button type="button" role="menuitem" class="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-ink-700/60">
 <span class="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${TONOS[tono]}">${icon(icono, 'h-3.5 w-3.5')}</span>
 <span class="min-w-0 flex-1">
  <span class="block truncate text-sm ${leido ? 'font-medium text-fore' : 'font-semibold text-fore'}">${titulo}</span>
  ${detalle ? `<span class="mt-0.5 block text-xs leading-5 text-mute">${detalle}</span>` : ''}
  <span class="mt-1 block text-[10px] uppercase tracking-wide text-mute">${fecha}</span>
 </span>
</button>`;

/** Pie del panel: controles de la app (filtros, acciones y total del servidor). */
const bandejaPie = `
<div class="grid gap-2">
 <p role="status" class="px-1 text-[11px] tabular-nums text-mute">12 pendientes</p>
 <div role="group" aria-label="Filtrar notificaciones" class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1">
  <button type="button" aria-pressed="true" aria-label="Todas" title="Todas" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-fono/15 px-2 py-1.5 text-[11px] font-medium text-fono-text">Todas</button>
  <button type="button" aria-pressed="false" aria-label="Sin leer" title="Sin leer" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium text-mute">Sin leer</button>
  <button type="button" aria-pressed="false" aria-label="Pendientes" title="Pendientes" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium text-mute">Pendientes</button>
  <button type="button" aria-pressed="false" aria-label="Resueltas" title="Resueltas" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-medium text-mute">Resueltas</button>
 </div>
 <div class="flex flex-wrap items-center gap-1" aria-label="Acciones de notificaciones">
  <button type="button" class="icon-button !h-11 !w-11" title="Marcar todas como leídas" aria-label="Marcar todas las notificaciones como leídas">${icon('check', 'h-[18px] w-[18px]')}</button>
  <button type="button" class="icon-button !h-11 !w-11" title="Actualizar" aria-label="Actualizar notificaciones">${icon('refresh', 'h-[17px] w-[17px]')}</button>
  <button type="button" class="icon-button !h-11 !w-11" title="Preferencias" aria-label="Abrir preferencias de notificaciones">${icon('settings', 'h-[17px] w-[17px]')}</button>
 </div>
</div>`;

/** Vista previa del topbar: la campana vive junto a los controles del marco. */
const inboxPreview = (panelHtml) => `
<div class="p-4 pt-6">
 <div class="flex items-center justify-end gap-2 rounded-xl border border-ink-600 bg-ink-800/95 px-4 py-2">
  <span class="icon-button" aria-hidden="true">${icon('search', 'h-4 w-4')}</span>
  <div class="relative">${bell(panelHtml.sinLeer)}${panel(panelHtml)}</div>
 </div>
</div>`;

const avisos = [
  aviso({titulo: 'Te asignaron una pieza de Cooperativa Multiactiva de Servicios Múltiples Limitada', detalle: 'Video institucional · entrega el viernes 3 de octubre', tono: 'info', fecha: '11 sept 26 · 09:00', icono: 'user', leido: false}),
  aviso({titulo: 'Mención de Lucía en el comentario de la pieza «Spot radial 30s»', detalle: '¿Podés revisar el guion antes de la aprobación del cliente?', tono: 'info', fecha: '11 sept 26 · 08:12', icono: 'megaphone', leido: false}),
  aviso({titulo: 'Entrega pendiente hoy', detalle: 'Landing de lanzamiento · vence a las 18:00 (hora de Asunción).', tono: 'warn', fecha: '10 sept 26 · 18:40', icono: 'clock', leido: false}),
  aviso({titulo: 'Aviso resuelto', detalle: 'El cobro de la factura 0002-001-0000123 quedó registrado.', tono: 'ok', fecha: '9 sept 26 · 11:20', icono: 'check', leido: true}),
].join('');

const vacio = renderToStaticMarkup(React.createElement(EmptyState, {
  compact: true,
  icon: 'bell',
  title: 'No tenés avisos',
  description: 'Acá aparecerán tus avisos de asignaciones, comentarios y entregas.',
  action: React.createElement('button', {type: 'button', className: 'secondary', children: 'Actualizar'}),
}));

export default [
  {
    id: 'tanda51-panel-pie',
    section: 'Resumen',
    surface: 'Panel · pie institucional (#82)',
    kind: 'workspace',
    body: `
<div class="panel"><div class="panel-heading"><h2>Centro de control</h2><span>OPERACIÓN</span></div>
 <p class="form-note">El pie cierra el contenido del marco con la versión real publicada y el crédito del grupo: lo dibuja el objeto una sola vez.</p>
 <div class="ops-stack"><div class="ops-card"><b>Piezas en curso</b><p class="form-note">12 asignadas · 3 con entrega esta semana</p></div></div>
</div>
<div class="mt-auto pt-6">${footer()}</div>`,
  },
  {
    id: 'tanda51-acceso-pie',
    section: 'Acceso',
    surface: 'Registro · pie institucional (#82)',
    kind: 'plain',
    body: `
<main data-surface="acceso" class="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
 <div class="w-full min-w-0 max-w-[30rem]">
  <section aria-label="Registro" class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-2xl border border-ink-600 bg-ink-800 p-6 md:p-7">
   <header class="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
    <a class="inline-flex min-h-11 items-center gap-2" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio">${brand}</a>
    <p class="min-w-0 break-words font-mono text-[10px] uppercase tracking-[.13em] text-mute">REGISTRO · 30 DÍAS GRATIS</p>
   </header>
   <h1 class="text-2xl font-bold tracking-tight text-fore">Creá tu agencia</h1>
   <p class="text-sm leading-6 text-mute">Clientes, proyectos y operación en un solo lugar. La prueba empieza al completar el alta.</p>
   <label class="grid gap-2 text-xs font-semibold text-mute">Correo<input type="email" value="persona@ejemplo.com.py" readonly/></label>
   <button type="button" class="primary min-h-11">Crear mi cuenta</button>
   ${footer()}
  </section>
 </div>
</main>`,
  },
  {
    id: 'tanda51-portal-pie',
    section: 'Portal',
    surface: 'Portal del cliente · pie institucional (#82)',
    kind: 'plain',
    body: `
<div class="client-portal-shell">
 <main class="client-portal"><section class="client-portal-card narrow">
  <p class="portal-status">SCALE OS · PORTAL DEL CLIENTE</p>
  <h1>Ver entregables</h1>
  <p class="portal-muted">Ingresá con el correo y contraseña que configuraste al aceptar la invitación.</p>
  <form><label>Correo<input type="email" value="cliente@empresa.com.py" readonly/></label><button type="button">Ingresar</button></form>
 </section></main>
 ${footer()}
</div>`,
  },
  {
    id: 'tanda51-bandeja-avisos',
    section: 'Panel',
    surface: 'Bandeja oficial con avisos (#83)',
    kind: 'plain',
    body: inboxPreview({avisos, sinLeer: 3, pie: bandejaPie}),
  },
  {
    id: 'tanda51-bandeja-vacia',
    section: 'Panel',
    surface: 'Bandeja vacía con acción (#83)',
    kind: 'plain',
    body: inboxPreview({avisos: vacio, sinLeer: 0, pie: bandejaPie}),
  },
];
