/*
 * Fixtures: Producción (tablero y planificador) y Proyectos (lista y detalle).
 * Rediseño v2 de OPS (campaña #41, spec #44).
 *
 * Espeja el JSX real de `app/sections/produccion.tsx`, `app/production-board.tsx`,
 * `app/sections/proyectos.tsx`, `app/project-card.tsx` y el planificador de
 * `app/productivity-ui.tsx` con las clases Tailwind y los objetos de
 * `owncoding-ui` tal como se emiten. Las clases viven acá porque Tailwind
 * escanea `build-tools/visual-harness/fixtures/**`.
 *
 * Contratos: el tablero scrollea horizontalmente (la página es el scroll
 * vertical), la lista del planificador y la de proyectos comparten su plantilla
 * con el encabezado (`--project-cols`), las tarjetas de cuadrícula usan 200 px y
 * nada de montos, fechas, códigos ni seriales se corta.
 */
const svg = (path, size = 16, className = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="${className}" aria-hidden="true">${path}</svg>`;
const ICON = {
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 6v6l4 2',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  list: 'M4 6h16M4 12h16M4 18h16',
  pencil: 'M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM16 16l5 5',
  sliders: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M11 16v4',
  arrowUp: 'M7 17L17 7M8 7h9v9',
  rotate: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
};
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const chip = (label, tone) => {
  const tones = {ok: 'bg-ok/15 text-ok border-ok/25', info: 'bg-fono/15 text-fono-light border-fono/25', warn: 'bg-warn/15 text-warn border-warn/25', bad: 'bg-bad/15 text-bad border-bad/25', mute: 'bg-ink-600 text-mute border-ink-500'};
  return `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}">${label}</span>`;
};
const clientIdentity = (name, color) => `<span class="client-identity identity-${color}"><span class="identity-avatar">${initials(name)}</span><span class="actor-identity-name" title="${name}">${name}</span></span>`;
const urgencyBadge = (label) => `<span class="urgency-badge" title="Urgencia: ${label}"><span class="urgency-dots">•••••</span>${label}</span>`;
const dueDate = (text, overdue = false) => `<span class="due-date${overdue ? ' overdue' : ''} compact" title="Entrega: ${text}">${text}</span>`;
const assignedPeople = (people) => !people ? '<span class="assigned-people muted">Responsables no disponibles</span>' : people.length === 0 ? '<span class="assigned-people">Sin responsables</span>' : `<span class="assigned-people"><span class="assigned-people-list">${people.map((person) => `<span class="assigned-person" title="${person.name}${person.primary ? ' · Principal' : ''}">${person.primary ? '★' : ''}${person.initials}</span>`).join('')}</span></span>`;
const iconAction = ({icon, label, tone = 'mute'}) => {
  const tones = {mute: 'border-transparent text-mute hover:bg-ink-700 hover:text-fore', ok: 'border-ok/30 text-ok hover:bg-ok/10', warn: 'border-warn/30 text-warn hover:bg-warn/10', bad: 'border-bad/30 text-bad hover:bg-bad/10', fono: 'border-fono/30 text-fono-light hover:bg-fono/10'};
  return `<button type="button" title="${label}" aria-label="${label}" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border transition md:h-8 md:w-8 ${tones[tone]}">${svg(ICON[icon] || ICON.eye, 16, 'h-4 w-4')}</button>`;
};
const button = (label, variant = 'primary') => {
  const variants = {primary: 'bg-fono text-onbrand', outline: 'bg-transparent text-fore border border-ink-500', ghost: 'bg-transparent text-mute'};
  return `<button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition md:h-9 ${variants[variant]}">${label}</button>`;
};
const segmented = (label, options, active) => `<div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1" role="group" aria-label="${label}">${options.map(([id, text, icon]) => `<button type="button" aria-pressed="${id === active}" aria-label="${text}" title="${text}" class="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 md:min-h-8 text-sm font-medium transition ${id === active ? 'bg-fono/15 text-fono-light' : 'text-mute'}">${svg(ICON[icon] || ICON.grid, 16, 'h-4 w-4 shrink-0')}<span class="min-w-0 truncate">${text}</span></button>`).join('')}</div>`;
const kpi = (label, value, hint) => `<div class="relative overflow-hidden rounded-xl border border-ink-600 bg-ink-800 p-4"><div class="text-[11px] font-medium uppercase tracking-wider text-mute">${label}</div><div class="mt-1.5 text-2xl font-semibold tracking-tight text-fore md:text-3xl">${value}</div>${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="text-mute">${hint}</span></div>` : ''}</div>`;

/* --------------------------------------------------------------- tablero */
const orderCard = (order) => `
<article class="flex min-w-0 cursor-grab flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3" data-order="${order.id}">
 <div class="flex items-start justify-between gap-2"><button type="button" class="min-w-0 text-left text-[13px] font-semibold text-fore">${order.title}</button><span class="flex h-11 w-11 shrink-0 select-none items-center justify-center text-mute md:h-7 md:w-7" role="img" aria-label="Mover ${order.title}" title="Mover ${order.title}">⋮⋮</span></div>
 <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-mute">${clientIdentity(order.client, order.color)}<span aria-hidden="true">·</span><span class="min-w-0 truncate" title="${order.project}">${order.project}</span></div>
 <div class="flex flex-wrap items-center gap-1">${chip(order.status.label, order.status.tone)}${urgencyBadge(order.urgency)}${chip(order.workType, 'info')}${order.approval ? chip(`Aprobaciones: ${order.approval}`, 'ok') : ''}</div>
 <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">${order.links ? `<span class="whitespace-nowrap">${order.links === 1 ? '1 enlace' : `${order.links} enlaces`}</span>` : '<span>Sin enlace</span>'}<span class="whitespace-nowrap">${order.hours}</span>${order.checklist ? `<span class="whitespace-nowrap">☑ ${order.checklist.done}/${order.checklist.total} pasos</span>` : ''}</div>
 ${order.description ? `<p class="line-clamp-2 text-[11.5px] leading-5 text-mute" title="${order.description}">${order.description}</p>` : ''}
 ${dueDate(order.due)}
 ${assignedPeople(order.people)}
 <p class="text-[10.5px] text-mute">Actualizada ${order.updated}</p>
 <div class="flex flex-wrap items-center justify-between gap-2 border-t border-ink-600 pt-2"><button class="text-button">Editar</button>${iconAction({icon: 'trash', label: `Archivar pieza: ${order.title}`})}</div>
