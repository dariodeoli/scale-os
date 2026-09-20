/*
 * Fixtures: primitivas del sistema de diseño (SOS-DSN).
 *
 * Each fixture mirrors the real JSX (file + line range cited above every block)
 * and stresses the primitives with long identities, big amounts, long serials
 * and long free text. No lists/grids are declared unless the rows are real.
 *
 * Dialog fixtures render the portal content inline (app/dialog.tsx keeps the
 * overlay fixed/portalized for the real app; app/dialog.css owns that geometry:
 * `position:fixed` + grid centering and the anchored mobile sheet at ≤540 px).
 * The `<style>` block below is the same kind of harness stabilization as run.mjs
 * overrides: without it, three fixed overlays render on top of each other and of
 * the other fixtures, which is not what is being measured. Everything inside the
 * dialog is untouched.
 */

/* lucide-react stand-ins (same shapes/sizes the components render). */
const iconX = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const iconChevron = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
const iconSearch = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
const iconEye = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></svg>';
const iconPencil = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 5 4 4L8 20l-5 1 1-5Z"/></svg>';
const iconTrash = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>';
const iconPlus = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
const iconWhatsapp = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Z"/></svg>';
const iconCheck14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 5 5L20 6"/></svg>';
const iconX14 = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const iconBanknote = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>';
const money = (value, currency) => new Intl.NumberFormat('es-PY', {style: 'currency', currency, maximumFractionDigits: currency === 'PYG' ? 0 : 2}).format(Number(value));

const DIALOG_STABILIZE = `<style>
[data-fixture^="primitivas-"] .ops-overlay{position:static;inset:auto;z-index:auto;height:auto;min-height:0;overflow:visible}
</style>`;

/* app/person-container.tsx lines 14-27 + person-container.css */
const personContainer = ({name, initials, secondary = '', size = 'md'}) => `
<span class="person-container person-container-${size}"><span class="person-container-avatar" aria-hidden="true">${initials}</span><span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span>${secondary ? `<span class="person-container-secondary" title="${secondary}">${secondary}</span>` : ''}</span></span>`;

/* app/actor-identity.tsx lines 16-27 + actor-identity.css */
const actorIdentity = ({name, initials, time = null, imported = false}) => `
<span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${initials}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${name}">${name}</span>${time ? `<time class="actor-identity-time" datetime="${time.iso}">${time.label}</time>` : ''}${imported ? '<span class="actor-identity-source">Autor de registro importado</span>' : ''}</span></span>`;

const LONG_CLIENT = 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima';
const LONG_EMAIL = 'administracion.facturacion@estudiocomunicacionparaguay.com.py';

/* ==================================================================== */
/* 1. Editor fields — app/operations.tsx Editor renderField (lines 119-133),
 *    form wrapper (134-177), FormActions and .dialog-footer (dialog.tsx). */
const editorFields = `
<div>
 <label for="pf-title"><span>Título</span><input id="pf-title" type="text" value="Campaña integral de lanzamiento con producción audiovisual, cobertura de redes y activaciones en Asunción y Central"></label>
</div>
<div>
 <label for="pf-client"><span>Cliente</span><input id="pf-client" type="text" value="" aria-invalid="true" aria-describedby="pf-client-error"></label>
 <small id="pf-client-error" class="error" role="alert">Completá cliente</small>
</div>
<div>
 <label for="pf-due"><span>Entrega</span><input id="pf-due" type="date" value="2026-11-30"></label>
</div>
<div>
 <label for="pf-due-time"><span>Hora de entrega</span><input id="pf-due-time" type="time" value="14:30"></label>
</div>
<div>
 <label for="pf-hours"><span>Horas estimadas</span><input id="pf-hours" inputmode="decimal" type="number" step="0.01" value="148.5"></label>
</div>
<div>
 <label for="pf-progress"><span>Avance</span><input id="pf-progress" inputmode="numeric" type="number" step="1" value="100" aria-describedby="pf-progress-help"></label>
 <small id="pf-progress-help" class="field-help">Entero de 0 a 100 (%). No se guardan decimales.</small>
</div>
<div>
 <div class="ops-select">
  <span class="ops-label" id="pf-type-label">Tipo de trabajo</span>
  <button type="button" class="ops-select-trigger" title="Producción audiovisual con cobertura de eventos y postproducción" aria-invalid="true" aria-describedby="pf-type-error" aria-labelledby="pf-type-label pf-type-value" aria-haspopup="listbox" aria-expanded="false"><span id="pf-type-value">Producción audiovisual con cobertura de eventos y postproducción</span>${iconChevron}</button>
 </div>
 <small id="pf-type-error" class="error" role="alert">Elegí un tipo de trabajo</small>
</div>
<div>
 <div class="ops-select">
  <span class="ops-label" id="pf-stage-label">Etapa</span>
  <button type="button" class="ops-select-trigger" title="Seleccionar…" disabled aria-labelledby="pf-stage-label pf-stage-value" aria-haspopup="listbox" aria-expanded="false"><span id="pf-stage-value">Seleccionar…</span>${iconChevron}</button>
 </div>
</div>`;

