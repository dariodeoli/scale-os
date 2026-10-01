/*
 * «Carga con IA» — UX en casos difíciles (Refs #128, auditoría #127).
 *
 * Evidencia de: contador cerca del límite, errores accionables distintos
 * (texto muy largo / límite con espera / proveedor ocupado) y confirmación de
 * cobro con el monto interpretado en grande + aviso de escala.
 *
 * Los objetos reales de owncoding-ui (`Aviso`, `AvisoPrivacidad`, `FormField`,
 * `Input`, `MoneyText` es de la app) se renderizan con `renderToStaticMarkup`;
 * el marco del diálogo y las tarjetas espejan `app/ia-carga.tsx`. Datos
 * ficticios.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Aviso, AvisoPrivacidad, FormField, Input} from 'owncoding-ui';

const object = (element) => renderToStaticMarkup(element);
const xIcon = object(React.createElement('span', {'aria-hidden': 'true', className: 'text-base leading-none'}, '×'));
const aviso = (tono, children, compact = false) => object(React.createElement(Aviso, {tono, compact}, children));
const campo = (label, value, {hint, type = 'text', id = `ia-${label}`} = {}) => object(React.createElement(
  FormField,
  {label, htmlFor: id, hint},
  React.createElement(Input, {id, defaultValue: value, readOnly: true, type}),
));

const marco = (body, footer, size = 'default') => `
<div class="ops-overlay"><section class="ops-dialog unified-dialog" role="dialog" aria-modal="true" aria-labelledby="ia-title" data-dialog-size="${size}">
 <div class="dialog-heading"><h2 id="ia-title">Carga con IA</h2><button class="icon-button" type="button" title="Cerrar" aria-label="Cerrar">${xIcon}</button></div>
 <div class="dialog-body">${body}</div>
 <div class="dialog-footer"><div class="dialog-actions">${footer}</div></div>
</section></div>`;

const TEXTAREA = (contenido) => object(React.createElement(FormField, {
  label: 'Texto para cargar',
  htmlFor: 'ia-texto',
  hint: 'Máximo 20.000 caracteres; hasta 25 registros por tipo. Nada se crea ni se guarda al analizar.',
}, React.createElement('textarea', {
  id: 'ia-texto',
  readOnly: true,
  className: 'min-h-44 w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm',
  defaultValue: contenido,
})));

const entrada = (cuerpo) => `
<form class="grid gap-3">
 <div class="flex flex-wrap items-center justify-between gap-2">
  <p class="text-sm text-mute">Pegá mensajes, listas o catálogos. La IA detecta <b class="text-fore">clientes y equipos de inventario</b>, reconoce lo ya creado y arma la vista previa.</p>
  <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-ink-700 px-2.5 py-1 text-[11px] font-semibold text-mute">openai/gpt-oss-120b</span>
 </div>
 ${TEXTAREA(cuerpo.texto)}
 <p class="self-end text-[11px] tabular-nums text-mute" data-cerca="${cuerpo.cerca ? 'true' : undefined}" aria-live="polite">${cuerpo.contador} / 20.000</p>
 ${cuerpo.cerca ? aviso('warn', 'Estás cerca del límite de 20.000 caracteres: si el texto es más largo, probá en dos partes.', true) : ''}
 ${avisoPrivacidad}
 ${cuerpo.fallo}
</form>`;

const avisoPrivacidad = object(React.createElement(AvisoPrivacidad, {
 finalidad: 'Usamos el texto que pegás sólo para detectar los registros y armar la vista previa: nada se crea sin tu confirmación y el texto no se guarda en Scale OS.',
 detalle: 'El análisis lo hace el proveedor de IA configurado como encargado y se envía únicamente ese texto, nunca la base de datos.',
 politicaUrl: '/privacidad',
 derechosUrl: '/privacidad#derechos',
 compact: true,
}));

/* Fallo del análisis: mismo bloque que `FalloIa` (tono warn/error + acción). */
const fallo = (tipo, mensaje, accion) => `
<div class="grid gap-1 rounded-lg border px-3 py-2 text-sm ${tipo === 'proveedor' ? 'border-bad/30 bg-bad/10 text-bad-text' : 'border-warn/30 bg-warn/10 text-warn-text'}" role="${tipo === 'proveedor' ? 'alert' : 'status'}" data-fallo="${tipo}">
 <strong>${mensaje}</strong>
 <span class="text-[12px] leading-5">${accion}</span>
</div>`;

