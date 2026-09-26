/**
 * Capa de datos de Informes (`/informes`).
 *
 * Reúne tipos del contrato (`GET /api/agency/reports`), la matemática con
 * `bigint` para no perder centavos, las comparaciones de período y los
 * agregados puros que consume la vista (`reportTiles`, `chartSeries`,
 * `reportCurrencies`, `distributionShare`). No hace fetch ni conoce React:
 * el estado de carga vive en `app/use-reports.ts`.
 */

export type ReportMonth = {
  month: string;
  isPartial: boolean;
  clients: {
    active: number | null;
    added: number | null;
    lost: number | null;
    retentionPercent: number | null;
    averageTenureDays: number | null;
    tenureKnown: number;
    types: {kind: string; count: number}[];
    plans: {planId: string | number | null; name: string | null; count: number}[];
  };
  financial: {
    currency: string;
    invoiced: string;
    collected: string;
    invoiceCount: number;
    billedClients: number;
    averageTicket: string | null;
    averageRevenuePerClient: string | null;
  }[];
};

export type ReportsData = {asOf: string; month: string; historySince: string | null; months: ReportMonth[]};

/**
 * Respuesta de `GET /api/agency/reports` con `previous=1` (#67): la ventana
 * anterior viaja en el mismo payload (`previous.month` es el mes final de esa
 * ventana). Sin el parámetro el contrato es el mismo de siempre.
 */
export type ReportsResponse = ReportsData & {previous?: ReportsData | null};

/** Etiquetas de `clients.types[].kind`; el API puede sumar valores nuevos. */
export const reportKindLabels: Record<string, string> = {
  unknown: 'Sin clasificar',
  company: 'Empresa',
  professional: 'Profesional',
  individual: 'Persona particular',
  other: 'Otro',
};

export function reportKindLabel(kind: string): string {
  return reportKindLabels[kind] || 'Sin clasificar';
}

const reportDateFormat = new Intl.DateTimeFormat('es-PY', {timeZone: 'America/Asuncion', dateStyle: 'long'});
const reportCutoffFormat = new Intl.DateTimeFormat('es-PY', {timeZone: 'America/Asuncion', dateStyle: 'long', timeStyle: 'short', hourCycle: 'h23'});
export function reportDate(value: string | null, withTime = false): string {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? (withTime ? reportCutoffFormat : reportDateFormat).format(date) : 'sin fecha confirmada';
}

export const validMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && value >= '1900-01' && value <= '9998-12';

