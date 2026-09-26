"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {money as formatMoney} from "../operations";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Building2,
  CircleCheck,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Users,
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
  type ConfirmRequest,
  type Coupon,
  type Overview,
  type Person,
  type State,
  type Subscription,
} from "./model";
import {PlatformAccessDenied, PlatformNotices, PlatformRedirecting} from "./states";
import {PlatformAgencies} from "./agencies";
import {PlatformAccess} from "./access";
import {PlatformCatalog} from "./catalog";
import {SubscriptionDialog} from "./subscription-dialog";
import {PlatformAudit} from "./audit";
import {PlatformConfirmDialog} from "./confirm";
import { soloDigitos } from "owncoding-ui";
import { decimalInput } from "../field-rules";
import { SelectCustom } from "../profile-controls";
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
  const [confirming, setConfirming] = useState<ConfirmRequest>(null);
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
  const confirmingSelf = confirming?.kind === "user" && selfRow(confirming.person);
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
          <section className="platform-admin-section platform-admin-context platform-admin-command-deck" aria-labelledby="platform-admin-context-title">
            <div className="platform-admin-command-copy">
              <div className="platform-admin-section-heading">
                <div>
                  <p className="eyebrow">NÚCLEO DE PLATAFORMA</p>
                  <h2 id="platform-admin-context-title">Administración global</h2>
                  <p>Una vista de mando para organizaciones, permisos, catálogo comercial y trazabilidad.</p>
                </div>
              </div>
              <nav className="platform-admin-section-nav platform-admin-actions" aria-label="Secciones de administración global">
                <Link className="text-button" href="#resumen">Resumen</Link>
                <Link className="text-button" href="#agencias">Agencias</Link>
                <Link className="text-button" href="#accesos">Accesos</Link>
                <Link className="text-button" href="#catalogo">Catálogo</Link>
                <Link className="text-button" href="#auditoria">Auditoría</Link>
              </nav>
            </div>
            <div className="platform-admin-command-status" aria-label="Estado del centro de control">
              <span className="platform-admin-command-icon" aria-hidden="true">
                <ShieldCheck />
              </span>
              <div>
                <span>Ámbito activo</span>
                <strong>Plataforma Scale OS</strong>
              </div>
              <Activity aria-hidden="true" className="platform-admin-command-pulse" />
            </div>
          </section>

          <section id="resumen" className="platform-admin-section platform-admin-overview" aria-labelledby="platform-admin-overview-title">
            <div className="platform-admin-section-heading">
              <div>
              <p className="eyebrow">PANORAMA ACTUAL</p>
              <h2 id="platform-admin-overview-title">Resumen de plataforma</h2>
              </div>
            </div>
            <div className="platform-admin-stats">
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
            </div>
          </section>

          <div id="agencias">
            <PlatformAgencies busy={busy} state={state} writable={writable} setConfirming={setConfirming} setTyped={setTyped} manageSubscription={manageSubscription}/>
          </div>

          {writable && subscriptionAgency ? (
            <SubscriptionDialog busy={busy} subscriptionAgency={subscriptionAgency} setSubscriptionAgency={setSubscriptionAgency} subscription={subscription} setSubscription={setSubscription} subscriptionLoaded={subscriptionLoaded} setSubscriptionLoaded={setSubscriptionLoaded} subscriptionError={subscriptionError} setSubscriptionError={setSubscriptionError} subscriptionRequest={subscriptionRequest} subscriptionState={subscriptionState} setSubscriptionState={setSubscriptionState} subscriptionReason={subscriptionReason} setSubscriptionReason={setSubscriptionReason} subscriptionExpiryValue={subscriptionExpiryValue} setSubscriptionExpiryValue={setSubscriptionExpiryValue} extendDays={extendDays} setExtendDays={setExtendDays} extendReason={extendReason} setExtendReason={setExtendReason} manageSubscription={manageSubscription} saveSubscription={saveSubscription} saveExtension={saveExtension}/>
          ) : null}

          <section className="platform-admin-two-columns" aria-label="Acceso y catálogo">
            <div id="accesos">
              <PlatformAccess busy={busy} state={state} writable={writable} setConfirming={setConfirming} setTyped={setTyped} selfRow={selfRow} setPlatformAccess={setPlatformAccess}/>
            </div>
            <div id="catalogo">
              <PlatformCatalog busy={busy} state={state} writable={writable} coupon={coupon} setCoupon={setCoupon} toggleCoupon={toggleCoupon} createCoupon={createCoupon}/>
            </div>
          </section>

          <div id="auditoria">
            <PlatformAudit audit={state.audit}/>
          </div>
        </>
      ) : null}

    </>
  );

  return (
    <main className="platform-admin-page">
      <header className="platform-admin-header platform-admin-header--global">
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
        <PlatformConfirmDialog
          request={confirming}
          busy={busy}
          self={confirmingSelf}
          emailSending={emailSending}
          typed={typed}
          setTyped={setTyped}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          authMethod={authMethod}
          onSwitchAuth={() => {
            setAuthMethod(authMethod === "password" ? "email" : "password");
            setActionError("");
            setActionNotice("");
          }}
          emailSent={emailSent}
          emailCode={emailCode}
          setEmailCode={setEmailCode}
          onClose={() => {
            if (busy) return;
            setConfirming(null);
            setTyped("");
            setConfirmPassword("");
            setAuthMethod("password");
            setAuthPreviewId("");
            setEmailSent(false);
            setEmailCode("");
          }}
          onRequestEmailCode={() => void requestEmailCode()}
          onRemove={() => void removeConfirmed()}
        />
      )}
      <WorkspaceFooter />
    </main>
  );
}
