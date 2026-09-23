/*
 * Fixtures: detalles y formularios de OPS (drawers y modales) — campaña #41.
 *
 * El harness mide la geometría del contenido; acá se reproduce el interior de
 * los drawers (pieza, inventario, proyecto) y de los modales (equipo, reserva,
 * verificación) con las mismas clases Tailwind y objetos que emiten
 * `app/productivity-ui.tsx`, `app/inventory-workspace.tsx` y
 * `app/project-card.tsx`, dentro del ancho real del drawer (`min(560px,100%)`,
 * y el body con `p-4` en mobile / `p-5` en escritorio, igual que dialog.css).
 *
 * Datos de estrés: nombres, seriales y notas largas, montos grandes, estados
 * vacíos y filas con y sin dato.
 */
const svg = (path, size = 16, className = '') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="${className}" aria-hidden="true">${path}</svg>`;
const ICON = {
  box: 'M21 8l-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  check: 'M20 6L9 17l-5-5',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  pencil: 'M4 20h4l10-10-4-4L4 16v4ZM14 6l4 4',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6',
  printer: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6L6 18M6 6l12 12',
};
const initials = (name) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
const chip = (label, tone) => {
  const tones = {ok: 'bg-ok/15 text-ok border-ok/25', info: 'bg-fono/15 text-fono-light border-fono/25', warn: 'bg-warn/15 text-warn border-warn/25', bad: 'bg-bad/15 text-bad border-bad/25', mute: 'bg-ink-600 text-mute border-ink-500'};
  return `<span class="inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${tones[tone]}">${label}</span>`;
};
const avatar = (name) => `<span class="actor-identity-avatar" aria-hidden="true">${initials(name)}</span>`;
const actorIdentity = (name, time) => `<span class="actor-identity"><span class="actor-identity-avatar" aria-hidden="true">${initials(name)}</span><span class="actor-identity-details"><span class="actor-identity-name" title="${name}">${name}</span><span class="actor-identity-time">${time}</span></span></span>`;
const fieldLabel = (text, id) => `<label class="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-mute" for="${id}">${text}</label>`;
const input = (id, value, extra = '') => `<input id="${id}" value="${value}" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore outline-none transition md:h-9 md:text-sm ${extra}">`;
const select = (id, label) => `<select id="${id}" class="h-11 w-full cursor-pointer rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition md:h-9 md:text-sm"><option>${label}</option></select>`;
const textarea = (id, value) => `<textarea id="${id}" class="min-h-20 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition md:text-sm">${value}</textarea>`;
const drawer = (body) => `<div class="grid min-w-0 gap-4"><div class="mx-auto w-full max-w-[560px] min-w-0 rounded-2xl border border-ink-600 bg-ink-800 p-4 md:p-5">${body}</div></div>`;

