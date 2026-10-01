import assert from 'node:assert/strict';
import {test} from 'node:test';
// Los módulos de datos importan operations (api/money); el env de test no tiene DOM ni CSS.
require.extensions['.css'] = () => {};
const {IA_COBRO_DETALLE_MAX, IA_COBRO_PARTES_MAX, cuentaSugeridaIa, cuentasCobroIa, detalleCuentaIa, metodoCuentaIa, validarCobroIa, validarPartesIa, normalizarAccionCobro, buscarCobrosDuplicados, cargarCuentasCobro, registrarCobroDesdeIa} = require('../app/ia-cobro-data') as typeof import('../app/ia-cobro-data');

type Llamada = {url: string; method: string; body: unknown};
const respuesta = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {'Content-Type': 'application/json'}});

function mockFetch(handler: (call: Llamada) => Response) {
 const calls: Llamada[] = [];
 const original = globalThis.fetch;
 globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const call = {url: String(input), method: (init.method || 'GET').toUpperCase(), body: init.body ? JSON.parse(String(init.body)) : undefined};
  calls.push(call);
  return handler(call);
 }) as typeof fetch;
 return {calls, restore: () => { globalThis.fetch = original; }};
}

const cobro = {clienteId: '7', monto: 500000, fecha: '2026-09-30', detalle: 'Transferencia'};
const pagoFila = (overrides: Record<string, unknown> = {}) => ({id: '91', invoice_id: '5', invoice_number: 'F-005', client_id: '7', amount: '500000', received_on: '2026-09-30', reference: 'Transferencia', reversal_id: null, ...overrides});

test('normaliza la acción del motor: id o candidatos, monto entero y fecha visible', () => {
 assert.deepEqual(normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {id: '7'}, monto: 500000, fecha: '2026-09-30', detalle: 'Transferencia'}), {cobro, avisos: []});
 assert.deepEqual(normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {id: 7}, monto: '500000', fecha: '2026-09-30'}).cobro, {clienteId: '7', monto: 500000, fecha: '2026-09-30', detalle: ''}, 'id numérico y monto en texto se aceptan');
 const candidatos = normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {candidatos: [{id: '1'}, {id: '2'}]}, monto: 500000});
 assert.equal(candidatos.cobro, null); assert(candidatos.avisos.some(aviso => aviso.includes('Elegí a qué cliente')));
 assert.equal(normalizarAccionCobro({tipo: 'crear_cliente', cliente: {id: '7'}, monto: 1}).cobro, null, 'otra acción no se ejecuta como cobro');
 const sinMonto = normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {id: '7'}, monto: '500.000'});
 assert.equal(sinMonto.cobro, null); assert(sinMonto.avisos.some(aviso => aviso.includes('entero en guaraníes')), 'un monto con separadores no se interpreta a ciegas');
 const sinFecha = normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {id: '7'}, monto: 1000});
 assert(sinFecha.cobro); assert.match(sinFecha.cobro!.fecha, /^\d{4}-\d{2}-\d{2}$/, 'sin fecha se usa hoy en hora de Asunción');
 assert(sinFecha.avisos.some(aviso => aviso.includes('fecha de hoy')), 'la fecha por defecto se avisa, no se esconde');
 const largo = normalizarAccionCobro({tipo: 'registrar_cobro', cliente: {id: '7'}, monto: 1000, fecha: '2026-09-30', detalle: 'x'.repeat(140), avisos: ['Cliente con dos facturas']});
 assert.equal(largo.cobro!.detalle.length, IA_COBRO_DETALLE_MAX); assert(largo.avisos.some(aviso => aviso.includes('recortó')));
 assert(largo.avisos.includes('Cliente con dos facturas'), 'los avisos del motor se conservan');
});

