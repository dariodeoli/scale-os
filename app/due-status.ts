import {tonoVencimiento} from 'owncoding-ui/utils';

/**
 * True when a date is overdue or falls within the next calendar week.
 * El cálculo y el tono salen de `tonoVencimiento` de la librería (misma regla
 * que `list-format.dueTone` y `Vencimiento`), no de una copia local.
 */
export function hasDueWarning(value: string | null | undefined, days = 7) {
  return Boolean(tonoVencimiento(value, {diasAviso: days}));
}