/* ------------------------------------------- detalle de inventario (drawer) */
const inventoryDetail = drawer(`
 <div class="grid gap-4">
  <section class="grid gap-3 rounded-xl border border-ink-600 bg-ink-800/60 p-3 sm:grid-cols-[auto_minmax(0,1fr)]">
   <img class="h-28 w-28 rounded-xl object-cover" src="/brand/icon-192.png" alt="Foto de Memoria SD">
   <div class="grid min-w-0 gap-1">
    <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-fono-light">Identificación física</p>
    <code class="whitespace-nowrap font-mono text-sm text-fore">SC-000128</code>
    <p class="break-words text-sm text-fore">Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido) · SD128GB-UHSII-SANDISK-2024-000123456789</p>
    <p class="text-xs text-mute">Con Fabrizio Dellacasa Reyes · Rodaje de contenidos · Campaña Primavera 2026 · Banco Atlas</p>
    <div class="mt-1"><svg class="inventory-barcode block h-16 w-full max-w-[250px] rounded-lg border border-ink-600 bg-ink-800 p-1 text-fore" viewBox="0 0 120 64" role="img" aria-label="Código de barras SC-000128"><g fill="currentColor"><rect x="10" y="0" width="1" height="48"></rect><rect x="16" y="0" width="1" height="48"></rect></g><text x="60" y="60" text-anchor="middle">SC-000128</text></svg></div>
   </div>
  </section>
  <section class="grid min-w-0 gap-2"><h3 class="text-sm font-semibold text-fore">Valor y depreciación</h3>
   <dl class="grid gap-1 text-sm">
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Valor de compra</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">Gs 1.234.567.890</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Fecha de compra</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="whitespace-nowrap">10-sept</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Método</dt><dd class="shrink-0 font-semibold tabular-nums">Lineal</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Vida útil</dt><dd class="shrink-0 font-semibold tabular-nums">24 meses</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Valor residual</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">Gs 0</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Valor actual</dt><dd class="shrink-0 font-semibold tabular-nums text-info"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">Gs 987.654.312</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Depreciación acumulada</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">Gs 246.913.578</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Depreciación mensual</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums">Gs 51.440.328</span></dd></div>
   </dl>
   <div class="grid gap-1"><span class="text-xs text-mute">Vida útil transcurrida: 33.33% (8 de 24 meses)</span><span class="block h-1.5 overflow-hidden rounded-full bg-fore/10" role="img" aria-label="Vida útil transcurrida: 33.33%"><span class="block h-full rounded-full bg-fono" style="width:33.33%"></span></span></div>
  </section>
  <section class="grid min-w-0 gap-2"><h3 class="text-sm font-semibold text-fore">Mantenimiento</h3>
   <div class="flex justify-start"><button type="button" class="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-ink-500 bg-transparent px-4 text-sm font-semibold text-fore transition md:h-9">${svg(ICON.plus, 14)}Agregar mantenimiento</button></div>
   <article class="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2 opacity-60" data-voided="true"><b class="text-[13px] text-fore">Preventivo<span class="ml-2 text-[11px] font-semibold text-warn">Anulado</span></b><span class="inline-flex items-center gap-1 text-xs text-mute">10-sept · <span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-xs">Gs 50.000</span> · <span class="inline-flex items-center gap-1.5 text-xs text-mute">${avatar('Ana Paula Benítez')}Ana Paula Benítez</span></span><p class="text-xs text-mute">Limpieza de contactos y revisión de escritura. Se reemplazó la funda rígida del estuche.</p><span class="text-xs text-mute">Anulado por Ana Paula Benítez</span><div class="flex flex-wrap items-center gap-2"><button type="button" class="text-button">${svg(ICON.pencil, 14)}Editar</button><button type="button" class="text-button">${svg(ICON.x, 14)}Anular</button></div></article>
   <article class="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2"><b class="text-[13px] text-fore">Correctivo</b><span class="inline-flex items-center gap-1 text-xs text-mute">01-ago · <span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-xs">Gs 120.000</span></span><p class="text-xs text-mute">Cambio de cable y limpieza.</p></article>
  </section>
  <section class="grid min-w-0 gap-2"><h3 class="text-sm font-semibold text-fore">Verificación física</h3>
   <p class="text-sm text-fore"><b>Con diferencias</b> · 15 sept 26 · 07:00 · Rita Mical Herrera</p>
   <article class="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2"><b class="text-[13px] text-fore">Con diferencias</b><span class="text-xs text-mute">15 sept 26 · 07:00 · Rita Mical Herrera</span><p class="text-xs text-mute">Faltaba una de las dos tarjetas del kit; se encontró en el estante contiguo.</p></article>
  </section>
  <section class="grid min-w-0 gap-2"><h3 class="text-sm font-semibold text-fore">Rastro de préstamo y cambios</h3>
   <article class="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2"><b class="text-[13px] text-fore">Retiro registrado</b><span class="text-xs text-mute">17 sept 26 · 08:05 · Fabrizio Dellacasa Reyes</span><p class="text-xs text-mute">Campaña Aniversario 2026</p></article>
   <article class="grid gap-1 rounded-lg border border-ink-600/60 px-3 py-2"><b class="text-[13px] text-fore">Ubicación actualizada</b><span class="text-xs text-mute">14 sept 26 · 12:00 · Ana Paula Benítez</span></article>
  </section>
 </div>`);

