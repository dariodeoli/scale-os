'use client';
// Shared list formats. Every list view uses these instead of hand-rolling
// serials, short dates or due emphasis, so the dense tables stay consistent.
import './list-format.css';

const timeZone = 'America/Asuncion';
function parse(value: string | null | undefined, dateOnly = false) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(dateOnly ? `${raw.slice(0, 10)}T12:00:00Z` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Full date with clock: `17 sep 26 · 14:30`. */
export function listDateFull(value: string | null | undefined, time?: string | null) {
  const raw = String(value || '').trim();
  const date = parse(value, !raw.includes('T'));
  if (!date) return null;
  const day = new Intl.DateTimeFormat('es-PY', { timeZone, day: '2-digit', month: 'short', year: '2-digit' }).format(date).replace(/\./g, '');
  const clock = String(time || (raw.includes('T') ? new Intl.DateTimeFormat('es-PY', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) : '') || '').slice(0, 5);
  return clock ? `${day} · ${clock}` : day;
}

/** Short table date: `17-sept`. */
export function listDateShort(value: string | null | undefined) {
  const date = parse(value, !String(value || '').includes('T'));
  if (!date) return null;
  return new Intl.DateTimeFormat('es-PY', { timeZone, day: '2-digit', month: 'short' }).format(date).replace(/\./g, '').replace(/\s+/g, '-');
}

/** Due tone: painted only when overdue or within the next week. */
export function dueTone(value: string | null | undefined, days = 7) {
  const date = parse(value, true);
  if (!date) return '';
  const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T12:00:00Z');
  const left = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return left <= days ? 'warn' : '';
}

/** Serial/IMEI: the tail is always visible; masked where it adds no value. */
export function SerialTexto({ value, mask = false }: { value: string | null | undefined; mask?: boolean }) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const tail = raw.slice(-4);
  if (mask) return <span className="serial-text" title={raw}>••••{tail}</span>;
  const head = raw.slice(0, -4);
  return <span className="serial-text" title={raw}>{head}<b>{tail}</b></span>;
}
