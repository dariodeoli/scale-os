/*
 * Fixtures: fichas comerciales del rediseño v2 (SOS-COM, campaña #41 / #43).
 * Cada bloque espeja el JSX real ya migrado a Tailwind + objetos de la librería:
 *   - app/client-reporting.tsx (ficha de reportes y términos comerciales)
 *   - app/client-commercial-lifecycle.tsx (historial + enmienda)
 *   - app/quote-composer.tsx (compositor de presupuestos/planes)
 *   - app/client-identity.tsx (apariencia del cliente)
 * Datos de estrés: nombres y condiciones largas, montos grandes en dos monedas
 * y una segunda fila sin dato. Se declaran sin listas/grids medibles: son
 * formularios y tablas de detalle, no el contrato de filas finitas.
 */

const iconX = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
const iconGrip = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></svg>';
const iconPlus = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

const label = 'block text-[11px] font-medium uppercase tracking-wider text-mute mb-1.5';
const input = 'w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-fore h-11 md:h-9 text-base md:text-sm outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40';
const select = 'w-full rounded-lg border border-ink-500 bg-ink-800 px-3 text-fore h-11 md:h-9 text-base md:text-sm outline-none transition cursor-pointer focus:border-fono focus:ring-1 focus:ring-fono/40';
// La librería resuelve clases con merge: al pasar un ancho, `w-full` se retira.
const sized = (base, extra) => `${base.replace('w-full ', '')} ${extra}`;
const button = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 font-semibold transition h-11 md:h-9 text-sm bg-fono text-onbrand hover:bg-fono-light';
const buttonOutline = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 font-semibold transition h-11 md:h-9 text-sm border border-ink-500 bg-transparent text-fore hover:border-fono hover:bg-fono/10';

const field = (text, control) => `<div class="grid gap-1"><label class="${label}">${text}</label>${control}</div>`;

/* app/ui-v2.tsx MoneyText: misma celda de dinero v2 que el JSX real. */
const moneyText = (text, extra = '') => `<span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums${extra ? ` ${extra}` : ''}">${text}</span>`;
/* app/ui-v2.tsx CurrencyField: Label + Select con el catálogo de la empresa (sin USDT). */
const currencyOptions = ['Guaraníes (PYG)', 'Dólares (USD)', 'Euros (EUR)', 'Reales (BRL)', 'Pesos argentinos (ARS)', 'Pesos mexicanos (MXN)'];
const currencyField = (id, selected, extra = '') => `<div class="grid gap-1.5 ${extra}"><label class="${label}" for="${id}">Moneda</label><select class="${select} max-w-[11rem]" id="${id}">${currencyOptions.map(text => `<option${text === selected ? ' selected' : ''}>${text}</option>`).join('')}</select></div>`;

