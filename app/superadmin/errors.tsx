"use client";
// «Errores» del panel global: errores del API y de la web agrupados por huella
// (mensaje normalizado + primer frame). Lista densa v2 (Mensaje · Origen · Ruta
// · Ocurrencias · Última vez · Estado · Acciones) con tarjetas cuando no entra,
// filtros por estado y origen (en el API) y detalle con el stack de muestra.
// La muestra ya llega limpia de PII desde el API; acá solo se muestra.
import {Fragment, useEffect, useRef, useState} from "react";
import {Select} from "owncoding-ui";
import {listDateFull} from "../list-format";
import {Dialog} from "../dialog";
import {notify} from "../feedback";
import {platformApi} from "../platform-admin-api";
import {ActionMenu, EmptyBlock, ErrorBlock, FilterToolbar, Kpi, ListActions, ListGrid, ListRow, LoadingBlock, StateChip, denseTableMinWidth, useDenseTableFit, type Column, type RecordMenuItem} from "../ui-v2";
import {formatPlatformMetric, type ErrorCounts, type ErrorGroup, type ErrorPage, type ErrorSource, type ErrorStatus} from "./model";
import {PlatformMore} from "./states";
import {EdgeAwareMenu} from "./edge-menu";
import {MetricNote} from "./metric-kpi";