/* ----------------------------------------------------- pieza (drawer) */
const pieceDetail = drawer(`
 <div class="grid min-w-0 gap-4">
  <section class="grid min-w-0 gap-2 rounded-xl border border-ink-600 bg-ink-800/60 p-4">
   <div class="flex min-w-0 flex-wrap items-center justify-between gap-2"><span class="client-identity identity-teal"><span class="identity-avatar">CM</span><span class="actor-identity-name" title="Cooperativa Multiactiva de Servicios Múltiples Limitada">Cooperativa Multiactiva de Servicios Múltiples Limitada</span></span><span class="urgency-badge">5 · Crítica</span></div>
   <div class="flex flex-wrap items-center gap-1.5">${chip('En revisión', 'warn')}${chip('Video', 'mute')}<span class="due-date overdue compact" title="Entrega: 28 ago. 2026 09:30">Entrega 28 ago. 2026 · 09:30 h · venció hace 23 días</span></div>
   <dl class="grid gap-1 text-xs sm:grid-cols-2">
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Horas estimadas</dt><dd class="shrink-0 font-semibold tabular-nums">12 h</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Horas trabajadas</dt><dd class="shrink-0 font-semibold tabular-nums">4 h</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Niveles de aprobación completados</dt><dd class="shrink-0 font-semibold tabular-nums">1</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Última actualización</dt><dd class="shrink-0 font-semibold tabular-nums"><span class="whitespace-nowrap">17 sept 26 · 09:48</span></dd></div>
   </dl>
   <span class="project-presence">Viendo ahora: ${avatar('Fabrizio Dellacasa Reyes')}</span>
  </section>
  <div class="mb-5 flex flex-wrap gap-2 rounded-2xl border border-fore/10 bg-ink p-2" role="tablist"><button type="button" role="tab" aria-selected="true" class="rounded-xl bg-fono px-3 py-2 text-sm font-medium text-onbrand">Detalle</button><button type="button" role="tab" aria-selected="false" class="rounded-xl px-3 py-2 text-sm font-medium text-mute">Comentarios (2)</button><button type="button" role="tab" aria-selected="false" class="rounded-xl px-3 py-2 text-sm font-medium text-mute">Historial</button></div>
  <div class="grid gap-4">
   <div class="flex flex-wrap items-center gap-2"><button class="secondary">${svg(ICON.pencil, 14)}Editar pieza</button></div>
   <section class="grid gap-1"><h4 class="text-sm font-semibold text-fore">Descripción</h4><p class="whitespace-pre-line text-[13px] text-mute">Reel de lanzamiento para la nueva línea de productos — corte final con subtítulos, corrección de color y mezcla. Falta la aprobación del cliente sobre la música.</p></section>
   <section class="grid gap-1"><h4 class="text-sm font-semibold text-fore">Responsables</h4><section class="assigned-people" aria-label="Responsables asignados"><span class="assigned-people-label">Responsables</span><ul class="assigned-people-list"><li class="assigned-person">${actorIdentity('María Renée Ayala Benítez', '18 sept 26 · 16:20')}<span class="assigned-person-primary">Principal</span></li><li class="assigned-person">${actorIdentity('Juan Carlos Villalba', '17 sept 26 · 09:48')}</li></ul></section></section>
   <section class="grid gap-1"><h4 class="text-sm font-semibold text-fore">Archivos y enlaces</h4>
    <div class="drive-links"><span class="drive-links-label">Enlaces</span><ul class="drive-links-list"><li><a href="#drive">Corte final · Drive ↗</a></li><li><a href="#drive">Música aprobada · Drive ↗</a></li></ul></div>
    <div class="work-order-links"><h3>Enlaces de la pieza</h3><ul class="work-order-link-list"><li><span>Previsualización para el cliente</span><button type="button" class="text-button">Copiar</button></li></ul></div>
   </section>
   <section><div class="work-checklist"><h3>Checklist</h3><label class="work-checklist-item"><input type="checkbox" checked><span>Subtítulos revisados</span></label><label class="work-checklist-item"><input type="checkbox"><span>Mezcla final de audio aprobada por el cliente</span></label></div></section>
  </div>
 </div>`);