/* app/client-reporting.tsx — ficha de reportes y términos comerciales. */
const reportingSheet = `
<section class="grid gap-4" aria-label="Datos comerciales del cliente">
 <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-base font-bold text-fore">Datos comerciales y reportes</h3><span class="rounded-md border border-ink-600 bg-ink-700 px-2 py-0.5 text-xs font-medium text-mute">Solo lectura</span></div>
 <p class="rounded-lg border border-info/25 bg-info/10 p-2 text-xs text-mute">Registrá solo información conocida. Estos campos no reconstruyen automáticamente estados pasados. Si no conocés la fecha real de inicio, dejala vacía.</p>
 <section class="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" aria-labelledby="client-commercial-terms-title">
  <h4 id="client-commercial-terms-title" class="text-sm font-bold text-fore">Términos comerciales efectivos</h4>
  <dl class="grid gap-2 text-sm">
   <div class="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3"><dt class="text-mute">Plan</dt><dd class="min-w-0 font-semibold [overflow-wrap:anywhere] sm:text-right">Producción audiovisual integral para campaña de lanzamiento regional · 12 meses</dd></div>
   <div class="flex items-center justify-between gap-3"><dt class="min-w-0 text-mute">Monto recurrente</dt><dd class="shrink-0 font-semibold tabular-nums">${moneyText('Gs. 1.234.567.890')}</dd></div>
   <div class="flex items-center justify-between gap-3"><dt class="min-w-0 text-mute">Inicio comercial</dt><dd class="shrink-0 font-semibold tabular-nums">14 sept 2024 · 00:00</dd></div>
   <div class="flex items-center justify-between gap-3"><dt class="min-w-0 text-mute">Fin comercial</dt><dd class="shrink-0 font-semibold tabular-nums">Sin fecha de fin</dd></div>
   <div class="flex items-center justify-between gap-3"><dt class="min-w-0 text-mute">Factura comercial del cliente</dt><dd class="shrink-0 font-semibold tabular-nums">Sí</dd></div>
   <div class="grid gap-1 sm:flex sm:items-start sm:justify-between sm:gap-3"><dt class="text-mute">Comisión</dt><dd class="min-w-0 font-semibold [overflow-wrap:anywhere] sm:text-right">12,5% · María José Fernández de la Cruz</dd></div>
  </dl>
 </section>
 <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
  ${field('Tipo de cliente', `<select class="${select}" aria-label="Tipo de cliente"><option>Empresa</option></select>`)}
  ${field('Plan de servicio', `<select class="${select}" aria-label="Plan de servicio"><option>Plan integral de contenidos y campañas · 12 meses</option></select>`)}
  ${field('Fecha real de inicio (opcional)', `<input class="${sized(input, 'w-40')}" type="date" value="2024-01-15">`)}
  ${field('Plan comercial', `<select class="${select}" aria-label="Plan comercial"><option>Producción audiovisual integral</option></select>`)}
  ${field('Monto recurrente entero', `<div class="relative"><span class="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-xs font-semibold text-mute">Gs.</span><input class="${sized(input, 'w-44 pl-12 tabular-nums')}" inputmode="numeric" value="1.234.567.890" aria-label="Monto recurrente entero"></div>`)}
  ${currencyField('client-reporting-currency', 'Guaraníes (PYG)')}
  ${field('Inicio comercial', `<input class="${sized(input, 'w-40')}" type="date" value="2024-01-15">`)}
  ${field('Fin del plan (opcional)', `<input class="${sized(input, 'w-40')}" type="date" value="">`)}
  ${field('Factura comercial del cliente', `<select class="${select}" aria-label="Factura comercial del cliente"><option>Sí</option></select>`)}
  ${field('Tipo de comisión', `<select class="${select}" aria-label="Tipo de comisión"><option>Porcentaje</option></select>`)}
  ${field('Destinatario de comisión', `<select class="${select}" aria-label="Destinatario de comisión"><option>María José Fernández de la Cruz</option></select>`)}
  ${field('Comisión entera (%)', `<input class="${sized(input, 'w-24 tabular-nums')}" inputmode="numeric" maxlength="3" value="12" aria-label="Comisión entera (%)">`)}
 </div>
 <div class="flex flex-wrap gap-2"><button type="button" class="${buttonOutline}">Recargar ficha (descarta cambios)</button></div>
</section>`;

