/*
 * Pase de compactación desktop (#89, SOS-DSN) — primitivos del sistema.
 *
 * Fixtures de medición y evidencia para: fila de encabezado + acciones
 * (app/scale-workspace.tsx ~1048-1080 y app/ui-v2.tsx `PageHeader`), tabs de
 * sección (`nav.section-tabs`, ~1086), KPIs (`app/ui-v2.tsx` `Kpi`/`KpiStrip`
 * sobre `Stat` de owncoding-ui), toolbar de filtros (`FilterToolbar`) y
 * contenedores (`panel`, `ops-card`).
 *
 * Datos de estrés: títulos largos, contadores, hints largos y acciones
 * múltiples (el peor caso de cada fila).
 */
const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const plus = icon('<path d="M5 12h14"/><path d="M12 5v14"/>', 18);

/* ── Fila de encabezado del shell (título + contador + acciones) ───────────── */
const pageHeader = ({title, count = '', actions = '', subtitle = ''} = {}) => `
<header class="workspace-page-header mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-4 md:gap-y-2 max-md:grid max-md:grid-cols-1">
 <div class="page-heading flex min-w-0 items-center gap-2">
  <h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">${title}</h1>
  ${count ? `<span class="page-count rounded-full bg-ink-700 px-2 py-0.5 text-[11px] tabular-nums text-mute">${count}</span>` : ''}
  ${subtitle ? `<p class="page-subtitle hidden text-[13px] leading-[1.5] text-mute xl:block xl:line-clamp-1" title="${subtitle}">${subtitle}</p>` : ''}
 </div>
 <div class="header-actions flex flex-wrap items-center gap-2 max-md:w-full max-md:justify-start">
  ${actions}
 </div>
</header>`;

