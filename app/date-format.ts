const DEFAULT_TIME_ZONE = 'America/Asuncion';

type DateValue = string | Date | null | undefined;
type DateFormatOptions = { timeZone?: string };

function rawDate(value: DateValue) {
  if (!value) return '';
  return value instanceof Date
    ? Number.isNaN(value.getTime()) ? '' : value.toISOString()
    : String(value).trim();
}

function parseDate(value: DateValue, raw: string) {
  if (!raw) return null;
  const date = value instanceof Date
    ? new Date(value)
    : new Date(raw.includes('T') ? raw : `${raw.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Full list date, with a 24-hour clock when the source carries one. */
export function fechaLista(value: DateValue, vacio = '', options: DateFormatOptions = {}) {
  const raw = rawDate(value);
  const date = parseDate(value, raw);
  if (!date) return vacio;
  const timeZone = options.timeZone || DEFAULT_TIME_ZONE;
  const day = new Intl.DateTimeFormat('es-PY', {timeZone, day: '2-digit', month: 'short', year: '2-digit'})
    .format(date)
    .replace(/\./g, '');
  if (!raw.includes('T')) return day;
  const clock = new Intl.DateTimeFormat('es-PY', {timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(date);
  return `${day} · ${clock}`;
}

/** Dense list date, retaining date-only values on their calendar day. */
export function fechaListaCorta(value: DateValue, vacio = '') {
  const raw = rawDate(value);
  const date = parseDate(value, raw);
  if (!date) return vacio;
  return new Intl.DateTimeFormat('es-PY', {timeZone: DEFAULT_TIME_ZONE, day: '2-digit', month: 'short'})
    .format(date)
    .replace(/\./g, '')
    .replace(/\s+/g, '-');
}
