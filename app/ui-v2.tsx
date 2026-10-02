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
import {createContext,useContext,useEffect,useRef,useState,type ChangeEvent,type HTMLAttributes,type ReactNode} from 'react';

export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'mute';

const CHIP_COLOR: Record<ChipTone, string> = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};

/** Chip de estado único: tono semántico, sin wrap y con el texto completo. */
export function StateChip({tone = 'mute', title, className, children}: {tone?: ChipTone; title?: string; className?: string; children: ReactNode}) {
  // El chip neutro (`slate`) pinta `text-mute` sobre `bg-ink-600`: en oscuro el
  // par queda en 4.21:1 (< AA). En ese tema el texto sube a primer nivel, como
  // ya hace la librería dentro de su scope `.tema-v2` (#137).
  return <Badge color={CHIP_COLOR[tone]} title={title} className={`whitespace-nowrap ${tone === 'mute' ? 'dark:text-fore' : ''} ${className ?? ''}`}>{children}</Badge>;
}

/**
 * KPI único de la app v2. El monto se formatea con `MoneyText` y el dato
 * ausente se muestra `—`: nunca se inventa un cero ni se corta la cifra.
 *
 * Compactación desktop (#89): el KPI mide 112–140 px en escritorio; el `hint`
 * es UNA línea (el texto completo queda en el tooltip) y el alto no crece con
 * explicaciones largas. El hook `ui-kpi` identifica al primitivo en tests y
 * mediciones.
 */
