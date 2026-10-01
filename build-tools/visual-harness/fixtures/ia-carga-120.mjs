/*
 * «Carga con IA» Fase 2 (Refs #120): coincidencias, decisión vincular/crear,
 * confirmación de acciones y resumen.
 *
 * Los objetos reales de owncoding-ui (`Aviso`, `AvisoPrivacidad`, `Checkbox`,
 * `FormField`, `Input`, `StateChip`) se renderizan con `renderToStaticMarkup`;
 * el marco del diálogo, las tarjetas, las decisiones de match y las acciones
 * espejan `app/ia-carga.tsx` (mismas clases y estructura). Datos ficticios:
 * nunca datos reales.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Aviso, Badge, Checkbox, FormField, Input} from 'owncoding-ui';

const object = (element) => renderToStaticMarkup(element);
const xIcon = object(React.createElement('span', {'aria-hidden': 'true', className: 'text-base leading-none'}, '×'));
/** Mismo chip que `app/ui-v2.tsx` (Badge de la biblioteca por tono). */
const chip = (tone, text) => object(React.createElement(Badge, {color: {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'}[tone], className: 'whitespace-nowrap'}, text));
const aviso = (tono, children, compact = false) => object(React.createElement(Aviso, {tono, compact}, children));
const checkbox = (checked) => object(React.createElement(Checkbox, {label: 'Incluir', checked, onChange: () => {}}));
const campo = (label, value, {error, hint, type = 'text', id = `ia-${label}`} = {}) => object(React.createElement(
  FormField,
  {label, htmlFor: id, error, hint},
  React.createElement(Input, {id, defaultValue: value, readOnly: true, type}),
));

const marco = (body, footer, size = 'wide') => `
<div class="ops-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="ia-title" data-dialog-size="${size}">
 <div class="dialog-heading"><h2 id="ia-title">Carga con IA</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${xIcon}</button></div>
 <div class="dialog-body">${body}</div>
 <div class="dialog-footer"><div class="dialog-actions">${footer}</div></div>
</section></div>`;

const CARD = (contenido, off = false) => `<article class="grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5 transition${off ? ' opacity-70' : ''}" data-off="${off}">${contenido}</article>`;
const cardHead = (titulo, estado, detalle, checked) => `
<header class="flex min-w-0 items-start justify-between gap-3">
 <div class="grid min-w-0 gap-1">
  <h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore" title="${titulo}">${titulo}</h4>
  <p class="flex flex-wrap items-center gap-2 text-[11px] text-mute">${estado}<span>${detalle}</span></p>
 </div>
 ${checkbox(checked)}
</header>`;

const OPCION = (texto, senales, pressed) => `<button type="button" aria-pressed="${pressed}" class="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ink-500 px-2.5 py-1.5 text-left text-[11.5px] font-medium text-mute transition hover:border-fono hover:text-fore aria-pressed:border-fono aria-pressed:bg-fono/10 aria-pressed:text-fore md:min-h-9"><span class="min-w-0 max-w-[14rem] truncate">${texto}</span>${senales ? `<span class="whitespace-nowrap text-[10px] uppercase tracking-wide text-mute">${senales}</span>` : ''}</button>`;

const matchBlock = (intro, decisiones, extra = '') => `
<div class="grid gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5">
 <p class="text-[11.5px] leading-5 text-mute">${intro} <b class="text-fore">Nada se duplica sin tu decisión.</b></p>
 <div class="flex flex-wrap gap-2" role="group" aria-label="Elegir la ficha existente">${decisiones}</div>
 ${extra}
</div>`;

const campoCategoria = (seleccionada) => `
<div class="ops-select"><span class="ops-label">Categoría</span><button type="button" class="ops-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span>${seleccionada}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>`;

const gridCampos = (campos) => `<div class="grid gap-2 sm:grid-cols-2">${campos.join('')}</div>`;

/* ------------------------------------------------------------ coincide */

const coincide = `
<div class="grid gap-4">
 <p class="text-sm text-mute">Detectamos <b class="text-fore">2 clientes, 1 equipo de inventario, 1 acción propuesta</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
 <p class="text-[11.5px] text-mute">Vinculás <b class="tabular-nums text-fore">1</b> registro(s) a fichas existentes: no se crea nada para esos.</p>
 <section class="grid gap-3" aria-label="Clientes detectados (2)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Clientes <span class="tabular-nums">2</span></h3>
  ${CARD(`${cardHead('Constructora Sur S.A.', chip('warn', 'Coincide'), 'Se usa la ficha existente', true)}
   ${matchBlock('Ya existe una ficha que coincide: elegí qué hacer.', `${OPCION('Usar «Constructora Sur S.A.»', 'RUC/CI coincide · nombre igual', true)}${OPCION('Usar «Constructora del Sur»', 'nombre igual', false)}`, '<div class="flex flex-wrap items-center gap-2"><button type="button" aria-pressed="false" class="inline-flex min-h-11 items-center rounded-lg border border-ink-500 px-2.5 py-1.5 text-[11.5px] font-medium text-mute md:min-h-9">Crear cliente nuevo</button></div>')}
   ${gridCampos([
     campo('Nombre', 'Constructora Sur S.A.'),
     campo('RUC / C.I.', '80012345-6'),
   ])}`)}
  ${CARD(`${cardHead('Pantalla LED 3x2 · P3.9', chip('warn', 'Coincide'), 'Se crearán 4 equipo(s) · un registro por unidad reservable', true)}
   ${matchBlock('Ya existe una ficha que coincide: elegí qué hacer.', `${OPCION('Usar «Pantalla LED 3x2»', 'nombre igual', false)}`, '<div class="flex flex-wrap items-center gap-2"><button type="button" aria-pressed="true" class="inline-flex min-h-11 items-center rounded-lg border border-fono bg-fono/10 px-2.5 py-1.5 text-[11.5px] font-medium text-fore md:min-h-9">Crear equipo nuevo</button><span class="text-[11px] text-warn-text">Se creará un registro nuevo aunque exista una ficha parecida.</span></div>')}
   ${gridCampos([
     campo('Nombre', 'Pantalla LED 3x2 · P3.9'),
     campoCategoria('iluminación · nueva categoría'),
     campo('Unidades a crear (1–25)', '4'),
     campo('Valor del equipo (Gs)', '1.500.000'),
   ])}`)}
 </section>
</div>`;

/* ------------------------------------------------------------- ambiguo */

const ambiguo = `
<div class="grid gap-4">
 <p class="text-sm text-mute">Detectamos <b class="text-fore">1 cliente, 1 equipo de inventario</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
 ${aviso('warn', 'El análisis marcó coincidencias ambiguas: hay que elegir una ficha o crear un registro nuevo antes de continuar.')}
 <section class="grid gap-3" aria-label="Clientes detectados (1)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Clientes <span class="tabular-nums">1</span></h3>
  ${CARD(`${cardHead('Juan Pérez', chip('warn', 'Ambiguo'), 'Se usa la ficha existente', true)}
   ${matchBlock('Hay 3 fichas parecidas: elegí qué hacer.', `${OPCION('Usar «Juan Pérez»', 'mismo teléfono', false)}${OPCION('Usar «Juan Carlos Pérez»', 'nombre igual', true)}${OPCION('Usar «J. Pérez»', 'nombre igual', false)}`, '<div class="flex flex-wrap items-center gap-2"><button type="button" aria-pressed="false" class="inline-flex min-h-11 items-center rounded-lg border border-ink-500 px-2.5 py-1.5 text-[11.5px] font-medium text-mute md:min-h-9">Crear cliente nuevo</button></div>')}
   ${gridCampos([
     campo('Nombre', 'Juan Pérez'),
     campo('Teléfono', '+595 982 555 111'),
   ])}`)}
 </section>
 <section class="grid gap-3" aria-label="Equipos detectados (1)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Equipos de inventario <span class="tabular-nums">1</span></h3>
  ${CARD(`${cardHead('Trípode Manfrotto', chip('warn', 'Ambiguo'), 'Falta decidir', true)}
   ${matchBlock('Hay 2 fichas parecidas: elegí qué hacer.', `${OPCION('Usar «Trípode Manfrotto 055»', 'nombre igual', false)}${OPCION('Usar «Trípode 190X»', 'nombre igual', false)}`, '<div class="flex flex-wrap items-center gap-2"><button type="button" aria-pressed="false" class="inline-flex min-h-11 items-center rounded-lg border border-ink-500 px-2.5 py-1.5 text-[11.5px] font-medium text-mute md:min-h-9">Crear equipo nuevo</button></div>')}
   ${gridCampos([
     campo('Nombre', 'Trípode Manfrotto'),
     campo('Unidades a crear (1–25)', '1'),
   ])}`)}
 </section>
</div>`;

/* -------------------------------------------------------------- acción */

const accion = `
<div class="grid gap-4">
 <p class="text-sm text-mute">Detectamos <b class="text-fore">1 acción propuesta</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
 <section class="grid gap-3" aria-label="Acciones propuestas (3)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Acciones propuestas <span class="tabular-nums">3</span></h3>
  ${CARD(`
   <header class="flex min-w-0 flex-wrap items-start justify-between gap-2"><div class="min-w-0"><h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore">Registrar cobro</h4><p class="text-[11px] text-mute">En el texto: Constructora Sur</p></div>${chip('info', 'Sin confirmar')}</header>
   <div class="grid gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5"><p class="text-[11.5px] leading-5 text-mute">No sabemos con certeza a qué cliente se refiere. Elegí uno de los candidatos para poder confirmar:</p><div class="flex flex-wrap gap-2" role="group" aria-label="Elegir el cliente del cobro">${OPCION('Constructora Sur S.A.', 'RUC/CI coincide', false)}${OPCION('Constructora del Sur', 'nombre igual', false)}</div></div>
   ${gridCampos([
     campo('Monto (PYG)', '2.500.000'),
     campo('Fecha del cobro', '2026-09-28', {type: 'date'}),
     campo('Detalle', 'Saldo del mes'),
   ])}
   <div class="flex flex-wrap items-center gap-2"><button type="button" class="primary" disabled>Confirmar acción</button></div>`)}
  ${CARD(`
   <header class="flex min-w-0 flex-wrap items-start justify-between gap-2"><div class="min-w-0"><h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore">Registrar cobro</h4><p class="text-[11px] text-mute">En el texto: Sur Films</p></div>${chip('warn', 'Duplicado probable')}</header>
   <p class="flex flex-wrap items-center gap-2 text-[12px] text-mute">${chip('ok', 'Cliente vinculado')}<span class="break-all">Sur Films</span></p>
   ${gridCampos([
     campo('Monto (PYG)', '1.200.000'),
     campo('Fecha del cobro', '2026-09-27', {type: 'date'}),
   ])}
   ${aviso('warn', 'Ya registramos un cobro igual el mismo día. ¿Querés registrarlo de nuevo?', true)}
   <div class="flex flex-wrap items-center gap-2"><button type="button" class="secondary">Registrar igual</button></div>`)}
  ${CARD(`
   <header class="flex min-w-0 flex-wrap items-start justify-between gap-2"><div class="min-w-0"><h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore">Registrar cobro</h4><p class="text-[11px] text-mute">En el texto: Estudio Norte</p></div>${chip('ok', 'Ejecutada')}</header>
   <p class="flex flex-wrap items-center gap-2 text-[12px] text-mute">${chip('ok', 'Cliente vinculado')}<span class="break-all">Estudio Norte</span></p>
   ${gridCampos([
     campo('Monto (PYG)', '800.000'),
     campo('Fecha del cobro', '2026-09-26', {type: 'date'}),
   ])}
   ${aviso('ok', 'Cobro registrado por Gs. 800.000.', true)}
   <div class="flex flex-wrap items-center gap-2"><span class="text-[11.5px] text-mute">Confirmada. No hace falta volver a ejecutarla.</span></div>`)}
 </section>
</div>`;

/* ------------------------------------------------------------ resultado */

const resumen = `
<div class="grid gap-3">
 <div class="grid gap-1 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok-text" role="status">
  <strong>Listo.</strong>
  <span class="text-[12px] leading-5">Creamos 2 clientes y 4 equipos.</span>
  <span class="text-[12px] leading-5">Vinculamos 1 cliente y 1 equipo a fichas existentes.</span>
  <span class="text-[12px] leading-5">Registramos 1 acción.</span>
  <span class="text-[12px] leading-5">Quedaron 1 acción sin confirmar: no se ejecutó nada de eso.</span>
 </div>
 ${aviso('error', 'No pudimos crear 1 registro(s): Cliente «Juan Pérez»: Ya existe un cliente con ese RUC.', false)}
 <p class="text-[11.5px] leading-5 text-mute">Cada alta quedó auditada como cualquier carga manual y el texto que pegaste no se guardó. Los registros creados ya aparecen en Clientes y en Inventario.</p>
</div>`;

export default [
  {
    id: 'ia-f2-coincide',
    section: 'Topbar',
    surface: 'Carga con IA F2 · coincide: vincular o crear (Refs #120)',
    kind: 'plain',
    body: marco(coincide, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (1)</button>'),
  },
  {
    id: 'ia-f2-ambiguo',
    section: 'Topbar',
    surface: 'Carga con IA F2 · ambiguo: elegir candidato (Refs #120)',
    kind: 'plain',
    body: marco(ambiguo, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (0)</button>'),
  },
  {
    id: 'ia-f2-accion',
    section: 'Topbar',
    surface: 'Carga con IA F2 · acción de cobro con confirmación (Refs #120)',
    kind: 'plain',
    body: marco(accion, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Ver resumen</button>'),
  },
  {
    id: 'ia-f2-resumen',
    section: 'Topbar',
    surface: 'Carga con IA F2 · resumen final (Refs #120)',
    kind: 'plain',
    body: marco(resumen, '<button type="button" class="secondary">Volver a las acciones</button><button type="button" class="secondary">Cargar otro texto</button><button type="button" class="primary">Listo</button>', 'default'),
  },
];
