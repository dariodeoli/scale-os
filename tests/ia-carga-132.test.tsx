import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {
 IA_CONFIANZA_ALTA, IA_CONFIANZA_MEDIA,
 decisionPorConfianza, nivelConfianza, mejorCoincidencia, monedaExtranjeraIa, clasificarAvisoIa, normalizarIaAnalisis,
} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');

/* ------------------------------------------- confianza y preselección (#132) */

test('umbrales del estándar: ≥90 vincular · 60–89 vincular cambiable · <60 crear', () => {
 assert.equal(IA_CONFIANZA_ALTA, 90);
 assert.equal(IA_CONFIANZA_MEDIA, 60);
 assert.equal(decisionPorConfianza(94), 'vincular');
 assert.equal(decisionPorConfianza(90), 'vincular');
 assert.equal(decisionPorConfianza(72), 'vincular');
 assert.equal(decisionPorConfianza(60), 'vincular');
 assert.equal(decisionPorConfianza(59), 'crear');
 assert.equal(decisionPorConfianza(0), 'crear');
 assert.equal(decisionPorConfianza(null), null, 'sin confianza del motor manda el puente de #119');
 assert.equal(decisionPorConfianza(undefined), null);
 assert.equal(nivelConfianza(94), 'alta');
 assert.equal(nivelConfianza(72), 'media');
 assert.equal(nivelConfianza(59), 'baja');
 assert.equal(nivelConfianza(null), 'baja');
});

test('el motor puede mandar la confianza y las imágenes con nombres tolerantes', () => {
 const analisis = normalizarIaAnalisis({
  clientes: [{
   nombre: 'Constructora Sur',
   avisos: [],
   puntaje: 94,
   coincidencias: [
    {id: '7', nombre: 'Constructora Sur S.A.', senales: ['ruc_ci_exacto'], activo: true, score: 72, logo_url: 'https://cdn.example.com/logo.webp'},
    {id: '9', nombre: 'Constructora del Sur', senales: ['nombre_normalizado'], activo: true, confianza: 96, foto_url: 'javascript:alert(1)'},
    {id: '10', nombre: 'Otra', senales: [], activo: true, porcentaje: '120'},
   ],
  }],
  equipos: [{nombre: 'Pantalla LED', avisos: [], confianza: 61, coincidencias: [{id: '3', nombre: 'Pantalla LED 3x2', senales: [], activo: true, match: 88, foto_url: 'data:image/webp;base64,AAAA'}]}],
  avisos: [],
 });
 assert.equal(analisis.clientes[0].confianza, 94);
 assert.equal(analisis.inventario[0].confianza, 61);
 assert.equal(analisis.clientes[0].coincidencias?.[0].id, '9', 'los candidatos se ordenan por confianza (mejor primero)');
 assert.equal(analisis.clientes[0].coincidencias?.[0].confianza, 96);
 assert.equal(analisis.clientes[0].coincidencias?.[0].fotoUrl, undefined, 'una imagen no segura se descarta');
 assert.equal(analisis.clientes[0].coincidencias?.[1].fotoUrl, 'https://cdn.example.com/logo.webp');
 assert.equal(analisis.inventario[0].coincidencias?.[0].fotoUrl, 'data:image/webp;base64,AAAA');
 assert.equal(analisis.clientes[0].coincidencias?.length, 3, 'se conservan los candidatos válidos (tope 5)');
 assert.equal(mejorCoincidencia(analisis.inventario[0].coincidencias)?.nombre, 'Pantalla LED 3x2');
 assert.equal(mejorCoincidencia(undefined), null);
 // Fuera de rango o basura: no se inventa puntaje.
 assert.equal(normalizarIaAnalisis({clientes: [{nombre: 'X', avisos: [], confianza: 'mucho'}], avisos: []}).clientes[0].confianza, undefined);
});

/* ----------------------------------------------------- avisos y monedas (#132) */

test('los avisos nuevos se clasifican para su tratamiento visible', () => {
 assert.equal(clasificarAvisoIa('El RUC no está en el texto').tipo, 'no-esta');
 assert.equal(clasificarAvisoIa('El valor no aparece en el texto').tipo, 'no-esta');
 assert.equal(clasificarAvisoIa('Moneda extranjera: USD').tipo, 'moneda');
 assert.equal(clasificarAvisoIa('Fecha resuelta: «mañana» → 02-10-2026').tipo, 'fecha');
 assert.equal(clasificarAvisoIa('«a crédito 30 días»: se toma como plazo, no como cobro').tipo, 'plazo');
 assert.equal(clasificarAvisoIa('Ya existe un registro parecido').tipo, 'duplicado');
 assert.equal(clasificarAvisoIa('Nota suelta del motor').tipo, 'otro');
 assert.equal(clasificarAvisoIa('Dato inventado por el modelo').etiqueta, 'No está en el texto');
 assert.equal(monedaExtranjeraIa('usd'), true);
 assert.equal(monedaExtranjeraIa('PYG'), false);
 assert.equal(monedaExtranjeraIa(null), false);
 assert.equal(monedaExtranjeraIa(''), false);
});

