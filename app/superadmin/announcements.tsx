"use client";
// Comunicados del panel global: alta/edición con vista previa (el mismo banner que
// ve la persona en su espacio), publicar/despublicar y lista con % de lecturas
// sobre usuarios reales (sin demo). Sección independiente: se registra con una
// sola entrada en la navegación del panel.
import {useEffect, useRef, useState, type FormEvent} from "react";
import {SelectCustom} from "../profile-controls";
import {OptionalMark} from "../field-label";
import {ConfirmDialog} from "../dialog";
import {notify} from "../feedback";
import {listDateFull, listDateShort} from "../list-format";
import {asuncionInput, platformApi, subscriptionExpiry} from "../platform-admin-api";
import {AnnouncementBannerView, ANNOUNCEMENT_KIND_LABEL, type AnnouncementKind} from "../announcement-banner";
import {ActionMenu, EmptyBlock, ErrorBlock, ListActions, ListGrid, ListRow, LoadingBlock, StateChip, denseTableMinWidth, useDenseTableFit, type ChipTone, type Column, type RecordMenuItem} from "../ui-v2";
import {EdgeAwareMenu} from "./edge-menu";
import {formatPlatformMetric} from "./model";

export const ANNOUNCEMENT_TITLE_MAX = 80;
export const ANNOUNCEMENT_MESSAGE_MAX = 500;
export type AnnouncementStatus = "draft" | "scheduled" | "active" | "expired";
/** Contrato de `GET /api/platform/announcements`. */
export type PlatformAnnouncement = {
  id: number | string;
  title: string;
  message: string;
  kind: AnnouncementKind;
  priority: number;
  organization_id: number | string | null;
  organization_name: string | null;
  starts_at: string;
  ends_at: string | null;
  published_at: string | null;
  created_at: string;
  status: AnnouncementStatus;
  audience_users: number;
  reads: number;
  read_pct: number;
};
export type AnnouncementDraft = {title: string; message: string; kind: AnnouncementKind; priority: string; organizationId: string; startsAt: string; endsAt: string};
export const EMPTY_ANNOUNCEMENT: AnnouncementDraft = {title: "", message: "", kind: "info", priority: "3", organizationId: "", startsAt: "", endsAt: ""};

export const ANNOUNCEMENT_STATUS: Record<AnnouncementStatus, {label: string; tone: ChipTone}> = {
  draft: {label: "Borrador", tone: "mute"},
  scheduled: {label: "Programado", tone: "info"},
  active: {label: "Publicado", tone: "ok"},
  expired: {label: "Vencido", tone: "warn"},
};
const KINDS: AnnouncementKind[] = ["info", "aviso", "novedad"];
const chars = (value: string) => [...value].length;
const localInstant = (value: string, label: string) => {
  if (!value) return null;
  try { return subscriptionExpiry(value); } catch { throw Error(`Elegí una fecha y hora válidas para ${label}.`); }
};

/** Cuerpo del API a partir del borrador; valida longitudes y la ventana de vigencia. */
export function announcementPayload(draft: AnnouncementDraft) {
  const title = draft.title.trim(), message = draft.message.trim();
  if (!title) throw Error("Escribí el título del comunicado.");
  if (chars(title) > ANNOUNCEMENT_TITLE_MAX) throw Error(`El título admite hasta ${ANNOUNCEMENT_TITLE_MAX} caracteres.`);
  if (!message) throw Error("Escribí el mensaje del comunicado.");
  if (chars(message) > ANNOUNCEMENT_MESSAGE_MAX) throw Error(`El mensaje admite hasta ${ANNOUNCEMENT_MESSAGE_MAX} caracteres.`);
  const priority = Number(draft.priority);
  if (!Number.isInteger(priority) || priority < 1 || priority > 5) throw Error("La prioridad va de 1 (más alta) a 5.");
  const startsAt = localInstant(draft.startsAt, "el inicio"), endsAt = localInstant(draft.endsAt, "el fin");
  if (endsAt && Date.parse(endsAt) <= Date.parse(startsAt || new Date().toISOString())) throw Error("La vigencia debe terminar después de empezar.");
  return {title, message, kind: draft.kind, priority, organizationId: draft.organizationId || null, startsAt, endsAt};
}
export function draftFrom(item: PlatformAnnouncement): AnnouncementDraft {
  return {title: item.title, message: item.message, kind: item.kind, priority: String(item.priority), organizationId: item.organization_id === null ? "" : String(item.organization_id), startsAt: asuncionInput(item.starts_at), endsAt: item.ends_at ? asuncionInput(item.ends_at) : ""};
}
export function readLabel(item: Pick<PlatformAnnouncement, "read_pct">) {
  const pct = Number(item.read_pct);
  return `${new Intl.NumberFormat("es-PY", {maximumFractionDigits: 1}).format(Number.isFinite(pct) ? pct : 0)} %`;
}

