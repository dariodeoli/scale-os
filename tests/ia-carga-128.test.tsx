import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {IA_TEXTO_MAX, IaApiError, clasificarIaFallo, mensajeIaError, montoDudosoIa, analizarIa} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');
const {money} = require('../app/money-format') as typeof import('../app/money-format');

/* ------------------------------------------- estados de error (#127/#128) */

test('cada fallo del motor se clasifica distinto y accionable', () => {
 assert.equal(clasificarIaFallo(new IaApiError('sin clave', 503, 'ia_no_configurada')).tipo, 'no-configurada');
 assert.equal(clasificarIaFallo(new IaApiError('el modelo truncó', 400, 'ia_texto_largo')).tipo, 'texto-largo');
 assert.match(clasificarIaFallo(new IaApiError('el modelo truncó', 400, 'ia_texto_largo')).mensaje, /dos partes/, 'el texto largo sugiere partirlo');
 assert.equal(clasificarIaFallo(new IaApiError('finish_reason length', 500, 'ia_proveedor')).tipo, 'texto-largo', 'un truncado se reconoce aunque el código no sea exacto');
 const limite = clasificarIaFallo(new IaApiError('cuota', 429, 'ia_limite', 7));
 assert.equal(limite.tipo, 'limite');
 assert.equal(limite.esperaMinutos, 7);
 assert.match(limite.mensaje, /7 minutos/, 'el límite informa la espera real');
 assert.match(clasificarIaFallo(new IaApiError('cuota', 429, 'ia_limite')).mensaje, /unos minutos/, 'sin dato de espera no se inventa el número');
 assert.equal(clasificarIaFallo(new IaApiError('ocupado', 502, 'ia_proveedor_ocupado')).tipo, 'proveedor');
 assert.match(clasificarIaFallo(new IaApiError('ocupado', 502, 'ia_proveedor_ocupado')).mensaje, /Reintentá/, 'el proveedor ocupado se reintenta');
 assert.equal(clasificarIaFallo(new IaApiError('sesión', 401)).tipo, 'sesion');
 assert.equal(clasificarIaFallo(new IaApiError('rol', 403)).tipo, 'permiso');
 assert.equal(clasificarIaFallo(new IaApiError('', 0)).tipo, 'proveedor', 'sin conexión también es reintentable');
 assert.equal(clasificarIaFallo(new Error('boom')).tipo, 'desconocido');
 assert.equal(mensajeIaError(new IaApiError('x', 429, 'ia_limite', 3)), clasificarIaFallo(new IaApiError('x', 429, 'ia_limite', 3)).mensaje);
});

test('el POST del análisis demuestra la clasificación con el motor mockeado', async () => {
 const responder = (status: number, payload: unknown) => {
  (globalThis as {fetch: unknown}).fetch = async () => new Response(JSON.stringify(payload), {status, headers: {'Content-Type': 'application/json'}});
 };
 responder(400, {error: 'El texto era demasiado largo', code: 'ia_texto_largo'});
 await assert.rejects(() => analizarIa('texto'), (error: unknown) => clasificarIaFallo(error).tipo === 'texto-largo');
 responder(429, {error: 'Límite alcanzado', code: 'ia_limite', retry_after: 540});
 await assert.rejects(() => analizarIa('texto'), (error: unknown) => {
  const fallo = clasificarIaFallo(error);
  return fallo.tipo === 'limite' && fallo.esperaMinutos === 9;
 });
 responder(502, {error: 'Proveedor caído', code: 'ia_proveedor_ocupado'});
 await assert.rejects(() => analizarIa('texto'), (error: unknown) => clasificarIaFallo(error).tipo === 'proveedor');
 responder(503, {error: 'Sin configurar', code: 'ia_no_configurada'});
 await assert.rejects(() => analizarIa('texto'), (error: unknown) => clasificarIaFallo(error).tipo === 'no-configurada');
});

/* ------------------------------------------------- montos (#128, auditoría) */

test('el monto interpretado se avisa cuando parece de otra escala', () => {
 assert.equal(montoDudosoIa(500), true, '«500» en guaraníes suele ser 500.000');
 assert.equal(montoDudosoIa(9999), true);
 assert.equal(montoDudosoIa(10_000), false);
 assert.equal(montoDudosoIa(500_000), false);
 assert.equal(montoDudosoIa(null), false);
 assert.equal(montoDudosoIa(0), false);
 assert.equal(montoDudosoIa(-5), false);
 assert.equal(montoDudosoIa(500, 'USD'), false, 'la heurística es de guaraníes');
 const sinNbsp = (valor: string) => valor.replace(/\u00a0/g, ' ');
 assert.equal(sinNbsp(money(500, 'PYG')), 'Gs. 500', 'el formateador canónico dibuja el símbolo');
 assert.equal(sinNbsp(money(500_000, 'PYG')), 'Gs. 500.000');
});

/* ------------------------------------------------------------- UI (#128) */

test('diálogo: errores con tratamiento propio, contador cerca del límite y foco', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('clasificarIaFallo(cause)') && dialog.includes('setFallo('), 'el análisis guarda el fallo clasificado');
 assert(dialog.includes('data-fallo={fallo.tipo}'), 'el bloque de error expone su estado');
 for (const accion of ['Probá en dos partes', 'Esperá', 'Reintentá en unos segundos', 'clave del proveedor']) assert(dialog.includes(accion), `acción del estado: ${accion}`);
 assert(dialog.includes("const cercaDelLimite=texto.length>IA_TEXTO_MAX*0.8"), 'el aviso del contador se enciende al 80 %');
 assert(dialog.includes('data-cerca={cercaDelLimite||undefined}') && dialog.includes('Estás cerca del límite'), 'el contador avisa cerca del tope');
 assert(dialog.includes('ref={revisionRef}') && dialog.includes('ref={resultadoRef}') && dialog.includes('tabIndex={-1}'), 'la revisión y el resultado reciben el foco');
 assert(dialog.includes('role="status">Detectamos'), 'el resumen se anuncia al cambiar de fase');
 assert(dialog.includes('min-h-44') && dialog.includes('sm:grid-cols-2'), 'textarea y campos conservan el layout mobile/768');
});

test('confirmación de cobro: monto en grande con cliente, fecha y advertencia', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('Monto interpretado'), 'el monto interpretado tiene su bloque');
 assert(dialog.includes('<MoneyText valor={valido?monto:null} currency={moneda} className="text-xl leading-tight text-fore"/>'), 'el monto se ve en grande con el formateador canónico');
 assert(dialog.includes('listDateShort(fila.fecha)') && dialog.includes("fila.accion.cliente.nombre||'Sin cliente identificado'"), 'cliente y fecha acompañan la confirmación');
 assert(dialog.includes('montoDudosoIa(monto,moneda)') && dialog.includes('¿{money(monto,moneda)} o {money(monto*1000,moneda)}?'), 'el monto raro se pregunta, no se corrige solo');
 assert(dialog.includes('data-monto={valido?monto:undefined}'), 'el bloque expone el monto interpretado');
});