export function Kpi({label, valor, currency, hint, destacado = false, className}: {label: string; valor: ReactNode | number | string | null | undefined; currency?: string; hint?: ReactNode; destacado?: boolean; className?: string}) {
  const vacio = valor === null || valor === undefined || valor === '';
  const monto = typeof valor === 'string' || typeof valor === 'number' ? <MoneyText valor={valor} currency={currency ?? 'PYG'}/> : valor;
  const contenido = vacio ? '—' : currency ? monto : valor;
  const sub = hint === undefined || hint === null || hint === ''
    ? undefined
    : typeof hint === 'string'
      ? <span className="min-w-0 flex-1 truncate" title={hint}>{hint}</span>
      : hint;
  return <Stat label={label} valor={contenido} sub={sub} destacado={destacado} className={`ui-kpi ${className ?? ''}`}/>;
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

/** Vista de una colección: único tipo del selector lista/cuadrícula. */
export type CollectionView = 'list' | 'grid';

/**
 * Selector lista/cuadrícula v2: conserva el objeto de la librería pero con
 * targets de 44 px en móvil (36 px en escritorio). Un solo control de vista.
 */
export function ViewSwitch({value, onChange, className}: {value: CollectionView; onChange: (key: CollectionView) => void; className?: string}) {
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
  return <div {...props} className={`ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>{children}</div>;
}

/**
 * Esqueleto de una tira de KPIs (#109): mismos lugares y alto que las cards
 * reales, sin números inventados mientras el shell carga sus datos.
 */
export function KpiStripSkeleton({count = 4, label = 'Cargando indicadores…', className}: {count?: number; label?: string; className?: string}) {
  return <div role="status" aria-busy="true" aria-label={label} className={`ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 ${className ?? ''}`}>
    {Array.from({length: Math.max(1, count)}, (_, index) => <Skeleton key={index} className="h-[110px] w-full rounded-xl"/>)}
  </div>;
}

/** Carga con esqueleto: anuncia con `role="status"` y no inventa datos. */
export function LoadingBlock({label = 'Cargando…', lines = 3, className}: {label?: string; lines?: number; className?: string}) {
  return <div role="status" aria-busy="true" aria-label={label} className={`grid gap-2 ${className ?? ''}`}>
    <Skeleton className="h-3.5 w-24 rounded-full"/>
    {Array.from({length: Math.max(1, lines)}, (_, index) => <Skeleton key={index} className="h-11 w-full rounded-xl"/>)}
  </div>;
}

/**
 * Fallback de una sección lazy (chunk de `next/dynamic` en camino): el mismo
 * esqueleto del sistema sobre el panel de la sección, para que la navegación
 * muestre progreso en vez de pantalla en blanco (ronda 14, #67).
 */
export function SectionLoading({label = 'Cargando la sección…', lines = 4}: {label?: string; lines?: number}) {
  return <div className="ops-stack"><section className="panel"><LoadingBlock label={label} lines={lines}/></section></div>;
}

/** Superficie común de los estados de panel v2. */
const STATE_SURFACE = 'rounded-xl border border-ink-600 bg-ink-800 p-5 shadow-[0_1px_2px_rgb(37_28_41_/_4%)] max-md:p-4';

/**
 * Vacío de panel: `EmptyState` de la librería sobre la superficie v2 y con
 * aviso accesible (`role="status"`). No inventa datos ni métricas.
 * El `action` es el CTA contextual del patrón de estados vacíos (ronda 14):
 * cuando el rol puede crear el dato, se pasa un `EmptyCta` con el texto que
 * nombra la acción concreta ("Registrar primera cuenta"), nunca un "Crear"
 * genérico ni un vacío mudo.
 */
export function EmptyBlock({title, description, action, icon, compact = false, className}: {title: string; description?: ReactNode; action?: ReactNode; icon?: string; compact?: boolean; className?: string}) {
  return <div role="status" className={`${STATE_SURFACE} ${className ?? ''}`}>
    <EmptyState title={title} description={description} action={action} icon={icon} compact={compact}/>
  </div>;
}

/**
 * CTA canónico de un estado vacío: botón primario con label contextual.
 * Es la única forma de dibujar la llamada a la acción de un `EmptyBlock`
 * (mismo objeto, mismo target de 44 px en móvil y mismo texto sobre marca).
 */
export function EmptyCta({label, onClick, icon, className}: {label: string; onClick: () => void; icon?: ReactNode; className?: string}) {
  return <button type="button" className={`primary ${className ?? ''}`} onClick={onClick}>{icon}{label}</button>;
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
 *
 * Compactación desktop (#89): en ≥1280 px es UNA fila de 56–64 px —título,
 * contexto/contador y acciones—; el subtítulo auxiliar queda en una línea con
 * su texto completo en el tooltip. En mobile conserva el apilado y el alto de
 * siempre. `workspace-page-header` (shell) comparte el mismo contrato desde
 * `ui-system.css`.
 *
 * Densidad (#97): `title` es opcional y se omite cuando repite el título de la
 * página que ya publica el shell (`PageTitleContext`): una pantalla, un título.
 * La fila queda para contexto y acciones.
 */
export const PageTitleContext = createContext<string>('');

export function PageHeader({eyebrow, title, subtitle, actions, className}: {eyebrow?: string; title?: string; subtitle?: ReactNode; actions?: ReactNode; className?: string}) {
  const pageTitle = useContext(PageTitleContext);
  const subtitleText = typeof subtitle === 'string' ? subtitle : undefined;
  const repetido = Boolean(title && pageTitle) && title!.trim().toLowerCase() === pageTitle.trim().toLowerCase();
  const heading = repetido ? undefined : title;
  return <header className={`ui-page-header mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 md:mb-0 ${className ?? ''}`}>
    <div className="ui-page-header-main min-w-0 flex-1 xl:flex xl:min-w-0 xl:items-baseline xl:gap-3">
      {eyebrow && <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[.14em] text-mute xl:mb-0 xl:shrink-0">{eyebrow}</p>}
      {heading && <h1 className="text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl xl:shrink-0">{heading}</h1>}
      {subtitle && <p className="ui-page-header-subtitle mt-1.5 text-[13px] leading-[1.5] text-mute xl:mt-0 xl:min-w-0 xl:line-clamp-1" title={subtitleText}>{subtitle}</p>}
    </div>
    {actions && <div className="header-actions flex min-w-0 flex-wrap items-center gap-2 max-md:w-full max-md:justify-start xl:flex-nowrap">{actions}</div>}
  </header>;
}

/**
 * Barra de lote contextual (#97): aparece **solo** cuando hay selección, en una
 * sola línea compacta (sin ocupar una fila fija cuando no hay nada elegido).
 * El rótulo, las acciones del lote y «Limpiar» los aporta la pantalla; el
 * contador y el estado accesible (`role="status"` + `aria-live`) los dibuja el
 * sistema. «Seleccionar visibles» deja de vivir acá: va en la toolbar de la
 * pantalla como acción secundaria (o en el encabezado de la tabla).
 */
export function BulkBar({count, total, label = 'seleccionado', children, onSelectVisible, selectVisibleLabel = 'Seleccionar visibles', onClear, busy = false, className}: {count: number; total?: number; label?: string; children?: ReactNode; onSelectVisible?: () => void; selectVisibleLabel?: string; onClear?: () => void; busy?: boolean; className?: string}) {
  if (!count) return null;
  return <div role="status" aria-live="polite" className={`bulk-bar ${className ?? ''}`}>
    <span className="bulk-count"><b>{count}</b>{total !== undefined ? <> de {total}</> : null} {label}{count === 1 ? '' : 's'}</span>
    <div className="inline-actions bulk-actions">
      {children}
      {onSelectVisible && <button type="button" className="text-button" disabled={busy} onClick={onSelectVisible}>{selectVisibleLabel}</button>}
      {onClear && <button type="button" className="text-button" disabled={busy} onClick={onClear}>Limpiar</button>}
    </div>
  </div>;
}

/**
 * Toolbar de filtros/búsqueda: los controles son objetos de la librería.
 * Compactación desktop (#89): una sola fila en ≥1280 px con `gap` 12 px y el
 * resumen a la derecha; sin card contenedora (vive sobre el lienzo del panel o
 * de la página) y con wrap sólo en los breakpoints reales. El hook
 * `data-toolbar="filtros"` identifica al primitivo en tests y mediciones.
 */
export function FilterToolbar({children, summary, className}: {children: ReactNode; summary?: ReactNode; className?: string}) {
  return <div data-toolbar="filtros" className={`mb-4 flex flex-wrap items-end gap-3 xl:flex-nowrap ${className ?? ''}`}>
    {children}
    {summary !== undefined && summary !== null && <p className="ml-auto whitespace-nowrap text-xs tabular-nums text-mute">{summary}</p>}
  </div>;
}

/**
 * Lista densa v2: el encabezado de columnas y las filas comparten UNA
 * plantilla (`template`, p. ej. `grid-cols-[minmax(11rem,1.6fr)_minmax(9rem,1.15fr)_7rem_auto]`).
 * En mobile conserva las columnas y el contenedor scrollea en silencio, sin
 * colapsar celdas ni cortar montos, fechas o códigos.
 * `pinnedActions` fija la última columna (la de acciones) al borde derecho del
 * scroll: el encabezado y las celdas de `ListActions` quedan siempre a la
 * vista, mientras el resto de las columnas se desliza (patrón de tablas
 * densas de la ronda 14). Se usa junto con la `ListActions` de cada fila.
 */
export function ListGrid({label, template, columns, children, minWidthClass = 'min-w-[48rem]', pinnedActions = false, className}: {label: string; template: string; columns: Column[]; children: ReactNode; minWidthClass?: string; pinnedActions?: boolean; className?: string}) {
  return <div role="table" aria-label={label} className={`silent-scroll min-w-0 overflow-x-auto ${className ?? ''}`}>
    <div className={minWidthClass}>
      <div role="row" className={`grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${template}`}>
        {columns.map((column, index) => (
          <span key={column.key} role="columnheader" className={`${index === columns.length - 1 ? 'text-right' : ALIGN[column.align ?? 'start']} whitespace-nowrap ${pinnedActions && index === columns.length - 1 ? 'list-actions-head' : ''}`}>{column.label}</span>
        ))}
      </div>
      <div role="rowgroup">{children}</div>
    </div>
  </div>;
}

/** Fila finita v2: misma plantilla que el encabezado; una celda sin dato reserva su lugar. */
export function ListRow({template, className, children, ...props}: {template: string; className?: string; children: ReactNode} & HTMLAttributes<HTMLDivElement>) {
  return <div role="row" {...props} className={`list-row grid min-h-12 items-center gap-x-2 border-b border-ink-600/60 px-1 py-0.5 transition-colors last:border-0 hover:bg-ink-700/40 md:min-h-11 md:py-2 ${template} ${className ?? ''}`}>{children}</div>;
}

/**
 * Celda de acciones fija del patrón de tablas densas (ronda 14): se pega al
 * borde derecho del scroll silencioso (`.list-actions`), así las acciones
 * nunca dependen del scroll horizontal. Va en la última celda de cada
 * `ListRow`, con `pinnedActions` en el `ListGrid` para fijar su encabezado.
 */
export function ListActions({children, className}: {children: ReactNode; className?: string}) {
  return <div role="cell" className={`list-actions ${className ?? ''}`}>{children}</div>;
}

/**
 * Ancho mínimo real de una tabla densa: suma de las pistas `rem` de la
 * plantilla + los espacios `gap-x-2` (8 px entre columnas) + el padding
 * lateral de fila y encabezado (8 px). Es la medida con la que cada pantalla
 * decide si su `ListGrid` entra o si corresponde la vista tarjeta (ronda 14).
 */
export function denseTableMinWidth(trackRem: number, columns: number) {
  return trackRem * 16 + (columns - 1) * 8 + 8;
}

/** ¿Entra la tabla densa en el ancho medido del contenedor? */
export function denseTableFits(containerWidth: number, minWidth: number) {
  return containerWidth >= minWidth;
}

/**
 * Medidor del contrato denso: observa el contenedor real (no el viewport, así
 * el nav colapsado y el padding del shell cuentan) y devuelve si su tabla
 * entra. La pantalla usa `fits` para elegir entre `ListGrid` y su vista
 * tarjeta. Sin `ResizeObserver` (SSR y tests) conserva la tabla densa.
 */
export function useDenseTableFit<T extends HTMLElement = HTMLElement>(minWidth: number) {
  const ref = useRef<T | null>(null);
  const [fits, setFits] = useState(true);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const measure = () => setFits(denseTableFits(element.clientWidth, minWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [minWidth]);
  return {ref, fits};
}
