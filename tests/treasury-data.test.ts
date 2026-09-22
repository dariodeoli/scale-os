import assert from 'node:assert/strict';
import {matchingMovements, movementValue, normalizeReconciliation, reconciliationPending, transferPreview, type StatementLine, type StatementMovement} from '../app/treasury-data';
import {parseStatementCsv} from '../app/statement-csv';

const line = (over: Partial<StatementLine> = {}): StatementLine => ({
  id: '1',
  account_id: '5',
  external_id: 'EXT-1',
  booked_on: '2026-09-10',
  amount: '-150.50',
  reference: 'Pago proveedor',
  match_id: null,
  matched_by_user_id: null,
  movement_type: null,
  movement_id: null,
  ...over,
});
const movement = (over: Partial<StatementMovement> = {}): StatementMovement => ({
  account_id: '5',
  movement_type: 'payment',
  movement_id: '9',
  booked_on: '2026-09-10',
  amount: '-150.50',
  reference: 'Cobro',
  ...over,
});

// --- Normalizador de conciliación ------------------------------------------
const payload = {
  lines: [
    {id: 1, account_id: '5', external_id: 'EXT-1', booked_on: '2026-09-10', amount: '-150.50', reference: 'Pago proveedor', match_id: null},
    {id: 2, account_id: '5', external_id: 'EXT-2', booked_on: '2026-09-11', amount: 300, reference: '', match_id: '8', matched_by_user_id: 4, movement_type: 'payment', movement_id: '7'},
    {id: 3, account_id: '5', external_id: 'EXT-3'}, // sin fecha ni importe: se descarta
    'basura',
  ],
  movements: [
    {account_id: '5', movement_type: 'transfer_out', movement_id: '3', booked_on: '2026-09-09', amount: '-150.50', reference: 'Traspaso'},
    {account_id: '5', movement_type: 'payment'}, // sin id ni importe: se descarta
  ],
};
const normalized = normalizeReconciliation(payload);
assert.equal(normalized.lines.length, 2, 'las filas incompletas no entran');
assert.deepEqual(normalized.lines[0], line(), 'numérico se transporta como string y match ausente queda en null');
assert.deepEqual(normalized.lines[1], line({id: '2', external_id: 'EXT-2', booked_on: '2026-09-11', amount: '300', reference: '', match_id: '8', matched_by_user_id: '4', movement_type: 'payment', movement_id: '7'}));
assert.equal(normalized.movements.length, 1);
assert.deepEqual(normalized.movements[0], movement({movement_type: 'transfer_out', movement_id: '3', booked_on: '2026-09-09', reference: 'Traspaso'}));
assert.deepEqual(normalizeReconciliation(null), {lines: [], movements: []}, 'sin payload no se rompe');
assert.deepEqual(normalizeReconciliation({lines: [], movements: []}), {lines: [], movements: []});

// `match_id` vacío no equivale a conciliado.
const blankMatch = normalizeReconciliation({lines: [{id: '1', external_id: 'E', booked_on: '2026-09-01', amount: '1', match_id: ''}], movements: []});
assert.equal(blankMatch.lines[0].match_id, '', 'string vacío se conserva tal cual (no se inventa un match)');

// --- Pendientes, candidatos y valor del movimiento --------------------------
const lines = [line(), line({id: '2', match_id: '8'}), line({id: '3', amount: '75'})];
assert.equal(reconciliationPending(lines), 2, 'las conciliadas no cuentan como pendientes');
assert.equal(reconciliationPending([]), 0);
const candidates = matchingMovements(line(), [
  movement(),
  movement({movement_id: '10', amount: '-150.50'}),
  movement({movement_id: '11', amount: '150.50'}), // mismo valor absoluto, signo distinto: no es candidato
  movement({movement_id: '12', amount: '-1'}),
]);
assert.deepEqual(candidates.map(item => item.movement_id), ['9', '10'], 'el cruce exige importe firmado idéntico');
assert.deepEqual(matchingMovements(null, [movement()]), [], 'sin fila no hay candidatos');
assert.equal(movementValue(movement()), 'payment:9');
assert.equal(movementValue(movement({movement_type: 'transfer_out', movement_id: '3'})), 'transfer_out:3');

// --- Transferencias ----------------------------------------------------------
assert.deepEqual(transferPreview({fromCurrency: 'PYG', toCurrency: 'PYG', amount: '100', receivedAmount: '100'}), {mismatch: false, rate: null}, 'misma moneda con importes iguales');
assert.deepEqual(transferPreview({fromCurrency: 'PYG', toCurrency: 'PYG', amount: '100', receivedAmount: '99'}), {mismatch: true, rate: null}, 'misma moneda con importes distintos es error');
assert.deepEqual(transferPreview({fromCurrency: 'USD', toCurrency: 'PYG', amount: '100', receivedAmount: '730000'}), {mismatch: false, rate: 7300}, 'entre monedas el tipo de cambio sale de los importes reales');
assert.deepEqual(transferPreview({fromCurrency: 'USD', toCurrency: 'PYG', amount: '0', receivedAmount: '730000'}), {mismatch: false, rate: null}, 'sin importe de salida no hay tasa');
assert.deepEqual(transferPreview({fromCurrency: null, toCurrency: 'PYG', amount: '100', receivedAmount: '200'}), {mismatch: false, rate: null}, 'sin cuenta de origen no hay tasa ni error de moneda');
assert.equal(transferPreview({fromCurrency: 'PYG', toCurrency: 'PYG', amount: '0', receivedAmount: '0'}).mismatch, false, 'dos ceros en la misma moneda no son un error de validación');

// --- CSV de extracto --------------------------------------------------------
const parsed = parseStatementCsv('id,fecha,importe,referencia\r\n"a,1",2026-09-01,10.50,"Pago, parcial"\nB-2,2026-09-02,-3,Reversión\n');
assert.deepEqual(parsed, [
  {external_id: 'a,1', booked_on: '2026-09-01', amount: '10.50', reference: 'Pago, parcial'},
  {external_id: 'B-2', booked_on: '2026-09-02', amount: '-3', reference: 'Reversión'},
]);
assert.deepEqual(parseStatementCsv('\uFEFFid,fecha,importe,referencia\nx,2026-09-01,1,\n'), [{external_id: 'x', booked_on: '2026-09-01', amount: '1', reference: ''}], 'el BOM no rompe el encabezado');
assert.throws(() => parseStatementCsv('id,fecha,monto,referencia\nx,2026-09-01,1,\n'), /Encabezado requerido/);
assert.throws(() => parseStatementCsv('id,fecha,importe,referencia\nx,2026-09-01,0,\n'), /Fila 2/, 'importe cero no es un movimiento');
assert.throws(() => parseStatementCsv('id,fecha,importe,referencia\nx,2026-09-01,1,\nx,2026-09-02,2,\n'), /Fila 3/, 'el ID debe ser único');
assert.throws(() => parseStatementCsv('id,fecha,importe,referencia\n'), /entre 1 y 1.000/);
assert.throws(() => parseStatementCsv(`id,fecha,importe,referencia\n${Array.from({length: 1001}, (_, index) => `x${index},2026-09-01,1,`).join('\n')}`), /entre 1 y 1.000/);
assert.throws(() => parseStatementCsv('id,fecha,importe,referencia\nx,2026-9-1,1,\n'), /Fila 2/, 'la fecha exige YYYY-MM-DD');

console.log('PASS treasury data: conciliación normalizada, candidatos por importe firmado, transferencias y CSV de extracto');