test('validación del cobro: monto, fecha y cliente con rechazo claro', () => {
 const hoy = '2026-10-01';
 assert.equal(validarCobroIa(cobro, hoy), null);
 assert.match(validarCobroIa({...cobro, clienteId: ''}, hoy)!, /Elegí el cliente/);
 for (const monto of [0, -1, 1.5, 1e12]) assert.match(validarCobroIa({...cobro, monto}, hoy)!, /entero en guaraníes/, `monto ${monto}`);
 assert.match(validarCobroIa({...cobro, fecha: '2026-02-30'}, hoy)!, /no parece válida/);
 assert.match(validarCobroIa({...cobro, fecha: '1999-12-31'}, hoy)!, /no parece válida/);
 assert.match(validarCobroIa({...cobro, fecha: '2026-10-02'}, hoy)!, /no puede ser futura/);
 assert.match(validarCobroIa({...cobro, detalle: 'x'.repeat(121)}, hoy)!, /no puede superar 120/);
});

test('cuentas: solo activas de la moneda, con sugerencia visible cuando es única', async () => {
 const {calls, restore} = mockFetch(() => respuesta({accounts: [
  {id: '3', name: 'Caja', currency: 'PYG', active: true},
  {id: '4', name: 'Banco', currency: 'PYG', active: true, institution: 'Banco Continental', account_number: '310056630007', holder_name: 'Agencia Horizonte'},
  {id: '5', name: 'Vieja', currency: 'PYG', active: false},
  {id: '6', name: 'Dólares', currency: 'USD', active: true},
 ]}));
 try {
  const cuentas = await cargarCuentasCobro();
  assert.deepEqual(cuentas, [{id: '4', name: 'Banco', currency: 'PYG', institution: 'Banco Continental', accountNumber: '310056630007', holderName: 'Agencia Horizonte'}, {id: '3', name: 'Caja', currency: 'PYG', institution: null, accountNumber: null, holderName: null}, {id: '6', name: 'Dólares', currency: 'USD', institution: null, accountNumber: null, holderName: null}], 'descarta inactivas, ordena por moneda y nombre y conserva el método');
  assert.equal(calls[0].url, '/core-api/api/agency/accounts');
  assert.equal(cuentaSugeridaIa(cuentas), null, 'con dos cuentas en guaraníes hay que elegir');
  assert.equal(cuentaSugeridaIa(cuentas, 'USD'), '6', 'la única de la moneda se sugiere');
  assert.equal(cuentaSugeridaIa([], 'PYG'), null);
  assert.deepEqual(cuentasCobroIa(cuentas).map(cuenta => cuenta.id), ['4', '3']);
  assert.equal(metodoCuentaIa(cuentas[0]), 'Banco Continental · 310056630007', 'el método muestra banco y número, nunca un selector vacío');
  assert.equal(metodoCuentaIa(cuentas[1]), 'Caja', 'sin número se usa el nombre de la cuenta');
  assert.match(detalleCuentaIa(cuentas[0]), /Institución: Banco Continental · Nº o alias: 310056630007 · Titular: Agencia Horizonte/);
  assert.equal(detalleCuentaIa(cuentas[1]), '');
 } finally { restore(); }
});

test('división en partes: dos o más cuentas reales y suma exacta del monto', () => {
 const partes = [{accountId: '3', amount: 200000}, {accountId: '4', amount: 300000}];
 assert.equal(validarPartesIa(partes, 500000), null, 'la suma exacta es válida');
 assert.match(validarPartesIa([{accountId: '3', amount: 500000}], 500000)!, /al menos 2 partes/);
 assert.match(validarPartesIa(partes, 500001)!, /suma de las partes .* debe coincidir/);
 assert.match(validarPartesIa([{accountId: '3', amount: 0}, {accountId: '4', amount: 500000}], 500000)!, /importe entero mayor a cero/);
 assert.match(validarPartesIa([{accountId: '', amount: 200000}, {accountId: '4', amount: 300000}], 500000)!, /cuenta de cada parte/);
 const muchas = Array.from({length: IA_COBRO_PARTES_MAX + 1}, (_, index) => ({accountId: String(index + 1), amount: 1}));
 assert.match(validarPartesIa(muchas, muchas.length)!, /hasta 5 partes/);
});

