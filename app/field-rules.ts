import {parseTelefono, soloDigitos, telefonoValido} from 'owncoding-ui';

export const PHONE_COUNTRIES = [
  { code: '+595', label: '🇵🇾 +595' },
  { code: '+55', label: '🇧🇷 +55' },
  { code: '+54', label: '🇦🇷 +54' },
  { code: '+1', label: '🇺🇸 +1' },
  { code: '+34', label: '🇪🇸 +34' },
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

/**
 * Regla de ScaleOS sobre `telefonoValido` de owncoding-ui: Paraguay acepta
 * móvil (9 dígitos) y fijo (8), y solo los códigos del selector; el resto de
 * los países usa la longitud compartida de 6 a 12. La generalización del fijo
 * se propone en owncoding-ui#2.
 */
export function phoneValid(value: string): boolean {
  if (!String(value || '').trim()) return false;
  const parsed = parseTelefono(value, DEFAULT_PHONE_COUNTRY);
  if (!PHONE_COUNTRIES.some(entry => entry.code === parsed.countryCode)) return false;
  const national = phoneNational(parsed.phone);
  if (!national) return false;
  if (parsed.countryCode === DEFAULT_PHONE_COUNTRY) return telefonoValido(national, DEFAULT_PHONE_COUNTRY) || national.length === 8;
  return telefonoValido(national, parsed.countryCode);
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
