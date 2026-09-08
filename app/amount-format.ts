// es-PY input convention: periods group thousands; a comma separates USD cents.
export function normalizeAmount(display: string, currency: string): string {
  if (currency === 'USD') {
    // Also accept pasted USD amounts such as 1250.50 or 1,250.50.
    const numeric=display.replace(/[^0-9.,]/g,'');
    if (numeric.lastIndexOf('.') > numeric.lastIndexOf(',') && /\.\d{0,2}$/.test(numeric)) {
      const decimal=numeric.lastIndexOf('.');
      display=numeric.slice(0,decimal).replace(/[.,]/g,'')+','+numeric.slice(decimal+1);
    }
  }
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
