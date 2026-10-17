"use client";
import {TextareaBase} from '../ui/input';
import {InputControl} from '../ui/input-control';
// Modo mantenimiento del panel global: interruptor + mensaje + fin estimado.
// Con el modo activo, el espacio de trabajo muestra la pantalla de mantenimiento y
// /api/agency/* responde 503 a quien no es administrador global; el panel, el
// login, la landing, los webhooks y /health siguen andando. Cada cambio queda en la
// auditoría. Sección independiente: se registra con una sola entrada.
import {useEffect, useState} from "react";
import {Switch} from '../ui/choice';
import {OptionalMark} from "../field-label";
import {ConfirmDialog} from "../dialog";
import {notify} from "../feedback";
import {listDateFull} from "../list-format";
import {asuncionInput, platformApi, subscriptionExpiry} from "../platform-admin-api";
import {ErrorBlock, LoadingBlock, StateChip} from "../ui-v2";
import {Button as ScaleButton} from "../ui/button";


export const MAINTENANCE_MESSAGE_MAX = 500;
/** Contrato de `GET/PATCH /api/platform/maintenance`. */
export type PlatformMaintenanceState = {enabled: boolean; message: string; until: string | null; updated_at: string | null; updated_by_email: string | null};

/** Cuerpo del PATCH; valida el mensaje y convierte el fin estimado (hora de Asunción) a ISO. */
export function maintenancePayload(enabled: boolean, message: string, until: string) {
  const text = message.trim();
  if ([...text].length > MAINTENANCE_MESSAGE_MAX) throw Error(`El mensaje admite hasta ${MAINTENANCE_MESSAGE_MAX} caracteres.`);
  let end: string | null = null;
  if (until) { try { end = subscriptionExpiry(until); } catch { throw Error("Elegí una fecha y hora válidas para el fin estimado."); } }
  return {enabled, message: text, until: end};
}

type Props = {writable: boolean; onError: (cause: unknown) => boolean};

export function PlatformMaintenance({writable, onError}: Props) {
  const [state, setState] = useState<PlatformMaintenanceState | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [until, setUntil] = useState("");
  const [confirming, setConfirming] = useState<boolean | null>(null);

  function apply(next: PlatformMaintenanceState) {
    setState(next); setMessage(next.message || ""); setUntil(next.until ? asuncionInput(next.until) : "");
  }
  async function load() {
    setError("");
    try { apply((await platformApi<{maintenance: PlatformMaintenanceState}>("/api/platform/maintenance")).maintenance); }
    catch (cause) { if (!onError(cause)) setError(cause instanceof Error ? cause.message : "No pudimos leer el estado de mantenimiento."); }
  }
  useEffect(() => { void load(); }, []);

  async function save(enabled: boolean) {
    let payload;
    try { payload = maintenancePayload(enabled, message, until); } catch (cause) { setFormError(cause instanceof Error ? cause.message : "Revisá los datos."); setConfirming(null); return; }
    setBusy(true); setFormError("");
    try {
      apply((await platformApi<{maintenance: PlatformMaintenanceState}>("/api/platform/maintenance", {method: "PATCH", body: JSON.stringify(payload)})).maintenance);
      notify({tone: "success", message: enabled === state?.enabled ? "Mensaje de mantenimiento guardado." : enabled ? "Mantenimiento activado." : "Mantenimiento desactivado: la plataforma está abierta."});
      setConfirming(null);
    } catch (cause) {
      if (!onError(cause)) setFormError(cause instanceof Error ? cause.message : "No pudimos guardar el mantenimiento.");
    } finally { setBusy(false); }
  }

  const on = Boolean(state?.enabled);
  return <section className="panel" aria-labelledby="platform-maintenance-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-maintenance-title" className="text-[15px] font-semibold tracking-tight text-fore">Mantenimiento</h2>
        {state ? <StateChip tone={on ? "warn" : "ok"} title={state.updated_at ? `Último cambio ${listDateFull(state.updated_at)}${state.updated_by_email ? ` · ${state.updated_by_email}` : ""}` : undefined}>{on ? "Activo" : "Plataforma abierta"}</StateChip> : null}
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">Siempre disponibles: este panel, el inicio de sesión, la landing, los pagos y el estado del servicio</small>
    </div>
    {error ? <ErrorBlock title="No pudimos leer el mantenimiento" description={error} onRetry={() => void load()}/>
      : !state ? <LoadingBlock label="Cargando mantenimiento…" lines={3}/>
      : <MaintenanceControls state={state} message={message} until={until} writable={writable} busy={busy} formError={formError} onMessage={setMessage} onUntil={setUntil} onToggle={() => setConfirming(!on)} onSave={() => void save(on)}/>}
    {confirming !== null && writable ? <ConfirmDialog
      title={confirming ? "Activar mantenimiento" : "Desactivar mantenimiento"}
      description={<p className="form-note">{confirming ? "Las agencias dejan de usar el espacio de trabajo y ven el mensaje de mantenimiento (puede tardar hasta 30 s en todas las instancias). El panel global, el login y los pagos siguen funcionando." : "La plataforma vuelve a abrirse para todas las agencias."}</p>}
      confirmLabel={confirming ? "Activar" : "Desactivar"}
      variant={confirming ? "danger" : "primary"}
      busy={busy}
      error={formError}
      onCancel={() => { if (!busy) setConfirming(null); }}
      onConfirm={() => void save(confirming)}
    /> : null}
  </section>;
}

