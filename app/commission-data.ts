/**
 * Capa de datos de Comisiones (`/equipo/comisiones`).
 *
 * Tipos del contrato real (`GET /api/agency/commissions[/monthly]`, `GET /api/agency/payouts`,
 * `GET /api/agency/referral-discounts`) y agregados puros por moneda/estado.
 *
 * Hoy la sección vive dentro de `app/operations.tsx` (compartido con Equipo, dueño
 * SOS-PLT): este módulo es la fuente que el rediseño de FIN (#45) adopta al extraer
 * la sección, sin tocar el modo personas. Se valida con `tests/commission-data.test.ts`.
 */

export type CommissionKind = 'sales' | 'referral';
export type CommissionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type CommissionBasis = 'fixed' | 'invoiced' | 'collected';

/** Fila de `GET /api/agency/commissions` (tabla `agency_commissions` + factura y colaborador). */
export type Commission = {
  id: string;
  kind: CommissionKind;
  beneficiary_name: string;
  amount: string;
  currency: string;
  basis: CommissionBasis;
  base_amount: string | null;
  percentage: string | null;
  status: CommissionStatus;
  due_on: string | null;
  paid_on: string | null;
  notes: string | null;
  created_at: string;
  collaborator_id: string | null;
  collaborator_name: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
};

/** Fila de `GET /api/agency/commissions/monthly?month=`. */
export type MonthlyCommission = {
  recipient_id: string | null;
  name: string | null;
  currency: string;
  expected_amount: string | number;
  recorded_amount: string | number;
  approved_amount: string | number;
  paid_amount: string | number;
  pending_amount: string | number;
};

/** Fila de `GET /api/agency/payouts` (egresos registrados). */
export type Payout = {
  id: string;
  collaborator_id: string | null;
  commission_id: string | null;
  account_id: string;
  account_name: string;
  collaborator_name: string | null;
  beneficiary_name: string | null;
  amount: string;
  currency: string;
  paid_on: string;
  reference: string;
  created_by_email: string | null;
};

/** Fila de `GET /api/agency/referral-discounts`. */
export type ReferralDiscount = {
  id: string;
  invoice_id: string;
  referrer: string;
  amount: string;
  currency: string;
  reason: string;
  status: 'applied' | 'reversed';
  invoice_number: string;
  client_name: string;
  created_by_user_id?: string | null;
  created_at?: string;
};

export const COMMISSION_STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
};

export const COMMISSION_KIND_LABELS: Record<CommissionKind, string> = {
  sales: 'Venta',
  referral: 'Referido',
};

export const COMMISSION_FILTERS = ['all', 'pending', 'approved', 'paid', 'cancelled'] as const;
export type CommissionFilter = typeof COMMISSION_FILTERS[number];

export function commissionStatusLabel(status: string): string {
  return COMMISSION_STATUS_LABELS[status as CommissionStatus] || status;
}

export function commissionKindLabel(kind: string): string {
  return COMMISSION_KIND_LABELS[kind as CommissionKind] || kind;
}

export function filterCommissions(commissions: readonly Commission[], filter: CommissionFilter): Commission[] {
  return filter === 'all' ? [...commissions] : commissions.filter(commission => commission.status === filter);
}

/** Conteo por estado del listado (siempre incluye los cuatro estados). */
export function commissionStatusCounts(commissions: readonly Commission[]): Record<CommissionStatus, number> {
  const counts: Record<CommissionStatus, number> = {pending: 0, approved: 0, paid: 0, cancelled: 0};
  for (const commission of commissions) if (commission.status in counts) counts[commission.status] += 1;
  return counts;
}

export type MonthlyCommissionTotal = {
  currency: string;
  expected: number;
  recorded: number;
  approved: number;
  paid: number;
  pending: number;
};

/**
 * Totales de la liquidación del mes por moneda (suma de la tabla por colaborador).
 * Nunca convierte ni mezcla monedas distintas.
 */
export function monthlyCommissionTotals(records: readonly MonthlyCommission[]): MonthlyCommissionTotal[] {
  const totals = new Map<string, MonthlyCommissionTotal>();
  for (const record of records) {
    const total = totals.get(record.currency) || {currency: record.currency, expected: 0, recorded: 0, approved: 0, paid: 0, pending: 0};
    total.expected += Number(record.expected_amount);
    total.recorded += Number(record.recorded_amount);
    total.approved += Number(record.approved_amount);
    total.paid += Number(record.paid_amount);
    total.pending += Number(record.pending_amount);
    totals.set(record.currency, total);
  }
  return Array.from(totals.values());
}

/** Texto de la base de cálculo, igual al que hoy arma la tarjeta de comisión. */
export function commissionBasisText(
  commission: Pick<Commission, 'basis' | 'percentage' | 'base_amount' | 'currency'>,
  format: (value: string | number, currency: string) => string,
): string {
  if (commission.basis === 'fixed') return 'Importe fijo';
  return `${commission.percentage}% sobre ${format(commission.base_amount || 0, commission.currency)} ${commission.basis === 'collected' ? 'cobrados' : 'facturados'} al registrar`;
}

export function referralDiscountStatusLabel(status: string): string {
  return status === 'applied' ? 'Aplicado' : 'Revertido';
}

/** Acciones disponibles por estado de una comisión (nunca se muestran deshabilitadas). */
export function commissionActions(status: CommissionStatus): {approve: boolean; pay: boolean; cancel: boolean} {
  return {
    approve: status === 'pending',
    pay: status === 'approved',
    cancel: status === 'pending' || status === 'approved',
  };
}
