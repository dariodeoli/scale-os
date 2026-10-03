/*
 * Fixtures de la ronda 03-10 (SOS-DSN): estados de #147 y adopciones de #135.
 *
 * Fidelidad:
 * - `al4-preview-cliente` espeja `ClientReviewPreview` y `PortalPreview`
 *   (app/daily-controls.tsx, app/manual.tsx) con sus clases reales
 *   (`data-preview="inert"`, `review-preview-badge`, `manual-portal-badge`).
 * - `al4-mis-datos` espeja el puente de `app/my-data.tsx` (derechos
 *   «Próximamente» + canal alternativo) con `StateChip` (Badge de la librería).
 * - `al4-empresa-unica` espeja la rama de una sola empresa de
 *   `CompanySelector` (app/operations.tsx): span explicativo, sin diálogo.
 * - `al4-bandeja-vacia` espeja el pie vacío de `app/notification-inbox.tsx`:
 *   una sola acción de refresco en el vacío y sólo Preferencias al pie.
 * - `al4-admin-denegado` espeja `PlatformAccessDenied` (app/superadmin/states.tsx)
 *   con el motivo real del API y el chip «Acceso denegado».
 * - `al4-ayuda-modulo` y `al4-paleta-comandos` renderizan los objetos reales de
 *   owncoding-ui v0.61.0 (`AyudaModulo`, `PaletaComandos`) abiertos.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge,PaletaComandos,AyudaModulo} from 'owncoding-ui';

const chip = (tone, text, title) => renderToStaticMarkup(React.createElement(Badge, {color: {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'}[tone], title, className: `whitespace-nowrap ${tone === 'mute' ? 'dark:text-fore' : ''}`}, text));

/* app/daily-controls.tsx — ClientReviewPreview (#147). */
const clientPreview = `
<div class="ops-stack">
 <button type="button" class="secondary"><span aria-hidden="true">👁</span> Ver como cliente</button>
 <section class="panel grid gap-3" aria-label="Vista previa del cliente">
  <p class="form-note">Así ve el cliente el enlace de revisión. <strong>Vista previa: no realiza acciones</strong>; no se envía nada ni cambia el estado de la pieza.</p>
  <article class="client-review-preview" data-preview="inert" aria-label="Vista previa de la revisión del cliente">
   <p class="review-preview-badge" role="note">Vista previa: no realiza acciones</p>
   <p class="review-eyebrow">REVISIÓN DE CONTENIDO</p>
   <h3>Reel de lanzamiento · Campaña de verano</h3>
   <p>Revisá la pieza y dejá tu respuesta. El archivo se abre en su servicio de origen.</p>
   <a class="secondary justify-self-start" href="#pieza">Abrir pieza</a>
   <label>Nombre completo<input disabled placeholder="Nombre y apellido" autocomplete="off"></label>
   <label>Comentarios o cambios<textarea disabled rows="3" placeholder="Qué te gustaría ajustar"></textarea></label>
   <div class="inline-actions review-preview-actions"><button class="primary" type="button" disabled aria-disabled="true">Aprobar esta versión</button><button class="secondary" type="button" disabled aria-disabled="true">Solicitar cambios</button></div>
   <p class="form-note">El enlace real vence a los siete días. El nombre declarado no equivale a una firma digital verificada.</p>
  </article>
 </section>
 <section class="panel grid gap-3" aria-label="Vista previa del manual">
  <div class="manual-portal-preview" data-preview="inert" aria-label="Vista previa del panel del cliente">
   <p class="manual-portal-badge" role="note">Vista previa: no realiza acciones</p>
   <header class="manual-portal-header"><span class="manual-portal-brand">🌐 Entrega para el cliente</span><span class="manual-portal-chip">Sin iniciar sesión</span></header>
   <h4>Reel de lanzamiento · Campaña de verano</h4>
   <p class="manual-portal-note">Tu agencia publicó esta pieza para tu revisión.</p>
   <div class="manual-portal-actions"><button class="primary" type="button" disabled aria-disabled="true">Aprobar esta versión</button><button class="secondary" type="button" disabled aria-disabled="true">Solicitar cambios</button></div>
  </div>
 </section>
</div>`;