/* Money, phone, email and password fields (same renderField branch). */
const monedaFields = `
<div>
 <label for="pf-budget"><span>Presupuesto</span><span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input id="pf-budget" type="text" inputmode="numeric" autocomplete="off" value="1.234.567.890" placeholder="1.000.000"></span></label>
</div>
<div>
 <label for="pf-balance"><span>Saldo en dólares</span><span class="amount-field" data-currency="USD"><span class="amount-currency" aria-hidden="true">US$</span><input id="pf-balance" type="text" inputmode="decimal" autocomplete="off" value="12.345,67" placeholder="1.250,50"></span></label>
</div>
<div>
 <label for="pf-phone"><span>Teléfono</span><span class="phone-input"><select aria-label="Código de país"><option value="+595">🇵🇾 +595</option><option value="+55">🇧🇷 +55</option><option value="+54">🇦🇷 +54</option><option value="+1">🇺🇸 +1</option><option value="+34">🇪🇸 +34</option></select><input id="pf-phone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="981 123 456" maxlength="18" value="981123456"></span></label>
</div>
<div>
 <label for="pf-email"><span>Correo</span><input id="pf-email" type="email" inputmode="email" autocomplete="email" maxlength="200" placeholder="nombre@dominio.com" value="${LONG_EMAIL}"></label>
</div>
<div>
 <label for="pf-access"><span>Contraseña de acceso<span class="field-optional"> · Opcional</span></span><span class="password-field-control"><input id="pf-access" name="password" type="password" value="clave-larga-de-acceso" autocomplete="new-password" maxlength="128"><button type="button" class="password-visibility" title="Mostrar contraseña" aria-label="Mostrar contraseña" aria-pressed="false">${iconEye}</button></span></label>
</div>`;

/* Lookup, textarea, disclosure and form-level error. */
const textoFields = `
<div>
 <label for="pf-ruc"><span>RUC</span><span class="ops-lookup-row"><input id="pf-ruc" type="text" value="80012345-6"><button type="button" class="text-button ops-lookup-button" disabled>Buscando…</button></span></label>
 <small class="field-help ops-lookup-note" role="status">Datos encontrados. Revisá y guardá.</small>
</div>
<div class="ops-wide">
 <label for="pf-notes"><span>Descripción y notas</span><textarea id="pf-notes" maxlength="2000" aria-describedby="pf-notes-help">Campaña de lanzamiento con tres piezas audiovisuales, cobertura fotográfica de dos jornadas, placas para redes y una activación en Asunción. El cliente pide versiones en guaraní para radio y un corte vertical para redes; la entrega incluye máster, subtítulos y proyecto editable. Se acordó con producción que la locución se graba en estudio propio y que el material crudo se archiva 90 días.</textarea></label>
 <small id="pf-notes-help" class="field-help">Máximo 2000 caracteres. Sin máscaras: se guarda el texto tal cual se escribe.</small>
</div>
<details class="ops-profile-section ops-wide" open>
 <summary>Qué se comisiona</summary>
 <div class="ops-form-grid">
  <div>
   <label for="pf-beneficiary"><span>Beneficiario</span><input id="pf-beneficiary" type="text" value="María Fernanda González de la Cruz"></label>
  </div>
  <div>
   <div class="ops-select">
    <span class="ops-label" id="pf-basis-label">Cálculo</span>
    <button type="button" class="ops-select-trigger" title="% facturado sobre el total del contrato" aria-labelledby="pf-basis-label pf-basis-value" aria-haspopup="listbox" aria-expanded="false"><span id="pf-basis-value">% facturado sobre el total del contrato</span>${iconChevron}</button>
   </div>
  </div>
 </div>
</details>
<p class="error form-error-summary ops-wide" role="alert">No se pudo guardar: el proveedor de correo rechazó la invitación. Revisá el dominio del cliente y volvé a intentar.</p>`;

