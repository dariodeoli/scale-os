/*
 * Fixtures: Inventario y Estudio — rediseño v2 (campaña #41, spec #44).
 *
 * Espeja el JSX real de `app/inventory-workspace.tsx` y `app/studio-workspace.tsx`
 * con las clases Tailwind y los objetos de `owncoding-ui` tal como se emiten
 * (owncoding-ui/styles.css + app/tailwind.css los pintan). Las clases viven
 * también acá porque Tailwind escanea `build-tools/visual-harness/fixtures/**`.
 *
 * Contrato de listas: encabezado y filas comparten la plantilla
 * (`--eq-cols`, `--rsv-cols`, `--studio-cols`), `gap-x-2` y padding lateral.
 * Las cuadrículas usan tarjetas de ≥200 px.
 *
 * Datos de estrés deliberados: nombres largos, seriales largos, montos grandes,
 * equipos sin foto/serie/verificación, reservas en varios estados y ubicaciones
 * vacías. Este archivo no arregla dominio.
 */
const svg = (path, size = 16, className = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="${className}" aria-hidden="true">${path}</svg>`;
const ICON = {
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15ZM16 16l5 5',
  chevron: 'M6 9l6 6 6-6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M4 6h16M4 12h16M4 18h16',
  store: 'M4 10v10h16V10M2 10l2-6h16l2 6M9 20v-6h6v6',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  edit: 'M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  check: 'M20 6L9 17l-5-5',
  box: 'M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  close: 'M18 6L6 18M6 6l12 12',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  package: 'M12 3l9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8',
  camera: 'M4 7h3l2-3h6l2 3h3v12H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
};
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const avatar = (name) => `<span class="actor-identity-avatar" aria-hidden="true" style="width:20px;height:20px;font-size:9px">${initials(name)}</span>`;
const money = (text) => `<span class="inline-flex shrink-0 items-center justify-end gap-1 font-semibold tabular-nums">${text}</span>`;
const serialTexto = (value) => `<span class="serial-text" title="${value}">${value.slice(0, -4)}<b>${value.slice(-4)}</b></span>`;
const badge = (label, tone) => {
  const tones = {ok: 'bg-ok/15 text-ok border-ok/25', info: 'bg-fono/15 text-fono-light border-fono/25', warn: 'bg-warn/15 text-warn border-warn/25', bad: 'bg-bad/15 text-bad border-bad/25', mute: 'bg-ink-600 text-mute border-ink-500'};
  return `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}">${label}</span>`;
};
const iconAction = ({icon, label, tone = 'mute', disabled = false}) => {
  const tones = {mute: 'border-transparent text-mute hover:bg-ink-700 hover:text-fore', ok: 'border-ok/30 text-ok hover:bg-ok/10', warn: 'border-warn/30 text-warn hover:bg-warn/10', bad: 'border-bad/30 text-bad hover:bg-bad/10'};
  return `<button type="button" title="${label}" aria-label="${label}"${disabled ? ' disabled' : ''} class="inline-flex h-7 w-7 items-center justify-center rounded-lg border transition ${tones[tone]}">${svg(ICON[icon], 16, 'h-4 w-4')}</button>`;
};
const button = (label, variant = 'primary') => {
  const variants = {primary: 'bg-fono text-onbrand hover:bg-fono-light', outline: 'bg-transparent text-fore border border-ink-500 hover:border-fono hover:bg-fono/10', ghost: 'bg-transparent text-mute hover:bg-ink-700 hover:text-fore'};
  return `<button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition md:h-9 ${variants[variant]}">${label}</button>`;
};
const segmented = (label, options, active) => `<div class="flex flex-wrap gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1" role="group" aria-label="${label}">${options.map(([id, text, icon]) => `<button type="button" aria-pressed="${id === active}" aria-label="${text}" title="${text}" class="inline-flex min-h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${id === active ? 'bg-fono/15 text-fono-light' : 'text-mute hover:bg-fore/5 hover:text-fore'}">${svg(ICON[icon], 16, 'h-4 w-4 shrink-0')}<span class="min-w-0 truncate">${text}</span></button>`).join('')}</div>`;
const searchField = (label, placeholder) => `<div class="relative min-w-0">${svg(ICON.search, 16, 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute')}<input type="search" value="" placeholder="${placeholder}" aria-label="${label}" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 pl-9 pr-9 text-base text-fore outline-none transition placeholder:text-mute/60 focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm"></div>`;
const fieldLabel = (text, id) => `<label class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-mute" for="${id}">${text}</label>`;
const kpi = (label, value, hint, moneda = false) => `<div class="relative overflow-hidden rounded-xl border border-ink-600 bg-ink-800 p-4"><div class="text-[11px] font-medium uppercase tracking-wider text-mute">${label}</div><div class="mt-1.5 text-2xl font-semibold tracking-tight text-fore md:text-3xl">${moneda ? money(value) : value}</div>${hint ? `<div class="mt-1.5 flex items-center gap-2 text-xs"><span class="text-mute">${hint}</span></div>` : ''}</div>`;
const filaDato = (etiqueta, valor, valorClass = 'shrink break-words text-right') => `<div class="flex items-center justify-between gap-3"><dt class="min-w-0 text-mute">${etiqueta}</dt><dd class="${valorClass} font-semibold tabular-nums">${valor}</dd></div>`;
const emptyState = (title, description) => `<div class="flex flex-col items-center justify-center px-6 py-12 text-center"><div class="grid h-12 w-12 place-items-center rounded-2xl border border-ink-500 bg-ink-700 text-mute">${svg(ICON.box, 20, 'h-5 w-5')}</div><p class="mt-3 text-sm font-semibold text-fore">${title}</p><p class="mt-1 max-w-xs text-xs leading-5 text-mute">${description}</p></div>`;