/* app/my-data.tsx — derechos sin base técnica (#147). */
const misDatos = `
<section class="panel grid gap-3" aria-label="Mis datos · derechos">
 <p class="text-[11px] font-bold uppercase tracking-[.12em] text-mute">Ejercer tus derechos</p>
 <p class="text-[13px] leading-relaxed text-mute">Gratis y sin justificar el pedido. La respuesta llega dentro de 30 días corridos; acá ves el estado y el vencimiento de cada solicitud.</p>
 <ul class="grid gap-2" aria-label="Derechos con registro en preparación">
  ${['Acceso','Rectificación','Supresión','Oposición'].map(label => `<li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg border border-ink-600 px-3 py-2"><span class="text-[13px] text-mute">${label}</span>${chip('mute', 'Próximamente')}</li>`).join('\n  ')}
 </ul>
 <p class="text-[11.5px] leading-5 text-mute">Mientras la base técnica esté pendiente, estos pedidos se registran por el canal alternativo de arriba: el equipo los carga y podés seguirlos con tu referencia.</p>
 <div class="grid gap-2 rounded-lg border border-ink-600 bg-ink-900/40 p-3" data-testid="canal-derechos">
  <strong class="text-[12.5px] text-fore">Canal de derechos · respuesta dentro de 30 días corridos</strong>
  <div class="flex flex-wrap items-center gap-2 text-xs">
   <a class="secondary" href="#whatsapp">WhatsApp +595 993 391 354</a>
   <a class="secondary" href="#contacto">Formulario de contacto</a>
  </div>
 </div>
</section>`;

/* app/operations.tsx — CompanySelector con una sola empresa (#147). */
const empresaUnica = `
<div class="topbar flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2">
 <span class="workspace" title="Estás en Estudio Comunicación; no tenés otras empresas" aria-label="Empresa actual: Estudio Comunicación. No tenés otras empresas.">
  <span aria-hidden="true">🏢</span>
  <span class="company-name">Estudio Comunicación</span>
 </span>
 <span class="text-[11.5px] text-mute">El control deja de ser un disparador: no hay otras empresas para elegir.</span>
</div>`;

/* app/notification-inbox.tsx — bandeja vacía con una sola acción (#147). */
const bandejaVacia = `
<section class="panel grid max-w-md gap-3" aria-label="Bandeja vacía">
 <header class="flex items-center justify-between gap-2 border-b border-ink-600 pb-2">
  <p class="text-sm font-semibold text-fore">Avisos</p>
 </header>
 <div class="grid gap-2 rounded-xl border border-ink-600 p-4 text-center">
  <strong class="text-sm text-fore">No tenés avisos</strong>
  <p class="text-xs leading-5 text-mute">Acá aparecerán tus avisos de asignaciones, comentarios y entregas.</p>
  <button type="button" class="secondary mx-auto">Actualizar</button>
 </div>
 <div class="grid gap-2 border-t border-ink-600 pt-2">
  <p role="status" class="px-1 text-[11px] tabular-nums text-mute">0 pendientes</p>
  <div class="flex flex-wrap items-center gap-1" aria-label="Acciones de notificaciones">
   <button type="button" class="icon-button !h-11 !w-11" title="Preferencias" aria-label="Abrir preferencias de notificaciones">⚙</button>
  </div>
 </div>