/* ==================================================================== */
/* 2. Modal dialog — dialog.tsx lines 96-112 (portal, overlay, data-dialog-size,
 *    aria-busy); body mirrors the ProjectComments dialog (operations.tsx lines
 *    1059-1085) plus the Footer actions from FormActions/SaveActions
 *    (dialog.tsx 116-124). */
const commentOne = `
<article class="ops-comment">
 ${actorIdentity({name: 'María Fernanda González de la Cruz', initials: 'MC', time: {iso: '2026-09-18T14:30:00.000Z', label: '18 sept 26 · 10:30'}})}
 <p class="comment-body">Actualicé el cronograma con las dos jornadas de rodaje y dejé el corte de 60 segundos para revisión de <mark class="comment-mention">@Juan Carlos Benítez</mark>. El brief aprobado está en <a href="https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j" target="_blank" rel="noreferrer">drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0j</a>.</p>
</article>`;
const commentTwo = `
<article class="ops-comment">
 ${actorIdentity({name: 'Autor de Trello importado sin cuenta en Scale OS', initials: 'AT', time: {iso: '2025-11-03T11:05:00.000Z', label: '03 nov 25 · 08:05'}, imported: true})}
 <p class="comment-body">Importado del tablero viejo: “Pendiente de aprobación del cliente para la versión en guaraní. Adjunto el enlace al material crudo y el detalle de los costos de locución”.</p>
</article>`;

const dialogFixture = {
  id: 'primitivas-dialogo',
  section: 'Sistema de diseño',
  surface: 'Diálogo modal con lista y acciones',
  kind: 'plain',
  body: `${DIALOG_STABILIZE}
<div class="ops-overlay">
 <section class="ops-dialog unified-dialog" data-dialog-size="default" role="dialog" aria-modal="true" aria-busy="true" aria-labelledby="dlg-title" tabindex="-1">
  <div class="dialog-heading"><h2 id="dlg-title">Seguimiento · ${LONG_CLIENT}</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar" disabled>${iconX}</button></div>
  <div class="dialog-body">
   <div class="ops-comments">${commentOne}${commentTwo}
    <p class="empty-copy">Todavía no hay comentarios. Dejá el próximo paso o una actualización.</p>
   </div>
   <form class="comment-composer">
    <label>Comentario<textarea placeholder="Escribí una actualización. Usá @ para mencionar a alguien." disabled></textarea></label>
    <fieldset class="comment-link-fields"><legend>Enlace con nombre</legend><label>Nombre visible<input value="Brief aprobado por el cliente" maxlength="120" disabled></label><label>URL HTTPS<input value="https://drive.google.com/drive/folders/9z8y7x6w5v4u" type="url" inputmode="url" disabled></label><button type="button" class="secondary" disabled>Agregar enlace</button></fieldset>
    <div class="inline-actions"><small class="form-note">Enter agrega la mención elegida · Shift + Enter crea una línea.</small><button class="primary" disabled type="submit">Publicando…</button></div>
    <p class="error" role="alert">No se pudo completar la operación: el servicio de correo devolvió un error al notificar a los responsables.</p>
   </form>
  </div>
  <div class="dialog-footer"><div class="dialog-actions"><button class="secondary" type="button" disabled>Cancelar</button><button class="primary ops-wide" type="submit" disabled>Guardando…</button></div></div>
 </section>
</div>`,
};

/* ==================================================================== */
/* 3. Drawer sheet — dialog.tsx variant="drawer" + productivity-ui.tsx
 *    ClientDetail (lines 127-146): resumen comercial, quick actions,
 *    .drawer-list con encabezado y filas reales. */
