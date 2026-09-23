/*
 * Fixtures: secciones comerciales v2 (SOS-COM, campaña #41 / #43).
 * Espejan app/sections/presupuestos.tsx, planes.tsx, pipeline.tsx y metricas.tsx
 * con los patrones de app/ui-v2.tsx y los objetos de owncoding-ui. Son la
 * evidencia del rediseño de sección: KPIs, lista con encabezado y plantilla,
 * tablero kanban (excepción del contrato) y estados con datos reales de estrés.
 */

const label = (text) => `<div class="text-[11px] font-medium uppercase tracking-wider text-mute">${text}</div>`;
/* app/ui-v2.tsx MoneyText: la celda de dinero v2 (mismas clases que el markup real). */
const moneyText = (text, extra = '') => `<span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums${extra ? ` ${extra}` : ''}">${text}</span>`;
const kpi = (text, value, hint, destacado = false) => `<div class="relative overflow-hidden rounded-xl border ${destacado ? 'border-fono/30 bg-gradient-to-br from-fono-dark via-fono to-fono' : 'border-ink-600 bg-ink-800'} p-4">
 <div class="text-[11px] font-medium uppercase tracking-wider ${destacado ? 'text-onbrand/75' : 'text-mute'}">${text}</div>
 <div class="mt-1.5 text-2xl font-semibold tracking-tight md:text-3xl ${destacado ? 'text-onbrand' : 'text-fore'}">${value}</div>
 <div class="mt-1.5 flex items-center gap-2 text-xs"><span class="${destacado ? 'text-onbrand/75' : 'text-mute'}">${hint}</span></div>
</div>`;
const kpiStrip = (children) => `<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Métricas">${children}</div>`;
const stateChip = (tone, text) => {
  const colors = {ok: 'bg-ok/15 text-ok border-ok/40', warn: 'bg-warn/15 text-warn border-warn/40', bad: 'bg-bad/15 text-bad border-bad/40', info: 'bg-info/15 text-info border-info/40', mute: 'bg-ink-600 text-mute border-ink-500'};
  return `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${colors[tone]}">${text}</span>`;
};
const button = (text, variant = 'primary') => `<button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition md:h-9 ${variant === 'primary' ? 'bg-fono text-onbrand hover:bg-fono-light' : 'border border-ink-500 text-fore hover:border-fono hover:bg-fono/10'}">${text}</button>`;

/* ---- Presupuestos: KpiStrip + ListGrid con encabezado y plantilla ------- */
const BUDGET_COLUMNS = ['Presupuesto', 'Cliente', 'Estado', 'Ítems', 'Vigencia', 'Sin IVA', 'Total · IVA incl.', 'Acciones'];
const BUDGET_TEMPLATE = 'grid-cols-[minmax(26rem,2.2fr)_minmax(16rem,1.4fr)_7rem_4rem_7rem_9rem_9rem_15rem]';
const budgetRow = ({number, title, client, tone, state, items, valid, due, subtotal, total}) => `<div role="row" class="budget-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${BUDGET_TEMPLATE}">
 <div class="flex min-w-0 items-baseline gap-2"><b class="shrink-0 font-mono text-[11px] font-semibold text-mute">${number}</b><span class="min-w-0 text-[13.5px] font-semibold leading-tight text-fore [overflow-wrap:anywhere]" title="${title}">${title}</span></div>
 <span class="min-w-0 text-[12px] leading-tight text-mute [overflow-wrap:anywhere]" title="${client}">${client}</span>
 <span class="min-w-0">${stateChip(tone, state)}</span>
 <span class="whitespace-nowrap text-right text-[12px] tabular-nums text-mute">${items}</span>
 <span class="list-date min-w-0 whitespace-nowrap text-[11px] text-mute"${due ? ' data-tone="warn"' : ''} title="${valid}">${valid}</span>
 <span class="text-right">${moneyText(subtotal, 'text-fore')}</span>
 <span class="text-right">${moneyText(total, 'text-[13.5px] text-fore')}</span>
 <span class="flex min-w-0 items-center justify-end gap-2 [&_button.icon-button]:h-8 [&_button.icon-button]:min-h-8 [&_button.icon-button]:w-8 [&_button.icon-button]:min-w-8"><button type="button" class="text-button">Abrir presupuesto</button><button type="button" class="icon-button record-remove" aria-label="Mover a la papelera: ${title}" title="Mover a la papelera">🗑</button></span>
</div>`;
const presupuestosSection = `<section class="directory grid gap-4" aria-label="Presupuestos">
 ${kpiStrip([
   kpi('Presupuestos', '3', 'Total sin IVA: BRL 1.000 · Gs. 14.500.000 · US$ 2.400', true),
   kpi('Borradores', '1', 'Sin enviar al cliente'),
   kpi('Aceptadas', '1', 'Con aprobación del cliente'),
   kpi('Vencen esta semana', '1', 'Vigencia en los próximos 7 días'),
 ].join(''))}
 <div role="table" aria-label="Presupuestos" class="silent-scroll min-w-0 overflow-x-auto">
  <div class="min-w-[90rem]">
   <div role="row" class="grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${BUDGET_TEMPLATE}">${BUDGET_COLUMNS.map((column, index) => `<span role="columnheader" class="${index === BUDGET_COLUMNS.length - 1 ? 'text-right' : index >= 3 && index <= 6 ? 'text-right' : 'text-left'} whitespace-nowrap">${column}</span>`).join('')}</div>
   <div role="rowgroup">
    ${budgetRow({number: 'P-2026-014', title: 'Campaña de lanzamiento regional · producción audiovisual integral', client: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', tone: 'info', state: 'Enviado', items: 12, valid: '25-sept', due: true, subtotal: 'BRL 1.000,00', total: 'BRL 1.100,00'})}
    ${budgetRow({number: 'P-2026-013', title: 'Retainer mensual de contenidos y social media', client: 'Estudio Ñandú', tone: 'ok', state: 'Aceptado', items: 4, valid: 'Sin fecha', due: false, subtotal: 'Gs. 14.500.000', total: 'Gs. 15.950.000'})}
    ${budgetRow({number: 'P-2026-012', title: 'Cobertura de evento corporativo', client: 'Fundación Niñez y Comunidad', tone: 'mute', state: 'Borrador', items: 2, valid: '30-oct', due: false, subtotal: 'US$ 2.400,00', total: 'US$ 2.640,00'})}
   </div>
  </div>
 </div>
</section>`;

