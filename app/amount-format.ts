/** Read-only money display. Input editing/normalization below has a separate contract. */
export function formatMoney(value: string | number | null | undefined, currency = 'PYG'): string {
  const text = typeof value === 'number' ? String(value) : value?.trim();
  if (!text || !/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(Number(text))) return 'Sin datos';
  const code = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) return 'Sin datos';
  const digits = code === 'PYG' ? 0 : 2;
  // Decimal strings from the API must retain their integer precision, even above 2^53.
  if (!/[eE]/.test(text)) {
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    let units = BigInt(whole + fraction.padEnd(digits, '0').slice(0, digits));
    if (Number(fraction[digits] || '0') >= 5) units += BigInt(1);
    const padded = units.toString().padStart(digits + 1, '0');
    const integer = digits ? padded.slice(0, -digits) : padded;
    return `${code} ${negative && units !== BigInt(0) ? '-' : ''}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${digits ? ',' + padded.slice(-digits) : ''}`;
  }
  const formatted = new Intl.NumberFormat('es-PY', {useGrouping: true, minimumFractionDigits: digits, maximumFractionDigits: digits}).format(Number(text));
  return `${code} ${formatted.replace(/^-0(,00)?$/, '0$1')}`;
}

// es-PY input convention: periods group thousands; a comma separates USD cents.
export function normalizeAmount(display: string, currency: string): string {
  if (currency !== 'PYG') {
    // Also accept pasted USD amounts such as 1250.50 or 1,250.50.
    const numeric=display.replace(/[^0-9.,]/g,'');
    if (numeric.lastIndexOf('.') > numeric.lastIndexOf(',') && /\.\d{0,2}$/.test(numeric)) {
      const decimal=numeric.lastIndexOf('.');
      display=numeric.slice(0,decimal).replace(/[.,]/g,'')+','+numeric.slice(decimal+1);
    }
  }
  const [whole = '', cents] = display.replace(/[^0-9,]/g, '').split(',');
  const integer = whole.replace(/^0+(?=\d)/, '');
  return currency !== 'PYG' && cents !== undefined
    ? `${integer || '0'}.${cents.slice(0, 2)}`
    : integer;
}
export function displayAmount(value: string, currency: string): string {
  if (!value) return '';
  const [whole, cents] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency !== 'PYG' && cents !== undefined ? `${grouped},${cents.slice(0, 2)}` : grouped;
}