const drawerFixture = {
  id: 'primitivas-dialogo-drawer',
  section: 'Sistema de diseño',
  surface: 'Hoja lateral con lista de registros',
  kind: 'plain',
  lists: [
    {
      container: '.drawer-list',
      head: '.drawer-list-head',
      row: '.drawer-list .activity-line',
      label: 'Ficha lateral · lista de registros',
      template: '--drawer-cols',
    },
  ],
  body: `${DIALOG_STABILIZE}
<div class="ops-overlay detail-drawer-overlay">
 <section class="ops-dialog unified-dialog" data-dialog-size="default" role="dialog" aria-modal="true" aria-labelledby="drw-title" tabindex="-1">
  <div class="dialog-heading"><h2 id="drw-title">${LONG_CLIENT}</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${iconX}</button></div>
  <div class="dialog-body">
   <p>${LONG_EMAIL} · +595 981 123 456</p>
   <a class="text-button whatsapp-button client-whatsapp" href="https://wa.me/595981123456" target="_blank" rel="noopener noreferrer"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Z"/></svg>WhatsApp</a>
   <p>Contrato anual con renovación automática. Facturación el día 5 de cada mes; los traslados fuera de Asunción se presupuestan aparte.</p>
   <section class="client-summary" aria-label="Resumen comercial del cliente">
    <div class="client-summary-grid">
     <article><span>Estado del servicio</span><strong>Activo</strong></article>
     <article><span>Cobros</span><strong>23 días de mora</strong><small title="Pendiente Gs 1.234.567.890">Pendiente Gs 1.234.567.890</small></article>
     <article><span>Plan</span><strong title="Plan integral de comunicación con producción audiovisual y pauta">Plan integral de comunicación con producción audiovisual y pauta</strong></article>
     <article><span>Pago mensual</span><strong title="USD 12.345,67">USD 12.345,67</strong></article>
     <article><span>Recurrencia</span><strong>Mensual</strong></article>
     <article><span>Cliente desde</span><strong>34 meses</strong><small>18 nov 23</small></article>
     <article><span>Factura</span><strong>Pide factura</strong></article>
     <article><span>RUC</span><strong title="80012345-6">80012345-6</strong><small title="Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.">Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.</small></article>
    </div>
   </section>
   <div class="quick-actions"><button class="primary" type="button">${iconPlus}Nuevo proyecto para este cliente</button><button class="secondary" type="button">Acceso del cliente</button></div>
   <div class="choice-list"><button type="button" class="choice active">Producción</button><button type="button" class="choice">Presupuestos</button><button type="button" class="choice">Cobros</button></div>
   <h3>Proyectos (2)</h3>
   <div class="drawer-list">
    <div class="drawer-list-head" aria-hidden="true"><span>Proyecto</span><span>Enlaces</span></div>
    <article class="activity-line"><b title="Campaña integral de lanzamiento con producción audiovisual y activaciones">Campaña integral de lanzamiento con producción audiovisual y activaciones</b><span>2 enlaces</span></article>
    <article class="activity-line"><b title="Reels mensuales de producto y testimoniales de clientes">Reels mensuales de producto y testimoniales de clientes</b><span>1 enlace</span></article>
   </div>
   <h3>Piezas recientes</h3>
   <div class="drawer-list">
    <div class="drawer-list-head" aria-hidden="true"><span>Pieza</span><span>Estado</span></div>
    <button type="button" class="work-list-row"><b title="Video institucional de 90 segundos con locución en guaraní">Video institucional de 90 segundos con locución en guaraní</b><span>En revisión</span></button>
    <button type="button" class="work-list-row"><b title="Placas para redes del lanzamiento">Placas para redes del lanzamiento</b><span>Publicada</span></button>
   </div>
   <p class="form-note">Historial de hasta 100 registros por categoría. Los movimientos financieros solo aparecen con permiso.</p>
  </div>
  <div class="dialog-footer"><div class="dialog-actions"><button class="secondary" type="button">Cancelar</button><button class="primary ops-wide" type="submit" disabled>Guardando…</button></div></div>
 </section>
</div>`,
};

/* ==================================================================== */
/* 4. Toasts — app/notification-center.tsx lines 9-18 + app/toast.css.
 *    Textos reales de feedback.ts (líneas 10-22) con estrés de longitud. */
const toast = ({tone, icon, message}) => `
<div class="feedback-toast" data-tone="${tone}"><span class="feedback-toast-icon" aria-hidden="true">${icon}</span><p>${message}</p></div>`;

const notificationsFixture = {
  id: 'primitivas-notificaciones',
  section: 'Sistema de diseño',
  surface: 'Toasts apilados (3 tonos)',
  kind: 'plain',
  body: `
<div class="feedback-stack" role="status" aria-live="polite" aria-relevant="additions" aria-label="Notificaciones de guardado">${toast({
    tone: 'success',
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    message: 'Cambios guardados correctamente. El perfil de María Fernanda González de la Cruz quedó actualizado y su acceso sigue activo.',
  })}${toast({
    tone: 'error',
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    message: 'No se pudo completar la operación: el proveedor rechazó el comprobante del pago de Gs 1.234.567.890 para Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.',
  })}${toast({
    tone: 'warning',
    icon: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/></svg>',
    message: 'Acceso guardado, pero el correo no se pudo enviar. Podés reenviarlo desde Equipo.',
  })}</div>`,
};