/* ---- Planes: KpiStrip + comparador (tabla compartida) ------------------- */
const PLAN_TEMPLATE = 'min-w-0 max-w-full text-fore';
const planItems = (items) => items.map((item) => `<li data-plan-item class="grid gap-2 border-b border-ink-600/60 pb-2 text-xs leading-relaxed last:border-0 last:pb-0">
 <p class="whitespace-pre-wrap">${item.description}</p>
 <div data-plan-item-price class="grid gap-0.5 rounded-lg border border-ink-600 bg-ink-900 p-2 text-[11px] text-mute"><span class="whitespace-nowrap">Cantidad del ítem: ${item.quantity}</span><span class="whitespace-nowrap">Precio unitario: ${item.price}</span><strong class="whitespace-nowrap text-xs text-fore">Subtotal: ${item.subtotal}</strong></div>
</li>`).join('');
const planHeader = (plan) => `<th scope="col" class="sticky top-0 z-[1] border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top last:border-r-0">
 <h3 class="whitespace-normal text-sm font-bold leading-snug text-fore">${plan.name}</h3>
 <span class="mt-1 block text-[11px] font-medium leading-4 text-mute">${plan.currency} · ${plan.items.length} ítems</span>
 ${plan.archived ? '<span class="mt-1 block text-[11px] font-medium leading-4 text-mute">Archivado</span>' : ''}
 <div class="mt-2 flex flex-wrap gap-1.5"><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-mute md:h-9">Editar</button><button type="button" class="icon-button record-remove" aria-label="Mover a la papelera: ${plan.name}" title="Mover a la papelera">🗑</button></div>
</th>`;
const planesSection = `<section class="directory grid gap-4" aria-label="Planes reutilizables">
 ${kpiStrip([
   kpi('Planes', '3', 'Valor de ítems: Gs. 1.234.567.890 · US$ 12.345', true),
   kpi('Activos', '2', 'Disponibles para presupuestos'),
   kpi('Archivados', '1', 'Fuera de circulación'),
   kpi('Monedas', '3', 'PYG · USD · BRL'),
 ].join(''))}
 <div class="flex flex-wrap items-center justify-end"><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg bg-fono px-4 text-sm font-semibold text-onbrand md:h-9">+ Nuevo plan</button></div>
 <div class="${PLAN_TEMPLATE}">
  <p class="max-w-[76ch] text-xs leading-5 text-mute">Todos los entregables y precios guardados, sin IVA. El IVA se define en el presupuesto. Cada plan conserva su moneda. Desplazá la tabla horizontalmente para comparar.</p>
  <div class="mt-3 max-w-full overflow-x-auto rounded-xl border border-ink-600 bg-ink-800" role="region" aria-label="Comparación de planes" tabindex="0">
   <table class="w-full table-fixed border-separate border-spacing-0 tabular-nums" style="min-width:62rem">
    <caption class="border-b border-ink-600 bg-ink-900 px-3 py-3 text-left text-xs font-semibold text-mute">Planes, precios y entregables incluidos</caption>
    <thead><tr><th scope="col" class="sticky left-0 z-[3] w-44 border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top">Comparar</th>${[
      {name: 'Producción audiovisual integral para campaña de lanzamiento regional · 12 meses', currency: 'PYG', archived: false, items: [{description: 'Dirección creativa y guion técnico; Rodaje en locación: 3 jornadas completas; Edición, color y mezcla final; Entrega de master y cortes para redes', quantity: '12', price: 'Gs. 102.880.658', subtotal: 'Gs. 1.234.567.890'}]},
      {name: 'Retainer mensual de contenidos y social media', currency: 'USD', archived: false, items: [{description: 'Planificación mensual de contenidos; Reporte de métricas; Community management', quantity: '1', price: 'US$ 10.000,00', subtotal: 'US$ 10.000,00'}, {description: 'Producción de piezas gráficas adicionales', quantity: '3', price: 'US$ 781,89', subtotal: 'US$ 2.345,67'}]},
      {name: 'Plan archivado sin ítems guardados', currency: 'BRL', archived: true, items: []},
    ].map(planHeader).join('')}</tr></thead>
    <tbody>
     <tr data-plan-total><th scope="row" class="sticky left-0 z-[2] w-44 border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top font-bold text-fore border-t-2 border-t-fono/60">Total de ítems <small class="mt-1 block text-[11px] font-medium text-mute">Sin IVA</small></th>${[
      'Gs. 1.234.567.890', 'US$ 12.345,67', null,
    ].map((total) => `<td class="border-b border-r border-ink-600 px-3 py-3 text-left align-top text-[13px] leading-relaxed last:border-r-0 border-t-2 border-t-fono/60 bg-fono/10"><strong class="text-base font-bold tracking-tight text-fore">${total || 'No disponible'}</strong>${total ? '' : '<small class="mt-1 block text-[11px] font-medium text-mute">Sin ítems guardados</small>'}</td>`).join('')}</tr>
     <tr><th scope="row" class="sticky left-0 z-[2] w-44 border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top font-bold text-fore">Entregables incluidos</th>${[
      `<ol class="grid gap-2">${planItems([{description: 'Dirección creativa y guion técnico; Rodaje en locación: 3 jornadas completas; Edición, color y mezcla final; Entrega de master y cortes para redes', quantity: '12', price: 'Gs. 102.880.658', subtotal: 'Gs. 1.234.567.890'}])}</ol>`,
      `<ol class="grid gap-2">${planItems([{description: 'Planificación mensual de contenidos; Reporte de métricas; Community management', quantity: '1', price: 'US$ 10.000,00', subtotal: 'US$ 10.000,00'}])}</ol>`,
      '<span class="text-[11px] font-medium text-mute">Sin entregables guardados.</span>',
    ].map((cell) => `<td class="border-b border-r border-ink-600 px-3 py-3 text-left align-top text-[13px] leading-relaxed last:border-r-0">${cell}</td>`).join('')}</tr>
     <tr><th scope="row" class="sticky left-0 z-[2] w-44 border-b border-r border-ink-600 bg-ink-900 px-3 py-3 text-left align-top font-bold text-fore">Condiciones y fuente</th>${[
      'Contrato anual con renovación automática.\nFacturación el día 5 de cada mes.',
      'Se factura por adelantado, sin IVA. El plan conserva su moneda.',
      'Sin notas guardadas.',
    ].map((notes) => `<td class="border-b border-r border-ink-600 px-3 py-3 text-left align-top text-xs leading-relaxed text-mute whitespace-pre-wrap last:border-r-0">${notes}</td>`).join('')}</tr>
    </tbody>
   </table>
  </div>
 </div>
</section>`;