test('división: el POST viaja con parts y la respuesta conserva el estado parcial', async () => {
 const {calls, restore} = mockFetch(call => call.method === 'GET'
  ? respuesta({payments: []})
  : respuesta({payments: [{...pagoFila(), id: '95', account_id: '3', amount: '200000'}, {...pagoFila(), id: '96', account_id: '4', amount: '300000'}], total: 500000, parcial: true, pending: 250000}, 201));
 try {
  const resultado = await registrarCobroDesdeIa({cobro, partes: [{accountId: '3', amount: 200000}, {accountId: '4', amount: 300000}], requestId: 'dddddddd-dddd-4ddd-dddd-dddddddddddd'});
  assert.deepEqual(resultado, {estado: 'registrado', total: 500000, yaRegistrado: false, parcial: true, pending: 250000, pagos: [
   {id: '95', invoiceId: '5', invoiceNumber: 'F-005', amount: 200000, receivedOn: '2026-09-30', reference: 'Transferencia', accountId: '3'},
   {id: '96', invoiceId: '5', invoiceNumber: 'F-005', amount: 300000, receivedOn: '2026-09-30', reference: 'Transferencia', accountId: '4'},
  ]});
  const post = calls.find(call => call.method === 'POST');
  assert.deepEqual(post?.body, {clientId: '7', parts: [{accountId: '3', amount: 200000}, {accountId: '4', amount: 300000}], amount: 500000, receivedOn: '2026-09-30', reference: 'Transferencia', requestId: 'dddddddd-dddd-4ddd-dddd-dddddddddddd'}, 'la división viaja en parts y sin accountId suelto');
  assert.equal('accountId' in (post?.body as Record<string, unknown>), false);
 } finally { restore(); }
});

test('división inválida: no toca la red y explica el problema', async () => {
 const {calls, restore} = mockFetch(() => respuesta({payments: []}));
 try {
  await assert.rejects(registrarCobroDesdeIa({cobro, partes: [{accountId: '3', amount: 100000}, {accountId: '4', amount: 100000}]}), /suma de las partes/);
  await assert.rejects(registrarCobroDesdeIa({cobro, partes: []}), /Elegí la cuenta/);
  assert.equal(calls.length, 0, 'una división inválida no toca la red');
 } finally { restore(); }
});