export function currentMonth(): string {
  const parts = new Intl.DateTimeFormat('en', {timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit'}).formatToParts(new Date());
  return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
}

export function previousMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

export type Decimal = {units: bigint; scale: number};

export function decimal(value: string | number | null): Decimal | null {
  if (value === null) return null;
  const text = String(value);
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const scale = text.split('.')[1]?.length || 0;
  return {units: BigInt(text.replace('.', '')), scale};
}

export function power(scale: number): bigint {
  return BigInt('1' + '0'.repeat(scale));
}

export function printed(units: bigint, scale: number): string {
  const negative = units < BigInt(0), digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  const integer = scale ? digits.slice(0, -scale) : digits;
  return `${negative ? '-' : ''}${integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}${scale ? ',' + digits.slice(-scale) : ''}`;
}

/** Formats server decimal strings without converting money to binary Number. */
export function reportMoney(value: string | null | undefined, currency: string): string {
  const parsed = decimal(value ?? null);
  return parsed ? `${currency} ${printed(parsed.units, parsed.scale)}` : 'Sin datos';
}

export function reportDelta(current: string | number | null, prior: string | number | null, partial = false): string {
  if (partial) return 'Sin comparación: mes parcial';
  const a = decimal(current), b = decimal(prior);
  if (!a || !b) return 'Sin comparación: faltan datos';
  const scale = Math.max(a.scale, b.scale), now = a.units * power(scale - a.scale), before = b.units * power(scale - b.scale), diff = now - before;
  const absolute = `${diff > BigInt(0) ? '+' : ''}${printed(diff, scale)}`;
  if (before === BigInt(0)) return `${absolute} · porcentaje no disponible (base cero)`;
  const base = before < BigInt(0) ? -before : before, absoluteDiff = diff < BigInt(0) ? -diff : diff;
  const percent = (absoluteDiff * BigInt(10000) + base / BigInt(2)) / base;
  return `${absolute} · ${diff < BigInt(0) ? '-' : diff > BigInt(0) ? '+' : ''}${printed(percent, 2)} %`;
}

export function shiftMonth(value: string, offset: number): string | null {
  const [year, month] = value.split('-').map(Number);
  const total = year * 12 + month - 1 + offset, shiftedYear = Math.floor(total / 12), shiftedMonth = total - shiftedYear * 12 + 1;
  return shiftedYear >= 1900 && shiftedYear <= 9998 ? `${shiftedYear}-${String(shiftedMonth).padStart(2, '0')}` : null;
}

export function decimalText(units: bigint, scale: number): string {
  const negative = units < BigInt(0), digits = (negative ? -units : units).toString().padStart(scale + 1, '0');
  return `${negative ? '-' : ''}${scale ? digits.slice(0, -scale) : digits}${scale ? '.' + digits.slice(-scale) : ''}`;
}

export function roundedRatio(numerator: bigint, denominator: bigint, scale: number): bigint {
  if (denominator === BigInt(0)) return BigInt(0);
  const negative = numerator < BigInt(0), absolute = negative ? -numerator : numerator, rounded = (absolute * power(scale) + denominator / BigInt(2)) / denominator;
  return negative ? -rounded : rounded;
}

export function monthOf(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit'}).format(date);
}

/** Etiqueta corta de mes con el mismo formato de tabla que `list-format` (`01-jul`). */
export function monthLabel(value: string): string {
  const date = new Date(`${value}-01T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-PY', {timeZone: 'America/Asuncion', day: '2-digit', month: 'short'}).format(date).replace(/\./g, '').replace(/\s+/g, '-');
}

const monthRangeFormat = new Intl.DateTimeFormat('es-PY', {timeZone: 'America/Asuncion', day: 'numeric', month: 'short', year: 'numeric'});
const monthTitleFormat = new Intl.DateTimeFormat('es-PY', {timeZone: 'America/Asuncion', month: 'long', year: 'numeric'});

/**
 * Rango completo y ordenado de meses (`1 oct. 2025 — 30 sept. 2026`): primer
 * día del mes inicial y último día del mes final, siempre con año. Es la
 * etiqueta de período del filtro de Informes; nunca abrevia ni deja el año
 * implícito.
 */
export function monthRangeLabel(start: string, end: string): string {
  const first = new Date(`${start}-01T12:00:00Z`);
  const [endYear, endMonth] = end.split('-').map(Number);
  const last = Number.isInteger(endYear) && Number.isInteger(endMonth) ? new Date(Date.UTC(endYear, endMonth, 0, 12)) : new Date(Number.NaN);
  if (Number.isNaN(first.getTime()) || Number.isNaN(last.getTime())) return `${start} — ${end}`;
  return `${monthRangeFormat.format(first)} — ${monthRangeFormat.format(last)}`;
}

/** Mes y año en palabras (`septiembre de 2026`), para ayudas y botones. */
export function monthTitle(value: string): string {
  const date = new Date(`${value}-01T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : monthTitleFormat.format(date);
}

/** Only months with at least one registered figure are shown; an empty month is not zero. */
export const hasMonthData = (row: ReportMonth) =>
  row.clients.active !== null || row.clients.added !== null || row.clients.lost !== null ||
  row.clients.retentionPercent !== null || row.clients.averageTenureDays !== null ||
  row.financial.some(item => item.invoiced !== null || item.collected !== null || item.invoiceCount !== null || item.billedClients !== null) ||
  row.clients.types.length > 0 || row.clients.plans.length > 0;

export type WindowValue = {value: string | number; partial: boolean};
export type ReportComparisonRow = {label: string; current: string; previous: string; change: string};
export type ReportComparison = {available: boolean; currentStart: string; currentEnd: string; previousStart: string | null; previousEnd: string | null; rows: ReportComparisonRow[]};

function lastWithActive(rows: ReportMonth[]): WindowValue | null {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (row.clients.active !== null) return {value: row.clients.active, partial: row.isPartial};
  }
  return null;
}

function sumCounts(rows: ReportMonth[], key: 'added' | 'lost'): WindowValue | null {
  let total = 0, any = false, partial = false;
  for (const row of rows) {
    const value = row.clients[key];
    if (value === null) continue;
    total += value; any = true; partial = partial || row.isPartial;
  }
  return any ? {value: total, partial} : null;
}

function sumMoney(rows: ReportMonth[], currency: string, key: 'invoiced' | 'collected'): WindowValue | null {
  let units = BigInt(0), scale = 0, any = false, partial = false;
  for (const row of rows) {
    const parsed = decimal(row.financial.find(item => item.currency === currency)?.[key] ?? null);
    if (!parsed) continue;
    if (parsed.scale > scale) {units *= power(parsed.scale - scale); scale = parsed.scale;}
    units += parsed.units * power(scale - parsed.scale);
    any = true; partial = partial || row.isPartial;
  }
  return any ? {value: decimalText(units, scale), partial} : null;
}

function ticketAverage(rows: ReportMonth[], currency: string): WindowValue | null {
  let units = BigInt(0), scale = 0, count = 0, any = false, partial = false;
  for (const row of rows) {
    const item = row.financial.find(entry => entry.currency === currency), parsed = decimal(item?.invoiced ?? null);
    if (!parsed) continue;
    if (parsed.scale > scale) {units *= power(parsed.scale - scale); scale = parsed.scale;}
    units += parsed.units * power(scale - parsed.scale);
    if (item?.invoiceCount != null) count += item.invoiceCount;
    any = true; partial = partial || row.isPartial;
  }
  if (!any || count <= 0) return null;
  return {value: decimalText(roundedRatio(units, BigInt(count) * power(scale), 2), 2), partial};
}

/** Visible window against the equal window immediately before it; partial months never compare. */
export function reportComparison(data: ReportsData, previousData: ReportsData | null, currency: string, months: number): ReportComparison {
  const end = data.month, currentStart = shiftMonth(end, -(months - 1)), previousEnd = previousData ? previousData.month : shiftMonth(end, -months), previousStart = previousEnd ? shiftMonth(previousEnd, -(months - 1)) : null;
  const currentRows = data.months.filter(row => row.month <= end && (!currentStart || row.month >= currentStart)).sort((a, b) => a.month.localeCompare(b.month));
  const previousRows = previousData ? previousData.months.filter(row => row.month <= (previousEnd || data.month) && (!previousStart || row.month >= previousStart)).sort((a, b) => a.month.localeCompare(b.month)) : [];
  const previousWithData = previousRows.filter(hasMonthData), historyMonth = monthOf(data.historySince);
  const available = !!previousData && previousWithData.length > 0 && !previousWithData.every(row => row.isPartial) && (!historyMonth || !previousStart || historyMonth < previousStart);
  const build = (label: string, current: WindowValue | null, previous: WindowValue | null, format: (value: string | number | null) => string): ReportComparisonRow =>
    ({label, current: format(current?.value ?? null), previous: format(previous?.value ?? null), change: reportDelta(current?.value ?? null, previous?.value ?? null, !!(current?.partial || previous?.partial))});
  const showNumber = (value: string | number | null) => typeof value === 'number' ? count(value) : value === null ? 'Sin datos' : String(value);
  const showMoney = (value: string | number | null) => reportMoney(value === null ? null : String(value), currency);
  return {available, currentStart: currentStart || end, currentEnd: end, previousStart, previousEnd: previousEnd || null, rows: [
    build('Clientes activos (último mes con datos)', lastWithActive(currentRows), lastWithActive(previousRows), showNumber),
    build('Clientes incorporados (suma del período)', sumCounts(currentRows, 'added'), sumCounts(previousRows, 'added'), showNumber),
    build('Bajas de actividad (suma del período)', sumCounts(currentRows, 'lost'), sumCounts(previousRows, 'lost'), showNumber),
    build('Facturación (suma del período)', sumMoney(currentRows, currency, 'invoiced'), sumMoney(previousRows, currency, 'invoiced'), showMoney),
    build('Cobros (suma del período)', sumMoney(currentRows, currency, 'collected'), sumMoney(previousRows, currency, 'collected'), showMoney),
    build('Ticket promedio por factura', ticketAverage(currentRows, currency), ticketAverage(previousRows, currency), showMoney),
  ]};
}

export const count = (value: number | null | undefined): string => value == null ? 'Sin datos' : String(value);

/** Monedas presentes en el histórico cargado (nunca se suman entre sí). */
export function reportCurrencies(months: readonly ReportMonth[]): string[] {
  return Array.from(new Set(months.flatMap(row => row.financial.map(item => item.currency)))).sort();
}

export type ReportTile = {label: string; value: string; change: string};

/** Los 8 indicadores del mes seleccionado contra el mes calendario anterior. */
export function reportTiles(selected: ReportMonth | undefined, prior: ReportMonth | undefined, currency: string): ReportTile[] {
  if (!selected) return [];
  const financial = selected.financial.find(row => row.currency === currency);
  const previousFinancial = prior?.financial.find(row => row.currency === currency);
  const partial = !!(selected.isPartial || prior?.isPartial);
  return [
    {label: 'Clientes activos', value: count(selected.clients.active), change: reportDelta(selected.clients.active, prior?.clients.active ?? null, partial)},
    {label: 'Clientes incorporados', value: count(selected.clients.added), change: reportDelta(selected.clients.added, prior?.clients.added ?? null, partial)},
    {label: 'Bajas de actividad', value: count(selected.clients.lost), change: reportDelta(selected.clients.lost, prior?.clients.lost ?? null, partial)},
    {label: 'Retención', value: selected.clients.retentionPercent === null ? 'Sin datos' : `${selected.clients.retentionPercent} %`, change: `Diferencia en puntos porcentuales / relativa: ${reportDelta(selected.clients.retentionPercent, prior?.clients.retentionPercent ?? null, partial)}`},
    {label: 'Facturado · incluye impuestos', value: reportMoney(financial?.invoiced, currency), change: reportDelta(financial?.invoiced ?? null, previousFinancial?.invoiced ?? null, partial)},
    {label: 'Cobrado · neto de reversiones', value: reportMoney(financial?.collected, currency), change: reportDelta(financial?.collected ?? null, previousFinancial?.collected ?? null, partial)},
    {label: 'Ticket promedio por factura', value: reportMoney(financial?.averageTicket, currency), change: reportDelta(financial?.averageTicket ?? null, previousFinancial?.averageTicket ?? null, partial)},
    {label: 'Facturado promedio por cliente facturado', value: reportMoney(financial?.averageRevenuePerClient, currency), change: reportDelta(financial?.averageRevenuePerClient ?? null, previousFinancial?.averageRevenuePerClient ?? null, partial)},
  ];
}

export type ReportChartPoint = {month: string; partial: boolean; invoiced: Decimal | null; collected: Decimal | null};

/** Serie del gráfico: solo meses con facturado o cobrado de la moneda elegida. */
export function chartSeries(months: readonly ReportMonth[], currency: string): ReportChartPoint[] {
  return months
    .map(row => {
      const financial = row.financial.find(item => item.currency === currency);
      return {month: row.month, partial: row.isPartial, invoiced: decimal(financial?.invoiced ?? null), collected: decimal(financial?.collected ?? null)};
    })
    .filter(row => row.invoiced !== null || row.collected !== null);
}

/** Mayor valor de la serie (el eje es relativo al máximo cargado, sin mezclar monedas). */
export function biggestDecimal(series: readonly ReportChartPoint[]): Decimal {
  return series.reduce<Decimal>((top, row) => {
    for (const value of [row.invoiced, row.collected]) {
      if (!value) continue;
      const scale = Math.max(top.scale, value.scale);
      const candidate = value.units * power(scale - value.scale);
      const current = top.units * power(scale - top.scale);
      if (candidate > current) {top = {units: value.units, scale: value.scale};}
    }
    return top;
  }, {units: BigInt(0), scale: 0});
}

/** Altura relativa de la barra: 0 sin dato, mínimo 2 % para que el mes se vea. */
export function chartBarPercent(value: Decimal | null, biggest: Decimal): number {
  if (value === null || biggest.units === BigInt(0)) return 0;
  return Math.max(2, Math.min(100, Number(value.units * power(biggest.scale - value.scale) * BigInt(100) / biggest.units)));
}

/** Porcentaje de una distribución sobre todos los clientes activos (incluye desconocidos). */
export function distributionShare(count: number, total: number | null): number | null {
  return total !== null && total > 0 ? count / total * 100 : null;
}