/* Monto interpretado en grande (`MontoInterpretado` de app/ia-carga.tsx). */
const montoInterpretado = ({monto, cliente, fecha, dudoso}) => `
<div class="grid gap-1.5 rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5" data-monto="${monto}">
 <span class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Monto interpretado</span>
 <span class="inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums text-xl leading-tight text-fore">${monto === '500' ? 'Gs. 500' : 'Gs. 2.500.000'}</span>
 <p class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-mute"><span class="break-all">${cliente}</span><span aria-hidden="true">·</span><span class="whitespace-nowrap">${fecha}</span></p>
 ${dudoso ? aviso('warn', `El monto parece bajo para guaraníes: revisá que no falten ceros (¿Gs. 500 o Gs. 500.000?).`, true) : ''}
</div>`;

const CARD = (contenido) => `<article class="grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5">${contenido}</article>`;
/** Tonos del `StateChip` de la app, con clases literales para que Tailwind las genere. */
const CHIP = {info: 'bg-ink-700 text-mute', ok: 'bg-ok/15 text-ok-text', warn: 'bg-warn/15 text-warn-text'};
const chip = (tono, texto) => `<span class="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${CHIP[tono]}">${texto}</span>`;

const accion = (interpretado) => `
<div class="grid gap-4">
 <p class="text-sm text-mute" role="status">Detectamos <b class="text-fore">1 acción propuesta</b>. Revisá, corregí o descartá: <b class="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
 <section class="grid gap-3" aria-label="Acciones propuestas (2)">
  <h3 class="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Acciones propuestas <span class="tabular-nums">2</span></h3>
  ${CARD(`
   <header class="flex min-w-0 flex-wrap items-start justify-between gap-2"><div class="min-w-0"><h4 class="min-w-0 truncate text-[13.5px] font-semibold text-fore">Registrar cobro</h4><p class="text-[11px] text-mute">En el texto: Kiosco Central</p></div>${chip('info', 'Sin confirmar')}</header>
   <p class="flex flex-wrap items-center gap-2 text-[12px] text-mute">${chip('ok', 'Cliente vinculado')}<span class="break-all">Kiosco Central S.A.</span></p>
   ${montoInterpretado(interpretado)}
   <div class="grid gap-2 sm:grid-cols-2">
    ${campo('Monto (PYG)', interpretado.monto, {id: 'ia-monto'})}
    ${campo('Fecha del cobro', '2026-09-28', {id: 'ia-fecha', type: 'date'})}
   </div>
   <div class="flex flex-wrap items-center gap-2"><button type="button" class="primary">Confirmar acción</button></div>`)}
 </section>
</div>`;

export default [
  {
    id: 'ia-128-cerca',
    section: 'Topbar',
    surface: 'Carga con IA · contador cerca del límite (Refs #128)',
    kind: 'plain',
    body: marco(entrada({
      texto: 'Clientes del evento:\nConstructora Sur S.A. — RUC 80012345-6 …\n(17.480 caracteres pegados)',
      contador: '17.480',
      cerca: true,
      fallo: '',
    }), '<button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Analizar con IA</button>'),
  },
  {
    id: 'ia-128-error-largo',
    section: 'Topbar',
    surface: 'Carga con IA · texto muy largo: probá en dos partes (Refs #128)',
    kind: 'plain',
    body: marco(entrada({
      texto: '25 clientes y 25 equipos pegados de una vez (20.000 caracteres)',
      contador: '20.000',
      cerca: true,
      fallo: fallo('texto-largo', 'El texto era muy largo para una sola pasada. Probá en dos partes de hasta 20.000 caracteres cada una.', 'Probá en dos partes: analizá la primera mitad y creá esos registros; después pegá la segunda.'),
    }), '<button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Analizar con IA</button>'),
  },
  {
    id: 'ia-128-error-limite',
    section: 'Topbar',
    surface: 'Carga con IA · límite alcanzado: esperá 7 minutos (Refs #128)',
    kind: 'plain',
    body: marco(entrada({
      texto: 'Clientes del evento:\nConstructora Sur S.A. — RUC 80012345-6, 0981 123 456',
      contador: '96',
      cerca: false,
      fallo: fallo('limite', 'Alcanzaste el límite de análisis de tu empresa. Esperá 7 minutos y volvé a probar; mientras tanto podés cargar a mano.', 'Esperá 7 minutos y volvé a analizar el mismo texto: queda acá, no se pierde.'),
    }), '<button type="button" class="secondary">Cancelar</button><button type="button" class="primary">Analizar con IA</button>'),
  },
  {
    id: 'ia-128-monto',
    section: 'Topbar',
    surface: 'Carga con IA · monto interpretado en grande y aviso de escala (Refs #128)',
    kind: 'plain',
    body: marco(accion({monto: '500', cliente: 'Kiosco Central S.A.', fecha: '28-sept', dudoso: true}), '<button type="button" class="secondary">Volver</button><button type="button" class="primary">Ver resumen</button>', 'wide'),
  },
];
