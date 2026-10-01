/*
 * «Carga con IA» — estándar portable (Refs #132): carrito editable, % de
 * confianza con preselección, avisos nuevos e imágenes de confirmación.
 *
 * Espeja `app/ia-carga.tsx` (marco del diálogo, tarjetas, chips, botones de
 * carrito) y `app/equipment-photo.tsx` + `app/foto-perfil.tsx` (imágenes con
 * fallback). Las fotos del fixture salen de `public/brand` (el harness las
 * sirve). Datos ficticios.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Aviso, Checkbox, FormField, Input} from 'owncoding-ui';

const object = (element) => renderToStaticMarkup(element);
const xIcon = object(React.createElement('span', {'aria-hidden': 'true', className: 'text-base leading-none'}, '×'));
const aviso = (tono, children, compact = false) => object(React.createElement(Aviso, {tono, compact}, children));
const check = (checked) => object(React.createElement(Checkbox, {label: 'Incluir', checked, onChange: () => {}}));
const campo = (label, value) => object(React.createElement(FormField, {label, htmlFor: `ia-${label}`}, React.createElement(Input, {id: `ia-${label}`, defaultValue: value, readOnly: true})));

const marco = (body, footer, size = 'wide') => `
<div class="ops-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="ia-title" data-dialog-size="${size}">
 <div class="dialog-heading"><h2 id="ia-title">Carga con IA</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${xIcon}</button></div>
 <div class="dialog-body">${body}</div>
 <div class="dialog-footer"><div class="dialog-actions">${footer}</div></div>
</section></div>`;

/** Logo del cliente (FotoPerfil real: foto o iniciales). */
const logo = (nombre, foto) => `
<span class="foto-perfil foto-perfil-lg foto-perfil-cuadrado foto-perfil-logo identity-avatar" aria-hidden="true">${foto ? `<img src="${foto}" alt="" referrerpolicy="no-referrer"/>` : `<span class="foto-perfil-iniciales" aria-hidden="true">${nombre.slice(0, 2).toUpperCase()}</span>`}</span>`;
const logoMini = (nombre, foto) => `
<span class="foto-perfil foto-perfil-sm foto-perfil-cuadrado foto-perfil-logo" aria-hidden="true">${foto ? `<img src="${foto}" alt="" referrerpolicy="no-referrer"/>` : `<span class="foto-perfil-iniciales" aria-hidden="true">${nombre.slice(0, 2).toUpperCase()}</span>`}</span>`;

/** Foto del equipo (EquipmentPhoto real: foto o placeholder con ícono). */
const fotoEquipo = (nombre, foto, size = 'card') => {
 const box = size === 'card' ? 'h-14 w-14' : 'h-9 w-9';
 return foto
  ? `<img class="${box} shrink-0 rounded-lg border border-ink-600 object-cover" src="${foto}" alt="Foto de ${nombre}" loading="lazy" referrerpolicy="no-referrer"/>`
  : `<span class="${box} grid shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-700/40 text-mute" role="img" aria-label="Sin foto: ${nombre}" title="Sin foto"><svg width="${size === 'card' ? 20 : 16}" height="${size === 'card' ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8"/></svg></span>`;
};

const CHIP = {ok: 'bg-ok/15 text-ok-text', warn: 'bg-warn/15 text-warn-text', mute: 'bg-ink-700 text-mute'};
const chip = (tono, texto, title = '') => `<span class="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHIP[tono]}" title="${title}">${texto}</span>`;

const botonCarrito = (titulo, incluir) => `<span class="flex items-center gap-1"><button type="button" class="text-button min-h-11 md:min-h-9" title="Duplicar ${titulo}" aria-label="Duplicar ${titulo}">Duplicar</button>${incluir ? `<button type="button" class="text-button min-h-11 md:min-h-9" title="Quitar del carrito (descartar)" aria-label="Quitar del carrito (descartar)">Quitar</button>` : `<button type="button" class="text-button min-h-11 md:min-h-9" title="Volver a incluir" aria-label="Volver a incluir"></button>`}</span>`;