/* ==================================================================== */
/* 5. Identidad — person-container.tsx/css y actor-identity.tsx/css. */
const identityFixture = {
  id: 'primitivas-identidad',
  section: 'Sistema de diseño',
  surface: 'Cápsulas de persona y actor',
  kind: 'workspace',
  body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">IDENTIDAD DE PERSONAS</p><h2>Cápsulas de persona y de actor</h2></div></div>
 <p class="form-note">PersonContainer (sm/md/lg) y ActorIdentity con y sin sello de verificación, autor importado y fecha en 24 h.</p>
 <div class="ops-stack">
  <div class="inline-actions">${personContainer({name: 'María Fernanda González de la Cruz', initials: 'MC', secondary: LONG_EMAIL, size: 'md'})}${personContainer({name: 'Juan Carlos Benítez', initials: 'JB', secondary: 'produccion@estudiocomunicacionparaguay.com.py', size: 'sm'})}${personContainer({name: 'María', initials: 'MA', size: 'lg'})}</div>
  <div class="inline-actions">${personContainer({name: 'Administración y Finanzas de la Cooperativa Multiactiva de Servicios Múltiples Limitada', initials: 'AF', secondary: 'facturacion.proveedores@coopservicios.com.py · +595 21 555 000', size: 'md'})}</div>
  <div class="inline-actions">${actorIdentity({name: 'María Fernanda González de la Cruz', initials: 'MC', time: {iso: '2026-09-18T14:30:00.000Z', label: '18 sept 26 · 10:30'}})}${actorIdentity({name: 'Sistema', initials: 'SI'})}${actorIdentity({name: 'Autor de Trello importado sin cuenta en Scale OS', initials: 'AT', time: {iso: '2025-11-03T11:05:00.000Z', label: '03 nov 25 · 08:05'}, imported: true})}</div>
 </div>
</section>`,
};

/* ==================================================================== */
/* 6. Assignee picker — app/assignee-picker.tsx lines 47-63 + css.
 *    SearchField: app/search-field.tsx lines 9-12 + search-field.css. */
const asignacionesFixture = {
  id: 'primitivas-asignaciones',
  section: 'Sistema de diseño',
  surface: 'Selector de responsables',
  kind: 'workspace',
  body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">RESPONSABLES</p><h2>Asignación de personas</h2></div></div>
 <fieldset class="assignee-picker" aria-busy="false" aria-describedby="asg-help asg-error">
  <legend>Responsables <span>(3)</span></legend>
  <p class="assignee-help" id="asg-help">Podés elegir varias personas. Una queda como responsable principal; sus permisos no cambian.</p>
  <ul class="assignee-selected" aria-label="Responsables seleccionados">
   <li>${personContainer({name: 'María Fernanda González de la Cruz', initials: 'MC', secondary: LONG_EMAIL, size: 'sm'})}<button type="button" class="assignee-primary" aria-pressed="true" aria-label="Usar como principal: María Fernanda González de la Cruz">Principal</button><button type="button" class="assignee-remove" aria-label="Quitar a María Fernanda González de la Cruz" title="Quitar a María Fernanda González de la Cruz">×</button></li>
   <li>${personContainer({name: 'Juan Carlos Benítez', initials: 'JB', secondary: 'produccion@estudiocomunicacionparaguay.com.py', size: 'sm'})}<button type="button" class="assignee-primary" aria-pressed="false" aria-label="Usar como principal: Juan Carlos Benítez">Hacer principal</button><button type="button" class="assignee-remove" aria-label="Quitar a Juan Carlos Benítez" title="Quitar a Juan Carlos Benítez">×</button></li>
   <li>${personContainer({name: 'Persona sin acceso activo con nombre muy largo para medir el corte', initials: 'PS', size: 'sm'})}<button type="button" class="assignee-primary" aria-pressed="false" disabled aria-label="Usar como principal: Persona sin acceso activo con nombre muy largo para medir el corte">Hacer principal</button><button type="button" class="assignee-remove" aria-label="Quitar a Persona sin acceso activo con nombre muy largo para medir el corte" title="Quitar a Persona sin acceso activo con nombre muy largo para medir el corte">×</button></li>
  </ul>
  <label class="search-field assignee-search" for="asg-search"><span class="search-field-label">Buscar integrante</span><span class="search-field-box">${iconSearch}<input id="asg-search" type="search" value="gar" placeholder="Nombre o correo" autocomplete="off"></span></label>
  <div class="assignee-options">
   <label class="assignee-option"><input type="checkbox" checked><span>${personContainer({name: 'María Fernanda González de la Cruz', initials: 'MC', secondary: LONG_EMAIL})}</span></label>
   <label class="assignee-option"><input type="checkbox"><span>${personContainer({name: 'Juan Carlos Benítez', initials: 'JB', secondary: 'produccion@estudiocomunicacionparaguay.com.py'})}</span></label>
   <label class="assignee-option"><input type="checkbox"><span>${personContainer({name: 'Administración y Finanzas de la Cooperativa Multiactiva de Servicios Múltiples Limitada', initials: 'AF', secondary: 'facturacion.proveedores@coopservicios.com.py'})}</span></label>
  </div>
  <p role="status">Hay personas sin acceso activo. Quitalas de la selección antes de guardar.</p>
  <p class="error" role="alert" id="asg-error">No se pudieron guardar los responsables. Revisá la selección y volvé a intentar.</p>
 </fieldset>
</section>`,
};

