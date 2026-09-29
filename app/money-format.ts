// Único formateador de dinero de la app (filas, campos, KPIs y agregados):
// PYG sin decimales, el resto con 2. `operations.money()` y `client-format.moneyKpi`
// salen de acá para que un mismo importe tenga un solo formato en toda la pantalla.
const formatters = new Map<string, Intl.NumberFormat>();

export function money(value: string | number, currency = 'PYG') {
  const code = String(currency || 'PYG').toUpperCase();
  let formatter = formatters.get(code);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: code === 'PYG' ? 0 : 2,
    });
    formatters.set(code, formatter);
  }
  return formatter.format(Number(value));
}
