import {diasHasta} from 'owncoding-ui/utils';
import {fechaLista} from 'owncoding-ui';
import {money} from './money-format';

/**
 * Alias histórico de los agregados de KPI: un dato, un formato. Antes redondeaba
 * los decimales de toda moneda no-PYG y el mismo saldo se veía distinto en la
 * tarjeta y en el KPI; ahora comparte el formateador único de la app.
 */
export const moneyKpi = money;

/** Día calendario de Asunción (YYYY-MM-DD) para hoy; fuente única del dominio. */
export function todayAsuncion(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

/** Mes calendario de Asunción (YYYY-MM) para hoy; fuente única del dominio. */
export function currentAsuncionMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit' }).formatToParts(now);
  return ['year', 'month'].map((type) => parts.find((part) => part.type === type)!.value).join('-');
}

export function clientSince(value?: string): string | null {
  return value ? new Intl.DateTimeFormat('es-PY', { month: 'short', year: 'numeric', timeZone: 'America/Asuncion' }).format(new Date(value)) : null;
}

/**
 * Etiquetas de fecha de la ficha con su fuente única (#145). «Cliente desde»
 * es el alta real; la fecha real de relación sólo se devuelve aparte cuando su
 * etiqueta difiere de la del alta (si coincide, repetirla sería ruido). El
 * formato y el huso salen de `fechaLista` (librería), que además distingue
 * fechas de calendario de timestamps: la misma fecha en todas las secciones.
 */
export function clientDateSummary(input: { createdAt?: string | null; relationshipStartedOn?: string | null }): { since: string | null; relationship: string | null } {
  const label = (value?: string | null) => {const text = value ? fechaLista(value, '', { timeZone: 'America/Asuncion', hora: '' }) : ''; return text || null;};
  const since = label(input.createdAt);
  const relationship = label(input.relationshipStartedOn);
  return { since, relationship: relationship && relationship !== since ? relationship : null };
}

/**
 * Whole calendar days from today (Asunción) until a date or timestamp; negative
 * when already past, null when missing or invalid. La cuenta por día de
 * calendario sale de `diasHasta` de la librería (una sola definición de
 * vencimiento en la app), no de una copia local.
 */
export function daysUntil(value: string | null | undefined, now: Date = new Date()): number | null {
  return diasHasta(value, {hoy: now, timeZone: 'America/Asuncion'});
}

export function clientPortfolioStats(
  clients: { id: string }[],
  projects: { id: string; client_id: string; status: string; active?: boolean }[],
  orders: { status: string; project_id: string; due_date?: string | null }[],
) {
  const stats = new Map<string, { projects: number; pieces: number; nextDue: string | null }>();
  for (const client of clients) stats.set(String(client.id), { projects: 0, pieces: 0, nextDue: null });
  for (const project of projects) {
    const entry = stats.get(String(project.client_id));
    if (entry && project.status === 'active' && project.active !== false) entry.projects += 1;
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
