/*
 * Pantalla de carga (SOS-DSN, addendum de la ronda de responsividad).
 * Espeja `app/loading-screen.tsx`: tarjeta v2 con el orbe de marca, la
 * identidad cuando la sesión ya se conoce y una variante neutra cuando
 * todavía no hay usuario. La barra es `.loading-bar-fill` (app/tailwind.css).
 */
const person = (name, secondary) => `<span class="person-container person-container-md"><span class="person-container-avatar" aria-hidden="true">FD</span><span class="person-container-details"><span class="person-container-name" title="${name}">${name}</span><span class="person-container-secondary" title="${secondary}">${secondary}</span></span></span>`;

const card = (identity) => `
<div class="loading-page" role="status" aria-live="polite">
 <div class="flex w-full max-w-[22rem] min-w-0 flex-col items-center gap-4 rounded-2xl border border-ink-600 bg-ink-800/95 px-6 py-7 text-center shadow-[0_24px_60px_rgb(37_28_41_/_12%)] max-md:px-5" data-loading-card>
  <span class="loading-orb"><img src="/brand/icon-192.png" width="46" height="46" alt=""></span>
  <span class="workspace-wordmark">scale<span>OS</span></span>
  ${identity
    ? `<div class="flex w-full min-w-0 flex-col items-center gap-3 border-t border-ink-600 pt-4">${person('Fredd D.', 'Propietario')}<p class="text-[11.5px] text-mute">Cargando tu espacio…</p></div>`
    : '<p class="text-[11.5px] text-mute">Un momento, estamos preparando todo…</p>'}
  <span class="h-1 w-28 overflow-hidden rounded-full bg-ink-700" aria-hidden="true"><span class="loading-bar-fill block h-full w-1/2 rounded-full bg-fono"></span></span>
 </div>
</div>`;

export default [
  {id: 'shell-loading-neutro', section: 'Shell', surface: 'Carga (sin sesión)', kind: 'plain', body: card(false)},
  {id: 'shell-loading-usuario', section: 'Shell', surface: 'Carga (con sesión)', kind: 'plain', body: card(true)},
];
