/*
 * Densidad integral (#97, SOS-DSN) — primitivos y patrones del sistema.
 *
 * Fixtures de medición y evidencia para: ritmo de página (`.workspace-content`),
 * grilla de tarjetas con el piso compacto (`--ui-card-min-height`), barra de
 * lote contextual (`BulkBar` de app/ui-v2), diálogo con contenido corto
 * (encabezado/pie de app/dialog.css) y el título único de la pantalla
 * (`PageTitleContext`: el shell publica el título y `PageHeader` no lo repite).
 *
 * El markup espeja los componentes reales con datos de estrés.
 */
const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const plus = icon('<path d="M5 12h14"/><path d="M12 5v14"/>', 18);

const card = (title, body) => `
<article class="ops-card person-hub-card">
 <header class="person-hub-head"><span class="person-container person-container-md"><span class="person-container-avatar" aria-hidden="true">FD</span><span class="person-container-details"><span class="person-container-name">${title}</span><span class="person-container-secondary">${body.split(' · ')[0]}</span></span></span><span class="state-chip">Activo</span></header>
 <p class="form-note">${body}</p>
</article>`;

const grid = (cards, cols = 'repeat(auto-fill,minmax(min(100%,250px),1fr))') => `<div class="ops-grid" style="grid-template-columns:${cols}">${cards}</div>`;

/* Barra de lote contextual: sin selección no dibuja nada (BulkBar). */
const bulkBar = (count, total = 24) => count
  ? `<div class="bulk-bar" role="status" aria-live="polite"><span class="bulk-count"><b>${count}</b> de ${total} seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="secondary">Archivar</button><button type="button" class="secondary">Reactivar</button><button type="button" class="text-button">Limpiar</button></div></div>`
  : '';

/* Antes/después del ritmo de página en el mismo documento: el marco «antes»
   conserva las utilidades Tailwind que llegaban a 48 px en xl; el «después»
   usa el token `--ui-page-padding` (16 móvil / 24 md / 32 xl). */
const pageFrame = (ritmo, wrapper, topbar) => `
<div class="shell control-shell" data-ritmo="${ritmo}">
 <section class="content flex min-h-dvh min-w-0 flex-1 flex-col">
  <div class="${topbar}" role="toolbar" aria-label="Controles del espacio de trabajo"><span>Empresa de prueba</span><span class="icon-button">${icon('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>')}</span></div>
  <div class="${wrapper}">
   <div class="ops-stack">
    <section class="panel"><div class="panel-heading"><h2>Título de la página</h2><span>CONTEXTO</span></div><p class="form-note">El gutter de página sale de <code>--ui-page-padding</code> (16 móvil / 24 md / 32 xl).</p></section>
    <section class="panel"><div class="panel-heading"><h2>Segunda sección</h2></div><p class="form-note">Separación entre secciones: <code>--ui-section-gap</code> (16–24).</p></section>
   </div>
   <div class="mt-auto pt-6"><footer class="workspace-footer border-t border-fore/10 px-4 py-3 text-center text-[11px] text-mute" data-testid="product-footer"><span>© 2026 Scale OS. Todos los derechos reservados. · v1.0.147</span></footer></div>
  </div>
 </section>
</div>`;

