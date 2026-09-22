import assert from 'node:assert/strict';
import {
  COMMISSION_FILTERS,
  commissionActions,
  commissionBasisText,
  commissionKindLabel,
  commissionStatusCounts,
  commissionStatusLabel,
  filterCommissions,
  monthlyCommissionTotals,
  referralDiscountStatusLabel,
  type Commission,
} from '../app/commission-data';

const commission = (over: Partial<Commission> = {}): Commission => ({
  id: '1',
  kind: 'sales',
  beneficiary_name: 'Vendedora',
  amount: '150000',
  currency: 'PYG',
  basis: 'fixed',
  base_amount: null,
  percentage: null,
  status: 'pending',
  due_on: null,
  paid_on: null,
  notes: null,
  created_at: '2026-09-01T12:00:00Z',
  collaborator_id: null,
  collaborator_name: null,
  invoice_id: null,
  invoice_number: null,
  ...over,
});

// --- Etiquetas y filtros ----------------------------------------------------
assert.deepEqual(COMMISSION_FILTERS, ['all', 'pending', 'approved', 'paid', 'cancelled']);
assert.equal(commissionStatusLabel('paid'), 'Pagada');
assert.equal(commissionStatusLabel('raro'), 'raro', 'un estado nuevo no se traduce a ciegas');
assert.equal(commissionKindLabel('sales'), 'Venta');
assert.equal(commissionKindLabel('referral'), 'Referido');
assert.equal(referralDiscountStatusLabel('applied'), 'Aplicado');
assert.equal(referralDiscountStatusLabel('reversed'), 'Revertido');

const list = [commission({id: '1', status: 'pending'}), commission({id: '2', status: 'approved', currency: 'USD'}), commission({id: '3', status: 'paid'}), commission({id: '4', status: 'cancelled'}), commission({id: '5', status: 'pending'})];
assert.deepEqual(filterCommissions(list, 'all').map(item => item.id), ['1', '2', '3', '4', '5']);
assert.notEqual(filterCommissions(list, 'all'), list, 'el filtro no expone la lista original');
assert.deepEqual(filterCommissions(list, 'pending').map(item => item.id), ['1', '5']);
assert.deepEqual(filterCommissions(list, 'paid').map(item => item.id), ['3']);
assert.deepEqual(commissionStatusCounts(list), {pending: 2, approved: 1, paid: 1, cancelled: 1});
assert.deepEqual(commissionStatusCounts([]), {pending: 0, approved: 0, paid: 0, cancelled: 0});

// --- Acciones por estado (nunca deshabilitadas) -----------------------------
assert.deepEqual(commissionActions('pending'), {approve: true, pay: false, cancel: true});
assert.deepEqual(commissionActions('approved'), {approve: false, pay: true, cancel: true});
assert.deepEqual(commissionActions('paid'), {approve: false, pay: false, cancel: false});
assert.deepEqual(commissionActions('cancelled'), {approve: false, pay: false, cancel: false});

// --- Liquidación del mes por moneda ----------------------------------------
const monthly = [
  {recipient_id: '1', name: 'Ana', currency: 'PYG', expected_amount: '100000', recorded_amount: 50000, approved_amount: '25000', paid_amount: 0, pending_amount: '25000'},
  {recipient_id: '2', name: 'Luis', currency: 'PYG', expected_amount: '60000', recorded_amount: '10000', approved_amount: '10000', paid_amount: '10000', pending_amount: '0'},
  {recipient_id: '3', name: 'Sofía', currency: 'USD', expected_amount: 300, recorded_amount: '150', approved_amount: '0', paid_amount: '0', pending_amount: '150'},
];
const totals = monthlyCommissionTotals(monthly);
assert.deepEqual(totals, [
  {currency: 'PYG', expected: 160000, recorded: 60000, approved: 35000, paid: 10000, pending: 25000},
  {currency: 'USD', expected: 300, recorded: 150, approved: 0, paid: 0, pending: 150},
], 'suma por moneda sin convertir ni mezclar');
assert.deepEqual(monthlyCommissionTotals([]), []);
assert.deepEqual(monthlyCommissionTotals([{recipient_id: null, name: null, currency: 'EUR', expected_amount: '10', recorded_amount: 0, approved_amount: 0, paid_amount: 0, pending_amount: 0}]), [{currency: 'EUR', expected: 10, recorded: 0, approved: 0, paid: 0, pending: 0}], 'la fila sin colaborador vinculado también suma');

// --- Base de cálculo de la tarjeta -----------------------------------------
const format = (value: string | number, currency: string) => `${currency} ${Number(value).toLocaleString('es-PY')}`;
assert.equal(commissionBasisText(commission(), format), 'Importe fijo');
assert.equal(commissionBasisText(commission({basis: 'invoiced', percentage: '10.00', base_amount: '150000'}), format), '10.00% sobre PYG 150.000 facturados al registrar');
assert.equal(commissionBasisText(commission({basis: 'collected', percentage: '5', base_amount: null}), format), '5% sobre PYG 0 cobrados al registrar', 'sin base registrada se muestra 0, nunca un dato inventado');

console.log('PASS commission data: estados, acciones, filtros, liquidación por moneda y base de cálculo');