/* ------------------------------------------------------------- equipo (datos) */
const equipment = [
  {name: 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)', code: 'SC-000128', photo: true, status: 'in_use', statusLabel: 'En uso', statusTone: 'info', category: 'Almacenamiento', serial: 'SD128GB-UHSII-SANDISK-2024-000123456789', value: 'Gs 1.234.567.890', current: 'Gs 987.654.312', location: 'Con Fabrizio Dellacasa Reyes · Rodaje de contenidos · Campaña Primavera 2026 · Banco Atlas', verification: {result: 'confirmed', label: 'Confirmado', tone: 'ok', verifier: 'Fabrizio Dellacasa Reyes', time: '17 sept 26 · 09:48'}, returning: 'Devuelve María José Fernández de la Vega y Rivarola · previsto 21 sept 26 · 18:00'},
  {name: 'Micrófono inalámbrico DJI Mic 2 (transmisor + receptor + estuche de carga)', code: 'SC-000241', photo: true, status: 'available', statusLabel: 'Disponible', statusTone: 'ok', category: 'Audio', serial: 'DJIMIC2-8F3A-2025-00000981', value: 'USD 18.043,67', location: 'Estante B · fila 1 · Depósito central', verification: {result: 'difference', label: 'Con diferencias', tone: 'warn', verifier: 'Ana Paula Benítez', time: '12 sept 26 · 15:10'}},
  {name: 'Trípode de fibra de carbono con cabezal fluido para cámara de cine y monopod de respaldo', code: 'SC-000377', photo: false, status: 'maintenance', statusLabel: 'Mantenimiento', statusTone: 'warn', category: 'Soportes', serial: 'TRIPODE-CARBONO-2023-0000000000004521', value: 'Gs 4.500.000', location: 'Taller externo · Reparación de cabezal', verification: null},
  {name: 'Notebook de edición con pantalla calibrada', code: 'SC-000402', photo: true, status: 'available', statusLabel: 'Disponible', statusTone: 'ok', category: 'Informática', serial: '', value: 'Gs 12.800.000', location: 'Sin ubicación', verification: null},
  {name: 'Lámpara LED bicolor con batería V-mount', code: 'SC-000455', photo: false, status: 'retired', statusLabel: 'Dado de baja', statusTone: 'mute', category: 'Iluminación', serial: 'LED-LAMP-2019-0000000000000012', value: 'Gs 1.100.000', location: 'Depósito anterior · archivada', verification: {result: 'missing', label: 'No encontrado', tone: 'bad', verifier: 'Carlos Ortiz', time: '05 ago 26 · 11:02'}},
  {name: 'Grabador de audio de 32 canales', code: 'SC-000501', photo: true, status: 'in_use', statusLabel: 'En uso', statusTone: 'info', category: 'Audio', serial: 'REC32-2022-0000000000007788', value: 'USD 3.250,00', location: 'Con Ana Paula Benítez · En uso · sin reserva vinculada', verification: {result: 'confirmed', label: 'Confirmado', tone: 'ok', verifier: 'Rita Mical Herrera', time: '15 sept 26 · 07:00'}},
];
const equipmentRow = (item) => `
<article data-list-row="equipment" data-status="${item.status}" class="grid min-h-[48px] grid-cols-[var(--eq-cols)] items-center gap-x-2 rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-2">
 <span class="flex items-center"><input type="checkbox" class="h-4 w-4 p-0 accent-fono" aria-label="Seleccionar ${item.name}"></span>
 <span class="flex items-center">${item.photo ? '<img class="h-8 w-8 rounded-lg object-cover" src="/brand/icon-192.png" alt="">' : `<span class="grid h-8 w-8 place-items-center rounded-lg border border-ink-600 text-mute">${svg(ICON.camera, 14)}</span>`}</span>
 <span class="flex min-w-0 items-baseline gap-2"><b class="truncate text-[13px] font-semibold text-fore" title="${item.name}">${item.name}</b><code class="shrink-0 whitespace-nowrap font-mono text-[11px] text-mute">${item.code}</code></span>
 <span class="flex min-w-0 items-center gap-x-1.5 text-[13px] leading-5 text-mute"><span class="min-w-0 truncate" title="${item.category}">${item.category}</span><span aria-hidden="true">·</span><span class="inline-flex items-center whitespace-nowrap">${item.serial ? `••••${item.serial.slice(-4)}` : 'Sin serie'}</span></span>
 <span class="flex justify-end">${money(item.value)}</span>
 <span class="flex justify-start">${badge(item.statusLabel, item.statusTone)}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${item.location}">${item.location}</span>
 <span class="min-w-0">${item.verification ? `<span class="inline-flex min-w-0 items-center gap-1.5"><span role="img" title="Control: ${item.verification.label}" aria-label="Control: ${item.verification.label}" class="${item.verification.tone === 'ok' ? 'text-ok' : item.verification.tone === 'warn' ? 'text-warn' : 'text-bad'}">${item.verification.tone === 'ok' ? '✓' : item.verification.tone === 'warn' ? '!' : '×'}</span>${avatar(item.verification.verifier)}<span class="min-w-0 text-xs text-mute">${item.verification.verifier.split(' ')[0]}</span><time class="whitespace-nowrap text-[11px] tabular-nums text-mute">${item.verification.time}</time></span>` : '<span class="text-xs text-mute">Sin verificación física</span>'}</span>
 <span class="flex flex-wrap items-center justify-end gap-1">${iconAction({icon: 'eye', label: `Detalle y trazabilidad: ${item.name}`})}${iconAction({icon: 'printer', label: `Imprimir etiqueta: ${item.name}`})}${iconAction({icon: 'check', tone: 'ok', label: `Marcar verificado: ${item.name}`})}${iconAction({icon: 'edit', label: `Editar equipo: ${item.name}`})}${iconAction({icon: 'trash', tone: 'bad', label: `Archivar equipo: ${item.name}`})}</span>
</article>`;
const equipmentCard = (item) => `
<article data-grid-card="equipment" data-status="${item.status}" class="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
 <div class="flex items-start justify-between gap-3"><div class="flex min-w-0 items-start gap-2">
  <label class="mt-0.5 inline-flex shrink-0 items-center" title="Seleccionar para operar en lote"><input type="checkbox" class="h-4 w-4 p-0 accent-fono" aria-label="Seleccionar ${item.name}"></label>
  ${item.photo ? '<img class="h-11 w-11 shrink-0 rounded-lg object-cover" src="/brand/icon-192.png" alt="">' : ''}
  <div class="min-w-0"><h3 class="break-words text-sm font-semibold text-fore">${item.name}</h3><code class="whitespace-nowrap font-mono text-[11px] text-mute">${item.code}</code></div>
 </div>${badge(item.statusLabel, item.statusTone)}</div>
 <dl class="grid gap-1 text-xs">${filaDato('Categoría', item.category)}${filaDato('Serie / IMEI', item.serial ? serialTexto(item.serial) : 'Sin registrar', 'shrink text-right [overflow-wrap:anywhere] [&_.serial-text]:whitespace-normal [&_.serial-text]:break-all')}${filaDato('Valor', money(item.value), 'shrink text-right')}${item.current ? filaDato('Valor actual', money(item.current)) : ''}${filaDato('Ubicación', item.location)}</dl>
 <div class="mt-auto grid gap-2 border-t border-ink-600 pt-2">
  <div class="flex flex-wrap items-center justify-between gap-2">${item.verification ? `<span class="inline-flex min-w-0 items-center gap-1.5">${avatar(item.verification.verifier)}<span class="min-w-0 text-xs text-mute">${item.verification.verifier.split(' ')[0]}</span><time class="whitespace-nowrap text-[11px] tabular-nums text-mute">${item.verification.time}</time></span>` : '<span class="text-xs text-mute">Sin verificación física</span>'}${iconAction({icon: 'check', tone: 'ok', label: `Marcar verificado: ${item.name}`})}</div>
  ${item.returning ? `<span class="text-xs text-mute">${item.returning}</span>` : ''}
  <div class="flex flex-wrap items-center justify-end gap-1">${iconAction({icon: 'eye', label: `Detalle y trazabilidad: ${item.name}`})}${iconAction({icon: 'printer', label: `Imprimir etiqueta: ${item.name}`})}${iconAction({icon: 'edit', label: `Editar equipo: ${item.name}`})}${iconAction({icon: 'trash', tone: 'bad', label: `Archivar equipo: ${item.name}`})}</div>
 </div>
</article>`;
const equipmentHead = `<div data-list-head="equipment" class="grid min-w-[67.5rem] grid-cols-[var(--eq-cols)] items-center gap-x-2 px-3 text-[10px] font-bold uppercase tracking-wider text-mute" aria-hidden="true"><span></span><span>Foto</span><span>Artículo</span><span>Detalles</span><span class="text-right">Valor</span><span>Estado</span><span>Ubicación</span><span>Verificación</span><span class="text-right">Acciones</span></div>`;
const inventoryToolbar = `
<div class="grid gap-4">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><h2 class="text-lg font-bold text-fore">Inventario y reservas</h2><p class="mt-1 text-sm text-mute">Ubicación registrada y préstamo de equipos por producción.</p></div><div class="flex flex-wrap items-center gap-2">${button('Agregar equipo', 'outline')}${button('Reservar equipos')}</div></div>
 <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">${segmented('Vistas de inventario', [['equipment', 'Equipos', 'box'], ['reservations', 'Calendario y reservas', 'calendar']], 'equipment')}<p class="text-xs text-mute" role="status">Sincroniza cada 30 s mientras esta pestaña esté visible. Actualizado 15:42</p></div>
 <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
  <div class="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(150px,220px)] lg:max-w-2xl">${searchField('Buscar equipo o ubicación', 'Memoria, DJI Mic, estante…')}<div>${fieldLabel('Categoría', 'inventory-category-filter')}<select id="inventory-category-filter" class="h-11 w-full cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:h-9 md:text-sm"><option>Todas</option></select></div></div>
  <div class="flex flex-wrap items-center gap-2"><p class="text-xs text-mute" aria-live="polite">6 equipos visibles</p>${segmented('Vista de inventario', [['grid', 'Cuadrícula', 'grid'], ['list', 'Lista', 'list'], ['pipeline', 'Ubicaciones', 'store']], 'list')}${button('Seleccionar visibles', 'ghost')}</div>
 </div>
 <div class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-600 bg-ink-800/60 px-3 py-2" role="status" aria-live="polite"><span class="text-xs text-mute"><b class="text-fore">1</b> de 50 seleccionado</span><div class="flex flex-wrap items-center gap-2">${button('Reservar', 'outline')}${button('Verificar', 'outline')}${button('Mover ubicación', 'outline')}${button('Limpiar', 'ghost')}</div></div>
</div>`;
const kpiStrip = `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">${kpi('Valor total', 'Gs 1.249.167.890', '6 equipos', true)}${kpi('En uso', '2', 'Retirados o en rodaje')}${kpi('Mantenimiento', '1', 'No asignables a rodaje')}${kpi('Disponibles', '2', 'Listos para reservar')}</div>`;