export default [
  {
    id: 'densidad-pagina',
    section: 'Densidad',
    surface: 'Ritmo de página y cabecera (#97)',
    kind: 'plain',
    body: `
<div class="grid gap-3">
 <p class="form-note" style="padding:8px 12px">Arriba: marco <b>antes</b> (utilidades Tailwind, xl = 48 px). Abajo: marco <b>después</b> (token de página).</p>
 ${pageFrame('antes', 'flex min-w-0 flex-1 flex-col px-4 pb-8 pt-5 md:px-6 md:pb-6 md:pt-4 lg:px-8 xl:px-12', 'workspace-topbar flex min-h-14 items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 px-4 py-2 md:px-6 lg:px-8 xl:px-12')}
 ${pageFrame('despues', 'workspace-content flex min-w-0 flex-1 flex-col', 'workspace-topbar flex min-h-14 items-center justify-between gap-3 border-b border-ink-600 bg-ink-800/95 py-2')}
</div>`,
  },
  {
    id: 'densidad-lote',
    section: 'Densidad',
    surface: 'Selección contextual: sin selección vs. con selección (#97)',
    kind: 'plain',
    body: `
<div class="grid gap-4 p-4">
 <section class="panel" data-bulk-scenario="sin-seleccion">
  <div class="panel-heading"><h2>Sin selección</h2><span>LA BARRA NO EXISTE</span></div>
  ${bulkBar(0)}
  ${grid(card('Memoria SD 128 GB', 'Depósito · Estante A'), 'repeat(auto-fill,minmax(min(100%,220px),1fr))')}
 </section>
 <section class="panel" data-bulk-scenario="con-seleccion">
  <div class="panel-heading"><h2>Con selección</h2><span>UNA LÍNEA, 40/44 PX</span></div>
  ${bulkBar(3)}
  ${grid(card('Memoria SD 128 GB', 'Depósito · Estante A'), 'repeat(auto-fill,minmax(min(100%,220px),1fr))')}
 </section>
</div>`,
  },
  {
    id: 'densidad-tarjetas',
    section: 'Densidad',
    surface: 'Cards con piso compacto, sin espacios muertos (#97)',
    kind: 'plain',
    body: `
<div class="grid gap-4 p-4">
 <section class="panel">
  <div class="panel-heading"><h2>Cuadrícula de personas</h2><span>PISO COMPACTO</span></div>
  ${grid([
    card('Ana Benítez', 'Contabilidad · ana.benitez@estudio.com.py'),
    card('Carlos Ramírez', 'Producción · carlos.ramirez@estudio.com.py'),
    card('Lucía Ferreira', 'Comercial · lucia.ferreira@estudio.com.py'),
    card('Marcos Giménez', 'Edición · marcos.gimenez@estudio.com.py'),
  ].join(''))}
 </section>
 <section class="panel">
  <div class="panel-heading"><h2>Tarjetas del sistema</h2><span>FINANZAS / PLANES / PRESUPUESTOS / COMISIONES</span></div>
  <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))">
   <article class="finance-account-card"><b>Cuenta corriente</b><span class="form-note">Gs. 12.345.678</span><div class="inline-actions"><button type="button" class="text-button">Ver movimientos</button></div></article>
   <article class="catalog-card"><h3>Plan mensual · Redes</h3><p class="form-note">12 publicaciones por mes</p><div class="inline-actions"><button type="button" class="text-button">Editar</button></div></article>
   <article class="budget-hub-card"><b>Presupuesto 2026-014</b><span class="form-note">Gs. 4.500.000 · Enviado</span><div class="inline-actions"><button type="button" class="text-button">Abrir</button></div></article>
   <article class="commission-hub-card"><b>Comisión · venta directa</b><span class="form-note">10 % · Gs. 450.000</span><div class="inline-actions"><button type="button" class="text-button">Liquidar</button></div></article>
  </div>
 </section>
</div>`,
  },
  {
    id: 'densidad-dialogo',
    section: 'Densidad',
    surface: 'Diálogo con contenido corto: encabezado y pie compactos (#97)',
    kind: 'plain',
    body: `
<div class="ops-overlay" style="position:static;padding:16px">
 <section class="ops-dialog unified-dialog" data-dialog-size="compact" role="dialog" aria-label="Preferencias de avisos">
  <div class="dialog-heading"><h2>Preferencias de avisos</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${icon('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 18)}</button></div>
  <div class="dialog-body"><p class="form-note">Estas preferencias solo afectan tu usuario en esta empresa. El encabezado mide 56 px (antes 68) y el cuerpo usa el padding de card: sin aire de más cuando el contenido es corto.</p></div>
  <div class="dialog-footer"><div class="dialog-actions"><button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Guardar</button></div></div>
 </section>
</div>`,
  },
  {
    id: 'densidad-titulo',
    section: 'Densidad',
    surface: 'Un solo título por pantalla (#97)',
    kind: 'plain',
    body: `
<div class="grid gap-3 p-4">
 <section class="panel" data-title-scenario="shell-y-seccion">
  <div class="panel-heading"><h2>Shell + sección</h2><span>UN TÍTULO</span></div>
  <header class="workspace-page-header mb-4 flex flex-wrap items-start justify-between gap-4"><div class="page-heading flex min-w-0 items-center gap-2"><h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">Comisiones y referidos</h1></div><div class="header-actions flex flex-wrap items-center gap-2"><button type="button" class="primary">${plus}Comisión</button></div></header>
  <header class="ui-page-header flex flex-wrap items-start justify-between gap-x-4 gap-y-3"><div class="ui-page-header-main min-w-0 flex-1 xl:flex xl:items-center xl:gap-3"><p class="ui-page-header-subtitle text-[13px] leading-[1.5] text-mute" title="Liquidación del mes, comisiones por venta o recomendación, descuentos y egresos registrados.">Liquidación del mes, comisiones por venta o recomendación, descuentos y egresos registrados.</p></div></header>
 </section>
</div>`,
  },
];