const cardHead = ({titulo, chips, detalle, origen, incluir, imagen, unidades}) => `
<header class="flex min-w-0 items-start justify-between gap-3">
 <div class="flex min-w-0 flex-1 items-start gap-2.5">
  ${imagen}
  <div class="grid min-w-0 gap-1">
   <h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore" title="${titulo}">${titulo}</h4>
   <p class="flex flex-wrap items-center gap-2 text-[11px] text-mute">${chips}${origen ? `<span class="whitespace-nowrap rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-semibold text-mute">${origen}</span>` : ''}<span>${detalle}</span></p>
  </div>
 </div>
 <div class="flex shrink-0 flex-col items-end gap-1.5">${check(incluir)}${botonCarrito(titulo, incluir)}</div>
</header>`;

const OPCION = (contenido, pressed) => `<button type="button" aria-pressed="${pressed}" class="inline-flex w-full min-h-11 flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-lg border border-ink-500 px-2.5 py-1.5 text-left text-[11.5px] font-medium text-mute transition hover:border-fono hover:text-fore aria-pressed:border-fono aria-pressed:bg-fono/10 aria-pressed:text-fore sm:w-auto md:min-h-9">${contenido}</button>`;

const candidato = ({nombre, foto, tipo = 'cliente', confianza, senales, pressed, mejor}) => OPCION(
 `${tipo === 'cliente' ? logoMini(nombre, foto) : fotoEquipo(nombre, foto, 'chip')}<span class="min-w-0 max-w-[14rem] flex-1 truncate">Usar «${nombre}»${mejor ? ' · mejor' : ''}</span>${confianza != null ? `<b class="whitespace-nowrap text-[10px] tabular-nums">${confianza} %</b>` : ''}${senales ? `<span class="w-full whitespace-nowrap text-[10px] uppercase tracking-wide text-mute sm:w-auto">${senales}</span>` : ''}`, pressed);

const matchBlock = ({intro, candidatos, decision, nota, tipo = 'cliente'}) => `
<div class="grid gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5">
 <p class="text-[11.5px] leading-5 text-mute">${intro} <b class="text-fore">Nada se duplica sin tu decisión.</b></p>
 <div class="flex flex-wrap gap-2" role="group" aria-label="Elegir la ficha existente">${candidatos.join('')}</div>
 <div class="flex flex-wrap items-center gap-2">${OPCION(`Crear ${tipo} nuevo`, decision === 'crear')}${nota}</div>
</div>`;

const avisos = (items) => `<ul class="grid gap-1" aria-label="Avisos del análisis">${items.map(([tipo, etiqueta, texto]) => `<li class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-lg border border-warn/30 bg-warn/10 px-2.5 py-2 text-[11.5px] leading-5 text-warn-text" data-aviso="${tipo}">${etiqueta ? `<b class="whitespace-nowrap text-[10px] uppercase tracking-wide">${etiqueta}</b>` : ''}<span class="min-w-0 break-words">${texto}</span></li>`).join('')}</ul>`;

const CARD = (contenido, extra = '') => `<article class="grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5" ${extra}>${contenido}</article>`;

const resumenCarrito = (crear, vincular, descartados) => `
<p class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-mute" role="status" data-carrito="resumen">
 <span><b class="tabular-nums text-fore">${crear}</b> por crear</span><span aria-hidden="true">·</span>
 <span><b class="tabular-nums text-fore">${vincular}</b> por vincular</span>${descartados ? `<span aria-hidden="true">·</span><span><b class="tabular-nums text-fore">${descartados}</b> descartado</span>` : ''}
</p>`;

const seccion = (titulo, conteo, boton, cartas) => `
<section class="grid gap-3" aria-label="${titulo} en el carrito (${conteo})">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">${titulo} <span class="tabular-nums">${conteo}</span></h3>
  <button type="button" class="secondary min-h-11 md:min-h-9">${boton}</button>
 </div>
 ${cartas.join('')}
</section>`;