/* -------------------------------------------------------- pipeline (datos) */
const pipeline = [
  {title: 'Con Fabrizio Dellacasa Reyes', readonly: true, responsible: '', rows: [equipment[0]], note: 'En préstamo: devolvelo para cambiar su ubicación'},
  {title: 'En uso', readonly: true, responsible: '', rows: [equipment[5]], note: 'En préstamo: devolvelo para cambiar su ubicación'},
  {title: 'Depósito anterior', readonly: false, responsible: 'Ana Paula Benítez', rows: [equipment[4]], note: 'Aquí desde 12 sept 26 · 15:10'},
  {title: 'Estante A', readonly: false, responsible: 'Carlos Ortiz', rows: [], note: ''},
  {title: 'Estante B', readonly: false, responsible: '', rows: [equipment[1]], note: 'Aquí desde 14 sept 26 · 08:05'},
  {title: 'Sin ubicación', readonly: false, responsible: '', rows: [equipment[3]], note: 'Sin registro de ingreso a esta ubicación'},
];
const pipelineCard = (item) => `
<article data-board-card class="grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-2.5">
 <button type="button" title="Abrir detalle: ${item.name}" class="flex min-w-0 items-center gap-2 text-left">${item.photo ? '<img class="h-9 w-9 shrink-0 rounded-lg object-cover" src="/brand/icon-192.png" alt="">' : `<span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute">${svg(ICON.camera, 14)}</span>`}<span class="min-w-0"><b class="block break-words text-[13px] font-semibold text-fore">${item.name}</b><code class="whitespace-nowrap font-mono text-[11px] text-mute">${item.code}</code><small class="flex items-center gap-1 text-[11px] text-mute">${item.category}</small></span></button>
 <small class="text-[11px] text-mute">${item.note || 'Sin registro de ingreso a esta ubicación'}</small>
 <div class="flex items-center justify-between gap-2">${badge(item.statusLabel, item.statusTone)}<span class="flex items-center gap-1">${iconAction({icon: 'check', tone: 'ok', label: `Marcar verificado: ${item.name}`})}<button type="button" class="cursor-grab touch-none text-mute" title="Mover ${item.name}" aria-label="Mover ${item.name}">⋮⋮</button></span></div>
