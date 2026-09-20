/*
 * Auth, portal del cliente y landing.
 * Markup mirrors:
 *   - app/scale-workspace.tsx (login card, lines ~905-950)
 *   - app/access-layout.tsx + app/registro/page.tsx + app/registro/registration.css
 *   - app/verificar-correo/page.tsx, app/recuperar-cuenta/page.tsx, app/invitacion/page.tsx + app/invitacion/status.css
 *   - app/acceso-pendiente/page.tsx, app/demo/page.tsx, app/status/page.tsx + app/status/status.css
 *   - app/cliente/{ingresar,entregas,entregas/[id],invitacion,recuperar}/page.tsx + app/cliente/portal.css
 *   - app/workspace-brand.tsx / workspace-footer.tsx / google-sign-in.tsx / password-field.tsx / email-field.tsx
 *   - public/scale-os.html (documento real, se sirve instrumentado)
 */

const svg = (name, size, paths, attrs = '') =>
  `<svg class="lucide lucide-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${attrs}>${paths}</svg>`;

const moon18 = svg('moon', 18, '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>');
const eye18 = svg('eye', 18, '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>');
const keyRound14 = svg('key-round', 14, '<path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r=".5" fill="currentColor"/>');
const refresh14 = svg('refresh-cw', 14, '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>');
const checkCircle14 = svg('circle-check', 14, '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>');
const activity17 = svg('activity', 17, '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>');
const shieldCheck17 = svg('shield-check', 17, '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>');
const mail17 = svg('mail', 17, '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>');
const globe17 = svg('globe', 17, '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>');

const googleMark = `<svg class="google-g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.04H12v3.86h5.24a4.48 4.48 0 0 1-1.94 2.94v2.5h3.15c1.84-1.69 2.9-4.18 2.9-7.26Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.22l-3.15-2.5c-.87.59-1.99.94-3.3.94-2.54 0-4.69-1.72-5.46-4.03H3.29v2.58A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC04" d="M6.54 13.94A5.87 5.87 0 0 1 6.23 12c0-.67.11-1.32.31-1.94V7.48H3.29A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.52l3.25-2.58Z"/><path fill="#EA4335" d="M12 6.03c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.13 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.23l3.25 2.58C7.31 7.75 9.46 6.03 12 6.03Z"/></svg>`;
const brand = '<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>';
const footer = '<footer class="workspace-footer"><span>© 2026 Scale OS. Todos los derechos reservados. · v1.0.97</span><span>Desarrollado por <a href="https://owncoding.dev/" target="_blank" rel="noopener noreferrer">Owncoding</a></span></footer>';
const passwordField = (label, name, value, autoComplete, placeholder) => `<label class="password-field"><span>${label}</span><span class="password-field-control"><input name="${name}" type="password" value="${value}" autocomplete="${autoComplete}"${placeholder ? ` placeholder="${placeholder}"` : ''} maxlength="128"/><button type="button" class="password-visibility" title="Mostrar contraseña" aria-label="Mostrar contraseña" aria-pressed="false">${eye18}</button></span></label>`;
const emailField = (value, placeholder) => `<input type="email" inputmode="email" autocomplete="email" maxlength="200"${placeholder ? ` placeholder="${placeholder}"` : ''} value="${value}"/>`;

const founderNote = 'El precio de lanzamiento puede cambiar en el futuro. Como cliente fundador, conservarás siempre una tarifa preferencial frente a los nuevos clientes, aunque el importe inicial se actualice.';
const longOrg = 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima';
const longClient = 'Cooperativa Multiactiva de Servicios Múltiples Limitada';
const longEmail = 'administracion.facturacion@estudiocomunicacionparaguay.com.py';

