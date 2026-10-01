/*
 * «Carga con IA» (Refs #118): evidencia visual de entrada, vista previa con
 * avisos y resultado.
 *
 * Los objetos reales de owncoding-ui (`AvisoPrivacidad`, `Checkbox`, `FormField`,
 * `Input`, `Aviso`) se renderizan con `renderToStaticMarkup`; el marco del
 * diálogo, las tarjetas y el select espejan `app/ia-carga.tsx` (clases y
 * estructura citadas en cada bloque) y `app/profile-controls.tsx`
 * (`.ops-select`). Datos ficticios: nunca datos reales.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Aviso, AvisoPrivacidad, Checkbox, FormField, Input} from 'owncoding-ui';

const object = (element) => renderToStaticMarkup(element);
const xIcon = object(React.createElement('span', {'aria-hidden': 'true', className: 'text-base leading-none'}, '×'));

const aviso = (tono, children, compact = false) => object(React.createElement(Aviso, {tono, compact}, children));
const checkbox = (checked) => object(React.createElement(Checkbox, {label: 'Crear', checked, onChange: () => {}}));
const campo = (label, value, {maxLength, error, hint, id = `ia-${label}`} = {}) => object(React.createElement(
  FormField,
  {label, htmlFor: id, error, hint},
  React.createElement(Input, {id, defaultValue: value, maxLength, readOnly: true}),
));

/** Marco real del diálogo (`app/dialog.tsx`): heading, body y footer portal. */
const marco = (body, footer, size = 'default') => `
<div class="ops-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="ia-title" data-dialog-size="${size}">
 <div class="dialog-heading"><h2 id="ia-title">Carga con IA</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${xIcon}</button></div>
 <div class="dialog-body">${body}</div>
 <div class="dialog-footer"><div class="dialog-actions">${footer}</div></div>
</section></div>`;

const inputPlano = (value, extra = '') => `<input class="w-full rounded-lg border border-ink-500 bg-ink-800 px-3.5 text-fore h-11 md:h-9 text-base md:text-sm outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40" value="${value}" readonly ${extra}/>`;

const selectCategoria = (label, seleccionada, opciones) => `
<div class="ops-select"><span class="ops-label">${label}</span><button type="button" class="ops-select-trigger" aria-haspopup="listbox" aria-expanded="false"><span>${seleccionada}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button></div>
<p class="text-[11px] text-mute">${opciones}</p>`;

const CARD = (contenido, off = false) => `<article class="grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5 transition${off ? ' opacity-70' : ''}" data-off="${off}">${contenido}</article>`;
const cardHead = (titulo, estado, checked) => `<header class="flex min-w-0 items-start justify-between gap-3"><div class="min-w-0"><h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore" title="${titulo}">${titulo}</h4><p class="text-[11px] text-mute">${estado}</p></div>${checkbox(checked)}</header>`;
const gridCampos = (campos) => `<div class="grid gap-2 sm:grid-cols-2">${campos.join('')}</div>`;

/* ---------------------------------------------------------------- entrada */

const cuerpoEntrada = `
<form class="grid gap-3">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <p class="text-sm text-mute">Pegá mensajes, listas o catálogos. La IA detecta <b class="text-fore">clientes y equipos de inventario</b> y arma la vista previa.</p>
  <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink-700 px-2.5 py-1 text-[11px] font-semibold text-mute">openai/gpt-oss-120b</span>
 </div>
 ${object(React.createElement(FormField, {label: 'Texto para cargar', htmlFor: 'ia-texto', hint: 'Máximo 20.000 caracteres; hasta 25 registros por tipo. Nada se crea ni se guarda al analizar.'},
   React.createElement('textarea', {id: 'ia-texto', readOnly: true, className: 'min-h-44 w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm', defaultValue: 'Clientes:\nMaría Fernanda González (Constructora Sur S.A.) — RUC 80012345-6, 0981 123 456, maria@constructorasur.com.py\nJuan Pérez — 0982 555 111\n\nInventario:\nPantalla LED 3x2 P3.9, iluminación, cantidad 4, valor 1.500.000\nTrípode Manfrotto 055, soportes\nMixer Behringer X32'})))}
 <p class="self-end text-[11px] tabular-nums text-mute" aria-live="polite">387 / 20.000</p>
 ${object(React.createElement(AvisoPrivacidad, {
   finalidad: 'Usamos el texto que pegás sólo para detectar los registros y armar la vista previa: nada se crea sin tu confirmación y el texto no se guarda en Scale OS.',
   detalle: 'El análisis lo hace el proveedor de IA configurado como encargado y se envía únicamente ese texto, nunca la base de datos.',
   politicaUrl: '/privacidad',
   derechosUrl: '/privacidad#derechos',
   compact: true,
 }))}
</form>`;

/* -------------------------------------------------------------- revisión */