/* ==================================================================== */
/* 7. Cápsulas — kpi-strip/kpi-card (control-center.css 10-35),
 *    ops-card/commission-hub-card (operations.tsx lines 665-714: header chip +
 *    estado, monto, hechos, nota y acciones al pie), hub-chip (ui-system.css) y
 *    panel (globals.css). */
const kpiCards = `
<div class="kpi-strip" aria-label="Métricas del directorio">
 <article class="kpi-card tone-green"><p class="eyebrow">CLIENTES ACTIVOS</p><strong>148</strong><small>Con servicio en curso</small></article>
 <article class="kpi-card tone-warning"><p class="eyebrow">COBROS AL DÍA</p><strong>Gs 1.234.567.890</strong><small>23 en mora · 12 por vencer · 4 sin factura</small></article>
 <article class="kpi-card tone-danger"><p class="eyebrow">MORA ACUMULADA</p><strong>USD 12.345,67</strong><small>Cooperativa Multiactiva de Servicios Múltiples Limitada · 47 días</small></article>
 <article class="kpi-card tone-blue"><p class="eyebrow">FACTURACIÓN CONTRATADA</p><div class="kpi-amounts"><span>Gs 123.456.789 / mes</span><span>USD 12.345,67 / mes</span></div><small>Expectativa comercial vigente por moneda</small></article>
</div>`;

const commissionCard = ({kind, status, state, name, amount, currency, invoice, due, note, actions}) => `
<article class="ops-card commission-hub-card">
 <header class="commission-hub-head"><span class="hub-chip">${kind}</span><span class="commission-state" data-status="${status}">${state}</span></header>
 <h3>${name}</h3>
 <strong class="commission-hub-amount">${money(amount, currency)}</strong>
 <dl class="commission-hub-facts"><div><dt>Factura</dt><dd title="${invoice}">${invoice}</dd></div><div><dt>Vence</dt><dd title="${due}">${due}</dd></div></dl>
 <p class="form-note">${note}</p>
 <div class="commission-hub-actions inline-actions">${actions}</div>
</article>`;

const commissionCards = [
  commissionCard({
    kind: 'Venta',
    status: 'pending',
    state: 'Pendiente',
    name: 'Comisión por Producción audiovisual integral para campaña de lanzamiento regional · 12 meses',
    amount: 1234567890,
    currency: 'PYG',
    invoice: 'FAC-2026-000148',
    due: '30-nov',
    note: '35% sobre Gs 3.527.336.828 facturados al registrar la comisión.',
    actions: `<button class="text-button positive" type="button">${iconCheck14}Aprobar</button><button class="text-button danger" type="button">${iconX14}Cancelar</button>`,
  }),
  commissionCard({
    kind: 'Referido',
    status: 'approved',
    state: 'Aprobada',
    name: 'Comisión por recomendación de la Cooperativa Multiactiva de Servicios Múltiples Limitada',
    amount: 12345.67,
    currency: 'USD',
    invoice: 'Sin factura vinculada',
    due: '—',
    note: 'Importe fijo',
    actions: `<button class="text-button" type="button">${iconBanknote}Registrar pago</button><button class="text-button danger" type="button">${iconX14}Cancelar</button>`,
  }),
].join('');

