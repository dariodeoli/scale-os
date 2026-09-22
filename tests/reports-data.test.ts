import assert from 'node:assert/strict';
import {
  biggestDecimal,
  chartBarPercent,
  chartSeries,
  count,
  currentMonth,
  decimal,
  distributionShare,
  hasMonthData,
  monthLabel,
  monthOf,
  previousMonth,
  reportComparison,
  reportCurrencies,
  reportDate,
  reportKindLabel,
  reportTiles,
  shiftMonth,
  validMonth,
  type ReportMonth,
  type ReportsData,
} from '../app/reports-data';

const money = (currency: string, invoiced: string, collected: string, invoiceCount = 1): ReportMonth['financial'][number] => ({
  currency,
  invoiced,
  collected,
  invoiceCount,
  billedClients: 1,
  averageTicket: null,
  averageRevenuePerClient: null,
});

const month = (value: string, over: Partial<ReportMonth> = {}): ReportMonth => ({
  month: value,
  isPartial: false,
  clients: {active: 4, added: 1, lost: 1, retentionPercent: 75, averageTenureDays: 100, tenureKnown: 3, types: [{kind: 'company', count: 1}, {kind: 'unknown', count: 3}], plans: [{planId: '2', name: 'Mensual', count: 1}, {planId: null, name: null, count: 3}]},
  financial: [money('USD', '9007199254740993.1234', '-10.00', 2), money('PYG', '50000', '40000')],
  ...over,
});

// --- Monedas y etiquetas ---------------------------------------------------
assert.deepEqual(reportCurrencies([month('2026-08'), month('2026-09')]), ['PYG', 'USD'], 'monedas únicas y ordenadas');
assert.deepEqual(reportCurrencies([]), []);
assert.equal(reportKindLabel('company'), 'Empresa');
assert.equal(reportKindLabel('unknown'), 'Sin clasificar');
assert.equal(reportKindLabel('nuevo-tipo'), 'Sin clasificar', 'un kind nuevo no rompe la etiqueta');

// --- Meses, fechas y validación -------------------------------------------
assert.equal(previousMonth('2026-01'), '2025-12');
assert.equal(previousMonth('2026-09'), '2026-08');
assert.equal(shiftMonth('2026-01', -13), '2024-12');
assert.equal(shiftMonth('1900-01', -1), null, 'no baja del rango soportado');
assert.equal(shiftMonth('9998-12', 1), null, 'no sube del rango soportado');
assert.equal(validMonth('2026-09'), true);
assert.equal(validMonth('2026-13'), false);
assert.equal(monthOf('2026-09-10T15:00:00Z'), '2026-09');
assert.equal(monthOf(null), null);
assert.equal(monthLabel('2026-09'), '01-sept');
assert.match(reportDate('2026-09-10T15:00:00Z', true), /10 de septiembre de 2026/);
assert.equal(reportDate(null), 'sin fecha confirmada');
assert.equal(count(null), 'Sin datos');
assert.equal(count(0), '0');

// --- hasMonthData: un mes vacío no es un cero ------------------------------
const empty: ReportMonth = {month: '2026-01', isPartial: false, clients: {active: null, added: null, lost: null, retentionPercent: null, averageTenureDays: null, tenureKnown: 0, types: [], plans: []}, financial: []};
assert.equal(hasMonthData(empty), false, 'sin figuras no hay mes');
assert.equal(hasMonthData(month('2026-09')), true);
assert.equal(hasMonthData(month('2026-09', {financial: [money('PYG', '0', '0')]})), true, 'un cero registrado sí es dato (el API lo emite cuando hay registros)');

// --- Tiles del mes vs mes anterior ----------------------------------------
const selected = month('2026-09');
const prior = month('2026-08', {clients: {...month('2026-08').clients, active: 3, added: 0, lost: 2, retentionPercent: 50}});
const tiles = reportTiles(selected, prior, 'PYG');
assert.deepEqual(tiles.map(tile => tile.label), [
  'Clientes activos',
  'Clientes incorporados',
  'Bajas de actividad',
  'Retención',
  'Facturado · incluye impuestos',
  'Cobrado · neto de reversiones',
  'Ticket promedio por factura',
  'Facturado promedio por cliente facturado',
]);
assert.equal(tiles[0].value, '4');
assert.equal(tiles[0].change, '+1 · +33,33 %', 'activos comparan contra el mes anterior');
assert.equal(tiles[1].change, '+1 · porcentaje no disponible (base cero)', 'incorporados con base cero');
assert.equal(tiles[3].value, '75 %');
assert.equal(tiles[4].value, 'PYG 50.000');
assert.deepEqual(reportTiles(undefined, undefined, 'PYG'), [], 'sin mes seleccionado no hay tiles');
const partialTile = reportTiles(month('2026-09', {isPartial: true}), prior, 'PYG')[0];
assert.equal(partialTile.change, 'Sin comparación: mes parcial');

