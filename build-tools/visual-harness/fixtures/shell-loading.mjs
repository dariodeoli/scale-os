/*
 * Pantalla de carga (SOS-DSN, addendum de la ronda de responsividad; issue #64).
 * Espeja `app/loading-screen.tsx`: tarjeta v2 con la marca estática
 * (`WorkspaceBrand`, sin orbe ni anillo giratorio), la identidad cuando la
 * sesión ya se conoce y una variante neutra cuando todavía no hay usuario. La
 * barra va debajo del nombre y es la única animación (`.loading-bar-fill`,
 * app/tailwind.css), apagada con `prefers-reduced-motion`.
 */
const person = (name, secondary) => `<span class="person-container person-container-md"><span class="person-container-avatar" aria-hidden="true">FD</span><span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span><span class="person-container-secondary" title="${secondary}">${secondary}</span></span></span>`;
const brand = `<span class="workspace-brand" aria-label="Scale OS"><img src="/brand/icon-192.png" width="34" height="34" alt=""><span class="workspace-wordmark">scale<span>OS</span></span></span>`;
const bar = `<span class="h-1 w-28 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span class="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"></span></span>`;

const card = (identity) => `
<div class="loading-page" role="status" aria-live="polite">
 <div class="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800/95 px-6 py-7 text-center shadow-[0_24px_60px_rgb(37_28_41_/_12%)] max-md:px-5" data-loading-card>
  ${brand}
  <div class="flex w-full min-w-0 flex-col items-center gap-3 border-t border-ink-600 pt-4">
   ${identity ? person('Fredd D.', 'Propietario') : ''}
   ${bar}
   <p class="text-[11.5px] text-mute">${identity ? 'Cargando tu espacio…' : 'Un momento, estamos preparando todo…'}</p>
  </div>
 </div>
</div>`;

export default [
  {id: 'shell-loading-neutro', section: 'Shell', surface: 'Carga (sin sesión)', kind: 'plain', body: card(false)},
  {id: 'shell-loading-usuario', section: 'Shell', surface: 'Carga (con sesión)', kind: 'plain', body: card(true)},
];