/* ------------------------------------------------------------- UI del carrito */

test('carrito: agregar a mano, duplicar y quitar con contador por crear/vincular', () => {
 const dialog = file('app/ia-carga.tsx');
 for (const fn of ['agregarCliente', 'agregarEquipo', 'duplicarCliente', 'duplicarEquipo']) assert(dialog.includes(`function ${fn}(`), `el carrito permite ${fn}`);
 assert(dialog.includes('Agregar cliente') && dialog.includes('Agregar equipo'), 'cada sección ofrece agregar a mano');
 assert(dialog.includes("origen:'manual'") && dialog.includes("origen:'duplicado'"), 'las altas manuales y las copias se marcan con su origen');
 assert(dialog.includes('Agregado a mano') && dialog.includes('Duplicado'), 'la tarjeta dice de dónde salió cada registro');
 assert(dialog.includes("incluir?'Quitar':''") && dialog.includes("onIncluir(!incluir)"), 'quitar del carrito descarta la tarjeta');
 assert(dialog.includes('por crear') && dialog.includes('por vincular') && dialog.includes('descartado'), 'el contador del carrito dice crear/vincular/descartados');
 assert(dialog.includes('Duplicar ${titulo'), 'duplicar se anuncia con el nombre del registro');
});

test('preselección con % visible y decisiones siempre cambiables', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('Coincide\'} {confianza} %') || dialog.includes("{estado==='coincide'?'Coincide':'Ambiguo'} {confianza} %"), 'el chip muestra el porcentaje del match');
 assert(dialog.includes('Confianza del match: ${confianza} %'), 'el % tiene tooltip');
 assert(dialog.includes('Coincidencia alta (${confianza} %): preseleccionamos vincular; podés cambiarlo.'), '≥90 explica la preselección');
 assert(dialog.includes('Coincidencia media (${confianza} %): preseleccionamos el mejor candidato; revisá antes de vincular.'), '60–89 preselecciona el mejor y avisa');
 assert(dialog.includes('Sin coincidencia suficiente (${confianza} %): preseleccionamos crear un registro nuevo.'), '<60 preselecciona crear');
 assert(dialog.includes('aria-pressed={decision===\'vincular\'&&elegidoId===candidata.id}'), 'la decisión se puede cambiar (aria-pressed, sin bloqueo)');
 assert(dialog.includes('candidata.confianza') && dialog.includes('{candidata.confianza} %'), 'cada candidato muestra su %');
 assert(dialog.includes('· mejor'), 'el mejor candidato se marca');
});

test('imágenes de confirmación y vinculación sin escritura', () => {
 const dialog = file('app/ia-carga.tsx');
 const fotos = file('app/equipment-photo.tsx');
 assert(dialog.includes("import {FotoPerfil} from './foto-perfil'") && dialog.includes("import {EquipmentPhoto} from './equipment-photo'"), 'las imágenes salen de los objetos compartidos');
 assert(dialog.includes("variante=\"logo\"") && dialog.includes('foto={elegida?.fotoUrl??null}'), 'el logo del cliente (monograma de fallback) usa la foto del candidato elegido');
 assert(dialog.includes('icono="package"') && fotos.includes('Sin foto:'), 'el equipo usa foto o placeholder limpio');
 assert(dialog.includes('<FotoPerfil nombre={candidata.nombre} foto={candidata.fotoUrl??null} tamano="sm"'), 'los candidatos muestran su imagen');
 assert(dialog.includes('Vincular no modifica la ficha existente.'), 'la tarjeta lo declara');
 assert(!/api\(`?\/api\/agency\/clients\/\$\{/.test(dialog), 'vincular no escribe la ficha existente');
 const link=file('app/ia-carga-data.ts');
 assert(!/PATCH/.test(link) || !/clients\/\$\{/.test(link), 'el adaptador no hace PATCH de clientes: sólo crea');
});

test('moneda extranjera: no se convierte ni se registra a ciegas', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('monedaExtranjeraIa(equipo.moneda)'), 'la tarjeta detecta la moneda extranjera');
 assert(dialog.includes('no la convertimos. Ingresá el valor en'), 'el aviso pide el valor en la moneda de la empresa');
 assert(dialog.includes('valor: extranjera || equipo.valor === null'), 'con moneda extranjera el valor arranca vacío (el detectado queda de referencia)');
 assert(dialog.includes('valorDetectado'), 'el valor detectado se conserva para mostrarlo en el aviso');
});
