// Estado único de los presupuestos (SOS-COM): la lista y el detalle pintan el
// mismo chip y la misma etiqueta. Sin variantes paralelas.
export type BudgetTone = 'mute' | 'info' | 'ok' | 'bad' | 'warn';

export const BUDGET_STATE: Record<string, {label: string; tone: BudgetTone}> = {
  draft: {label: 'Borrador', tone: 'mute'},
  sent: {label: 'Enviado', tone: 'info'},
  accepted: {label: 'Aceptado', tone: 'ok'},
  rejected: {label: 'Rechazado', tone: 'bad'},
  expired: {label: 'Vencido', tone: 'warn'},
};

export function budgetState(status: unknown) {
  const key = String(status ?? '');
  return BUDGET_STATE[key] || {label: key || 'Sin estado', tone: 'mute' as BudgetTone};
}
