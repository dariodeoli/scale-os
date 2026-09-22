import type {Currency} from './currencies';

/**
 * Capa de datos de Cobranza y mora (`/pagos/mora`).
 *
 * La lógica vivía dentro de `scale-workspace.tsx` (sección Mora). Se extrajo acá
 * como normalizadores/funciones puras para que el rediseño de FIN (#45) y la
 * descomposición del shell (#47) la adopten sin depender del monolito.
 * Mientras el shell siga siendo el dueño de la sección, este módulo no se importa
 * desde la app: se valida con `tests/mora-data.test.ts`.
 */

/** Fila de `GET /api/agency/client-payment-status` (vista `client_payment_status`). */
export type ClientPaymentStatus = {
  client_id: string;
  client_name: string;
  currency: Currency | null;
  outstanding_amount: string;
  next_due_on: string | null;
  days_overdue: number;
  payment_status: 'up_to_date' | 'due_soon' | 'late' | 'severe';
  invoice_count: number;
  has_invoice: boolean;
};

/** Reporte mínimo que necesita el DSO (`GET /api/agency/reports?month&months`). */
export type MoraReports = {
  month: string;
  months: {month: string; financial: {currency: string; invoiced: string | number}[]}[];
};

export type MoraBucketKey = 'early' | 'medium' | 'critical';

export type MoraBucketSpec = {key: MoraBucketKey; label: string; min: number; max: number};

/** Cortes de antigüedad de la vista (mismos rótulos que la sección actual). */
export const MORA_BUCKETS: readonly MoraBucketSpec[] = [
  {key: 'early', label: 'Mora 1–15 días', min: 1, max: 15},
  {key: 'medium', label: 'Mora 16–30 días', min: 16, max: 30},
  {key: 'critical', label: 'Mora crítica (+30 días)', min: 31, max: Infinity},
];

export type MoraBucket = MoraBucketSpec & {clients: number; amounts: {currency: string; amount: number}[]};

/**
 * Buckets 1–15 / 16–30 / +30 por antigüedad. Solo suma saldos vencidos con
 * moneda conocida (`outstanding_amount > 0` y `days_overdue > 0`); los montos se
 * agrupan por moneda sin convertir ni mezclar, conservando el orden de aparición.
 */
export function buildMoraBuckets(statuses: readonly ClientPaymentStatus[]): MoraBucket[] {
  const buckets = MORA_BUCKETS.map(spec => ({...spec, clients: 0, amounts: new Map<string, number>()}));
  for (const client of statuses) {
    if (!client.currency || Number(client.outstanding_amount) <= 0 || client.days_overdue <= 0) continue;
    const bucket = buckets.find(item => client.days_overdue >= item.min && client.days_overdue <= item.max);
    if (!bucket) continue;
    bucket.clients += 1;
    bucket.amounts.set(client.currency, (bucket.amounts.get(client.currency) || 0) + Number(client.outstanding_amount));
  }
  return buckets.map(({amounts, ...bucket}) => ({
    ...bucket,
    amounts: Array.from(amounts, ([currency, amount]) => ({currency, amount})),
  }));
}

export type MoraDsoRow = {currency: string; days: number};

/**
 * DSO por moneda: saldo pendiente total sobre lo facturado del mes × 30.
 * Devuelve `null` cuando no hay reporte (mismo contrato que la UI: "Sin datos").
 * Una moneda entra solo si el mes tiene facturación > 0 y hay saldo pendiente.
 */
export function moraDsoDays(
  statuses: readonly ClientPaymentStatus[],
  reports: MoraReports | null,
): MoraDsoRow[] | null {
  if (!reports) return null;
  const current = reports.months.find(month => month.month === reports.month) || reports.months[0];
  if (!current) return null;
  const outstanding = new Map<string, number>();
  for (const client of statuses) {
    if (!client.currency || Number(client.outstanding_amount) <= 0) continue;
    outstanding.set(client.currency, (outstanding.get(client.currency) || 0) + Number(client.outstanding_amount));
  }
  const rows: MoraDsoRow[] = [];
  for (const financial of current.financial) {
    const invoiced = Number(financial.invoiced);
    const owed = outstanding.get(financial.currency);
    if (!Number.isFinite(invoiced) || invoiced <= 0 || owed === undefined || owed <= 0) continue;
    rows.push({currency: financial.currency, days: Math.max(0, Math.round((owed / invoiced) * 30))});
  }
  return rows;
}

export type MoraKpis = {alDia: number; porVencer: number; enMora: number; sinFactura: number};

/** Semáforo por estado de cobro: al día, por vencer, en mora (late+severe) y sin factura. */
export function moraKpis(statuses: readonly ClientPaymentStatus[]): MoraKpis {
  let alDia = 0, porVencer = 0, enMora = 0, sinFactura = 0;
  for (const client of statuses) {
    if (client.payment_status === 'up_to_date') alDia += 1;
    else if (client.payment_status === 'due_soon') porVencer += 1;
    else if (client.payment_status === 'late' || client.payment_status === 'severe') enMora += 1;
    if (!client.has_invoice) sinFactura += 1;
  }
  return {alDia, porVencer, enMora, sinFactura};
}

export type MoraFilter = '' | ClientPaymentStatus['payment_status'] | 'no_invoice';

/** Filtro por estado (o "sin factura") + búsqueda por nombre de cliente. */
export function filterMoraClients(
  statuses: readonly ClientPaymentStatus[],
  filter: MoraFilter,
  search: string,
): ClientPaymentStatus[] {
  const byFilter = filter === 'no_invoice'
    ? statuses.filter(client => !client.has_invoice)
    : filter
      ? statuses.filter(client => client.payment_status === filter)
      : statuses;
  const query = search.trim().toLowerCase();
  return query ? byFilter.filter(client => client.client_name.toLowerCase().includes(query)) : [...byFilter];
}

export const MORA_AGE_LABELS: Record<MoraBucketKey, string> = {
  early: '1–15 días',
  medium: '16–30 días',
  critical: '+30 días',
};

/** Antigüedad en días → tramo del chip. `''` cuando no hay mora que pintar. */
export function moraAgeKey(days: number): MoraBucketKey | '' {
  if (!Number.isFinite(days) || days <= 0) return '';
  return days > 30 ? 'critical' : days > 15 ? 'medium' : 'early';
}