</article>`;
const pipelineBoard = `
<div data-board="locations" class="flex snap-x gap-3 overflow-x-auto pb-1" role="region" aria-label="Pipeline de ubicaciones">
${pipeline.map((column) => `<section data-board-column class="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800/60 p-3">
 <header class="flex items-center gap-2">${column.readonly ? `<span class="text-mute" role="img" title="Solo lectura: la ubicación se cambia al devolver" aria-label="Solo lectura: la ubicación se cambia al devolver">${svg(ICON.lock, 14)}</span>` : '<span class="h-2 w-2 rounded-full bg-fono" aria-hidden="true"></span>'}<h3 class="min-w-0 break-words text-sm font-semibold text-fore">${column.title}</h3>${column.responsible ? avatar(column.responsible) : ''}<span class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">${column.rows.length}</span>${column.title === 'Sin ubicación' ? iconAction({icon: 'close', label: 'Ocultar columna Sin ubicación'}) : ''}</header>
 <div class="grid gap-2">${column.rows.map((item) => pipelineCard({...item, note: column.note})).join('')}${column.rows.length ? '' : '<p class="py-3 text-center text-xs text-mute">Arrastrá equipos hasta acá</p>'}</div>
</section>`).join('')}
</div>`;

/* ------------------------------------------------------ reservas (datos) */
const reservations = [
  {title: 'Rodaje de contenidos · Banco Atlas (estudio y exteriores)', status: 'checked_out', statusLabel: 'Retirado', project: 'Campaña Primavera 2026 · Banco Atlas', dates: '17 sept 26 · 08:00 → 21 sept 26 · 18:00', items: 'Memoria SD UHS-II 128 GB · DJI Mic 2 · Trípode de fibra de carbono', responsibles: 'Fabrizio Dellacasa Reyes, María José Fernández de la Vega', returns: 'María José Fernández de la Vega y Rivarola · Fabrizio Dellacasa Reyes', audit: 'Reservado por Ana Paula Benítez · Retiro por Fabrizio Dellacasa Reyes'},
  {title: 'Streaming de lanzamiento', status: 'reserved', statusLabel: 'Reservado', project: 'Lanzamiento de producto · Alicorp', dates: '24 sept 26 · 09:00 → 24 sept 26 · 13:00', items: 'Grabador de audio de 32 canales · Lámpara LED bicolor con batería V-mount', responsibles: 'Carlos Ortiz', returns: 'Carlos Ortiz', audit: ''},
  {title: 'Fotografía de producto', status: 'returned', statusLabel: 'Devuelto', project: 'Catálogo · Casa Rica', dates: '10 sept 26 · 14:00 → 10 sept 26 · 19:00', items: 'Notebook de edición con pantalla calibrada', responsibles: 'Rita Mical Herrera', returns: 'Rita Mical Herrera', audit: 'Devolución por Rita Mical Herrera'},
  {title: 'Spot publicitario (cancelada por lluvia)', status: 'cancelled', statusLabel: 'Cancelado', project: 'Spot · Visión Banco', dates: '05 sept 26 · 07:00 → 05 sept 26 · 15:00', items: 'Trípode de fibra de carbono con cabezal fluido', responsibles: 'Ana Paula Benítez', returns: 'Ana Paula Benítez', audit: ''},
];
const reservationHead = `<div data-list-head="reservations" class="grid grid-cols-[var(--rsv-cols)] items-center gap-x-2 px-3 text-[10px] font-bold uppercase tracking-wider text-mute" aria-hidden="true"><span>Producción</span><span>Proyecto</span><span>Fechas</span><span>Equipos</span><span>Responsables</span><span>Devuelve</span><span class="text-right">Acciones</span></div>`;
const reservationRow = (row) => `
<div data-list-row="reservations" data-status="${row.status}" class="grid min-h-[48px] grid-cols-[var(--rsv-cols)] items-center gap-x-2 rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-2">
 <span class="flex min-w-0 items-center gap-2"><b class="truncate text-[13px] font-semibold text-fore" title="${row.title}">${row.title}</b>${badge(row.statusLabel, row.status === 'reserved' ? 'info' : row.status === 'checked_out' ? 'warn' : row.status === 'returned' ? 'ok' : 'mute')}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${row.project}">${row.project}</span>
 <span class="min-w-0 whitespace-nowrap text-[13px] leading-5 tabular-nums text-mute">${row.dates}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${row.items}">${row.items}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${row.responsibles}">${row.responsibles}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${row.returns}">${row.returns}</span>
 <span class="flex flex-wrap items-center justify-end gap-1">${row.status === 'reserved' ? iconAction({icon: 'edit', label: `Editar reserva: ${row.title}`}) + iconAction({icon: 'package', tone: 'ok', label: `Registrar retiro: ${row.title}`}) + iconAction({icon: 'close', tone: 'warn', label: `Cancelar reserva: ${row.title}`}) : row.status === 'checked_out' ? iconAction({icon: 'refresh', tone: 'ok', label: `Registrar devolución: ${row.title}`}) : ''}</span>
 ${row.audit ? `<p class="col-span-full flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">${row.audit}</p>` : ''}