</article>`;
// El badge muestra el total EXACTO de la etapa (`?counts=1`); si la ventana de la
// columna tiene más piezas, aparece "Ver más" (contrato #57).
const kanbanColumn = (status, orders, {count, hasMore} = {}) => `
<section class="flex min-w-0 w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800/60 p-2.5" data-column="${status.id}">
 <div class="flex items-center gap-2">${chip(status.label, status.tone)}<em class="ml-auto whitespace-nowrap rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-medium not-italic tabular-nums text-mute" title="${count ?? orders.length} piezas en ${status.label}">${count ?? orders.length}</em></div>
 ${orders.map(orderCard).join('')}
 ${hasMore ? `<button type="button" class="text-button justify-center" aria-label="Ver más piezas en ${status.label}">Ver más</button>` : ''}
 ${orders.length ? '' : '<p class="py-3 text-center text-[11px] text-mute">Sin piezas en esta etapa</p>'}
</section>`;
const productionToolbar = `
<div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
 ${segmented('Vista de Producción', [['Tablero', 'Tablero', 'grid'], ['Mi día', 'Mi día', 'clock'], ['Calendario', 'Calendario', 'calendar'], ['Lista y lotes', 'Lista y lotes', 'list']], 'Tablero')}
 <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
  <label class="grid w-full gap-1.5 sm:w-64"><span class="text-[12px] font-semibold text-mute">Filtrar por cliente</span><select class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-fore md:h-9 md:text-sm"><option>Todos los clientes</option></select></label>
  <div class="flex flex-wrap items-center gap-2"><button type="button" class="text-button">${svg(ICON.sliders, 14)}Filtros · 2</button><p class="whitespace-nowrap text-xs tabular-nums text-mute" role="status">4 de 9 órdenes</p><button type="button" class="text-button">${svg(ICON.rotate, 14)}Restablecer filtros</button></div>
 </div>
