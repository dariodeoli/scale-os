/**
 * Capa de datos de tesorería: conciliación por extracto y transferencias.
 *
 * Tipos del contrato real (`GET /api/agency/reconciliation`, `GET /api/agency/transfers`)
 * y normalizadores puros. El estado de la conciliación vive en
 * `app/use-reconciliation.ts`; el parseo del CSV sigue en `app/statement-csv.ts`.
 */

export type TreasuryAccount = {id: string; name: string; currency: string; active?: boolean; balance?: string};

/** Fila de extracto conciliable (`agency_statement_lines` + el match aplicado). */
export type StatementLine = {
  id: string;
  account_id: string;
  external_id: string;
  booked_on: string;
  amount: string;
  reference: string;
  match_id: string | null;
  matched_by_user_id: string | null;
  movement_type: string | null;
  movement_id: string | null;
};

/** Movimiento registrado candidato a conciliar (`agency_cash_movements`). */
export type StatementMovement = {
  account_id: string;
  movement_type: string;
  movement_id: string;
  booked_on: string;
  amount: string;
  reference: string;
};

export type ReconciliationData = {lines: StatementLine[]; movements: StatementMovement[]};

const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string';
const isTextOrNumber = (value: unknown): value is string | number => typeof value === 'string' || typeof value === 'number';
const optionalText = (value: unknown): string | null => value === undefined || value === null ? null : String(value);
const text = (value: unknown, fallback = ''): string => value === undefined || value === null ? fallback : String(value);

const isStatementLineInput = (row: unknown): row is Record<string, unknown> =>
  isRecord(row) && isTextOrNumber(row.id) && isText(row.external_id) && row.external_id.trim() !== '' && isText(row.booked_on) && row.booked_on.trim() !== '' && isTextOrNumber(row.amount);
const isStatementMovementInput = (row: unknown): row is Record<string, unknown> =>
  isRecord(row) && isText(row.movement_type) && row.movement_type.trim() !== '' && isTextOrNumber(row.movement_id) && isText(row.booked_on) && row.booked_on.trim() !== '' && isTextOrNumber(row.amount);

/**
 * Normaliza la respuesta de conciliación: descarta filas que no cumplen el
 * contrato, tipa montos como string y deja `match_id` en `null` cuando la fila
 * todavía no está conciliada (el string vacío nunca cuenta como match).
 */
export function normalizeReconciliation(value: unknown): ReconciliationData {
  const payload = isRecord(value) ? value : {};
  const lines = (Array.isArray(payload.lines) ? payload.lines : []).filter(isStatementLineInput).map((row): StatementLine => ({
    id: text(row.id),
    account_id: text(row.account_id),
    external_id: text(row.external_id),
    booked_on: text(row.booked_on),
    amount: text(row.amount),
    reference: text(row.reference),
    match_id: optionalText(row.match_id),
    matched_by_user_id: optionalText(row.matched_by_user_id),
    movement_type: isText(row.movement_type) ? row.movement_type : null,
    movement_id: optionalText(row.movement_id),
  }));
  const movements = (Array.isArray(payload.movements) ? payload.movements : []).filter(isStatementMovementInput).map((row): StatementMovement => ({
    account_id: text(row.account_id),
    movement_type: text(row.movement_type),
    movement_id: text(row.movement_id),
    booked_on: text(row.booked_on),
    amount: text(row.amount),
    reference: text(row.reference),
  }));
  return {lines, movements};
}

/** Filas del extracto que todavía no tienen movimiento vinculado. */
export function reconciliationPending(lines: readonly StatementLine[]): number {
  return lines.filter(line => !line.match_id).length;
}

/** Movimientos del mismo importe firmado que pueden vincularse a la fila. */
export function matchingMovements(line: StatementLine | null, movements: readonly StatementMovement[]): StatementMovement[] {
  if (!line) return [];
  return movements.filter(movement => Number(movement.amount) === Number(line.amount));
}

/** Identificador estable del movimiento para el payload de match/unmatch. */
export function movementValue(movement: StatementMovement): string {
  return `${movement.movement_type}:${movement.movement_id}`;
}

export type TransferPreview = {mismatch: boolean; rate: number | null};

/**
 * Reglas del formulario de transferencias: en la misma moneda los importes deben
 * coincidir; entre monedas distintas el tipo de cambio se deriva de los importes
 * reales de salida y entrada (nunca se inventa).
 */
export function transferPreview({fromCurrency,toCurrency,amount,receivedAmount}:{fromCurrency?: string | null;toCurrency?: string | null;amount: string;receivedAmount: string}): TransferPreview {
  const sameCurrency = !!fromCurrency && fromCurrency === toCurrency;
  const mismatch = sameCurrency && Number(amount) !== Number(receivedAmount);
  const rate = fromCurrency && toCurrency && fromCurrency !== toCurrency && Number(amount) > 0 && Number(receivedAmount) > 0
    ? Number(receivedAmount) / Number(amount)
    : null;
  return {mismatch, rate};
}
