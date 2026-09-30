/*
 * Fotos de perfil — sin autozoom/autoencuadre (#107, SOS-DSN).
 *
 * Evidencia de las superficies con avatar de persona con DOS fotos reales
 * (una vertical y una horizontal) y las dos etapas:
 *   - «antes»: la subida guardaba un cuadrado centrado (recortaba la cabeza en
 *     verticales) y el avatar lo mostraba con `cover` centrado.
 *   - «después»: la subida guarda la foto completa y el avatar encuadra desde
 *     el borde superior (`object-position:center top`).
 *
 * Las imágenes son SVG inline (mismo motor de `object-fit` que una foto):
 * dibujan una cabeza en el tercio superior para que el recorte se vea.
 *
 * Espeja `app/profile-photo.tsx`, `app/person-photo.tsx`, `app/operations.tsx`
 * (Equipo), `app/actor-identity.tsx` (comentarios/actividad/Salarios),
 * `app/presence.tsx` y `app/client-identity.css` (logo de cliente, `contain`).
 */
const drawing = (viewBox, label, labelX = 150, labelY = 382) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><rect width="100%" height="100%" fill="#cbb7d6"/><circle cx="150" cy="118" r="46" fill="#6b4a7a"/><path d="M60 400c0-70 40-120 90-120s90 50 90 120z" fill="#4d065b"/><text x="${labelX}" y="${labelY}" font-family="Arial" font-size="17" font-weight="bold" fill="#fff" text-anchor="middle">${label}</text></svg>`)}`;

// Vertical 300×400 con la cabeza arriba; su cuadrado centrado es el «antes».
const vertical = drawing('0 0 300 400', 'VERTICAL');
const horizontal = drawing('0 0 400 300', 'HORIZONTAL', 200, 286);
const square = drawing('0 75 300 300', 'CUADRADO', 150, 290);

/** Imagen del avatar; el «antes» fuerza el encuadre centrado original. */
const img = (src, antes = false) => `<img src="${src}" alt=""${antes ? ' style="object-position:center"' : ''}/>`;

const cell = (titulo, contenido) => `
<div class="grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3">
 <p class="font-mono text-[10px] uppercase tracking-[.12em] text-mute">${titulo}</p>
 <div class="flex min-h-[56px] min-w-0 flex-wrap items-center gap-3">${contenido}</div>
</div>`;

const fila = (superficie, render) => `
<section class="panel">
 <div class="panel-heading"><h2>${superficie}</h2><span>ANTES · DESPUÉS</span></div>
 <div class="grid min-w-0 gap-3 lg:grid-cols-3">
  ${cell('Antes (cuadrado centrado + cover centrado)', render(img(square, true)))}
  ${cell('Después (vertical completa, encuadre superior)', render(img(vertical)))}
  ${cell('Después (horizontal completa)', render(img(horizontal)))}
 </div>
</section>`;

const container = (src) => `<span class="person-container person-container-md"><span class="foto-perfil foto-perfil-lg foto-perfil-circulo foto-perfil-persona">${src}</span><span class="person-container-details"><span class="person-container-name">Ana Benítez</span><span class="person-container-secondary">Producción</span></span></span>`;
// Fila densa de Equipo: el avatar va dentro del contenedor de persona (markup real).
const opsPerson = (src) => `<div class="ops-person" title="Carlos Ramírez"><span class="person-container person-container-md"><span class="foto-perfil foto-perfil-lg foto-perfil-circulo foto-perfil-persona">${src}</span><span class="person-container-details"><span class="person-container-name" title="Carlos Ramírez">Carlos Ramírez</span><span class="person-container-secondary" title="Producción">Producción</span></span></span></div>`;
const actor = (src, cls = '') => `<span class="actor-identity ${cls}"><span class="foto-perfil foto-perfil-lg foto-perfil-circulo foto-perfil-persona">${src}</span><span class="actor-identity-details"><span class="actor-identity-name">Lucía Ferreira</span><time class="actor-identity-time">29 sept 26 · 18:12</time></span></span>`;
const presence = (src) => `<span class="presence-avatars"><span class="presence-person"><span class="foto-perfil foto-perfil-sm foto-perfil-circulo foto-perfil-persona">${src}</span><i data-active="true"></i></span><span class="presence-more">+2</span></span>`;
const editable = (src) => `<span class="profile-photo-summary"><span class="foto-perfil foto-perfil-3xl foto-perfil-circulo foto-perfil-persona">${src}</span><span class="profile-photo-controls"><span class="photo-upload">Cambiar foto</span></span></span>`;
const footer = (src) => `<div class="profile-footer"><span class="user"><span class="foto-perfil foto-perfil-lg foto-perfil-circulo foto-perfil-persona">${src}</span><span><b>Lucía Acosta</b><small>Propietaria</small></span></span></div>`;
const logo = (src) => `<span class="client-identity"><span class="foto-perfil foto-perfil-xl foto-perfil-circulo foto-perfil-logo">${src}</span><span class="identity-name">Estudio de Comunicación</span></span>`;

export default [
  {
    id: 'fotos-perfil',
    section: 'Sistema de diseño',
    surface: 'Fotos de perfil: antes/después por superficie (#107)',
    kind: 'plain',
    body: `<div class="grid gap-4 p-4">
 <p class="form-note">Cada fila usa la misma foto vertical (300×400, cabeza en el tercio superior): a la izquierda el cuadrado centrado que se guardaba antes con el encuadre centrado; al centro y a la derecha, la foto completa con el encuadre nuevo (el círculo toma desde el borde superior). El logo de cliente conserva <code>contain</code> (no aplica el encuadre de personas).</p>
 ${fila('Perfil propio · 64 px', editable)}
 ${fila('Equipo · tarjeta (PersonContainer)', container)}
 ${fila('Equipo · lista densa (ops-person 48 px)', opsPerson)}
 ${fila('Salarios / Previsión (ActorAvatar 32 px)', actor)}
 ${fila('Actividad y comentarios (feed 24 px)', (src) => `<span class="activity-feed-row">${actor(src)}</span>`)}
 ${fila('Presencia (30 px)', presence)}
 ${fila('Riel · pie de usuario (36 px)', footer)}
 ${fila('Cliente · logo (contain, sin cambios)', logo)}
</div>`,
  },
];
