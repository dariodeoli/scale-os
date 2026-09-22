'use client';
// Primitivas únicas v2 (campaña #41, DESIGN-SYSTEM.md §Sistema v2).
//
// Envuelven objetos de `owncoding-ui` para fijar la semántica de Scale OS:
// un solo KPI (`Kpi`/`KpiStrip` sobre `Stat` + `CeldaMoneda`), un solo chip de
// estado (`StateChip` sobre `Badge`) y un solo bloque de carga (`LoadingBlock`
// sobre `Skeleton`). Vacío, error y avisos se usan directo de la librería
// (`EmptyState`, `ErrorState`, `Aviso`, `Nota`): no se copian por pantalla.
import {Badge, CeldaMoneda, Skeleton, Stat} from 'owncoding-ui';
import type {ReactNode} from 'react';

export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'mute';

const CHIP_COLOR: Record<ChipTone, string> = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

/** Chip de estado único: tono semántico, sin wrap y con el texto completo. */
export function StateChip({tone = 'mute', title, className, children}: {tone?: ChipTone; title?: string; className?: string; children: ReactNode}) {
  return <Badge color={CHIP_COLOR[tone]} title={title} className={`whitespace-nowrap ${className ?? ''}`}>{children}</Badge>;
}

/**
 * KPI único de la app v2. El monto se formatea con `CeldaMoneda`/`Money` y el
 * dato ausente se muestra `—`: nunca se inventa un cero ni se corta la cifra.
 */
export function Kpi({label, valor, currency, hint, destacado = false, className}: {label: string; valor: ReactNode | number | string | null | undefined; currency?: string; hint?: ReactNode; destacado?: boolean; className?: string}) {
  const vacio = valor === null || valor === undefined || valor === '';
  const contenido = vacio ? '—' : currency ? <CeldaMoneda valor={Number(valor)} currency={currency}/> : valor;
  return <Stat label={label} valor={contenido} sub={hint} destacado={destacado} className={className}/>;
}

/** Grilla de KPIs: 1 columna en móvil, 2 en tablet y 4 en escritorio. */
export function KpiStrip({className, children}: {className?: string; children: ReactNode}) {
  return <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>{children}</div>;
}

/** Carga con esqueleto: anuncia con `role="status"` y no inventa datos. */
export function LoadingBlock({label = 'Cargando…', lines = 3, className}: {label?: string; lines?: number; className?: string}) {
  return <div role="status" aria-busy="true" aria-label={label} className={`grid gap-2 ${className ?? ''}`}>
    <Skeleton className="h-4 w-1/3"/>
    {Array.from({length: Math.max(1, lines)}, (_, index) => <Skeleton key={index} className="h-10 w-full"/>)}
  </div>;
}