/* ── Tabs de sección (nav.section-tabs del shell) ──────────────────────────── */
const sectionTabs = (labels, active) => `
<nav class="section-tabs [&>a]:no-underline" aria-label="Apartados de ${labels[0]}">
 ${labels.map(label => `<a href="#"${label === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
</nav>`;

/* ── Kpi/KpiStrip de app/ui-v2.tsx sobre Stat de owncoding-ui ──────────────── */
const kpi = ({label, valor, hint = '', destacado = false}) => `
<div class="ui-kpi relative overflow-hidden rounded-xl border p-4 ${destacado ? 'border-fono/30 bg-gradient-to-br from-fono-dark via-fono to-fono' : 'border-ink-600 bg-ink-800'}">
 <div class="text-[11px] font-medium uppercase tracking-wider ${destacado ? 'text-onbrand/75' : 'text-mute'}">${label}</div>
 <div class="v2-numero mt-1.5 text-2xl font-semibold md:text-3xl ${destacado ? 'text-onbrand' : 'text-fore'}">${valor}</div>
 ${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="min-w-0 flex-1 truncate ${destacado ? 'text-onbrand/75' : 'text-mute'}" title="${hint}">${hint}</span></div>` : ''}
</div>`;

const kpiStrip = items => `<div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas">${items.join('')}</div>`;

/* ── FilterToolbar de app/ui-v2.tsx ───────────────────────────────────────── */
const filterToolbar = ({summary = '', children}) => `
<div data-toolbar="filtros" class="mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap">
 ${children}
 ${summary ? `<p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">${summary}</p>` : ''}
</div>`;
const searchField = (placeholder, label) => `
<div class="search-field grid gap-1.5"><label class="text-[12px] font-semibold text-mute">${label}</label><div class="relative"><input type="search" placeholder="${placeholder}" value="" aria-label="${label}"/></div></div>`;
const selectField = (label, options) => `
<label class="grid gap-1.5"><span class="text-[12px] font-semibold text-mute">${label}</span><select aria-label="${label}">${options.map(option => `<option>${option}</option>`).join('')}</select></label>`;

const longHint = 'Comisiones registradas o aprobadas que todavía no se pagaron al colaborador; se liquida el día 5 de cada mes.';
const mediumHint = 'Sobre las 24 facturas cargadas; “Ver todas las facturas” completa el total.';

export default [
  {
    id: 'compact-header-tabs',
    section: 'Clientes',
    surface: 'Encabezado de página + tabs de sección (#89)',
    kind: 'workspace',
    body: `${pageHeader({
      title: 'Clientes',
      count: '',
      subtitle: 'Directorio comercial con cobros, actividad y estado de cada cuenta.',
      actions: `<button type="button" class="secondary">${icon('<path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/>', 16)}Filtros</button><button type="button" class="primary">${plus}Nuevo cliente</button>`,
    })}
${sectionTabs(['Clientes', 'Cobros y estado', 'Actividad', 'Historial'], 'Clientes')}
<div class="ops-stack"><section class="panel"><div class="panel-heading"><h2>Cuentas del directorio</h2><span>24 de 120</span></div><p class="form-note">El encabezado y las tabs quedan en una sola fila en escritorio (≥1280) y las tabs conservan 44 px en móvil.</p></section></div>`,
  },
  {
    id: 'compact-kpi',
    section: 'Finanzas',
    surface: 'KPIs compactos con hint de una línea (#89)',
    kind: 'workspace',
    body: `${kpiStrip([
      kpi({label: 'Facturación contratada', valor: '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 1.234.567.890</span><span class="text-base font-medium">USD 12.345,67</span></span>', destacado: true}),
      kpi({label: 'Por cobrar', valor: '<span class="flex flex-wrap items-baseline gap-2"><span>Gs. 987.654.321</span><span class="text-base font-medium">USD 12.500</span></span>', hint: mediumHint}),
      kpi({label: 'Pendiente · 01-sept', valor: '<span>Gs. 12.000.000</span>', hint: longHint}),
      kpi({label: 'Sin datos', valor: '—', hint: 'Sin movimientos registrados en el mes'}),
    ])}
<div class="ops-stack"><section class="panel"><div class="panel-heading"><h2>Detalle del período</h2></div><p class="form-note">Los hints largos se recortan a una línea con el texto completo en tooltip; la fila de KPIs no se estira de más.</p></section></div>`,
  },
  {
    id: 'compact-toolbar',
    section: 'Proyectos',
    surface: 'Toolbar de filtros en una fila (#89)',
    kind: 'workspace',
    body: `${filterToolbar({
      summary: '18 de 42 proyectos',
      children: `${searchField('Nombre, cliente o pieza', 'Buscar')}${selectField('Cliente', ['Todos los clientes', 'Cooperativa Multiactiva de Servicios Múltiples Limitada'])}${selectField('Estado', ['Todos los estados', 'En curso', 'Pausados', 'Completados'])}<div class="choice-list compact" role="group" aria-label="Filtro rápido"><button type="button" class="choice active" aria-pressed="true">Activos</button><button type="button" class="choice" aria-pressed="false">Todos</button></div><button type="button" class="text-button">Limpiar filtros</button>`,
    })}
<section class="panel"><div class="panel-heading"><h2>Proyectos</h2></div><p class="form-note">Sin card contenedora para el buscador ni los filtros: la toolbar vive sobre el lienzo y comparte el gap del sistema.</p></section>`,
  },
  {
    id: 'compact-contenedores',
    section: 'Inventario',
    surface: 'Contenedores: panel y card (#89)',
    kind: 'workspace',
    body: `<div class="ops-stack">
 <section class="panel"><div class="panel-heading"><h2>Panel de sección</h2><span>PADDING 16–24</span></div><p class="form-note">El panel conserva su padding y su sombra; solo se ajusta lo que sobraba.</p></section>
 <article class="ops-card"><header><h3>Card operativa</h3></header><p class="form-note">Padding de card 16–20 px, acciones al pie y misma altura entre tarjetas de la fila.</p></article>
 <div role="table" aria-label="Inventario" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[48rem]"><div role="row" class="grid grid-cols-[minmax(11rem,1.6fr)_minmax(9rem,1.15fr)_7rem_auto] gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute"><span role="columnheader">Artículo</span><span role="columnheader">Ubicación</span><span role="columnheader">Estado</span><span role="columnheader" class="text-right">Acciones</span></div><div role="rowgroup"><div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-2 grid-cols-[minmax(11rem,1.6fr)_minmax(9rem,1.15fr)_7rem_auto]"><span role="cell" class="truncate">Memoria SD 128 GB</span><span role="cell" class="truncate">Estante A · Depósito</span><span role="cell">Disponible</span><span role="cell" class="list-actions">${icon('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>', 16)}</span></div></div></div></div>
</div>`,
  },
];
