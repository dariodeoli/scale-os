'use client';
// Primitivas únicas v2 (campaña #41, DESIGN-SYSTEM.md §Sistema v2).
//
// Envuelven objetos de `owncoding-ui` para fijar la semántica de Scale OS:
// un solo KPI (`Kpi`/`KpiStrip` sobre `Stat` + `CeldaMoneda`), un solo chip de
// estado (`StateChip` sobre `Badge`) y un solo bloque de carga (`LoadingBlock`
// sobre `Skeleton`). Vacío, error y avisos se usan directo de la librería
// (`EmptyState`, `ErrorState`, `Aviso`, `Nota`): no se copian por pantalla.
import {Badge, EmptyState, ErrorState, Label, ListGridToggle, Select, Skeleton, Stat} from 'owncoding-ui';
import {currencyChoices} from './currencies';
import {money} from './operations';
import type {ChangeEvent, HTMLAttributes, ReactNode} from 'react';

export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'mute';

const CHIP_COLOR: Record<ChipTone, string> = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

/** Chip de estado único: tono semántico, sin wrap y con el texto completo. */
export function StateChip({tone = 'mute', title, className, children}: {tone?: ChipTone; title?: string; className?: string; children: ReactNode}) {
  return <Badge color={CHIP_COLOR[tone]} title={title} className={`whitespace-nowrap ${className ?? ''}`}>{children}</Badge>;
}

/**
 * KPI único de la app v2. El monto se formatea con `MoneyText` y el dato
 * ausente se muestra `—`: nunca se inventa un cero ni se corta la cifra.
 */
export function Kpi({label, valor, currency, hint, destacado = false, className}: {label: string; valor: ReactNode | number | string | null | undefined; currency?: string; hint?: ReactNode; destacado?: boolean; className?: string}) {
  const vacio = valor === null || valor === undefined || valor === '';
  const monto = typeof valor === 'string' || typeof valor === 'number' ? <MoneyText valor={valor} currency={currency ?? 'PYG'}/> : valor;
  const contenido = vacio ? '—' : currency ? monto : valor;
  return <Stat label={label} valor={contenido} sub={hint} destacado={destacado} className={className}/>;
}

const MONEY_TONE: Record<string, string> = {ok: 'text-ok', warn: 'text-warn', bad: 'text-bad', mute: 'text-mute', info: 'text-info'};

/**
 * Única celda de dinero v2: usa `money()` para las 6 monedas de la empresa
 * (PYG/USD/EUR/BRL/ARS/MXN), sin recortar ni cambiar de separador. La
 * generalización de `Money`/`CeldaMoneda` de la librería va en owncoding-ui#2.
 */
export function MoneyText({valor, currency = 'PYG', tono = '', className, title}: {valor: number | string | null | undefined; currency?: string; tono?: 'ok' | 'warn' | 'bad' | 'mute' | 'info' | ''; className?: string; title?: string}) {
  const vacio = valor === null || valor === undefined || valor === '';
  return <span title={title} className={`inline-flex shrink-0 items-center justify-end gap-1 whitespace-nowrap font-semibold tabular-nums ${MONEY_TONE[tono] ?? ''} ${className ?? ''}`}>{vacio ? '—' : money(Number(valor), currency)}</span>;
}

/**
 * Selector lista/cuadrícula v2: conserva el objeto de la librería pero con
 * targets de 44 px en móvil (36 px en escritorio). Un solo control de vista.
 */
export function ViewSwitch({value, onChange, className}: {value: 'list' | 'grid'; onChange: (key: 'list' | 'grid') => void; className?: string}) {
  return <ListGridToggle value={value} onChange={onChange} className={`[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-9 md:[&>button]:w-9 ${className ?? ''}`}/>;
}

/** Selector de moneda v2: catálogo de la empresa (sin USDT, que no se usa). */
export function CurrencyField({id, label, value, onChange, disabled = false, className}: {id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean; className?: string}) {
  return <div className={`grid gap-1.5 ${className ?? ''}`}>
    <Label htmlFor={id}>{label}</Label>
    <Select id={id} value={value} disabled={disabled} onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)} className="max-w-[11rem]">
      {currencyChoices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </Select>
  </div>;
}

/** Grilla de KPIs: 1 columna en móvil, 2 en tablet y 4 en escritorio. */
export function KpiStrip({className, children, ...props}: {className?: string; children: ReactNode} & HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>{children}</div>;
}

