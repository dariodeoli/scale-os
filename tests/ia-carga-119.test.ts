import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {IA_REGISTROS_MAX, normalizarIaAnalisis, normalizarIaAcciones, analizarIa, mensajeIaError, senalMatchLabel, IaApiError} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');

/* ------------------------------------------------ coincidencias (Fase 2 #119) */

test('el análisis conserva estado y coincidencias cuando el motor los manda', () => {
  const analisis = normalizarIaAnalisis({
    clientes: [
      {
        nombre: 'Constructora Ñandú S.A.',
        empresa: null,
        ruc: '80012345-6',
        telefono: null,
        correo: null,
        avisos: [],
        estado: 'coincide',
        coincidencias: [
          {id: '7', nombre: 'Constructora Ñandú S.A.', senales: ['ruc_ci_exacto', 42], activo: true},
          {id: '8', nombre: 'Otra', senales: null, activo: false},
          {nombre: 'Sin id', senales: ['correo']},
        ],
      },
      {nombre: 'Nuevo', avisos: []},
    ],
    equipos: [{nombre: 'Trípode', estado: 'ambiguo', moneda: 'pyg', coincidencias: [{id: '3', nombre: 'Trípode Manfrotto', senales: ['nombre_parcial'], activo: true}]}],
    avisos: [],
  });
  assert.equal(analisis.clientes[0].estado, 'coincide');
  assert.deepEqual(analisis.clientes[0].coincidencias, [
    {id: '7', nombre: 'Constructora Ñandú S.A.', senales: ['ruc_ci_exacto'], activo: true},
    {id: '8', nombre: 'Otra', senales: [], activo: false},
  ]);
  assert.equal(analisis.clientes[1].estado, undefined, 'sin estado del motor no se inventa');
  assert.equal(analisis.clientes[1].coincidencias, undefined);
  assert.equal(analisis.inventario[0].estado, 'ambiguo');
  assert.equal(analisis.inventario[0].moneda, 'PYG');
  assert.equal(analisis.inventario[0].coincidencias?.[0].senales[0], 'nombre_parcial');
});

test('una respuesta vieja sin estado/coincidencias mantiene la forma anterior (puente #117)', () => {
  const analisis = normalizarIaAnalisis({clientes: [{nombre: 'Ana', avisos: []}], inventario: [{nombre: 'Cámara', valor: 100, avisos: []}]});
  assert.deepEqual(analisis.clientes[0], {nombre: 'Ana', empresa: null, ruc: null, telefono: null, correo: null, avisos: []});
  assert.deepEqual(analisis.inventario[0], {nombre: 'Cámara', categoria: null, cantidad: null, valor: 100, avisos: []});
  assert.deepEqual(normalizarIaAnalisis({}), {clientes: [], inventario: [], avisos: []});
});

/* ---------------------------------------------------- acciones (Fase 2 #119) */

test('las acciones propuestas se normalizan solo si son confirmables', () => {
  const acciones = normalizarIaAcciones([
    {
      tipo: 'registrar_cobro',
      cliente: {nombre: 'Juan Pérez', id: '12', candidatos: [{id: '12', nombre: 'Juan Pérez', senales: ['telefono'], activo: true}]},
      monto: '1.500.000',
      moneda: 'PYG',
      fecha: '2026-09-30',
      detalle: 'Seña',
      avisos: ['Revisá la fecha', 42],
      estado: 'coincide',
    },
    {tipo: 'otra_cosa', cliente: {nombre: 'Ana'}, monto: 100},
    {tipo: 'registrar_cobro', cliente: {nombre: ''}, monto: 100},
    {tipo: 'registrar_cobro', cliente: {nombre: 'Sin monto'}},
    {tipo: 'registrar_cobro', cliente: {nombre: 'Negativo'}, monto: -10},
  ]);
  assert.equal(acciones.length, 1);
  assert.deepEqual(acciones[0], {
    tipo: 'registrar_cobro',
    cliente: {nombre: 'Juan Pérez', id: '12', candidatos: [{id: '12', nombre: 'Juan Pérez', senales: ['telefono'], activo: true}]},
    monto: 1500000,
    moneda: 'PYG',
    fecha: '2026-09-30',
    detalle: 'Seña',
    avisos: ['Revisá la fecha'],
    estado: 'coincide',
  });
  assert.deepEqual(normalizarIaAcciones(undefined), [], 'sin acciones del motor no se inventa nada');
});

