// Períodos compartidos del panel global (guía §3): los mismos chips gobiernan
// Resumen y Uso. Lógica pura y testeable: días civiles de America/Asuncion; el
// API recalcula el período anterior de igual duración y vuelve a validar.
import {todayAsuncion} from "../client-format";

export type PlatformPeriodId = "hoy" | "7d" | "30d" | "90d" | "mes" | "mes-anterior";
export const PLATFORM_PERIODS: [PlatformPeriodId, string][] = [
  ["hoy", "Hoy"],
  ["7d", "7 d"],
  ["30d", "30 d"],
  ["90d", "90 d"],
  ["mes", "Mes actual"],
  ["mes-anterior", "Mes anterior"],
];
export const DEFAULT_PLATFORM_PERIOD: PlatformPeriodId = "30d";

export function isPlatformPeriod(value: unknown): value is PlatformPeriodId {
  return typeof value === "string" && PLATFORM_PERIODS.some(([id]) => id === value);
}

/** AAAA-MM-DD de una fecha civil (componentes UTC: la fecha ya es de Asunción). */
const civil = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const parse = (day: string) => { const [y, m, d] = day.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const addDays = (day: string, days: number) => { const date = parse(day); date.setUTCDate(date.getUTCDate() + days); return civil(date); };

/** Rango `from`–`to` (inclusive) del período en días de Asunción. */
export function periodRange(id: PlatformPeriodId, now = new Date()): {from: string; to: string} {
  const today = todayAsuncion(now);
  if (id === "hoy") return {from: today, to: today};
  if (id === "7d") return {from: addDays(today, -6), to: today};
  if (id === "30d") return {from: addDays(today, -29), to: today};
  if (id === "90d") return {from: addDays(today, -89), to: today};
  const first = `${today.slice(0, 7)}-01`;
  if (id === "mes") return {from: first, to: today};
  const lastOfPrevious = addDays(first, -1);
  return {from: `${lastOfPrevious.slice(0, 7)}-01`, to: lastOfPrevious};
}

export function periodQuery(id: PlatformPeriodId, now = new Date()) {
  const {from, to} = periodRange(id, now);
  return `?from=${from}&to=${to}`;
}

/** Variación contra el período anterior de igual duración (texto honesto, sin inventar). */
export function deltaLabel(current: number, previous: number) {
  if (!(previous > 0)) return current > 0 ? "Sin período anterior para comparar" : "Sin cambios vs período anterior";
  const change = Math.round(Math.abs(current - previous) / previous * 100);
  if (change === 0) return "0 % vs período anterior";
  return `${current >= previous ? "+" : "−"}${change} % vs período anterior`;
}

export function deltaTone(current: number, previous: number): "up" | "down" | "flat" {
  if (!(previous > 0) || current === previous) return "flat";
  return current > previous ? "up" : "down";
}
