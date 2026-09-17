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

export function digitsOnly(value: string): string {
  return (value || '').replace(/\D/g, '');
}

type ParsedPhone = { country: string; national: string };

export function parsePhone(value: string): ParsedPhone | null {
  const raw = (value || '').trim();
  const digits = digitsOnly(raw);
  if (!digits) return null;
  const national = digits.replace(/^0+/, '');
  if (!raw.startsWith('+')) return { country: '', national };
  const country = PHONE_COUNTRIES.map(entry => entry.code)
    .sort((a, b) => b.length - a.length)
    .find(code => digits.startsWith(code.slice(1)));
  if (!country) return { country: '', national };
  return { country, national: digits.slice(country.length - 1).replace(/^0+/, '') };
}

export function phoneValid(value: string): boolean {
  const parsed = parsePhone(value);
  if (!parsed || !parsed.national) return false;
  if ((value || '').trim().startsWith('+') && !parsed.country) return false;
  if (parsed.country === '+595') return parsed.national.length === 8 || parsed.national.length === 9;
  return parsed.national.length >= 6 && parsed.national.length <= 12;
}

export function phoneMessage(value: string): string | null {
  return phoneValid(value) ? null : PHONE_ERROR;
}

export function internationalPhone(country: string, national: string): string {
  const digits = digitsOnly(national).replace(/^0+/, '').slice(0, 12);
  return digits ? `${country} ${digits}` : '';
}

export function normalizePhone(value: string): string | null {
  if (!(value || '').trim()) return null;
  if (!phoneValid(value)) return null;
  const parsed = parsePhone(value)!;
  return internationalPhone(parsed.country || DEFAULT_PHONE_COUNTRY, parsed.national);
}
