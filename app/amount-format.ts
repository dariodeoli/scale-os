// es-PY input convention: periods group thousands; a comma separates USD cents.
// PYG amounts are integer-only; other currencies keep two decimals.
const groupedThousands = /^\d{1,3}([.,])\d{3}(?:\1\d{3})*$/;
const groupedContinuation = /^\d{1,3}([.,])\d{3,}(?:\1\d+)*$/;

export function normalizeAmount(display: string, currency: string): string {
  const input = display.replace(/[^0-9.,]/g, '');
  if (!input) return '';
  // A conventional thousands group is a whole amount in any currency,
  // including values pasted from the other locale (1,234 / 1.234 / 1.234.567).
  if (groupedThousands.test(input)) return input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (currency === 'PYG') return normalizeInteger(input);
  // Also accept pasted USD amounts such as 1250.50 or 1,250.50.
  if (input.lastIndexOf('.') > input.lastIndexOf(',') && /\.\d{0,2}$/.test(input)) {
    const decimal = input.lastIndexOf('.');
    display = input.slice(0, decimal).replace(/[.,]/g, '') + ',' + input.slice(decimal + 1);
  } else {
    display = input;
  }
  const [whole = '', cents] = display.replace(/[^0-9,]/g, '').split(',');
  const integer = whole.replace(/^0+(?=\d)/, '');
  return cents !== undefined
    ? `${integer || '0'}.${cents.slice(0, 2)}`
    : integer;
}

function normalizeInteger(input: string): string {
  // PYG never has cents. Typing past a separator (1,2345) continues the
  // integer, and any decimal tail pasted after a grouped value is rejected
  // instead of being concatenated onto the whole side.
  if (groupedThousands.test(input) || groupedContinuation.test(input)) return input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  const lastSeparator = Math.max(input.lastIndexOf('.'), input.lastIndexOf(','));
  if (lastSeparator < 0) return input.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return normalizeInteger(input.slice(0, lastSeparator));
}

export function displayAmount(value: string | number, currency: string): string {
  if (value === '' || value === undefined || value === null) return '';
  const [whole, cents] = String(value).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency !== 'PYG' && cents !== undefined ? `${grouped},${cents.slice(0, 2)}` : grouped;
}

export function caretAfterDigits(display: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < display.length; index += 1) {
    if (/\d/.test(display[index])) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return display.length;
}
