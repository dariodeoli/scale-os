"use client";
// Indicador honesto del panel global (guía §3): valor del período, variación
// contra el período anterior de igual duración, sparkline de la serie diaria y
// la nota «fuente · cálculo». Se apoya en el `Kpi` del sistema (un diseño por tipo).
import {Kpi} from "../ui-v2";
import {formatPlatformMetric} from "./model";
import {deltaLabel, deltaTone} from "./period";

/** Nota corta de procedencia: de dónde sale el dato y cómo se cuenta. */
export function MetricNote({source, calc, className = ""}: {source: string; calc: string; className?: string}) {
  return <small className={`platform-metric-note ${className}`} title={`Fuente: ${source}. Cálculo: ${calc}.`}><span>{source}</span> · {calc}</small>;
}

/** Barras mínimas de la serie diaria (sin ejes): la tendencia, no el dato exacto.
 * Barras y no línea: son conteos por día y muchos días en cero no deben dibujar picos. */
export function Sparkline({series, label}: {series: number[]; label: string}) {
  if (series.length < 2) return null;
  const W = 72, H = 22, max = Math.max(1, ...series), step = W / series.length, bar = Math.max(1, step - 1);
  return <svg className="platform-sparkline" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Tendencia diaria de ${label}`}>
    {series.map((v, i) => { const h = v > 0 ? Math.max(1.5, (v / max) * (H - 2)) : 1; return <rect key={i} x={(i * step).toFixed(2)} y={(H - h).toFixed(2)} width={bar.toFixed(2)} height={h.toFixed(2)} rx={0.5} data-zero={v > 0 ? undefined : "true"}/>; })}
  </svg>;
}

export type MetricValue = {value: number; previous: number; series: number[]; has_data: boolean};

export function MetricKpi({label, metric, source, calc, destacado = false, live = false}: {label: string; metric: MetricValue | null | undefined; source: string; calc: string; destacado?: boolean; live?: boolean}) {
  const empty = !metric || !metric.has_data;
  const tone = metric ? deltaTone(metric.value, metric.previous) : "flat";
  const hint = <span className="platform-kpi-hint">
    <span className="platform-kpi-trend">
      {empty
        ? <span className="platform-kpi-delta">La fuente todavía no tiene registros</span>
        : live
          ? <span className="platform-kpi-delta">En vivo · sin comparación</span>
          : <span className="platform-kpi-delta" data-tone={tone} title={`Período anterior: ${formatPlatformMetric(metric.previous)}`}>{deltaLabel(metric.value, metric.previous)}</span>}
      {!empty && !live ? <Sparkline series={metric.series} label={label}/> : null}
    </span>
    <MetricNote source={source} calc={calc}/>
  </span>;
  return <Kpi label={label} destacado={destacado && !empty} valor={empty ? <span className="platform-kpi-empty">Sin datos todavía</span> : formatPlatformMetric(metric.value)} hint={hint}/>;
}
