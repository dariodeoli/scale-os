const timeZone = 'America/Asuncion';

/** True when a date is overdue or falls within the next calendar week. */
export function hasDueWarning(value: string | null | undefined, days = 7) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const due = new Date(`${raw.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date(`${new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())}T12:00:00Z`);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000) <= days;
}
