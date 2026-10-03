// Formato único de mes largo de la app: `Octubre 2026` (es-PY, Asunción, 24 h).
// Módulo puro (sin React ni CSS) para que las capas de datos de Previsión e
// Informes compartan una sola implementación de Intl.
const timeZone = 'America/Asuncion';

/** `2026-10` → `Octubre 2026`; `null` cuando no hay mes válido. */
export function listMonthLabel(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})/.exec(String(value || ''));
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-01T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  const label = new Intl.DateTimeFormat('es-PY', {timeZone, month: 'long', year: 'numeric'}).format(date).replace(/\s+de\s+/i, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}
