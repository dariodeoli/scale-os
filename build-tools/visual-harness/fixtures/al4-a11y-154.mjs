/*
 * Fixtures a11y de la campaña #154 (SOS-DSN): el texto de acción (`text-button`)
 * sobre las dos superficies donde el audímetro marcó AA en oscuro.
 * Reproduce los colores reales del tema (`#121216` canvas, `#272730` tarjeta)
 * y el mismo markup del primitivo; se mide con CONTRAST_JS en data-theme=dark.
 */
export default [
  {
    id: '154-text-button-canvas',
    section: 'Sistema de diseño',
    surface: 'text-button sobre canvas oscuro (caso «Filtros»)',
    kind: 'plain',
    body: '<main class="control-shell" style="background:rgb(var(--c-paper));color:rgb(var(--c-fore));padding:24px;min-height:120px"><button type="button" class="text-button">Filtros</button></main>',
  },
  {
    id: '154-text-button-tarjeta',
    section: 'Sistema de diseño',
    surface: 'text-button sobre tarjeta oscura (caso «Ver los N sin plan»)',
    kind: 'plain',
    body: '<main class="control-shell" style="background:rgb(var(--c-ink-800));color:rgb(var(--c-fore));padding:24px;min-height:120px"><span class="text-[12px] text-mute" style="color:rgb(var(--c-mute))">Facturación contratada · </span><button type="button" class="text-button">Ver los 9 sin plan</button></main>',
  },
];
