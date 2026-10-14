"use client";
// Indicadores del período en el Resumen (guía §3). Todo sale de
// `GET /api/platform/metrics` (sin demos, días de Asunción, período anterior de
// igual duración); si una fuente no tiene filas reales, «Sin datos todavía».
import {useCallback, useEffect, useRef, useState} from "react";
import {platformApi} from "../platform-admin-api";
import {ErrorBlock, KpiStrip, KpiStripSkeleton} from "../ui-v2";
import {MetricKpi} from "./metric-kpi";
import type {PlatformMetricsPayload} from "./model";
import {periodQuery, type PlatformPeriodId} from "./period";

/** Procedencia de cada indicador: «fuente · cálculo» (visible bajo el valor). */
export const METRIC_NOTES = {
  agencies: {source: "Altas de agencias", calc: "por día de Asunción, sin demos"},
  users: {source: "Cuentas de usuario", calc: "creadas, sin demos ni eliminadas"},
  active_users: {source: "Sesiones de uso", calc: "usuarios distintos con al menos una sesión"},
  sessions: {source: "Sesiones de uso", calc: "sesiones iniciadas en agencias reales"},
  inquiries: {source: "Formulario de la landing", calc: "consultas recibidas"},
  redemptions: {source: "Canjes de cupones", calc: "aplicados a agencias reales"},
} as const;

export function PlatformMetrics({period, onError}: {period: PlatformPeriodId; onError?: (cause: unknown) => boolean}) {
  const [data, setData] = useState<PlatformMetricsPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Solo la última consulta pinta: un período viejo nunca pisa al elegido.
  const latest = useRef(0);
  const load = useCallback(async (value: PlatformPeriodId) => {
    const request = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const next = await platformApi<PlatformMetricsPayload>(`/api/platform/metrics${periodQuery(value)}`);
      if (request === latest.current) setData(next);
    } catch (cause) {
      if (request === latest.current && !onError?.(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar los indicadores.");
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [onError]);
  useEffect(() => { void load(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <ErrorBlock title="No pudimos cargar los indicadores del período" description={error} onRetry={() => void load(period)}/>;
  if (!data) return <KpiStripSkeleton count={6} label="Cargando indicadores del período…"/>;
  return <MetricsBody data={data} loading={loading}/>;
}

/** Cuerpo de los indicadores (sin estado): lo usan el Resumen y los fixtures del harness. */
export function MetricsBody({data, loading = false}: {data: PlatformMetricsPayload; loading?: boolean}) {
  // Una respuesta sin indicadores se muestra como «Sin datos todavía», nunca como ceros.
  const k: Partial<PlatformMetricsPayload["kpis"]> = data.kpis ?? {};
  return <section aria-labelledby="platform-metrics-title" aria-busy={loading} className={`grid min-w-0 gap-2 ${loading ? "opacity-70 transition-opacity" : ""}`}>
    <h2 id="platform-metrics-title" className="sr-only">Indicadores del período</h2>
    <KpiStrip aria-label="Indicadores del período" className="platform-metrics-strip">
      <MetricKpi label="Agencias nuevas" metric={k.agencies} {...METRIC_NOTES.agencies} destacado/>
      <MetricKpi label="Usuarios nuevos" metric={k.users} {...METRIC_NOTES.users}/>
      <MetricKpi label="Usuarios activos" metric={k.active_users} {...METRIC_NOTES.active_users}/>
      <MetricKpi label="Sesiones" metric={k.sessions} {...METRIC_NOTES.sessions}/>
      <MetricKpi label="Consultas" metric={k.inquiries} {...METRIC_NOTES.inquiries}/>
      <MetricKpi label="Cupones canjeados" metric={k.redemptions} {...METRIC_NOTES.redemptions}/>
    </KpiStrip>
  </section>;
}