/* --------------------------------------------------- proyecto (drawer) */
const projectDetail = drawer(`
 <div class="grid min-w-0 gap-4">
  <section class="grid min-w-0 gap-2">
   <div class="flex flex-wrap items-center gap-2">${chip('Activo', 'ok')}<span class="urgency-badge">4 · Alta</span>${chip('3 niveles de aprobación', 'info')}</div>
   <dl class="grid gap-1 text-[13px]">
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Cliente</dt><dd class="min-w-0 shrink overflow-hidden"><span class="block truncate text-right" title="Cooperativa Multiactiva de Servicios Múltiples Limitada">Cooperativa Multiactiva de Servicios Múltiples Limitada</span></dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Inicio</dt><dd class="shrink-0 whitespace-nowrap">05-ene</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Entrega</dt><dd class="shrink-0 whitespace-nowrap" data-tone="warn">23-sept</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Piezas</dt><dd class="shrink-0 tabular-nums">148</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Enlaces</dt><dd class="shrink-0 whitespace-nowrap">2 enlaces</dd></div>
    <div class="flex min-w-0 items-center justify-between gap-3"><dt class="min-w-0 text-mute">Última actualización</dt><dd class="shrink-0 whitespace-nowrap">19 sept 26 · 15:42</dd></div>
   </dl>
  </section>
  <section class="grid min-w-0 gap-2"><h4 class="text-sm font-semibold text-fore">Responsables</h4><section class="assigned-people" aria-label="Responsables asignados"><span class="assigned-people-label">Responsables</span><ul class="assigned-people-list"><li class="assigned-person">${actorIdentity('María Renée Ayala Benítez', '18 sept 26 · 16:20')}<span class="assigned-person-primary">Principal</span></li><li class="assigned-person">${actorIdentity('Juan Carlos Villalba', '17 sept 26 · 09:48')}</li><li class="assigned-person">${actorIdentity('Lucía Paredes', '16 sept 26 · 15:10')}</li></ul></section></section>
  <section class="grid min-w-0 gap-2"><h4 class="text-sm font-semibold text-fore">Enlaces de archivo o carpeta de Drive</h4><div class="drive-links"><ul class="drive-links-list"><li><a href="#drive">Campaña Aniversario 2026 · Drive ↗</a></li><li><a href="#drive">Entregables aprobados · Drive ↗</a></li></ul></div></section>
  <section class="grid min-w-0 gap-2"><h4 class="text-sm font-semibold text-fore">Piezas del proyecto</h4>
   <ul class="grid gap-1.5">
    <li class="flex min-w-0 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px]"><span class="min-w-0 truncate font-semibold text-fore" title="Reel de lanzamiento para la nueva línea de productos — corte final con subtítulos, corrección de color y mezcla">Reel de lanzamiento para la nueva línea de productos — corte final con subtítulos, corrección de color y mezcla</span><span class="ml-auto flex shrink-0 items-center gap-2"><span class="list-date tabular-nums text-mute" data-tone="warn" title="Entrega 28-ago · 09:30 h">28-ago · 09:30</span>${chip('Revisión', 'warn')}</span></li>
    <li class="flex min-w-0 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px]"><span class="min-w-0 truncate font-semibold text-fore" title="Spots de 15 s y 30 s para radio, televisión abierta y redes sociales">Spots de 15 s y 30 s para radio, televisión abierta y redes sociales</span><span class="ml-auto flex shrink-0 items-center gap-2"><span class="list-date tabular-nums text-mute" title="Entrega 23-sept · 07:00 h">23-sept · 07:00</span>${chip('Por grabar', 'warn')}</span></li>
   </ul>
  </section>
 </div>`);

