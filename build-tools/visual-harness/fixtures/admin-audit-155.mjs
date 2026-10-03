/*
 * Auditoría #155 (SOS-DSN) — estados del panel global tal como están en
 * `origin/main` v1.0.168. Complementa `admin-redesign.mjs` (vistas pobladas) y
 * reemplaza a `v2-plt-superadmin-estados` para esta auditoría.
 *
 * Espeja `app/superadmin/page.tsx` (encabezado con chip de permiso real y
 * acciones condicionales, #147) y `app/superadmin/states.tsx` (acceso denegado
 * con motivo, avisos de diagnóstico y error).
 */
const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const I = {
  shield: icon('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>', 17),
  alert: icon('<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>', 17),
  triangle: icon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>', 17),
  back: icon('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>', 14),
  refresh: icon('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
};
const brand = '<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>';
const chip = (text, tone = 'mute', title = '') => {
  const tones = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
  return `<span class="badge badge-${tones[tone] || 'slate'} whitespace-nowrap"${title ? ` title="${title}"` : ''}>${text}</span>`;
};
const head = ({state = 'ok', updated = '18:12'} = {}) => `
<header class="platform-admin-header">
 <a class="platform-admin-brand" href="#" aria-label="Scale OS">${brand}</a>
 <div class="platform-admin-identity"><p class="eyebrow">Administración global</p><h1>Control de Scale OS</h1></div>
 <div class="platform-admin-meta">
  ${state === 'denied' ? chip('Acceso denegado', 'bad') : state === 'readonly' ? chip('Solo lectura', 'info', 'Tu usuario solo puede consultar la plataforma') : chip('Admin global', 'ok', 'Tu usuario puede administrar la plataforma')}
  ${state === 'denied' ? '' : `<span class="platform-admin-updated" title="Última actualización ${updated} (hora de Asunción)">Actualizado ${updated}</span>`}
 </div>
 <div class="platform-admin-actions">
  ${state === 'denied' ? '' : `<button type="button" class="secondary">${I.refresh}Actualizar</button>`}
  <a class="secondary" href="#">${I.back}Panel</a>
 </div>
</header>`;
const denied = `
<section class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 border-bad/30" role="alert">
 <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-bad" aria-hidden="true">${I.shield}</span>
 <div class="min-w-0">
  <b class="block text-[13.5px] font-semibold text-fore">No tenés acceso global</b>
  <p class="mt-0.5 text-xs text-mute">Tu cuenta de demo no tiene acceso al panel global de la plataforma.</p>
  <a class="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" href="#">${I.back}Volver al panel</a>
 </div>
</section>`;
const notices = `
<div class="grid gap-3">
 <p class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[12px] leading-[1.45] text-mute">${I.shield}<strong class="font-semibold text-fore">Acceso separado por plataforma.</strong><span>Ser dueño de una agencia no habilita este panel ni sus datos.</span></p>
 <section class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3 border-warn/40" role="status">
  <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-warn" aria-hidden="true">${I.triangle}</span>
  <div class="min-w-0"><b class="block text-[13.5px] font-semibold text-fore">Primer acceso global pendiente</b><p class="mt-0.5 text-xs text-mute" title="Este diagnóstico no expone correos ni secretos.">La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia.</p></div>
 </section>
 <section class="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3" role="alert">
  <span class="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-bad" aria-hidden="true">${I.alert}</span>
  <div class="min-w-0"><b class="block text-[13.5px] font-semibold text-fore">No pudimos actualizar el control global</b><span class="mt-1 inline-flex items-start gap-2 rounded-lg border border-bad/30 bg-bad/10 px-2.5 py-1.5 text-[12px] leading-[1.4] text-fore">La sesión venció. Volvé a iniciar sesión para reintentar.</span></div>
 </section>
</div>`;
const tabs = (active = 'resumen') => `
<div class="platform-admin-tabs silent-scroll">
 <div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1 w-max flex-nowrap" role="group" aria-label="Secciones del panel global">
 ${[['resumen', 'Resumen', ''], ['agencias', 'Agencias', '4'], ['cupones', 'Cupones', '3'], ['accesos', 'Accesos', '3'], ['auditoria', 'Auditoría', '50']].map(([id, label, count]) => `<button type="button" aria-pressed="${id === active}" aria-label="${label}${count ? ` (${count})` : ''}" title="${label}" class="inline-flex min-h-11 flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium md:min-h-8 ${id === active ? 'bg-fono/15 text-fono-text' : 'text-mute'}">${label}${count ? `<span class="text-xs opacity-75">${count}</span>` : ''}</button>`).join('')}
 </div>
</div>`;
const readonlyAgencies = `
<section class="grid min-w-0 gap-3">
 <div class="flex min-w-0 flex-wrap items-center justify-between gap-2"><h2 class="text-[15px] font-semibold tracking-tight text-fore">Agencias</h2><span class="text-xs tabular-nums text-mute" role="status">4 de 134 agencias</span></div>
 <div role="table" aria-label="Agencias" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[70.5rem]">
  <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]"><span role="columnheader">Agencia</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Plan</span><span role="columnheader" class="text-right">Usuarios</span><span role="columnheader">Prueba / vencimiento</span><span role="columnheader" class="text-right">Acciones</span></div>
  <div role="rowgroup">${[
    ['Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', 'estudio-comunicacion-py', 'Gs. 50.000', '12', '03-oct'],
    ['Cooperativa Multiactiva de Servicios Múltiples Limitada', 'coop-servicios-ltda', 'USD 10,00', '34', '30-nov'],
    ['Agencia Creativa del Sur S.A.', 'agencia-creativa-sur', 'Gs. 50.000', '3', '20-sept'],
  ].map(([name, slug, amount, users, expiry]) => `<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]"><div role="cell" class="min-w-0"><b class="list-identity text-fore" title="${name}">${name}</b><small class="list-secondary" title="${slug}">${slug}</small></div><div role="cell" class="flex min-w-0 flex-wrap items-center gap-1.5">${chip('Activa', 'ok')}</div><span role="cell" class="text-right"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-fore">${amount}</span></span><span role="cell" class="text-right text-[12.5px] font-semibold tabular-nums text-fore">${users}</span><span role="cell" class="list-date min-w-0">${expiry}</span><span role="cell" class="list-actions text-right text-[11.5px] text-mute" title="Solo lectura: no hay acciones de escritura">Solo lectura</span></div>`).join('')}</div>
 </div></div>
 <p class="text-[11.5px] text-mute">Con «Solo lectura» desaparecen las acciones mutantes; el API igual revalida cada operación.</p>
</section>`;

export default [
  {
    id: 'admin155-denegado',
    section: 'Superadmin',
    surface: 'Acceso denegado real: chip, motivo y sin refresco (#147)',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell">${head({state: 'denied'})}${denied}</main>`,
  },
  {
    id: 'admin155-avisos',
    section: 'Superadmin',
    surface: 'Avisos de diagnóstico: acceso separado, bootstrap y error de sesión',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell">${head()}${notices}</main>`,
  },
  {
    id: 'admin155-solo-lectura',
    section: 'Superadmin',
    surface: 'Permiso de lectura: chip «Solo lectura», acciones ocultas y conteos',
    kind: 'plain',
    body: `<main class="platform-admin-page control-shell">${head({state: 'readonly'})}${tabs('agencias')}${readonlyAgencies}</main>`,
  },
];