/* app/client-commercial-lifecycle.tsx — historial + enmienda. */
const lifecycleSheet = `
<section class="grid gap-4" aria-label="Ciclo comercial del cliente">
 <h3 class="text-base font-bold text-fore">Ciclo comercial</h3>
 <p class="max-w-[76ch] text-xs leading-5 text-mute">Cada cambio se registra como una enmienda nueva. Las condiciones históricas se conservan tal como se contrataron.</p>
 <div class="min-w-0 [&_table]:min-w-[52rem]">
  <div class="hidden max-h-[70vh] overflow-auto md:block"><table class="w-full text-sm">
   <thead class="sticky top-0 z-10 bg-ink-800"><tr class="border-b border-ink-600 text-left text-xs uppercase tracking-wider text-mute"><th class="px-2.5 py-1.5 font-medium">Vigente desde</th><th class="px-2.5 py-1.5 font-medium">Cliente desde</th><th class="px-2.5 py-1.5 font-medium">Plan</th><th class="px-2.5 py-1.5 text-right font-medium">Mensual</th><th class="px-2.5 py-1.5 font-medium">Descuento</th><th class="px-2.5 py-1.5 font-medium">Extras y entregables</th></tr></thead>
   <tbody>
    <tr class="border-b border-ink-600/60 last:border-0">
     <td class="px-2.5 py-1.5 text-fore"><time class="whitespace-nowrap">14 sept 2024 · 00:00</time></td>
     <td class="px-2.5 py-1.5 text-fore"><time class="whitespace-nowrap">29 feb 2024 · 00:00</time></td>
     <td class="px-2.5 py-1.5"><div class="grid gap-0.5"><strong class="text-fore">Producción audiovisual integral para campaña de lanzamiento regional</strong><small class="text-[11px] text-mute">Versión contratada: v3.2 con anexos de cesión de derechos y música licenciada</small></div></td>
     <td class="px-2.5 py-1.5 text-right text-fore">${moneyText('Gs. 1.234.567.890')}</td>
     <td class="px-2.5 py-1.5"><div class="grid gap-0.5"><span class="whitespace-nowrap text-fore">Porcentaje · 12,5%</span><small class="text-[11px] text-mute">Por seis meses consecutivos</small></div></td>
     <td class="px-2.5 py-1.5"><span class="text-fore">Dos reels extra por mes; Reporte de métricas quincenal</span></td>
    </tr>
    <tr class="border-b border-ink-600/60 last:border-0">
     <td class="px-2.5 py-1.5 text-fore"><time class="whitespace-nowrap">01 ene 2024 · 00:00</time></td>
     <td class="px-2.5 py-1.5 text-fore"><span class="text-mute">Sin fecha registrada</span></td>
     <td class="px-2.5 py-1.5"><div class="grid gap-0.5"><strong class="text-fore">Retainer mensual de contenidos</strong><small class="text-[11px] text-mute">Versión contratada: v1.0</small></div></td>
     <td class="px-2.5 py-1.5 text-right text-fore">${moneyText('USD 12.345,67')}</td>
     <td class="px-2.5 py-1.5"><div class="grid gap-0.5"><span class="whitespace-nowrap text-fore">Importe fijo · USD 1.000</span></div></td>
     <td class="px-2.5 py-1.5"><span class="text-fore">Sin extras registrados</span></td>
    </tr>
   </tbody>
  </table></div>
   <div class="grid grid-cols-1 gap-2 p-2.5 md:hidden">
    <div class="grid gap-2 rounded-lg border border-ink-600 bg-ink-800 p-3 text-sm">
     <div class="flex flex-wrap items-center justify-between gap-2"><span class="font-mono text-[11px] font-semibold text-mute">14 sept 2024 · 00:00</span>${moneyText('Gs. 1.234.567.890', 'text-fore')}</div>
     <p class="font-semibold text-fore">Producción audiovisual integral para campaña de lanzamiento regional</p>
     <p class="text-xs text-mute">Versión contratada: v3.2 con anexos de cesión de derechos y música licenciada</p>
     <p class="text-xs text-mute">Cliente desde: 29 feb 2024 · 00:00</p>
     <p class="text-xs text-mute">Descuento: Porcentaje · 12,5% · Por seis meses consecutivos</p>
     <p class="text-xs text-mute">Extras: Dos reels extra por mes; Reporte de métricas quincenal</p>
    </div>
    <div class="grid gap-2 rounded-lg border border-ink-600 bg-ink-800 p-3 text-sm">
     <div class="flex flex-wrap items-center justify-between gap-2"><span class="font-mono text-[11px] font-semibold text-mute">01 ene 2024 · 00:00</span>${moneyText('USD 12.345,67', 'text-fore')}</div>
     <p class="font-semibold text-fore">Retainer mensual de contenidos</p>
     <p class="text-xs text-mute">Versión contratada: v1.0</p>
     <p class="text-xs text-mute">Cliente desde: Sin fecha registrada</p>
     <p class="text-xs text-mute">Descuento: Importe fijo · USD 1.000</p>
     <p class="text-xs text-mute">Extras: Sin extras registrados</p>
    </div>
   </div>
 </div>
 <div><button type="button" class="${button}">Registrar enmienda comercial</button></div>
 <form class="grid gap-3 md:grid-cols-2 xl:grid-cols-3" novalidate>
  ${field('Vigente desde', `<input class="${sized(input, 'w-40')}" type="date" value="2026-09-14">`)}
  ${field('Cliente desde (opcional)', `<input class="${sized(input, 'w-40')}" type="date" value="2024-02-29">`)}
  ${field('Nombre del plan', `<input class="${input}" value="Gestión comercial integral de contenidos y pauta">`)}
  ${field('Versión contratada', `<input class="${input}" value="v4.0 con anexos de cesión de derechos">`)}
  ${field('Precio mensual contratado', `<div class="relative"><span class="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-xs font-semibold text-mute">US$</span><input class="${sized(input, 'w-44 pl-12 tabular-nums')}" value="12.345,67" aria-label="Precio mensual contratado"></div>`)}
  ${currencyField('lifecycle-currency', 'Dólares (USD)')}
  ${field('Tipo de descuento', `<select class="${select}" aria-label="Tipo de descuento"><option>Porcentaje</option></select>`)}
  ${field('Valor del descuento', `<input class="${sized(input, 'w-36 tabular-nums')}" inputmode="decimal" value="12,5">`)}
  ${field('Términos del descuento (opcional)', `<textarea class="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" rows="3">Se aplica sobre el precio de lista durante los primeros seis meses.</textarea>`)}
  ${field('Extras y entregables personalizados (opcional)', `<textarea class="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" rows="3">Dos reels extra por mes y reporte quincenal de métricas.</textarea>`)}
  <div class="flex flex-wrap items-end gap-2 md:col-span-2 xl:col-span-3"><button type="button" class="${buttonOutline}">Cancelar</button><button type="submit" class="${button}">Registrar enmienda</button></div>
 </form>
</section>`;

