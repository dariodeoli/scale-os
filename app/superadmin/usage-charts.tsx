"use client";
// Gráficos del panel de uso (#191): SVG en línea, una sola escala por gráfico,
// rejilla recesiva, sin números sobre cada punto y tooltip al pasar el cursor.
// Los colores salen de los tokens de `usage.css` (paleta dataviz validada).
import {ReactNode, useEffect, useRef, useState} from "react";
import "./usage.css";

const H = 220, PAD = {l: 34, r: 8, t: 10, b: 24};
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** `2026-10-14` a `14-oct` sin pasar por Date local (los días del API ya son de Asunción). */
export function dayLabel(day: string | null | undefined) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(day || "");
  return match ? `${match[2]}-${MONTHS[Number(match[1]) - 1] || match[1]}` : "";
}

/** Tope redondeado y marcas del eje (0 … tope) para un valor máximo. */
export function niceScale(max: number) {
  const top = Math.max(1, max);
  const step = Math.max(1, Math.pow(10, Math.floor(Math.log10(top / 4))));
  const unit = [1, 2, 5, 10].map((m) => m * step).find((s) => top / s <= 4) || step * 10;
  const ceil = Math.ceil(top / unit) * unit;
  const ticks: number[] = [];
  for (let value = 0; value <= ceil + 1e-9; value += unit) ticks.push(value);
  return {ceil, ticks};
}

/** Ancho real del contenedor: el viewBox sigue al ancho y las marcas del eje
 * quedan a 10 px en todos los gráficos (sin escalar el texto con el SVG). */
function useChartWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const sync = () => { const next = Math.round(node.clientWidth); if (next > 0) setWidth(next); };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return {ref, W: Math.max(240, width)};
}

const fmt = (value: number) => new Intl.NumberFormat("es-PY").format(value);

function Frame({W, scale, children}: {W: number; scale: {ceil: number; ticks: number[]}; children: ReactNode}) {
  const y = (value: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - value / scale.ceil);
  return <>
    {scale.ticks.map((tick) => <g key={tick}>
      <line className="viz-grid" x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)}/>
      <text className="viz-tick" x={PAD.l - 6} y={y(tick) + 3} textAnchor="end">{fmt(tick)}</text>
    </g>)}
    {children}
  </>;
}

function Tooltip({left, title, rows}: {left: number; title: string; rows: {label: string; value: number}[]}) {
  const edge = left > 70 ? " is-end" : left < 30 ? " is-start" : "";
  return <div className={`usage-tooltip${edge}`} role="status" style={{left: `${left}%`}}>
    <b>{title}</b>
    {rows.map((row) => <span key={row.label}><em style={{fontStyle: "normal"}}>{row.label}</em><strong>{fmt(row.value)}</strong></span>)}
  </div>;
}

/** Tabla equivalente del gráfico: la lectura no depende del color ni del cursor. */
function DataTable({caption, head, rows}: {caption: string; head: string[]; rows: (string | number)[][]}) {
  return <details className="usage-data">
    <summary>Ver datos de «{caption}»</summary>
    <div className="usage-table"><table>
      <caption>{caption}</caption>
      <thead><tr>{head.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, i) => i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{typeof cell === "number" ? fmt(cell) : cell}</td>)}</tr>)}</tbody>
    </table></div>
  </details>;
}

export type LinePoint = {label: string; value: number; prevLabel: string; prev: number};

