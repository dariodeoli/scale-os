import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {IA_TEXTO_MAX, IA_REGISTROS_MAX, normalizarIaConfig, normalizarIaAnalisis, mensajeIaError, IaApiError, cargarConfigIa, analizarIa} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');

/* ------------------------------------------------------------- contrato #117 */

test('límites del contrato: 20.000 caracteres y 25 registros por tipo', () => {
 assert.equal(IA_TEXTO_MAX, 20_000);
 assert.equal(IA_REGISTROS_MAX, 25);
 assert.match(file('app/ia-carga.tsx'), /maxLength=\{IA_TEXTO_MAX\}/, 'el textarea no supera el máximo del contrato');
 assert.match(file('app/ia-carga.tsx'), /texto\.length\.toLocaleString/, 'el contador muestra el largo real');
});

test('config: normaliza la respuesta y conserva sólo los tipos permitidos', () => {
 const config = normalizarIaConfig({configurada: true, modelo: 'openai/gpt-oss-120b', tipos: ['clientes', 'inventario', 'eventos', 7]});
 assert.deepEqual(config, {configurada: true, modelo: 'openai/gpt-oss-120b', tipos: ['clientes', 'inventario']});
 assert.deepEqual(normalizarIaConfig(null), {configurada: false, modelo: null, tipos: []});
 assert.equal(normalizarIaConfig({configurada: 'sí', tipos: null}).configurada, false, 'un valor no booleano no enciende la IA');
 // Puente con el motor de #117: el servidor publica «equipos» y la UI lo llama «inventario».
 assert.deepEqual(normalizarIaConfig({configurada: true, tipos: ['clientes', 'equipos']}).tipos, ['clientes', 'inventario'], 'los equipos del motor se mapean a inventario');
});

test('análisis: normaliza, recorta y conserva los avisos sin inventar datos', () => {
 const analisis = normalizarIaAnalisis({
  clientes: [{nombre: '  Juan   Pérez ', empresa: 'Constructora Sur', ruc: '80012345-6', telefono: null, correo: 'juan@sur.com.py', avisos: ['Sin RUC verificado', 42, '']}],
  inventario: [
   {nombre: 'Pantalla LED 3x2', categoria: 'iluminación', cantidad: 4, valor: 1500000.4, avisos: []},
   {nombre: 'Trípode', categoria: null, cantidad: null, valor: -5, avisos: ['Cantidad dudosa']},
  ],
  avisos: ['Se descartaron 2 registros repetidos', null],
 });
 assert.equal(analisis.clientes.length, 1);
 assert.deepEqual(analisis.clientes[0], {nombre: 'Juan Pérez', empresa: 'Constructora Sur', ruc: '80012345-6', telefono: null, correo: 'juan@sur.com.py', avisos: ['Sin RUC verificado']});
 assert.deepEqual(analisis.inventario[0], {nombre: 'Pantalla LED 3x2', categoria: 'iluminación', cantidad: 4, valor: 1500000, avisos: []});
 assert.deepEqual(analisis.inventario[1], {nombre: 'Trípode', categoria: null, cantidad: null, valor: null, avisos: ['Cantidad dudosa']}, 'un valor negativo no se convierte en un monto inventado');
 assert.deepEqual(analisis.avisos, ['Se descartaron 2 registros repetidos']);
 assert.deepEqual(normalizarIaAnalisis({}), {clientes: [], inventario: [], avisos: []}, 'una respuesta vacía no rompe la vista previa');
 // Puente con el motor de #117: la respuesta real llega con la clave «equipos».
 assert.deepEqual(normalizarIaAnalisis({equipos: [{nombre: 'Trípode', categoria: null, cantidad: null, valor: null, avisos: []}]}).inventario[0].nombre, 'Trípode', 'los equipos del servidor se leen como inventario');
});

test('análisis: recorta a 25 por tipo y lo dice en los avisos', () => {
 const fila = (indice: number) => ({nombre: `Cliente ${indice}`, avisos: []});
 const analisis = normalizarIaAnalisis({clientes: Array.from({length: 30}, (_, indice) => fila(indice)), inventario: [], avisos: []});
 assert.equal(analisis.clientes.length, IA_REGISTROS_MAX);
 assert(analisis.avisos.some((aviso: string) => aviso.includes('30 clientes')), 'el recorte se informa, no se esconde');
});

