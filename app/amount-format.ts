// es-PY input convention: periods group thousands; a comma separates USD cents.
export function normalizeAmount(display: string, currency: string): string {
  const [whole = '', cents] = display.replace(/[^0-9,]/g, '').split(',');
  const integer = whole.replace(/^0+(?=\d)/, '');
  return currency === 'USD' && cents !== undefined
    ? `${integer || '0'}.${cents.slice(0, 2)}`
    : integer;
}
export function displayAmount(value: string, currency: string): string {
  if (!value) return '';
  const [whole, cents] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' && cents !== undefined ? `${grouped},${cents.slice(0, 2)}` : grouped;
}