const FIELD = "grid min-w-0 gap-1.5 text-[11px] font-semibold text-mute";
const TEMPLATE = "grid-cols-[minmax(14rem,1.6fr)_6rem_4.5rem_minmax(8rem,1fr)_9.5rem_6.5rem_6.5rem_12rem]";
const MIN_WIDTH = denseTableMinWidth(14 + 6 + 4.5 + 8 + 9.5 + 6.5 + 6.5 + 12, 8);
const COLUMNS: Column[] = [
  {key: "announcement", label: "Comunicado"},
  {key: "kind", label: "Tipo"},
  {key: "priority", label: "Prior.", align: "end"},
  {key: "audience", label: "Audiencia"},
  {key: "window", label: "Vigencia"},
  {key: "reads", label: "Leídas", align: "end"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones", align: "end"},
];

type Props = {
  writable: boolean;
  agencies: {id: number | string; name: string}[];
  /** Devuelve true si el error ya se resolvió (sesión vencida, etc.). */
  onError: (cause: unknown) => boolean;
};

export function PlatformAnnouncements({writable, agencies, onError}: Props) {
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const [items, setItems] = useState<PlatformAnnouncement[] | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_ANNOUNCEMENT);
  const [editing, setEditing] = useState<PlatformAnnouncement | null>(null);
  const [removing, setRemoving] = useState<PlatformAnnouncement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setError("");
    try {
      const data = await platformApi<{announcements: PlatformAnnouncement[]}>("/api/platform/announcements");
      setItems(data.announcements);
    } catch (cause) {
      if (!onError(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar los comunicados.");
    }
  }
  useEffect(() => { void load(); }, []);

  const replace = (next: PlatformAnnouncement) => setItems((current) => current ? (current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [next, ...current]) : [next]);

  async function save(event: FormEvent | null, publish: boolean) {
    event?.preventDefault();
    if (busy) return;
    let payload;
    try { payload = announcementPayload(draft); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Revisá el comunicado."); return; }
    setBusy(true); setFormError("");
    try {
      let saved = editing
        ? (await platformApi<{announcement: PlatformAnnouncement}>(`/api/platform/announcements/${editing.id}`, {method: "PATCH", body: JSON.stringify(payload)})).announcement
        : (await platformApi<{announcement: PlatformAnnouncement}>("/api/platform/announcements", {method: "POST", body: JSON.stringify(payload)})).announcement;
      if (publish && !saved.published_at) saved = (await platformApi<{announcement: PlatformAnnouncement}>(`/api/platform/announcements/${saved.id}/publish`, {method: "POST", body: "{}"})).announcement;
      replace(saved);
      notify({tone: "success", message: publish ? "Comunicado publicado." : editing ? "Comunicado actualizado." : "Borrador guardado."});
      setDraft(EMPTY_ANNOUNCEMENT); setEditing(null);
    } catch (cause) {
      if (!onError(cause)) setFormError(cause instanceof Error ? cause.message : "No pudimos guardar el comunicado.");
    } finally { setBusy(false); }
  }

  async function toggle(item: PlatformAnnouncement) {
    const action = item.published_at ? "unpublish" : "publish";
    setBusy(true);
    try {
      replace((await platformApi<{announcement: PlatformAnnouncement}>(`/api/platform/announcements/${item.id}/${action}`, {method: "POST", body: "{}"})).announcement);
      notify({tone: "success", message: action === "publish" ? "Comunicado publicado." : "Comunicado despublicado."});
    } catch (cause) {
      if (!onError(cause)) notify({tone: "error", message: cause instanceof Error ? cause.message : "No pudimos actualizar el comunicado."});
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!removing) return;
    setBusy(true);
    try {
      await platformApi(`/api/platform/announcements/${removing.id}`, {method: "DELETE"});
      setItems((current) => current?.filter((item) => item.id !== removing.id) ?? current);
      if (editing?.id === removing.id) { setEditing(null); setDraft(EMPTY_ANNOUNCEMENT); }
      notify({tone: "success", message: "Comunicado eliminado."});
      setRemoving(null);
    } catch (cause) {
      if (!onError(cause)) notify({tone: "error", message: cause instanceof Error ? cause.message : "No pudimos eliminar el comunicado."});
    } finally { setBusy(false); }
  }
  function edit(item: PlatformAnnouncement) {
    setEditing(item); setDraft(draftFrom(item)); setFormError("");
    titleRef.current?.focus();
  }

  const list = items ?? [];
  const titleLeft = ANNOUNCEMENT_TITLE_MAX - chars(draft.title), messageLeft = ANNOUNCEMENT_MESSAGE_MAX - chars(draft.message);
  return <section className="panel" aria-labelledby="platform-announcements-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-announcements-title" className="text-[15px] font-semibold tracking-tight text-fore">Comunicados</h2>
        {items ? <StateChip tone="mute" title="Comunicados cargados">{formatPlatformMetric(list.length)}</StateChip> : null}
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">Banner arriba del espacio de trabajo · uno por vez, por prioridad · se cierra y queda leído</small>
    </div>
    {writable ? <form className="mb-4 grid gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4" onSubmit={(event) => void save(event, false)} aria-label={editing ? "Editar comunicado" : "Nuevo comunicado"}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-3">
          <label className={FIELD}>
            <span className="flex justify-between gap-2">Título <span className="tabular-nums" aria-hidden="true">{titleLeft}</span></span>
            <input ref={titleRef} value={draft.title} maxLength={ANNOUNCEMENT_TITLE_MAX} required placeholder="Ej.: Nueva vista de producción" aria-describedby="announcement-title-left" onChange={(event) => setDraft({...draft, title: event.target.value})}/>
            <span id="announcement-title-left" className="sr-only">Quedan {titleLeft} caracteres</span>
          </label>
          <label className={FIELD}>
            <span className="flex justify-between gap-2">Mensaje <span className="tabular-nums" aria-hidden="true">{messageLeft}</span></span>
            <textarea value={draft.message} maxLength={ANNOUNCEMENT_MESSAGE_MAX} rows={4} required placeholder="Texto plano, sin HTML. Los saltos de línea se respetan." onChange={(event) => setDraft({...draft, message: event.target.value})}/>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectCustom label="Tipo" value={draft.kind} choices={KINDS.map((kind) => ({value: kind, label: ANNOUNCEMENT_KIND_LABEL[kind]}))} onChange={(value) => setDraft({...draft, kind: value as AnnouncementKind})}/>
            <SelectCustom label="Prioridad" value={draft.priority} choices={[1, 2, 3, 4, 5].map((n) => ({value: String(n), label: n === 1 ? "1 · más alta" : n === 5 ? "5 · más baja" : String(n)}))} onChange={(value) => setDraft({...draft, priority: value})}/>
          </div>
          <SelectCustom label="Audiencia" value={draft.organizationId} choices={[{value: "", label: "Todas las agencias"}, ...agencies.map((agency) => ({value: String(agency.id), label: agency.name || `Agencia #${agency.id}`}))]} onChange={(value) => setDraft({...draft, organizationId: value})}/>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={FIELD}>Vigente desde<OptionalMark/><input type="datetime-local" className="max-w-[14rem]" value={draft.startsAt} onChange={(event) => setDraft({...draft, startsAt: event.target.value})}/></label>
            <label className={FIELD}>Vigente hasta<OptionalMark/><input type="datetime-local" className="max-w-[14rem]" value={draft.endsAt} min={draft.startsAt || undefined} onChange={(event) => setDraft({...draft, endsAt: event.target.value})}/></label>
          </div>
          <p className="text-[11.5px] text-mute">Sin «desde» empieza al publicar; sin «hasta» queda vigente hasta despublicarlo. Hora de Asunción.</p>
        </div>
        <div className="grid min-w-0 content-start gap-2" aria-label="Vista previa del comunicado">
          <span className="text-[11px] font-semibold text-mute">Vista previa</span>
          <AnnouncementBannerView preview announcement={{title: draft.title.trim(), message: draft.message.trim(), kind: draft.kind}} onDismiss={() => {}}/>
          <small className="text-[11.5px] text-mute">Así lo ve cada persona arriba de su espacio. Al cerrarlo cuenta como leído.</small>
        </div>
      </div>
      {formError ? <p className="error form-error-summary" role="alert">{formError}</p> : null}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {editing ? <button type="button" className="text-button min-h-11 md:min-h-10" disabled={busy} onClick={() => { setEditing(null); setDraft(EMPTY_ANNOUNCEMENT); setFormError(""); }}>Cancelar edición</button> : null}
        <button type="submit" className="secondary min-h-11 whitespace-nowrap md:min-h-10" disabled={busy}>{editing ? "Guardar cambios" : "Guardar borrador"}</button>
        {!editing?.published_at ? <button type="button" className="primary min-h-11 whitespace-nowrap md:min-h-10" disabled={busy} onClick={() => void save(null, true)}>{editing ? "Guardar y publicar" : "Publicar"}</button> : null}
      </div>
    </form> : null}
    <div ref={tableRef} className="min-w-0">
      {error ? <ErrorBlock title="No pudimos cargar los comunicados" description={error} onRetry={() => void load()}/>
        : !items ? <LoadingBlock label="Cargando comunicados…" lines={3}/>
        : !list.length ? <EmptyBlock compact icon="megaphone" title="Todavía no hay comunicados." description="Creá uno arriba: se guarda como borrador hasta que lo publiques."/>
        : <AnnouncementList items={list} writable={writable} busy={busy} fits={tableFits} onToggle={(item) => void toggle(item)} onEdit={edit} onRemove={setRemoving}/>}
    </div>
    {removing ? <ConfirmDialog
      title={`Eliminar «${removing.title}»`}
      description={<p className="form-note">Se borra el comunicado y sus lecturas. Si está publicado, deja de verse al instante.</p>}
      confirmLabel="Eliminar"
      variant="danger"
      busy={busy}
      onCancel={() => { if (!busy) setRemoving(null); }}
      onConfirm={() => void remove()}
    /> : null}
  </section>;
}

type ListProps = {
  items: PlatformAnnouncement[];
  writable: boolean;
  busy: boolean;
  /** La plantilla densa entra en el contenedor; si no, tarjetas. */
  fits: boolean;
  onToggle: (item: PlatformAnnouncement) => void;
  onEdit: (item: PlatformAnnouncement) => void;
  onRemove: (item: PlatformAnnouncement) => void;
};

/** Lista densa (o tarjetas) de comunicados: Comunicado · Tipo · Prior. · Audiencia · Vigencia · Leídas · Estado · Acciones. */
export function AnnouncementList({items, writable, busy, fits, onToggle, onEdit, onRemove}: ListProps) {
  const audience = (item: PlatformAnnouncement) => item.organization_id === null ? "Todas las agencias" : (item.organization_name || `Agencia #${item.organization_id}`);
  const windowLabel = (item: PlatformAnnouncement) => `${listDateShort(item.starts_at) || "—"} → ${item.ends_at ? listDateShort(item.ends_at) : "sin fin"}`;
  const windowTitle = (item: PlatformAnnouncement) => `Desde ${listDateFull(item.starts_at)}${item.ends_at ? ` hasta ${listDateFull(item.ends_at)}` : " sin fecha de fin"}`;
  const chip = (item: PlatformAnnouncement) => <StateChip tone={ANNOUNCEMENT_STATUS[item.status]?.tone ?? "mute"}>{ANNOUNCEMENT_STATUS[item.status]?.label ?? item.status}</StateChip>;
  const reads = (item: PlatformAnnouncement) => <span className="list-amount text-fore" title={`${formatPlatformMetric(item.reads)} de ${formatPlatformMetric(item.audience_users)} personas reales lo cerraron`}>{readLabel(item)}</span>;
  const menu = (item: PlatformAnnouncement): RecordMenuItem[] => [
    {id: "edit", label: "Editar comunicado", icono: "edit", onClick: () => onEdit(item)},
    {id: "delete", label: "Eliminar comunicado", icono: "trash", peligro: true, onClick: () => onRemove(item)},
  ];
  const actions = (item: PlatformAnnouncement) => writable ? <>
    <button type="button" className="text-button platform-admin-inline-action" disabled={busy || (!item.published_at && item.status === "expired")} onClick={() => onToggle(item)}>{item.published_at ? "Despublicar" : "Publicar"}</button>
    <EdgeAwareMenu><ActionMenu label={`Acciones del comunicado ${item.title}`} items={menu(item)}/></EdgeAwareMenu>
  </> : null;
  const identity = (item: PlatformAnnouncement) => <span className="grid min-w-0 gap-0.5">
    <b className="list-identity truncate text-[13px] font-semibold text-fore" title={item.title}>{item.title}</b>
    <small className="truncate text-[12px] text-mute" title={item.message}>{item.message}</small>
  </span>;

  return fits ? (
    <ListGrid label="Comunicados de la plataforma" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[67rem]" pinnedActions className="platform-admin-table-wrap">
      {items.map((item) => <ListRow key={item.id} template={TEMPLATE} data-status={item.status}>
        <div role="cell" className="min-w-0">{identity(item)}</div>
        <span role="cell" className="list-secondary whitespace-nowrap text-[12px]">{ANNOUNCEMENT_KIND_LABEL[item.kind] ?? item.kind}</span>
        <span role="cell" className="list-amount text-fore">{item.priority}</span>
        <span role="cell" className="list-secondary truncate text-[12px]" title={audience(item)}>{audience(item)}</span>
        <span role="cell" className="list-date whitespace-nowrap" title={windowTitle(item)}>{windowLabel(item)}</span>
        <span role="cell">{reads(item)}</span>
        <span role="cell" className="min-w-0">{chip(item)}</span>
        <ListActions>{actions(item)}</ListActions>
      </ListRow>)}
    </ListGrid>
  ) : (
    <div className="platform-admin-announcement-cards grid gap-3 sm:grid-cols-2">
      {items.map((item) => <article key={item.id} data-status={item.status} className="flex min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">{identity(item)}{chip(item)}</div>
        <small className="text-[12px] text-mute">{ANNOUNCEMENT_KIND_LABEL[item.kind] ?? item.kind} · prioridad {item.priority} · {audience(item)}</small>
        <small className="list-date text-[12px]" title={windowTitle(item)}>{windowLabel(item)} · leídas {reads(item)}</small>
        {writable ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{actions(item)}</div> : null}
      </article>)}
    </div>
  );
}
