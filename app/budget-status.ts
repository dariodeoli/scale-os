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

// Filtros de la lista de Presupuestos (#185 F2/F3). Los KPI y la barra de
// filtros comparten este único estado: `expiring` es «vigencia en los próximos
// 7 días y todavía sin aceptar», la misma regla que el indicador del shell.
export type BudgetFilters = {status: '' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'expiring'; client: string; query: string};

export function budgetExpiresSoon(budget: {valid_until: string | null; status: string}, now = Date.now()) {
  if (!budget.valid_until || budget.status === 'accepted') return false;
  const until = new Date(budget.valid_until).getTime();
  return !Number.isNaN(until) && until >= now && until <= now + 7 * 86400000;
}

export function filterBudgets<T extends {number: string; title: string; client_name: string; status: string; valid_until: string | null}>(budgets: readonly T[], filters: BudgetFilters, now = Date.now()): T[] {
  const query = filters.query.trim().toLowerCase();
  return budgets.filter(budget => {
    if (filters.status === 'expiring' ? !budgetExpiresSoon(budget, now) : filters.status && budget.status !== filters.status) return false;
    if (filters.client && budget.client_name !== filters.client) return false;
    return !query || `${budget.number} ${budget.title} ${budget.client_name}`.toLowerCase().includes(query);
  });
}