// --- Gráfico: serie, escala y alturas -------------------------------------
const series = chartSeries([month('2026-08'), month('2026-09', {isPartial: true, financial: []}), month('2026-10', {financial: [money('PYG', '0', '0')]})], 'PYG');
assert.deepEqual(series.map(point => point.month), ['2026-08', '2026-10'], 'solo meses con dato de la moneda');
assert.equal(series[1].partial, false);
assert.equal(chartSeries([month('2026-08')], 'EUR').length, 0, 'moneda sin serie no dibuja');
const biggest = biggestDecimal(chartSeries([month('2026-08')], 'PYG'));
assert.equal(biggest.units, BigInt(50000));
assert.equal(biggest.scale, 0);
assert.equal(chartBarPercent(null, biggest), 0, 'sin dato la barra mide 0');
assert.equal(chartBarPercent({units: BigInt(50000), scale: 0}, biggest), 100);
assert.equal(chartBarPercent({units: BigInt(1), scale: 0}, biggest), 2, 'una barra diminuta conserva 2 % visible');
assert.equal(chartBarPercent(decimal('25000'), biggest), 50);
assert.equal(chartBarPercent({units: BigInt(10), scale: 0}, {units: BigInt(0), scale: 0}), 0, 'sin máximo no hay escala');

// --- Distribuciones --------------------------------------------------------
assert.equal(distributionShare(1, 4), 25);
assert.equal(distributionShare(0, 0), null, 'total cero no inventa porcentaje');
assert.equal(distributionShare(3, null), null, 'sin total no hay porcentaje');

// --- Comparación de ventanas ----------------------------------------------
const historyRow = (value: string, clients: Partial<ReportMonth['clients']>, financial: ReportMonth['financial']): ReportMonth => ({month: value, isPartial: false, clients: {...empty.clients, ...clients}, financial});
const current: ReportsData = {asOf: '2026-09-10T15:00:00Z', month: '2026-09', historySince: '2025-01-01T03:00:00Z', months: [
  historyRow('2026-08', {active: 5, added: 2, lost: 0}, [money('USD', '100.00', '80.00', 2)]),
  historyRow('2026-09', {active: 6, added: 3, lost: 1}, [money('USD', '300.50', '200.00', 3)]),
]};
const previous: ReportsData = {asOf: '2026-09-10T15:00:00Z', month: '2025-09', historySince: '2025-01-01T03:00:00Z', months: [
  historyRow('2025-08', {active: 3, added: 0, lost: 2}, [money('USD', '200.00', '250.00', 4)]),
  historyRow('2025-09', {active: 4, added: 1, lost: 0}, [money('USD', '0.00', '0.00', 0)]),
]};
const comparison = reportComparison(current, previous, 'USD', 2);
assert.equal(comparison.available, true);
assert.equal(comparison.currentStart, '2026-08');
assert.equal(comparison.currentEnd, '2026-09');
assert.equal(comparison.previousStart, '2025-08');
assert.equal(comparison.previousEnd, '2025-09');
assert.deepEqual(comparison.rows.map(row => row.label), [
  'Clientes activos (último mes con datos)',
  'Clientes incorporados (suma del período)',
  'Bajas de actividad (suma del período)',
  'Facturación (suma del período)',
  'Cobros (suma del período)',
  'Ticket promedio por factura',
]);
const row = (label: string) => comparison.rows.find(item => item.label.startsWith(label))!;
assert.equal(row('Clientes activos').change, '+2 · +50,00 %');
assert.equal(row('Clientes incorporados').change, '+4 · +400,00 %');
assert.equal(row('Bajas').change, '-1 · -50,00 %');
assert.equal(row('Facturación').current, 'USD 400,50', 'la suma del período no pierde centavos');
assert.equal(row('Facturación').change, '+200,50 · +100,25 %');
assert.equal(row('Cobros').change, '+30,00 · +12,00 %', 'los cobros comparan contra su propia base');
assert.equal(row('Ticket promedio').change, '+30,10 · +60,20 %', 'el ticket divide facturado por facturas con redondeo half-up');

assert.equal(reportComparison(current, null, 'USD', 2).available, false, 'sin ventana anterior no hay comparación');
const partialPrevious: ReportsData = {...previous, months: previous.months.map(item => ({...item, isPartial: true}))};
assert.equal(reportComparison(current, partialPrevious, 'USD', 2).available, false, 'una ventana anterior parcial no compara');
const recentHistory: ReportsData = {...current, historySince: '2026-08-15T03:00:00Z'};
assert.equal(reportComparison(recentHistory, previous, 'USD', 2).available, false, 'histórico que arranca dentro de la ventana anterior no compara');

console.log('PASS reports data: monedas, meses, tiles, gráfico, distribuciones y comparación de ventanas sin perder centavos');
