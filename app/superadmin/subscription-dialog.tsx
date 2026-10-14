"use client";
// Diálogo de suscripción manual (estado, gracia en un clic y opciones avanzadas).
// #189: arriba el estado actual y las gracias rápidas (+7 días, +1 mes, +3 meses);
// el override manual y el pago manual siguen debajo, plegados.
import {useRef, useState, type FormEvent, type MutableRefObject} from "react";
import {Dialog, ConfirmDialog} from "../dialog";
import {agencyExpiry, newExtendKey, platformDate, type Agency, type Subscription} from "./model";
import {listDateFull} from "../list-format";
import {SaveActions} from "../save-actions";
import {SelectCustom} from "../profile-controls";
import {LoadingBlock, StateChip} from '../ui-v2';

type SubscriptionDialogProps = {
  busy: boolean;
  subscriptionAgency: Agency;
  setSubscriptionAgency: (value: Agency | null) => void;
  subscription: Subscription | null;
  setSubscription: (value: Subscription | null) => void;
  subscriptionLoaded: boolean;
  setSubscriptionLoaded: (value: boolean) => void;
  subscriptionError: string;
  setSubscriptionError: (value: string) => void;
  subscriptionRequest: MutableRefObject<number>;
  subscriptionState: "active" | "suspended" | "clear";
  setSubscriptionState: (value: "active" | "suspended" | "clear") => void;
  subscriptionReason: string;
  setSubscriptionReason: (value: string) => void;
  subscriptionExpiryValue: string;
  setSubscriptionExpiryValue: (value: string) => void;
  extendDays: string;
  setExtendDays: (value: string) => void;
  extendReason: string;
  setExtendReason: (value: string) => void;
  manageSubscription: (agency: Agency) => Promise<void>;
  saveSubscription: (event: FormEvent) => Promise<void>;
  saveExtension: (event: FormEvent) => Promise<void>;
  /** Suma días de gracia con el endpoint `extend`; devuelve el mensaje de error ("" si salió bien). */
  grantGrace: (days: number, reason: string, key: string) => Promise<string>;
  applyCoupon: (agency: Agency) => void;
};

export const GRACE_REASON = "Gracia otorgada desde superadmin";
export const GRACE_OPTIONS = [
  {days: 7, label: "+7 días"},
  {days: 30, label: "+1 mes"},
  {days: 90, label: "+3 meses"},
] as const;

function stateLabel(subscription: Subscription | null) {
  if (subscription?.internal_state === "active") return {tone: "info" as const, label: "Acceso manual activo"};
  if (subscription?.internal_state === "suspended") return {tone: "warn" as const, label: "Acceso manual suspendido"};
  return {tone: "mute" as const, label: "Sin cambio manual"};
}

