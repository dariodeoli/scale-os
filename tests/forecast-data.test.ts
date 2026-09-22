import assert from 'node:assert/strict';

require.extensions['.css'] = () => {};
const {
  amountFor,
  currentForecastMonth,
  dateLabel,
  financialCurrencies,
  forecastAggregates,
  forecastBalanceRows,
  isPositiveInput,
  normalizePlannedExpenses,
  personnelAmounts,
  projectionCurrencies,
  realExpenseTotal,
  todayAsuncion,
  undatedBudgets,
  validForecast,
} = require('../app/forecast-data') as typeof import('../app/forecast-data');
type ForecastData = import('../app/forecast-data').ForecastData;
type RealExpenseRow = import('../app/forecast-data').RealExpenseRow;

const fixture: ForecastData = {
  month: '2026-09',
  time_zone: 'America/Asuncion',
  records: [
    {currency: 'USD', issued_total: 100, accepted_uninvoiced_total: '20', expected_total: '120', invoice_count: 1, budget_count: '1', undated_budget_count: 0},
    {currency: 'PYG', issued_total: '5000', accepted_uninvoiced_total: '0', expected_total: '5000', invoice_count: '1', budget_count: 0, undated_budget_count: '1'},
  ],
  contracted_recurring: {month: '2026-09', records: [{currency: 'PYG', amount: '1000'}]},
  invoiced: {month: '2026-09', records: [{currency: 'USD', amount: 100}, {currency: 'PYG', amount: 5000}]},
  collected_actual: {month: '2026-09', records: [{currency: 'USD', amount: 80}]},
  personnel: {month: '2026-09', included_headcount: '2', records: [
    {currency: 'PYG', included_headcount: 1, base_count: 0, base_amount: '0', override_count: 1, override_amount: '1200', expected_end_of_month_expense: '1200', members: [{collaborator_id: '9', user_id: null, name: 'Salario variable', photo_url: null, compensation_type: 'variable', currency: 'PYG', base_amount: '0', override_amount: '1200'}]},
    {currency: 'USD', included_headcount: '1', base_count: 1, base_amount: 200, override_count: 0, override_amount: '0', expected_end_of_month_expense: '200', members: [{collaborator_id: '10', user_id: null, name: 'Salario USD', photo_url: null, compensation_type: 'fixed', currency: 'USD', base_amount: 200, override_amount: '0'}]},
  ]},
  commission_forecast: {month: '2026-09', records: [{currency: 'PYG', amount: 10}]},
  planned_expenses: {month: '2026-09', records: [{currency: 'PYG', amount: '3000', expense_count: 3, fixed_count: 2, variable_count: 1}]},
  contracted_clients: {month: '2026-09', records: [{client_id: '7', client_name: 'Contrato sin factura', currency: 'USD', contracted_amount: 300, invoiced_amount: 0, invoice_required: true, missing_invoice: true}]},
  opening_balance: {month: '2026-09', records: [{currency: 'USD', amount: 1800}]},
  projection: {months: 3, records: [
    {month: '2026-09', currency: 'USD', projected_cash: 1860, projected_result: 60, collected: 0, expected: 260, personnel: 200, planned_expenses: 0, commission_forecast: 0},
    {month: '2026-10', currency: 'USD', projected_cash: -100, projected_result: -50, collected: 0, expected: 0, personnel: 200, planned_expenses: 0, commission_forecast: 0},
  ]},
  definition: {issued: 'Emitido con impuestos.', accepted_uninvoiced: 'Mes de aceptación.', exclusions: 'Sin oportunidades.', contracted_recurring: 'Contratos.', invoiced: 'Facturas.', collected_actual: 'Cobros.', personnel: 'Solo salarios mensuales.', commission_forecast: 'Comisiones.', planned_expenses: 'Gastos.', opening_balance: 'Saldo inicial.', projected_cash: 'Caja.', projected_result: 'Resultado.', contracted_clients: 'Contratos por cliente.'},
};

