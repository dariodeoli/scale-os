import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

Object.assign(globalThis, {React});
require.extensions['.css'] = () => {};

const file = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const {senalMatchLabel} = require('../app/ia-carga-data') as typeof import('../app/ia-carga-data');

/* ------------------------------------------------ contrato canónico (#119/#121) */

test('la UI consume el contrato canónico de #119 y la ejecución de #121', () => {
 const dialog = file('app/ia-carga.tsx');
 const data = file('app/ia-carga-data.ts');
 for (const tipo of ['type AccionIA', 'type CoincidenciaIA', 'type EstadoMatch', 'type IaResultado']) assert(dialog.includes(tipo), `tipo canónico del adaptador de #119: ${tipo}`);
 assert(dialog.includes('analizarIa') && dialog.includes('type IaResultado'), 'el análisis devuelve registros + acciones del mismo POST');
 assert(!data.includes('ejecutarAccionIa') && !data.includes('IA_ACCION_PATH'), 'la ejecución propia de Fase 2 se retiró');
 assert(dialog.includes('registrarCobroDesdeIa') && dialog.includes('validarCobroIa'), 'la ejecución vive en el módulo de Finanzas (#121)');
 assert(dialog.includes('cargarCuentasCobro') && dialog.includes('cuentaSugeridaIa') && dialog.includes('cuentasCobroIa'), 'la cuenta del cobro sale de Finanzas, nunca se adivina');
 assert.equal(senalMatchLabel('ruc_ci_exacto'), 'RUC/CI coincide');
 assert.equal(senalMatchLabel('senal_nueva'), 'senal nueva', 'una señal nueva se muestra cruda, no se esconde');
});

/* ------------------------------------------------------------- UI de Fase 2 */

test('tarjetas: Nuevo / Coincide / Ambiguo con decisión explícita y nada se duplica solo', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('>Nuevo</StateChip>') && dialog.includes('>Coincide</StateChip>') && dialog.includes('>Ambiguo</StateChip>'), 'cada tarjeta muestra su estado de match');
 assert(dialog.includes("const porUmbral = decisionPorConfianza(score)") && dialog.includes("if (porUmbral === 'vincular' && mejor) return {decision: 'vincular'"), 'la preselección por umbral propone vincular el mejor candidato');
 assert(dialog.includes("if (estado === 'coincide' && mejor) return {decision: 'vincular'"), 'sin confianza del motor se conserva el puente de la Fase 2');
 assert(dialog.includes("if (estado === 'ambiguo') return {decision: 'pendiente'"), 'una ambigüedad exige decisión');
 assert(dialog.includes('Usar «'), 'la ficha existente se puede elegir como destino');
 assert(dialog.includes("Crear {tipo} nuevo"), 'crear un registro nuevo es una opción explícita');
 assert(dialog.includes('Nada se duplica sin tu decisión'), 'la tarjeta lo dice con todas las letras');
 assert(dialog.includes('pendientesDeDecision'), 'la creación bloquea las tarjetas sin decidir');
 assert(dialog.includes("fila.decision==='crear'"), 'sólo se crean las tarjetas con decisión de crear');
 assert(dialog.includes("fila.decision==='vincular'"), 'vincular no crea nada');
 assert(dialog.includes('Vinculamos'), 'el resumen distingue vinculados');
 assert(dialog.includes('candidato.activo?'), 'un candidato inactivo se marca en el picker');
});

test('acciones: confirmación de a una, con cuenta y sin duplicar a ciegas', () => {
 const dialog = file('app/ia-carga.tsx');
 assert(dialog.includes('Confirmar acción'), 'cada acción propuesta tiene su botón de confirmación');
 assert(dialog.includes('disabled={!fila.clienteId||!cuentasCobroIa'), 'sin cliente o sin cuenta no se confirma');
 assert(dialog.includes('No pudimos vincular el cliente'), 'si no hay candidatos se pide elegir, no se ejecuta');
 assert(dialog.includes('Elegí la cuenta donde entró el cobro.'), 'sin cuenta la validación corta antes de llamar al servidor');
 assert(dialog.includes('validarCobroIa(cobro)'), 'la forma del cobro se valida con el módulo de Finanzas');
 assert(dialog.includes("fila.estado==='duplicado'") && dialog.includes('Registrar igual') && dialog.includes('confirmarAccion(fila.clave,true)'), 'el duplicado pide una segunda decisión explícita');
 assert(dialog.includes('Registramos') && dialog.includes('sin confirmar: no se ejecutó nada de eso'), 'el resumen cuenta acciones ejecutadas y pendientes');
 const antesDeConfirmar = dialog.slice(dialog.indexOf('async function analizar'), dialog.indexOf('async function confirmarAccion'));
 assert(!antesDeConfirmar.includes('registrarCobroDesdeIa'), 'el análisis no ejecuta nada: la acción cuelga del botón de confirmación');
});

test('privacidad y límites de la Fase 2: sin persistencia ni datos personales en URLs', () => {
 const dialog = file('app/ia-carga.tsx');
 const data = file('app/ia-carga-data.ts');
 assert(!/localStorage|sessionStorage/.test(dialog + data), 'ni el texto ni las decisiones se persisten en el navegador');
 assert(!dialog.includes('searchParams') && !dialog.includes('document.title'), 'sin datos personales en URLs ni títulos');
 assert(dialog.includes('data-estado={fila.estado}'), 'la tarjeta expone su estado para pruebas y estilos');
});
