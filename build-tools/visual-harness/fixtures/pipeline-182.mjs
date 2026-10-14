/*
 * Fixtures: Pipeline (SOS-COM, Refs #182 B1/B4): PageHeader, FilterToolbar,
 * tablero con CompactCard y lista con ListGrid/ListRow + BulkBar.
 *
 * Espeja app/sections/pipeline.tsx (LeadCard, LeadListRow, PipelineSection) y
 * app/ui-v2.tsx (PageHeader, FilterToolbar, CompactCard, CompactQuickAction,
 * ListGrid, ListRow, ListActions, BulkBar, StateChip, MoneyText). Valores de
 * estrés: nombre largo, monto 1.234.567.890, USD con decimales, sin monto,
 * sin probabilidad, cliente vinculado, «No contactar» y teléfono presente.
 */
const icon = (paths, size = 16) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const grip = icon('<circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>', 14);
const phoneIcon = icon('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>');
const waIcon = icon('<path d="M21 12a9 9 0 1 1-3.2-6.9L21 3l-1 4.2A8.9 8.9 0 0 1 21 12Z"/>');
const userCheck = icon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>');
const plus = icon('<path d="M12 5v14M5 12h14"/>');
const settings = icon('<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>');
const move = icon('<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>', 14);
const trash = icon('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 14);

const chip = (text, color) => `<span class="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${color} whitespace-nowrap">${text}</span>`;
const tones = {
  ok: 'bg-ok/15 text-ok-text border-ok/25', warn: 'bg-warn/15 text-warn-text border-warn/25',
  info: 'bg-fono/15 text-fono-text border-fono/25', mute: 'bg-ink-600 text-mute border-ink-500 dark:text-fore',
};
const tone = (p) => (p >= 75 ? 'ok' : p >= 40 ? 'warn' : 'mute');
const money = (v, c, cls = '') => (v === null ? `<span class="inline-flex shrink-0 items-center justify-end whitespace-nowrap font-semibold ${cls}">—</span>` : `<span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums ${cls}">${c === 'USD' ? `USD ${v}` : `Gs. ${v}`}</span>`);

const LEADS = [
  {id: 1, name: 'Cooperativa Universitaria del Sur · Campaña integral de verano 2027', stage: 'Nuevo lead', amount: '1.234.567.890', cur: 'PYG', prob: 10, updated: '10-oct', phone: true},
  {id: 2, name: 'Acme SA', stage: 'Nuevo lead', amount: null, cur: 'PYG', prob: null, updated: null, phone: false},
  {id: 3, name: 'Beta Hogar', stage: 'Contactado', amount: '12.345,67', cur: 'USD', prob: 60, updated: '09-oct', phone: true, linked: true},
  {id: 4, name: 'Gamma Retail', stage: 'Contactado', amount: '300.000', cur: 'PYG', prob: 45, updated: '02-oct', phone: false, noContact: true},
  {id: 5, name: 'Delta Logística', stage: 'Ganado', amount: '8.500.000', cur: 'PYG', prob: 100, updated: '01-oct', phone: true, won: true},
];

const quick = (label, glyph) => `<button type="button" class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute transition hover:bg-ink-700 hover:text-fore md:h-7 md:w-7" title="${label}" aria-label="${label}">${glyph}</button>`;
const menu = (name) => `<button type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de la oportunidad: ${name}" class="inline-flex items-center gap-2 rounded-lg transition"><span class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-mute md:h-7 md:w-7" aria-hidden="true">⋮</span></button>`;
const chips = (l) => `${l.noContact ? chip('No contactar', tones.warn) : ''}${l.prob === null ? '<span class="text-[11px] text-mute">Sin probabilidad cargada</span>' : chip(`${l.prob}%`, tones[tone(l.prob)])}${l.linked ? chip('Cliente vinculado', tones.info) : ''}`;

const card = (l) => {
  const hasQuick = (l.phone && !l.noContact) || l.won;
  return `
<div><article data-compact-card class="flex min-w-0 flex-col gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3 shadow-sm">
 <header class="flex min-w-0 items-start justify-between gap-2">
  <button type="button" class="min-h-11 min-w-0 flex-1 text-left text-[13.5px] font-semibold leading-5 text-fore md:min-h-0" aria-label="Ver oportunidad: ${l.name}">${l.name}</button>
  <span class="flex shrink-0 items-center gap-1"><button type="button" class="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute md:h-7 md:w-7" title="Mover ${l.name}" aria-label="Mover ${l.name}">${grip}</button>${menu(l.name)}</span>
 </header>
 <div class="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] leading-4 text-mute">${money(l.amount, l.cur, 'text-sm text-fore')}${l.updated ? `<span class="whitespace-nowrap tabular-nums" title="Última actualización ${l.updated}">· Actualizado ${l.updated}</span>` : ''}</div>
 <div class="flex min-w-0 flex-wrap items-center gap-1">${chips(l)}</div>
 ${hasQuick ? `<div class="flex flex-wrap items-center justify-end gap-1 border-t border-ink-600 pt-2">${l.phone && !l.noContact ? quick(`WhatsApp: ${l.name}`, waIcon) + quick(`Llamar: ${l.name}`, phoneIcon) : ''}${l.won ? quick(`Convertir a cliente: ${l.name}`, userCheck) : ''}</div>` : ''}
</article></div>`;
};

const column = (label, rows, totals) => `
<section aria-label="${label} · ${rows.length} oportunidades" class="grid min-w-[15rem] flex-1 content-start gap-2 rounded-xl border p-3 transition-colors border-ink-600 bg-ink-700/40">
 <header class="flex items-center justify-between gap-2"><h3 class="m-0 flex min-w-0 items-center gap-2 text-sm font-bold text-fore"><span aria-hidden="true" class="h-2 w-2 shrink-0 rounded-full bg-fono"></span><span class="min-w-0 truncate" title="${label}">${label}</span></h3><span class="min-w-6 shrink-0 rounded-full bg-ink-600 px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-fore">${rows.length}</span></header>
 ${totals ? `<div class="grid gap-0.5 text-[10.5px] tabular-nums text-mute"><span class="flex flex-wrap items-baseline gap-x-1"><span class="whitespace-nowrap tabular-nums">${totals}</span></span></div>` : ''}
 ${rows.map(card).join('')}
</section>`;

const pageHeader = `
<header class="ui-page-header mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-0"><div class="ui-page-header-main min-w-0 flex-1 xl:flex xl:min-w-0 xl:items-baseline xl:gap-3"><h1 class="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl xl:shrink-0">Pipeline</h1></div>
<div class="header-actions flex min-w-0 flex-wrap items-center gap-2 max-md:w-full max-md:justify-start xl:flex-nowrap"><button type="button" class="text-button max-md:min-h-11">${settings} Etapas</button><button type="button" class="primary max-md:min-h-11">${plus} Nueva oportunidad</button></div></header>`;

const toolbar = (summary, list) => `
<div data-toolbar="filtros" class="mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap">
 <div class="relative w-full sm:w-72"><input type="search" aria-label="Buscar oportunidades" placeholder="Buscar por nombre, contacto o notas…" style="padding-left:2.25rem"/></div>
 <select aria-label="Etapa" class="min-w-[10rem]"><option>Todas las etapas</option></select>
 <select aria-label="Moneda" class="min-w-[8rem]"><option>Todas las monedas</option></select>
 <div role="group" aria-label="Vista del pipeline"><span class="inline-flex"><button type="button" class="h-11 w-11 md:h-9 md:w-9" aria-pressed="${!list}" aria-label="Tablero">▦</button><button type="button" class="h-11 w-11 md:h-9 md:w-9" aria-pressed="${list}" aria-label="Lista">☰</button></span></div>
 ${list ? '<button type="button" class="text-button min-h-11 md:min-h-8">Seleccionar visibles</button>' : ''}
 <p class="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">${summary}</p>
</div>`;

const kpis = `
<div aria-label="Resumen del pipeline" class="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 max-sm:grid-cols-3">
 <div class="ui-kpi panel"><small class="block text-[10px] font-bold uppercase text-mute">Oportunidades abiertas</small><strong class="tabular-nums">4</strong></div>
 <div class="ui-kpi panel"><small class="block text-[10px] font-bold uppercase text-mute">Ganadas</small><strong class="tabular-nums">1</strong></div>
 <div class="ui-kpi panel"><small class="block text-[10px] font-bold uppercase text-mute">Consultas web</small><strong class="tabular-nums">0</strong></div>
 <div class="ui-kpi panel max-sm:col-span-3"><small class="block text-[10px] font-bold uppercase text-mute">Valor abierto</small><strong class="whitespace-nowrap tabular-nums">Gs. 1.234.867.890</strong></div>
</div>`;

const board = `
<section class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" aria-label="Pipeline">
${pageHeader}${toolbar('5 oportunidades', false)}${kpis}
<div class="grid gap-2">
 <span class="flex min-w-0 items-center gap-1.5 text-[11px] text-mute" title="Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%.">${move}<span class="truncate">Mover: arrastrá una tarjeta a otra etapa</span></span>
 <div class="flex gap-3 overflow-x-auto pb-2">
  ${column('Nuevo lead', LEADS.filter((l) => l.stage === 'Nuevo lead'), 'Gs. 123.456.789 ponderado')}
  ${column('Contactado', LEADS.filter((l) => l.stage === 'Contactado'), 'Gs. 135.000 ponderado')}
  ${column('Ganado', LEADS.filter((l) => l.stage === 'Ganado'), 'Gs. 8.500.000 ponderado')}
 </div>
</div></section>`;

const EDIT = 'grid-cols-[2.75rem_minmax(11rem,1.6fr)_7rem_8rem_4.5rem_6.5rem_5.5rem_11rem]';
const row = (l, selected) => `
<div role="row" class="list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:min-h-11 md:py-2 ${EDIT}">
 <span role="cell" class="flex justify-center"><label class="select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8" title="Seleccionar oportunidad"><input type="checkbox" aria-label="Seleccionar ${l.name}" ${selected ? 'checked' : ''}/></label></span>
 <span role="cell" class="flex min-w-0 items-center gap-2"><button type="button" class="min-h-11 min-w-0 truncate text-left text-[13.5px] font-semibold text-fore md:min-h-0" title="${l.name}" aria-label="Ver oportunidad: ${l.name}">${l.name}</button>${l.noContact ? chip('No contactar', tones.warn) : ''}</span>
 <span role="cell" class="min-w-0">${chip(l.stage, tones.info)}</span>
 <span role="cell" class="text-right">${money(l.amount, l.cur, 'text-[13.5px] text-fore')}</span>
 <span role="cell" class="min-w-0">${l.prob === null ? '<span class="text-[11px] text-mute" title="Sin probabilidad cargada">—</span>' : chip(`${l.prob}%`, tones[tone(l.prob)])}</span>
 <span role="cell" class="min-w-0 text-[12px] text-mute">${l.linked ? chip('Vinculado', tones.info) : '—'}</span>
 <span role="cell" class="list-date whitespace-nowrap text-[11px] tabular-nums text-mute">${l.updated || '—'}</span>
 <div role="cell" class="list-actions silent-scroll">${l.phone && !l.noContact ? quick(`WhatsApp: ${l.name}`, waIcon) + quick(`Llamar: ${l.name}`, phoneIcon) : ''}${l.won ? quick(`Convertir a cliente: ${l.name}`, userCheck) : ''}${menu(l.name)}</div>
</div>`;

const COLS = ['', 'Oportunidad', 'Etapa', 'Valor', 'Prob.', 'Cliente', 'Actualizado', 'Acciones'];
const list = `
<section class="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4" aria-label="Pipeline">
${pageHeader}${toolbar('5 oportunidades', true)}
<div role="status" aria-live="polite" class="bulk-bar"><span class="bulk-count"><b>2</b> seleccionados</span><div class="inline-actions bulk-actions"><button type="button" class="secondary min-h-11 md:min-h-10">${move}Mover a etapa</button><button type="button" class="secondary danger min-h-11 md:min-h-10">${trash}Eliminar</button><button type="button" class="text-button">Limpiar</button></div></div>
<div class="grid min-w-0 gap-2"><div role="table" aria-label="Oportunidades" class="silent-scroll relative min-w-0 overflow-x-auto"><div class="min-w-[64rem]">
 <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${EDIT}">${COLS.map((c, i) => `<span role="columnheader" class="${c === 'Valor' || c === 'Acciones' ? 'text-right' : 'text-left'} whitespace-nowrap ${i === COLS.length - 1 ? 'list-actions-head' : ''}">${c}</span>`).join('')}</div>
 <div role="rowgroup">${LEADS.map((l, i) => row(l, i < 2)).join('')}</div>
</div></div></div></section>`;

export default [
  {id: 'pipeline-tablero-182', section: 'Pipeline', surface: 'Tablero con CompactCard, header y filtros (#182)', kind: 'workspace', body: board},
  {id: 'pipeline-lista-182', section: 'Pipeline', surface: 'Lista con ListGrid, lote y filtros (#182)', kind: 'workspace', body: list},
];
