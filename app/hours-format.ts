/**
 * Horas en formato humano (Refs #151). El API devuelve las horas como número o
 * como texto decimal de Postgres (`3.00`, `2.50`); la interfaz nunca muestra
 * decimales vacíos: `3`, `2,5`. Un formato, un solo lugar.
 */
const HOURS_FORMAT = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 2 });

/** `3.00` → `3`; `2.50` → `2,5`; vacío o inválido → `null`. */
export function humanHours(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return HOURS_FORMAT.format(numeric);
}

/** Etiqueta de una sola cifra: `3 h`; `null` cuando no hay dato. */
export function hoursText(value: string | number | null | undefined): string | null {
  const label = humanHours(value);
  return label === null ? null : `${label} h`;
}

/** Resumen de una pieza: `3 h est. · 2 h reales`; `null` cuando no hay horas. */
export function hoursSummary(estimated: string | number | null | undefined, actual: string | number | null | undefined): string | null {
  const estimatedLabel = humanHours(estimated);
  const actualLabel = humanHours(actual);
  return [estimatedLabel ? `${estimatedLabel} h est.` : '', actualLabel ? `${actualLabel} h reales` : ''].filter(Boolean).join(' · ') || null;
}