/* ----------------------------------------------------------------- fixtures */

const carrito = `
<div class="grid gap-4">
 <p class="text-sm text-mute" role="status">Detectamos <b class="text-fore">2 clientes, 1 equipo de inventario</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
 ${resumenCarrito(2, 1, 1)}
 ${seccion('Clientes', 3, 'Agregar cliente', [
  CARD(`${cardHead({titulo: 'Constructora Sur S.A.', chips: chip('ok', 'Coincide 94 %', 'Confianza del match: 94 %'), detalle: 'Se usa la ficha existente', imagen: logo('Constructora Sur', '/brand/icon-192.png'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia alta (94 %): preseleccionamos vincular; podés cambiarlo.', candidatos: [candidato({nombre: 'Constructora Sur S.A.', foto: '/brand/icon-192.png', confianza: 94, senales: 'RUC/CI COINCIDE · NOMBRE IGUAL', pressed: true, mejor: true})], decision: 'vincular', nota: '<span class="text-[11px] text-mute">Vincular no modifica la ficha existente.</span>'})}`),
  CARD(`${cardHead({titulo: 'Kiosco Central', chips: chip('warn', 'Coincide 72 %', 'Confianza del match: 72 %'), detalle: 'Se usa la ficha existente', imagen: logo('Kiosco Central'), incluir: true, unidades: null, origen: 'Duplicado'})}
   ${matchBlock({intro: 'Coincidencia media (72 %): preseleccionamos el mejor candidato; revisá antes de vincular.', candidatos: [candidato({nombre: 'Kiosco Central S.A.', confianza: 72, senales: 'MISMO TELÉFONO', pressed: true, mejor: true}), candidato({nombre: 'Kiosco del Centro', confianza: 64, senales: 'NOMBRE PARECIDO', pressed: false})], decision: 'vincular', nota: '<span class="text-[11px] text-mute">Vincular no modifica la ficha existente.</span>'})}`),
  CARD(`${cardHead({titulo: 'Cliente nuevo (sin nombre)', chips: chip('mute', 'Nuevo'), detalle: 'Se creará', imagen: logo('CN'), incluir: true, unidades: null, origen: 'Agregado a mano'})}
   <div class="grid gap-2 sm:grid-cols-2">${campo('Nombre', '')}${campo('Correo', '')}</div>`),
 ])}
 ${seccion('Equipos de inventario', 2, 'Agregar equipo', [
  CARD(`${cardHead({titulo: 'Pantalla LED 3x2 · P3.9', chips: chip('warn', 'Ambiguo 68 %', 'Confianza del match: 68 %'), detalle: 'Se crearán 2 equipo(s) · un registro por unidad reservable', imagen: fotoEquipo('Pantalla LED 3x2', '/brand/icon-192.png'), incluir: true, unidades: 2})}
   ${matchBlock({intro: 'Coincidencia media (68 %): preseleccionamos el mejor candidato; revisá antes de vincular.', candidatos: [candidato({nombre: 'Pantalla LED 3x2', foto: '/brand/icon-192.png', tipo: 'equipo', confianza: 68, senales: 'NOMBRE IGUAL', pressed: false, mejor: true})], decision: 'crear', tipo: 'equipo', nota: '<span class="text-[11px] text-warn-text">Se creará un registro nuevo aunque exista una ficha parecida.</span>'})}`),
  CARD(`${cardHead({titulo: 'Trípode Manfrotto 055', chips: chip('mute', 'Nuevo'), detalle: 'Descartado', imagen: fotoEquipo('Trípode Manfrotto 055', null), incluir: false, unidades: 1})}
   <div class="grid gap-2 sm:grid-cols-2">${campo('Nombre', 'Trípode Manfrotto 055')}${campo('Unidades a crear (1–25)', '1')}</div>`, 'data-off="true"'),
 ])}
</div>`;

const confianza = `
<div class="grid gap-4">
 <p class="text-sm text-mute" role="status">Detectamos <b class="text-fore">3 clientes</b>: la preselección sale de la confianza del match y siempre se puede cambiar.</p>
 ${resumenCarrito(1, 2, 0)}
 ${seccion('Clientes', 3, 'Agregar cliente', [
  CARD(`${cardHead({titulo: 'Estudio Norte', chips: chip('ok', 'Coincide 96 %', 'Confianza del match: 96 %'), detalle: 'Se usa la ficha existente', imagen: logo('Estudio Norte', '/brand/icon-192.png'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia alta (96 %): preseleccionamos vincular; podés cambiarlo.', candidatos: [candidato({nombre: 'Estudio Norte S.A.', foto: '/brand/icon-192.png', confianza: 96, senales: 'RUC/CI COINCIDE', pressed: true, mejor: true})], decision: 'vincular', nota: '<span class="text-[11px] text-mute">Vincular no modifica la ficha existente.</span>'})}`),
  CARD(`${cardHead({titulo: 'Sur Films', chips: chip('warn', 'Ambiguo 78 %', 'Confianza del match: 78 %'), detalle: 'Se usa la ficha existente', imagen: logo('Sur Films'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia media (78 %): preseleccionamos el mejor candidato; revisá antes de vincular.', candidatos: [candidato({nombre: 'Sur Films S.A.', confianza: 78, senales: 'CORREO', pressed: true, mejor: true}), candidato({nombre: 'Sur Producciones', confianza: 66, senales: 'NOMBRE PARECIDO', pressed: false})], decision: 'vincular', nota: '<span class="text-[11px] text-mute">Vincular no modifica la ficha existente.</span>'})}`),
  CARD(`${cardHead({titulo: 'Juan Pérez', chips: chip('warn', 'Ambiguo 42 %', 'Confianza del match: 42 %'), detalle: 'Se creará', imagen: logo('Juan Pérez'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Sin coincidencia suficiente (42 %): preseleccionamos crear un registro nuevo.', candidatos: [candidato({nombre: 'Juan Pérez', confianza: 42, senales: 'NOMBRE PARECIDO', pressed: false, mejor: true})], decision: 'crear', nota: '<span class="text-[11px] text-warn-text">Se creará un registro nuevo aunque exista una ficha parecida.</span>'})}`),
 ])}
</div>`;

const imagenes = `
<div class="grid gap-4">
 <p class="text-sm text-mute" role="status">Imágenes de confirmación: logo del cliente (con monograma de fallback) y foto del equipo (o placeholder limpio), también en los candidatos.</p>
 ${seccion('Clientes', 2, 'Agregar cliente', [
  CARD(`${cardHead({titulo: 'Constructora Sur S.A.', chips: chip('ok', 'Coincide 97 %', 'Confianza del match: 97 %'), detalle: 'Se usa la ficha existente', imagen: logo('Constructora Sur', '/brand/icon-192.png'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia alta (97 %): preseleccionamos vincular; podés cambiarlo.', candidatos: [candidato({nombre: 'Constructora Sur S.A.', foto: '/brand/icon-192.png', confianza: 97, senales: 'RUC/CI COINCIDE', pressed: true, mejor: true}), candidato({nombre: 'Constructora del Sur', confianza: 88, senales: 'NOMBRE IGUAL', pressed: false})], decision: 'vincular', nota: ''})}`),
  CARD(`${cardHead({titulo: 'María González', chips: chip('warn', 'Coincide 84 %', 'Confianza del match: 84 %'), detalle: 'Se usa la ficha existente', imagen: logo('María González'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia media (84 %): preseleccionamos el mejor candidato; revisá antes de vincular.', candidatos: [candidato({nombre: 'María González', confianza: 84, senales: 'MISMO TELÉFONO', pressed: true, mejor: true})], decision: 'vincular', nota: ''})}`),
 ])}
 ${seccion('Equipos de inventario', 2, 'Agregar equipo', [
  CARD(`${cardHead({titulo: 'Pantalla LED 3x2', chips: chip('ok', 'Coincide 93 %', 'Confianza del match: 93 %'), detalle: 'Se usa la ficha existente', imagen: fotoEquipo('Pantalla LED 3x2', '/brand/icon-192.png'), incluir: true, unidades: null})}
   ${matchBlock({intro: 'Coincidencia alta (93 %): preseleccionamos vincular; podés cambiarlo.', candidatos: [candidato({nombre: 'Pantalla LED 3x2 P3.9', foto: '/brand/icon-192.png', tipo: 'equipo', confianza: 93, senales: 'NOMBRE IGUAL', pressed: true, mejor: true})], decision: 'vincular', tipo: 'equipo', nota: ''})}`),
  CARD(`${cardHead({titulo: 'Trípode Manfrotto 055', chips: chip('mute', 'Nuevo'), detalle: 'Se creará', imagen: fotoEquipo('Trípode Manfrotto 055', null), incluir: true, unidades: 1})}
   <div class="grid gap-2 sm:grid-cols-2">${campo('Nombre', 'Trípode Manfrotto 055')}${campo('Unidades a crear (1–25)', '1')}</div>`),
 ])}
</div>`;

const avisosFixture = `
<div class="grid gap-4">
 <p class="text-sm text-mute" role="status">Avisos del motor con su tratamiento: escalares fuera del texto, moneda extranjera, fechas resueltas y plazos por «a crédito».</p>
 ${seccion('Clientes', 1, 'Agregar cliente', [
  CARD(`${cardHead({titulo: 'Kiosco Central', chips: chip('warn', 'Coincide 71 %', 'Confianza del match: 71 %'), detalle: 'Se creará', imagen: logo('Kiosco Central'), incluir: true, unidades: null})}
   ${avisos([['no-esta', 'No está en el texto', 'El RUC 80012345-6 no aparece en el texto: revisalo antes de guardar.'], ['fecha', 'Fecha resuelta', '«mañana» → 02-10-2026: se registra esa fecha.'], ['plazo', 'Plazo, no cobro', '«a crédito 30 días» es un plazo de pago, no un cobro registrado.']])}
   ${matchBlock({intro: 'Coincidencia media (71 %): preseleccionamos el mejor candidato; revisá antes de vincular.', candidatos: [candidato({nombre: 'Kiosco Central S.A.', confianza: 71, senales: 'NOMBRE PARECIDO', pressed: false, mejor: true})], decision: 'crear', nota: ''})}`),
 ])}
 ${seccion('Equipos de inventario', 1, 'Agregar equipo', [
  CARD(`${cardHead({titulo: 'Monitor 27"', chips: chip('mute', 'Nuevo'), detalle: 'Se creará', imagen: fotoEquipo('Monitor 27', null), incluir: true, unidades: 1})}
   ${avisos([['moneda', 'Moneda extranjera', 'El texto trae «USD 420»: no lo interpretamos como guaraníes.']])}
   ${aviso('warn', 'El texto trae la moneda <b>USD</b> (420): no la convertimos. Ingresá el valor en Gs.', true)}
   <div class="grid gap-2 sm:grid-cols-2">${campo('Nombre', 'Monitor 27"')}${campo('Valor del equipo (Gs)', '')}</div>`),
 ])}
</div>`;

const footer = '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (2)</button>';

export default [
  {id: 'ia-132-carrito', section: 'Topbar', surface: 'Carga con IA · carrito editable (Refs #132)', kind: 'plain', body: marco(carrito, footer)},
  {id: 'ia-132-confianza', section: 'Topbar', surface: 'Carga con IA · preselección por % (Refs #132)', kind: 'plain', body: marco(confianza, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (1)</button>')},
  {id: 'ia-132-imagenes', section: 'Topbar', surface: 'Carga con IA · imágenes de confirmación (Refs #132)', kind: 'plain', body: marco(imagenes, footer)},
  {id: 'ia-132-avisos', section: 'Topbar', surface: 'Carga con IA · avisos nuevos y moneda extranjera (Refs #132)', kind: 'plain', body: marco(avisosFixture, '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Crear todo (2)</button>')},
];