</section>`;

/* app/superadmin/states.tsx — acceso denegado con motivo (#147). */
const adminDenegado = `
<section class="grid gap-3" aria-label="Panel global · acceso denegado">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <h1>Control de Scale OS</h1>
  <div class="flex items-center gap-2">${chip('bad', 'Acceso denegado')}</div>
 </div>
 <section class="panel grid grid-cols-[auto_minmax(0,1fr)] gap-3 border-bad/30" role="alert">
  <span class="grid h-9 w-9 place-items-center rounded-full bg-bad/15 text-bad" aria-hidden="true">⛨</span>
  <div class="min-w-0">
   <b class="block text-[13.5px] font-semibold text-fore">No tenés acceso global</b>
   <p class="mt-0.5 text-xs text-mute">Tu cuenta de demo no tiene acceso al panel global de la plataforma.</p>
   <a class="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" href="#panel">← Volver al panel</a>
  </div>
 </section>
 <p class="form-note">Sin chip de rol ni botón Actualizar: el acceso está denegado, no «en solo lectura».</p>
</section>`;

/* owncoding-ui v0.61.0 — objetos reales abiertos (#135 P2). */
const ayudaModulo = renderToStaticMarkup(React.createElement(AyudaModulo, {
  titulo: 'Clientes',
  resumen: 'El directorio completo: datos, estado del servicio y vínculos con trabajo y cobros.',
  puntos: ['La ficha reúne contactos, proyectos, presupuestos y cobros según tu rol.', 'Los datos sensibles se enmascaran para quien no tiene permiso.', 'Podés alternar entre lista y cuadrícula sin perder información.'],
  enlaces: [{href: '/status', etiqueta: 'Estado del sistema'}, {href: '/privacidad', etiqueta: 'Privacidad y derechos'}],
  etiquetaBoton: 'Guía del panel',
  abierta: true,
  onCerrar() {},
}));

const paletaComandos = renderToStaticMarkup(React.createElement(PaletaComandos, {
  boton: true,
  textoBoton: 'Buscar cliente, proyecto u orden',
  titulo: 'Buscar en esta empresa',
  placeholder: 'Nombre, cliente, proyecto o acción…',
  etiquetasTipo: {accion: 'Acciones', ir: 'Ir a', cliente: 'Clientes', proyecto: 'Proyectos', pieza: 'Producción'},
  minimo: 2,
  descripcionVacio: 'No encontramos nada para esa búsqueda. Probá con el nombre de un cliente, un proyecto, una pieza o un módulo.',
  buscar: () => [],
  onElegir() {},
  abierta: true,
}));

export default [
  {
    id: 'al4-preview-cliente',
    section: 'Clientes',
    surface: 'Preview de cliente inerte: sin CTA primario y con badge (#147)',
    kind: 'workspace',
    body: clientPreview,
  },
  {
    id: 'al4-mis-datos',
    section: 'Privacidad',
    surface: 'Mis datos: derechos «Próximamente» y canal real (#147)',
    kind: 'workspace',
    body: misDatos,
  },
  {
    id: 'al4-empresa-unica',
    section: 'Panel',
    surface: 'Selector de empresa con una sola empresa accesible (#147)',
    kind: 'workspace',
    body: empresaUnica,
  },
  {
    id: 'al4-bandeja-vacia',
    section: 'Notificaciones',
    surface: 'Bandeja vacía: un solo refresco y sin filtros apilados (#147)',
    kind: 'workspace',
    body: bandejaVacia,
  },
  {
    id: 'al4-admin-denegado',
    section: 'Superadmin',
    surface: 'Panel global con acceso denegado y motivo real (#147)',
    kind: 'workspace',
    body: adminDenegado,
  },
  {
    id: 'al4-ayuda-modulo',
    section: 'Sistema de diseño',
    surface: 'AyudaModulo de la biblioteca v0.61.0 abierta (#135 P2)',
    kind: 'workspace',
    body: ayudaModulo,
  },
  {
    id: 'al4-paleta-comandos',
    section: 'Sistema de diseño',
    surface: 'PaletaComandos de la biblioteca v0.61.0 abierta (#135 P2)',
    kind: 'workspace',
    body: paletaComandos,
  },
];
