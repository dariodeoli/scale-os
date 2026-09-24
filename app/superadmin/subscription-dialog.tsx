"use client";
// Diálogo de suscripción manual (estado, vencimiento y extensión).
// Extraído de superadmin/page.tsx (issue #46): misma JSX y comportamiento.
import type {FormEvent, MutableRefObject} from "react";
import {Dialog} from "../dialog";
import {formatPlatformMetric, money, platformDate, subscriptionSummary, type Agency, type Subscription} from "./model";
import {SaveActions} from "../save-actions";
import {SelectCustom} from "../profile-controls";
import {LoadingBlock} from '../ui-v2';

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
};

export function SubscriptionDialog({busy, subscriptionAgency, setSubscriptionAgency, subscription, setSubscription, subscriptionLoaded, setSubscriptionLoaded, subscriptionError, setSubscriptionError, subscriptionRequest, subscriptionState, setSubscriptionState, subscriptionReason, setSubscriptionReason, subscriptionExpiryValue, setSubscriptionExpiryValue, extendDays, setExtendDays, extendReason, setExtendReason, manageSubscription, saveSubscription, saveExtension}: SubscriptionDialogProps){
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
          ) : subscription === null ? (
            <p className="form-note">
              Esta agencia todavía no tiene una suscripción interna. Podés
              registrar un pago manual para abrirla.
            </p>
          ) : (
            <form
              className="platform-admin-subscription-form"
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
                  <label>
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
                  <label>
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
                  className="primary"
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
          {subscriptionLoaded ? (
            <form
              className="platform-admin-subscription-form"
              aria-busy={busy}
              onSubmit={saveExtension}
            >
              <p className="form-note">
                Pago manual con otro medio: suma días de acceso y lo deja
                activo. Queda auditado y no contacta a ningún proveedor de
                pagos.
              </p>
              <SelectCustom label="Días a sumar" choices={['7','30','90','180','365'].map(days=>({value:days,label:`${days} días`}))} value={extendDays} disabled={busy} onChange={setExtendDays}/>
              <label>
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
                  className="primary"
                  disabled={busy || extendReason.trim().length < 3}
                >
                  {busy ? "Guardando…" : "Marcar pago manual"}
                </button>
              </SaveActions>
            </form>
          ) : null}
            </Dialog>
  );
}
