import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {friendlyTransportError} from '../app/data-cache';
import {sectionSource} from './workspace-source';

// Contratos de la tanda owncoding-ui v0.51.0 (§15 de REGLAS.md) en la vertical
// FIN: una entidad una fuente, cero éxito falso, cuatro estados, microcopy
// accionable y confirmación reforzada en las acciones de dinero (#87).
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const exists=(path:string)=>existsSync(new URL(`../${path}`,import.meta.url));
const finanzas=sectionSource('finanzas.tsx');
const mora=sectionSource('mora.tsx');
const comisiones=sectionSource('comisiones.tsx');
const pre=read('app/financial-forecast.tsx');
const informes=read('app/reports-workspace.tsx');
const reportsHook=read('app/use-reports.ts');
const workspace=read('app/scale-workspace.tsx');

// ── Regla 5 · una entidad, una fuente: fechas y dinero con una sola
// implementación (las copias locales se retiran en el mismo cambio).
assert(!exists('app/date-format.ts'),'la copia local app/date-format.ts se retiró');
assert(!exists('app/due-status.ts'),'la copia local app/due-status.ts se retiró');
const listFormat=read('app/list-format.tsx');
assert.match(listFormat,/from 'owncoding-ui'/,'list-format delega en los objetos de la librería');
assert.doesNotMatch(listFormat,/new Intl\.DateTimeFormat/,'list-format ya no arma fechas con Intl propio');
assert.match(listFormat,/fechaLista\(value/,'listDateFull sale de fechaLista');
assert.match(listFormat,/fechaListaCorta\(value/,'listDateShort sale de fechaListaCorta');
assert.match(listFormat,/diasHasta\(/,'dueTone sale de diasHasta');
assert.match(listFormat,/export function hasDueWarning/,'el booleano de vencimiento tiene una sola definición');
for(const file of ['app/growth-dashboard.tsx','app/inventory-workspace.tsx','app/production-board.tsx','app/productivity-ui.tsx','app/project-card.tsx','app/sections/clientes.tsx','app/sections/presupuestos.tsx','app/studio-workspace.tsx']){
  const source=read(file);
  assert.doesNotMatch(source,/from '\.\.?\/(date-format|due-status)'/,`${file} ya no importa copias locales de fechas`);
  assert.doesNotMatch(source,/new Intl\.DateTimeFormat/,'${file} no arma fechas a mano'.replace('${file}',file));
}

const moneyFormat=read('app/money-format.ts');
assert.match(moneyFormat,/export function money/,'el formateador único de dinero vive en money-format.ts');
const clientFormat=read('app/client-format.ts');
assert.doesNotMatch(clientFormat,/new Intl\.NumberFormat/,'moneyKpi ya no duplica el formateador');
assert.match(clientFormat,/moneyKpi = money/,'los agregados de KPI usan el mismo formato que las filas');
assert.match(read('app/operations.tsx'),/from '\.\/money-format'/,`operations reexporta el formateador único`);

assert.match(workspace,/moraDsoDays\(paymentStatuses, moraReports\)/,'el DSO del shell sale de mora-data (una sola derivación)');
assert.match(workspace,/moraKpis\(paymentStatuses\)/,'los KPIs de cobranza del shell salen de mora-data');
assert.doesNotMatch(workspace,/rows\.push\(\{ currency: financial\.currency, days/,'no queda una copia del cálculo de DSO en el shell');

// ── Regla 1 · cero éxito falso: ningún fallo se silencia y siempre hay salida.
assert.match(comisiones,/payoutsState === 'error' \? <ErrorBlock[\s\S]{0,320}onRetry=\{\(\) => void loadPayouts\(\)\}/,'los egresos muestran error con reintento');
assert.match(comisiones,/setCatalogError\(\{key, message/,'los catálogos de los diálogos no se silencian');
assert.match(comisiones,/errorScope === 'load' && !commissions\.length[\s\S]{0,90}null/,'un fallo de carga no se disfraza de sección vacía');
assert.match(comisiones,/catalogNotice\('invoices', 'collaborators'\)/,'el alta de comisión avisa si falla el catálogo');
assert.match(comisiones,/catalogNotice\('accounts'\)/,'el pago de comisión avisa si falla el catálogo');
assert.match(comisiones,/catalogNotice\('invoices'\)/,'el descuento avisa si falla el catálogo');
assert.doesNotMatch(comisiones,/\.catch\(\(\) => setPayouts\(\[\]\)\)/,'los egresos ya no se vacían en silencio');

assert.match(mora,/moraState/,'mora recibe el estado real de carga');
assert.match(mora,/ErrorBlock title="No se pudo cargar la cobranza"[\s\S]{0,120}onRetry=\{onRetry\}/,'el error de cobranza se muestra con reintento');
assert.match(mora,/LoadingBlock label="Cargando cobranza…"/,'la carga tiene su esqueleto');
assert.match(mora,/No se pudo calcular/,'el DSO distingue error de sin datos');
assert.match(mora,/No se pudo calcular el DSO con el reporte del mes/,'el DSO fallido ofrece reintento');
assert.doesNotMatch(mora,/moraReportsError \? 'Sin datos'/,'el DSO ya no dice «Sin datos» cuando el reporte falló');
assert.match(workspace,/setMoraState\('error'\)/,'el shell marca el error de cobranza');
assert.match(workspace,/setMoraReload\(value=>value\+1\)|setMoraReload\(value => value \+ 1\)/,'el reintento de cobranza vuelve a pedir los datos');

assert.match(reportsHook,/setPreviousError\('No se pudo cargar el período anterior\.'\)/,'el período anterior falla a la vista');
assert.match(informes,/previousError\?'No se pudo cargar el período anterior\.'/,'la comparación dice que falló, no que no hay datos');
assert.match(informes,/Sin actualizar · se reintenta solo/,'los visitantes en vivo declaran su fallo');

assert.match(finanzas,/loadAllInvoices\(\)\.catch\(cause => setToast/,'completar el histórico de facturas avisa si falla');
assert.match(finanzas,/loadAllPayments\(\)\.catch\(cause => setToast/,'completar el histórico de cobros avisa si falla');

// Regla 6 · la red no se muestra cruda: «Failed to fetch» se traduce a es-PY y
// el timeout también; una cancelación esperada no se disfraza de error.
assert.equal(friendlyTransportError(new TypeError('Failed to fetch')).message,'Sin conexión con el servidor. Revisá tu conexión y probá de nuevo.');
assert.match(friendlyTransportError(Object.assign(new Error('The operation was aborted due to timeout'),{name:'TimeoutError'})).message,/tardó demasiado/i);
assert.equal(friendlyTransportError(new Error('La comisión no está disponible para cambiar de estado')).message,'La comisión no está disponible para cambiar de estado');
const abort=new Error('aborted');abort.name='AbortError';assert.equal(friendlyTransportError(abort),abort,'la cancelación no se convierte en error de red');
const operations=read('app/operations.tsx');
assert.match(operations,/El servidor no pudo completar la operación/,'la API no filtra el cuerpo crudo de un 5xx');
assert.match(read('app/use-forecast.ts'),/readJson\(response\)/,'la previsión lee el JSON sin filtrar errores del navegador');

// ── Regla 9 · lo destructivo de dinero usa confirmación reforzada (objeto de
// la librería) y las líneas sin acciones no dibujan contenedores vacíos.
assert.match(comisiones,/ConfirmDialog[\s\S]{0,260}title="Cancelar comisión"/,'cancelar comisión pide confirmación');
assert.match(comisiones,/ConfirmDialog[\s\S]{0,260}title="Revertir descuento"/,'revertir descuento pide confirmación');
assert.match(pre,/ConfirmDialog[\s\S]{0,260}title="Quitar gasto planificado"/,'quitar un gasto planificado pide confirmación');
assert.match(pre,/ConfirmDialog[\s\S]{0,260}title="Revertir gasto real"/,'revertir un gasto real pide confirmación');
assert.doesNotMatch(comisiones,/Sin acciones/,'ninguna fila muestra un bloque de acciones vacío');
assert.match(read('app/daily-controls.tsx'),/Escribí REVERTIR para confirmar/,'revertir un cobro conserva la palabra de confirmación');

// ── Regla 6 · microcopy es-PY: qué pasó y qué hacer, en voseo.
assert.match(mora,/Reintentá para ver el saldo pendiente/,'el error de cobranza dice qué hacer');
assert.match(comisiones,/Reintentá para ver los pagos registrados/,'el error de egresos dice qué hacer');
assert.match(informes,/Reintentá para volver a pedir la comparación/,'la comparación fallida dice qué hacer');
assert.match(pre,/No toca pagos reales ni cuentas/,'quitar un plan aclara su alcance');

console.log('PASS tanda §15 FIN: una fuente de fechas/dinero, cero éxito falso, cuatro estados, microcopy y confirmaciones reforzadas (#87)');
