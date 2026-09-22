import {currencyCodes,type Currency} from './currencies';
import {listDateShort} from './list-format';

/**
 * Capa de datos de la Previsión financiera (`/pagos/prevision`).
 *
 * Tipos del contrato real (`GET /api/agency/forecast`, `GET /api/agency/accounts`,
 * `GET /api/agency/expenses`, `GET /api/agency/planned-expenses`), validadores y
 * agregados puros por moneda. El estado de carga vive en `app/use-forecast.ts`;
 * los diálogos y el JSX siguen en la vista.
 */

export type MoneyCurrency = Currency;
export type WholeTransport = string | number;
export type AggregateRow = {currency: MoneyCurrency; amount: WholeTransport};
export type PlannedExpenseRow = {currency: MoneyCurrency; amount: WholeTransport; expense_count: WholeTransport; fixed_count: WholeTransport; variable_count: WholeTransport};
export type RealAccountRow = {id: string | number; name: string; currency: MoneyCurrency; active: boolean; balance?: WholeTransport};
export type RealExpenseRow = {
  id: string | number;
  account_id: string | number;
  account_name: string;
  category: string;
  kind: string | null;
  amount: WholeTransport;
  currency: MoneyCurrency;
  paid_on: string;
  reference: string;
  created_by_email: string | null;
  created_by_user_id?: string | number | null;
  created_at?: string;
};

