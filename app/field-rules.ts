export const PHONE_COUNTRIES = [
  { code: '+595', label: '🇵🇾 +595' },
  { code: '+55', label: '🇧🇷 +55' },
  { code: '+54', label: '🇦🇷 +54' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+34', label: '🇪🇸 +34' },
  { code: '+598', label: '🇺🇾 +598' },
  { code: '+56', label: '🇨🇱 +56' },
  { code: '+57', label: '🇨🇴 +57' },
  { code: '+51', label: '🇵🇪 +51' },
  { code: '+52', label: '🇲🇽 +52' },
  { code: '+591', label: '🇧🇴 +591' },
  { code: '+351', label: '🇵🇹 +351' },
];
export const DEFAULT_PHONE_COUNTRY = '+595';
export const PHONE_ERROR = 'Ingresá un teléfono válido: código de país y número, por ejemplo +595 981 123 456.';
export const PHONE_HELP = 'Elegí el país y escribí solo dígitos, sin el 0 inicial. Paraguay: 9 dígitos para móvil, 8 para fijo; el resto: 6 a 12.';
export const EMAIL_MAX_LENGTH = 254;
export const EMAIL_ERROR = 'Ingresá un correo válido.';

/** Shared email check: non-empty, up to 254 chars, single @ with a dot. Empty values are handled by each field's optional rule. */
export function emailValid(value: string): boolean {
  const email = (value || '').trim();
  return email.length > 0 && email.length <= EMAIL_MAX_LENGTH && /^\S+@\S+\.\S+$/.test(email);
}

/** Normaliza el número nacional sin descartar dígitos: la longitud se valida, no se trunca. */
export function phoneNational(value: string): string {
  return String(value || '').replace(/\D/g, '').replace(/^0+/, '');
}

/** Adaptador del contrato local del API. Un prefijo desconocido queda visible y no se vuelve +595. */
export function phoneParts(value: string): {countryCode: string; phone: string} {
  const raw = String(value || '').trim();
  if (!raw.startsWith('+')) return {countryCode: DEFAULT_PHONE_COUNTRY, phone: raw};
  const digits = raw.replace(/\D/g, '');
  const country = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length)
    .find(entry => digits.startsWith(entry.code.slice(1)));
  if (!country) return {countryCode: '', phone: raw};
  return {countryCode: country.code, phone: digits.slice(country.code.length - 1)};
}

export function phoneValue(countryCode: string, national: string): string {
  if (!countryCode) return national; // Conserva un legado desconocido hasta elegir país explícitamente.
  const digits = phoneNational(national);
  return digits ? `${countryCode} ${digits}` : '';
}

/** Política local: códigos del API, Paraguay móvil/fijo 9/8; resto 6–12. */
export function phoneValid(value: string): boolean {
  if (!String(value || '').trim() || value.length > 50) return false;
  const parsed = phoneParts(value);
  if (!parsed.countryCode) return false;
  const national = phoneNational(parsed.phone);
  return parsed.countryCode === DEFAULT_PHONE_COUNTRY
    ? national.length === 8 || national.length === 9
    : national.length >= 6 && national.length <= 12;
}

export function normalizeSerial(value: string): string {
  return (value || '').trim().replace(/[\s\-_]+/g, '').toUpperCase();
}

/**
 * Correos técnicos de demo y fixtures (`persona-…@demo.example.invalid`,
 * `visitante-…@demo.example.invalid`). `.invalid` es reservado por RFC 2606:
 * nunca es un destino real ni un dato que deba verse en pantalla (issue #152).
 */
export function technicalEmail(value: unknown): boolean {
  const email = String(value ?? '').trim();
  return email.length > 0 && /@(?:[a-z0-9-]+\.)*invalid$/i.test(email);
}

/** Identidad visible de una persona: nombre, correo humano o el fallback del contexto. */
export function personLabel(person: {full_name?: string | null; email?: string | null} | null | undefined, fallback = 'Integrante'): string {
  const name = person?.full_name?.trim();
  if (name) return name;
  const email = String(person?.email ?? '').trim();
  return email && !technicalEmail(email) ? email : fallback;
}

/** Limpia un decimal al tipear/pegar: un solo separador (coma o punto) y hasta 2 decimales. */
export function decimalInput(value: string, maxDecimals = 2): string {
  const clean = (value || '').replace(',', '.').replace(/[^\d.]/g, '');
  const [whole, ...rest] = clean.split('.');
  const decimals = rest.join('').slice(0, maxDecimals);
  return rest.length ? `${whole}.${decimals}` : whole;
}

export const EMAIL_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com'];

export function emailSuggestions(value: string): string[] {
  const at = (value || '').indexOf('@');
  if (at < 1 || /\s/.test(value)) return [];
  const local = value.slice(0, at);
  const domain = value.slice(at + 1).toLowerCase();
  if (domain.includes('.')) return [];
  return EMAIL_DOMAINS.filter(entry => entry.startsWith(domain)).slice(0, 4).map(entry => `${local}@${entry}`);
}

export const DATE_ERROR = 'Ingresá una fecha válida (AAAA-MM-DD).';
export const TIME_ERROR = 'Ingresá una hora válida de 00:00 a 23:59.';

/** Fecha civil: no admite desbordes de calendario ni interpreta la zona del navegador. */
export function civilDateValid(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/** Entrada nueva común a taskTime: precisión de minutos, sin conversión de zona. */
export function clockTimeValid(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Sólo valida metadatos declarados; no agrega límites ni altera valores legados sin cambios. */
export function fieldMetadataError(value: string, field: {type?: string; maxLength?: number}, originalValue?: string): string | null {
  if (value === '' || value === originalValue) return null;
  if (field.maxLength !== undefined && value.length > field.maxLength) return `Usá hasta ${field.maxLength} caracteres.`;
  if (field.type === 'date' && !civilDateValid(value)) return DATE_ERROR;
  if (field.type === 'time' && !clockTimeValid(value)) return TIME_ERROR;
  return null;
}
