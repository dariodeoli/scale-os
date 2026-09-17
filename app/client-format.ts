export function moneyKpi(value: number, currency: string) {
  return new Intl.NumberFormat("es-PY", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function clientSince(value?: string): string | null {
  return value ? new Intl.DateTimeFormat('es-PY', { month: 'short', year: 'numeric' }).format(new Date(value)) : null;
}