/* app/quote-composer.tsx — compositor con ítems y vista previa. */
const composerSheet = `
<form class="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" novalidate>
 <div class="grid content-start gap-4">
  <section class="grid gap-3">
   ${field('Título del presupuesto', `<input class="${input}" maxlength="120" value="Campaña de lanzamiento regional · producción audiovisual integral" name="title">`)}
   <div class="flex flex-wrap items-end gap-3">
    <div class="min-w-0 flex-1 basis-64">${field('Cliente', `<select class="${select}" aria-label="Cliente"><option>Cooperativa Multiactiva de Servicios Múltiples Limitada</option></select>`)}</div>
    ${currencyField('quote-currency', 'Guaraníes (PYG)')}
    <div class="w-24">${field('IVA', `<select class="${select}" aria-label="IVA"><option>10%</option></select>`)}</div>
   </div>
  </section>
  <section class="grid gap-3" aria-label="Ítems del documento">
   <div class="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-3">
    <div class="flex items-start gap-2">
     <button type="button" class="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore md:h-9 md:w-9" title="Reordenar ítem" aria-label="Reordenar ítem">${iconGrip}</button>
     <div class="grid min-w-0 flex-1 gap-3">
      ${field('Descripción', `<input class="${input}" value="Producción audiovisual integral: dirección creativa, rodaje en locación de tres jornadas, edición, color y mezcla final">`)}
      <div class="flex flex-wrap gap-3">
       ${field('Cantidad', `<input class="${sized(input, 'w-24 tabular-nums')}" inputmode="decimal" value="12">`)}
       <div class="grid gap-1"><label class="${label}">Precio sin IVA</label><div class="relative"><span class="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-xs font-semibold text-mute">Gs.</span><input class="${sized(input, 'w-44 pl-12 tabular-nums')}" inputmode="numeric" value="102.880.658"></div></div>
      </div>
      <div class="flex flex-wrap gap-2"><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-mute transition hover:bg-ink-700 hover:text-fore md:h-9">Subir</button><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-mute transition hover:bg-ink-700 hover:text-fore md:h-9">Bajar</button><button type="button" class="inline-flex h-11 items-center gap-2 rounded-lg px-2 text-xs font-semibold text-bad transition hover:bg-bad/10 md:h-9">Quitar</button></div>
     </div>
    </div>
   </div>
   <div><button type="button" class="${buttonOutline}">${iconPlus}Agregar ítem</button></div>
  </section>
  <section class="flex flex-wrap gap-3">
   <div class="w-40">${field('Válido hasta', `<input class="${input}" type="date" value="2026-10-31">`)}</div>
   <div class="min-w-0 flex-1 basis-64">${field('Condiciones (opcional)', `<textarea class="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" rows="3">Facturación el día 5 de cada mes. Incluye dos rondas de ajustes por pieza.</textarea>`)}</div>
  </section>
  <section class="grid gap-3" aria-label="Secciones del documento">
   <div><h3 class="text-sm font-bold text-fore">Secciones del documento</h3><p class="mt-1 text-xs leading-5 text-mute">Arrastrá o usá Subir/Bajar. Detalle y totales son obligatorios; podés ocultar las otras secciones.</p></div>
   <div class="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-3"><div class="flex items-start gap-2"><button type="button" class="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-mute md:h-9 md:w-9" title="Reordenar ítem" aria-label="Reordenar ítem">${iconGrip}</button><div class="grid min-w-0 flex-1 gap-3"><b class="text-sm font-bold text-fore">Detalle de ítems</b><p class="text-xs font-medium text-mute">Siempre visible</p></div></div></div>
   <div class="grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-3"><div class="flex items-start gap-2"><button type="button" class="mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-lg text-mute md:h-9 md:w-9" title="Reordenar ítem" aria-label="Reordenar ítem">${iconGrip}</button><div class="grid min-w-0 flex-1 gap-3"><b class="text-sm font-bold text-fore">Texto personalizado</b>${field('Título', `<input class="${input}" value="Sobre esta propuesta">`)}${field('Contenido', `<textarea class="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm" rows="4">La propuesta incluye cesión de derechos y música licenciada.</textarea>`)}<div class="flex items-center gap-3"><span class="relative inline-flex h-5 w-9 shrink-0 items-center"><input type="checkbox" role="switch" aria-checked="true" aria-label="Mostrar sección Texto personalizado" checked class="peer absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none rounded-full opacity-0"><span aria-hidden="true" class="pointer-events-none absolute inset-0 rounded-full border border-fono bg-fono transition-colors"></span><span aria-hidden="true" class="pointer-events-none absolute left-0.5 h-4 w-4 translate-x-4 rounded-full bg-white shadow transition-transform"></span></span><label class="${label} mb-0">Mostrar sección</label></div></div></div></div>
  </section>
 </div>
 <section class="grid content-start gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4" aria-label="Vista previa del documento">
  <p class="text-[11px] font-bold uppercase tracking-[.18em] text-fono-light">Vista previa</p>
  <h2 class="text-lg font-bold text-fore">Campaña de lanzamiento regional · producción audiovisual integral</h2>
  <section class="grid gap-2 text-sm text-fore">
   <div class="flex items-start justify-between gap-3 border-b border-ink-600/60 pb-2"><span class="min-w-0 [overflow-wrap:anywhere]">Producción audiovisual integral: dirección creativa, rodaje en locación de tres jornadas<small class="mt-0.5 block text-[11px] text-mute">12 unidades</small></span>${moneyText('Gs. 1.234.567.890')}</div>
  </section>
  <section class="grid gap-1"><p class="text-xs text-mute">Subtotal: ${moneyText('Gs. 1.234.567.890')}</p><p class="text-xs text-mute">IVA: ${moneyText('Gs. 123.456.789')}</p><h3 class="text-base font-bold">Total: ${moneyText('Gs. 1.358.024.679')}</h3></section>
 </section>
 <div class="lg:col-span-2"><div class="flex flex-wrap items-center justify-end gap-2"><button type="button" class="${buttonOutline}">Cancelar</button><button type="submit" class="${button}">Guardar</button></div></div>
</form>`;