export function SubscriptionDialog({busy, subscriptionAgency, setSubscriptionAgency, subscription, setSubscription, subscriptionLoaded, setSubscriptionLoaded, subscriptionError, setSubscriptionError, subscriptionRequest, subscriptionState, setSubscriptionState, subscriptionReason, setSubscriptionReason, subscriptionExpiryValue, setSubscriptionExpiryValue, extendDays, setExtendDays, extendReason, setExtendReason, manageSubscription, saveSubscription, saveExtension, grantGrace, applyCoupon}: SubscriptionDialogProps){
  const [grace, setGrace] = useState<(typeof GRACE_OPTIONS)[number] | null>(null);
  const [graceReason, setGraceReason] = useState(GRACE_REASON);
  const [graceError, setGraceError] = useState("");
  const [graceBusy, setGraceBusy] = useState(false);
  const graceKey = useRef("");
  const current = stateLabel(subscription);
  const expiry = subscription?.internal_expires_at || agencyExpiry(subscriptionAgency);
  function openGrace(option: (typeof GRACE_OPTIONS)[number]) {
    graceKey.current = newExtendKey();
    setGraceReason(GRACE_REASON);
    setGraceError("");
    setGrace(option);
  }
  async function confirmGrace() {
    if (!grace) return;
    const reason = graceReason.trim();
    if (reason.length < 3) { setGraceError("Indicá un motivo de al menos 3 caracteres."); return; }
    setGraceBusy(true);
    setGraceError("");
    const failure = await grantGrace(grace.days, reason, graceKey.current);
    setGraceBusy(false);
    if (failure) setGraceError(failure);
    else setGrace(null);
  }
  return (
            <Dialog
              title={`Estado manual · ${subscriptionAgency.name}`}
              busy={busy}
              close={() => {
                if (!busy) {
                  subscriptionRequest.current += 1;
                  setSubscriptionAgency(null);
                  setSubscription(null);
                  setSubscriptionLoaded(false);
                  setSubscriptionError("");
                }
              }}
            >
          {subscriptionError ? (
            <div>
              <p className="error" role="alert">{subscriptionError}</p>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void manageSubscription(subscriptionAgency)}
              >
                Reintentar
              </button>
            </div>
          ) : !subscriptionLoaded ? (
            <LoadingBlock label="Cargando estado manual…" lines={2}/>
          ) : (
            <>
          <section className="grid gap-3" aria-label="Estado actual y gracia">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <StateChip tone={current.tone}>{current.label}</StateChip>
              <span className="list-date" title={expiry ? `Vence ${platformDate(expiry)} (hora de Asunción)` : "Sin vencimiento registrado"}>
                {expiry ? `Vence ${listDateFull(expiry)}` : "Sin vencimiento registrado"}
              </span>
            </div>
            <p className="form-note">Dar gracia suma días de acceso a partir del vencimiento y queda auditado.</p>
            <div className="inline-actions">
              {GRACE_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  className={option.days === 30 ? "primary" : "secondary"}
                  disabled={busy}
                  onClick={() => openGrace(option)}
                >
                  {option.label}
                </button>
              ))}
              <button type="button" className="text-button" disabled={busy} onClick={() => applyCoupon(subscriptionAgency)}>
                Aplicar cupón
              </button>
            </div>
          </section>
          <details className="ops-profile-section">
            <summary>Opciones avanzadas</summary>
          {subscription === null ? (
            <div>
              <p className="form-note">
                Esta agencia todavía no tiene una suscripción interna. Podés
                registrar un pago manual para abrirla.
              </p>
            </div>
          ) : (
            <form
              className="grid gap-3"
              aria-busy={busy}
              onSubmit={saveSubscription}
            >
              <p className="form-note">
                Este control es un override manual y auditado de acceso. No
                cobra, no guarda secretos y no confirma pagos.
              </p>
              <SelectCustom label="Estado" choices={[{value:'active',label:'Acceso manual activo'},{value:'suspended',label:'Acceso manual suspendido'},{value:'clear',label:'Quitar estado manual'}]} value={subscriptionState} disabled={busy} onChange={value=>setSubscriptionState(value as typeof subscriptionState)}/>
              {subscriptionState !== "clear" ? (
                <>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
                    Motivo
                    <textarea
                      value={subscriptionReason}
                      disabled={busy}
                      minLength={3}
                      maxLength={280}
                      required
                      onChange={(event) =>
                        setSubscriptionReason(event.target.value)
                      }
                      placeholder="Motivo de la intervención manual"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
                    Vence (opcional)
                    <input
                      type="datetime-local"
                      value={subscriptionExpiryValue}
                      disabled={busy}
                      onChange={(event) =>
                        setSubscriptionExpiryValue(event.target.value)
                      }
                    />
                  </label>
                </>
              ) : null}
              <SaveActions pending={busy} cancelLabel={false}>
                <button
                  className="secondary"
                  disabled={
                    busy ||
                    (subscriptionState !== "clear" &&
                      subscriptionReason.trim().length < 3)
                  }
                >
                  {busy ? "Guardando…" : "Guardar estado manual"}
                </button>
              </SaveActions>
            </form>
          )}
            <form
              className="grid gap-3"
              aria-busy={busy}
              onSubmit={saveExtension}
            >
              <p className="form-note">
                Pago manual con otro medio: suma días de acceso y lo deja
                activo. Queda auditado y no contacta a ningún proveedor de
                pagos.
              </p>
              <SelectCustom label="Días a sumar" choices={['7','30','90','180','365'].map(days=>({value:days,label:`${days} días`}))} value={extendDays} disabled={busy} onChange={setExtendDays}/>
              <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
                Motivo
                <input
                  value={extendReason}
                  disabled={busy}
                  minLength={3}
                  maxLength={120}
                  required
                  onChange={(event) => setExtendReason(event.target.value)}
                  placeholder="Ej.: Transferencia bancaria"
                />
              </label>
              <SaveActions pending={busy} cancelLabel={false}>
                <button
                  className="secondary"
                  disabled={busy || extendReason.trim().length < 3}
                >
                  {busy ? "Guardando…" : "Marcar pago manual"}
                </button>
              </SaveActions>
            </form>
          </details>
            </>
          )}
          {grace ? (
            <ConfirmDialog
              title={`Dar ${grace.label} de gracia`}
              description={<p className="form-note">{`A ${subscriptionAgency.name} se le suman ${grace.days} días de acceso. Podés ajustar el motivo.`}</p>}
              confirmLabel={`Dar ${grace.label}`}
              busy={graceBusy}
              error={graceError}
              onCancel={() => { if (!graceBusy) setGrace(null); }}
              onConfirm={() => void confirmGrace()}
            >
              <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
                Motivo
                <input value={graceReason} disabled={graceBusy} minLength={3} maxLength={120} onChange={(event) => setGraceReason(event.target.value)}/>
              </label>
            </ConfirmDialog>
          ) : null}
            </Dialog>
  );
}