// --- Validación del contrato ----------------------------------------------
assert.equal(validForecast(fixture), true, 'el fixture canónico es válido');
assert.equal(validForecast({...fixture, time_zone: undefined}), false, 'sin zona horaria no es válido');
assert.equal(validForecast({...fixture, personnel: {month: '2026-09', included_headcount: 0, records: []}}), true, 'un mes sin personal es válido con la lista vacía');
assert.equal(validForecast({...fixture, personnel: {month: '2026-09', included_headcount: 0, records: 'no'}}), false, 'el bloque personnel exige una lista');
assert.equal(validForecast({...fixture, records: [{...fixture.records[0], currency: 'XYZ'}]}), false, 'moneda fuera de las seis de la empresa');
assert.equal(validForecast({...fixture, records: [{...fixture.records[0], issued_total: '-5'}]}), false, 'los totales emitidos no admiten signo');
assert.equal(validForecast({...fixture, records: fixture.records.map(row => ({...row, invoice_count: '1.5'}))}), false, 'los conteos son enteros');
assert.equal(validForecast({...fixture, collected_actual: {month: '2026-09', records: [{currency: 'USD', amount: '10'}, {currency: 'USD', amount: '-1'}]}}), false, 'cobrado negativo se rechaza');
assert.equal(validForecast({...fixture, projection: {months: 3, records: [{...fixture.projection!.records[0], projected_cash: '-1860'}]}}), true, 'la caja proyectada admite signo');
assert.equal(validForecast({...fixture, projection: {months: 3, records: [{...fixture.projection!.records[0], projected_cash: '1860.5'}]}}), false, 'la caja proyectada no admite decimales');
assert.equal(validForecast({...fixture, contracted_clients: {month: '2026-09', records: [{...fixture.contracted_clients!.records[0], missing_invoice: 'si'}]}}), false, 'la marca de factura es booleana');
// salary.view: el API manda null en los montos por persona y el payload sigue siendo válido.
const masked: ForecastData = {...fixture, personnel: {month: '2026-09', included_headcount: '1', records: [{currency: 'PYG', included_headcount: 1, base_count: 1, base_amount: '1000', override_count: 0, override_amount: '0', expected_end_of_month_expense: '1000', members: [{collaborator_id: '9', name: 'Salario oculto', currency: 'PYG', base_amount: null, override_amount: null}]}]}};
assert.equal(validForecast(masked), true, 'los salarios enmascarados son un payload válido');
assert.equal(validForecast({...masked, personnel: {month: '2026-09', included_headcount: '1', records: [{...masked.personnel.records[0], base_amount: '1000'}]}}), true, 'el agregado por moneda sobrevive sin montos por persona');
assert.equal(validForecast({...masked, personnel: {month: '2026-09', included_headcount: '1', records: [{...masked.personnel.records[0], members: [{...masked.personnel.records[0].members[0], base_amount: '-1'}]}]}}), false, 'el salario base enmascarado no puede venir negativo');

// --- Agregados por moneda --------------------------------------------------
assert.deepEqual(financialCurrencies(fixture), ['USD', 'PYG'], 'monedas del mes en orden de aparición');
assert.deepEqual(projectionCurrencies(fixture), ['USD']);
assert.deepEqual(projectionCurrencies({...fixture, projection: undefined}), [], 'sin proyección no hay monedas de horizonte');
assert.equal(undatedBudgets(fixture), 1);
assert.equal(undatedBudgets({...fixture, records: []}), 0);
const aggregates = forecastAggregates(fixture);
assert.deepEqual(aggregates.contracted, [{currency: 'PYG', amount: '1000'}]);
assert.deepEqual(aggregates.collected, [{currency: 'USD', amount: 80}]);
assert.deepEqual(aggregates.commissions, [{currency: 'PYG', amount: 10}]);
assert.deepEqual(aggregates.expenses.map(({currency, amount}) => ({currency, amount})), [{currency: 'PYG', amount: '3000'}], 'los agregados de gastos conservan el desglose fijo/variable aparte');
assert.equal(amountFor(aggregates.contracted, 'PYG'), '1000');
assert.equal(amountFor(aggregates.contracted, 'USD'), undefined);
assert.equal(amountFor(undefined, 'PYG'), undefined);

// --- Ingresos vs gastos ----------------------------------------------------
const realExpenses: RealExpenseRow[] = [
  {id: '1', account_id: '5', account_name: 'Caja', category: 'Herramientas', kind: 'fixed', amount: '400', currency: 'PYG', paid_on: '2026-09-12', reference: 'Licencia', created_by_email: 'fin@example.invalid'},
  {id: '2', account_id: '6', account_name: 'Banco USD', category: 'Marketing', kind: null, amount: 30, currency: 'USD', paid_on: '2026-09-13', reference: '', created_by_email: null},
];
assert.equal(realExpenseTotal(realExpenses, 'PYG'), 400);
assert.equal(realExpenseTotal(realExpenses, 'EUR'), 0);
const balances = forecastBalanceRows(fixture, realExpenses);
assert.equal(balances.length, 2, 'una fila por moneda del mes');
const usd = balances.find(row => row.currency === 'USD')!;
assert.deepEqual({income: usd.income, expense: usd.expense, result: usd.result, max: usd.max}, {income: 120, expense: 230, result: -110, max: 230}, 'USD: ingresos 100+20, gastos 200 de personal + 30 reales');
const pyg = balances.find(row => row.currency === 'PYG')!;
assert.deepEqual({income: pyg.income, expense: pyg.expense, result: pyg.result, max: pyg.max}, {income: 5000, expense: 4610, result: 390, max: 5000}, 'PYG: 5000 emitido contra 1200 + 10 + 3000 + 400');
assert.equal(balances[0].max >= Math.abs(balances[0].result), true, 'la escala nunca es menor que el resultado');
assert.equal(forecastBalanceRows({...fixture, records: [], personnel: {month: '2026-09', included_headcount: 0, records: []}, planned_expenses: {month: '2026-09', records: []}, contracted_recurring: {month: '2026-09', records: []}, collected_actual: {month: '2026-09', records: []}, commission_forecast: {month: '2026-09', records: []}}, []).length, 0, 'sin datos no hay tarjetas de balance');