const capsulasFixture = {
  id: 'primitivas-capsulas',
  section: 'Sistema de diseño',
  surface: 'Panel, KPI, tarjeta y chips',
  kind: 'workspace',
  grids: [{container: '.ops-grid', card: '.ops-card', label: 'Cápsulas · tarjetas', minHeight: 200}],
  body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">RESUMEN</p><h2>Panel, KPI y chips de estado</h2></div></div>
 ${kpiCards}
 <p class="form-note">Chips de estado compartidos: ancho de contenido, sin wrap, con texto largo de estrés.</p>
 <div class="inline-actions">
  <span class="hub-chip">PYG</span>
  <span class="hub-chip">USD · Archivado</span>
  <span class="hub-chip muted">Actualizada 18 sept 26 · 10:30</span>
  <span class="hub-chip">En revisión con observaciones del cliente pendientes de resolver</span>
 </div>
</section>
<div class="ops-grid">
 ${commissionCards}
</div>`,
};

/* ==================================================================== */
/* 8. Formatos de lista — app/list-format.tsx + list-format.css.
 *    SerialTexto (41-47), listDateShort/Full (15-29), dueTone (32-38),
 *    list-amount, list-identity, list-secondary (css 1-7). */
const formatosFixture = {
  id: 'primitivas-formatos',
  section: 'Sistema de diseño',
  surface: 'Seriales, fechas y montos de lista',
  kind: 'workspace',
  body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">FORMATOS DE LISTA</p><h2>Seriales, fechas, montos e identidad</h2></div></div>
 <p class="form-note">SerialTexto (cabeza + últimos 4 en negrita, enmascarado), fecha corta y completa en 24 h, semáforo de vencimiento, montos PYG/USD e identidad truncada con title.</p>
 <div>
  <span class="list-identity" title="${LONG_CLIENT}">${LONG_CLIENT}</span>
  <span class="list-secondary" title="${LONG_EMAIL} · +595 981 123 456 · RUC 80012345-6">${LONG_EMAIL} · +595 981 123 456 · RUC 80012345-6</span>
 </div>
 <div>
  <span class="serial-text" title="356938035643809">356938035643<b>3809</b></span>
  <span class="serial-text" title="860123456789012">860123456789<b>9012</b></span>
  <span class="serial-text" title="IMEI-490154203237518">••••7518</span>
 </div>
 <div>
  <span class="list-date">18-sept</span>
  <span class="list-date">30-nov</span>
  <span class="list-date" data-tone="warn">21-sept</span>
  <span class="list-date" data-tone="warn">18 sept 26 · 10:30</span>
  <span class="list-date">03 nov 25 · 08:05</span>
 </div>
 <div>
  <span class="list-amount">Gs 1.234.567.890</span>
  <span class="list-amount">USD 12.345,67</span>
  <span class="list-amount">Gs 0</span>
 </div>
</section>`,
};

/* ==================================================================== */
/* 9. Botones y acciones — globals.css 9-10/32-35 + ui-system.css 34-48 y
 *    240-247; catálogo de acciones de tarjeta (ops-card/commission-hub-card,
 *    operaciones 665-714), text-button, icon-button con title, estados disabled. */
