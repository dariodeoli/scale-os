"use client";
// Comunicados de la plataforma en el espacio de trabajo: un banner arriba del
// contenido con el comunicado vigente de mayor prioridad (de a uno). Al cerrarlo
// se registra una lectura única y llega el siguiente, si hay. El texto se dibuja
// como texto (React escapa todo): nunca HTML. La vista (`AnnouncementBannerView`)
// es la misma que usa la vista previa del panel global.
import React, {useEffect, useRef, useState} from "react";
import {Info, Megaphone, Sparkles, TriangleAlert, X} from "lucide-react";
import {IconButton as ScaleIconButton} from "./ui/button";


export type AnnouncementKind = "info" | "aviso" | "novedad";
export type ActiveAnnouncement = {
  id: number | string;
  title: string;
  message: string;
  kind: AnnouncementKind;
  priority: number;
  starts_at?: string;
  ends_at?: string | null;
};
export type ActiveAnnouncementPayload = {announcement: ActiveAnnouncement | null; pending: number};

export const ANNOUNCEMENT_KIND_LABEL: Record<AnnouncementKind, string> = {info: "Información", aviso: "Aviso", novedad: "Novedad"};
const KIND_STYLE: Record<AnnouncementKind, string> = {
  info: "border-ink-600 bg-ink-800",
  aviso: "border-warn/40 bg-warn/10",
  novedad: "border-fono/30 bg-fono/10",
};
const KIND_ICON = {info: Info, aviso: TriangleAlert, novedad: Sparkles} as const;
const API = "/core-api/api/agency/announcements";

/** Vigente para la sesión; `null` si no hay o si no se pudo consultar (nunca bloquea). */
export async function fetchActiveAnnouncement(fetcher: typeof fetch = fetch): Promise<ActiveAnnouncementPayload | null> {
  try {
    const response = await fetcher(`${API}/active`, {credentials: "include", cache: "no-store"});
    if (!response.ok) return null;
    const data = await response.json() as Partial<ActiveAnnouncementPayload>;
    return validAnnouncement(data?.announcement) ? {announcement: data.announcement, pending: Number(data.pending) || 1} : {announcement: null, pending: 0};
  } catch { return null; }
}
export async function dismissAnnouncement(id: ActiveAnnouncement["id"], fetcher: typeof fetch = fetch): Promise<ActiveAnnouncementPayload | null> {
  try {
    const response = await fetcher(`${API}/${encodeURIComponent(String(id))}/dismiss`, {method: "POST", credentials: "include", cache: "no-store", headers: {"Content-Type": "application/json"}, body: "{}"});
    if (!response.ok) return null;
    const data = await response.json() as Partial<ActiveAnnouncementPayload>;
    return validAnnouncement(data?.announcement) ? {announcement: data.announcement, pending: Number(data.pending) || 1} : {announcement: null, pending: 0};
  } catch { return null; }
}
function validAnnouncement(value: unknown): value is ActiveAnnouncement {
  const item = value as ActiveAnnouncement | null;
  return Boolean(item && typeof item === "object" && item.id !== undefined && typeof item.title === "string" && typeof item.message === "string");
}

export function AnnouncementBannerView({announcement, onDismiss, busy = false, preview = false, pending = 0}: {announcement: Pick<ActiveAnnouncement, "title" | "message" | "kind">; onDismiss?: () => void; busy?: boolean; preview?: boolean; pending?: number}) {
  const kind: AnnouncementKind = announcement.kind in KIND_STYLE ? announcement.kind : "info";
  const Icon = KIND_ICON[kind] || Megaphone;
  const title = announcement.title || "Título del comunicado";
  return <section className={`announcement-banner flex min-w-0 items-start gap-3 rounded-xl border px-4 py-3 ${KIND_STYLE[kind]}`} data-kind={kind} data-preview={preview ? "true" : undefined} role={preview ? undefined : "status"} aria-live={preview ? undefined : "polite"} aria-label={`Comunicado: ${title}`}>
    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-800 text-fore" aria-hidden="true"><Icon size={16}/></span>
    <div className="min-w-0 flex-1">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wider text-mute">{ANNOUNCEMENT_KIND_LABEL[kind]}{pending > 1 ? ` · 1 de ${pending}` : ""}</span>
        <b className="min-w-0 break-words text-[13.5px] font-semibold text-fore">{title}</b>
      </p>
      <p className="announcement-banner-message mt-0.5 whitespace-pre-line break-words text-[12.5px] leading-snug text-fore/85">{announcement.message || "El mensaje aparece acá."}</p>
    </div>
    {onDismiss ? <ScaleIconButton type="button" className="icon-button grid size-11 shrink-0 place-items-center rounded-lg text-mute hover:text-fore md:size-8" title="Cerrar comunicado" label={`Cerrar comunicado: ${title}`} disabled={busy} onClick={onDismiss} icon={<><X size={16} aria-hidden="true"/></>} variant="ghost" size="compact"></ScaleIconButton> : null}
  </section>;
}

/** Banner del espacio de trabajo: consulta al montar y al volver a la pestaña. */
export function AnnouncementBanner({fetcher}: {fetcher?: typeof fetch}) {
  const [current, setCurrent] = useState<ActiveAnnouncementPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    if (typeof window === "undefined") return;
    const load = async () => { const next = await fetchActiveAnnouncement(fetcher); if (alive.current && next) setCurrent(next); };
    void load();
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive.current = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [fetcher]);
  const announcement = current?.announcement;
  if (!announcement) return null;
  async function close() {
    if (!announcement || busy) return;
    setBusy(true);
    const next = await dismissAnnouncement(announcement.id, fetcher);
    if (!alive.current) return;
    // Si la red falla, se oculta igual en esta vista; vuelve a aparecer en la próxima carga.
    setCurrent(next ?? {announcement: null, pending: 0});
    setBusy(false);
  }
  return <div className="announcement-banner-slot mb-4 min-w-0">
    <AnnouncementBannerView announcement={announcement} pending={current?.pending} busy={busy} onDismiss={() => void close()}/>
  </div>;
}
