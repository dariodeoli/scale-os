// Panel global «Tráfico y demos»: contrato de `GET /api/platform/traffic` y lógica
// pura (períodos en días de Asunción, deltas, duraciones, scroll y sparklines).
// Sin React ni base de datos: lo prueban tests y lo usa `traffic.tsx`.
import {addCivilDays, todayAsuncion} from "../client-format";
import {teamRoleLabels} from "../team-directory";

export type TrafficPeriod = "hoy" | "7" | "30" | "90" | "mes" | "mes-anterior";
export const TRAFFIC_PERIODS: [TrafficPeriod, string][] = [["hoy", "Hoy"], ["7", "7 días"], ["30", "30 días"], ["90", "90 días"], ["mes", "Mes actual"], ["mes-anterior", "Mes anterior"]];

type ViewTotals = {views: number; visitors: number; avg_seconds: number | null; timed: number; avg_scroll: number | null; scrolled: number; s25: number; s50: number; s75: number; s100: number; mobile: number; cta_clicks: number; signups: number};
type DemoTotals = {started: number; views: number; demos_with_views: number; avg_seconds: number | null; timed_demos: number};
export type TrafficPayload = {
  range: {from: string; to: string; days: number; previous_from: string; previous_to: string; today: string; timezone: string};
  landing: {
    today: {day: string; views: number; visitors: number};
    totals: ViewTotals;
    previous: ViewTotals;
    daily: {day: string; views: number; visitors: number; avg_seconds: number | null; avg_scroll: number | null; cta_clicks: number}[];
    pages: {path: string; views: number; visitors: number; avg_seconds: number | null; avg_scroll: number | null}[];
    referrers: {domain: string | null; views: number; visitors: number}[];
    ctas: {cta: string; clicks: number; previous: number; visitors: number}[];
  };
  demo: {
    totals: DemoTotals & {role_changes: number};
    previous: DemoTotals;
    kinds: {kind: string; started: number; previous: number}[];
    daily: {day: string; started: number}[];
    roles: {role: string; changes: number; demos: number}[];
    screens: {path: string; views: number; demos: number; avg_seconds: number | null}[];
    conversion: {measurable: boolean; reason: string};
  };
};

/** Rango del período en días de Asunción (ambos inclusive). El API recalcula el anterior. */
export function trafficRange(period: TrafficPeriod, now = new Date()) {
  const today = todayAsuncion(now);
  if (period === "hoy") return {from: today, to: today};
  const monthStart = `${today.slice(0, 7)}-01`;
  if (period === "mes") return {from: monthStart, to: today};
  if (period === "mes-anterior") {
    const last = addCivilDays(monthStart, -1);
    return {from: `${last.slice(0, 7)}-01`, to: last};
  }
  return {from: addCivilDays(today, -(Number(period) - 1)), to: today};
}
export const trafficQuery = (period: TrafficPeriod, now = new Date()) => {
  const range = trafficRange(period, now);
  return `?from=${range.from}&to=${range.to}`;
};

export type Delta = {pct: number | null; tone: "up" | "down" | "flat" | "none"; label: string};
/** Variación contra el período anterior de igual duración. Sin base (0 o nulo) no inventa un %. */
export function trafficDelta(current: number | null, previous: number | null): Delta {
  if (current === null || previous === null || previous === 0) {
    return {pct: null, tone: "none", label: current && !previous ? "sin base anterior" : "sin variación medible"};
  }
  const pct = Math.round((current - previous) / previous * 100);
  if (pct === 0) return {pct, tone: "flat", label: "= vs anterior"};
  return {pct, tone: pct > 0 ? "up" : "down", label: `${pct > 0 ? "+" : "−"}${Math.abs(pct)} % vs anterior`};
}

/** Segundos a texto corto: «45 s», «2 min 05 s», «1 h 02 min»; null → «—». */
export function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "—";
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor(s % 3600 / 60)).padStart(2, "0")} min`;
}
export const formatPercent = (value: number | null | undefined) => value === null || value === undefined ? "—" : `${Math.round(value)} %`;
export const formatCount = (value: number) => new Intl.NumberFormat("es-PY").format(value);

/** Distribución de scroll alcanzado: qué parte de las vistas medidas llegó a cada umbral. */
export function scrollDistribution(totals: Pick<ViewTotals, "scrolled" | "s25" | "s50" | "s75" | "s100">) {
  return ([[25, totals.s25], [50, totals.s50], [75, totals.s75], [100, totals.s100]] as const).map(([threshold, count]) => ({
    threshold, count, share: totals.scrolled ? Math.round(count / totals.scrolled * 100) : null,
  }));
}

/** Trazo SVG de una sparkline (0…max en `height`). Sin valores o todo cero: línea base plana. */
export function sparkPath(values: (number | null)[], width = 96, height = 24) {
  const points = values.map((value) => value ?? 0);
  if (!points.length) return "";
  const max = Math.max(...points);
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  return points.map((value, index) => {
    const x = points.length > 1 ? index * step : width / 2;
    const y = max > 0 ? height - 1 - (value / max) * (height - 2) : height - 1;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join("");
}

export const CTA_LABELS: Record<string, string> = {trial: "Registro («Empezar gratis»)", demo: "Abrir la demo", contact: "Formulario de contacto", whatsapp: "WhatsApp"};
export const DEMO_KIND_LABELS: Record<string, string> = {publica: "Demo pública (landing)", privada: "Demo privada (dueño real)"};
export const referrerLabel = (domain: string | null) => domain || "Directo o sin origen";
export const roleLabel = (role: string) => teamRoleLabels[role] || role;
export const sectionLabel = (path: string) => path === "/" ? "Inicio" : path.replace(/^\//, "").replace(/-/g, " ");

/** ¿Hay algo para mostrar? Sin datos se dice «sin datos todavía», nunca ceros que parezcan medidos. */
export const landingHasData = (data: TrafficPayload) => data.landing.totals.views > 0 || data.landing.previous.views > 0 || data.landing.totals.cta_clicks > 0;
export const demoHasData = (data: TrafficPayload) => data.demo.totals.started > 0 || data.demo.totals.views > 0 || data.demo.previous.started > 0;