</div>`;
const calendar = (events) => `<div class="grid gap-2" aria-label="Calendario mensual de reservas"><div class="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<span class="text-center text-[10px] font-bold uppercase tracking-wider text-mute">${day}</span>`).join('')}</div><div class="grid grid-cols-1 gap-1 min-[769px]:grid-cols-7">${Array.from({length: 2}, (_, index) => `<div class="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key="blank-${index}"></div>`).join('')}${Array.from({length: 30}, (_, index) => {const day = index + 1; const rows = events[day] || []; return `<div class="grid min-h-16 content-start gap-1 rounded-lg border border-ink-600/60 p-1" aria-label="2026-09-${String(day).padStart(2, '0')}"><time class="text-[11px] tabular-nums text-mute">${day}</time>${rows.map((event) => `<div class="grid gap-0.5 rounded-md border px-1.5 py-1 text-[11px] ${event.tone}"><b class="break-words">${event.title}</b><small class="text-mute">${event.count} equipo(s) · ${event.label}</small></div>`).join('')}</div>`;}).join('')}</div></div>`;

/* ------------------------------------------------------------- estudio (datos) */
const spaces = [
  {name: 'Set principal con fondo infinito y grúa', scenario: 'Fondo blanco · grúa de 3 m', notes: 'Requiere reservar con 24 h de anticipación.', active: true},
  {name: 'Cabina de podcast insonorizada', scenario: 'Tratamiento acústico completo', notes: '', active: true},
  {name: 'Estudio B · escenario de ladrillo', scenario: 'Ladrillo visto · chimenea', notes: 'En refacción hasta octubre.', active: false},
];
const spaceCard = (space) => `
<article data-grid-card="studio-spaces" class="flex min-h-[200px] flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800/60 p-4">
 <div class="flex items-start justify-between gap-3"><h3 class="break-words text-sm font-semibold text-fore">${space.name}</h3>${badge(space.active ? 'Disponible' : 'Inactivo', space.active ? 'ok' : 'mute')}</div>
 <p class="text-sm text-mute">${space.scenario}</p>${space.notes ? `<small class="text-xs text-mute">${space.notes}</small>` : ''}
 <div class="mt-auto flex justify-end">${iconAction({icon: 'edit', label: `Editar espacio: ${space.name}`})}</div>
</article>`;
const studioReservations = [
  {title: 'Grabación de campaña · cliente', place: 'Set principal con fondo infinito y grúa · Fondo blanco · Video / Reels', dates: '24 sept 26 · 08:00 → 24 sept 26 · 13:00', project: 'Campaña Primavera 2026 · Banco Atlas', responsibles: 'Fabrizio Dellacasa Reyes, Carlos Ortiz', status: 'Reservada', tone: 'info'},
  {title: 'Podcast semanal', place: 'Cabina de podcast insonorizada · Tratamiento acústico completo · Podcast', dates: '25 sept 26 · 18:00 → 25 sept 26 · 20:00', project: 'Sin proyecto vinculado', responsibles: 'María José Fernández de la Vega y Rivarola', status: 'Reservada', tone: 'info'},
  {title: 'Spot publicitario (cancelada por lluvia)', place: 'Estudio B · escenario de ladrillo · Ladrillo visto · Ads', dates: '05 sept 26 · 07:00 → 05 sept 26 · 15:00', project: 'Spot · Visión Banco', responsibles: 'Ana Paula Benítez', status: 'Cancelada', tone: 'mute'},
];
const studioReservationHead = `<div data-list-head="studio-reservations" class="grid grid-cols-[var(--studio-cols)] items-center gap-x-2 px-3 text-[10px] font-bold uppercase tracking-wider text-mute" aria-hidden="true"><span>Reserva</span><span>Horario</span><span>Proyecto</span><span>Responsables</span><span>Estado</span><span class="text-right">Acciones</span></div>`;
const studioReservationRow = (row) => `
<div data-list-row="studio-reservations" class="grid min-h-[48px] grid-cols-[var(--studio-cols)] items-center gap-x-2 rounded-xl border border-ink-600/60 bg-ink-800/40 px-3 py-2">
 <span class="flex min-w-0 items-baseline gap-2"><b class="truncate text-[13px] font-semibold text-fore" title="${row.title}">${row.title}</b><small class="truncate text-[11px] text-mute" title="${row.place}">${row.place}</small></span>
 <span class="min-w-0 whitespace-nowrap text-[13px] leading-5 tabular-nums text-mute">${row.dates}</span>
 <span class="min-w-0 truncate text-[13px] leading-5 text-mute" title="${row.project}">${row.project}</span>
 <span class="flex min-w-0 items-center gap-1 overflow-hidden text-[13px] leading-5 text-mute"><span class="text-[11px]">Responsables:</span><span class="truncate" title="${row.responsibles}">${row.responsibles}</span></span>
 <span class="flex">${badge(row.status, row.tone)}</span>
 <span class="flex flex-wrap items-center justify-end gap-1">${row.status === 'Reservada' ? iconAction({icon: 'edit', label: `Editar reserva: ${row.title}`}) + iconAction({icon: 'close', tone: 'warn', label: `Cancelar reserva: ${row.title}`}) : ''}</span>
</div>`;
const studioCalendar = `<div class="grid gap-2" aria-label="Calendario mensual del estudio"><div class="hidden grid-cols-7 gap-1 min-[769px]:grid" aria-hidden="true">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => `<span class="text-center text-[10px] font-bold uppercase tracking-wider text-mute">${day}</span>`).join('')}</div><div class="grid grid-cols-1 gap-1 min-[769px]:grid-cols-7">${Array.from({length: 1}, (_, index) => `<div class="hidden min-h-16 rounded-lg border border-transparent min-[769px]:block" key="blank-${index}"></div>`).join('')}${Array.from({length: 30}, (_, index) => {const day = index + 1; const rows = day === 24 || day === 25 ? [{space: day === 24 ? 'Set principal con fondo infinito y grúa' : 'Cabina de podcast insonorizada', title: day === 24 ? 'Grabación de campaña · cliente' : 'Podcast semanal'}] : []; return `<div class="grid min-h-16 content-start gap-1 rounded-lg border border-ink-600/60 p-1"><time class="text-[11px] tabular-nums text-mute">${day}</time>${rows.map((row) => `<div class="grid gap-0.5 rounded-md border border-fono/30 bg-fono/10 px-1.5 py-1 text-[11px] text-fono-light"><b class="break-words">${row.space}</b><span class="text-mute">${row.title}</span></div>`).join('')}</div>`;}).join('')}</div></div>`;