</div>`;
const orders = [
  {id: 'wo_1', title: 'Reel de lanzamiento para la nueva línea de productos — corte final con subtítulos, corrección de color y mezcla', color: 'teal', client: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', project: 'Campaña Aniversario 2026 · Temporada de verano · Spots para televisión abierta y redes', urgency: '5 · Crítica', status: {id: 'blocked', label: 'Bloqueado', tone: 'bad'}, workType: 'Video', links: 3, hours: '12 h est. · 4 h reales', checklist: {done: 3, total: 8}, description: 'Falta la aprobación del cliente sobre la música y el cierre con el logo animado de cierre.', due: 'Entrega 28 ago. 2026 · 09:30 h · venció hace 23 días', dueShort: '28-ago · 09:30', people: [{initials: 'MR', name: 'María Renée Ayala Benítez', primary: true}, {initials: 'JC', name: 'Juan Carlos Villalba'}], updated: '17 sept 26 · 09:48', approval: 1},
  {id: 'wo_2', title: 'Spots de 15 s y 30 s para radio, televisión abierta y redes sociales', color: 'violet', client: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', project: 'Documental institucional del Bicentenario — Investigación, rodaje y postproducción completa', urgency: '2 · Moderada', status: {id: 'to_record', label: 'Por grabar', tone: 'warn'}, workType: 'Producción', links: 1, hours: '8 h est.', checklist: null, description: 'Pendiente confirmar locación y permisos de filmación en el centro histórico.', due: 'Entrega 23 sept. 2026 · 07:00 h · faltan 3 días', dueShort: '23-sept · 07:00', people: [{initials: 'LP', name: 'Lucía Paredes', primary: true}], updated: '18 sept 26 · 15:10', approval: 0},
  {id: 'wo_3', title: 'Cobertura multicámara del evento de aniversario con entrevistas y piezas verticales para Instagram y TikTok', color: 'rose', client: 'Fundación Niñez y Comunidad', project: 'Cobertura de eventos corporativos 2026', urgency: '3 · Media', status: {id: 'recorded', label: 'Grabado', tone: 'info'}, workType: 'Foto', links: 0, hours: '—', checklist: {done: 8, total: 8}, description: null, due: '', dueShort: 'Sin fecha', people: null, updated: '12 sept 26 · 11:02', approval: 2},
  {id: 'wo_4', title: 'Edición de cápsulas testimoniales para la campaña de responsabilidad social', color: 'blue', client: 'Ministerio de Educación y Ciencias', project: 'Memoria audiovisual 2026', urgency: 'Sin definir', status: {id: 'editing', label: 'Editando', tone: 'info'}, workType: 'Reedición', links: 2, hours: '20 h est. · 9 h reales', checklist: {done: 1, total: 4}, description: null, due: 'Entrega 30 sept. 2026 · 18:30 h · faltan 10 días', dueShort: '30-sept · 18:30', people: [{initials: 'RS', name: 'Rodrigo Sosa Giménez', primary: true}], updated: '19 sept 26 · 08:05', approval: 0},
];
const productionColumns = [
  {status: {id: 'blocked', label: 'Bloqueado', tone: 'bad'}, orders: orders.filter(order => order.status.id === 'blocked')},
  {status: {id: 'to_record', label: 'Por grabar', tone: 'warn'}, orders: orders.filter(order => order.status.id === 'to_record')},
  {status: {id: 'recorded', label: 'Grabado', tone: 'info'}, orders: orders.filter(order => order.status.id === 'recorded')},
  {status: {id: 'editing', label: 'Editando', tone: 'info'}, orders: orders.filter(order => order.status.id === 'editing')},
  {status: {id: 'review', label: 'Revisión', tone: 'warn'}, orders: []},
  {status: {id: 'approved', label: 'Aprobado', tone: 'ok'}, orders: []},
  {status: {id: 'published', label: 'Publicado', tone: 'ok'}, orders: []},
];

/* ----------------------------------------------------------- planificador */
const PLANNER_TEMPLATE = 'grid-cols-[minmax(13rem,1.6fr)_minmax(11rem,1.1fr)_7rem_7rem_minmax(9rem,1fr)_6rem_9rem]';
const plannerHead = `<div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${PLANNER_TEMPLATE}"><span role="columnheader">Pieza</span><span role="columnheader">Vence</span><span role="columnheader">Estado</span><span role="columnheader">Tipo</span><span role="columnheader">Responsables</span><span role="columnheader" class="text-right">Checklist</span><span role="columnheader">Horas</span></div>`;
const plannerRow = (order) => `
<div role="row" class="grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 md:min-h-11 md:py-1 ${PLANNER_TEMPLATE}" data-status="${order.status.id}">
 <span class="flex min-w-0 items-center gap-2"><label class="flex h-11 min-w-11 items-center justify-center md:h-auto md:min-w-0" title="Seleccionar para operar en lote"><input type="checkbox" class="h-6 w-6 p-0 accent-fono" aria-label="Seleccionar ${order.title}"></label><button type="button" class="flex min-h-11 min-w-0 flex-col justify-center text-left md:min-h-0"><b class="block truncate text-[13px] font-semibold text-fore" title="${order.title}">${order.title}</b><small class="block truncate text-[11px] text-mute" title="${order.client} · ${order.project}">${order.client} · ${order.project}</small></button></span>
 <span class="min-w-0 whitespace-nowrap text-[11.5px] tabular-nums text-mute">${order.dueShort || 'Sin fecha'}</span>
 <span class="min-w-0">${chip(order.status.label, order.status.tone)}</span>
 <span class="min-w-0">${chip(order.workType, 'mute')}</span>
 <span class="min-w-0 truncate text-[11.5px] text-mute" title="${(order.people||[]).map(p=>p.name).join(', ')}">${(order.people||[]).map(p=>p.name).join(', ') || 'Sin responsables'}</span>
 <span class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${order.checklist ? `☑ ${order.checklist.done}/${order.checklist.total}` : '—'}</span>
 <span class="whitespace-nowrap text-[11.5px] tabular-nums text-mute">${order.hours}</span>
</div>`;
const plannerBody = `
<div class="grid min-w-0 gap-4" aria-label="Planificador de producción">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 class="text-lg font-bold text-fore">Trabajo diario</h2></div>
 <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">${kpi('Entregas para hoy o vencidas', '2', 'Piezas asignadas con entrega hasta hoy')}${kpi('Piezas asignadas pendientes', '4', 'Sin aprobar ni publicar')}</div>
 <div class="flex flex-wrap items-center gap-2"><button type="button" class="text-button">Revisar cobros pendientes${svg(ICON.arrowUp, 14)}</button><button type="button" class="text-button">Disponibilidad y efectivo${svg(ICON.arrowUp, 14)}</button></div>
 <div role="table" aria-label="Piezas" class="silent-scroll min-w-0 overflow-x-auto"><div class="min-w-[72rem]">${plannerHead}<div role="rowgroup">${orders.map(plannerRow).join('')}</div></div></div>
</div>`;

