/*
 * Auth, portal del cliente y landing.
 * Markup mirrors:
 *   - app/scale-workspace.tsx (login card, lines ~903-948)
 *   - app/access-layout.tsx + app/registro/page.tsx + app/registro/registration.css
 *   - app/verificar-correo/page.tsx, app/recuperar-cuenta/page.tsx, app/invitacion/page.tsx
 *   - app/acceso-pendiente/page.tsx, app/demo/page.tsx, app/status/page.tsx + app/status/status.css
 *   - app/cliente/{ingresar,entregas,entregas/[id],invitacion,recuperar}/page.tsx + app/cliente/portal.css
 *   - public/scale-os.html (documento real, se sirve instrumentado)
 */

const svg = (size, paths, viewBox = '0 0 24 24') =>
  `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${paths}</svg>`;
const eye = svg(18, '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>');
const googleMark = `<svg class="google-g" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.35 12.27c0-.71-.06-1.39-.18-2.04H12v3.86h5.24a4.48 4.48 0 0 1-1.94 2.94v2.5h3.15c1.84-1.69 2.9-4.18 2.9-7.26Z"/><path fill="#34A853" d="M12 21.75c2.63 0 4.84-.87 6.45-2.22l-3.15-2.5c-.87.59-1.99.94-3.3.94-2.54 0-4.69-1.72-5.46-4.03H3.29v2.58A9.75 9.75 0 0 0 12 21.75Z"/><path fill="#FBBC04" d="M6.54 13.94A5.87 5.87 0 0 1 6.23 12c0-.67.11-1.32.31-1.94V7.48H3.29A9.72 9.72 0 0 0 2.25 12c0 1.57.38 3.05 1.04 4.52l3.25-2.58Z"/><path fill="#EA4335" d="M12 6.03c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.13 14.63 2.25 12 2.25a9.75 9.75 0 0 0-8.71 5.23l3.25 2.58C7.31 7.75 9.46 6.03 12 6.03Z"/></svg>`;
const brand = '<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>';
const footer = '<footer class="workspace-footer"><span>© 2026 Scale OS. Todos los derechos reservados. · v1.0.97</span><span>Desarrollado por <a href="#">Owncoding</a></span></footer>';
const passwordField = (label, name, value, autoComplete) => `<label class="password-field"><span>${label}</span><span class="password-field-control"><input name="${name}" type="password" value="${value}" autocomplete="${autoComplete}"/><button type="button" class="password-visibility" title="Mostrar contraseña" aria-label="Mostrar contraseña" aria-pressed="false">${eye}</button></span></label>`;

const longOrg = 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima';
const longClient = 'Cooperativa Multiactiva de Servicios Múltiples Limitada';

