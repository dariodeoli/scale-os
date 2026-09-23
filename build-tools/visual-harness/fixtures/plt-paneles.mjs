/*
 * Paneles de plataforma (SOS-DSN, ronda de cierre): suscripción y zona de
 * peligro, que no tenían cobertura del harness. Espejan:
 *   - app/subscription-panel.tsx (aviso del topbar + panel embebido)
 *   - app/deletion-danger-zone.tsx (superficies v2 de la zona de peligro)
 * Los clones usan las clases reales (Tailwind y las constantes del módulo) para
 * que el CSS construido mida exactamente lo que ve el usuario.
 */
const PANEL = 'grid min-w-0 gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 max-md:p-4';
const DATES = 'grid gap-2 sm:grid-cols-2 xl:grid-cols-3';
const DATE_CARD = 'grid min-w-0 gap-0.5 rounded-lg border border-ink-600 bg-ink-700 px-3 py-2';
const DATE_LABEL = 'text-[11px] font-bold uppercase tracking-[.035em] text-mute';
const PRIMARY = 'primary';
const SECONDARY = 'secondary';
const FLOW = 'grid min-w-0 gap-3 rounded-xl border border-bad/25 bg-ink-800 p-4 shadow-xs';
const DETAILS = 'grid gap-3 rounded-lg border border-ink-600 bg-ink-700 p-3';
const STEP = 'flex items-start gap-3 pt-1';
const STEP_MARK = 'grid size-6 shrink-0 place-items-center rounded-full bg-bad/15 text-[11px] font-extrabold text-bad';
const INPUT = 'h-11 w-full min-w-0 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none md:text-sm';

const notice = (status,label,tone) => `
 <section class="subscription-notice inline-flex min-w-0 items-center" aria-label="Estado de la suscripción: ${label}">
  <button type="button" class="subscription-secondary inline-flex min-h-11 min-w-0 max-w-full items-center justify-center rounded-full px-3 text-[11px] font-bold leading-tight [white-space:nowrap]"><span class="${tone} inline-flex items-center gap-1 rounded-full px-2 py-1">${label}</span></button>
 </section>`;

const subscriptionPanel = (state) => `
<section class="${PANEL} subscription-panel min-w-0 max-w-full [overflow-wrap:anywhere]">
 <h2 class="text-[17px] font-semibold tracking-tight text-fore">Suscripción de Scale OS</h2>
 <header class="subscription-status subscription-status--${state.status} grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border border-l-[3px] border-ink-600 border-l-fono bg-ink-700 p-4 max-md:grid-cols-1">
  <span class="subscription-badge inline-flex min-h-6 items-center rounded-full border border-current/30 px-2 py-0.5 text-[11px] font-bold leading-tight [white-space:nowrap]" role="status">${state.badge}</span>
  <div class="grid min-w-0 gap-1"><h3 class="text-[17px] font-semibold tracking-tight text-fore">${state.title}</h3><p class="text-[13px] leading-[1.5] text-mute">${state.description}</p></div>
 </header>
 <dl class="${DATES}" aria-label="Fechas de la suscripción">
  <div class="${DATE_CARD}"><dt class="${DATE_LABEL}">Plan</dt><dd class="text-[13px] font-semibold text-fore">${state.plan}</dd></div>
  <div class="${DATE_CARD}"><dt class="${DATE_LABEL}">Vencimiento</dt><dd class="text-[13px] font-semibold tabular-nums text-fore">${state.due}</dd></div>
  <div class="${DATE_CARD}"><dt class="${DATE_LABEL}">Días para vencer</dt><dd class="text-[13px] font-semibold tabular-nums text-fore">${state.days}</dd></div>
 </dl>
 <div class="subscription-explainer grid gap-1 border-l-2 border-ink-600 pl-3 text-[13px] leading-[1.5] text-mute">
  <p>Después de los 30 días gratis: <strong class="text-fore">US$ 10 o Gs. 50.000 por mes, por agencia</strong>. Son precios de lanzamiento por moneda, no una conversión.</p>
  <p>Todos los integrantes y todos los módulos están incluidos. No hay cobro por usuario.</p>
 </div>
 <ol class="grid list-decimal gap-1.5 pl-5 text-xs leading-[1.45] text-mute">
  <li>Elegí el plan y confirmá el pago en el checkout seguro.</li>
  <li>Transferí el monto del plan a la cuenta de Scale OS.</li>
  <li>Enviá el comprobante por WhatsApp: administración verifica el pago y libera el mes en tu suscripción.</li>
 </ol>
 <dl class="subscription-transfer grid gap-1 rounded-lg border border-ink-600 bg-ink-800 p-3" aria-label="Datos para la transferencia">
  <div class="flex items-baseline justify-between gap-3"><dt class="shrink-0 text-xs text-mute">Titular</dt><dd class="min-w-0 text-right text-[12.5px] font-semibold tabular-nums">Scale OS S.A.</dd></div>
  <div class="flex items-baseline justify-between gap-3"><dt class="shrink-0 text-xs text-mute">RUC</dt><dd class="subscription-transfer-code min-w-0 whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums">80012345-6</dd></div>
  <div class="flex items-baseline justify-between gap-3"><dt class="shrink-0 text-xs text-mute">Cuenta</dt><dd class="subscription-transfer-code min-w-0 whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums">001-0023456789</dd></div>
 </dl>
 <div class="flex flex-wrap items-center gap-2">
  <button type="button" class="${PRIMARY}">Pagar con tarjeta</button>
  <button type="button" class="${SECONDARY}">Gestionar suscripción en Stripe</button>
  <button type="button" class="text-button">Actualizar estado</button>
 </div>
 <p class="subscription-feedback mt-3 border-l-2 border-fono px-3 text-xs leading-[1.45] text-mute" role="status" aria-live="polite">Actualizamos el estado; si el pago todavía no se acreditó, se verá “verificando”.</p>
 <p class="subscription-error mt-3 rounded-lg border-l-[3px] border-bad bg-bad/10 p-3 text-[13px] text-bad" role="alert">No se pudo abrir el checkout. Intentá nuevamente.</p>
</section>`;