/** Línea del período actual contra el anterior (punteada), misma escala. */
export function UsageLineChart({title, points, valueLabel, prevName}: {title: string; points: LinePoint[]; valueLabel: string; prevName: string}) {
  const [hover, setHover] = useState<number | null>(null);
  const {ref, W} = useChartWidth();
  const scale = niceScale(Math.max(0, ...points.map((p) => Math.max(p.value, p.prev))));
  const n = points.length, inner = W - PAD.l - PAD.r, step = inner / Math.max(1, n - 1);
  const x = (i: number) => PAD.l + (n <= 1 ? inner / 2 : step * i);
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / scale.ceil);
  const path = (pick: (p: LinePoint) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(pick(p)).toFixed(1)}`).join("");
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 90))));
  const active = hover !== null ? points[hover] : null;
  return <div className="usage-chart" ref={ref}>
    <ul className="usage-legend" aria-label="Leyenda"><li><span className="usage-swatch"/>Período actual</li><li><span className="usage-swatch is-prev"/>{prevName}</li></ul>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}: ${valueLabel} por día contra el período anterior. Los datos están en la tabla debajo.`} onPointerLeave={() => setHover(null)}>
      <Frame W={W} scale={scale}>
        {points.map((p, i) => i % every === 0 ? <text key={i} className="viz-tick" x={x(i)} y={H - 6} textAnchor="middle">{p.label}</text> : null)}
        <path className="viz-line is-prev" d={path((p) => p.prev)}/>
        <path className="viz-line" style={{stroke: "var(--viz-series-1)"}} d={path((p) => p.value)}/>
        {hover !== null && active ? <>
          <line className="viz-cursor" x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b}/>
          <circle className="viz-dot" cx={x(hover)} cy={y(active.value)} r={4} style={{fill: "var(--viz-series-1)"}}/>
        </> : null}
        {points.map((_, i) => <rect key={i} className="viz-hit" x={x(i) - step / 2} y={PAD.t} width={step} height={H - PAD.t - PAD.b} onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)}/>)}
      </Frame>
    </svg>
    {hover !== null && active ? <Tooltip left={(x(hover) / W) * 100} title={active.label} rows={[{label: valueLabel, value: active.value}, {label: `${prevName} (${active.prevLabel || "—"})`, value: active.prev}]}/> : null}
    <DataTable caption={title} head={["Día", valueLabel, prevName]} rows={points.map((p) => [p.label, p.value, p.prev])}/>
  </div>;
}

export type BarGroup = {label: string; values: number[]};

/** Barras agrupadas (1 o 2 series) con extremo redondeado anclado a la base. */
export function UsageBarChart({title, groups, series, tickEvery}: {title: string; groups: BarGroup[]; series: string[]; tickEvery?: number}) {
  const [hover, setHover] = useState<number | null>(null);
  const {ref, W} = useChartWidth();
  const scale = niceScale(Math.max(0, ...groups.flatMap((g) => g.values)));
  const n = groups.length, inner = W - PAD.l - PAD.r, slot = inner / Math.max(1, n);
  const barW = Math.max(2, Math.min(18, (slot - 4) / series.length - 2));
  const y = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / scale.ceil);
  const base = H - PAD.b, every = tickEvery || Math.max(1, Math.ceil(n / 8));
  const active = hover !== null ? groups[hover] : null;
  return <div className="usage-chart" ref={ref}>
    {series.length > 1 ? <ul className="usage-legend" aria-label="Leyenda">{series.map((name, i) => <li key={name}><span className={`usage-swatch is-box${i ? " s2" : ""}`}/>{name}</li>)}</ul> : null}
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. Los datos están en la tabla debajo.`} onPointerLeave={() => setHover(null)}>
      <Frame W={W} scale={scale}>
        {groups.map((g, i) => {
          const start = PAD.l + slot * i + (slot - (barW + 2) * series.length + 2) / 2;
          return <g key={i}>
            {i % every === 0 ? <text className="viz-tick" x={PAD.l + slot * i + slot / 2} y={H - 6} textAnchor="middle">{g.label}</text> : null}
            {g.values.map((value, s) => {
              const top = y(value), h = Math.max(0, base - top), r = Math.min(4, barW / 2, h);
              const bx = start + s * (barW + 2);
              return value > 0 ? <path key={s} style={{fill: `var(--viz-series-${s + 1})`}} opacity={hover === null || hover === i ? 1 : 0.55} d={`M${bx} ${base}V${top + r}Q${bx} ${top} ${bx + r} ${top}H${bx + barW - r}Q${bx + barW} ${top} ${bx + barW} ${top + r}V${base}Z`}/> : null;
            })}
            <rect className="viz-hit" x={PAD.l + slot * i} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} onPointerEnter={() => setHover(i)} onPointerMove={() => setHover(i)}/>
          </g>;
        })}
      </Frame>
    </svg>
    {hover !== null && active ? <Tooltip left={((PAD.l + slot * hover + slot / 2) / W) * 100} title={active.label} rows={series.map((name, s) => ({label: name, value: active.values[s]}))}/> : null}
    <DataTable caption={title} head={["", ...series]} rows={groups.map((g) => [g.label, ...g.values])}/>
  </div>;
}