export default [
  {
    id: 'auth-login',
    section: 'Acceso',
    surface: 'Inicio de sesión',
    kind: 'plain',
    body: `
<div class="login-page access-layout"><div class="access-layout-shell"><section class="login-card" aria-label="Acceso a Scale OS">
 <button type="button" class="theme-toggle login-theme-toggle" aria-label="Cambiar tema" title="Cambiar tema">${svg(18, '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>')}</button>
 <div class="login-header"><div class="login-brand">${brand}</div><span class="login-badge">30 DÍAS GRATIS</span></div>
 <div class="login-intro"><h1>Qué bueno verte de nuevo.</h1><p class="login-copy">Clientes, proyectos y operación en un solo lugar.</p></div>
 <div class="auth-notice" role="status"><b>Acceso pendiente</b><p>Tu solicitud está pendiente de aprobación por la administración de la empresa.</p></div>
 <button type="button" class="google-login-button" disabled>${googleMark}Google aún no está configurado</button>
 <div class="login-divider"><span>o ingresá con correo</span></div>
 <form novalidate>
  <label>Email<input type="email" value="administracion.facturacion@estudiocomunicacionparaguay.com.py" autocomplete="email"/></label>
  ${passwordField('Contraseña', 'password', 'una-clave-larga-de-prueba-123', 'current-password')}
  <button type="button" class="text-button">${svg(14, '<circle cx="8" cy="15" r="4"/><path d="m10.85 12.15 7.15-7.15M18 6l2 2M15 9l2 2"/>')}Establecer o recuperar contraseña</button>
  <p class="error">Credenciales incorrectas: revisá tu correo y contraseña.</p>
  <button class="primary login-button">Continuar</button>
 </form>
 <p class="login-signup"><a href="/registro">Crear mi agencia con 30 días gratis</a></p>
 ${footer}
</section></div></div>`,
  },
  {
    id: 'auth-registro',
    section: 'Acceso',
    surface: 'Registro · paso agencia',
    kind: 'plain',
    body: `
<main class="registration-page access-layout"><div class="access-layout-shell"><section class="login-card registration-card" aria-label="Crear tu agencia">
 <header class="access-layout-header"><a class="access-layout-brand" href="#">${brand}</a><p class="eyebrow">TU AGENCIA, TU ESPACIO</p></header>
 <ol class="registration-progress" aria-label="Progreso del registro">
  <li class="done"><span>1</span><b>Identidad</b></li>
  <li class="active" aria-current="step"><span>2</span><b>Agencia</b></li>
  <li><span>3</span><b>Acceso</b></li>
 </ol>
 <section class="registration-step">
  <h1>Configurá tu agencia.</h1>
  <p>Esto se puede editar más adelante desde Configuración.</p>
  <label>Nombre de tu agencia<input value="${longOrg}" autocomplete="organization" placeholder="Tu agencia" maxlength="160"/></label>
  <div class="ops-select"><span class="ops-select-label">Moneda de la suscripción</span><button type="button" class="ops-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span>US$10 al mes</span>${svg(14, '<path d="m6 9 6 6 6-6"/>')}</button></div>
  <p class="registration-terms" id="founder-conditions"><strong>Precio de lanzamiento por agencia.</strong> Todos los integrantes están incluidos. Beneficio para clientes fundadores.</p>
  <details class="registration-details"><summary>Ver condiciones de la prueba</summary><p id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta. Después se aplica la moneda elegida. Hay 2 días de gracia; al tercer día sin pago se suspende el uso sin borrar los datos. Volver a registrarte no reinicia la prueba.</p></details>
  <label class="registration-consent"><input type="checkbox" checked/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
  <button class="primary" type="button">Continuar con correo</button>
  <button class="back-link" type="button">← Volver al inicio</button>
 </section>
 <p class="registration-links"><a href="/">Ya tengo cuenta</a><a href="#">Explorar la demo primero</a></p>
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
 <a class="primary" href="/">Ir a iniciar sesión</a>
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
  <label>Correo<input type="email" value="administracion.facturacion@estudiocomunicacionparaguay.com.py" autocomplete="email"/></label>
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
    body: `
<main class="login-page invite-page"><section class="login-card invite-card" aria-busy="false">
 <div class="login-brand"><img src="/brand/icon-192.png" width="56" height="56" alt="Scale OS"/></div>
 <p class="invite-eyebrow">Scale OS · Acceso de equipo</p>
 <h1>Activá tu acceso</h1>
 <p class="invite-link-status" data-state="ready" role="status" aria-live="polite"><span aria-hidden="true">✓</span> Enlace listo para usar</p>
 <p class="invite-expiration">Vence: <time datetime="2026-09-30T12:00:00.000Z">30-sept, 08:00</time> · hora de Asunción</p>
 <p class="login-copy">Te invitaron a trabajar en este espacio.</p>
 <div class="invite-summary"><strong>${longOrg}</strong><span>Permiso asignado: <b>Gerencia</b></span></div>
 <p class="login-copy">Este enlace habilita una sola cuenta.</p>
 <p class="invite-helper">Elegí cómo querés verificar tu correo para continuar.</p>
 <div class="invite-actions"><a class="primary login-button" href="#">Continuar con Google</a><button type="button" class="secondary login-button">Crear cuenta con correo</button></div>
 <form class="invite-password-form" novalidate>
  <label>Correo de trabajo<input type="email" value="administracion.facturacion@estudiocomunicacionparaguay.com.py" autocomplete="email"/></label>
  ${passwordField('Contraseña', 'password', '', 'new-password')}
  <p class="password-hint">8+ caracteres; sin requisitos de mayúsculas, números ni símbolos.</p>
  <button class="primary login-button">Verificar mi correo y continuar</button>
 </form>
 <p class="invite-footer"><a href="#">Ir al inicio de sesión</a></p>
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
 <p>administracion.facturacion@estudiocomunicacionparaguay.com.py<br/>Permiso solicitado: <strong>Gerencia</strong></p>
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
    body: `
<main class="demo-start-page" aria-busy="true"><section class="demo-start-status">
 <img src="/brand/icon-192.png" width="42" height="42" alt="Scale OS"/>
 <p>Preparando tu Demo…</p>
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
  <div class="status-hero-copy"><p class="status-eyebrow">Comunicación de respaldo</p><h1>Estado de Scale OS</h1><p class="status-chip is-available" aria-live="polite">API y base de datos disponibles</p></div>
  <button class="secondary status-refresh" type="button">${svg(14, '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>')}Volver a comprobar</button>
 </header>
 <ul class="status-components" aria-label="Componentes supervisados">
  <li><span class="status-component-icon is-available" aria-hidden="true">${svg(17, '<path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>')}</span><div><b>Aplicación</b><small>Disponible por HTTPS</small></div><span class="status-chip sm is-available">Operativo</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${svg(17, '<path d="M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6Z"/>')}</span><div><b>Autenticación</b><small>Protegida por sesión</small></div><span class="status-chip sm is-available">Configurado</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${svg(17, '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>')}</span><div><b>Correo transaccional</b><small>Supervisado mediante WEEM</small></div><span class="status-chip sm is-available">Supervisado</span></li>
  <li><span class="status-component-icon is-available" aria-hidden="true">${svg(17, '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18Z"/>')}</span><div><b>API y base de datos</b><small>Responde a la comprobación en vivo</small></div><span class="status-chip sm is-available">Operativo</span></li>
 </ul>
 <p class="form-note">El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.</p>
 <div class="status-actions"><a class="secondary" href="#">Landing</a><a class="secondary" href="/">Abrir Scale OS</a></div>
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
  <label>Correo<input type="email" value="administracion.facturacion@estudiocomunicacionparaguay.com.py" autocomplete="email"/></label>
  ${passwordField('Contraseña', 'password', 'una-clave-larga-de-prueba-123', 'current-password')}
  <p class="error" role="alert">Correo o contraseña incorrectos.</p>
  <button>Ingresar</button>
  <a class="portal-recovery-link" href="#">¿Olvidaste tu contraseña?</a>
 </form>
 <div class="portal-alternate-login"><a class="portal-google-icon" href="#" aria-label="Continuar con Google">${googleMark}</a></div>
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
  <article class="delivery"><div><h2>Spot institucional 60 segundos para campaña de fin de año · versión final aprobada</h2><small>${longClient} · Campaña Fin de Año 2026 · Versión 4 · Entrega 17-sept, 14:30</small></div><p>Revisión final con correcciones de color, locución y música original. Incluye versiones de 15 y 30 segundos para redes.</p><a class="button" href="#">Ver entrega</a></article>
  <article class="delivery"><div><h2>Fotografía de producto</h2><small>${longClient} · Catálogo Primavera · Versión 2</small></div><p>Selección de 48 fotos retocadas en alta y baja resolución.</p><a class="button" href="#">Ver entrega</a></article>
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
 <header><div><p class="portal-status">${longClient} · Campaña Fin de Año 2026</p><h1>Spot institucional 60 segundos · versión final aprobada</h1><p class="portal-muted">Versión 4 · Entrega 17-sept, 14:30</p></div><a class="button" href="#">Volver</a></header>
 <p>Revisión final con correcciones de color, locución y música original. Incluye versiones de 15 y 30 segundos para redes.</p>
 <p><a class="button" href="#">spot-institucional-final-v4.mp4 <span aria-hidden="true">↗</span></a></p>
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
  <li><span class="portal-status">Descarga</span> · Administración Facturación<small>17-sept, 15:01</small><p>Descargó spot-institucional-final-v4.mp4.</p></li>
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
  <label>Nombre completo<input value="María Fernanda Ortellado de la Cruz" autocomplete="name" maxlength="120"/></label>
  ${passwordField('Elegí una contraseña', 'password', '', 'new-password')}
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
  <label>Correo<input type="email" value="administracion.facturacion@estudiocomunicacionparaguay.com.py" autocomplete="email"/></label>
  ${passwordField('Nueva contraseña', 'password', '', 'new-password')}
  ${passwordField('Confirmar contraseña', 'confirm', '', 'new-password')}
  <p class="error" role="alert">Las contraseñas no coinciden.</p>
  <p class="success" role="status">Tu contraseña se actualizó. Ya podés ingresar.</p>
  <button>Guardar contraseña</button>
  <a class="portal-recovery-link" href="#">Volver a ingresar</a>
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