/* ---- Pipeline: KPIs, totales por etapa y tablero kanban ----------------- */
const leadCard = ({name, amount, probability, email, tone}) => `<article class="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3">
 <header class="flex items-start justify-between gap-2"><b class="min-w-0 text-[13px] font-semibold text-fore [overflow-wrap:anywhere]" title="${name}">${name}</b><button type="button" class="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute active:cursor-grabbing md:h-7 md:w-7" style="touch-action:none" title="Mover ${name}" aria-label="Mover ${name}">⠿</button></header>
 ${moneyText(amount, 'text-sm text-fore')}
 <div class="flex flex-wrap items-center gap-2 text-[11px]">${stateChip(tone, `${probability}%`)}<span class="min-w-0 text-mute [overflow-wrap:anywhere]">${email}</span></div>
 <p class="text-[11px] leading-4 text-mute [overflow-wrap:anywhere]">Próximo paso: enviar la propuesta ajustada y confirmar fecha de rodaje.</p>
 <footer class="flex flex-wrap items-center justify-end gap-1 border-t border-ink-600 pt-2"><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-mute md:h-8">Ver oportunidad</button></footer>
</article>`;
const leadColumn = (name, count, weighted, cards, readOnly = false) => `<section aria-label="${name} · ${count} oportunidades" class="grid min-w-[15rem] flex-1 content-start gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3">
 <header class="flex items-baseline justify-between gap-2"><h3 class="text-sm font-bold text-fore">${name}${readOnly ? ' · desactivada' : ''}</h3><span class="text-xs tabular-nums text-mute">${count}</span></header>
 ${weighted ? `<div class="grid gap-0.5 text-[11px] tabular-nums text-mute"><span class="whitespace-nowrap">${moneyText(weighted)} ponderado</span></div>` : ''}
 ${cards || '<p class="text-xs text-mute">Sin oportunidades.</p>'}
</section>`;
const pipelineSection = `<section class="grid gap-4" aria-label="Pipeline comercial">
 ${kpiStrip([
   kpi('Oportunidades abiertas', '6', 'Sin ganar ni perder', true),
   kpi('Ganadas', '2', 'Conversiones cerradas'),
   kpi('Consultas web', '3', 'Origen: landing Scale OS'),
   kpi('Valor abierto', `<span class="flex flex-wrap items-baseline gap-2">${moneyText('Gs. 44.000.000')}${moneyText('US$ 1.200,00')}</span>`, 'Sin convertir monedas'),
 ].join(''))}
 <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Totales por etapa">
  <article class="rounded-xl border border-ink-600 bg-ink-800 p-4"><h3 class="text-sm font-bold text-fore">Contactado</h3><p class="mt-1 text-2xl font-semibold tabular-nums text-fore">3</p><p class="text-[11px] text-mute">oportunidades</p><div class="mt-2 grid gap-0.5 text-[11px] tabular-nums"><span class="whitespace-nowrap text-fore">${moneyText('Gs. 12.500.000')} ponderado</span><span class="whitespace-nowrap text-mute">${moneyText('Gs. 25.000.000')} abierto</span></div></article>
  <article class="rounded-xl border border-ink-600 bg-ink-800 p-4"><h3 class="text-sm font-bold text-fore">Propuesta</h3><p class="mt-1 text-2xl font-semibold tabular-nums text-fore">2</p><p class="text-[11px] text-mute">oportunidades</p><div class="mt-2 grid gap-0.5 text-[11px] tabular-nums"><span class="whitespace-nowrap text-fore">${moneyText('US$ 840,00')} ponderado</span><span class="whitespace-nowrap text-mute">${moneyText('US$ 1.200,00')} abierto</span></div></article>
  <article class="rounded-xl border border-ink-600 bg-ink-800 p-4"><h3 class="text-sm font-bold text-fore">Ganado</h3><p class="mt-1 text-2xl font-semibold tabular-nums text-fore">2</p><p class="text-[11px] text-mute">oportunidades</p><div class="mt-2 grid gap-0.5 text-[11px] tabular-nums"><span class="whitespace-nowrap text-mute">Sin montos cargados</span></div></article>
 </div>
 <div class="flex flex-wrap items-center justify-end gap-2"><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg border border-ink-500 px-4 text-sm font-semibold text-fore md:h-9">Etapas</button><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg bg-fono px-4 text-sm font-semibold text-onbrand md:h-9">+ Nueva oportunidad</button></div>
 <div class="grid gap-2">
  <div class="flex items-center gap-2 text-[11px] text-mute">Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%.</div>
  <div class="flex gap-3 overflow-x-auto pb-2">
   ${leadColumn('Nuevo lead', 1, 'Gs. 6.000.000', leadCard({name: 'Consultorio Dental Sonrisa', amount: 'Gs. 6.000.000', probability: 30, email: 'contacto@sonrisa.com.py', tone: 'mute'}))}
   ${leadColumn('Contactado', 2, 'Gs. 12.500.000', leadCard({name: 'Cooperativa Multiactiva de Servicios Múltiples Limitada', amount: 'Gs. 25.000.000', probability: 50, email: 'compras@coopservicios.com.py', tone: 'warn'}) + leadCard({name: 'Estudio Ñandú', amount: 'Gs. 4.000.000', probability: 40, email: 'hola@arbol.example', tone: 'warn'}))}
   ${leadColumn('Propuesta', 1, 'US$ 840,00', leadCard({name: 'Fundación Niñez y Comunidad', amount: 'US$ 1.200,00', probability: 70, email: 'contacto@ninezcomunidad.org.py', tone: 'ok'}))}
   ${leadColumn('propuesta-vieja', 1, 'US$ 20,00', leadCard({name: 'Cliente histórico sin etapa activa', amount: 'US$ 100,00', probability: 20, email: 'histórico@ejemplo.com', tone: 'mute'}), true)}
  </div>
 </div>
</section>`;

