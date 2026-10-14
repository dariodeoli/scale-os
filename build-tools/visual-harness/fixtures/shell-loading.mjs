/*
 * Pantalla de carga (SOS-DSN, addendum de la ronda de responsividad; issue #64).
 * Espeja `app/loading-screen.tsx`: tarjeta v2 con la marca estática
 * (`WorkspaceBrand`, sin orbe ni anillo giratorio), la identidad cuando la
 * sesión ya se conoce y una variante neutra cuando todavía no hay usuario. La
 * barra va debajo del nombre y es la única animación (`.loading-bar-fill`,
 * app/tailwind.css), apagada con `prefers-reduced-motion`.
 */
const person = (name, secondary) => `<span class="person-container person-container-md"><span class="foto-perfil" aria-hidden="true">${name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span><span class="person-container-secondary" title="${secondary}">${secondary}</span></span></span>`;
const brand = `<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span>`;
const bar = `<span class="h-1.5 w-40 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span class="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"></span></span>`;

const card = (identity) => `
<div class="loading-page" role="status" aria-live="polite">
 <div class="loading-stage flex w-full max-w-[20rem] min-w-0 flex-col items-center gap-6 text-center" data-loading-card>
  <span class="loading-brand">${brand}</span>
  ${identity ? `<span class="max-w-full rounded-full border border-ink-600 bg-ink-800/80 py-1.5 pl-1.5 pr-4 shadow-[0_10px_30px_rgb(37_28_41_/_8%)]">${person('Lucía Acosta', 'Propietaria')}</span>` : ''}
  <div class="flex w-full min-w-0 flex-col items-center gap-2.5">
   ${bar}
   <p class="text-[12px] text-mute">${identity ? 'Cargando tu espacio…' : 'Un momento, estamos preparando todo…'}</p>
  </div>
 </div>
</div>`;

export default [
  {id: 'shell-loading-neutro', section: 'Shell', surface: 'Carga (sin sesión)', kind: 'plain', body: card(false)},
  {id: 'shell-loading-usuario', section: 'Shell', surface: 'Carga (con sesión)', kind: 'plain', body: card(true)},
];
