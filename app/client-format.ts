export function moneyKpi(value: number, currency: string) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function clientSince(value?: string): string | null {
  return value ? new Intl.DateTimeFormat('es-PY', { month: 'short', year: 'numeric' }).format(new Date(value)) : null;
}

export function clientPortfolioStats(
  clients: { id: string }[],
  projects: { id: string; client_id: string; status: string }[],
  orders: { status: string; project_id: string; due_date?: string | null }[],
) {
  const stats = new Map<string, { projects: number; pieces: number; nextDue: string | null }>();
  for (const client of clients) stats.set(String(client.id), { projects: 0, pieces: 0, nextDue: null });
  for (const project of projects) {
    const entry = stats.get(String(project.client_id));
    if (entry && project.status === 'active') entry.projects += 1;
  }
  for (const order of orders) {
    if (['approved', 'published'].includes(order.status)) continue;
    const project = projects.find(candidate => String(candidate.id) === String(order.project_id));
    if (!project) continue;
    const entry = stats.get(String(project.client_id));
    if (!entry) continue;
    entry.pieces += 1;
    const due = order.due_date ? String(order.due_date).slice(0, 10) : null;
    if (due && (!entry.nextDue || due < entry.nextDue)) entry.nextDue = due;
  }
  return stats;
}