test('errores: cada fallo del motor tiene un mensaje claro en es-PY', () => {
 assert.match(mensajeIaError(new IaApiError('ia no configurada', 503, 'ia_no_configurada')), /no está configurada/);
 assert.match(mensajeIaError(new IaApiError('límite', 429)), /muchos análisis seguidos/);
 assert.match(mensajeIaError(new IaApiError('sin permiso', 403)), /Tu rol no permite/);
 assert.match(mensajeIaError(new IaApiError('sesión', 401)), /sesión venció/);
 assert.match(mensajeIaError(new IaApiError('proveedor', 502)), /proveedor de IA/);
 assert.match(mensajeIaError(new Error('texto demasiado largo')), /texto demasiado largo/);
});

test('API: GET y POST usan /core-api/api/ia/carga con el cuerpo {texto}', async () => {
 const calls: Array<{url: string; method: string; body: unknown}> = [];
 (globalThis as {fetch: unknown}).fetch = async (url: string, init: {method?: string; body?: string} = {}) => {
  calls.push({url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null});
  if ((init.method || 'GET') === 'GET') return new Response(JSON.stringify({configurada: true, modelo: 'modelo-x', tipos: ['clientes']}), {status: 200, headers: {'Content-Type': 'application/json'}});
  return new Response(JSON.stringify({registros: {clientes: [{nombre: 'Ana', avisos: []}], inventario: [], avisos: []}}), {status: 200, headers: {'Content-Type': 'application/json'}});
 };
 const config = await cargarConfigIa();
 assert.equal(calls[0].url, '/core-api/api/ia/carga');
 assert.equal(calls[0].method, 'GET');
 assert.equal(config.modelo, 'modelo-x');
 const analisis = await analizarIa('  Ana, 0981 111 222  ');
 assert.deepEqual(calls[1], {url: '/core-api/api/ia/carga', method: 'POST', body: {texto: 'Ana, 0981 111 222'}}, 'el texto se envía una sola vez y sin espacios de sobra');
 assert.equal(analisis.clientes[0].nombre, 'Ana');
});

test('API: sin el motor de #117 el error conserva el status para el puente honesto', async () => {
 (globalThis as {fetch: unknown}).fetch = async () => new Response(JSON.stringify({error: 'No encontrado'}), {status: 404, headers: {'Content-Type': 'application/json'}});
 await assert.rejects(() => cargarConfigIa(), (error: unknown) => error instanceof IaApiError && error.status === 404);
 (globalThis as {fetch: unknown}).fetch = async () => { throw new TypeError('fetch failed'); };
 await assert.rejects(() => analizarIa('texto'), (error: unknown) => error instanceof IaApiError && /Sin conexión/.test((error as Error).message));
 await assert.rejects(() => analizarIa('   '), (error: unknown) => error instanceof IaApiError && error.status === 400, 'sin texto no se llama al proveedor');
});

/* --------------------------------------------------------------- UI (#118) */

test('botón: vive en el topbar sólo para roles que pueden crear y abre el diálogo diferido', () => {
 const shell = file('app/scale-workspace.tsx');
 assert(shell.includes('IaCargaButton'), 'el shell monta el botón');
 assert(shell.includes("dynamic(()=>import('./ia-carga').then(m=>m.IaCargaDialog))"), 'el diálogo llega diferido recién al abrirlo');
 assert(shell.includes("const canIaCarga=(canManageClients||roleCan(user?.role,'inventory.manage'))&&!user?.demo_owner_user_id"), 'el asistente se ofrece sólo a quien puede crear y nunca en sesiones Demo');
 const topbar = shell.slice(shell.indexOf('topbar-utility-actions'), shell.indexOf('<NotificationBell'));
 assert(topbar.includes('<IaCargaButton'), 'el botón vive en la zona de utilidades del topbar');
 assert(shell.includes('<IaCargaDialog role={user.role'), 'el diálogo recibe el rol para los permisos');
 const button = file('app/ia-carga-button.tsx');
 assert(button.includes('aria-label="Carga con IA"') && button.includes('aria-haspopup="dialog"'), 'el botón es accesible y anuncia el diálogo');
 assert(button.includes('title="Carga con IA'), 'el tooltip explica qué hace');
});