test('las acciones se recortan al tope del contrato', () => {
  const acciones = normalizarIaAcciones(Array.from({length: IA_REGISTROS_MAX + 4}, (_, indice) => ({tipo: 'registrar_cobro', cliente: {nombre: `Cliente ${indice}`}, monto: 1000})));
  assert.equal(acciones.length, IA_REGISTROS_MAX);
});

test('analizarIa devuelve registros y acciones del mismo POST', async () => {
  const llamadas: Array<{url: string; body: unknown}> = [];
  (globalThis as {fetch: unknown}).fetch = async (url: string, init: {body?: string} = {}) => {
    llamadas.push({url, body: init.body ? JSON.parse(init.body) : null});
    return new Response(
      JSON.stringify({
        registros: {clientes: [{nombre: 'Ana', estado: 'coincide', coincidencias: [{id: '3', nombre: 'Ana', senales: ['correo'], activo: true}], avisos: []}], equipos: [], avisos: []},
        acciones: [{tipo: 'registrar_cobro', cliente: {nombre: 'Ana', id: '3', candidatos: []}, monto: 250000, moneda: 'PYG', fecha: null, detalle: null, avisos: [], estado: 'coincide'}],
      }),
      {status: 200, headers: {'Content-Type': 'application/json'}},
    );
  };
  const resultado = await analizarIa('Ana pagó 250.000');
  assert.equal(llamadas[0].url, '/core-api/api/ia/carga');
  assert.deepEqual(llamadas[0].body, {texto: 'Ana pagó 250.000'});
  assert.equal(resultado.clientes[0].estado, 'coincide');
  assert.equal(resultado.acciones[0].cliente.id, '3');
  assert.equal(resultado.acciones[0].monto, 250000);
  assert.equal(resultado.acciones[0].tipo, 'registrar_cobro');
});

test('el contrato declara los tipos de la Fase 2', () => {
  const data = file('app/ia-carga-data.ts');
  for (const tipo of ['EstadoMatch', 'CoincidenciaIA', 'AccionIA', 'IaResultado', 'AccionCobroIA', 'AccionVencimientoIA']) assert(data.includes(`export type ${tipo}`), `el contrato exporta ${tipo}`);
  for (const estado of ["'nuevo'", "'coincide'", "'ambiguo'"]) assert(data.includes(estado), `el estado ${estado} existe`);
  assert(data.includes("'registrar_cobro'"), 'registrar_cobro es la acción mínima');
  assert(data.includes("'registrar_vencimiento'"), 'el vencimiento por crédito está en el contrato');
  assert(data.includes('candidatos'), 'las acciones llevan candidatos cuando el cliente es ambiguo');
});

/* ------------------------------------------- estándar portable (#131) */

