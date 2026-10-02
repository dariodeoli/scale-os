/*
 * Fixtures de los patrones de la auditoría de demo (#138, SOS-DSN):
 * tarjeta compacta, menú ⋯, esqueletos con estructura y vacío compacto.
 *
 * Cada bloque espeja el JSX real:
 *   - `CompactCard` / `CompactQuickAction` / `ActionMenu` / `EmptyCompact` /
 *     `CardGridSkeleton` / `DashboardSkeleton` (app/ui-v2.tsx, #138).
 *   - Antes: la tarjeta `activity-line` de los pendientes internos
 *     (app/work-history.tsx), la fila de iconos que reemplaza el ⋯, el
 *     `LoadingBlock` genérico y el `EmptyBlock` compacto centrado.
 *   - El ⋯ abierto replica `MenuDesplegable` de owncoding-ui v0.59.0.
 *
 * Los pares `-antes` / `-despues` viven en fixtures separados para poder
 * capturar cada fase con `capture.mjs --only`.
 */
const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const eye = icon('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>');
const pencil = icon('<path d="m15 5 4 4L8 20l-5 1 1-5Z"/>');
const trash = icon('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>');
const printer = icon('<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>');
const archive = icon('<rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v11h16V9M10 13h4"/>');
const x14 = icon('<path d="M18 6 6 18M6 6l12 12"/>', 14);
const info16 = icon('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>');

const LONG_CLIENT = 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.';

/* app/actor-identity.tsx líneas 19-26 + app/assigned-people.tsx líneas 14-27 */
const actor = name => `<span class="actor-identity"><span class="foto-perfil" aria-hidden="true">${name.split(' ').map(part => part[0]).join('').slice(0, 2)}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${name}">${name}</span></span></span>`;
const assignedPeople = names => `<section class="assigned-people" aria-label="Responsables asignados"><span class="assigned-people-label">Responsables</span><ul class="assigned-people-list">${names.map((name, index) => `<li class="assigned-person">${actor(name)}${index === 0 ? '<span class="assigned-person-primary">Principal</span>' : ''}</li>`).join('')}</ul></section>`;

/* app/ui-v2.tsx `ActionMenu` (#138): disparador estándar dentro de `MenuDesplegable`. */
const menuTrigger = (label, expanded = false) => `<button type="button" aria-haspopup="menu" aria-expanded="${expanded}" class="inline-flex items-center gap-2 rounded-lg transition"><span class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7" role="img" aria-hidden="true">⋮</span><span class="sr-only">${label}</span></button>`;
/* `MenuDesplegable` abierto (owncoding-ui v0.59.0). El popup real se posiciona
   sobre la tarjeta; en el harness se muestra en flujo para medirlo sin falsos
   solapes de overlay. */
const menuList = label => `<div role="menu" aria-label="${label}" class="mt-1 min-w-48 rounded-xl border border-ink-500 bg-ink p-1 shadow-float"><button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fore transition hover:bg-ink-700">${pencil}<span class="min-w-0 flex-1 truncate">Editar pieza</span></button><button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-fore transition hover:bg-ink-700">${printer}<span class="min-w-0 flex-1 truncate">Imprimir etiqueta</span></button><div class="my-1 h-px bg-ink-600"></div><button type="button" role="menuitem" class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-bad-text transition hover:bg-bad/10">${trash}<span class="min-w-0 flex-1 truncate">Mover a la papelera</span></button></div>`;
const quickAction = label => `<button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fono md:h-7 md:w-7" title="${label}" aria-label="${label}">${eye}</button>`;
const chip = (text, color) => `<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${color} whitespace-nowrap">${text}</span>`;
const chipInfo = text => chip(text, 'bg-fono/15 text-fono-text border-fono/25');
const chipWarn = text => chip(text, 'bg-warn/15 text-warn-text border-warn/25');

/* app/ui-v2.tsx `CompactCard` + `BarraProgreso` (#138). */
const compactCard = ({title = 'Pieza', context = '', chips = '', due = '', responsible = '', progress = null, quick = '', menu = '', open = false} = {}) => `
<article data-compact-card class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3 shadow-sm">
 <header class="flex min-w-0 items-start justify-between gap-2">
  <button type="button" class="min-h-11 min-w-0 flex-1 text-left text-[13.5px] font-semibold leading-5 text-fore outline-none transition-colors hover:text-fono-light focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0" aria-label="Abrir ${title}">${title}</button>
  <span class="relative flex shrink-0 items-center gap-1">${quick}${menuTrigger(`Acciones de la pieza: ${title}`, open)}</span>
 </header>
 ${context ? `<div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-4 text-mute">${context}</div>` : ''}
 ${chips ? `<div class="flex min-w-0 flex-wrap items-center gap-1">${chips}</div>` : ''}
 ${due ? `<div class="min-w-0">${due}</div>` : ''}
 ${responsible ? `<div class="min-w-0">${responsible}</div>` : ''}
 ${progress ? `<div class="grid min-w-0 gap-1"><div class="flex min-w-0 items-center justify-between gap-2 text-[11px] text-mute"><span class="min-w-0 truncate" title="${progress.label}">${progress.label}</span><span class="shrink-0 tabular-nums">${progress.value}${progress.max !== 100 ? `/${progress.max}` : ''}</span></div><div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.value / progress.max * 100)}" aria-label="${progress.label}" class="overflow-hidden rounded-full bg-fore/10 h-1"><span class="block h-full rounded-full transition-[width] duration-500 ease-out bg-fono" style="width:${Math.round(progress.value / progress.max * 100)}%"></span></div></div>` : ''}