export default [
  {
    id: 'auth-login',
    section: 'Acceso',
    surface: 'Inicio de sesión',
    kind: 'plain',
    body: `
<div class="login-page"><div class="login-card">
 <button type="button" class="theme-toggle login-theme-toggle" aria-label="Cambiar tema" title="Cambiar tema">${moon18}</button>
 <div class="login-header"><div class="login-brand">${brand}</div><span class="login-badge">30 DÍAS GRATIS</span></div>
 <div class="login-intro"><h1>Qué bueno verte de nuevo.</h1><p class="login-copy">Clientes, proyectos y operación en un solo lugar.</p></div>
 <div class="auth-notice" role="status"><b>Acceso pendiente</b><p>Tu solicitud está pendiente de aprobación por la administración de la empresa.</p></div>
 <button type="button" class="google-login-button" disabled>${googleMark}Google aún no está configurado</button>
 <div class="login-divider"><span>o ingresá con correo</span></div>
 <form novalidate>
  <label>Email${emailField(longEmail, 'Tu email')}</label>
  ${passwordField('Contraseña', 'password', 'una-clave-larga-de-prueba-123', 'current-password', '••••••••')}
  <button type="button" class="text-button">${keyRound14}Establecer o recuperar contraseña</button>
  <p class="error">Credenciales incorrectas: revisá tu correo y contraseña.</p>
  <button class="primary login-button">Continuar</button>
 </form>
 <p class="login-signup"><a href="/registro">Crear mi agencia con 30 días gratis</a></p>
 ${footer}
</div></div>`,
  },
  {
    id: 'auth-registro',
    section: 'Acceso',
    surface: 'Registro · paso agencia',
    kind: 'plain',
    body: `
<main class="registration-page access-layout"><div class="access-layout-shell"><section class="login-card registration-card" aria-label="TU AGENCIA, TU ESPACIO">
 <header class="access-layout-header"><a class="access-layout-brand" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio">${brand}</a><p class="eyebrow">TU AGENCIA, TU ESPACIO</p></header>
 <ol class="registration-progress" aria-label="Progreso del registro">
  <li class="done"><span>1</span><b>Identidad</b></li>
  <li class="active" aria-current="step"><span>2</span><b>Agencia</b></li>
  <li><span>3</span><b>Acceso</b></li>
 </ol>
 <section class="registration-step">
  <h1>Configurá tu agencia.</h1>
  <p>Esto se puede editar más adelante desde Configuración.</p>
  <label>Nombre de tu agencia<input value="${longOrg}" autocomplete="organization" minlength="2" maxlength="160" placeholder="Tu agencia" autofocus/></label>
  <div class="ops-select"><span class="ops-label" id="registro-moneda-label">Moneda de la suscripción</span><button type="button" class="ops-select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="registro-moneda-label registro-moneda-value"><span id="registro-moneda-value">US$10 al mes</span>${svg('chevron-down', 16, '<path d="m6 9 6 6 6-6"/>')}</button></div>
  <p class="registration-terms" id="founder-conditions"><strong>Precio de lanzamiento por agencia.</strong> Todos los integrantes están incluidos. ${founderNote}</p>
  <details class="registration-details"><summary>Ver condiciones de la prueba</summary><p id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details>
  <label class="registration-consent"><input type="checkbox" checked aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
  <button class="primary" type="button">Continuar con correo</button>
  <button class="back-link" type="button">← Volver al inicio</button>
 </section>
 <p class="registration-links"><a href="/">Ya tengo cuenta</a><a href="https://sistema.scaleparaguay.com/demo">Explorar la demo primero</a></p>
 ${footer}
</section></div></main>`,
  },
  {
    id: 'auth-verificar',
    section: 'Acceso',
    surface: 'Verificación de correo',
    kind: 'plain',
    body: `
<main class="registration-page"><section class="registration-card" aria-busy="false">
 ${brand}<p class="eyebrow">SCALE OS · ACCESO SEGURO</p><h1>Correo verificado</h1>
 <p role="status" class="success">Correo verificado. Tu acceso ya está listo.</p>
 ${footer}
</section></main>`,
  },
  {
    id: 'auth-recuperar',
    section: 'Acceso',
    surface: 'Recuperar cuenta',
    kind: 'plain',
    body: `
<main class="login-page"><section class="login-card">
 <img src="/brand/icon-192.png" width="56" height="56" alt="Scale OS"/><h1>Recuperar cuenta</h1>
 <p>Si solicitaste el cierre hace menos de 30 días, confirmá tus credenciales para recuperarla.</p>
 <form>
  <label>Correo${emailField(longEmail, 'nombre@dominio.com')}</label>
  ${passwordField('Contraseña', 'password', 'una-clave-larga-de-prueba-123', 'current-password')}
  <button class="primary" disabled>Recuperando…</button>
 </form>
 <p><a href="/">Volver al inicio de sesión</a></p>
 ${footer}
</section></main>`,
  },
  {
    id: 'auth-invitacion',
    section: 'Acceso',
    surface: 'Invitación de equipo',
    kind: 'plain',
    // Ready state with the password form open (passwordOpen=true in page.tsx):
    // the Google link and the form share .invite-actions, and the
    // "Crear cuenta con correo" button is not rendered at the same time.
    body: `
<main class="login-page invite-page"><section class="login-card invite-card" aria-busy="false">
 <div class="login-brand"><img src="/brand/icon-192.png" width="56" height="56" alt="Scale OS"/></div>
 <p class="invite-eyebrow">Scale OS · Acceso de equipo</p>
 <h1>Invitación al equipo</h1>
 <p class="invite-link-status" data-state="ready" role="status" aria-live="polite"><span aria-hidden="true">✓</span> Enlace activo</p>
 <p class="invite-expiration">Vence: <time datetime="2026-09-30T12:00:00.000Z">30-sept, 08:00</time> · hora de Asunción</p>
 <p class="login-copy">Te invitaron a trabajar en este espacio.</p>
 <div class="invite-summary"><strong>${longOrg}</strong><span>Permiso asignado: <b>Gerencia</b></span></div>
 <p class="login-copy">Este enlace habilita una sola cuenta.</p>
 <p class="invite-helper">Elegí cómo querés verificar tu correo para continuar.</p>
 <div class="invite-actions"><a class="primary login-button" referrerpolicy="no-referrer" href="#invite-google">Continuar con Google</a>
  <form class="invite-password-form" novalidate>
   <label>Nombre y apellido <input name="full_name" maxlength="120" autocomplete="name" placeholder="Cómo te llamamos" value="María Fernanda Ortellado de la Cruz"/></label>
   <label>Correo${emailField(longEmail, 'tu@correo.com')}</label>
   ${passwordField('Contraseña', 'password', '', 'new-password', '8+ caracteres')}
   ${passwordField('Repetí tu contraseña', 'confirm', '', 'new-password', 'Repetí la contraseña')}
   <p class="password-hint">8+ caracteres; sin requisitos de mayúsculas, números ni símbolos.</p>
   <button class="primary login-button">Verificar mi correo y continuar</button>
   <p class="error" role="alert">Las contraseñas no coinciden.</p>
  </form>
 </div>
 <p class="invite-footer"><a href="https://app.scaleparaguay.com/" referrerpolicy="no-referrer">Ir al inicio de sesión</a></p>
 ${footer}
</section></main>`,
  },
  {
    id: 'auth-acceso-pendiente',
    section: 'Acceso',
    surface: 'Acceso pendiente',
    kind: 'plain',
    body: `
<main class="login-page"><section class="login-card">
 <img src="/brand/icon-192.png" width="56" height="56" alt="Scale OS"/>
 <div role="status" aria-live="polite" aria-atomic="true"><h1>Acceso pendiente de aprobación</h1></div>
 <h2>${longOrg}</h2>
 <p>${longEmail}<br/>Permiso solicitado: <strong>Gerencia</strong></p>
 <p>Una vez que la administración apruebe tu solicitud, podrás utilizar Scale OS según el permiso autorizado. Esta pantalla comprueba el estado automáticamente.</p>
 <button class="secondary">Cerrar sesión</button>
 ${footer}
</section></main>`,
  },
  {
    id: 'auth-demo',
    section: 'Acceso',
    surface: 'Inicio del Demo',
    kind: 'plain',
    // Error state after the automatic start failed (busy=false).
    body: `
<main class="demo-start-page" aria-busy="false"><section class="demo-start-status">
 <img src="/brand/icon-192.png" width="42" height="42" alt="Scale OS"/>
 <p>No pudimos abrir el Demo.</p>
 <p role="alert" class="error">No pudimos abrir el Demo: intentá nuevamente en unos segundos.</p>
 <button class="primary" type="button">Reintentar</button>
</section></main>`,
  },
  {
    id: 'status-page',
    section: 'Estado',
    surface: 'Comunicación de respaldo',
    kind: 'plain',
    body: `
<main class="login-page"><section class="status-shell">
 <header class="status-hero">
  <span class="status-brand"><img src="/brand/icon-192.png" width="52" height="52" alt="Scale OS"/></span>
  <div class="status-hero-copy"><p class="status-eyebrow">Comunicación de respaldo</p><h1>Estado de Scale OS</h1><p class="status-chip is-available" aria-live="polite">${checkCircle14}API y base de datos disponibles</p></div>
  <button class="secondary status-refresh" type="button">${refresh14}Volver a comprobar</button>
 </header>
 <ul class="status-components" aria-label="Componentes supervisados">
  <li><span class="status-component-icon is-available" aria-hidden="true">${activity17}</span><div><b>Aplicación</b><small>Disponible por HTTPS</small></div><span class="status-chip sm is-available">Operativo</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${shieldCheck17}</span><div><b>Autenticación</b><small>Protegida por sesión</small></div><span class="status-chip sm is-available">Configurado</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${mail17}</span><div><b>Correo transaccional</b><small>Supervisado mediante WEEM</small></div><span class="status-chip sm is-available">Supervisado</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${globe17}</span><div><b>API y base de datos</b><small>Responde a la comprobación en vivo</small></div><span class="status-chip sm is-available">Operativo</span></li>
 </ul>
 <p class="form-note">El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.</p>
 <div class="status-actions"><a class="secondary" href="https://sistema.scaleparaguay.com/">Landing</a><a class="secondary" href="/">Abrir Scale OS</a></div>
 ${footer}
</section></main>`,
  },
  {
    id: 'portal-ingresar',
    section: 'Portal del cliente',
    surface: 'Ingreso',
    kind: 'plain',
    body: `
<main class="client-portal"><section class="client-portal-card narrow">
 <p class="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Ver entregables</h1>
 <p class="portal-muted">Ingresá con el correo y contraseña que configuraste al aceptar la invitación.</p>
 <form>
  <label>Correo${emailField(longEmail, 'nombre@dominio.com')}</label>
  ${passwordField('Contraseña', 'password', 'una-clave-larga-de-prueba-123', 'current-password')}
  <p class="error" role="alert">Correo o contraseña incorrectos.</p>
  <button>Ingresar</button>
  <a class="portal-recovery-link" href="/cliente/recuperar">¿Olvidaste tu contraseña?</a>
 </form>
 <div class="portal-alternate-login"><a class="portal-google-icon" href="#" aria-label="Continuar con Google" title="Continuar con Google">${googleMark}<span class="sr-only">Continuar con Google</span></a></div>
</section></main>`,
  },
  {
    id: 'portal-entregas',
    section: 'Portal del cliente',
    surface: 'Listado de entregables',
    kind: 'plain',
    body: `
<main class="client-portal"><section class="client-portal-card">
 <header><div><p class="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Entregables</h1><p class="portal-muted">Hola, Administración Facturación. Sólo aparecen piezas publicadas para tu empresa.</p></div><button class="secondary">Salir</button></header>
 <div class="delivery-list">
  <article class="delivery"><div><h2>Spot institucional 60 segundos para campaña de fin de año · versión final aprobada</h2><small>${longClient} · Campaña Fin de Año 2026 · Versión 4 · Entrega <span class="portal-date">17-sept, 14:30</span></small></div><p>Revisión final con correcciones de color, locución y música original. Incluye versiones de 15 y 30 segundos para redes.</p><a class="button" href="#">Ver entrega</a></article>
  <article class="delivery"><div><h2>Fotografía de producto</h2><small>${longClient} · Catálogo Primavera · Versión 2 · Entrega <span class="portal-date">02-oct, 09:00</span></small></div><p>Selección de 48 fotos retocadas en alta y baja resolución.</p><a class="button" href="#">Ver entrega</a></article>
  <article class="delivery"><div><h2>Manual de marca actualizado</h2><small>${longOrg} · Identidad corporativa · Versión 1</small></div><p>Uso de logotipo, paleta, tipografías y aplicaciones digitales e impresas.</p><a class="button" href="#">Ver entrega</a></article>
 </div>
</section></main>`,
  },
  {
    id: 'portal-detalle',
    section: 'Portal del cliente',
    surface: 'Detalle de entrega',
    kind: 'plain',
    body: `
<main class="client-portal"><section class="client-portal-card">
 <header><div><p class="portal-status">${longClient} · Campaña Fin de Año 2026</p><h1>Spot institucional 60 segundos · versión final aprobada</h1><p class="portal-muted">Versión 4 · Entrega <span class="portal-date">17-sept, 14:30</span></p></div><a class="button" href="#">Volver</a></header>
 <p>Revisión final con correcciones de color, locución y música original. Incluye versiones de 15 y 30 segundos para redes.</p>
 <p><a class="button" href="#" aria-label="Abrir spot-institucional-final-v4.mp4 en una pestaña nueva">spot-institucional-final-v4.mp4 <span aria-hidden="true">↗</span></a></p>
 <section class="delivery"><h2>Archivos de esta entrega</h2><p><a href="#">Guion final con cambios marcados <span aria-hidden="true">↗</span></a></p><p><a href="#">Miniaturas y placas de cierre <span aria-hidden="true">↗</span></a></p></section>
 <section class="delivery"><h2>Tu revisión</h2><p class="portal-status">Decisión registrada: Cambios solicitados</p>
  <label>Comentario para la agencia<textarea maxlength="2000" placeholder="Opcional al aprobar; obligatorio si pedís cambios.">La música del cierre tapa la locución final; subir un 15% la voz sobre los últimos cinco segundos.</textarea></label>
  <div class="delivery-actions"><button>Aprobar entrega</button><button class="secondary">Pedir cambios</button></div>
 </section>
 <section><h2>Comentarios</h2>
  <form><label>Nuevo comentario<textarea maxlength="2000" required></textarea></label><button>Publicar comentario</button></form>
  <article class="delivery"><strong>Administración Facturación</strong><small>17-sept, 14:30</small><p>La música del cierre tapa la locución final; subir un 15% la voz sobre los últimos cinco segundos.</p></article>
  <article class="delivery"><strong>Equipo de producción audiovisual del Paraguay</strong><small>16-sept, 09:05</small><p>Adjuntamos la versión corregida con la mezcla ajustada y el cierre extendido.</p></article>
 </section>
 <section class="delivery"><h2>Actividad de la entrega</h2><ul class="delivery-activity">
  <li><span class="portal-status">Nueva versión</span> · versión 4 · María Fernanda Ortellado<small>17-sept, 14:30</small><p>Se publicó la versión 4 con la mezcla final.</p></li>
  <li><span class="portal-status">Comentario</span> · Administración Facturación<small>17-sept, 14:32</small><p>Pedido de ajuste de mezcla.</p></li>
  <li><span class="portal-status">Descarga</span> · Administración Facturación<small>17-sept, 14:35</small><p>Descargó spot-institucional-final-v4.mp4.</p></li>
 </ul></section>
</section></main>`,
  },
  {
    id: 'portal-invitacion',
    section: 'Portal del cliente',
    surface: 'Invitación al portal',
    kind: 'plain',
    body: `
<main class="client-portal"><section class="client-portal-card narrow" aria-busy="false">
 <p class="portal-status">INVITACIÓN AL PORTAL</p><h1 id="client-invitation-title">Acceso a entregables</h1>
 <p class="portal-invitation-status" data-state="ready" role="status" aria-live="polite">Enlace activo</p>
 <p>Vas a ver las entregas publicadas de <strong>${longClient}</strong> por <strong>${longOrg}</strong>.</p>
 <p class="portal-invitation-expiry">Vence: <time datetime="2026-09-30T12:00:00.000Z">30-sept, 08:00</time> · hora de Asunción</p>
 <p class="portal-muted">Podés continuar con la cuenta de Google asociada a esta invitación.</p>
 <a class="google-login-button" href="#">${googleMark}Continuar con Google</a>
 <p class="portal-muted">o creá tu acceso con una contraseña</p>
 <form>
  <label>Nombre completo<input value="María Fernanda Ortellado de la Cruz" autocomplete="name" minlength="2" maxlength="120" required/></label>
  ${passwordField('Elegí una contraseña', 'password', '', 'new-password', '8+ caracteres')}
  <small class="portal-muted">La cuenta queda vinculada sólo a este cliente. No otorga acceso al panel interno.</small>
  <button>Activar mi acceso</button>
  <p class="error" role="alert">No se pudo activar el acceso.</p>
 </form>
</section></main>`,
  },
  {
    id: 'portal-recuperar',
    section: 'Portal del cliente',
    surface: 'Recuperar contraseña',
    kind: 'plain',
    body: `
<main class="client-portal"><section class="client-portal-card narrow">
 <p class="portal-status">SCALE OS · PORTAL DEL CLIENTE</p><h1>Elegí una contraseña nueva</h1>
 <p class="portal-muted">Usá una clave de al menos 8 caracteres; no hacen falta mayúsculas ni símbolos.</p>
 <form>
  <label>Correo${emailField(longEmail, 'nombre@dominio.com')}</label>
  ${passwordField('Nueva contraseña', 'password', '', 'new-password', '8+ caracteres')}
  ${passwordField('Confirmar contraseña', 'confirm', '', 'new-password', 'Repetí la contraseña')}
  <p class="error" role="alert">Las contraseñas no coinciden.</p>
  <p class="success" role="status">Tu contraseña se actualizó. Ya podés ingresar.</p>
  <button>Guardar contraseña</button>
  <a class="portal-recovery-link" href="/cliente/ingresar">Volver a ingresar</a>
 </form>
</section></main>`,
  },
  {
    id: 'landing',
    section: 'Landing',
    surface: 'Documento público real',
    kind: 'external',
    source: 'public/scale-os.html',
  },
];
