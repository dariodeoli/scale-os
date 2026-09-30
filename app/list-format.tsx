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

/* ---------------------------------------------------------------------------
 * Minimización visual de datos personales (Ley N° 7593/2025 §12.3/§12.6,
 * Refs #113): correo, teléfono y documento se muestran parciales cuando el rol
 * no necesita el dato completo para operar. El valor completo nunca se escribe
 * en el DOM enmascarado (tampoco en `title`); qué rol ve el dato lo decide la
 * vista con `maskPii`/`PiiTexto`.
 * ------------------------------------------------------------------------- */

export type PiiKind = 'email' | 'telefono' | 'documento';

/** `juana.perez@agencia.com` → `j•••@agencia.com` (dominio visible para reconocer la casilla). */
export function maskEmail(value: string | null | undefined) {
  const raw = String(value || '').trim();
  const at = raw.lastIndexOf('@');
  if (!raw) return '';
  if (at < 1) return '•••••';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  return `${local.slice(0, 1)}${local.length > 1 ? '•••' : ''}@${domain}`;
}

/** `+595 981 123 456` → `+595 ••• ••56` (código de país y últimos 2 dígitos). */
export function maskPhone(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '•••••';
  const prefix = raw.startsWith('+') && digits.length > 3 ? `+${digits.slice(0, 3)} ` : '';
  return `${prefix}••• ••${digits.slice(-2)}`;
}

/** `80012345-6` → `•••••••5-6`: se conserva la cola para reconocer el documento. */
export function maskTaxId(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const visible = raw.slice(-3);
  return `${'•'.repeat(Math.max(3, raw.length - visible.length))}${visible}`;
}

export function maskPii(kind: PiiKind, value: string | null | undefined) {
  if (kind === 'email') return maskEmail(value);
  if (kind === 'telefono') return maskPhone(value);
  return maskTaxId(value);
}

/**
 * Dato de contacto con enmascarado por rol. Cuando `masked` está activo el
 * valor real no queda en el DOM (ni en `title`), así que la vista que lo usa
 * no puede filtrarlo por accidente.
 */
export function PiiTexto({ kind, value, masked = false, fallback = 'Sin dato', className }: { kind: PiiKind; value: string | null | undefined; masked?: boolean; fallback?: string; className?: string }) {
  const raw = String(value || '').trim();
  if (!raw) return <span className={className}>{fallback}</span>;
  return <span className={className} title={masked ? 'Dato protegido para tu rol' : raw}>{masked ? maskPii(kind, raw) : raw}</span>;
}