test('diálogo: estados completos, sin key y con el motor pendiente sin romper', () => {
 const dialog = file('app/ia-carga.tsx');
 for (const estado of ["'pendiente'", "'no-configurada'", "'sin-tipos'", "'error'", "'cargando'"]) assert(dialog.includes(estado), `el diálogo declara el estado ${estado}`);
 assert(dialog.includes('El motor de IA todavía no está publicado'), 'sin #117 el diálogo lo dice y no simula un análisis');
 assert(dialog.includes('La IA no está configurada en el servidor'), 'sin key el aviso es claro');
 assert(dialog.includes('Tu rol no puede crear clientes ni equipos'), 'sin tipos permitidos el asistente no se ofrece');
 assert(dialog.includes("status===404||status===501?'pendiente':'error'"), 'el 404 del motor se mapea al puente, no a un error genérico');
 assert(dialog.includes('LoadingBlock'), 'mientras consulta la configuración hay estado de carga');
});

test('vista previa: tarjetas editables, avisos reales, obligatorios e incluir/descartar', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('Clientes <span'), 'hay una sección de clientes detectados');
 assert(dialog.includes('Equipos de inventario <span'), 'hay una sección de equipos detectados');
 assert(dialog.includes('<Checkbox label="Incluir"'), 'cada tarjeta se incluye o descarta');
 assert(dialog.includes('cliente.avisos.join') && dialog.includes('equipo.avisos.join'), 'los avisos del análisis viajan a la tarjeta');
 assert(dialog.includes("intentado&&cliente.incluir&&cliente.decision==='crear'&&!nombreValido") && dialog.includes('Obligatorio: 2 caracteres o más.'), 'los obligatorios se marcan al intentar crear');
 assert(dialog.includes('SelectCustom label="Categoría"'), 'la categoría se edita con el objeto del sistema');
 assert(dialog.includes('PhoneField') && dialog.includes('EmailField') && dialog.includes('AmountInput'), 'los campos tipados usan los objetos compartidos');
 assert(dialog.includes('un registro por unidad reservable'), 'la cantidad de equipos explica el modelo de una fila por unidad');
});

test('creación: sólo con confirmación, con los endpoints existentes y resumen por registro', () => {
 const dialog = file('app/ia-carga.tsx');
 const data = file('app/ia-carga-data.ts');
 assert(dialog.includes('onClick={()=>void crearTodo()}'), 'la creación cuelga del botón de confirmación');
 assert(dialog.includes("'Creando…':`Crear todo (${totalCrear})`"), 'el botón dice cuántos registros va a crear');
 const antesDeCrear = dialog.slice(dialog.indexOf('async function analizar'), dialog.indexOf('async function crearTodo'));
 assert(!antesDeCrear.includes('crearClienteDesdeIa') && !antesDeCrear.includes('crearEquipoDesdeIa'), 'el análisis no crea nada por sí solo');
 assert(dialog.indexOf('crearClienteDesdeIa', dialog.indexOf('async function crearTodo')) > 0, 'la creación de clientes vive dentro de crearTodo');
 assert(dialog.indexOf('crearEquipoDesdeIa', dialog.indexOf('async function crearTodo')) > 0, 'la creación de equipos vive dentro de crearTodo');
 assert(dialog.includes('No pudimos crear'), 'el resultado lista los errores por registro');
 assert(data.includes("api<{client?: {id?: unknown}}>('/api/agency/clients'"), 'los clientes se crean con el endpoint existente');
 assert(data.includes("api<{record?: {id?: unknown}}>('/api/agency/inventory'"), 'los equipos se crean con el endpoint existente');
 assert(!/localStorage|sessionStorage/.test(data + dialog), 'el texto pegado no se persiste en el navegador');
 assert(!/console\.(log|info|error)/.test(dialog), 'el texto pegado no va a logs de la interfaz');
});

test('privacidad: se envía sólo el texto pegado, con aviso y enlace al aviso público', () => {
 const dialog = file('app/ia-carga.tsx');
 const links = file('app/privacy-links.ts');
 assert(links.includes('PRIVACY_IA_FINALITY') && links.includes('PRIVACY_IA_DETAIL'), 'la finalidad vive en el módulo compartido');
 assert(links.includes('no se guarda en Scale OS'), 'la finalidad dice que el texto no se persiste');
 assert(links.includes('nunca la base de datos'), 'el detalle aclara que no se envía la base');
 assert(dialog.includes('AvisoPrivacidad') && dialog.includes('politicaUrl={PRIVACY_POLICY_URL}'), 'el diálogo muestra el aviso con enlace a /privacidad');
 assert(!dialog.includes('searchParams') && !dialog.includes('document.title'), 'sin datos personales en URL ni títulos');
});
