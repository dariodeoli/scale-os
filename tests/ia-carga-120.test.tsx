import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {IA_COINCIDENCIAS_MAX, IA_ACCION_PATH, IA_ACCION_EJECUCION_ISSUE, normalizarIaAnalisis, senalMatchLabel, ejecutarAccionIa} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');

/* ------------------------------------------------- contrato de coincidencias */

test('coincidencias: estado por registro, señales visibles y tope de candidatos', () => {
 const analisis = normalizarIaAnalisis({
  clientes: [
   {nombre: 'Constructora Sur', ruc: '80012345-6', estado: 'coincide', coincidencias: [{id: 7, nombre: 'Constructora Sur S.A.', senales: ['ruc_ci_exacto', 'nombre_normalizado']}]},
   {nombre: 'Juan Pérez', estado: 'ambiguo', coincidencias: Array.from({length: 8}, (_, i) => ({id: i + 1, nombre: `Juan Pérez ${i + 1}`, senales: ['nombre_normalizado']}))},
   {nombre: 'Ana Díaz', estado: 'cualquier-cosa', coincidencias: [{nombre: 'sin id'}, null]},
  ],
  equipos: [{nombre: 'Trípode', estado: 'ambiguo', coincidencias: [{id: 3, nombre: 'Trípode Manfrotto', senales: ['nombre_normalizado']}]}],
 });
 assert.equal(analisis.clientes[0].estado, 'coincide');
 assert.deepEqual(analisis.clientes[0].coincidencias[0], {id: '7', nombre: 'Constructora Sur S.A.', senales: ['ruc_ci_exacto', 'nombre_normalizado']}, 'los ids viajan como texto y las señales se conservan');
 assert.equal(analisis.clientes[1].coincidencias.length, IA_COINCIDENCIAS_MAX, 'se muestran hasta 5 candidatos');
 assert.equal(analisis.clientes[2].estado, 'nuevo', 'un estado desconocido no habilita coincidencias');
 assert.deepEqual(analisis.clientes[2].coincidencias, [], 'una coincidencia sin id/nombre se descarta');
 assert.equal(analisis.inventario[0].estado, 'ambiguo');
 assert.equal(senalMatchLabel('ruc_ci_exacto'), 'RUC/CI coincide');
 assert.equal(senalMatchLabel('correo'), 'mismo correo');
 assert.equal(senalMatchLabel('senal_nueva'), 'senal nueva', 'una señal nueva se muestra cruda, no se esconde');
});

/* ----------------------------------------------------------- acciones #119 */

test('acciones: se normalizan las de cobro y se informa lo no soportado', () => {
 const analisis = normalizarIaAnalisis({
  acciones: [
   {tipo: 'registrar_cobro', cliente: {id: 12, nombre: 'Constructora Sur', estado: 'coincide', coincidencias: [{id: 12, nombre: 'Constructora Sur', senales: ['ruc_ci_exacto']}]}, monto: 2500000.4, moneda: 'PYG', fecha: '2026-09-28', detalle: 'Saldo del mes'},
   {tipo: 'registrar_cobro', cliente: {estado: 'ambiguo', coincidencias: [{id: 5, nombre: 'Sur Films', senales: []}]}, monto: null, avisos: ['Falta el monto']},
   {tipo: 'enviar_presupuesto', cliente: {id: 1}},
  ],
 });
 assert.equal(analisis.acciones.length, 2, 'sólo se aceptan acciones soportadas');
 assert.deepEqual(analisis.acciones[0], {tipo: 'registrar_cobro', cliente: {id: '12', nombre: 'Constructora Sur', estado: 'coincide', coincidencias: [{id: '12', nombre: 'Constructora Sur', senales: ['ruc_ci_exacto']}]}, monto: 2500000, moneda: 'PYG', fecha: '2026-09-28', detalle: 'Saldo del mes', avisos: []});
 assert.equal(analisis.acciones[1].cliente.id, null, 'sin id el cliente queda sin resolver y la UI pide elegir');
 assert.equal(analisis.acciones[1].monto, null, 'un monto ausente no se inventa');
 assert(analisis.avisos.some((aviso: string) => aviso.includes('1 acción(es) de un tipo')), 'la acción no soportada se informa');
});

/* --------------------------------------------------- ejecución confirmada */

