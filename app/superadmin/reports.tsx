"use client";
// «Reportes» del panel global: lo que los usuarios mandan con «Reportar un
// problema». Lista densa v2 (Fecha · Agencia / usuario · Reporte · Ruta y
// versión · Estado · Acciones) con tarjetas cuando no entra, filtro por estado
// (en el API) y, para el administrador global, cambio de estado + nota interna.
import {useEffect, useRef, useState} from "react";
import {Select} from "owncoding-ui";
import {listDateFull} from "../list-format";
import {ConfirmDialog} from "../dialog";
import {notify} from "../feedback";
import {platformApi} from "../platform-admin-api";
import {SelectCustom} from "../profile-controls";
import {REPORT_CATEGORY_LABELS} from "../report-problem";
import {ActionMenu, EmptyBlock, ErrorBlock, FilterToolbar, ListActions, ListGrid, ListRow, LoadingBlock, StateChip, denseTableMinWidth, useDenseTableFit, type Column, type RecordMenuItem} from "../ui-v2";
import {formatPlatformMetric, type ReportCounts, type ReportPage, type ReportStatus, type UserReport} from "./model";
import {PlatformMore} from "./states";
import {EdgeAwareMenu} from "./edge-menu";

export const REPORT_STATUS: Record<ReportStatus, {label: string; plural: string; tone: "warn" | "info" | "ok"}> = {
  new: {label: "Nuevo", plural: "Nuevos", tone: "warn"},
  in_progress: {label: "En curso", plural: "En curso", tone: "info"},
  resolved: {label: "Resuelto", plural: "Resueltos", tone: "ok"},
};
const PAGE = 50;
const TEMPLATE = "grid-cols-[8.5rem_minmax(12rem,1fr)_minmax(16rem,1.6fr)_minmax(9rem,0.8fr)_6.5rem_12rem]";
const MIN_WIDTH = denseTableMinWidth(8.5 + 12 + 16 + 9 + 6.5 + 12, 6);
const COLUMNS: Column[] = [
  {key: "date", label: "Fecha"},
  {key: "who", label: "Agencia / usuario"},
  {key: "report", label: "Reporte"},
  {key: "where", label: "Ruta y versión"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones", align: "end"},
];

export function reportsQuery(status: ReportStatus | "", offset = 0) {
  const params = new URLSearchParams({limit: String(PAGE)});
  if (offset) params.set("offset", String(offset));
  if (status) params.set("status", status);
  return `/api/platform/reports?${params}`;
}

type Props = {
  writable: boolean;
  onError: (cause: unknown) => boolean;
  onCounts?: (counts: ReportCounts) => void;
  /** Datos iniciales (harness y tests); sin ellos se cargan del API. */
  initialData?: ReportPage;
};

export function PlatformReports({writable, onError, onCounts, initialData}: Props) {
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [data, setData] = useState<ReportPage | null>(initialData ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UserReport | null>(null);
  const [draftStatus, setDraftStatus] = useState<ReportStatus>("new");
  const [note, setNote] = useState("");
  const [editError, setEditError] = useState("");
  const request = useRef(0);
  const skipFirst = useRef(Boolean(initialData));

  async function load(nextStatus = status, offset = 0) {
    const ticket = ++request.current;
    setBusy(true);
    setError("");
    try {
      const page = await platformApi<ReportPage>(reportsQuery(nextStatus, offset));
      if (ticket !== request.current) return;
      setData((current) => offset && current ? {...page, reports: [...current.reports, ...page.reports]} : page);
      onCounts?.(page.counts);
    } catch (cause) {
      if (ticket === request.current && !onError(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar los reportes.");
    } finally {
      if (ticket === request.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (skipFirst.current) { skipFirst.current = false; return; }
    void load(status);
  }, [status]);

  async function patch(report: UserReport, body: {status?: ReportStatus; note?: string | null}, success: string) {
    setBusy(true);
    try {
      const result = await platformApi<{report: UserReport; counts: ReportCounts}>(`/api/platform/reports/${report.id}`, {method: "PATCH", body: JSON.stringify(body)});
      setData((current) => current ? {
        ...current,
        counts: result.counts,
        reports: status && result.report.status !== status
          ? current.reports.filter((item) => item.id !== report.id)
          : current.reports.map((item) => item.id === report.id ? result.report : item),
        total: status && result.report.status !== status ? Math.max(0, current.total - 1) : current.total,
      } : current);
      onCounts?.(result.counts);
      notify({tone: "success", message: success});
      return true;
    } catch (cause) {
      if (!onError(cause)) notify({tone: "error", message: cause instanceof Error ? cause.message : "No pudimos actualizar el reporte."});
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openEditor(report: UserReport) { setEditing(report); setDraftStatus(report.status); setNote(report.note || ""); setEditError(""); }
  async function saveEditor() {
    if (!editing) return;
    if (note.length > 2000) { setEditError("La nota admite hasta 2000 caracteres."); return; }
    const body: {status?: ReportStatus; note?: string | null} = {};
    if (draftStatus !== editing.status) body.status = draftStatus;
    if ((note.trim() || null) !== (editing.note || null)) body.note = note.trim() || null;
    if (!Object.keys(body).length) { setEditing(null); return; }
    if (await patch(editing, body, "Reporte actualizado.")) setEditing(null);
  }

  const items = (report: UserReport): RecordMenuItem[] => [
    ...(writable && report.status !== "in_progress" ? [{id: "in_progress", label: "Marcar en curso", icono: "refresh", onClick: () => void patch(report, {status: "in_progress"}, "Reporte en curso.")}] : []),
    ...(writable && report.status !== "resolved" ? [{id: "resolved", label: "Marcar resuelto", icono: "check", onClick: () => void patch(report, {status: "resolved"}, "Reporte resuelto.")}] : []),
    ...(writable && report.status !== "new" ? [{id: "reopen", label: "Reabrir como nuevo", icono: "refresh", onClick: () => void patch(report, {status: "new"}, "Reporte reabierto.")}] : []),
    ...(writable ? [{id: "note", label: report.note ? "Editar estado y nota" : "Cambiar estado y nota", icono: "edit", onClick: () => openEditor(report)}] : []),
  ];
  const actions = (report: UserReport) => writable ? <>
    {report.status === "new" ? <button type="button" className="text-button platform-admin-inline-action" disabled={busy} onClick={() => void patch(report, {status: "in_progress"}, "Reporte en curso.")}>Tomar</button> : null}
    <EdgeAwareMenu><ActionMenu label={`Acciones del reporte de ${report.user_email || "usuario"}`} items={items(report)}/></EdgeAwareMenu>
  </> : null;
  const who = (report: UserReport) => <span className="grid min-w-0 gap-0.5">
    <b className="list-identity truncate text-[13px] font-semibold text-fore" title={report.organization_name || "Sin agencia"}>{report.organization_name || "Sin agencia"}</b>
    <small className="truncate text-[12px] text-mute" title={report.user_email || undefined}>{report.user_name || report.user_email || "Usuario eliminado"}</small>
  </span>;
  const body = (report: UserReport) => <span className="grid min-w-0 gap-0.5">
    <span className="flex min-w-0 items-center gap-1.5"><StateChip tone="mute">{REPORT_CATEGORY_LABELS[report.category] ?? report.category}</StateChip></span>
    <span className="line-clamp-2 text-[12.5px] leading-snug text-fore" title={report.message}>{report.message}</span>
    {report.note ? <small className="truncate text-[11.5px] text-mute" title={`Nota: ${report.note}`}>Nota: {report.note}</small> : null}
  </span>;
  const where = (report: UserReport) => <span className="grid min-w-0 gap-0.5">
    <span className="list-secondary truncate font-mono text-[11.5px] text-mute" title={report.route || undefined}>{report.route || "—"}</span>
    <small className="text-[11.5px] tabular-nums text-mute">{report.app_version ? `v${report.app_version}` : "Sin versión"}</small>
  </span>;
  const chip = (report: UserReport) => <StateChip tone={REPORT_STATUS[report.status]?.tone ?? "mute"} title={report.handled_at ? `${REPORT_STATUS[report.status]?.label} · ${listDateFull(report.handled_at)}${report.handled_by_email ? ` · ${report.handled_by_email}` : ""}` : undefined}>{REPORT_STATUS[report.status]?.label ?? report.status}</StateChip>;

  const counts = data?.counts;
  const list = data?.reports ?? [];
  return <section className="panel" aria-labelledby="platform-reports-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-reports-title" className="text-[15px] font-semibold tracking-tight text-fore">Reportes de usuarios</h2>
        {counts?.new ? <StateChip tone="warn" title="Reportes nuevos sin tomar">{`${formatPlatformMetric(counts.new)} ${counts.new === 1 ? "nuevo" : "nuevos"}`}</StateChip> : null}
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">«Reportar un problema» desde el menú del usuario · máx. 5 por hora por persona</small>
    </div>
    <FilterToolbar summary={data ? `${formatPlatformMetric(list.length)} de ${formatPlatformMetric(data.total)}` : undefined}>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Estado
        <Select aria-label="Filtrar reportes por estado" value={status} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value as ReportStatus | "")} className="min-w-[11rem]">
          <option value="">Todos{counts ? ` (${formatPlatformMetric(counts.new + counts.in_progress + counts.resolved)})` : ""}</option>
          {(Object.keys(REPORT_STATUS) as ReportStatus[]).map((key) => <option key={key} value={key}>{REPORT_STATUS[key].plural}{counts ? ` (${formatPlatformMetric(counts[key])})` : ""}</option>)}
        </Select>
      </label>
      {status ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setStatus("")}>Limpiar filtro</button> : null}
    </FilterToolbar>
    <div ref={tableRef} className="min-w-0">
      {error ? <ErrorBlock title="No pudimos cargar los reportes" description={error} onRetry={() => void load()}/>
        : !data ? <LoadingBlock label="Cargando reportes…" lines={3}/>
        : !list.length ? <EmptyBlock compact icon="mail" title={status ? "Sin reportes con este estado." : "Todavía no hay reportes."} description={status ? "Probá con otro estado o limpiá el filtro." : "Cuando alguien use «Reportar un problema», el reporte aparece acá."}/>
        : tableFits ? (
          <ListGrid label="Reportes de usuarios" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[66rem]" pinnedActions className="platform-admin-table-wrap">
            {list.map((report) => <ListRow key={report.id} template={TEMPLATE} data-status={report.status}>
              <span role="cell" className="list-date" title={listDateFull(report.created_at) || undefined}>{listDateFull(report.created_at) || "—"}</span>
              <div role="cell" className="min-w-0">{who(report)}</div>
              <div role="cell" className="min-w-0">{body(report)}</div>
              <div role="cell" className="min-w-0">{where(report)}</div>
              <span role="cell" className="min-w-0">{chip(report)}</span>
              <ListActions>{actions(report)}</ListActions>
            </ListRow>)}
          </ListGrid>
        ) : (
          <div className="platform-admin-report-cards grid gap-3 sm:grid-cols-2">
            {list.map((report) => <article key={report.id} data-status={report.status} className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
              <div className="flex min-w-0 items-start justify-between gap-2">{who(report)}{chip(report)}</div>
              {body(report)}
              {where(report)}
              <small className="list-date text-[12px]">{listDateFull(report.created_at) || "—"}</small>
              {writable ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{actions(report)}</div> : null}
            </article>)}
          </div>
        )}
    </div>
    {data ? <PlatformMore loaded={list.length} total={data.total} hasMore={data.hasMore} busy={busy} onMore={() => void load(status, list.length)} label="reportes"/> : null}
    {editing ? <ConfirmDialog
      title={`Reporte · ${editing.organization_name || editing.user_email || "usuario"}`}
      description={<p className="form-note">La nota solo la ve el equipo de administración global.</p>}
      confirmLabel="Guardar"
      busy={busy}
      error={editError}
      onCancel={() => { if (!busy) setEditing(null); }}
      onConfirm={() => void saveEditor()}
    >
      <SelectCustom label="Estado" choices={(Object.keys(REPORT_STATUS) as ReportStatus[]).map((value) => ({value, label: REPORT_STATUS[value].label}))} value={draftStatus} disabled={busy} onChange={(value: string) => setDraftStatus(value as ReportStatus)}/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Nota interna
        <textarea value={note} disabled={busy} maxLength={2000} rows={4} placeholder="Ej.: reproducido, se corrige en la próxima versión" onChange={(event) => setNote(event.target.value)}/>
      </label>
    </ConfirmDialog> : null}
  </section>;
}