const cuerpoRevision = `
<div class="grid gap-4">
 <p class="text-sm text-mute">Detectamos <b class="text-fore">2 clientes y 3 equipos de inventario</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea sin tu confirmación</b>.</p>
 <p class="text-[11.5px] text-mute">Se crearán <b class="tabular-nums text-fore">6</b> equipos en total: un registro por unidad reservable.</p>
 ${aviso('warn', 'Se descartaron 2 registros repetidos en el texto.')}
 <section class="grid gap-3" aria-label="Clientes detectados (2)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Clientes <span class="tabular-nums">2</span></h3>
  ${CARD(`${cardHead('María Fernanda González', 'Se creará', true)}
   ${aviso('warn', 'Sin RUC verificado en el padrón: revisá el dígito antes de guardar.', true)}
   ${gridCampos([
     campo('Nombre', 'María Fernanda González', {maxLength: 120}),
     campo('Empresa / razón social', 'Constructora Sur S.A.', {maxLength: 160}),
     campo('RUC / C.I.', '80012345-6', {maxLength: 60}),
     `<div><span class="ops-label">Teléfono</span><span class="phone-input grid grid-cols-[minmax(94px,.42fr)_minmax(0,1fr)] gap-2"><select class="px-2" aria-label="Código de país"><option>+595</option></select>${inputPlano('981 123 456')}</span></div>`,
     campo('Correo', 'maria@constructorasur.com.py', {maxLength: 200}),
   ])}`)}
  ${CARD(`${cardHead('Juan Pérez', 'Descartado', false)}
   ${aviso('warn', 'Falta el correo: el texto no lo traía.', true)}
   ${gridCampos([
     campo('Nombre', 'Juan Pérez', {maxLength: 120}),
     campo('Empresa / razón social', '', {maxLength: 160}),
     campo('RUC / C.I.', '', {maxLength: 60}),
     campo('Correo', '', {maxLength: 200}),
   ])}`, true)}
 </section>
 <section class="grid gap-3" aria-label="Equipos detectados (3)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Equipos de inventario <span class="tabular-nums">3</span></h3>
  ${CARD(`${cardHead('Pantalla LED 3x2 · P3.9', 'Se crearán 4 equipo(s) · un registro por unidad reservable', true)}
   ${aviso('warn', 'Cantidad dudosa: se interpretó «4» del texto.', true)}
   ${gridCampos([
     campo('Nombre', 'Pantalla LED 3x2 · P3.9', {maxLength: 160}),
     selectCategoria('Categoría', 'iluminación · nueva categoría', 'También podés elegir una categoría existente.'),
     campo('Unidades a crear (1–25)', '4', {maxLength: 2}),
     campo('Valor del equipo (Gs)', '1.500.000'),
   ])}`)}
  ${CARD(`${cardHead('Trípode Manfrotto 055', 'Se creará 1 equipo(s) · un registro por unidad reservable', true)}
   ${aviso('warn', 'Sin valor en el texto: queda en 0 hasta que lo edites.', true)}
   ${gridCampos([
     campo('Nombre', 'Trípode Manfrotto 055', {maxLength: 160}),
     selectCategoria('Categoría', 'soportes', 'También podés elegir una categoría existente.'),
     campo('Unidades a crear (1–25)', '1', {maxLength: 2}),
     campo('Valor del equipo (Gs)', '0'),
   ])}`)}
 </section>
</div>`;

/* ------------------------------------------------------------- resultado */

const cuerpoResultado = `
<div class="grid gap-3">
 ${aviso('ok', 'Creamos 2 clientes y 6 equipos.', false)}
 ${aviso('error', 'No pudimos crear 1 registro(s): Cliente «Juan Pérez»: Ya existe un cliente con ese RUC.', false)}
 <p class="text-[11.5px] leading-5 text-mute">Cada alta quedó auditada como cualquier carga manual y el texto que pegaste no se guardó. Los registros creados ya aparecen en Clientes y en Inventario.</p>
</div>`;

export default [
  {
    id: 'ia-carga-entrada',
    section: 'Topbar',
    surface: 'Carga con IA · entrada del texto (Refs #118)',
    kind: 'plain',
    body: marco(cuerpoEntrada, '<button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Analizar con IA</button>'),
  },
  {
    id: 'ia-carga-revision',
    section: 'Topbar',
    surface: 'Carga con IA · vista previa editable con avisos (Refs #118)',
    kind: 'plain',
    body: marco(cuerpoRevision, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (3)</button>', 'wide'),
  },
  {
    id: 'ia-carga-resultado',
    section: 'Topbar',
    surface: 'Carga con IA · resultado creado y errores (Refs #118)',
    kind: 'plain',
    body: marco(cuerpoResultado, '<button type="button" class="secondary">Cargar otro texto</button><button type="button" class="primary">Listo</button>'),
  },
];