/** Fila de `GET /api/agency/planned-expenses` (listado individual del mes). */
export type PlannedExpenseRecord = {
  id: string;
  cadence: 'monthly' | 'recurring';
  effectiveMonth: string;
  category: string;
  amount: WholeTransport;
  currency: MoneyCurrency;
  note: string | null;
  kind: 'fixed' | 'variable' | null;
  createdByUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
export type PlannedExpensesPayload = {month: string; records: PlannedExpenseRecord[]; totals: AggregateRow[]};

export type ForecastRow = {currency: MoneyCurrency; issued_total: WholeTransport; accepted_uninvoiced_total: WholeTransport; expected_total: WholeTransport; invoice_count: WholeTransport; budget_count: WholeTransport; undated_budget_count: WholeTransport};
// `base_amount`/`override_amount` llegan en null cuando el rol no tiene salary.view:
// el API oculta el salario por persona y conserva identidad y agregados por moneda.
export type PersonnelMember = {collaborator_id: string | number; user_id?: string | number | null; name: string; photo_url?: string | null; compensation_type?: string | null; currency: MoneyCurrency; base_amount: WholeTransport | null; override_amount: WholeTransport | null};
export type PersonnelForecastRow = {currency: MoneyCurrency; included_headcount: WholeTransport; base_count: WholeTransport; base_amount: WholeTransport; override_count: WholeTransport; override_amount: WholeTransport; expected_end_of_month_expense: WholeTransport; members: PersonnelMember[]};
export type ProjectionRow = {month: string; currency: MoneyCurrency; projected_cash: WholeTransport; projected_result: WholeTransport; collected: WholeTransport; expected: WholeTransport; personnel: WholeTransport; planned_expenses: WholeTransport; commission_forecast: WholeTransport};
export type ContractedClientRow = {client_id: string | number; client_name: string; currency: MoneyCurrency; contracted_amount: WholeTransport; invoiced_amount: WholeTransport; invoice_required: boolean; missing_invoice: boolean; ends_on?: string | null};
export type ForecastData = {month: string; time_zone: string; records: ForecastRow[]; contracted_recurring: {month: string; records: AggregateRow[]}; invoiced: {month: string; records: AggregateRow[]}; collected_actual: {month: string; records: AggregateRow[]}; personnel: {month: string; included_headcount: WholeTransport; records: PersonnelForecastRow[]}; commission_forecast: {month: string; records: AggregateRow[]}; planned_expenses: {month: string; records: PlannedExpenseRow[]}; months?: WholeTransport; projection?: {months: WholeTransport; records: ProjectionRow[]}; opening_balance?: {month: string; records: AggregateRow[]}; contracted_clients?: {month: string; records: ContractedClientRow[]}; definition: {issued: string; accepted_uninvoiced: string; exclusions: string; contracted_recurring: string; invoiced: string; collected_actual: string; personnel: string; commission_forecast: string; planned_expenses: string; opening_balance?: string; projected_cash?: string; projected_result?: string; contracted_clients?: string}};

export const FORECAST_HORIZONS = ['1', '3', '6', '12'] as const;
export type Horizon = typeof FORECAST_HORIZONS[number];

// Las seis monedas de la empresa viajan por la previsión: facturas, presupuestos,
// colaboradores, cuentas, cobros y comisiones pueden estar en cualquiera de ellas.
export const isCurrency = (value: unknown): value is MoneyCurrency => typeof value === 'string' && currencyCodes.includes(value as Currency);
export const isWholeTransport = (value: unknown, allowZero = true): value is WholeTransport => typeof value === 'number' ? Number.isSafeInteger(value) && (allowZero ? value >= 0 : value > 0) : typeof value === 'string' && new RegExp(allowZero ? '^(?:0|[1-9]\\d*)$' : '^[1-9]\\d*$').test(value) && Number.isSafeInteger(Number(value));
export const isSignedWhole = (value: unknown): value is WholeTransport => typeof value === 'number' ? Number.isSafeInteger(value) : typeof value === 'string' && new RegExp('^-?(?:0|[1-9]\\d*)$').test(value) && Number.isSafeInteger(Number(value));
export const isPositiveInput = (value: string) => isWholeTransport(value, false);
export const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export const count = (value: unknown): number => isWholeTransport(value) ? Number(value) : 0;

export const aggregateRows = (value: unknown): AggregateRow[] => isRecord(value) && Array.isArray(value.records) ? value.records.filter((row): row is AggregateRow => isRecord(row) && isCurrency(row.currency) && isWholeTransport(row.amount)) : [];
export const plannedExpenseCounts = (value: unknown): PlannedExpenseRow[] => isRecord(value) && Array.isArray(value.records) ? value.records.filter((row): row is PlannedExpenseRow => isRecord(row) && isCurrency(row.currency) && isWholeTransport(row.amount) && isWholeTransport(row.expense_count) && isWholeTransport(row.fixed_count) && isWholeTransport(row.variable_count)) : [];
export const realAccounts = (value: unknown): RealAccountRow[] => isRecord(value) && Array.isArray(value.accounts) ? value.accounts.filter((row): row is RealAccountRow => isRecord(row) && (typeof row.id === 'string' || typeof row.id === 'number') && typeof row.name === 'string' && isCurrency(row.currency) && (row.active === true || row.active === false)) : [];
export const realExpenseRows = (value: unknown): RealExpenseRow[] => isRecord(value) && Array.isArray(value.expenses) ? value.expenses.filter((row): row is RealExpenseRow => isRecord(row) && (typeof row.id === 'string' || typeof row.id === 'number') && (typeof row.account_id === 'string' || typeof row.account_id === 'number') && typeof row.account_name === 'string' && typeof row.category === 'string' && (typeof row.kind === 'string' || row.kind === null) && isWholeTransport(row.amount) && isCurrency(row.currency) && typeof row.paid_on === 'string' && typeof row.reference === 'string') : [];

const validProjection = (data: Record<string, unknown>) => data.projection === undefined || (isRecord(data.projection) && Array.isArray(data.projection.records) && data.projection.records.every((row): row is ProjectionRow => isRecord(row) && typeof row.month === 'string' && isCurrency(row.currency) && isSignedWhole(row.projected_cash) && isSignedWhole(row.projected_result) && isWholeTransport(row.collected) && isWholeTransport(row.expected) && isWholeTransport(row.personnel) && isWholeTransport(row.planned_expenses) && isWholeTransport(row.commission_forecast)));
const validContractedClients = (data: Record<string, unknown>) => data.contracted_clients === undefined || (isRecord(data.contracted_clients) && Array.isArray(data.contracted_clients.records) && data.contracted_clients.records.every((row): row is ContractedClientRow => isRecord(row) && (typeof row.client_id === 'string' || typeof row.client_id === 'number') && typeof row.client_name === 'string' && isCurrency(row.currency) && isWholeTransport(row.contracted_amount) && isWholeTransport(row.invoiced_amount) && typeof row.invoice_required === 'boolean' && typeof row.missing_invoice === 'boolean' && (row.ends_on === undefined || row.ends_on === null || typeof row.ends_on === 'string')));
export function validForecast(data: unknown): data is ForecastData {if (!isRecord(data) || typeof data.month !== 'string' || typeof data.time_zone !== 'string' || !Array.isArray(data.records) || !isRecord(data.personnel) || !Array.isArray(data.personnel.records) || !isRecord(data.definition)) return false; const groups = ['contracted_recurring', 'invoiced', 'collected_actual', 'commission_forecast']; return groups.every(group => aggregateRows(data[group]).length === ((isRecord(data[group]) && Array.isArray(data[group].records)) ? data[group].records.length : -1)) && aggregateRows(data.planned_expenses).length === ((isRecord(data.planned_expenses) && Array.isArray(data.planned_expenses.records)) ? data.planned_expenses.records.length : -1) && data.records.every(row => isRecord(row) && isCurrency(row.currency) && isWholeTransport(row.issued_total) && isWholeTransport(row.accepted_uninvoiced_total) && isWholeTransport(row.expected_total) && isWholeTransport(row.invoice_count) && isWholeTransport(row.budget_count) && isWholeTransport(row.undated_budget_count)) && data.personnel.records.every(row => isRecord(row) && isCurrency(row.currency) && isWholeTransport(row.included_headcount) && isWholeTransport(row.base_count) && isWholeTransport(row.base_amount) && isWholeTransport(row.override_count) && isSignedWhole(row.override_amount) && isWholeTransport(row.expected_end_of_month_expense) && Array.isArray(row.members) && row.members.every(member => isRecord(member) && typeof member.name === 'string' && isCurrency(member.currency) && (member.base_amount === null || isWholeTransport(member.base_amount)) && (member.override_amount === null || isSignedWhole(member.override_amount)) && (member.photo_url === undefined || member.photo_url === null || typeof member.photo_url === 'string'))) && validProjection(data) && validContractedClients(data);}

/** Normaliza el listado individual de gastos planificados (contrato de `GET /api/agency/planned-expenses`). */
export function normalizePlannedExpenses(value: unknown): PlannedExpensesPayload | null {
  if (!isRecord(value) || typeof value.month !== 'string' || !Array.isArray(value.records) || !Array.isArray(value.totals)) return null;
  const records = value.records.filter((row): row is PlannedExpenseRecord => isRecord(row) && typeof row.id === 'string' && (row.cadence === 'monthly' || row.cadence === 'recurring') && typeof row.effectiveMonth === 'string' && typeof row.category === 'string' && isWholeTransport(row.amount) && isCurrency(row.currency) && (row.note === null || typeof row.note === 'string') && (row.kind === null || row.kind === 'fixed' || row.kind === 'variable'));
  const totals = aggregateRows({records: value.totals});
  if (records.length !== value.records.length || totals.length !== value.totals.length) return null;
  return {month: value.month, records, totals};
}

export function dateLabel(value: string): string {
  return /^\d{4}-\d{2}$/.test(value) ? listDateShort(`${value}-01`) || value : listDateShort(value) || value;
}

export function currentForecastMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit'}).formatToParts(now);
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export const todayAsuncion = () => {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}-${parts.find(part => part.type === 'day')!.value}`;
};

export const amountFor = (rows: AggregateRow[] | undefined, currency: MoneyCurrency) => rows?.find(row => row.currency === currency)?.amount;

export type ForecastAggregates = {contracted: AggregateRow[]; collected: AggregateRow[]; commissions: AggregateRow[]; expenses: AggregateRow[]};

/** Agregados segregados por columna del contrato (nunca se suman monedas). */
export function forecastAggregates(data: ForecastData): ForecastAggregates {
  return {
    contracted: aggregateRows(data.contracted_recurring),
    collected: aggregateRows(data.collected_actual),
    commissions: aggregateRows(data.commission_forecast),
    expenses: aggregateRows(data.planned_expenses),
  };
}

/** Monedas con algún dato del mes (registros, personal y agregados). */
export function financialCurrencies(data: ForecastData): MoneyCurrency[] {
  return Array.from(new Set([
    ...data.records.map(row => row.currency),
    ...data.personnel.records.map(row => row.currency),
    ...aggregateRows(data.contracted_recurring).map(row => row.currency),
    ...aggregateRows(data.collected_actual).map(row => row.currency),
    ...aggregateRows(data.commission_forecast).map(row => row.currency),
    ...aggregateRows(data.planned_expenses).map(row => row.currency),
  ]));
}

export function projectionCurrencies(data: ForecastData): MoneyCurrency[] {
  return data.projection ? Array.from(new Set(data.projection.records.map(row => row.currency))) : [];
}

/** Presupuestos aceptados sin fecha: se informan pero quedan fuera del total mensual. */
export function undatedBudgets(data: ForecastData): number {
  return data.records.reduce((sum, row) => sum + count(row.undated_budget_count), 0);
}

export function realExpenseTotal(rows: readonly RealExpenseRow[], currency: MoneyCurrency): number {
  return rows.filter(row => row.currency === currency).reduce((total, row) => total + Number(row.amount), 0);
}

export type PersonnelAmounts = {base: number | null; adjustment: number | null; total: number | null};

/** Salario base, ajuste del mes y cierre por persona; `null` es "Sin dato", nunca 0 fabricado. */
export function personnelAmounts(member: PersonnelMember): PersonnelAmounts {
  const base = member.base_amount === null ? null : Number(member.base_amount);
  const adjustment = member.override_amount === null ? null : Number(member.override_amount);
  return {base, adjustment, total: base === null || adjustment === null ? null : base + adjustment};
}

export type ForecastBalanceRow = {currency: MoneyCurrency; income: number; expense: number; result: number; max: number};

/**
 * Ingresos vs gastos del mes por moneda: ingresos = emitido + aceptado sin
 * factura; gastos = personal + comisiones + planificados + reales. `max` es la
 * escala relativa de las barras (nunca menor que 1).
 */
export function forecastBalanceRows(data: ForecastData, realExpenses: readonly RealExpenseRow[]): ForecastBalanceRow[] {
  const aggregates = forecastAggregates(data);
  return financialCurrencies(data).map(currency => {
    const row = data.records.find(item => item.currency === currency);
    const personnel = data.personnel.records.find(item => item.currency === currency);
    const income = Number(row?.issued_total || 0) + Number(row?.accepted_uninvoiced_total || 0);
    const expense = Number(personnel?.expected_end_of_month_expense || 0) + Number(amountFor(aggregates.commissions, currency) || 0) + Number(amountFor(aggregates.expenses, currency) || 0) + realExpenseTotal(realExpenses, currency);
    const result = income - expense;
    return {currency, income, expense, result, max: Math.max(1, income, expense, Math.abs(result))};
  });
}