</article>`;

const progress = {value: 3, max: 5, label: '3/5 pasos: guion, rodaje y edición'};
const dueWarn = `<span class="whitespace-nowrap text-[11.5px] text-mute" data-tone="warn">Entrega 30-sept · venció hace 2 días</span>`;

/* Antes: tarjeta de pendientes internos (app/work-history.tsx pre-#138). */
const legacyTask = `
<article class="activity-line">
 <b>Reel de lanzamiento para la campaña de verano de la Cooperativa</b>
 <small>En curso · 30-sept</small>
 <p>Necesitamos cerrar la versión final y la corrección de color antes de la revisión del cliente; el material base ya está aprobado y la música tiene licencia vigente.</p>
 <button type="button" class="text-button">${pencil}Editar tarea</button>
</article>`;

/* Antes: fila de seis iconos sueltos (patrón que reemplaza el ⋯). */
const legacyActionRow = `
<article class="ops-card">
 <header><h3>Memoria SD 128 GB · DJI Mic 2</h3></header>
 <p class="form-note">Verificación, edición, impresión, reserva, archivo y papelera vivían como seis iconos sueltos en la misma fila.</p>
 <div class="inline-actions">
  <button type="button" class="icon-button" title="Ver detalle" aria-label="Ver detalle">${eye}</button>
  <button type="button" class="icon-button" title="Editar equipo" aria-label="Editar equipo">${pencil}</button>
  <button type="button" class="icon-button" title="Imprimir etiqueta" aria-label="Imprimir etiqueta">${printer}</button>
  <button type="button" class="icon-button" title="Mover a la papelera" aria-label="Mover a la papelera">${trash}</button>
  <button type="button" class="icon-button" title="Archivar equipo" aria-label="Archivar equipo">${archive}</button>
  <button type="button" class="icon-button" title="Verificar equipo" aria-label="Verificar equipo">${info16}</button>
 </div>
</article>`;

/* app/ui-v2.tsx `LoadingBlock` (antes) y `DashboardSkeleton` (después). */
const loadingBlock = `
<div role="status" aria-busy="true" aria-label="Cargando el panel…" class="grid gap-2">
 <div class="animate-pulse rounded-lg bg-fore/5 h-3.5 w-24 rounded-full"></div>
 ${Array.from({length: 5}, () => '<div class="animate-pulse rounded-lg bg-fore/5 h-11 w-full rounded-xl"></div>').join('')}
</div>`;
const kpiSkeleton = `
<div class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-busy="true" aria-label="Cargando el panel…">
 ${Array.from({length: 4}, () => '<div class="animate-pulse rounded-lg bg-fore/5 h-[110px] w-full rounded-xl"></div>').join('')}
</div>`;
const cardSkeleton = `
<div data-card-skeleton aria-hidden="true" class="flex min-h-[7.5rem] flex-col gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3">
 <div class="flex items-center justify-between gap-2"><div class="animate-pulse rounded-lg bg-fore/5 h-4 w-2/3 rounded-md"></div><div class="animate-pulse rounded-lg bg-fore/5 h-7 w-7 rounded-lg"></div></div>
 <div class="animate-pulse rounded-lg bg-fore/5 h-3 w-1/2 rounded-full"></div>
 <div class="animate-pulse rounded-lg bg-fore/5 h-3 w-2/5 rounded-full"></div>
 <div class="mt-auto grid gap-1.5"><div class="animate-pulse rounded-lg bg-fore/5 h-1.5 w-full rounded-full"></div><div class="animate-pulse rounded-lg bg-fore/5 h-3 w-1/3 rounded-full"></div></div>
</div>`;
const dashboardSkeleton = `
<div class="grid gap-5"><div role="status" aria-busy="true" aria-label="Cargando el panel…" class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">${Array.from({length: 4}, () => '<div class="animate-pulse rounded-lg bg-fore/5 h-[110px] w-full rounded-xl"></div>').join('')}</div>
 <section role="status" aria-busy="true" aria-label="Cargando el panel…" class="rounded-xl border border-ink-600 bg-ink-800 p-4 md:p-5"><div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">${Array.from({length: 3}, () => cardSkeleton).join('')}</div></section>