/* app/client-identity.tsx — apariencia del cliente (paleta y logo). */
const palette = (label, key, active) => `<label class="identity-${key} flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition ${active ? 'border-fono/60 bg-fono/10 text-fore' : 'border-ink-500 bg-ink-800 text-mute hover:border-fono/40 hover:text-fore'}"><input type="radio" name="color_key" class="sr-only" ${active ? 'checked' : ''}><span class="h-3.5 w-3.5 shrink-0 rounded-full" style="background:var(--client-accent)" aria-hidden="true"></span>${label}</label>`;

const appearanceSheet = `
<section class="grid gap-4 rounded-xl border border-ink-600 bg-ink-800 p-4 md:grid-cols-2 md:p-5">
 <div class="md:col-span-2"><span class="client-identity identity-teal inline-flex min-w-0 items-center gap-2.5 text-fore"><span class="identity-avatar overflow-hidden" aria-hidden="true">CM</span><span class="identity-name min-w-0 font-bold leading-snug" title="Cooperativa Multiactiva de Servicios Múltiples Limitada">Cooperativa Multiactiva de Servicios Múltiples Limitada</span></span></div>
 <section class="profile-photo-section"><h3 class="text-sm font-bold text-fore">Logo o foto del cliente</h3><p class="mt-1 text-xs text-mute">Se guarda normalizado a WebP.</p></section>
 <form class="grid content-start gap-3" novalidate>
  <fieldset class="min-w-0 border-0 p-0">
   <legend class="mb-2 text-[11px] font-semibold uppercase tracking-wider text-mute">Color identificador</legend>
   <div class="flex flex-wrap gap-2">
    ${palette('Violeta', 'violet', false)}${palette('Azul', 'blue', false)}${palette('Turquesa', 'teal', true)}${palette('Verde', 'green', false)}${palette('Dorado', 'gold', false)}${palette('Rosa', 'rose', false)}${palette('Gris', 'slate', false)}
   </div>
  </fieldset>
  <p class="text-xs leading-5 text-mute">Se guarda al elegir. Identifica al cliente en sus proyectos y piezas; no cambia el estado de producción.</p>
 </form>
</section>`;

export default [
  {
    id: 'comercial-reportes',
    section: 'Clientes',
    surface: 'Ficha de reportes y términos comerciales',
    kind: 'plain',
    body: `<div data-fixture="comercial-reportes" class="p-4">${reportingSheet}</div>`,
  },
  {
    id: 'comercial-ciclo',
    section: 'Clientes',
    surface: 'Ciclo comercial y enmienda',
    kind: 'plain',
    body: `<div data-fixture="comercial-ciclo" class="p-4">${lifecycleSheet}</div>`,
  },
  {
    id: 'comercial-presupuesto',
    section: 'Presupuestos',
    surface: 'Compositor con vista previa',
    kind: 'plain',
    body: `<div data-fixture="comercial-presupuesto" class="p-4">${composerSheet}</div>`,
  },
  {
    id: 'comercial-apariencia',
    section: 'Clientes',
    surface: 'Apariencia del cliente',
    kind: 'plain',
    body: `<div data-fixture="comercial-apariencia" class="p-4">${appearanceSheet}</div>`,
  },
];