/* ------------------------------------------------- formulario de equipo */
const itemForm = drawer(`
 <form class="grid gap-4 sm:grid-cols-2">
  <p class="text-xs text-mute sm:col-span-2">Un registro por unidad reservable. Al guardar se asigna un código único Scale OS, imprimible como etiqueta.</p>
  <div class="sm:col-span-2">${fieldLabel('Nombre del equipo', 'f-name')}${input('f-name', 'Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)')}</div>
  <div>${fieldLabel('Categoría', 'f-cat')}${select('f-cat', 'Almacenamiento')}</div>
  <div>${fieldLabel('Serie, IMEI o identificador', 'f-serial')}${input('f-serial', 'SD128GB-UHSII-SANDISK-2024-000123456789')}</div>
  <fieldset class="grid gap-2 sm:col-span-2"><legend class="text-[11px] font-medium uppercase tracking-wider text-mute">Foto del equipo</legend>
   <span class="flex flex-wrap items-center gap-3"><img class="h-24 w-24 rounded-xl object-cover" src="/brand/icon-192.png" alt="Vista previa"><button type="button" class="text-button">${svg(ICON.trash, 14)}Quitar foto</button></span>
   <div class="grid gap-2 sm:grid-cols-2"><div>${fieldLabel('Enlace a la imagen', 'f-photo')}${input('f-photo', 'https://cdn.example/Memoria-SD-128GB-UHS-II-Sandisk-2024-000123456789.webp')}</div><label class="flex items-end gap-2 text-sm text-mute"><span class="flex-1">Cámara o subir foto<input class="mt-1 block w-full text-xs" type="file" aria-label="Elegir foto"></span></label></div>
  </fieldset>
  <fieldset class="grid gap-2 sm:col-span-2"><legend class="text-[11px] font-medium uppercase tracking-wider text-mute">Ubicación de guardado</legend>
   <div class="grid gap-2 sm:grid-cols-3"><div>${fieldLabel('Ubicación', 'f-loc')}${select('f-loc', 'Estante B · fila 1 · Depósito central')}</div><p class="self-end text-xs text-mute">Se guarda como Estante B · fila 1 · Depósito central.</p><div>${fieldLabel('Fila / posición', 'f-row')}<input id="f-row" value="1" class="h-11 w-36 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div></div>
   <div class="flex flex-wrap items-end gap-2"><div>${fieldLabel('Crear lugar', 'f-new')}<input id="f-new" value="Depósito · Rack A" class="h-11 w-52 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div><button type="button" class="text-button">Crear lugar</button></div>
  </fieldset>
  <div>${fieldLabel('Valor del equipo', 'f-value')}<span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input id="f-value" value="1.234.567.890" inputmode="numeric" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></span></div>
  <div>${fieldLabel('Moneda', 'f-cur')}${select('f-cur', 'PYG · Gs')}</div>
  <div>${fieldLabel('Valor de compra · Opcional', 'f-purchase')}<span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input id="f-purchase" value="1.500.000.000" inputmode="numeric" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></span></div>
  <div>${fieldLabel('Fecha de compra · Opcional', 'f-purchase-date')}<input id="f-purchase-date" type="date" value="2024-01-10" class="h-11 w-44 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div>
  <div>${fieldLabel('Método de depreciación', 'f-method')}${select('f-method', 'Lineal')}</div>
  <div>${fieldLabel('Vida útil (meses)', 'f-life')}<input id="f-life" type="number" value="24" class="h-11 w-28 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div>
  <div>${fieldLabel('Valor residual', 'f-residual')}<span class="amount-field" data-currency="PYG"><span class="amount-currency" aria-hidden="true">Gs</span><input id="f-residual" value="0" inputmode="numeric" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></span></div>
  <p class="text-xs text-mute sm:col-span-2">Valor actual <span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-xs">Gs 987.654.312</span> · Depreciación acumulada <span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-xs">Gs 246.913.578</span>. Se recalcula con los datos guardados.</p>
  <div>${fieldLabel('Estado', 'f-status')}${select('f-status', 'Disponible')}</div>
  <div>${fieldLabel('Custodio registrado', 'f-custodian')}${select('f-custodian', 'Sin custodio')}</div>
  <div>${fieldLabel('Fecha de adquisición', 'f-acquired')}<input id="f-acquired" type="date" value="2024-01-15" class="h-11 w-44 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div>
  <div class="sm:col-span-2">${fieldLabel('Notas', 'f-notes')}${textarea('f-notes', 'Incluye estuche rígido y funda. Se usa en rodajes de exteriores; guardar con la tapa hacia arriba.')}</div>
  <div class="sm:col-span-2"><div class="dialog-actions"><button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Guardar equipo</button></div></div>
 </form>`);

