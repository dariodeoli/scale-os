import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sectionSource} from './workspace-source';

// #88: panel «Salarios» en Finanzas con el mismo contrato que Previsión
// (`useForecast` → `personnel`), «Ver más» a los módulos completos y las
// cuatro ramas §15 (carga, error con reintento, vacío con acción y lleno).
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const finanzas=sectionSource('finanzas.tsx');
const workspace=read('app/scale-workspace.tsx');

assert.match(finanzas,/function SalariosPanel/,'el panel «Salarios» vive en la sección de Finanzas');
assert.match(finanzas,/useForecast\(currentForecastMonth\(\), '1'\)/,'usa el hook y el contrato de Previsión (sin recálculo propio)');
assert.match(finanzas,/data\?\.personnel\.records/,'el resumen sale de personnel del forecast');
assert.match(finanzas,/expected_end_of_month_expense/,'muestra el gasto esperado al cierre');
assert.match(finanzas,/included_headcount/,'muestra el headcount incluido');
assert.match(finanzas,/<MoneyText valor=\{row\.expected_end_of_month_expense\}/,'los montos van con MoneyText: sin dato, «—»');

// «Ver más» dentro de los paneles.
assert.match(finanzas,/navigate\('Previsión'\)/,'«Ver más» abre la Previsión completa');
assert.match(finanzas,/navigate\('Mora'\)/,'cobros pendientes abre la cobranza por cliente');
assert.match(workspace,/<FinanzasSection user=\{user\} navigate=\{setActive\}/,'el shell cablea la navegación de la sección');

// Cuatro estados §15 del panel.
assert.match(finanzas,/LoadingBlock label="Cargando salarios…"/,'estado de carga con esqueleto');
assert.match(finanzas,/ErrorBlock title="No se pudo cargar el gasto del personal"[\s\S]{0,90}onRetry=\{\(\) => reload\(\)\}/,'error con reintento');
assert.match(finanzas,/EmptyBlock compact title="Sin salarios fijos cargados para este mes\."[\s\S]{0,220}navigate\('Equipo'\)/,'vacío con acción (Ver equipo)');
assert.match(finanzas,/rows\.map\(row => <article[\s\S]{0,220}row\.currency/,'estado lleno: una tarjeta por moneda');

console.log('PASS: panel Salarios en Finanzas — mismo contrato, cuatro estados, «Ver más» a Previsión y a Mora (#88)');