const deletionDanger = `
<section class="${FLOW}">
 <header class="grid min-w-0 gap-1">
  <p class="font-mono text-[10px] uppercase tracking-[.13em] text-bad">Zona de peligro</p>
  <h3 class="text-[17px] font-semibold tracking-tight text-fore">Eliminar mi cuenta</h3>
  <p class="text-[13px] leading-[1.5] text-mute">Tu identidad personal se anonimiza y se cierran tus sesiones. Los datos de las empresas se conservan según la vista previa del servidor.</p>
 </header>
 <div class="${DETAILS}">
  <h4 class="text-[13px] font-semibold text-fore">Qué pasará con tu cuenta</h4>
  <ul class="grid list-disc gap-1.5 pl-5 text-xs leading-[1.45] text-mute">
   <li>Tu identidad personal será anonimizada.</li>
   <li>Todas tus sesiones serán cerradas.</li>
   <li>Los datos de las empresas se conservarán.</li>
  </ul>
  <h4 class="text-[13px] font-semibold text-fore">Impacto en tus empresas</h4>
  <div class="grid gap-2" role="list">
   <article class="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-800 p-2.5" role="listitem">
    <strong class="text-xs text-fore">Estudio de Comunicación y Producción del Paraguay S.A.</strong>
    <p class="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">Propietario · 12 miembros activos · 2 dueños activos</p>
    <p class="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">Tu acceso se desactiva.</p>
   </article>
   <article class="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-800 p-2.5" role="listitem">
    <strong class="text-xs text-fore">Agencia Demo</strong>
    <p class="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">Administrador · 4 miembros activos · 1 dueño activo</p>
    <p class="m-0 text-[11px] leading-[1.45] text-mute [overflow-wrap:anywhere]">La empresa queda sin dueños activos: se transfiere o se desactiva.</p>
   </article>
  </div>
 </div>
 <div class="${STEP}"><span class="${STEP_MARK}">1</span><div class="grid min-w-0 gap-2"><strong class="text-[13px] text-fore">Confirmá tu identidad</strong><input class="${INPUT}" type="password" aria-label="Contraseña actual" placeholder="Contraseña actual" value=""/><button type="button" class="${SECONDARY} max-md:w-full">Confirmar con contraseña</button></div></div>
 <div class="${STEP}"><span class="${STEP_MARK}">2</span><div class="grid min-w-0 gap-2"><strong class="text-[13px] text-fore">Escribí ELIMINAR para confirmar</strong><input class="${INPUT}" aria-label="Confirmación de eliminación" placeholder="ELIMINAR" value=""/><button type="button" class="primary max-md:w-full">Eliminar mi cuenta</button></div></div>
 <p class="m-0 rounded-lg border border-ink-600 bg-ink-700 p-3 text-xs leading-5 text-mute">La eliminación se procesa al instante y no se puede deshacer desde la app.</p>
 <p class="m-0 rounded-lg border-l-[3px] border-bad bg-bad/10 p-3 text-xs leading-5 text-fore" role="alert">Quedan 2 dueños activos en otras empresas: revisá quién queda a cargo antes de continuar.</p>
</section>`;

export default [
  {id: 'shell-suscripcion-aviso', section: 'Plataforma', surface: 'Aviso de suscripción (topbar)', kind: 'workspace', body: `<div class="grid gap-3">${notice('trialing', 'Prueba · faltan 3 días', 'bg-fono/15 text-fono-light')}${notice('grace', 'Pago pendiente · vence hoy', 'bg-warn/15 text-warn')}${notice('suspended', 'Acceso suspendido', 'bg-bad/15 text-bad')}</div>`},
  {id: 'shell-suscripcion-panel', section: 'Plataforma', surface: 'Panel de suscripción (prueba)', kind: 'workspace', body: subscriptionPanel({status: 'trialing', badge: 'Prueba', title: 'Tu prueba de 30 días', description: 'Estás en los 30 días gratis. Podés pagar cuando quieras: al terminar, si no hay pago, el acceso pasa a pendiente.', plan: 'Lanzamiento · mensual', due: '30-sept-26', days: '3 días'})},
  {id: 'shell-peligro-eliminacion', section: 'Plataforma', surface: 'Zona de peligro', kind: 'workspace', body: deletionDanger},
];
