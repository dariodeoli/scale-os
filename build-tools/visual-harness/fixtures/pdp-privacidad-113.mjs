/*
 * PDP — Ley N° 7593/2025 (Refs #113): evidencia visual de aviso, consentimiento,
 * «Mis datos» y supresión.
 *
 * Fidelidad (FIXTURES.md):
 * - `AvisoPrivacidad` y `ConsentimientoDatos` NO son copias: se renderizan los
 *   objetos reales de owncoding-ui v0.54.0 como los monta `app/registro/page.tsx`.
 * - `pdp-aviso` espeja `app/privacidad/page.tsx` (AccessLayout + secciones +
 *   canal de derechos) con el Aviso v1 en estado de revisión.
 * - `pdp-mis-datos` espeja `app/my-data.tsx` (resumen, finalidades con estado,
 *   derechos, solicitud con SLA y puente #112) con datos ficticios.
 * - `pdp-supresion` espeja el `RequestDialog` de supresión con su confirmación
 *   reforzada («Suprimir») y la excepción del historial auditable.
 * Datos ficticios: demos y fixtures nunca usan datos reales (§12.3).
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AlertTriangle, X} from 'lucide-react';
import {AvisoPrivacidad, ConsentimientoDatos, Badge} from 'owncoding-ui';

const VERSION = 'v1';
const icon = (node) => renderToStaticMarkup(node);
const brand = `<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>`;

const avisoPrivacidad = (props) => renderToStaticMarkup(React.createElement(AvisoPrivacidad, props));
const consentimiento = (props) => renderToStaticMarkup(React.createElement(ConsentimientoDatos, props));
/** Mismo chip que `app/ui-v2.tsx` (Badge de la biblioteca por tono). */
const chip = (tone, text) => renderToStaticMarkup(React.createElement(Badge, {color: {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'}[tone], className: 'whitespace-nowrap'}, text));

/* app/privacidad/page.tsx — estructura real, texto resumido a dos secciones. */
const section = (id, title, paragraphs, items = []) => `
<section id="${id}" class="grid gap-2 border-t border-ink-600 pt-4">
 <h2 class="text-[15px] font-semibold text-fore">${title}</h2>
 ${paragraphs.map(paragraph => `<p class="max-w-prose text-[13px] leading-relaxed text-mute">${paragraph}</p>`).join('')}
 ${items.length ? `<ul class="grid list-disc gap-1 pl-5 text-[13px] leading-relaxed text-mute">${items.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}
</section>`;

const canal = `
<div class="grid gap-2 rounded-lg border border-ink-600 bg-ink-900/40 p-3" data-testid="canal-derechos">
 <strong class="text-[12.5px] text-fore">Canal de derechos · respuesta dentro de 30 días corridos</strong>
 <div class="flex flex-wrap items-center gap-2 text-xs">
  <a class="secondary" href="https://wa.me/595993391354" target="_blank" rel="noopener noreferrer">WhatsApp +595 993 391 354</a>
  <a class="secondary" href="https://sistema.scaleparaguay.com/#contacto" target="_blank" rel="noopener noreferrer">Formulario de contacto</a>
 </div>
 <p class="text-[11.5px] text-mute">Si ya tenés cuenta, «Mis datos» en tu perfil inicia el pedido y muestra el estado con su vencimiento.</p>
</div>`;

const accesoFrame = (eyebrow, children) => `
<main data-surface="acceso" class="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
 <div class="w-full min-w-0 max-w-3xl">
  <section aria-label="${eyebrow}" class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-2xl border border-ink-600 bg-ink-800 p-6 md:p-7">
   <header class="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
    <a class="inline-flex min-h-11 items-center gap-2" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio">${brand}</a>
    <p class="min-w-0 break-words font-mono text-[10px] uppercase tracking-[.13em] text-mute">${eyebrow}</p>
   </header>
   ${children}
  </section>
 </div>
</main>`;

/* app/registro/page.tsx · paso 2: los dos consentimientos reales, separados. */
const registroConsent = `
<h1 class="text-2xl font-bold tracking-tight text-fore">Configurá tu agencia.</h1>
<p class="text-sm text-mute">Esto se puede editar más adelante desde Configuración.</p>
<label class="grid gap-1.5 text-xs text-mute">Nombre de tu agencia<input value="Agencia Creativa del Sur" readonly/></label>
<p class="rounded-lg border border-ink-600 px-3 py-2 text-[11.5px] text-mute" id="founder-conditions"><strong class="text-fore">Precio de lanzamiento por agencia.</strong> Todos los integrantes están incluidos.</p>
<details class="rounded-lg border border-ink-600 px-3 py-2 text-[11.5px] text-mute"><summary class="cursor-pointer text-fore">Ver condiciones de la prueba</summary><p class="mt-2" id="trial-conditions">Los 30 días empiezan al crear la agencia, sin tarjeta.</p></details>
<label class="flex items-start gap-2 text-[11.5px] text-mute"><input type="checkbox" checked="" aria-describedby="trial-conditions founder-conditions"/><span>Acepto estas condiciones de la prueba y suscripción.</span></label>
${consentimiento({
  checked: false,
  onChange: () => {},
  finalidad: 'Acepto el tratamiento de mis datos personales para crear mi cuenta y prestarme el servicio.',
  detalle: 'Correo, nombre y datos de la agencia; los usamos para autenticarte, prestarte soporte y enviarte avisos operativos.',
  politicaUrl: '/privacidad',
  version: VERSION,
})}
<div class="flex flex-wrap gap-2"><button type="button" class="primary">Crear mi agencia con Google</button><button type="button" class="secondary">Continuar con correo</button></div>`;

const finalidad = (title, detalle, estado, revocable) => `
<li class="grid gap-1 rounded-lg border border-ink-600 px-3 py-2">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <strong class="text-[13px] text-fore">${title}</strong>
  ${estado}
 </div>
 <p class="text-[11.5px] leading-5 text-mute">${detalle}</p>
 ${revocable ? '<button type="button" class="text-button w-fit min-h-11 md:min-h-9">Revocar este consentimiento</button>' : ''}
</li>`;

const solicitud = (tipo, estado, recibida, sla, motivo) => `
<li class="grid gap-1 rounded-lg border border-ink-600 px-3 py-2">
 <div class="flex flex-wrap items-center justify-between gap-2"><strong class="text-[13px] text-fore">${tipo}</strong>${estado}</div>
 <span class="text-[11.5px] text-mute">Recibida ${recibida} · <span data-tone="${sla.tone}">${sla.label}</span></span>
 ${motivo ? `<span class="text-[11.5px] text-mute">Motivo: ${motivo}</span>` : ''}
</li>`;

const misDatos = `
<div class="grid gap-4">
 <section class="grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3" aria-labelledby="my-data-summary">
  <p id="my-data-summary" class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Resumen y finalidades</p>
  <p class="text-[13px] leading-relaxed text-mute">Estos son los datos de tu cuenta y las finalidades con las que los tratamos. El detalle completo está en el <a class="text-fono-dark hover:underline" href="/privacidad">Aviso de Privacidad ${VERSION}</a> (30 de septiembre de 2026).</p>
  <dl class="grid gap-1 text-[13px]">
   <div class="flex flex-wrap items-center gap-x-2"><dt class="font-semibold text-fore">Correo de la cuenta</dt><dd class="break-all text-mute">persona@agencia-ejemplo.com.py</dd></div>
   <div class="flex flex-wrap items-center gap-x-2"><dt class="font-semibold text-fore">Nombre</dt><dd class="text-mute">María Fernanda González</dd></div>
  </dl>
  <ul class="grid gap-2">
   ${finalidad('Cuenta y prestación del servicio', 'Crear tu cuenta, autenticarte, darte soporte y enviarte avisos operativos de tu suscripción.', chip('ok', 'Aceptado v1 · 30 sept 26 · 09:04'), true)}
   ${finalidad('Operación de tu agencia', 'Tratar clientes, proyectos, producción, cobros y archivos que tu equipo carga en el espacio de trabajo.', chip('ok', 'Aceptado v1 · 30 sept 26 · 09:04'), true)}
   ${finalidad('Portal del cliente', 'Habilitar que tu cliente vea las entregas que le compartís y deje su decisión o comentarios.', chip('mute', 'Sin registro accesible'), false)}
  </ul>
 </section>
 <section aria-label="Estado de la base de solicitudes" class="grid gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3">
  <p class="flex items-center gap-2 text-[13px] font-semibold text-fore">${icon(React.createElement(AlertTriangle, {size: 15, 'aria-hidden': 'true'}))}Base de solicitudes en preparación</p>
  <p class="text-[12px] leading-5 text-mute">El registro completo en el servidor, los estados y los vencimientos llegan con la base técnica pendiente (Refs #112). Mientras tanto ves únicamente lo registrado de verdad en este dispositivo y podés ejercer tus derechos por el canal alternativo.</p>
  <span class="flex flex-wrap gap-2"><a class="secondary min-h-11 md:min-h-9" href="https://wa.me/595993391354" target="_blank" rel="noopener noreferrer">WhatsApp +595 993 391 354</a><a class="secondary min-h-11 md:min-h-9" href="https://sistema.scaleparaguay.com/#contacto" target="_blank" rel="noopener noreferrer">Formulario de contacto</a></span>
 </section>
 <section class="grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3" aria-labelledby="my-data-rights">
  <p id="my-data-rights" class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Ejercer tus derechos</p>
  <p class="text-[13px] leading-relaxed text-mute">Gratis y sin justificar el pedido. La respuesta llega dentro de 30 días corridos; acá ves el estado y el vencimiento de cada solicitud.</p>
  <div class="flex flex-wrap gap-2">
   <button type="button" class="secondary min-h-11 md:min-h-9">Acceso y copia de mis datos</button>
   <button type="button" class="secondary min-h-11 md:min-h-9">Rectificación de un dato inexacto</button>
   <button type="button" class="secondary min-h-11 md:min-h-9">Supresión de datos</button>
   <button type="button" class="secondary min-h-11 md:min-h-9">Oposición a un tratamiento</button>
  </div>
  <p class="text-[11.5px] text-mute">La descarga en autoservicio se habilita con la base del API; pedila por el canal alternativo y el equipo la prepara.</p>
  <ul class="grid gap-2" aria-label="Solicitudes registradas">
   ${solicitud('Acceso', chip('info', 'Recibida'), '28 sept 26 · 10:12', {label: 'Vence en 25 días', tone: ''}, '')}
   ${solicitud('Rectificación', chip('warn', 'Verificando identidad'), '21 sept 26 · 16:40', {label: 'Vence en 3 días', tone: 'warn'}, 'Corregir el teléfono de contacto')}
   ${solicitud('Supresión', chip('ok', 'Resuelta'), '2 sept 26 · 08:05', {label: 'Resuelta en 12 días', tone: ''}, 'Historial fiscal conservado, resto anonimizado')}
  </ul>
 </section>
 <p class="text-[11.5px] leading-5 text-mute">¿No podés entrar a tu cuenta o preferís otro medio? <a class="text-fono-dark hover:underline" href="https://wa.me/595993391354">WhatsApp +595 993 391 354</a> · <a class="text-fono-dark hover:underline" href="https://sistema.scaleparaguay.com/#contacto">Formulario de contacto</a>. Este pedido lo atiende Scale Strategy Group.</p>
</div>`;

const supresionBody = `
<div class="grid gap-3">
 <p class="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[12px] leading-5 text-mute">La supresión elimina o anonimiza los datos que ya no sean necesarios. El historial financiero y contable auditable se conserva por obligación fiscal, con acceso restringido y sin otras finalidades. La baja de tu cuenta conserva un período recuperable.</p>
 <label class="grid gap-1.5 text-xs text-mute">Detalle de tu pedido <small class="text-mute">Opcional</small><textarea rows="3" class="min-h-24 rounded-lg border border-ink-500 bg-ink-800 px-3 py-2 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" placeholder="Qué datos querés suprimir y por qué">Quiero eliminar el teléfono y las notas del contacto que ya no usamos.</textarea></label>
 <label class="grid gap-1.5 text-xs text-mute">Escribí <b class="text-fore">Suprimir</b> para confirmar<input value="Suprimir" autoComplete="off" class="min-h-11 md:min-h-9 h-11 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm"/></label>
 <p class="text-[11.5px] leading-5 text-mute">La respuesta llega dentro de 30 días corridos y vas a ver el estado en «Mis datos».</p>
</div>`;

export default [
  {
    id: 'pdp-aviso',
    section: 'Privacidad',
    surface: 'Política de Privacidad pública (Refs #113)',
    kind: 'plain',
    body: accesoFrame('LEY N° 7593/2025 · PROTECCIÓN DE DATOS PERSONALES', `
     <header class="grid gap-2">
      <h1 class="text-2xl font-bold tracking-tight text-fore">Política de Privacidad</h1>
      <p class="flex flex-wrap items-center gap-2 text-xs text-mute">
       <span class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-warn/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] text-warn">Aviso ${VERSION} · 30 de septiembre de 2026</span>
       <span class="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-warn/40 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[.08em] text-warn">Texto en revisión del responsable</span>
      </p>
      <p class="max-w-prose text-sm text-mute">Este aviso explica en lenguaje claro qué datos personales tratamos en Scale OS, para qué, con quién se comparten, cuánto los conservamos y cómo ejercer tus derechos. Está versionado: al aceptar una finalidad guardamos la versión vigente.</p>
     </header>
     ${section('responsable', '1. Quién trata tus datos', ['Scale Strategy Group es la empresa responsable del tratamiento de los datos personales que usás en Scale OS. El proveedor de la plataforma actúa como encargado y trata los datos únicamente para prestarte el servicio.'])}
     ${section('datos', '2. Qué datos tratamos', ['Tratamos los datos que nos das al crear la cuenta, los que cargás en tu espacio de trabajo y los que el sistema necesita para operar. No pedimos datos que no tengan una finalidad concreta.'], ['Cuenta y acceso: correo, nombre y apellido, contraseña protegida, foto de perfil y datos de la agencia.', 'Operación de la agencia: clientes, contactos, proyectos, piezas, presupuestos, cobros y archivos del espacio de trabajo.', 'Portal del cliente: nombre, correo y las decisiones o comentarios sobre las entregas publicadas.'])}
     ${section('derechos', '7. Tus derechos y cómo ejercerlos', ['Podés ejercer de forma gratuita tus derechos de acceso, rectificación, supresión (cancelación), oposición, portabilidad y revocación del consentimiento, sin justificar el pedido. La respuesta llega dentro de los 30 días corridos.', 'En el panel, «Mis datos» (Perfil) reúne el resumen, la descarga de una copia, los pedidos de rectificación, supresión y oposición, y la revocación de consentimientos. Si no podés entrar, usá el canal alternativo.'], ['Acceso y portabilidad: copia de tus datos en un formato reutilizable.', 'Supresión: eliminar o anonimizar datos que ya no son necesarios, con la excepción del historial auditable.', 'Revocación: retirar un consentimiento en cualquier momento, con el mismo esfuerzo que costó otorgarlo.'])}
     ${canal}`),
  },
  {
    id: 'pdp-consentimiento',
    section: 'Acceso',
    surface: 'Registro · consentimiento de datos (Refs #113)',
    kind: 'plain',
    body: accesoFrame('REGISTRO · 30 DÍAS GRATIS', registroConsent),
  },
  {
    id: 'pdp-mis-datos',
    section: 'Perfil',
    surface: '«Mis datos» · resumen, derechos y SLA (Refs #113)',
    kind: 'plain',
    body: `<div class="ops-overlay detail-drawer-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="pdp-mis-datos-title" data-dialog-size="default">
     <div class="dialog-heading"><h2 id="pdp-mis-datos-title">Mis datos · ${VERSION}</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar" disabled>${icon(React.createElement(X, {size: 18, 'aria-hidden': 'true'}))}</button></div>
     <div class="dialog-body">${misDatos}</div>
    </section></div>`,
  },
  {
    id: 'pdp-supresion',
    section: 'Perfil',
    surface: 'Supresión con confirmación reforzada (Refs #113)',
    kind: 'plain',
    body: `<div class="ops-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="pdp-supresion-title" data-dialog-size="compact">
     <div class="dialog-heading"><h2 id="pdp-supresion-title">Pedir supresión</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar" disabled>${icon(React.createElement(X, {size: 18, 'aria-hidden': 'true'}))}</button></div>
     <div class="dialog-body">${supresionBody}</div>
     <div class="dialog-footer"><div class="dialog-actions"><button type="button" class="primary min-h-11 md:min-h-9">Enviar pedido de supresión</button><button type="button" class="secondary min-h-11 md:min-h-9">Cancelar</button></div></div>
    </section></div>`,
  },
];
