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
  // PostgreSQL numeric values travel as strings. Preserve their integer part
  // with BigInt and replace only the fraction; never round a large cash balance
  // through Number before formatting it.
  const exact=typeof value==='string'?value.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/):null;
  if(exact&&(code!=='PYG'||!Number(exact[3]||0))){
    const whole=BigInt(exact[2]);
    const signedWhole=exact[1]?(whole===0n?-0:-whole):whole;
    return formatter.formatToParts(signedWhole).map(part=>part.type==='fraction'?(exact[3]||'').padEnd(2,'0'):part.value).join('');
  }
  return formatter.format(Number(value));
}
