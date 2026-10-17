"use client";
import {Textarea} from './ui/input';

// «Reportar un problema» (panel global → Reportes). Se abre desde el pie del
// menú lateral del workspace; exige sesión (el API devuelve 401 sin ella),
// admite hasta 1000 caracteres y una categoría, y adjunta la ruta visible (sin
// query) y la versión de la app. El API limita a 5 reportes por hora.
import {useId, useState} from "react";
import {MessageSquareWarning} from "lucide-react";
import {ConfirmDialog} from "./dialog";
import {SelectCustom} from "./profile-controls";
import {api} from "./operations";
import {notify} from "./feedback";
import {APP_VERSION} from "./app-version";
import {routeWithoutQuery} from "./client-error-reporter";

export const REPORT_MAX = 1000;
export const REPORT_MIN = 5;
export type ReportCategory = "error" | "datos" | "lentitud" | "sugerencia" | "otro";
export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  error: "Algo no funciona",
  datos: "Datos incorrectos",
  lentitud: "Lentitud",
  sugerencia: "Sugerencia",
  otro: "Otro",
};

/** Mensaje de validación del lado del cliente (el API revalida igual). */
export function reportProblemError(message: string, category: string) {
  const text = message.trim();
  if (!(category in REPORT_CATEGORY_LABELS)) return "Elegí una categoría.";
  if (text.length < REPORT_MIN) return "Contanos un poco más del problema.";
  if (text.length > REPORT_MAX) return `Contanos el problema en hasta ${REPORT_MAX} caracteres.`;
  return "";
}

export function reportProblemPayload(message: string, category: ReportCategory, route: string) {
  return {message: message.trim(), category, route: routeWithoutQuery(route), app_version: APP_VERSION};
}

type Send = (payload: ReturnType<typeof reportProblemPayload>) => Promise<unknown>;
const defaultSend: Send = (payload) => api("/api/support/reports", payload, "POST");

export function ReportProblemDialog({onClose, route, send = defaultSend}: {onClose: () => void; route?: string; send?: Send}) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const textId = useId(), helpId = useId();
  async function submit() {
    const problem = reportProblemError(message, category);
    if (problem) { setError(problem); return; }
    setBusy(true);
    setError("");
    try {
      await send(reportProblemPayload(message, category as ReportCategory, route ?? (typeof window !== "undefined" ? window.location.pathname : "/")));
      notify({tone: "success", message: "Gracias. Recibimos tu reporte."});
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos enviar el reporte. Intentá nuevamente.");
      setBusy(false);
    }
  }
  return <ConfirmDialog
    title="Reportar un problema"
    description={<p className="form-note">Lo recibe el equipo de Scale OS junto con la pantalla en la que estás y la versión de la app.</p>}
    confirmLabel="Enviar reporte"
    busy={busy}
    error={error}
    onCancel={() => { if (!busy) onClose(); }}
    onConfirm={() => void submit()}
  >
    <SelectCustom label="Categoría" choices={(Object.keys(REPORT_CATEGORY_LABELS) as ReportCategory[]).map((value) => ({value, label: REPORT_CATEGORY_LABELS[value]}))} value={category} disabled={busy} onChange={(value: string) => setCategory(value as ReportCategory)}/>
    <label className="grid gap-1.5 text-[11px] font-semibold text-mute" htmlFor={textId}>
      Qué pasó
      <Textarea id={textId} value={message} disabled={busy} maxLength={REPORT_MAX} rows={5} aria-describedby={helpId} placeholder="Ej.: al guardar el presupuesto aparece un error y no se guarda." onChange={(event) => setMessage(event.target.value)}/>
    </label>
    <p id={helpId} className="field-help">{message.length}/{REPORT_MAX} caracteres · no incluyas contraseñas ni datos de tarjetas.</p>
  </ConfirmDialog>;
}

/** Entrada del menú del usuario (pie del menú lateral). */
export function ReportProblemButton({className, iconClassName}: {className: string; iconClassName: string}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`nav-report ${className}`} onClick={() => setOpen(true)} aria-label="Reportar un problema" title="Reportar un problema">
      <span className={iconClassName}><MessageSquareWarning size={16}/></span><span className="nav-label">Reportar un problema</span>
    </button>
    {open ? <ReportProblemDialog onClose={() => setOpen(false)}/> : null}
  </>;
}
