/*
 * Adopción owncoding-ui v0.59.0 (Refs #124) — a11y ronda 13.
 *
 * Evidencia de los objetos reales de la biblioteca sobre el CSS construido de
 * Scale OS: chips (Badge/ChipEstado), botones llenos (Button primary/success/
 * danger), acciones de fila (IconAction, default 44 móvil/28 escritorio),
 * enlaces (EnlaceLinea), pie institucional (ProductFooter) y el pie del riel
 * propio de la app. Se renderiza lo instalado en `node_modules` (v0.59.0) para
 * medir/capturar la versión adoptada.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AvisoPrivacidad, Badge, Button, ChipEstado, IconAction, ProductFooter} from 'owncoding-ui';

const object = (element) => renderToStaticMarkup(element);
const chip = (color, texto) => object(React.createElement(Badge, {color}, texto));
const chipEstado = (estado) => object(React.createElement(ChipEstado, {estado}));
const boton = (variant, texto) => object(React.createElement(Button, {variant}, texto));
const accion = (props) => object(React.createElement(IconAction, props));
/** El enlace real vive dentro de `AvisoPrivacidad` (EnlaceLinea no es público). */
const aviso = object(React.createElement(AvisoPrivacidad, {
  finalidad: 'Usamos este dato para prestarte el servicio.',
  detalle: 'Podés pedir acceso, corrección o supresión desde «Tus derechos».',
  politicaUrl: '/privacidad',
  derechosUrl: '/privacidad#derechos',
  compact: true,
}));
const pie = object(React.createElement(ProductFooter, {nombre: 'Scale OS', version: 'v1.0.157', className: 'workspace-footer'}));

const CARD = (titulo, contenido) => `<section class="panel grid gap-3"><div class="panel-heading"><h2>${titulo}</h2></div>${contenido}</section>`;
const FILA = (contenido) => `<div class="flex flex-wrap items-center gap-2">${contenido}</div>`;

/** Riel de Scale OS: gradiente propio + pie con texto blanco 78 %/72 % (no `NavLateral`). */
const riel = `
<div class="overflow-hidden rounded-xl border border-ink-600">
 <aside class="desktop-sidebar !flex !h-auto !w-full flex-col !p-3" style="background:linear-gradient(180deg,rgb(46 0 56) 0%,rgb(37 0 47) 100%)">
  <span class="workspace-brand" aria-label="Scale OS" style="display:inline-flex;align-items:center;gap:9px"><img src="/brand/icon-192.png" width="34" height="34" alt=""/><span class="workspace-wordmark">scale<span>OS</span></span></span>
  <nav class="mt-3 grid gap-1" aria-label="Menú principal">
   <button type="button" class="active flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none" style="background:rgb(255 255 255 / .14);color:#fff">Centro de control</button>
   <button type="button" class="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none" style="color:rgb(255 255 255 / .78)">Clientes</button>
   <button type="button" class="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold leading-none" style="color:rgb(255 255 255 / .78)">Finanzas</button>
  </nav>
  <div class="profile-footer mt-3 border-t border-white/10 pt-3">
   <button type="button" class="user flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left" style="color:var(--text)">
    <span class="foto-perfil" style="--foto-perfil-size:28px;width:28px;height:28px">MG</span>
    <span class="min-w-0"><b class="block truncate text-[13px]" style="color:#fff">María González</b><small class="block truncate text-[11px]" style="color:rgb(255 255 255 / .72)">Gerencia</small></span>
   </button>
  </div>
 </aside>
</div>`;

export default [
  {
    id: 'a11y-124-chips',
    section: 'Sistema',
    surface: 'Chips warn/ok/bad sobre su tinte (owncoding-ui #13)',
    kind: 'plain',
    body: `<div class="grid gap-4 p-4">${CARD('Chips de estado (Badge y ChipEstado reales)', `
     ${FILA(`${chip('orange', 'Vence en 3 días')}${chip('green', 'Al día')}${chip('red', 'Vencido')}${chip('blue', 'En revisión')}${chip('slate', 'Archivado')}`)}
     <div class="flex flex-wrap items-center gap-2">${chipEstado('pendiente')}${chipEstado('aprobado')}${chipEstado('vencido')}${chipEstado('pagado')}</div>
     <p class="text-[11.5px] text-mute">La familia <code>--c-*-text</code> se mide ≥4.5:1 sobre el tinte al 15 %/10 % en blanco, lienzo y paneles (test de contraste).</p>`)}</div>`,
  },
  {
    id: 'a11y-124-botones',
    section: 'Sistema',
    surface: 'Botones llenos y enlaces AA (owncoding-ui #13)',
    kind: 'plain',
    body: `<div class="grid gap-4 p-4">${CARD('Botones llenos (Button real)', `
     ${FILA(`${boton('primary', 'Crear registro')}${boton('success', 'Confirmar')}${boton('danger', 'Eliminar')}${boton('outline', 'Cancelar')}`)}
     <p class="text-[11.5px] text-mute">primary usa el par <code>--c-onbrand</code>; success/danger estrenan <code>--c-on-ok</code>/<code>--c-on-bad</code>, mapeados en los tres temas de Scale OS.</p>`)}
     ${CARD('Enlaces (dentro de AvisoPrivacidad real)', aviso)}</div>`,
  },
  {
    id: 'a11y-124-acciones',
    section: 'Sistema',
    surface: 'Acciones de fila: IconAction default 44/28 (owncoding-ui #13)',
    kind: 'plain',
    body: `<div class="grid gap-4 p-4">${CARD('Acciones de fila (IconAction real, default y touch)', `
     <div class="flex flex-wrap items-center gap-2">
      <span class="inline-flex items-center gap-1">${accion({icon: 'edit', label: 'Editar: Pantalla LED 3x2'})}${accion({icon: 'check', tone: 'ok', label: 'Conciliar: Extractor 0002'})}${accion({icon: 'trash', tone: 'bad', label: 'Archivar: Trípode Manfrotto'})}</span>
      <span class="inline-flex items-center gap-1">${accion({icon: 'refresh', label: 'Actualizar', size: 'touch'})}</span>
     </div>
     <p class="text-[11.5px] text-mute">El default pasa a 44 px en móvil y 28 px en escritorio (antes 28 en mobile); <code>size="touch"</code> conserva 36 de dibujo + 44 de toque.</p>`)}</div>`,
  },
  {
    id: 'a11y-124-pie-riel',
    section: 'Sistema',
    surface: 'Pie institucional y pie del riel propio (#124)',
    kind: 'plain',
    body: `<div class="grid gap-4 p-4">
      ${CARD('Pie del riel de Scale OS (riel propio, no NavLateral)', riel)}
      <div class="panel">${pie}</div>
     </div>`,
  },
];