/* ------------------------------------------------ formulario de reserva */
const reservationForm = drawer(`
 <form class="grid gap-4 sm:grid-cols-2">
  <div class="sm:col-span-2">${fieldLabel('Producción o uso previsto', 'r-title')}${input('r-title', 'Rodaje de contenidos · Banco Atlas (estudio y exteriores)')}</div>
  <div class="sm:col-span-2">${fieldLabel('Proyecto', 'r-project')}${select('r-project', 'Campaña Aniversario 2026 · Temporada de verano')}</div>
  <div>${fieldLabel('Desde · Asunción', 'r-start')}<input id="r-start" type="datetime-local" value="2026-09-17T08:00" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div>
  <div>${fieldLabel('Devolución prevista · Asunción', 'r-end')}<input id="r-end" type="datetime-local" value="2026-09-21T18:00" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div>
  <fieldset class="grid gap-2 sm:col-span-2"><legend class="text-[11px] font-medium uppercase tracking-wider text-mute">Equipos · 2 de 50 seleccionados</legend>
   <div class="relative min-w-0">${svg(ICON.eye, 16, 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute')}<input type="search" value="" placeholder="Memoria, DJI Mic…" aria-label="Buscar equipos" class="h-11 w-full rounded-lg border border-ink-500 bg-ink-800 pl-9 pr-9 text-base text-fore md:h-9 md:text-sm"></div>
   <div class="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
    <label class="flex min-h-11 items-start gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore"><input type="checkbox" class="mt-0.5 h-6 w-6 p-0 accent-fono"><span class="min-w-0"><b class="break-words">Memoria SD UHS-II de 128 GB para cámaras de cine (kit de 2 tarjetas con estuche rígido)</b><small class="block text-xs text-mute">Almacenamiento</small></span></label>
    <label class="flex min-h-11 items-start gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore"><input type="checkbox" class="mt-0.5 h-6 w-6 p-0 accent-fono"><span class="min-w-0"><b class="break-words">Micrófono inalámbrico DJI Mic 2 (transmisor + receptor + estuche de carga)</b><small class="block text-xs text-mute">Audio</small></span></label>
   </div>
   <small class="text-xs text-mute">Se verifica que los equipos no tengan otra reserva en el horario elegido.</small>
  </fieldset>
  <fieldset class="grid gap-2 sm:col-span-2"><legend class="text-[11px] font-medium uppercase tracking-wider text-mute">Responsables · 2 de 30</legend><div class="grid gap-1 sm:grid-cols-2">
   <label class="flex min-h-11 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore"><input type="checkbox" class="h-6 w-6 p-0 accent-fono">${actorIdentity('María Renée Ayala Benítez', 'Responsable')}</label>
   <label class="flex min-h-11 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px] text-fore"><input type="checkbox" class="h-6 w-6 p-0 accent-fono">${actorIdentity('Fabrizio Dellacasa Reyes', 'Responsable')}</label>
  </div></fieldset>
  <div class="sm:col-span-2">${fieldLabel('Responsable de devolución', 'r-return')}${select('r-return', 'María Renée Ayala Benítez')}</div>
  <div class="sm:col-span-2">${fieldLabel('Notas', 'r-notes')}${textarea('r-notes', 'Se retiran en la mañana; incluir baterías cargadas y tarjetas formateadas.')}</div>
  <p class="text-xs text-mute sm:col-span-2">Reservar no registra el retiro. Al retirar se indica quién lleva físicamente los equipos; al devolver se registra dónde quedan.</p>
  <div class="sm:col-span-2"><div class="dialog-actions"><button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Guardar reserva</button></div></div>
 </form>`);