export const ERROR_STATUS: Record<ErrorStatus, {label: string; plural: string; tone: "bad" | "ok" | "mute"}> = {
  new: {label: "Nuevo", plural: "Nuevos", tone: "bad"},
  resolved: {label: "Resuelto", plural: "Resueltos", tone: "ok"},
  ignored: {label: "Ignorado", plural: "Ignorados", tone: "mute"},
};
export const ERROR_SOURCE: Record<ErrorSource, string> = {api: "API", web: "Web"};
const PAGE = 50;
const TEMPLATE = "grid-cols-[minmax(16rem,1.6fr)_4rem_minmax(10rem,1fr)_6rem_8.5rem_6.5rem_12rem]";
const MIN_WIDTH = denseTableMinWidth(16 + 4 + 10 + 6 + 8.5 + 6.5 + 12, 7);
const COLUMNS: Column[] = [
  {key: "message", label: "Mensaje"},
  {key: "source", label: "Origen"},
  {key: "route", label: "Ruta"},
  {key: "count", label: "Ocurrencias", align: "end"},
  {key: "last", label: "Última vez"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones", align: "end"},
];

export function errorsQuery(status: ErrorStatus | "", source: ErrorSource | "", offset = 0) {
  const params = new URLSearchParams({limit: String(PAGE)});
  if (offset) params.set("offset", String(offset));
  if (status) params.set("status", status);
  if (source) params.set("source", source);
  return `/api/platform/errors?${params}`;
}

type Props = {
  writable: boolean;
  /** Devuelve true si el error ya se resolvió (sesión vencida, etc.). */
  onError: (cause: unknown) => boolean;
  /** Contadores (el marco puede mostrar los nuevos en la navegación). */
  onCounts?: (counts: ErrorCounts) => void;
  /** Datos iniciales (harness y tests); sin ellos se cargan del API. */
  initialData?: ErrorPage;
};

export function PlatformErrors({writable, onError, onCounts, initialData}: Props) {
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const [status, setStatus] = useState<ErrorStatus | "">("");
  const [source, setSource] = useState<ErrorSource | "">("");
  const [data, setData] = useState<ErrorPage | null>(initialData ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ErrorGroup | null>(null);
  const [detailError, setDetailError] = useState("");
  const request = useRef(0);
  const skipFirst = useRef(Boolean(initialData));

  async function load(nextStatus = status, nextSource = source, offset = 0) {
    const ticket = ++request.current;
    setBusy(true);
    setError("");
    try {
      const page = await platformApi<ErrorPage>(errorsQuery(nextStatus, nextSource, offset));
      if (ticket !== request.current) return;
      setData((current) => offset && current ? {...page, errors: [...current.errors, ...page.errors]} : page);
      onCounts?.(page.counts);
    } catch (cause) {
      if (ticket === request.current && !onError(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar los errores.");
    } finally {
      if (ticket === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    void load(status, source);
  }, [status, source]);

  async function openDetail(group: ErrorGroup) {
    setDetail(group);
    setDetailError("");
    try {
      const result = await platformApi<{error: ErrorGroup}>(`/api/platform/errors/${group.id}`);
      setDetail((current) => current && String(current.id) === String(group.id) ? result.error : current);
    } catch (cause) {
      if (!onError(cause)) setDetailError(cause instanceof Error ? cause.message : "No pudimos cargar el detalle.");
    }
  }

  async function patch(group: ErrorGroup, next: ErrorStatus, success: string) {
    setBusy(true);
    try {
      const result = await platformApi<{error: ErrorGroup; counts: ErrorCounts}>(`/api/platform/errors/${group.id}`, {method: "PATCH", body: JSON.stringify({status: next})});
      setData((current) => current ? {
        ...current,
        counts: result.counts,
        errors: status && result.error.status !== status
          ? current.errors.filter((item) => item.id !== group.id)
          : current.errors.map((item) => item.id === group.id ? {...item, ...result.error} : item),
        total: status && result.error.status !== status ? Math.max(0, current.total - 1) : current.total,
      } : current);
      setDetail((current) => current && current.id === group.id ? {...current, ...result.error} : current);
      onCounts?.(result.counts);
      notify({tone: "success", message: success});
    } catch (cause) {
      if (!onError(cause)) notify({tone: "error", message: cause instanceof Error ? cause.message : "No pudimos actualizar el error."});
    } finally {
      setBusy(false);
    }
  }

  const items = (group: ErrorGroup): RecordMenuItem[] => [
    {id: "detail", label: "Ver detalle", icono: "eye", onClick: () => void openDetail(group)},
    ...(writable && group.status !== "resolved" ? [{id: "resolved", label: "Marcar resuelto", icono: "check", onClick: () => void patch(group, "resolved", "Error marcado como resuelto.")}] : []),
    ...(writable && group.status !== "ignored" ? [{id: "ignored", label: "Ignorar", icono: "archive", onClick: () => void patch(group, "ignored", "Error ignorado.")}] : []),
    ...(writable && group.status !== "new" ? [{id: "reopen", label: "Reabrir como nuevo", icono: "refresh", onClick: () => void patch(group, "new", "Error reabierto.")}] : []),
  ];
  const actions = (group: ErrorGroup) => <>
    <button type="button" className="text-button platform-admin-inline-action" onClick={() => void openDetail(group)}>Ver detalle</button>
    <EdgeAwareMenu><ActionMenu label={`Acciones del error: ${group.message.slice(0, 60)}`} items={items(group).filter((item) => item.id !== "detail")}/></EdgeAwareMenu>
  </>;
  const chip = (group: ErrorGroup) => <StateChip tone={ERROR_STATUS[group.status]?.tone ?? "mute"} title={group.resolved_at ? `${ERROR_STATUS[group.status]?.label} · ${listDateFull(group.resolved_at)}${group.resolved_by_email ? ` · ${group.resolved_by_email}` : ""}` : undefined}>{ERROR_STATUS[group.status]?.label ?? group.status}</StateChip>;
  const message = (group: ErrorGroup) => <span className="list-identity line-clamp-2 min-w-0 font-mono text-[12px] leading-snug text-fore" title={group.message}>{group.message}</span>;
  const route = (group: ErrorGroup) => <span className="list-secondary block truncate font-mono text-[11.5px] text-mute" title={group.route || "Sin ruta"}>{group.route || "—"}</span>;

  const counts = data?.counts;
  const list = data?.errors ?? [];
  return <section className="panel" aria-labelledby="platform-errors-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-errors-title" className="text-[15px] font-semibold tracking-tight text-fore">Errores</h2>
        {counts?.new ? <StateChip tone="bad" title="Grupos de errores nuevos sin revisar">{`${formatPlatformMetric(counts.new)} ${counts.new === 1 ? "nuevo" : "nuevos"}`}</StateChip> : null}
        {data ? <StateChip tone="info" title="Grupos con actividad en las últimas 24 horas">{`${formatPlatformMetric(data.last24h.groups)} en 24 h`}</StateChip> : null}
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">API y web agrupados por huella · sin datos personales en la muestra</small>
    </div>
    <FilterToolbar summary={data ? `${formatPlatformMetric(list.length)} de ${formatPlatformMetric(data.total)}` : undefined}>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Estado
        <Select aria-label="Filtrar errores por estado" value={status} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value as ErrorStatus | "")} className="min-w-[11rem]">
          <option value="">Todos{counts ? ` (${formatPlatformMetric(counts.new + counts.resolved + counts.ignored)})` : ""}</option>
          {(Object.keys(ERROR_STATUS) as ErrorStatus[]).map((key) => <option key={key} value={key}>{ERROR_STATUS[key].plural}{counts ? ` (${formatPlatformMetric(counts[key])})` : ""}</option>)}
        </Select>
      </label>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Origen
        <Select aria-label="Filtrar errores por origen" value={source} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSource(event.target.value as ErrorSource | "")} className="min-w-[9rem]">
          <option value="">API y web</option>
          {(Object.keys(ERROR_SOURCE) as ErrorSource[]).map((key) => <option key={key} value={key}>{ERROR_SOURCE[key]}</option>)}
        </Select>
      </label>
      {status || source ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => { setStatus(""); setSource(""); }}>Limpiar filtros</button> : null}
    </FilterToolbar>
    <div ref={tableRef} className="min-w-0">
      {error ? <ErrorBlock title="No pudimos cargar los errores" description={error} onRetry={() => void load()}/>
        : !data ? <LoadingBlock label="Cargando errores…" lines={3}/>
        : !list.length ? <EmptyBlock compact icon="check" title={status || source ? "Sin errores con estos filtros." : "Sin errores registrados."} description={status || source ? "Probá con otros filtros o limpialos." : "Cuando el API o la web fallen, el error aparece acá agrupado."}/>
        : tableFits ? (
          <ListGrid label="Errores agrupados" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[66rem]" pinnedActions className="platform-admin-table-wrap">
            {list.map((group) => <ListRow key={group.id} template={TEMPLATE} data-status={group.status}>
              <div role="cell" className="min-w-0">{message(group)}</div>
              <span role="cell"><StateChip tone={group.source === "api" ? "warn" : "info"}>{ERROR_SOURCE[group.source] ?? group.source}</StateChip></span>
              <div role="cell" className="min-w-0">{route(group)}</div>
              <span role="cell" className="list-amount text-right tabular-nums">{formatPlatformMetric(group.occurrences)}</span>
              <span role="cell" className="list-date" title={`Primera vez: ${listDateFull(group.first_seen_at) || "—"}`}>{listDateFull(group.last_seen_at) || "—"}</span>
              <span role="cell" className="min-w-0">{chip(group)}</span>
              <ListActions>{actions(group)}</ListActions>
            </ListRow>)}
          </ListGrid>
        ) : (
          <div className="platform-admin-error-cards grid gap-3 sm:grid-cols-2">
            {list.map((group) => <article key={group.id} data-status={group.status} className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
              <div className="flex min-w-0 items-start justify-between gap-2">{message(group)}{chip(group)}</div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[12px] text-mute">
                <StateChip tone={group.source === "api" ? "warn" : "info"}>{ERROR_SOURCE[group.source] ?? group.source}</StateChip>
                <span className="tabular-nums">{formatPlatformMetric(group.occurrences)} {group.occurrences === 1 ? "vez" : "veces"}</span>
              </div>
              {route(group)}
              <small className="list-date text-[12px]">{listDateFull(group.last_seen_at) || "—"}</small>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{actions(group)}</div>
            </article>)}
          </div>
        )}
    </div>
    {data ? <PlatformMore loaded={list.length} total={data.total} hasMore={data.hasMore} busy={busy} onMore={() => void load(status, source, list.length)} label="errores"/> : null}
    {detail ? <ErrorDetailDialog group={detail} error={detailError} writable={writable} busy={busy} onClose={() => setDetail(null)} onStatus={(next, success) => void patch(detail, next, success)}/> : null}
  </section>;
}

export function ErrorDetailDialog({group, error, writable, busy, onClose, onStatus}: {group: ErrorGroup; error?: string; writable: boolean; busy: boolean; onClose: () => void; onStatus: (next: ErrorStatus, success: string) => void}) {
  const meta = Object.entries(group.sample_meta ?? {});
  return <Dialog title="Detalle del error" close={onClose} size="amplio">
    <div className="grid min-w-0 gap-3">
      <p className="min-w-0 break-words font-mono text-[13px] font-semibold text-fore">{group.message}</p>
      <dl className="platform-admin-error-facts grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-[12.5px]">
        <dt className="text-mute">Origen</dt><dd>{ERROR_SOURCE[group.source] ?? group.source}</dd>
        <dt className="text-mute">Ruta</dt><dd className="truncate font-mono" title={group.route || undefined}>{group.route || "—"}</dd>
        <dt className="text-mute">Ocurrencias</dt><dd className="tabular-nums">{formatPlatformMetric(group.occurrences)}</dd>
        <dt className="text-mute">Primera vez</dt><dd className="list-date">{listDateFull(group.first_seen_at) || "—"}</dd>
        <dt className="text-mute">Última vez</dt><dd className="list-date">{listDateFull(group.last_seen_at) || "—"}</dd>
        <dt className="text-mute">Estado</dt><dd><StateChip tone={ERROR_STATUS[group.status]?.tone ?? "mute"}>{ERROR_STATUS[group.status]?.label ?? group.status}</StateChip></dd>
        {meta.map(([key, value]) => <Fragment key={key}><dt className="text-mute">{key}</dt><dd className="truncate font-mono">{String(value)}</dd></Fragment>)}
      </dl>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="grid min-w-0 gap-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[.08em] text-mute">Stack de muestra</p>
        {group.sample_stack === undefined ? <LoadingBlock label="Cargando stack…" lines={2}/>
          : group.sample_stack ? <pre className="platform-admin-stack max-h-72 min-w-0 overflow-auto whitespace-pre rounded-lg border border-ink-600 bg-ink-900 p-3 font-mono text-[11.5px] leading-relaxed text-fore" tabIndex={0} aria-label="Stack de muestra">{group.sample_stack}</pre>
          : <p className="form-note">Sin stack: el error llegó solo con el mensaje.</p>}
      </div>
      {writable ? <div className="inline-actions">
        {group.status !== "resolved" ? <button type="button" className="primary" disabled={busy} onClick={() => onStatus("resolved", "Error marcado como resuelto.")}>Marcar resuelto</button> : null}
        {group.status !== "ignored" ? <button type="button" className="secondary" disabled={busy} onClick={() => onStatus("ignored", "Error ignorado.")}>Ignorar</button> : null}
        {group.status !== "new" ? <button type="button" className="secondary" disabled={busy} onClick={() => onStatus("new", "Error reabierto.")}>Reabrir</button> : null}
      </div> : null}
    </div>
  </Dialog>;
}

/**
 * KPI «Errores 24 h» del Resumen (foto actual, sin período): grupos con
 * actividad en las últimas 24 horas, del mismo endpoint de la sección. Si no
 * carga, muestra «—» sin romper el Resumen; un clic lleva a «Errores».
 */
export function ErrorsKpi({onError, onGoTo}: {onError?: (cause: unknown) => boolean; onGoTo?: (view: string) => void}) {
  const [last24h, setLast24h] = useState<ErrorPage["last24h"] | null>(null);
  useEffect(() => {
    let active = true;
    platformApi<ErrorPage>("/api/platform/errors?limit=1")
      .then((page) => { if (active && page?.last24h) setLast24h(page.last24h); })
      .catch((cause) => { onError?.(cause); });
    return () => { active = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const hint = <span className="platform-kpi-hint">
    {onGoTo ? <button type="button" className="text-button platform-kpi-delta" onClick={() => onGoTo("errores")}>{last24h ? `${formatPlatformMetric(last24h.new_groups)} nuevos · ver errores` : "Ver errores"}</button>
      : <span className="platform-kpi-delta">{last24h ? `${formatPlatformMetric(last24h.new_groups)} nuevos` : "—"}</span>}
    <MetricNote source="Errores agrupados" calc="grupos con actividad en 24 h, API y web"/>
  </span>;
  return <Kpi label="Errores 24 h" valor={last24h ? formatPlatformMetric(last24h.groups) : null} hint={hint}/>;
}
