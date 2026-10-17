"use client";
import {TextareaBase} from '../ui/input';
// Consultas de la landing (formulario «¿Tenés alguna duda?»): bandeja del panel
// global. Lista densa v2 (Fecha · Nombre/empresa · Contacto · Mensaje · Estado ·
// Acciones) con tarjetas cuando la plantilla no entra, filtro por estado (en el
// API) y acciones de seguimiento solo para el administrador global.
import {useEffect, useRef, useState} from "react";
import {Select} from "owncoding-ui";
import {listDateFull} from "../list-format";
import {ConfirmDialog} from "../dialog";
import {notify} from "../feedback";
import {platformApi} from "../platform-admin-api";
import {ActionMenu, EmptyBlock, ErrorBlock, FilterToolbar, ListActions, ListGrid, ListRow, LoadingBlock, StateChip, denseTableMinWidth, useDenseTableFit, type Column, type RecordMenuItem} from "../ui-v2";
import {formatPlatformMetric, type Inquiry, type InquiryCounts, type InquiryPage, type InquiryStatus} from "./model";
import {PlatformMore} from "./states";
import {EdgeAwareMenu} from "./edge-menu";

export const INQUIRY_STATUS: Record<InquiryStatus, {label: string; tone: "warn" | "info" | "mute"}> = {
  new: {label: "Nueva", tone: "warn"},
  contacted: {label: "Contactada", tone: "info"},
  closed: {label: "Cerrada", tone: "mute"},
};
const PAGE = 50;
const TEMPLATE = "grid-cols-[8.5rem_minmax(12rem,1.1fr)_minmax(14rem,1fr)_minmax(14rem,1.4fr)_7rem_13rem]";
const MIN_WIDTH = denseTableMinWidth(8.5 + 12 + 14 + 14 + 7 + 13, 6);
const COLUMNS: Column[] = [
  {key: "date", label: "Fecha"},
  {key: "who", label: "Nombre / empresa"},
  {key: "contact", label: "Contacto"},
  {key: "message", label: "Mensaje"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones", align: "end"},
];

/** Enlace de WhatsApp (wa.me) con solo dígitos; vacío si no hay número. */
export function whatsappHref(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}
export function mailtoHref(inquiry: Pick<Inquiry, "email" | "company">) {
  return `mailto:${inquiry.email}?subject=${encodeURIComponent(`Tu consulta sobre Scale OS · ${inquiry.company}`)}`;
}
export function inquiriesQuery(status: InquiryStatus | "", offset = 0) {
  const params = new URLSearchParams({limit: String(PAGE)});
  if (offset) params.set("offset", String(offset));
  if (status) params.set("status", status);
  return `/api/platform/inquiries?${params}`;
}
const openExternal = (href: string) => { if (typeof window !== "undefined") window.open(href, href.startsWith("mailto:") ? "_self" : "_blank", "noopener,noreferrer"); };

type Props = {
  writable: boolean;
  /** Devuelve true si el error ya se resolvió (sesión vencida, etc.). */
  onError: (cause: unknown) => boolean;
  /** Contadores por estado (el marco muestra las nuevas en la pestaña). */
  onCounts?: (counts: InquiryCounts) => void;
};

export function PlatformInquiries({writable, onError, onCounts}: Props) {
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const [status, setStatus] = useState<InquiryStatus | "">("");
  const [data, setData] = useState<InquiryPage | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [noteFor, setNoteFor] = useState<Inquiry | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState("");
  const request = useRef(0);

  async function load(nextStatus = status, offset = 0) {
    const ticket = ++request.current;
    setBusy(true);
    setError("");
    try {
      const page = await platformApi<InquiryPage>(inquiriesQuery(nextStatus, offset));
      if (ticket !== request.current) return;
      setData((current) => offset && current ? {...page, inquiries: [...current.inquiries, ...page.inquiries]} : page);
      onCounts?.(page.counts);
    } catch (cause) {
      if (ticket === request.current && !onError(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar las consultas.");
    } finally {
      if (ticket === request.current) setBusy(false);
    }
  }
  useEffect(() => { void load(status); }, [status]);

  async function patch(inquiry: Inquiry, body: {status?: InquiryStatus; note?: string | null}, success: string) {
    setBusy(true);
    try {
      const result = await platformApi<{inquiry: Inquiry; counts: InquiryCounts}>(`/api/platform/inquiries/${inquiry.id}`, {method: "PATCH", body: JSON.stringify(body)});
      setData((current) => current ? {
        ...current,
        counts: result.counts,
        // Con un filtro de estado, la consulta que cambia de estado sale de la vista.
        inquiries: status && result.inquiry.status !== status
          ? current.inquiries.filter((item) => item.id !== inquiry.id)
          : current.inquiries.map((item) => item.id === inquiry.id ? result.inquiry : item),
        total: status && result.inquiry.status !== status ? Math.max(0, current.total - 1) : current.total,
      } : current);
      onCounts?.(result.counts);
      notify({tone: "success", message: success});
      return true;
    } catch (cause) {
      if (!onError(cause)) notify({tone: "error", message: cause instanceof Error ? cause.message : "No pudimos actualizar la consulta."});
      return false;
    } finally {
      setBusy(false);
    }
  }

  function openNote(inquiry: Inquiry) { setNoteFor(inquiry); setNote(inquiry.note || ""); setNoteError(""); }
  async function saveNote() {
    if (!noteFor) return;
    if (note.length > 2000) { setNoteError("La nota admite hasta 2000 caracteres."); return; }
    if (await patch(noteFor, {note: note.trim() || null}, "Nota guardada.")) setNoteFor(null);
  }

  const items = (inquiry: Inquiry): RecordMenuItem[] => [
    ...(writable && inquiry.status !== "contacted" ? [{id: "contacted", label: "Marcar contactada", icono: "check", onClick: () => void patch(inquiry, {status: "contacted"}, "Consulta marcada como contactada.")}] : []),
    ...(writable && inquiry.status !== "closed" ? [{id: "closed", label: "Cerrar consulta", icono: "archive", onClick: () => void patch(inquiry, {status: "closed"}, "Consulta cerrada.")}] : []),
    ...(writable && inquiry.status === "closed" ? [{id: "reopen", label: "Reabrir como nueva", icono: "refresh", onClick: () => void patch(inquiry, {status: "new"}, "Consulta reabierta.")}] : []),
    ...(writable ? [{id: "note", label: inquiry.note ? "Editar nota" : "Agregar nota", icono: "edit", onClick: () => openNote(inquiry)}] : []),
    {id: "mail", label: "Responder por correo", icono: "mail", onClick: () => openExternal(mailtoHref(inquiry))},
    ...(whatsappHref(inquiry.whatsapp) ? [{id: "whatsapp", label: "Abrir WhatsApp", icono: "phone", onClick: () => openExternal(whatsappHref(inquiry.whatsapp))}] : []),
  ];
  const primary = (inquiry: Inquiry) => writable && inquiry.status === "new"
    ? <button type="button" className="text-button platform-admin-inline-action" disabled={busy} onClick={() => void patch(inquiry, {status: "contacted"}, "Consulta marcada como contactada.")}>Marcar contactada</button>
    : null;
  const actions = (inquiry: Inquiry) => <>
    {primary(inquiry)}
    <EdgeAwareMenu><ActionMenu label={`Acciones de la consulta de ${inquiry.name}`} items={items(inquiry).filter((item) => !(item.id === "contacted" && inquiry.status === "new"))}/></EdgeAwareMenu>
  </>;
  const contact = (inquiry: Inquiry) => {
    const wa = whatsappHref(inquiry.whatsapp);
    return <span className="grid min-w-0 gap-0.5">
      <a className="list-secondary truncate text-[12.5px] text-fore underline-offset-2 hover:underline" href={mailtoHref(inquiry)} title={`Escribir a ${inquiry.email}`}>{inquiry.email}</a>
      {wa ? <a className="truncate text-[12px] text-mute underline-offset-2 hover:underline" href={wa} target="_blank" rel="noopener noreferrer" title={`Abrir WhatsApp con ${inquiry.whatsapp}`}>WhatsApp {inquiry.whatsapp}</a> : <span className="text-[12px] text-mute">Sin WhatsApp</span>}
    </span>;
  };
  const who = (inquiry: Inquiry) => <span className="grid min-w-0 gap-0.5">
    <b className="list-identity truncate text-[13px] font-semibold text-fore" title={inquiry.name}>{inquiry.name}</b>
    <small className="truncate text-[12px] text-mute" title={inquiry.company}>{inquiry.company}</small>
  </span>;
  const message = (inquiry: Inquiry) => {
    const full = inquiry.message?.trim() || "";
    const noteText = inquiry.note ? `Nota: ${inquiry.note}` : "";
    return <span className="grid min-w-0 gap-0.5">
      <span className={`line-clamp-2 text-[12.5px] leading-snug ${full ? "text-fore" : "text-mute"}`} title={full || "Sin mensaje"}>{full || "Sin mensaje"}</span>
      {noteText ? <small className="truncate text-[11.5px] text-mute" title={noteText}>{noteText}</small> : null}
    </span>;
  };
  const chip = (inquiry: Inquiry) => <StateChip tone={INQUIRY_STATUS[inquiry.status]?.tone ?? "mute"} title={inquiry.handled_at ? `${INQUIRY_STATUS[inquiry.status]?.label} · ${listDateFull(inquiry.handled_at)}${inquiry.handled_by_email ? ` · ${inquiry.handled_by_email}` : ""}` : undefined}>{INQUIRY_STATUS[inquiry.status]?.label ?? inquiry.status}</StateChip>;

  const counts = data?.counts;
  const list = data?.inquiries ?? [];
  return <section className="panel" aria-labelledby="platform-inquiries-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-inquiries-title" className="text-[15px] font-semibold tracking-tight text-fore">Consultas de la landing</h2>
        {counts?.new ? <StateChip tone="warn" title="Consultas nuevas sin atender">{`${formatPlatformMetric(counts.new)} ${counts.new === 1 ? "nueva" : "nuevas"}`}</StateChip> : null}
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">Formulario «¿Tenés alguna duda?» · cada consulta también llega por correo</small>
    </div>
    <FilterToolbar summary={data ? `${formatPlatformMetric(list.length)} de ${formatPlatformMetric(data.total)}` : undefined}>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Estado
        <Select aria-label="Filtrar consultas por estado" value={status} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value as InquiryStatus | "")} className="min-w-[12rem]">
          <option value="">Todas{counts ? ` (${formatPlatformMetric(counts.new + counts.contacted + counts.closed)})` : ""}</option>
          {(Object.keys(INQUIRY_STATUS) as InquiryStatus[]).map((key) => <option key={key} value={key}>{INQUIRY_STATUS[key].label}s{counts ? ` (${formatPlatformMetric(counts[key])})` : ""}</option>)}
        </Select>
      </label>
      {status ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setStatus("")}>Limpiar filtro</button> : null}
    </FilterToolbar>
    <div ref={tableRef} className="min-w-0">
      {error ? <ErrorBlock title="No pudimos cargar las consultas" description={error} onRetry={() => void load()}/>
        : !data ? <LoadingBlock label="Cargando consultas…" lines={3}/>
        : !list.length ? <EmptyBlock compact icon="mail" title={status ? "Sin consultas con este estado." : "Todavía no hay consultas."} description={status ? "Probá con otro estado o limpiá el filtro." : "Cuando alguien complete el formulario de la landing, la consulta aparece acá y te llega un correo."}/>
        : tableFits ? (
          <ListGrid label="Consultas de la landing" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[70rem]" pinnedActions className="platform-admin-table-wrap">
            {list.map((inquiry) => <ListRow key={inquiry.id} template={TEMPLATE} data-status={inquiry.status}>
              <span role="cell" className="list-date" title={listDateFull(inquiry.created_at) || undefined}>{listDateFull(inquiry.created_at) || "—"}</span>
              <div role="cell" className="min-w-0">{who(inquiry)}</div>
              <div role="cell" className="min-w-0">{contact(inquiry)}</div>
              <div role="cell" className="min-w-0">{message(inquiry)}</div>
              <span role="cell" className="min-w-0">{chip(inquiry)}</span>
              <ListActions>{actions(inquiry)}</ListActions>
            </ListRow>)}
          </ListGrid>
        ) : (
          <div className="platform-admin-inquiry-cards grid gap-3 sm:grid-cols-2">
            {list.map((inquiry) => <article key={inquiry.id} data-status={inquiry.status} className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
              <div className="flex min-w-0 items-start justify-between gap-2">{who(inquiry)}{chip(inquiry)}</div>
              {contact(inquiry)}
              {message(inquiry)}
              <small className="list-date text-[12px]">{listDateFull(inquiry.created_at) || "—"}</small>
              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{actions(inquiry)}</div>
            </article>)}
          </div>
        )}
    </div>
    {data ? <PlatformMore loaded={list.length} total={data.total} hasMore={data.hasMore} busy={busy} onMore={() => void load(status, list.length)} label="consultas"/> : null}
    {noteFor ? <ConfirmDialog
      title={`Nota · ${noteFor.name}`}
      description={<p className="form-note">Solo la ve el equipo de administración global.</p>}
      confirmLabel="Guardar nota"
      busy={busy}
      error={noteError}
      onCancel={() => { if (!busy) setNoteFor(null); }}
      onConfirm={() => void saveNote()}
    >
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Nota interna
        <TextareaBase value={note} disabled={busy} maxLength={2000} rows={4} placeholder="Ej.: llamar el lunes, pidió demo para 5 usuarios" onChange={(event) => setNote(event.target.value)}/>
      </label>
    </ConfirmDialog> : null}
  </section>;
}