test('duplicado: no registra sin decisión explícita', async () => {
 const {calls, restore} = mockFetch(call => call.method === 'GET'
  ? respuesta({payments: [pagoFila()], hasMore: false})
  : respuesta({payments: [{...pagoFila(), id: '92'}], total: 500000}, 201));
 try {
  const resultado = await registrarCobroDesdeIa({cobro, accountId: '3', requestId: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'});
  assert.equal(resultado.estado, 'duplicado');
  if (resultado.estado === 'duplicado') assert.deepEqual(resultado.duplicados.map(pago => pago.id), ['91'], 'informa el cobro que ya estaba');
  assert.equal(calls.filter(call => call.method === 'POST').length, 0, 'sin decisión no hay POST');
  const forzado = await registrarCobroDesdeIa({cobro, accountId: '3', permitirDuplicado: true, requestId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'});
  assert.equal(forzado.estado, 'registrado');
  const post = calls.find(call => call.method === 'POST');
  assert.deepEqual(post?.body, {clientId: '7', accountId: '3', amount: 500000, receivedOn: '2026-09-30', reference: 'Transferencia', requestId: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb'}, 'el POST viaja con la llave de idempotencia');
 } finally { restore(); }
});

test('duplicado: reversiones y cobros de otro cliente o monto no cuentan', async () => {
 const {calls, restore} = mockFetch(call => call.method === 'GET'
  ? respuesta({payments: [
   pagoFila({id: '1', reversal_id: '4'}),
   pagoFila({id: '2', client_id: '8'}),
   pagoFila({id: '3', amount: '499999'}),
   pagoFila({id: '4', received_on: '2026-09-29'}),
  ]})
  : respuesta({payments: [pagoFila({id: '5'})], total: 500000}, 201));
 try {
  const resultado = await registrarCobroDesdeIa({cobro, accountId: '3'});
  assert.equal(resultado.estado, 'registrado');
  assert.equal(calls.filter(call => call.method === 'POST').length, 1, 'sin coincidencia real registra directo');
  if (resultado.estado === 'registrado') assert.deepEqual(resultado, {estado: 'registrado', total: 500000, yaRegistrado: false, parcial: false, pending: 0, pagos: [{id: '5', invoiceId: '5', invoiceNumber: 'F-005', amount: 500000, receivedOn: '2026-09-30', reference: 'Transferencia', accountId: null}]});
 } finally { restore(); }
});

test('camino feliz: dos facturas aplicadas, total honesto y reintento idempotente', async () => {
 const lote = [{...pagoFila(), id: '93', invoice_id: '5', amount: '300000'}, {...pagoFila(), id: '94', invoice_id: '6', invoice_number: 'F-006', amount: '200000'}];
 const {calls, restore} = mockFetch(call => call.method === 'GET'
  ? respuesta({payments: []})
  : respuesta({payments: lote, total: 500000, appliedTo: [{invoiceId: '5', amount: 300000}, {invoiceId: '6', amount: 200000}]}, 201));
 try {
  const resultado = await registrarCobroDesdeIa({cobro, accountId: '3', receivedByUserId: '9', requestId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc'});
  assert.deepEqual(resultado, {estado: 'registrado', total: 500000, yaRegistrado: false, parcial: false, pending: 0, pagos: [
   {id: '93', invoiceId: '5', invoiceNumber: 'F-005', amount: 300000, receivedOn: '2026-09-30', reference: 'Transferencia', accountId: null},
   {id: '94', invoiceId: '6', invoiceNumber: 'F-006', amount: 200000, receivedOn: '2026-09-30', reference: 'Transferencia', accountId: null},
  ]});
  assert.deepEqual(calls.find(call => call.method === 'POST')?.body, {clientId: '7', accountId: '3', amount: 500000, receivedOn: '2026-09-30', reference: 'Transferencia', receivedByUserId: '9', requestId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc'});
 } finally { restore(); }
});

test('rechazos sin efectos: acción inválida, cuenta faltante y 403 del servidor', async () => {
 const {calls, restore} = mockFetch(() => respuesta({payments: []}));
 try {
  await assert.rejects(registrarCobroDesdeIa({cobro: {...cobro, monto: 0}, accountId: '3'}), /entero en guaraníes/);
  await assert.rejects(registrarCobroDesdeIa({cobro, accountId: ''}), /Elegí la cuenta/);
  assert.equal(calls.length, 0, 'una acción inválida no toca la red');
 } finally { restore(); }
 const denied = mockFetch(call => call.method === 'GET' ? respuesta({payments: []}) : respuesta({error: 'Tu rol no permite operar este recurso financiero'}, 403));
 try {
  await assert.rejects(registrarCobroDesdeIa({cobro, accountId: '3'}), /Tu rol no permite operar este recurso financiero/);
 } finally { denied.restore(); }
});

test('la duplicación se busca sobre el cliente real que devuelve el API', async () => {
 const {restore} = mockFetch(() => respuesta({payments: [pagoFila({client_id: '7', client_name: 'Cliente'})]}));
 try {
  const encontrados = await buscarCobrosDuplicados(cobro);
  assert.deepEqual(encontrados.map(pago => pago.id), ['91']);
  assert.deepEqual(await buscarCobrosDuplicados({...cobro, clienteId: '8'}), []);
 } finally { restore(); }
});
