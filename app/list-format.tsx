'use client';
// Formato único de las listas densas. Las fechas, los vencimientos y los
// seriales salen de los objetos de owncoding-ui (`fechaLista`, `fechaListaCorta`,
// `diasHasta`, `partirSerial`, `serialEnmascarado`): acá solo se fija la zona de
// la empresa y el contrato de vacío de las celdas, que devuelve `null` para que
// cada celda elija su texto. No hay una segunda implementación de Intl.
import {diasHasta, fechaLista, fechaListaCorta, partirSerial, serialEnmascarado} from 'owncoding-ui';
import './list-format.css';

const timeZone = 'America/Asuncion';

/** Full date with clock: `17 sept 26 · 14:30`; `null` when there is no date. */
export function listDateFull(value: string | null | undefined, time?: string | null) {
  return fechaLista(value, '', {timeZone, hora: time || undefined}) || null;
}

/** Short table date: `17-sept`; `null` when there is no date. */
export function listDateShort(value: string | null | undefined) {
  return fechaListaCorta(value, '') || null;
}

/**
 * Due tone: painted (`warn`) only when the date is overdue or falls within the
 * next `days` calendar days of Asunción; `''` when there is nothing to paint.
 */
export function dueTone(value: string | null | undefined, days = 7) {
  const left = diasHasta(value, {timeZone});
  return left !== null && left <= days ? 'warn' : '';
}

/** Boolean contract of `dueTone` for the lists that only need the warning flag. */
export function hasDueWarning(value: string | null | undefined, days = 7) {
  return dueTone(value, days) !== '';
}

/** Serial/IMEI: the tail is always visible; masked where it adds no value. */
export function SerialTexto({ value, mask = false }: { value: string | null | undefined; mask?: boolean }) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (mask) return <span className="serial-text" title={raw}>{serialEnmascarado(raw)}</span>;
  const {cabeza, cola} = partirSerial(raw);
  return <span className="serial-text" title={raw}>{cabeza}<b>{cola}</b></span>;
}
