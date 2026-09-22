import assert from 'node:assert/strict';
import {
  buildMoraBuckets,
  filterMoraClients,
  MORA_AGE_LABELS,
  MORA_BUCKETS,
  moraAgeKey,
  moraDsoDays,
  moraKpis,
  type ClientPaymentStatus,
  type MoraReports,
} from '../app/mora-data';

const status = (over: Partial<ClientPaymentStatus> = {}): ClientPaymentStatus => ({
  client_id: '1',
  client_name: 'Cliente',
  currency: 'PYG',
  outstanding_amount: '1000',
  next_due_on: null,
  days_overdue: 0,
  payment_status: 'up_to_date',
  invoice_count: 1,
  has_invoice: true,
  ...over,
});

// Buckets 1–15 / 16–30 / +30: solo saldos vencidos con moneda; los límites son inclusivos.
const buckets = buildMoraBuckets([
  status({client_name: 'Uno', days_overdue: 1, outstanding_amount: '100'}),
  status({client_name: 'Quince', days_overdue: 15, outstanding_amount: '200'}),
  status({client_name: 'Dieciséis', days_overdue: 16, currency: 'USD', outstanding_amount: '30'}),
  status({client_name: 'Treinta y uno', days_overdue: 31, outstanding_amount: '400'}),
  status({client_name: 'Al día', days_overdue: 0, outstanding_amount: '999'}),
  status({client_name: 'Sin saldo', days_overdue: 5, outstanding_amount: '0'}),
  status({client_name: 'Sin moneda', days_overdue: 5, currency: null, outstanding_amount: '50'}),
  status({client_name: 'Fecha rara', days_overdue: -2, outstanding_amount: '50'}),
]);
assert.equal(buckets.length, 3);
assert.deepEqual(buckets.map(bucket => bucket.key), ['early', 'medium', 'critical']);
assert.deepEqual(buckets.map(bucket => bucket.label), MORA_BUCKETS.map(bucket => bucket.label));
assert.equal(buckets[0].clients, 2, '1 y 15 días caen en el primer tramo');
assert.deepEqual(buckets[0].amounts, [{currency: 'PYG', amount: 300}]);
assert.equal(buckets[1].clients, 1, '16 días abre el tramo medio');
assert.deepEqual(buckets[1].amounts, [{currency: 'USD', amount: 30}]);
assert.equal(buckets[2].clients, 1, '31 días es mora crítica');
assert.deepEqual(buckets[2].amounts, [{currency: 'PYG', amount: 400}]);

// Una misma moneda acumula y conserva el orden de aparición; no se mezclan monedas.
const mixed = buildMoraBuckets([
  status({days_overdue: 3, currency: 'USD', outstanding_amount: '10'}),
  status({days_overdue: 4, currency: 'PYG', outstanding_amount: '5'}),
  status({days_overdue: 5, currency: 'USD', outstanding_amount: '2.5'}),
]);
assert.deepEqual(mixed[0].amounts, [{currency: 'USD', amount: 12.5}, {currency: 'PYG', amount: 5}], 'USD suma 10+2.5 y PYG queda aparte');

// DSO: saldo pendiente / facturado del mes × 30, por moneda; sin facturación o sin saldo no entra.
const reports: MoraReports = {
  month: '2026-09',
  months: [
    {month: '2026-08', financial: [{currency: 'PYG', invoiced: '1000'}]},
    {month: '2026-09', financial: [{currency: 'PYG', invoiced: '3000'}, {currency: 'USD', invoiced: '100'}, {currency: 'EUR', invoiced: '0'}]},
  ],
};
const dso = moraDsoDays([
  status({outstanding_amount: '1500'}),
  status({client_name: 'USD', currency: 'USD', outstanding_amount: '50'}),
  status({client_name: 'EUR', currency: 'EUR', outstanding_amount: '10'}),
  status({client_name: 'Sin saldo', outstanding_amount: '0'}),
], reports);
assert.deepEqual(dso, [{currency: 'PYG', days: 15}, {currency: 'USD', days: 15}], 'EUR con facturación 0 se excluye');

assert.equal(moraDsoDays([status()], null), null, 'sin reporte no hay DSO');
assert.equal(moraDsoDays([status()], {month: 'x', months: []}), null, 'sin meses no hay DSO');
assert.deepEqual(moraDsoDays([status({outstanding_amount: '1500'})], {month: '2026-12', months: reports.months}), [{currency: 'PYG', days: 45}], 'mes inexistente cae al primer mes');
assert.deepEqual(moraDsoDays([status({outstanding_amount: '1'})], {month: '2026-09', months: [{month: '2026-09', financial: [{currency: 'PYG', invoiced: '3'}]}]}), [{currency: 'PYG', days: 10}], 'redondea el ratio de días');
assert.deepEqual(moraDsoDays([status({outstanding_amount: '99'})], {month: '2026-09', months: [{month: '2026-09', financial: [{currency: 'USD', invoiced: '1000'}]}]}), [], 'moneda sin saldo pendiente no entra');

// Semáforo de cobranza: late y severe cuentan como mora; "sin factura" es ortogonal.
const kpis = moraKpis([
  status({payment_status: 'up_to_date'}),
  status({payment_status: 'due_soon'}),
  status({payment_status: 'late', has_invoice: false}),
  status({payment_status: 'severe'}),
]);
assert.deepEqual(kpis, {alDia: 1, porVencer: 1, enMora: 2, sinFactura: 1});

// Filtro + búsqueda: estado exacto, atajo "sin factura" y nombre case-insensitive.
const rows = [
  status({client_name: 'Alfa SA', payment_status: 'late', has_invoice: false}),
  status({client_name: 'beta', payment_status: 'up_to_date', has_invoice: true}),
  status({client_name: 'Gamma', payment_status: 'severe', has_invoice: true}),
];
assert.deepEqual(filterMoraClients(rows, '', '').map(row => row.client_name), ['Alfa SA', 'beta', 'Gamma']);
assert.deepEqual(filterMoraClients(rows, 'late', '').map(row => row.client_name), ['Alfa SA']);
assert.deepEqual(filterMoraClients(rows, 'no_invoice', '').map(row => row.client_name), ['Alfa SA']);
assert.deepEqual(filterMoraClients(rows, '', 'ALFA').map(row => row.client_name), ['Alfa SA'], 'la búsqueda ignora mayúsculas');
assert.deepEqual(filterMoraClients(rows, 'severe', ' beta ').map(row => row.client_name), [], 'filtro y búsqueda se combinan');

// Chips de antigüedad: vacío sin mora, tramos en 15/30.
assert.equal(moraAgeKey(0), '');
assert.equal(moraAgeKey(-3), '');
assert.equal(moraAgeKey(1), 'early');
assert.equal(moraAgeKey(15), 'early');
assert.equal(moraAgeKey(16), 'medium');
assert.equal(moraAgeKey(30), 'medium');
assert.equal(moraAgeKey(31), 'critical');
assert.deepEqual(MORA_AGE_LABELS, {early: '1–15 días', medium: '16–30 días', critical: '+30 días'});

console.log('PASS mora data: buckets por antigüedad, DSO por moneda, semáforo de cobranza, filtros y chips');