// --- Personal: base, ajuste y cierre (null ≠ 0) ---------------------------
assert.deepEqual(personnelAmounts({collaborator_id: '10', name: 'Fijo', currency: 'USD', base_amount: 200, override_amount: '0'}), {base: 200, adjustment: 0, total: 200});
assert.deepEqual(personnelAmounts({collaborator_id: '9', name: 'Variable', currency: 'PYG', base_amount: '0', override_amount: '-500'}), {base: 0, adjustment: -500, total: -500});
assert.deepEqual(personnelAmounts({collaborator_id: '11', name: 'Oculto', currency: 'PYG', base_amount: null, override_amount: null}), {base: null, adjustment: null, total: null}, 'un salario enmascarado nunca se fabrica en cero');
assert.deepEqual(personnelAmounts({collaborator_id: '12', name: 'Parcial', currency: 'PYG', base_amount: '100', override_amount: null}), {base: 100, adjustment: null, total: null}, 'sin ajuste no se inventa un cierre');

// --- Gastos planificados (listado del contrato GET) -----------------------
const plannedPayload = {month: '2026-09', records: [
  {id: '1', cadence: 'monthly', effectiveMonth: '2026-09-01', category: 'Operación', amount: '1500', currency: 'PYG', note: 'Alquiler', kind: 'fixed', createdByUserId: '3', createdAt: '2026-09-01T12:00:00Z', updatedAt: '2026-09-01T12:00:00Z'},
  {id: '2', cadence: 'recurring', effectiveMonth: '2026-07-01', category: 'Marketing', amount: 50, currency: 'USD', note: null, kind: null},
], totals: [{currency: 'PYG', amount: '1500'}, {currency: 'USD', amount: '50'}]};
const planned = normalizePlannedExpenses(plannedPayload);
assert.equal(planned?.records.length, 2);
assert.deepEqual(planned?.records[1], {id: '2', cadence: 'recurring', effectiveMonth: '2026-07-01', category: 'Marketing', amount: 50, currency: 'USD', note: null, kind: null}, 'conserva los campos del registro tal como llegan');
assert.deepEqual(planned?.totals, [{currency: 'PYG', amount: '1500'}, {currency: 'USD', amount: '50'}]);
assert.equal(normalizePlannedExpenses({...plannedPayload, records: [{...plannedPayload.records[0], cadence: 'weekly'}]}), null, 'una cadencia inválida invalida el payload');
assert.equal(normalizePlannedExpenses({...plannedPayload, records: [{...plannedPayload.records[0], amount: '1500.50'}]}), null, 'los gastos planificados son enteros');
assert.equal(normalizePlannedExpenses({...plannedPayload, totals: [{currency: 'PYG', amount: 'no'}]}), null, 'un total inválido invalida el payload');
assert.equal(normalizePlannedExpenses({month: '2026-09'}), null, 'sin listas no hay payload');

// --- Fechas y entradas ------------------------------------------------------
assert.equal(dateLabel('2026-09'), '01-sept');
assert.equal(dateLabel('2026-09-17'), '17-sept');
assert.equal(dateLabel(''), '');
assert.equal(currentForecastMonth(new Date('2026-10-01T02:59:59Z')), '2026-09');
assert.equal(currentForecastMonth(new Date('2026-10-01T03:00:00Z')), '2026-10');
assert.match(todayAsuncion(), /^\d{4}-\d{2}-\d{2}$/);
assert.equal(isPositiveInput('10'), true);
assert.equal(isPositiveInput('0'), false);
assert.equal(isPositiveInput('1.5'), false);
assert.equal(isPositiveInput('01'), false);

console.log('PASS forecast data: contrato validado, agregados por moneda, balance ingresos/gastos, personal enmascarado y gastos planificados');