test('ejecución: sólo con confirmación y con la respuesta real del servidor', async () => {
 const calls: Array<{url: string; method: string; body: Record<string, unknown>}> = [];
 const responder = (status: number, payload: unknown) => {
  (globalThis as {fetch: unknown}).fetch = async (url: string, init: {method?: string; body?: string} = {}) => {
   calls.push({url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : {}});
   return new Response(JSON.stringify(payload), {status, headers: {'Content-Type': 'application/json'}});
  };
 };

 responder(200, {resultado: {mensaje: 'Cobro registrado por Gs. 2.500.000.'}});
 const ok = await ejecutarAccionIa({clienteId: '12', monto: 2500000.4, moneda: 'PYG', fecha: '2026-09-28', detalle: null});
 assert.deepEqual(ok, {estado: 'ejecutada', mensaje: 'Cobro registrado por Gs. 2.500.000.'});
 assert.equal(calls[0].url, `/core-api${IA_ACCION_PATH}`, 'la ejecución vive en su propio endpoint');
 assert.equal(calls[0].method, 'POST');
 assert.deepEqual(calls[0].body, {tipo: 'registrar_cobro', cliente_id: '12', monto: 2500000, moneda: 'PYG', fecha: '2026-09-28', detalle: null, confirmar_duplicado: false}, 'el monto viaja entero y sin confirmar duplicados por defecto');

 responder(409, {error: 'Ya registramos un cobro igual el mismo día.', code: 'cobro_duplicado'});
 const duplicado = await ejecutarAccionIa({clienteId: '12', monto: 2500000, moneda: 'PYG', fecha: '2026-09-28', detalle: null});
 assert.equal(duplicado.estado, 'duplicado', 'el duplicado pide una segunda decisión, no se registra');
 assert.match(duplicado.mensaje, /cobro igual/);
 const insistir = await ejecutarAccionIa({clienteId: '12', monto: 2500000, moneda: 'PYG', fecha: '2026-09-28', detalle: null, confirmarDuplicado: true});
 assert.equal(calls[2].body.confirmar_duplicado, true, 'la segunda confirmación viaja explícita');

 responder(404, {error: 'No encontrado'});
 const pendiente = await ejecutarAccionIa({clienteId: '12', monto: 2500000, moneda: 'PYG', fecha: null, detalle: null});
 assert.equal(pendiente.estado, 'pendiente', 'sin #121 el cobro no se simula');
 assert(pendiente.mensaje.includes(`#${IA_ACCION_EJECUCION_ISSUE}`), 'el pendiente cita la base de Finanzas');

 responder(403, {error: 'Tu rol no permite registrar cobros.'});
 const sinPermiso = await ejecutarAccionIa({clienteId: '12', monto: 2500000, moneda: 'PYG', fecha: null, detalle: null});
 assert.equal(sinPermiso.estado, 'error');
 assert.match(sinPermiso.mensaje, /Tu rol no permite/);
});

/* ------------------------------------------------------------------- UI #120 */

test('tarjetas: Nuevo / Coincide / Ambiguo con decisión explícita y Nada se duplica solo', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('>Nuevo</StateChip>') && dialog.includes('>Coincide</StateChip>') && dialog.includes('>Ambiguo</StateChip>'), 'cada tarjeta muestra su estado de match');
 assert(dialog.includes("if (estado === 'coincide' && coincidencias[0]) return {decision: 'vincular'"), 'una coincidencia fuerte propone vincular por defecto');
 assert(dialog.includes("if (estado === 'ambiguo') return {decision: 'pendiente'"), 'una ambigüedad exige decisión');
 assert(dialog.includes('Usar «'), 'la ficha existente se puede elegir como destino');
 assert(dialog.includes("Crear {tipo} nuevo"), 'crear un registro nuevo es una opción explícita');
 assert(dialog.includes('Nada se duplica sin tu decisión'), 'la tarjeta lo dice con todas las letras');
 assert(dialog.includes('pendientesDeDecision'), 'la creación bloquea las tarjetas sin decidir');
 assert(dialog.includes("fila.decision==='crear'"), 'sólo se crean las tarjetas con decisión de crear');
 assert(dialog.includes('fila.decision===\'vincular\''), 'vincular no crea nada');
 assert(dialog.includes('Vinculamos'), 'el resumen distingue vinculados');
 assert(dialog.includes("decision==='vincular'") && dialog.includes('Se usa la ficha existente'), 'la tarjeta vinculada lo declara');
});

test('acciones: confirmación de a una, sin cliente no se confirma y sin OK no se ejecuta', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('Confirmar acción'), 'cada acción propuesta tiene su botón de confirmación');
 assert(dialog.includes('disabled={!fila.clienteId}'), 'sin cliente resuelto no se puede confirmar');
 assert(dialog.includes('No pudimos vincular el cliente'), 'si no hay candidatos se pide elegir, no se ejecuta');
 assert(dialog.includes('Elegí el cliente existente antes de confirmar.'), 'la validación corta antes de llamar al servidor');
 assert(dialog.includes('Ingresá el monto del cobro (mayor a cero).'), 'un monto inválido no se ejecuta');
 assert(dialog.includes('confirmarAccion(fila.clave,true)') && dialog.includes('Registrar igual'), 'el duplicado pide una segunda decisión explícita');
 assert(dialog.includes('Registramos') && dialog.includes('sin confirmar: no se ejecutó nada de eso'), 'el resumen cuenta acciones ejecutadas y pendientes');
 const antesDeConfirmar = dialog.slice(0, dialog.indexOf('async function confirmarAccion'));
 assert(!antesDeConfirmar.includes('ejecutarAccionIa('), 'ningún camino ejecuta la acción antes de la confirmación');
});

test('la ejecución de acciones es de #121 y la UI no la simula', () => {
 const data = file('app/ia-carga-data.ts');
 const dialog = file('app/ia-carga.tsx');
 assert(data.includes('IA_ACCION_EJECUCION_ISSUE = 121'), 'el pendiente cita la base de Finanzas');
 assert(data.includes("estado: 'pendiente'") && data.includes('La ejecución de cobros todavía no está publicada'), 'un 404/501 se muestra como pendiente honesto');
 assert(!/estado: 'ejecutada'[^\n]*404/s.test(data), 'un 404 nunca devuelve una ejecución simulada');
 assert(dialog.includes('data-estado={fila.estado}'), 'la tarjeta expone su estado para pruebas y estilos');
 assert(!dialog.includes('localStorage') && !dialog.includes('sessionStorage'), 'ni el texto ni las decisiones se persisten');
 assert(!dialog.includes('searchParams') && !dialog.includes('document.title'), 'sin datos personales en URLs ni títulos');
});
