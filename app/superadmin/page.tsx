"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {money as formatMoney} from "../operations";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  CircleCheck,
  Eye,
  KeyRound,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { WorkspaceBrand } from "../workspace-brand";
import { WorkspaceFooter } from "../workspace-footer";
import "./platform-admin.css";
import { platformApi, subscriptionExpiry, asuncionInput } from "../platform-admin-api";
import {
  StatusBadge,
  appHome,
  errorCode,
  errorStatus,
  formatPlatformMetric,
  loginReturnPath,
  manualAccessLabel,
  money,
  newExtendKey,
  platformDate,
  subscriptionSummary,
  type Agency,
  type AuditAction,
  type BootstrapStatus,
  type Coupon,
  type Overview,
  type Person,
  type State,
  type Subscription,
} from "./model";
import {PlatformAccessDenied, PlatformNotices, PlatformRedirecting} from "./states";
import {PlatformAudit} from "./audit";
import { soloDigitos } from "owncoding-ui";
import { decimalInput } from "../field-rules";
import { SelectCustom } from "../profile-controls";
import { Dialog } from "../dialog";
import { SaveActions } from "../save-actions";


export default function PlatformAdmin() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [coupon, setCoupon] = useState({
    code: "",
    discount_value: "10",
    discount_type: "percent" as "percent" | "fixed" | "days",
    currency: "USD",
  });
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [subscriptionAgency, setSubscriptionAgency] = useState<Agency | null>(
    null,
  );
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const subscriptionRequest = useRef(0);
  const [subscriptionState, setSubscriptionState] = useState<
    "active" | "suspended" | "clear"
  >("active");
  const [subscriptionReason, setSubscriptionReason] = useState("");
  const [subscriptionExpiryValue, setSubscriptionExpiryValue] = useState("");
  const [extendDays, setExtendDays] = useState("30");
  const [extendReason, setExtendReason] = useState("Pago manual recibido");
  const [extendKey, setExtendKey] = useState("");
  const [myRole, setMyRole] = useState<"admin" | "viewer" | null>(null);
  const [myUserId, setMyUserId] = useState("");
  const [confirming, setConfirming] = useState<
    { kind: "user"; person: Person } | { kind: "agency"; agency: Agency } | null
  >(null);
  const [typed, setTyped] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"password" | "email">("password");
  const [authPreviewId, setAuthPreviewId] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");

  function handlePlatformError(cause: unknown, fromLoad = false) {
    const status = errorStatus(cause);
    if (status === 401) {
      setState(null);
      setError("");
      setAccessDenied(false);
      setRedirecting(true);
      const target = loginReturnPath();
      if (target.startsWith("https://")) window.location.assign(target);
      else router.replace(target);
      return true;
    }
    if (status === 403) {
      // Solo la carga inicial decide el acceso. Un 403 de una acción se muestra
      // inline y el panel sigue montado (viewer nunca ve acciones, issue #22).
      if (!fromLoad) return false;
      setState(null);
      setError("");
      setAccessDenied(true);
      return true;
    }
    return false;
  }

  async function load() {
    setBusy(true);
    setError("");
    setAccessDenied(false);
    try {
      // The overview is the auth/authorization gate. It prevents parallel responses from rendering a generic error before a 401 or 403 is classified.
      // prettier-ignore
      const overview=await platformApi<Overview>('/api/platform/overview',{credentials:'include',cache:'no-store'});
      const [agencies, users, coupons, audit, me] = await Promise.all([
        platformApi<{ agencies: Agency[] }>("/api/platform/agencies?limit=50"),
        platformApi<{ users: Person[] }>("/api/platform/users?limit=50"),
        platformApi<{ coupons: Coupon[] }>("/api/platform/coupons?limit=50"),
        platformApi<{ actions: AuditAction[] }>("/api/platform/audit?limit=50"),
        platformApi<{ user: { id?: string | number; platform_role?: string | null } }>("/api/auth/me").catch(() => null),
      ]);
      setMyRole(me?.user?.platform_role === "viewer" ? "viewer" : me?.user?.platform_role === "admin" ? "admin" : null);
      setMyUserId(me?.user?.id ? String(me.user.id) : "");
      setState({
        overview,
        agencies: agencies.agencies,
        users: users.users,
        coupons: coupons.coupons,
        audit: audit.actions,
      });
    } catch (cause) {
      if (!handlePlatformError(cause, true))
        setError(
          "No pudimos cargar el control global. Actualizá para reintentar.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function loadBootstrap() {
    try {
      setBootstrap(
        await platformApi<BootstrapStatus>("/api/platform/bootstrap-status"),
      );
    } catch (cause) {
      void handlePlatformError(cause);
      setBootstrap(null);
    }
  }

  useEffect(() => {
    void load();
    void loadBootstrap();
  }, []);

  const writable = myRole === "admin";
  const selfRow = (person: Person) => String(person.id) === myUserId;
  async function setPlatformAccess(
    person: Person,
    platform_access: "admin" | "viewer" | "none",
  ) {
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      await platformApi(`/api/platform/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ platform_access }),
      });
      setActionNotice(`${person.email}: acceso global actualizado.`);
      await load();
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar el acceso global.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function requestEmailCode() {
    if (!confirming || emailSending || busy) return;
    setEmailSending(true);
    setActionError("");
    setActionNotice("");
    try {
      const action =
        confirming.kind === "user" ? "platform.user.delete" : "platform.agency.delete";
      const targetId = confirming.kind === "user" ? confirming.person.id : confirming.agency.id;
      const preview = await platformApi<{ preview: { id: string } }>(
        "/api/platform/destructive/preview",
        { method: "POST", body: JSON.stringify({ action, targetId }) },
      );
      setAuthPreviewId(preview.preview.id);
      await platformApi("/api/auth/account/recent-auth/email/request", {
        method: "POST",
        body: JSON.stringify({ previewId: preview.preview.id }),
      });
      setEmailSent(true);
      setActionNotice("Si podemos confirmar la operación, enviamos un código a tu correo registrado.");
    } catch (cause) {
      const code = errorCode(cause);
      setActionError(
        code === "EMAIL_REAUTH_UNAVAILABLE"
          ? "La verificación por correo no está disponible en este momento. Usá Google o contactá al administrador."
          : code === "EMAIL_REAUTH_RATE_LIMITED"
            ? "Demasiados intentos. Esperá unos minutos y volvé a pedir el código."
            : cause instanceof Error
              ? cause.message
              : "No pudimos enviar el código de verificación.",
      );
    } finally {
      setEmailSending(false);
    }
  }

  async function removeConfirmed() {
    if (
      busy ||
      !confirming ||
      typed !== (confirming.kind === "user" ? confirming.person.email : confirming.agency.name)
    )
      return;
    if (authMethod === "password" && !confirmPassword) {
      setActionError("Ingresá tu contraseña actual para confirmar la eliminación.");
      return;
    }
    if (authMethod === "email" && emailCode.length !== 8) {
      setActionError("Ingresá el código de 8 dígitos que enviamos a tu correo.");
      return;
    }
    // El API exige vista previa + prueba de re-autenticación (issue #22).
    const confirmation = typed;
    const action = confirming.kind === "user" ? "platform.user.delete" : "platform.agency.delete";
    const targetId = confirming.kind === "user" ? confirming.person.id : confirming.agency.id;
    setBusy(true);
    setActionError("");
    setActionNotice("");
    try {
      const preview = authPreviewId
        ? { preview: { id: authPreviewId } }
        : await platformApi<{ preview: { id: string } }>("/api/platform/destructive/preview", {
            method: "POST",
            body: JSON.stringify({ action, targetId }),
          });
      let recentAuthProof: string;
      try {
        const auth =
          authMethod === "email"
            ? await platformApi<{ proof: string }>("/api/auth/account/recent-auth/email/complete", {
                method: "POST",
                body: JSON.stringify({ previewId: preview.preview.id, code: emailCode }),
              })
            : await platformApi<{ proof: string }>("/api/auth/account/recent-auth/password", {
                method: "POST",
                body: JSON.stringify({ previewId: preview.preview.id, password: confirmPassword }),
              });
        recentAuthProof = auth.proof;
      } catch (cause) {
        const code = errorCode(cause);
        if (code === "PASSWORD_REAUTH_FAILED") {
          setActionError("No pudimos confirmar tu contraseña. Revisala y volvé a intentar.");
          return;
        }
        if (code === "PASSWORD_REAUTH_UNAVAILABLE") {
          setAuthMethod("email");
          setActionError("Esta cuenta no usa contraseña: pedí el código de 8 dígitos a tu correo.");
          return;
        }
        if (code === "EMAIL_REAUTH_INVALID") {
          setActionError("El código no es válido o venció. Pedí uno nuevo.");
          return;
        }
        if (code === "EMAIL_REAUTH_UNAVAILABLE" || code === "EMAIL_REAUTH_RATE_LIMITED") {
          setActionError(cause instanceof Error ? cause.message : "No pudimos validar el código.");
          return;
        }
        throw cause;
      }
      const proofPayload = { previewId: preview.preview.id, confirmation, recentAuthProof };
      if (confirming.kind === "user") {
        const result = await platformApi<{
          deleted: { userId: number; self: boolean; agencies: number[] };
        }>(`/api/platform/users/${confirming.person.id}`, { method: "DELETE", body: JSON.stringify(proofPayload) });
        if (result.deleted.self) {
          setActionNotice("Tu cuenta fue eliminada. La sesión se cerrará.");
          if (typeof window !== "undefined")
            window.setTimeout(
              () => window.location.assign("https://app.scaleparaguay.com/"),
              2500,
            );
          return;
        }
        setActionNotice(
          `Usuario eliminado${result.deleted.agencies.length ? ` junto con ${result.deleted.agencies.length} agencia(s)` : ""}.`,
        );
      } else {
        await platformApi(`/api/platform/agencies/${confirming.agency.id}`, {
          method: "DELETE",
          body: JSON.stringify(proofPayload),
        });
        setActionNotice(`Agencia ${confirming.agency.name} eliminada.`);
      }
      setConfirmPassword("");
      setAuthPreviewId("");
      setEmailSent(false);
      setEmailCode("");
      setConfirming(null);
      setTyped("");
      await load();
    } catch (cause) {
      const code = errorCode(cause);
      if (code === "CONFIRMATION_MISMATCH") {
        setActionError("El texto de confirmación cambió. Revisalo y volvé a intentar.");
      } else if (code === "RECENT_AUTH_REQUIRED" || code === "RECENT_AUTH_INVALID") {
        setActionError("La confirmación de identidad venció. Volvé a intentar con tu contraseña.");
      } else if (code === "DELETION_PREVIEW_STALE" || code === "DELETION_PREVIEW_INVALID" || code === "DELETION_SCOPE_MISMATCH") {
        setActionError("La vista previa venció. Cerrá la confirmación y volvé a intentar.");
      } else if (!handlePlatformError(cause)) {
        setActionError(cause instanceof Error ? cause.message : "No se pudo completar la eliminación.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function manageSubscription(agency: Agency) {
    if (!writable) return;
    // A slow response for a previous agency must never overwrite the current one.
    const generation = ++subscriptionRequest.current;
    setError("");
    setSubscriptionError("");
    setSubscriptionAgency(agency);
    setExtendKey(newExtendKey());
    setSubscription(null);
    setSubscriptionLoaded(false);
    try {
      const data = await platformApi<{ subscription: Subscription | null }>(
        `/api/platform/agencies/${agency.id}/subscription`,
      );
      if (generation !== subscriptionRequest.current) return;
      setSubscription(data.subscription);
      setSubscriptionLoaded(true);
      setSubscriptionState(data.subscription?.internal_state || "active");
      setSubscriptionReason(data.subscription?.internal_reason || "");
      setSubscriptionExpiryValue(
        data.subscription?.internal_expires_at
          ? asuncionInput(data.subscription.internal_expires_at)
          : "",
      );
    } catch (cause) {
      if (generation !== subscriptionRequest.current) return;
      if (!handlePlatformError(cause))
        setSubscriptionError("No pudimos cargar el estado manual.");
    }
  }

  async function saveSubscription(event: FormEvent) {
    event.preventDefault();
    if (!subscriptionAgency) return;
    setBusy(true);
    setError("");
    try {
      const body =
        subscriptionState === "clear"
          ? { state: null }
          : {
              state: subscriptionState,
              reason: subscriptionReason,
              expires_at: subscriptionExpiry(subscriptionExpiryValue),
            };
      await platformApi(
        `/api/platform/agencies/${subscriptionAgency.id}/subscription`,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setSubscriptionAgency(null);
      setSubscription(null);
      setSubscriptionLoaded(false);
      await load();
    } catch (cause) {
      if (!handlePlatformError(cause))
        setError("No pudimos guardar el estado manual.");
      setBusy(false);
    }
  }

  async function saveExtension(event: FormEvent) {
    event.preventDefault();
    if (!subscriptionAgency) return;
    setBusy(true);
    setError("");
    try {
      const key = extendKey || newExtendKey();
      if (!extendKey) setExtendKey(key);
      await platformApi(
        `/api/platform/agencies/${subscriptionAgency.id}/subscription/extend`,
        {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: JSON.stringify({
            days: Number(extendDays),
            reason: extendReason,
          }),
        },
      );
      setSubscriptionAgency(null);
      setSubscription(null);
      setSubscriptionLoaded(false);
      await load();
    } catch (cause) {
      if (!handlePlatformError(cause))
        setError("No pudimos registrar el pago manual.");
      setBusy(false);
    }
  }

  async function toggleCoupon(item: Coupon) {
    setBusy(true);
    setError("");
    try {
      await platformApi(`/api/platform/coupons/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !item.active }),
      });
      await load();
    } catch (cause) {
      if (!handlePlatformError(cause))
        setError("No pudimos actualizar el cupón.");
      setBusy(false);
    }
  }

  async function createCoupon(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const value = coupon.discount_value.trim();
    const pattern = coupon.discount_type === "fixed" ? /^\d+(?:\.\d{1,2})?$/ : /^\d+$/;
    if (!pattern.test(value) || (coupon.discount_type === "percent" && Number(value) > 100) || (coupon.discount_type === "days" && Number(value) > 365)) {
      setError("Indicá un valor entero: porcentaje hasta 100, días hasta 365 o importe sin decimales.");
      setBusy(false);
      return;
    }
    try {
      await platformApi("/api/platform/coupons", {
        method: "POST",
        body: JSON.stringify({
          ...coupon,
          currency: coupon.discount_type === "fixed" ? coupon.currency : null,
        }),
      });
      setCoupon({
        code: "",
        discount_value: "10",
        discount_type: "percent",
        currency: "USD",
      });
      await load();
    } catch (cause) {
      if (!handlePlatformError(cause)) setError("No pudimos crear el cupón.");
      setBusy(false);
    }
  }

  const pageContent = redirecting ? (
    <PlatformRedirecting/>
  ) : accessDenied ? (
    <PlatformAccessDenied/>
  ) : (
    <>
      <PlatformNotices state={state} error={error} busy={busy} bootstrap={bootstrap}/>
      {state ? (
        <>
          <section
            className="platform-admin-stats"
            aria-label="Resumen de plataforma"
          >
            <article className="platform-admin-stat-card">
              <span className="platform-admin-stat-icon">
                <Building2 aria-hidden="true" />
              </span>
              <div className="platform-admin-stat-copy">
                <small>Agencias activas</small>
                <strong>
                  {formatPlatformMetric(state.overview.agencies?.active)}{" "}
                  <span>
                    / {formatPlatformMetric(state.overview.agencies?.total)}
                  </span>
                </strong>
              </div>
            </article>
            <article className="platform-admin-stat-card">
              <span className="platform-admin-stat-icon">
                <Users aria-hidden="true" />
              </span>
              <div className="platform-admin-stat-copy">
                <small>Usuarios registrados</small>
                <strong>
                  {formatPlatformMetric(state.overview.users?.total)}
                </strong>
              </div>
            </article>
            <article className="platform-admin-stat-card">
              <span className="platform-admin-stat-icon">
                <Ticket aria-hidden="true" />
              </span>
              <div className="platform-admin-stat-copy">
                <small>Cupones activos</small>
                <strong>
                  {formatPlatformMetric(state.overview.coupons?.active)}{" "}
                  <span>
                    / {formatPlatformMetric(state.overview.coupons?.total)}
                  </span>
                </strong>
              </div>
            </article>
            <article className="platform-admin-stat-card">
              <span className="platform-admin-stat-icon">
                <CircleCheck aria-hidden="true" />
              </span>
              <div className="platform-admin-stat-copy">
                <small>Suscripciones</small>
                <strong className="platform-admin-subscription-summary">
                  {subscriptionSummary(state.overview.subscriptions)}
                </strong>
              </div>
            </article>
          </section>

          <section className="platform-admin-section platform-admin-agencies">
            <div className="platform-admin-section-heading">
              <div>
                <p className="eyebrow">AGENCIAS</p>
                <h2>Agencias y suscripciones</h2>
              </div>
              <small>Gestioná el acceso manual junto a cada registro</small>
            </div>
            <div className="platform-admin-table-wrap">
              <table className="platform-admin-ledger">
                <thead>
                  <tr>
                    <th>Agencia</th>
                    <th>Estado</th>
                    <th>Plan</th>
                    <th>Usuarios</th>
                    <th>Prueba / vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {state.agencies.length ? (
                    state.agencies.map((agency) => (
                      <tr key={agency.id}>
                        <td>
                          <b>{agency.name || "Agencia sin nombre"}</b>
                          <small>{agency.slug || "Sin identificador"}</small>
                        </td>
                        <td>
                          <div className="platform-admin-cell-stack">
                            <StatusBadge
                              tone={agency.active ? "success" : "neutral"}
                            >
                              {agency.active ? "Activa" : "Inactiva"}
                            </StatusBadge>
                            <StatusBadge
                              tone={
                                agency.internal_subscription_state ===
                                "suspended"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {manualAccessLabel(agency)}
                            </StatusBadge>
                          </div>
                        </td>
                        <td>
                          {money(
                            agency.subscription_amount,
                            agency.subscription_currency,
                          )}
                        </td>
                        <td>{formatPlatformMetric(agency.active_users)}</td>
                        <td>
                          <div className="platform-admin-cell-stack">
                            <span>
                              {platformDate(
                                agency.internal_subscription_expires_at ||
                                  agency.trial_ends_at ||
                                  agency.due_at,
                              )}
                            </span>
                            {writable && (
                            <button
                              type="button"
                              className="text-button platform-admin-inline-action"
                              disabled={busy}
                              onClick={() => void manageSubscription(agency)}
                            >
                              Gestionar estado manual
                            </button>
                            )}
                            {writable && (
                              <button
                                type="button"
                                className="text-button platform-admin-danger"
                                disabled={busy}
                                onClick={() => {
                                  setConfirming({ kind: "agency", agency });
                                  setTyped("");
                                }}
                              >
                                <Trash2 size={14} />
                                Eliminar agencia
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="platform-admin-empty">
                        No hay agencias para mostrar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="platform-admin-agency-cards">
              {state.agencies.length ? (
                state.agencies.map((agency) => (
                  <article
                    className="platform-admin-agency-card"
                    key={agency.id}
                  >
                    <div>
                      <b>{agency.name || "Agencia sin nombre"}</b>
                      <small>{agency.slug || "Sin identificador"}</small>
                    </div>
                    <div className="platform-admin-card-badges">
                      <StatusBadge tone={agency.active ? "success" : "neutral"}>
                        {agency.active ? "Activa" : "Inactiva"}
                      </StatusBadge>
                      <StatusBadge
                        tone={
                          agency.internal_subscription_state === "suspended"
                            ? "warning"
                            : "neutral"
                        }
                      >
                        {manualAccessLabel(agency)}
                      </StatusBadge>
                    </div>
                    <dl>
                      <div>
                        <dt>Plan</dt>
                        <dd>
                          {money(
                            agency.subscription_amount,
                            agency.subscription_currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Usuarios</dt>
                        <dd>{formatPlatformMetric(agency.active_users)}</dd>
                      </div>
                      <div>
                        <dt>Vencimiento</dt>
                        <dd>
                          {platformDate(
                            agency.internal_subscription_expires_at ||
                              agency.trial_ends_at ||
                              agency.due_at,
                          )}
                        </dd>
                      </div>
                    </dl>
                    {writable && (
                    <button
                      type="button"
                      className="text-button platform-admin-inline-action"
                      disabled={busy}
                      onClick={() => void manageSubscription(agency)}
                    >
                      Gestionar estado manual
                    </button>
                    )}
                    {writable && (
                      <button
                        type="button"
                        className="text-button platform-admin-danger"
                        disabled={busy}
                        onClick={() => {
                          setConfirming({ kind: "agency", agency });
                          setTyped("");
                        }}
                      >
                        <Trash2 size={14} />
                        Eliminar agencia
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p className="platform-admin-empty">
                  No hay agencias para mostrar.
                </p>
              )}
            </div>
          </section>

          {writable && subscriptionAgency ? (
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
            <p role="status">Cargando estado manual…</p>
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
          ) : null}

          <section className="platform-admin-two-columns">
            <section className="platform-admin-section platform-admin-users">
              <div className="platform-admin-section-heading">
                <div>
                  <p className="eyebrow">USUARIOS</p>
                  <h2>Accesos entre agencias</h2>
                </div>
                <small>
                  {formatPlatformMetric(state.users.length)} registrados
                </small>
              </div>
              {!writable && (
                <p className="form-note">
                  Solo lectura: podés consultar la administración global, no
                  modificarla.
                </p>
              )}
              <ul className="platform-admin-list">
                {state.users.length ? (
                  <li className="platform-admin-list-head" aria-hidden="true">
                    <span>Usuario</span>
                    <span>Acciones</span>
                  </li>
                ) : null}
                {state.users.length ? (
                  state.users.map((person) => (
                    <li key={person.id}>
                      <span>
                        <b title={person.email || "Usuario sin correo"}>{person.email || "Usuario sin correo"}</b>
                        <small>
                          {formatPlatformMetric(person.active_agencies)}{" "}
                          agencias activas{selfRow(person) ? " · Vos" : ""}
                        </small>
                      </span>
                      <div className="platform-admin-user-actions">
                        {person.platform_admin ? (
                          <StatusBadge tone="success">
                            {person.platform_role === "viewer"
                              ? "Solo lectura"
                              : "Admin global"}
                          </StatusBadge>
                        ) : (
                          <StatusBadge>Acceso de agencia</StatusBadge>
                        )}
                        {selfRow(person) ? (
                          writable ? (
                            <button
                              type="button"
                              className="text-button platform-admin-danger"
                              disabled={busy}
                              onClick={() => {
                                setConfirming({ kind: "user", person });
                                setTyped("");
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar mi cuenta
                            </button>
                          ) : null
                        ) : writable ? (
                          <>
                            {person.platform_role !== "admin" && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "admin")}
                              >
                                <ShieldCheck size={14} />
                                Hacer admin global
                              </button>
                            )}
                            {person.platform_role !== "viewer" && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "viewer")}
                              >
                                <Eye size={14} />
                                Solo lectura
                              </button>
                            )}
                            {person.platform_role && (
                              <button
                                type="button"
                                className="text-button"
                                disabled={busy}
                                onClick={() => void setPlatformAccess(person, "none")}
                              >
                                Quitar acceso
                              </button>
                            )}
                            <button
                              type="button"
                              className="text-button platform-admin-danger"
                              disabled={busy}
                              onClick={() => {
                                setConfirming({ kind: "user", person });
                                setTyped("");
                              }}
                            >
                              <Trash2 size={14} />
                              Eliminar usuario
                            </button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="platform-admin-empty">
                    No hay usuarios para mostrar.
                  </li>
                )}
              </ul>
            </section>
            <section className="platform-admin-section platform-admin-commercial">
              <div className="platform-admin-section-heading">
                <div>
                  <p className="eyebrow">CUPONES</p>
                  <h2>Catálogo comercial</h2>
                </div>
                <small>
                  {formatPlatformMetric(state.coupons.length)} códigos
                </small>
              </div>
              {writable && (
              <form className="platform-admin-coupon" onSubmit={createCoupon}>
                <label>
                  Código
                  <input
                    value={coupon.code}
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        code: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SCALE10"
                    required
                    minLength={3}
                    maxLength={40}
                  />
                </label>
                  <SelectCustom label="Tipo" choices={[{value:'percent',label:'Porcentaje'},{value:'fixed',label:'Monto fijo'},{value:'days',label:'Días gratis'}]} value={coupon.discount_type} onChange={value=>setCoupon({...coupon,discount_type:value as 'percent'|'fixed'|'days'})}/>
                <label>
                  {coupon.discount_type === "days" ? "Días gratis" : "Valor"}
                  <input
                    value={coupon.discount_value}
                    inputMode={coupon.discount_type === "days" ? "numeric" : "decimal"}
                    maxLength={coupon.discount_type === "fixed" ? 10 : 3}
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        discount_value: coupon.discount_type === "fixed" ? decimalInput(event.target.value) : soloDigitos(event.target.value, 3),
                      })
                    }
                    required
                  />
                </label>
                {coupon.discount_type === "fixed" ? (
                    <SelectCustom label="Moneda" choices={[{value:'USD',label:'USD'},{value:'PYG',label:'PYG'}]} value={coupon.currency} onChange={value=>setCoupon({...coupon,currency:value})}/>
                ) : null}
                <button className="primary" disabled={busy}>
                  Crear cupón
                </button>
              </form>
              )}
              <p className="form-note">
                Crear un cupón no inicia cobros ni activa un proveedor de pagos.
              </p>
              <ul className="platform-admin-list">
                {state.coupons.length ? (
                  <li className="platform-admin-list-head" aria-hidden="true">
                    <span>Cupón</span>
                    <span>Acciones</span>
                  </li>
                ) : null}
                {state.coupons.length ? (
                  state.coupons.map((item) => (
                    <li key={item.id}>
                      <span>
                        <b title={item.code || "Cupón sin código"}>{item.code || "Cupón sin código"}</b>
                        <small>
                          {item.discount_type === "percent"
                            ? `${formatPlatformMetric(item.discount_value)}%`
                            : item.discount_type === "days"
                              ? `${formatPlatformMetric(item.discount_value)} días gratis`
                              : money(item.discount_value, item.currency)}{" "}
                          ·{" "}
                          {item.max_redemptions === null
                            ? "Sin límite de usos"
                            : `${formatPlatformMetric(item.max_redemptions)} usos máximos`}
                        </small>
                      </span>
                      <span className="platform-admin-list-actions">
                        <StatusBadge tone={item.active ? "success" : "neutral"}>
                          {item.active ? "Activo" : "Pausado"}
                        </StatusBadge>
                        {writable && (
                        <button
                          type="button"
                          className={"text-button " + (item.active ? "warn" : "positive")}
                          disabled={busy}
                          onClick={() => void toggleCoupon(item)}
                        >
                          {item.active ? (
                            <PauseCircle size={14} />
                          ) : (
                            <PlayCircle size={14} />
                          )}
                          {item.active ? "Pausar" : "Reactivar"}
                        </button>
                        )}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="platform-admin-empty">
                    No hay cupones para mostrar.
                  </li>
                )}
              </ul>
            </section>
          </section>

          <PlatformAudit audit={state.audit}/>
        </>
      ) : null}

    </>
  );

  return (
    <main className="platform-admin-page">
      <header className="platform-admin-header">
        <Link href={appHome()} aria-label="Scale OS">
          <WorkspaceBrand />
        </Link>
        <div className="platform-admin-title">
          <p className="eyebrow">ADMINISTRACIÓN GLOBAL</p>
          <h1>Control de Scale OS</h1>
          <span>Operación, acceso y catálogo comercial</span>
        </div>
        <div className="platform-admin-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => void load()}
            disabled={busy || redirecting || accessDenied}
          >
            <RefreshCw aria-hidden="true" />
            Actualizar
          </button>
          <Link className="text-button" href={appHome()}>
            <ArrowLeft aria-hidden="true" />
            Panel
          </Link>
        </div>
      </header>
      {pageContent}
      {actionNotice && <p className="platform-admin-status-note" role="status">{actionNotice}</p>}
      {actionError && <p className="platform-admin-status-note error" role="alert">{actionError}</p>}
      {confirming && writable && (
        <Dialog
          title={
            confirming.kind === "user"
              ? selfRow(confirming.person)
                ? "Eliminar mi cuenta"
                : "Eliminar usuario"
              : "Eliminar agencia"
          }
          busy={busy}
          close={() => {
            if (busy) return;
            setConfirming(null);
            setTyped("");
            setConfirmPassword("");
            setAuthMethod("password");
            setAuthPreviewId("");
            setEmailSent(false);
            setEmailCode("");
          }}
        >
          <p className="form-note">
            {confirming.kind === "user"
              ? selfRow(confirming.person)
                ? "Se eliminará tu usuario y las agencias que poseas. Solo vos podés eliminar tu propia cuenta. Esta acción es irreversible."
                : `Se eliminará ${confirming.person.email} y, si es dueño, sus agencias completas. Esta acción es irreversible.`
              : `Se eliminará la agencia ${confirming.agency.name} con todos sus datos. Esta acción es irreversible.`}
          </p>
          <label className="platform-admin-confirm">
            Escribí{" "}
            <strong>
              {confirming.kind === "user"
                ? confirming.person.email
                : confirming.agency.name}
            </strong>{" "}
            para confirmar
            <input
              value={typed}
              disabled={busy}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
            />
          </label>
          {authMethod === "password" ? (
            <label className="platform-admin-confirm">
              Confirmá tu identidad con tu contraseña actual
              <input
                type="password"
                value={confirmPassword}
                disabled={busy}
                autoComplete="current-password"
                maxLength={128}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
          ) : (
            <div className="form-stack">
              <p className="form-note">
                Para cuentas sin contraseña (Google): te enviamos un código de 8 dígitos al correo registrado.
              </p>
              {emailSent ? (
                <label className="platform-admin-confirm">
                  Código recibido
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={emailCode}
                    disabled={busy}
                    onChange={(event) =>
                      setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                    }
                  />
                </label>
              ) : (
                <button
                  type="button"
                  className="secondary"
                  disabled={
                    busy ||
                    emailSending ||
                    typed !==
                      (confirming.kind === "user"
                        ? confirming.person.email
                        : confirming.agency.name)
                  }
                  onClick={() => void requestEmailCode()}
                >
                  {emailSending ? "Enviando…" : "Enviar código a mi correo"}
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setAuthMethod(authMethod === "password" ? "email" : "password");
              setActionError("");
              setActionNotice("");
            }}
          >
            {authMethod === "password"
              ? "No tengo contraseña (usar código por correo)"
              : "Usar mi contraseña"}
          </button>
          <div className="inline-actions">
            <button
              className="primary"
              disabled={
                busy ||
                (authMethod === "password" ? !confirmPassword : emailCode.length !== 8) ||
                typed !==
                  (confirming.kind === "user"
                    ? confirming.person.email
                    : confirming.agency.name)
              }
              onClick={() => void removeConfirmed()}
            >
              {busy ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </Dialog>
      )}
      <WorkspaceFooter />
    </main>
  );
}