</div>`;

/* app/ui-v2.tsx `EmptyBlock` compacto (antes) y `EmptyCompact` (después). */
const emptyBlockCompact = `
<div role="status" class="rounded-xl border border-ink-600 bg-ink-800 p-5 shadow-[0_1px_2px_rgb(37_28_41_/_4%)] max-md:p-4">
 <div class="flex flex-col items-center justify-center px-6 text-center py-6">
  <div class="grid h-12 w-12 place-items-center rounded-2xl border border-ink-500 bg-ink-700 text-mute"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21 8-9 4-9-4"/><path d="M3 8v8l9 4 9-4V8"/><path d="m3 8 9-4 9 4"/></svg></div>
  <p class="mt-3 text-sm font-semibold text-fore">No hay pendientes internos cargados.</p>
  <p class="mt-1 max-w-xs text-xs leading-5 text-mute">Trabajo de la agencia, separado de los proyectos de clientes y sin efecto financiero.</p>
  <div class="mt-4"><button type="button" class="primary">Agregar tarea interna</button></div>
 </div>
</div>`;
const emptyCompactHtml = `
<div role="status" class="flex min-h-11 min-w-0 flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-ink-500 bg-ink-800/60 px-3 py-1.5 text-[12px] leading-5 text-mute">
 <p class="min-w-0 flex-1">No hay pendientes internos cargados.</p>
 <span class="shrink-0"><button type="button" class="secondary min-h-9">Agregar tarea interna</button></span>
 <button type="button" class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fono md:h-8 md:w-8" title="Ocultar aviso" aria-label="Ocultar aviso">${x14}</button>
</div>`;

export default [
  {
    id: 'patrones-138-tarjeta-antes',
    section: 'Sistema de diseño',
    surface: 'Tarjeta larga con descripción y acción suelta (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><p class="form-note">Antes: la tarjeta apila la descripción completa y la acción queda como botón de texto; el alto depende del texto.</p>${legacyTask}</div>`,
  },
  {
    id: 'patrones-138-tarjeta-despues',
    section: 'Sistema de diseño',
    surface: 'Tarjeta compacta estándar (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><p class="form-note">Después: título, contexto, vencimiento, responsable y avance; la descripción vive en el detalle.</p><div class="grid max-w-xl gap-2">${compactCard({
      title: 'Reel de lanzamiento para la campaña de verano de la Cooperativa',
      context: `<span>${LONG_CLIENT}</span><span aria-hidden="true">·</span><span class="min-w-0 truncate" title="Campaña de verano · pieza 4 de 12">Campaña de verano · pieza 4 de 12</span>`,
      chips: `${chipWarn('Bloqueado')}${chipInfo('Video')}`,
      due: dueWarn,
      responsible: assignedPeople(['Ana Villalba', 'Luis Fernández Cáceres']),
      progress,
    })}</div></div>`,
  },
  {
    id: 'patrones-138-menu-antes',
    section: 'Sistema de diseño',
    surface: 'Fila de acciones sueltas que reemplaza el ⋯ (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><p class="form-note">Antes: seis iconos sueltos por registro; la acción principal no se distingue y el ancho no alcanza en mobile.</p>${legacyActionRow}</div>`,
  },
  {
    id: 'patrones-138-menu-despues',
    section: 'Sistema de diseño',
    surface: 'Una acción rápida + menú ⋯ abierto (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><p class="form-note">Después: la acción rápida (ver) queda a la vista y editar/imprimir/eliminar viven en el ⋯, con confirmación para la peligrosa. El menú se muestra en flujo para poder medirlo.</p><div class="grid max-w-xl gap-2">${compactCard({
      title: 'Memoria SD 128 GB · DJI Mic 2',
      context: '<span>Inventario · Estante A · fila 2</span>',
      chips: `${chipInfo('Disponible')}${chipWarn('Sin verificar hace 34 días')}`,
      due: '<span class="whitespace-nowrap text-[11.5px] text-mute">Verificación 12-oct</span>',
      responsible: assignedPeople(['Ana Villalba']),
      quick: quickAction('Ver equipo: Memoria SD 128 GB · DJI Mic 2'),
      open: true,
    })}</div>${menuList('Acciones de la pieza: Memoria SD 128 GB · DJI Mic 2')}</div>`,
  },
  {
    id: 'patrones-138-skeleton-antes',
    section: 'Sistema de diseño',
    surface: 'Loader genérico a pantalla completa (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><section class="panel">${loadingBlock}</section></div>`,
  },
  {
    id: 'patrones-138-skeleton-despues',
    section: 'Sistema de diseño',
    surface: 'Esqueleto con la forma real: KPIs + tarjetas (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack">${dashboardSkeleton}</div>`,
  },
  {
    id: 'patrones-138-empty-antes',
    section: 'Sistema de diseño',
    surface: 'Vacío centrado que ocupa el pliegue (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack">${emptyBlockCompact}</div>`,
  },
  {
    id: 'patrones-138-empty-despues',
    section: 'Sistema de diseño',
    surface: 'Vacío compacto de una línea, accionable y descartable (#138)',
    kind: 'workspace',
    body: `<div class="ops-stack"><p class="form-note">Después: una línea baja con la acción concreta y el descarte cuando el aviso se puede ocultar.</p>${emptyCompactHtml}</div>`,
  },
];