/* -------------------------------------------- formulario de verificación */
const verificationForm = drawer(`
 <form class="grid gap-4">
  <p class="text-xs text-mute">Código: <code class="whitespace-nowrap font-mono text-[11px] text-fore">SC-000128</code>. El control queda fechado, asociado a tu usuario y no cambia reservas existentes.</p>
  <div>${fieldLabel('Resultado', 'v-result')}${select('v-result', 'Hay una diferencia')}</div>
  <div>${fieldLabel('Observación', 'v-note')}${textarea('v-note', 'Revisión mensual del estante B.')}</div>
  <div>${fieldLabel('Diferencias encontradas', 'v-diff')}${textarea('v-diff', 'Faltaba una de las dos tarjetas del kit; se encontró en el estante contiguo.')}</div>
  <label class="flex min-h-11 items-start gap-2 text-sm text-fore md:min-h-0"><input type="checkbox" class="mt-0.5 h-6 w-6 p-0 accent-fono"><span>Ajustar estado o ubicación registrada</span></label>
  <div class="grid gap-4 sm:grid-cols-3"><div>${fieldLabel('Estado real', 'v-status')}${select('v-status', 'Disponible')}</div><div>${fieldLabel('Ubicación real', 'v-shelf')}${input('v-shelf', 'Estante B')}</div><div>${fieldLabel('Fila / posición', 'v-row')}<input id="v-row" value="1" class="h-11 w-36 rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-base text-fore md:h-9 md:text-sm"></div></div>
  <div class="dialog-actions"><button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Registrar verificación</button></div>
 </form>`);

/* ------------------------------------------------------------------ export */
export default [
  {id: 'ops-detalle-inventario', section: 'Inventario', surface: 'Detalle y trazabilidad (drawer)', kind: 'workspace', lists: [], grids: [], body: inventoryDetail},
  {id: 'ops-detalle-pieza', section: 'Producción', surface: 'Pieza (drawer)', kind: 'workspace', lists: [], grids: [], body: pieceDetail},
  {id: 'ops-detalle-proyecto', section: 'Proyectos', surface: 'Detalle de proyecto (drawer)', kind: 'workspace', lists: [], grids: [], body: projectDetail},
  {id: 'ops-form-equipo', section: 'Inventario', surface: 'Formulario de equipo (modal)', kind: 'workspace', lists: [], grids: [], body: itemForm},
  {id: 'ops-form-reserva', section: 'Inventario', surface: 'Formulario de reserva (modal)', kind: 'workspace', lists: [], grids: [], body: reservationForm},
  {id: 'ops-form-verificacion', section: 'Inventario', surface: 'Formulario de verificación (modal)', kind: 'workspace', lists: [], grids: [], body: verificationForm},
];