/* ---- Métricas: tablero de crecimiento (Stat + barras + tabla) ----------- */
const dayStart = Date.UTC(2026, 7, 22); // 22 ago 2026: 30 días corridos válidos
const days = Array.from({length: 30}, (_, index) => new Date(dayStart + index * 86_400_000).toISOString().slice(0, 10));
const counts = [1024, 987, 0, 1540, 2331, 1204, 876, 990, 1105, 1502, 998, 744, 1310, 1622, 1805, 1201, 933, 1010, 1475, 1320, 1188, 902, 1210, 1660, 1902, 1433, 1108, 995, 1215, 1889];
const max = Math.max(...counts);
const growthStat = (text, value, change, sub) => `<div class="relative overflow-hidden rounded-xl border border-ink-600 bg-ink-800 p-4"><div class="text-[11px] font-medium uppercase tracking-wider text-mute">${text}</div><div class="mt-1.5 text-2xl font-semibold tracking-tight text-fore md:text-3xl">${value}</div><div class="mt-1.5 flex items-center gap-2 text-xs"><span class="font-medium text-ok">${change}</span><span class="text-mute">${sub}</span></div></div>`;
const metricasSection = `<div class="grid gap-4 rounded-xl border border-fono/30 bg-ink-800 p-5">
 <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div class="min-w-0"><div class="text-xs font-bold uppercase tracking-[.18em] text-fono-light">Captación digital</div><h2 class="mt-1 text-xl font-bold text-fore">Visitas y crecimiento</h2></div><label class="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Período<select class="h-11 w-44 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore md:h-9 md:text-sm" aria-label="Período"><option>Últimos 7 días</option><option selected>Últimos 30 días</option><option>Últimos 90 días</option></select></label></header>
 <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">${growthStat('Páginas vistas', '37.479', '128,4%', 'vs. período anterior')}${growthStat('Vistas desde móvil', '18.240', '—', 'Sin base anterior')}${growthStat('Clics en WhatsApp', '1.284', '12,5%', 'vs. período anterior')}</div>
 <section aria-labelledby="growth-evolution"><h3 id="growth-evolution" class="text-sm font-bold text-fore">Evolución diaria · páginas vistas</h3><div role="img" aria-label="Páginas vistas durante 30 días. 37.479 en total." class="mt-2 flex h-40 items-end gap-[3px] rounded-t-lg border border-b-ink-500 border-ink-600 bg-ink-900 px-2 pt-2">${counts.map((count, index) => `<div class="min-w-0 flex-1 rounded-t bg-fono" style="height:${Math.max(1, (count / max) * 100)}%" title="${days[index]}: ${count} vistas"></div>`).join('')}</div><div class="mt-1 flex justify-between gap-2 text-[11px] tabular-nums text-mute"><span>${days[0]}</span><span>${days[days.length - 1]}</span></div></section>
 <p class="rounded-lg border border-info/25 bg-info/10 p-2 text-xs text-mute">Son eventos registrados, no personas únicas ni usuarios conectados. Las vistas móviles no se suman al total de páginas. Las comprobaciones de despliegue quedan excluidas.</p>
</div>`;

export default [
  {id: 'seccion-presupuestos', section: 'Presupuestos', surface: 'Sección v2 con lista y KPIs', kind: 'workspace', lists: [{container: '[role="table"]', head: '[role="row"]', row: '[role="rowgroup"] [role="row"]', label: 'Presupuestos · lista v2', rowHeight: [44, 52]}], body: presupuestosSection},
  {id: 'seccion-planes', section: 'Planes', surface: 'Sección v2 con comparador', kind: 'workspace', body: planesSection},
  {id: 'seccion-pipeline', section: 'Pipeline', surface: 'Sección v2 con tablero', kind: 'workspace', body: pipelineSection},
  {id: 'seccion-metricas', section: 'Métricas', surface: 'Sección v2 de crecimiento', kind: 'workspace', body: metricasSection},
];