type ControlsProps = {
  state: PlatformMaintenanceState;
  message: string;
  until: string;
  writable: boolean;
  busy: boolean;
  formError: string;
  onMessage: (value: string) => void;
  onUntil: (value: string) => void;
  onToggle: () => void;
  onSave: () => void;
};

/** Interruptor, mensaje y fin estimado (sin datos propios: los maneja `PlatformMaintenance`). */
export function MaintenanceControls({state, message, until, writable, busy, formError, onMessage, onUntil, onToggle, onSave}: ControlsProps) {
  const on = state.enabled;
  const left = MAINTENANCE_MESSAGE_MAX - [...message].length;
  return <div className="grid gap-4 rounded-xl border border-ink-600 bg-ink-800 p-4">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-fore">{on ? "La plataforma está en mantenimiento" : "La plataforma está abierta"}</b>
        <p className="mt-0.5 text-xs text-mute">{on ? "Las agencias ven la pantalla de mantenimiento; vos seguís entrando como administrador global." : "Al activarlo, las agencias ven la pantalla de mantenimiento hasta que lo desactives."}</p>
      </div>
      <label className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-fore">
        <Switch checked={on} disabled={!writable || busy} ariaLabel="Modo mantenimiento" onChange={onToggle}/>
        {on ? "Activo" : "Apagado"}
      </label>
    </div>
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-mute">
      <span className="flex justify-between gap-2">Mensaje para las agencias<span className="tabular-nums" aria-hidden="true">{left}</span></span>
      <TextareaBase value={message} rows={3} maxLength={MAINTENANCE_MESSAGE_MAX} disabled={!writable || busy} placeholder="Ej.: Estamos actualizando la base de datos. Volvemos en unos minutos." onChange={(event) => onMessage(event.target.value)}/>
    </label>
    <label className="grid min-w-0 gap-1.5 text-[11px] font-semibold text-mute">
      <span>Fin estimado<OptionalMark/></span>
      <InputControl type="datetime-local" className="max-w-[14rem]" value={until} disabled={!writable || busy} onChange={(event) => onUntil(event.target.value)}/>
    </label>
    {formError ? <p className="error form-error-summary" role="alert">{formError}</p> : null}
    {writable ? <div className="flex flex-wrap justify-end gap-2">
      <ScaleButton type="button" className="secondary min-h-11 whitespace-nowrap md:min-h-10" disabled={busy} onClick={onSave} variant="secondary">Guardar mensaje</ScaleButton>
    </div> : null}
  </div>;
}