/* ------------------------------------------------------------------ export */
export default [
  {
    id: 'inventario-equipos-lista',
    section: 'Inventario',
    surface: 'Equipos en lista',
    kind: 'workspace',
    lists: [{
      container: '[data-list="equipment"]',
      head: '[data-list-head="equipment"]',
      row: '[data-list-row="equipment"]',
      label: 'Inventario · equipos',
      template: '--eq-cols',
      rowHeight: [44, 52],
      exemptBelow: 940,
    }],
    body: `
<div class="grid min-w-0 gap-4 p-4">
 <div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">${inventoryToolbar}</div>
 <div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">
  ${kpiStrip}
  <div data-list="equipment" class="mt-4 min-w-0 overflow-x-auto">
   <div class="[--eq-cols:2rem_2.25rem_minmax(8.5rem,1.5fr)_minmax(8rem,1fr)_7rem_6.5rem_minmax(7.5rem,1fr)_minmax(11rem,1.2fr)_10.5rem] grid min-w-[67.5rem] gap-2">
   ${equipmentHead}
   ${equipment.map(equipmentRow).join('')}
   </div>
  </div>
 </div>
</div>`,
  },
  {
    id: 'inventario-equipos-cuadricula',
    section: 'Inventario',
    surface: 'Equipos en cuadrícula',
    kind: 'workspace',
    grids: [{container: '[data-grid="equipment"]', card: '[data-grid-card="equipment"]', label: 'Inventario · cuadrícula', minHeight: 200}],
    body: `
<div class="grid min-w-0 gap-4 p-4">
 ${kpiStrip}
 <div data-grid="equipment" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">${equipment.map(equipmentCard).join('')}</div>
</div>`,
  },
  {
    id: 'inventario-pipeline',
    section: 'Inventario',
    surface: 'Pipeline de ubicaciones',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `<div class="grid min-w-0 gap-4 p-4">${pipelineBoard}</div>`,
  },
  {
    id: 'inventario-reservas-lista',
    section: 'Inventario',
    surface: 'Calendario y reservas',
    kind: 'workspace',
    lists: [{
      container: '[data-list="reservations"]',
      head: '[data-list-head="reservations"]',
      row: '[data-list-row="reservations"]',
      label: 'Inventario · reservas',
      template: '--rsv-cols',
      rowHeight: [44, 52],
      // La fila lleva la línea muted de auditoría (quién retiró/devolvió) que
      // sanciona AGENTS.md; por eso no se le aplica el contrato de 44–52 px.
      exemptBelow: 1441,
    }],
    body: `
<div class="grid min-w-0 gap-4 p-4">
 <div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">
  <div data-list="reservations" class="min-w-0 overflow-x-auto"><div class="[--rsv-cols:minmax(9.5rem,1.3fr)_minmax(6.5rem,1fr)_minmax(15.5rem,1.2fr)_minmax(7.5rem,1fr)_minmax(7.5rem,1fr)_minmax(7rem,1fr)_9rem] grid min-w-[67.5rem] gap-2">${reservationHead}${reservations.map(reservationRow).join('')}</div></div>
 </div>
</div>`,
  },
  {
    id: 'inventario-calendario',
    section: 'Inventario',
    surface: 'Calendario mensual',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `<div class="grid min-w-0 gap-4 p-4"><div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">${calendar({10: [{title: 'Rodaje de contenidos · Banco Atlas', count: 3, label: 'Retirado', tone: 'border-warn/40 bg-warn/10 text-warn'}], 17: [{title: 'Streaming de lanzamiento', count: 2, label: 'Reservado', tone: 'border-fono/30 bg-fono/10 text-fono-light'}], 24: [{title: 'Fotografía de producto', count: 1, label: 'Reservado', tone: 'border-fono/30 bg-fono/10 text-fono-light'}]})}</div></div>`,
  },
  {
    id: 'inventario-vacio',
    section: 'Inventario',
    surface: 'Sin resultados',
    kind: 'workspace',
    lists: [],
    grids: [],
    body: `<div class="grid min-w-0 gap-4 p-4"><div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">${emptyState('No hay equipos que coincidan.', 'Probá otra búsqueda.')}</div></div>`,
  },
  {
    id: 'estudio-espacios-cuadricula',
    section: 'Estudio',
    surface: 'Espacios del estudio',
    kind: 'workspace',
    grids: [{container: '[data-grid="studio-spaces"]', card: '[data-grid-card="studio-spaces"]', label: 'Estudio · espacios', minHeight: 200}],
    body: `
<div class="grid min-w-0 gap-4 p-4"><div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">
 <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div class="min-w-0"><h2 class="text-lg font-bold text-fore">Estudio y reservas</h2><p class="mt-1 text-sm text-mute">Espacios, escenarios y franjas de producción. No reserva ni retira equipos.</p></div><div class="flex flex-wrap items-center gap-2">${button('Agregar espacio', 'outline')}${button('Nueva reserva')}</div></div>
 <div data-grid="studio-spaces" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">${spaces.map(spaceCard).join('')}</div>
</div></div>`,
  },
  {
    id: 'estudio-reservas-lista',
    section: 'Estudio',
    surface: 'Reservas en lista',
    kind: 'workspace',
    lists: [{
      container: '[data-list="studio-reservations"]',
      head: '[data-list-head="studio-reservations"]',
      row: '[data-list-row="studio-reservations"]',
      label: 'Estudio · reservas',
      template: '--studio-cols',
      rowHeight: [44, 52],
      exemptBelow: 980,
      // Sin línea de auditoría: la fila mide el contrato vigente.
    }],
    body: `
<div class="grid min-w-0 gap-4 p-4"><div class="min-w-0 rounded-xl border border-fono/30 bg-ink-800 p-5">
 ${studioCalendar}
 <div data-list="studio-reservations" class="mt-4 min-w-0 overflow-x-auto"><div class="[--studio-cols:minmax(9.5rem,1.4fr)_minmax(15.5rem,1.2fr)_minmax(7.5rem,1fr)_minmax(8.5rem,1fr)_7rem_9rem] grid min-w-[67.5rem] gap-2">${studioReservationHead}${studioReservations.map(studioReservationRow).join('')}</div></div>
</div></div>`,
  },
];