/** Carga con esqueleto: anuncia con `role="status"` y no inventa datos. */
export function LoadingBlock({label = 'Cargando…', lines = 3, className}: {label?: string; lines?: number; className?: string}) {
  return <div role="status" aria-busy="true" aria-label={label} className={`grid gap-2 ${className ?? ''}`}>
    <Skeleton className="h-4 w-1/3"/>
    {Array.from({length: Math.max(1, lines)}, (_, index) => <Skeleton key={index} className="h-10 w-full"/>)}
  </div>;
}

/** Superficie común de los estados de panel v2. */
const STATE_SURFACE = 'rounded-xl border border-ink-600 bg-ink-800 p-5 max-md:p-4';

/**
 * Vacío de panel: `EmptyState` de la librería sobre la superficie v2 y con
 * aviso accesible (`role="status"`). No inventa datos ni métricas.
 */
export function EmptyBlock({title, description, action, icon, compact = false, className}: {title: string; description?: ReactNode; action?: ReactNode; icon?: string; compact?: boolean; className?: string}) {
  return <div role="status" className={`${STATE_SURFACE} ${className ?? ''}`}>
    <EmptyState title={title} description={description} action={action} icon={icon} compact={compact}/>
  </div>;
}

/** Error de panel con reintento: `ErrorState` de la librería, anunciado como alerta. */
export function ErrorBlock({title, description, onRetry, className}: {title?: string; description?: ReactNode; onRetry?: () => void; className?: string}) {
  return <div role="alert" className={`${STATE_SURFACE} ${className ?? ''}`}>
    <ErrorState title={title} description={description} onRetry={onRetry}/>
  </div>;
}

export type Column = {key: string; label: string; align?: 'start' | 'end' | 'center'};

const ALIGN: Record<NonNullable<Column['align']>, string> = {start: 'text-left', end: 'text-right', center: 'text-center'};

/**
 * Encabezado de página v2 (arquetipo dashboard/lista/ajustes): eyebrow, título
 * y acciones. El título no se trunca (regla de deuda: nada de elipsis en
 * nombres); si no cabe, envuelve.
 */
export function PageHeader({eyebrow, title, subtitle, actions, className}: {eyebrow?: string; title: string; subtitle?: ReactNode; actions?: ReactNode; className?: string}) {
  return <header className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className ?? ''}`}>
    <div className="min-w-0">
      {eyebrow && <p className="mb-1 font-mono text-[10px] uppercase tracking-[.13em] text-mute">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-fore">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-mute">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

/** Toolbar de filtros/búsqueda: los controles son objetos de la librería. */
export function FilterToolbar({children, summary, className}: {children: ReactNode; summary?: ReactNode; className?: string}) {
  return <div className={`mb-4 flex flex-wrap items-end gap-3 ${className ?? ''}`}>
    {children}
    {summary !== undefined && summary !== null && <p className="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">{summary}</p>}
  </div>;
}

/**
 * Lista densa v2: el encabezado de columnas y las filas comparten UNA
 * plantilla (`template`, p. ej. `grid-cols-[minmax(11rem,1.6fr)_minmax(9rem,1.15fr)_7rem_auto]`).
 * En mobile conserva las columnas y el contenedor scrollea en silencio, sin
 * colapsar celdas ni cortar montos, fechas o códigos.
 */
export function ListGrid({label, template, columns, children, minWidthClass = 'min-w-[48rem]', className}: {label: string; template: string; columns: Column[]; children: ReactNode; minWidthClass?: string; className?: string}) {
  return <div role="table" aria-label={label} className={`silent-scroll min-w-0 overflow-x-auto ${className ?? ''}`}>
    <div className={minWidthClass}>
      <div role="row" className={`grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}`}>
        {columns.map((column, index) => (
          <span key={column.key} role="columnheader" className={`${index === columns.length - 1 ? 'text-right' : ALIGN[column.align ?? 'start']} whitespace-nowrap`}>{column.label}</span>
        ))}
      </div>
      <div role="rowgroup">{children}</div>
    </div>
  </div>;
}

/** Fila finita v2: misma plantilla que el encabezado; una celda sin dato reserva su lugar. */
export function ListRow({template, className, children, ...props}: {template: string; className?: string; children: ReactNode} & HTMLAttributes<HTMLDivElement>) {
  return <div role="row" {...props} className={`grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 last:border-0 md:min-h-11 md:py-2 ${template} ${className ?? ''}`}>{children}</div>;
}