const botonesFixture = {
  id: 'primitivas-botones',
  section: 'Sistema de diseño',
  surface: 'Botones y acciones de tarjeta',
  kind: 'workspace',
  body: `
<section class="panel">
 <div class="panel-heading"><div><p class="eyebrow">ACCIONES</p><h2>Botones, iconos y estados</h2></div></div>
 <p class="form-note">Mismo set de iconos, mismo tamaño; title y aria-label que nombran la acción exacta; viewer nunca ve acciones (disabled es solo para pending/permiso transitorio).</p>
 <div class="inline-actions">
  <button class="primary" type="button">${iconPlus}Nuevo cliente</button>
  <button class="secondary" type="button">Cancelar</button>
  <button class="text-button" type="button">Restaurar</button>
  <a class="text-button whatsapp-button" href="https://wa.me/595981123456" target="_blank" rel="noopener noreferrer">${iconWhatsapp}WhatsApp</a>
  <button class="icon-button" type="button" title="Editar equipo: Cámara mirrorless full frame" aria-label="Editar equipo: Cámara mirrorless full frame">${iconPencil}</button>
  <button class="icon-button" type="button" title="Eliminar equipo: Cámara mirrorless full frame" aria-label="Eliminar equipo: Cámara mirrorless full frame">${iconTrash}</button>
 </div>
 <div class="inline-actions">
  <button class="primary" type="button" disabled>Guardando…</button>
  <button class="secondary" type="button" disabled>Aprobar siguiente nivel</button>
  <button class="text-button" type="button" disabled>Sin permiso para editar</button>
  <button class="icon-button" type="button" title="Verificar devolución de la reserva" aria-label="Verificar devolución de la reserva" disabled>${iconPencil}</button>
 </div>
 <div class="inline-actions">
  <button class="secondary danger" type="button">Eliminar registro</button>
  <button class="text-button danger" type="button">Rechazar</button>
  <button class="text-button positive" type="button">Marcar publicada</button>
  <button class="primary" type="button" disabled>Publicando…</button>
 </div>
</section>
<article class="ops-card commission-hub-card">
 <header class="commission-hub-head"><span class="hub-chip">En revisión</span><span class="commission-state" data-status="pending">Pendiente</span></header>
 <h3>Acciones de tarjeta en una sola fila con etiquetas largas</h3>
 <p class="form-note">Cuatro acciones de distinto tipo en el pie; deben quedar alineadas y sin envolver (o con scroll silencioso) en mobile.</p>
 <div class="commission-hub-actions inline-actions"><button class="text-button" type="button">Abrir ficha completa</button><a class="text-button whatsapp-button" href="https://wa.me/595981123456" target="_blank" rel="noopener noreferrer">${iconWhatsapp}WhatsApp</a><button class="icon-button" type="button" title="Editar equipo: Cámara mirrorless full frame" aria-label="Editar equipo: Cámara mirrorless full frame">${iconPencil}</button><button class="icon-button" type="button" title="Eliminar equipo: Cámara mirrorless full frame" aria-label="Eliminar equipo: Cámara mirrorless full frame">${iconTrash}</button></div>
</article>`,
};

/* Short dialogs keep every field inside the visible scroll area of
 * .dialog-body at 360/390, where the sheet is one column. */
const editorDialog = ({id, surface, heading, note, fields}) => ({
  id,
  section: 'Sistema de diseño',
  surface,
  kind: 'plain',
  body: `${DIALOG_STABILIZE}
<div class="ops-overlay">
 <section class="ops-dialog unified-dialog" data-dialog-size="wide" role="dialog" aria-modal="true" aria-busy="true" aria-labelledby="${id}-heading" tabindex="-1">
  <div class="dialog-heading"><h2 id="${id}-heading">${heading}</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar" disabled>${iconX}</button></div>
  <div class="dialog-body">
   <p class="form-note">${note}</p>
   <form class="form-stack ops-form-grid" novalidate aria-busy="true">${fields}</form>
  </div>
  <div class="dialog-footer"><div class="dialog-actions"><button class="secondary" type="button" disabled>Cancelar</button><button class="primary ops-wide" type="submit" disabled>Guardando…</button></div></div>
 </section>
</div>`,
});

const camposEditorFixture = editorDialog({
  id: 'primitivas-campos-editor',
  surface: 'Campos simples, selector y errores inline',
  heading: 'Editar pieza: Campaña integral de lanzamiento con producción audiovisual y cobertura en redes',
  note: 'Un componente por tipo de dato. Texto, número, porcentaje entero, fecha y hora (24 h) con límites y formatos compartidos; el error se muestra inline y el selector mantiene el foco.',
  fields: editorFields,
});

const camposMonedaFixture = editorDialog({
  id: 'primitivas-campos-editor-moneda',
  surface: 'Moneda, teléfono, correo y contraseña',
  heading: 'Editar persona: María Fernanda González de la Cruz',
  note: 'Moneda con símbolo fijo (Gs / US$) y valor normalizado; teléfono con código de país; correo con autofill; contraseña con control de visibilidad.',
  fields: monedaFields,
});

const camposTextoFixture = editorDialog({
  id: 'primitivas-campos-editor-texto',
  surface: 'Notas, consulta externa y secciones',
  heading: 'Nueva comisión o referido',
  note: 'Notas de hasta 2000 caracteres, consulta externa con nota de estado, sección plegable y resumen de error del formulario.',
  fields: textoFields,
});

export default [
  camposEditorFixture,
  camposMonedaFixture,
  camposTextoFixture,
  dialogFixture,
  drawerFixture,
  notificationsFixture,
  identityFixture,
  asignacionesFixture,
  capsulasFixture,
  formatosFixture,
  botonesFixture,
];