/* --------------------------------------------------------------- proyectos */
const PROJECT_TEMPLATE = 'grid-cols-[minmax(14rem,1.6fr)_7rem_minmax(13rem,1.1fr)_minmax(10rem,1fr)_10rem]';
const projectRows = [
  {id: '01J7Q2', name: 'Campaña Aniversario 2026 · Temporada de verano · Spots para televisión abierta, radio y redes sociales', client: {name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', color: 'teal'}, status: {key: 'active', label: 'Activo', tone: 'ok'}, urgency: '4 · Alta', start: '05-ene', due: '23-sept', dueTone: 'warn', pieces: 148, levels: 3, people: [{initials: 'MR', name: 'María Renée Ayala Benítez', primary: true}, {initials: 'JC', name: 'Juan Carlos Villalba'}, {initials: 'LP', name: 'Lucía Paredes'}], links: 2, updated: '19 sept 26 · 15:42', selectable: true, manageable: true},
  {id: '01J7Q3', name: 'Documental institucional del Bicentenario — Investigación, rodaje y postproducción completa', client: {name: 'Estudio de Comunicación y Producción Audiovisual del Paraguay Sociedad Anónima', color: 'violet'}, status: {key: 'paused', label: 'Pausado', tone: 'warn'}, urgency: '3 · Media', start: '18-nov', due: '30-nov', dueTone: '', pieces: 27, levels: 1, people: [{initials: 'RS', name: 'Rodrigo Sosa Giménez', primary: true}], links: 1, updated: '17 sept 26 · 09:10', selectable: true, manageable: true},
  {id: '01J7Q4', name: 'Cobertura de eventos corporativos 2026', client: {name: 'Fundación Niñez y Comunidad', color: 'rose'}, status: {key: 'completed', label: 'Completado', tone: 'info'}, urgency: 'Sin definir', start: '02-feb', due: '14-ago', dueTone: '', pieces: 0, levels: null, people: [], inherited: true, links: 0, updated: '10 sept 26 · 12:00', selectable: true, manageable: true},
  {id: '01J7Q5', name: 'Memoria audiovisual 2026 · Registro de archivo histórico y digitalización de cintas', client: {name: 'Ministerio de Educación y Ciencias', color: 'blue'}, status: {key: 'cancelled', label: 'Cancelado', tone: 'bad'}, urgency: '5 · Crítica', start: null, due: null, dueTone: '', pieces: 12, levels: 2, people: [{initials: 'LP', name: 'Lucía Paredes', primary: true}, {initials: 'MR', name: 'María Renée Ayala Benítez'}], links: 3, updated: '05 sept 26 · 08:30', selectable: true, manageable: true},
];
const projectRow = (project) => `
<article id="project-${project.id}" tabindex="-1" class="project-entry group/project flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 [.project-list_&]:grid [.project-list_&]:min-h-[48px] [.project-list_&]:grid-cols-[var(--project-cols)] [.project-list_&]:items-center [.project-list_&]:gap-x-2 [.project-list_&]:px-3 [.project-list_&]:py-1">
 <div class="flex min-w-0 items-start gap-2 [.project-list_&]:items-center">
  ${project.selectable ? `<label class="select-check flex h-11 min-w-11 items-center justify-center md:h-6 md:min-w-6" title="Seleccionar proyecto"><input type="checkbox" class="h-6 w-6 p-0 accent-fono" aria-label="Seleccionar ${project.name}"></label>` : ''}
  <div class="min-w-0 [.project-list_&]:flex [.project-list_&]:items-center [.project-list_&]:gap-2">
   <h3 class="break-words text-sm font-semibold text-fore [.project-list_&]:min-w-0 [.project-list_&]:truncate" title="${project.name}">${project.name}</h3>
   <span class="mt-0.5 min-w-0 text-left text-[11.5px] text-mute [.project-list_&]:hidden">${clientIdentity(project.client.name, project.client.color)}</span>
   <span class="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:inline" title="${project.client.name}">· ${project.client.name}</span>
  </div>
 </div>
 <div class="flex min-w-0 flex-wrap items-center gap-1 [.project-list_&]:flex-nowrap [.project-list_&]:justify-start">
  ${chip(project.status.label, project.status.tone)}
  <span class="[.project-list_&]:hidden">${urgencyBadge(project.urgency)}</span>
 </div>
 <dl class="grid gap-1 text-[11.5px] [.project-list_&]:flex [.project-list_&]:flex-nowrap [.project-list_&]:items-center [.project-list_&]:gap-x-3 [.project-list_&]:overflow-hidden [.project-list_&]:whitespace-nowrap" title="Inicio ${project.start || 'sin fecha'} · Entrega ${project.due || 'sin fecha'} · ${project.pieces} piezas">
  <div class="flex items-center gap-1.5"><dt class="text-mute [.project-list_&]:hidden">Inicio</dt><dd class="list-date whitespace-nowrap">${project.start || 'Sin fecha'}</dd></div>
  <div class="flex items-center gap-1.5"><dt class="text-mute [.project-list_&]:hidden">Entrega</dt><dd class="list-date whitespace-nowrap"${project.dueTone ? ` data-tone="${project.dueTone}"` : ''}>${project.due || 'Sin fecha'}</dd></div>
  <div class="flex items-center gap-1.5"><dt class="text-mute [.project-list_&]:hidden">Piezas</dt><dd class="tabular-nums">${project.pieces}</dd><span class="hidden [.project-list_&]:inline [.project-list_&]:text-mute"> piezas</span></div>
  ${project.levels ? `<div class="flex items-center gap-1.5 [.project-list_&]:hidden" title="Niveles de aprobación interna: ${project.levels}"><dt class="text-mute">Aprobación</dt><dd class="tabular-nums">${project.levels}</dd></div>` : ''}
 </dl>
 <div class="min-w-0 [.project-list_&]:hidden">${assignedPeople(project.people, project.inherited)}</div>
 <span class="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:block" title="${(project.people||[]).map(p=>p.name).join(', ')}">${(project.people||[]).map(p=>p.name).join(', ') || (project.inherited ? 'Responsables no disponibles' : 'Sin responsables')}</span>
 <p class="text-[10.5px] text-mute [.project-list_&]:hidden">Actualizado ${project.updated}</p>
 <div class="mt-auto flex min-w-0 flex-wrap items-center gap-2 border-t border-ink-600 pt-2 [.project-list_&]:mt-0 [.project-list_&]:flex-nowrap [.project-list_&]:overflow-x-auto [.project-list_&]:border-t-0 [.project-list_&]:pt-0">${project.links ? `<a class="inline-flex min-h-11 items-center whitespace-nowrap text-[11.5px] font-semibold text-fono-light md:min-h-0" href="#drive">Abrir Drive${project.links > 1 ? ` (${project.links})` : ''} ↗</a>` : '<small class="whitespace-nowrap text-[11.5px] text-mute">Sin Drive</small>'}${iconAction({icon: 'eye', label: `Ver detalle del proyecto: ${project.name}`, tone: 'fono'})}<button type="button" class="text-button">Comentarios</button>${project.manageable ? '<button type="button" class="text-button">Archivar</button>' : ''}${project.manageable ? iconAction({icon: 'pencil', label: `Editar proyecto: ${project.name}`}) : ''}</div>
</article>`;
const projectCard = (project) => `
<article class="project-entry group/project flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
 <div class="flex min-w-0 items-start gap-2">${project.selectable ? `<label class="select-check flex h-11 min-w-11 items-center justify-center md:h-6 md:min-w-6" title="Seleccionar proyecto"><input type="checkbox" class="h-6 w-6 p-0 accent-fono" aria-label="Seleccionar ${project.name}"></label>` : ''}<div class="min-w-0"><h3 class="break-words text-sm font-semibold text-fore" title="${project.name}">${project.name}</h3><span class="mt-0.5 block text-[11.5px] text-mute">${clientIdentity(project.client.name, project.client.color)}</span></div></div>
 <div class="flex min-w-0 flex-wrap items-center gap-1">${chip(project.status.label, project.status.tone)}${urgencyBadge(project.urgency)}</div>
 <dl class="grid gap-1 text-[11.5px]"><div class="flex items-center gap-1.5"><dt class="text-mute">Inicio</dt><dd class="list-date whitespace-nowrap">${project.start || 'Sin fecha'}</dd></div><div class="flex items-center gap-1.5"><dt class="text-mute">Entrega</dt><dd class="list-date whitespace-nowrap">${project.due || 'Sin fecha'}</dd></div><div class="flex items-center gap-1.5"><dt class="text-mute">Piezas</dt><dd class="tabular-nums">${project.pieces}</dd></div></dl>
 <div class="min-w-0">${assignedPeople(project.people, project.inherited)}</div>
 <p class="text-[10.5px] text-mute">Actualizado ${project.updated}</p>
 <div class="mt-auto flex min-w-0 flex-wrap items-center gap-2 border-t border-ink-600 pt-2">${project.links ? `<a class="inline-flex min-h-11 items-center whitespace-nowrap text-[11.5px] font-semibold text-fono-light md:min-h-0" href="#drive">Abrir Drive${project.links > 1 ? ` (${project.links})` : ''} ↗</a>` : '<small class="whitespace-nowrap text-[11.5px] text-mute">Sin Drive</small>'}${iconAction({icon: 'eye', label: `Ver detalle del proyecto: ${project.name}`, tone: 'fono'})}<button type="button" class="text-button">Comentarios</button></div>
</article>`;
const projectsBody = (asGrid) => `
<section class="grid min-w-0 gap-4" aria-label="Proyectos">
 <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">${kpi('Activos', '2', 'Con trabajo en curso')}${kpi('Pausados', '1', 'Sin producción activa')}${kpi('Completados', '1', 'Cerrados en el historial')}${kpi('Piezas totales', '187', 'Órdenes de los proyectos visibles')}</div>
 <div class="mb-4 flex flex-wrap items-end gap-3"><label class="grid w-full gap-1.5 sm:w-64"><span class="text-[12px] font-semibold text-mute">Cliente</span><select class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-fore md:h-9 md:text-sm"><option>Todos los clientes</option></select></label><p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">4 proyectos</p></div>
 ${asGrid
   ? `<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">${projectRows.map(projectCard).join('')}</div>`
   : `<div role="table" aria-label="Proyectos" class="project-list silent-scroll min-w-0 overflow-x-auto [--project-cols:minmax(14rem,1.6fr)_7rem_minmax(13rem,1.1fr)_minmax(10rem,1fr)_10rem]"><div class="min-w-[64rem]"><div role="row" class="grid gap-x-2 border-b border-ink-600 px-3 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${PROJECT_TEMPLATE}"><span role="columnheader">Proyecto</span><span role="columnheader">Estado</span><span role="columnheader">Fechas y piezas</span><span role="columnheader">Responsables</span><span role="columnheader" class="text-right">Acciones</span></div><div role="rowgroup">${projectRows.map(projectRow).join('')}</div></div></div>`}
</section>`;


/* ------------------------------------------------------------ calendario */
const CAL_DAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const calHead = `<div class="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">${CAL_DAYS.map(day => `<span class="text-center text-[10px] font-bold uppercase tracking-wider text-mute">${day}</span>`).join('')}</div>`;
const calPiece = (order, time) => `<button type="button" class="grid min-h-11 gap-0.5 rounded-md border border-fono/30 bg-fono/10 px-1.5 py-1 text-left text-[11px] text-fono-light min-[769px]:min-h-0"><b class="break-words">${order.title}</b><span class="text-mute">${order.client} · ${time}</span></button>`;
const calDay = (day, rows) => `<div class="grid min-h-16 content-start gap-1 rounded-lg border border-ink-600/60 p-1" aria-label="2026-09-${String(day).padStart(2,'0')}"><time class="text-[11px] tabular-nums text-mute" datetime="2026-09-${String(day).padStart(2,'0')}">${day}</time>${rows.join('')}</div>`;
const calByDay = new Map([[3, [[orders[0], '14:00']]], [8, [[orders[1], '09:30']]], [15, [[orders[2], '16:45']]], [22, [[orders[3], '11:15']]], [25, [[orders[0], '10:00']]]]);
const calendarBody = `
<div class="grid min-w-0 gap-4" aria-label="Planificador de producción">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 class="text-lg font-bold text-fore">Calendario</h2><div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1 [&>button]:min-h-11 md:[&>button]:min-h-9" role="group" aria-label="Vista del planificador"><button type="button" class="rounded-lg px-3 py-1 text-[12.5px] font-semibold text-mute">Mi día</button><button type="button" class="rounded-lg bg-fono px-3 py-1 text-[12.5px] font-semibold text-onbrand" aria-pressed="true">Calendario</button><button type="button" class="rounded-lg px-3 py-1 text-[12.5px] font-semibold text-mute">Lista y lotes</button></div></div>
 <label class="grid w-44 gap-1.5"><span class="text-[12px] font-semibold text-mute">Mes de entrega</span><input type="month" value="2026-09" class="min-h-11"></label>
 <div class="grid gap-2" aria-label="Calendario de entregas del mes">${calHead}
  <div class="grid grid-cols-1 gap-1 min-[769px]:grid-cols-7">${Array.from({length: 1}, (_, index) => `<div class="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" aria-hidden="true"></div>`).join('')}${Array.from({length: 30}, (_, index) => {const day = index + 1;return calDay(day, (calByDay.get(day) || []).map(([order, time]) => calPiece(order, time)));}).join('')}</div>
 </div>
</div>`;

/* ------------------------------------------------------------------ export */
export default [
  {
    id: 'produccion-tablero',
    section: 'Producción',
    surface: 'Tablero por etapas',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `<div class="grid min-w-0 gap-4">${productionToolbar}<section class="grid min-w-0 gap-2" id="produccion" aria-label="Tablero de Producción"><div class="silent-scroll flex snap-x gap-3 overflow-x-auto pb-2" tabindex="0" role="region" aria-label="Tablero de Producción, desplazable horizontalmente">${productionColumns.map(column => kanbanColumn(column.status, column.orders, column.status.id === 'to_record' ? {count: 430, hasMore: true} : {})).join('')}</div><p class="text-[11px] text-mute">Arrastrá una orden de una columna a otra para actualizar su estado.</p></section></div>`,
  },
  {
    id: 'produccion-calendario',
    section: 'Producción',
    surface: 'Calendario de entregas',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: calendarBody,
  },
  {
    id: 'produccion-mi-dia',
    section: 'Producción',
    surface: 'Trabajo diario',
    kind: 'workspace',
    lists: [{
      container: '[aria-label="Piezas"]',
      head: '[role="row"]',
      row: '[data-status]',
      label: 'Producción · piezas del día',
      rowHeight: [44, 52],
      exemptBelow: 940,
    }],
    grids: [],
    body: plannerBody,
  },
  {
    id: 'proyectos-lista',
    section: 'Proyectos',
    surface: 'Entregas y capacidad en lista',
    kind: 'workspace',
    lists: [{
      container: '.project-list',
      head: '[role="row"]',
      row: '.project-entry',
      label: 'Proyectos · lista',
      template: '--project-cols',
      rowHeight: [44, 52],
      exemptBelow: 940,
    }],
    grids: [],
    body: projectsBody(false),
  },
  {
    id: 'proyectos-cuadricula',
    section: 'Proyectos',
    surface: 'Entregas y capacidad en cuadrícula',
    kind: 'workspace',
    lists: [],
    grids: [{container: '[aria-label="Proyectos"] > div.grid', card: '.project-entry', label: 'Proyectos · cuadrícula', minHeight: 200}],
    body: projectsBody(true),
  },
];