test('el análisis conserva confianza, no_en_texto y moneda extranjera', () => {
  const analisis = normalizarIaAnalisis({
    clientes: [{
      nombre: 'Jhon Perez',
      avisos: [],
      estado: 'ambiguo',
      no_en_texto: ['correo', 7, ''],
      coincidencias: [{id: '3', nombre: 'Juan Pérez', senales: ['nombre_parecido'], confianza: 72, activo: true}, {id: '4', nombre: 'Otro', senales: ['nombre_normalizado'], confianza: 140}],
    }],
    equipos: [{nombre: 'Cámara rara', valor: null, moneda: null, moneda_extranjera: 'EUR', no_en_texto: ['valor'], avisos: ['Moneda extranjera (EUR): cargala a mano.']}],
    avisos: [],
  });
  const candidatos = analisis.clientes[0].coincidencias ?? [];
  assert.equal(candidatos.find((c) => c.id === '3')?.confianza, 72);
  assert.equal(candidatos.find((c) => c.id === '4')?.confianza, undefined, 'fuera de 0–100 no se inventa puntaje (no habilita vincular)');
  assert.equal(candidatos[0]?.id, '3', 'el mejor candidato con puntaje válido va primero');
  assert.deepEqual(analisis.clientes[0].no_en_texto, ['correo']);
  assert.equal(analisis.inventario[0].moneda_extranjera, 'EUR');
  assert.deepEqual(analisis.inventario[0].no_en_texto, ['valor']);
});

test('las acciones del estándar conservan moneda, motivo y vencimiento', () => {
  const acciones = normalizarIaAcciones([
    {tipo: 'registrar_cobro', cliente: {nombre: 'Ana', id: '3', candidatos: []}, monto: '500.000', moneda: 'USD', fecha: '2026-09-30', fecha_motivo: 'explícita', detalle: null, avisos: [], no_en_texto: ['monto']},
    {tipo: 'registrar_vencimiento', cliente: {nombre: 'Ana', id: '3', candidatos: []}, monto: 1500000, moneda: 'PYG', plazo_dias: 30, vencimiento: '2026-10-31', detalle: 'Crédito', avisos: ['Vencimiento: a 30 días.'], no_en_texto: []},
    {tipo: 'otro', cliente: {nombre: 'X'}, monto: 1},
  ]);
  assert.equal(acciones.length, 2, 'solo los tipos del contrato');
  assert.equal(acciones[0].tipo, 'registrar_cobro');
  assert.equal(acciones[0].moneda, 'USD', 'USD no se pisa con PYG');
  assert.deepEqual(acciones[0].no_en_texto, ['monto']);
  assert.equal(acciones[0].fecha_motivo, 'explícita');
  assert.equal(acciones[1].tipo, 'registrar_vencimiento');
  if (acciones[1].tipo === 'registrar_vencimiento') {
    assert.equal(acciones[1].plazo_dias, 30);
    assert.equal(acciones[1].vencimiento, '2026-10-31');
    assert.equal(acciones[1].monto, 1500000);
    assert.deepEqual(acciones[1].avisos, ['Vencimiento: a 30 días.']);
  }
  assert.match(senalMatchLabel('nombre_parecido'), /parecido/);
  assert.match(senalMatchLabel('nombre_parcial'), /parcial/);
});

test('sin sesión rota igual que el motor: los errores del análisis se conservan', async () => {
  (globalThis as {fetch: unknown}).fetch = async () => new Response(JSON.stringify({error: 'No autenticado', code: 'ia_no_configurada'}), {status: 503, headers: {'Content-Type': 'application/json'}});
  await assert.rejects(() => analizarIa('texto'), (error: unknown) => error instanceof IaApiError && error.status === 503);
});

/* ------------------------------------------- resiliencia del motor (#127) */

test('los errores de resiliencia del motor se explican en es-PY', () => {
  assert.match(mensajeIaError(new IaApiError('proveedor', 502, 'ia_truncado')), /dos partes/, 'el truncado propone dividir el texto');
  assert.match(mensajeIaError(new IaApiError('proveedor', 502, 'ia_vacio')), /ilegible/, 'la salida vacía se explica sin jerga');
  assert.match(mensajeIaError(new IaApiError('proveedor', 502, 'ia_json')), /ilegible/);
  assert.match(mensajeIaError(new IaApiError('proveedor', 502)), /proveedor de IA/, 'un 502 sin código se explica como proveedor (fuente única del adaptador, #128)');
});
