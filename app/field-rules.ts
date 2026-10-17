import {parseTelefono, soloDigitos} from 'owncoding-ui/core';

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
export const EMAIL_ERROR = 'Ingresá un correo válido.';

/** Shared email check: non-empty, up to 254 chars, single @ with a dot. Empty values are handled by each field's optional rule. */
export function emailValid(value: string): boolean {
  const email = (value || '').trim();
  return email.length > 0 && email.length <= 254 && /^\S+@\S+\.\S+$/.test(email);
}

/** Dígitos locales del teléfono: sin el 0 de discado y hasta 12 (contrato de guardado `+<código> <dígitos>`). */
export function phoneNational(value: string): string {
  return soloDigitos(value).replace(/^0+/, '').slice(0, 12);
}

/** Parse only Scale's published API codes. Unknown international values stay raw and editable. */
export function phoneParts(value: string): {country: string; national: string; raw: boolean} {
  const parsed = parseTelefono(value, DEFAULT_PHONE_COUNTRY);
  const supported = PHONE_COUNTRIES.some(entry => entry.code === parsed.countryCode);
  const partialInternational = value.trimStart().startsWith('+') && parsed.phone.trimStart().startsWith('+');
  if (!supported || partialInternational) return {country: '', national: value, raw: true};
  return {country: parsed.countryCode, national: parsed.phone, raw: false};
}

/** Scale API contract: Paraguay 8–9 digits, supported other countries 6–12; no truncation before validation. */
export function phoneValid(value: string): boolean {
  if (!String(value || '').trim() || value.length > 50) return false;
  const parsed = phoneParts(value);
  if (parsed.raw) return false;
  const national = soloDigitos(parsed.national).replace(/^0+/, '');
  return parsed.country === DEFAULT_PHONE_COUNTRY
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
