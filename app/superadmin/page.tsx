"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { WorkspaceBrand } from "../workspace-brand";
import { WorkspaceFooter } from "../workspace-footer";
import "./platform-admin.css";
import { platformApi, subscriptionExpiry, asuncionInput } from "../platform-admin-api";
import {
  appHome,
  errorCode,
  errorStatus,
  loginReturnPath,
  newExtendKey,
  type Agency,
  type AuditAction,
  type BootstrapStatus,
  type ConfirmRequest,
  type Coupon,
  type Overview,
  platformTime,
  type Person,
  type CollectionPage,
  type PlatformView,
  type State,
  type Subscription,
} from "./model";
import {SegmentedField} from "owncoding-ui";
import {LoadingScreen} from "../loading-screen";
import {StateChip} from "../ui-v2";
import {PlatformOverview} from "./overview";
import {notify} from "../feedback";
import {PlatformAccessDenied, PlatformNotices, PlatformRedirecting} from "./states";
import {PlatformAgencies} from "./agencies";
import {PlatformAccess} from "./access";
import {PlatformCatalog} from "./catalog";
import {SubscriptionDialog} from "./subscription-dialog";
import {PlatformAudit} from "./audit";
import {PlatformConfirmDialog} from "./confirm";


export default function PlatformAdmin() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [view, setView] = useState<PlatformView>("resumen");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
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
        platformApi<{ agencies: Agency[]; total?: number; hasMore?: boolean; limit?: number; offset?: number }>("/api/platform/agencies?limit=50"),
        platformApi<{ users: Person[]; total?: number; hasMore?: boolean; limit?: number; offset?: number }>("/api/platform/users?limit=50"),
        platformApi<{ coupons: Coupon[]; total?: number; hasMore?: boolean; limit?: number; offset?: number }>("/api/platform/coupons?limit=50"),
        platformApi<{ actions: AuditAction[]; total?: number; hasMore?: boolean; limit?: number; offset?: number }>("/api/platform/audit?limit=50"),
        platformApi<{ user: { id?: string | number; platform_role?: string | null } }>("/api/auth/me").catch(() => null),
      ]);
      setMyRole(me?.user?.platform_role === "viewer" ? "viewer" : me?.user?.platform_role === "admin" ? "admin" : null);
      setMyUserId(me?.user?.id ? String(me.user.id) : "");
      // Ventana por colección (#106): total honesto del API y si queda más.
      const collectionPage = (data: { total?: number; hasMore?: boolean; limit?: number; offset?: number }, loaded: number): CollectionPage => {
        const total = typeof data.total === "number" ? data.total : loaded;
        const offset = typeof data.offset === "number" ? data.offset : 0;
        return { limit: typeof data.limit === "number" ? data.limit : 50, offset, total, hasMore: data.hasMore === true || offset + loaded < total };
      };
      setState({
        overview,
        agencies: agencies.agencies,
        users: users.users,
        coupons: coupons.coupons,
        audit: audit.actions,
        pages: {
          agencies: collectionPage(agencies, agencies.agencies.length),
          users: collectionPage(users, users.users.length),
          coupons: collectionPage(coupons, coupons.coupons.length),
          audit: collectionPage(audit, audit.actions.length),
        },
      });
      setUpdatedAt(new Date().toISOString());
    } catch (cause) {
      if (!handlePlatformError(cause, true))
        setError(
          "No pudimos cargar el control global. Actualizá para reintentar.",
        );
    } finally {
      setBusy(false);
    }
  }

  async function loadMore(kind: "agencies" | "users" | "coupons" | "audit") {
    if (!state || busy) return;
    const page = state.pages[kind];
    if (!page.hasMore) return;
    setBusy(true);
    setError("");
    const offset = state[kind].length, query = `?limit=${page.limit}&offset=${offset}`;
    try {
      if (kind === "agencies") {
        const data = await platformApi<{ agencies: Agency[]; total: number; hasMore: boolean }>(`/api/platform/agencies${query}`);
        setState(current => current ? {...current, agencies: [...current.agencies, ...data.agencies], pages: {...current.pages, agencies: {...page, offset, total: data.total, hasMore: data.hasMore}}} : current);
      } else if (kind === "users") {
        const data = await platformApi<{ users: Person[]; total: number; hasMore: boolean }>(`/api/platform/users${query}`);
        setState(current => current ? {...current, users: [...current.users, ...data.users], pages: {...current.pages, users: {...page, offset, total: data.total, hasMore: data.hasMore}}} : current);
      } else if (kind === "coupons") {
        const data = await platformApi<{ coupons: Coupon[]; total: number; hasMore: boolean }>(`/api/platform/coupons${query}`);
        setState(current => current ? {...current, coupons: [...current.coupons, ...data.coupons], pages: {...current.pages, coupons: {...page, offset, total: data.total, hasMore: data.hasMore}}} : current);
      } else {
        const data = await platformApi<{ actions: AuditAction[]; total: number; hasMore: boolean }>(`/api/platform/audit${query}`);
        setState(current => current ? {...current, audit: [...current.audit, ...data.actions], pages: {...current.pages, audit: {...page, offset, total: data.total, hasMore: data.hasMore}}} : current);
      }
    } catch (cause) {
      if (!handlePlatformError(cause)) setError("No pudimos cargar más registros. Volvé a intentar.");
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
    try {
      await platformApi(`/api/platform/users/${person.id}`, {
        method: "PATCH",
        body: JSON.stringify({ platform_access }),
      });
      notify({ tone: "success", message: `${person.email}: acceso global actualizado.` });
      await load();
    } catch (cause) {
      notify({
        tone: "error",
        message:
          cause instanceof Error
            ? cause.message
            : "No se pudo actualizar el acceso global.",
      });
    } finally {
      setBusy(false);
    }
  }
  async function requestEmailCode() {
    if (!confirming || emailSending || busy) return;
    setEmailSending(true);
    setActionError("");
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
      notify({ tone: "success", message: "Si podemos confirmar la operación, enviamos un código a tu correo registrado." });
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
          notify({ tone: "success", message: "Tu cuenta fue eliminada. La sesión se cerrará." });
          if (typeof window !== "undefined")
            window.setTimeout(
              () => window.location.assign("https://app.scaleparaguay.com/"),
              2500,
            );
          return;
        }
        notify({
          tone: "success",
          message: `Usuario eliminado${result.deleted.agencies.length ? ` junto con ${result.deleted.agencies.length} agencia(s)` : ""}.`,
        });
      } else {
        await platformApi(`/api/platform/agencies/${confirming.agency.id}`, {
          method: "DELETE",
          body: JSON.stringify(proofPayload),
        });
        notify({ tone: "success", message: `Agencia ${confirming.agency.name} eliminada.` });
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

  // Vistas del panel (#102): una consola con secciones y contadores en vez de
  // un scroll largo; todas las capacidades siguen disponibles por vista.
  const views: {id: PlatformView; label: string; icon: string; count?: number}[] = [
    {id: "resumen", label: "Resumen", icon: "overview"},
    {id: "agencias", label: "Agencias", icon: "building", count: state?.agencies.length},
    {id: "cupones", label: "Cupones", icon: "tag", count: state?.coupons.length},
    {id: "accesos", label: "Accesos", icon: "shield", count: state?.users.length},
    {id: "auditoria", label: "Auditoría", icon: "audit", count: state?.audit.length},
  ];
  const pageContent = redirecting ? (
    <PlatformRedirecting/>
  ) : accessDenied ? (
    <PlatformAccessDenied/>
  ) : (
    <>
      <PlatformNotices state={state} error={error} bootstrap={bootstrap}/>
      {state ? (
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {/* Barra de secciones: `div` (no `nav`) para no heredar el ancho
              completo de la regla legacy `nav button` del shell; el objeto
              `SegmentedField` ya declara su propio `role="group"`. */}
          <div className="platform-admin-tabs silent-scroll">
            <SegmentedField className="w-max flex-nowrap [&>button]:min-h-11 [&>button]:whitespace-nowrap md:[&>button]:min-h-8" value={view} onChange={(value:string)=>setView(value as PlatformView)} ariaLabel="Secciones del panel global" options={views.map((item)=>[item.id, item.label, item.icon, item.count] as [string,string,string,number|undefined])}/>
          </div>

          {view === "resumen" ? <PlatformOverview state={state} audit={state.audit} onGoTo={setView}/> : null}

          {view === "agencias" ? <PlatformAgencies busy={busy} state={state} page={state.pages.agencies} onMore={()=>void loadMore('agencies')} writable={writable} setConfirming={setConfirming} setTyped={setTyped} manageSubscription={manageSubscription}/> : null}

          {view === "cupones" ? <PlatformCatalog busy={busy} state={state} page={state.pages.coupons} onMore={()=>void loadMore('coupons')} writable={writable} coupon={coupon} setCoupon={setCoupon} toggleCoupon={toggleCoupon} createCoupon={createCoupon}/> : null}

          {view === "accesos" ? <PlatformAccess busy={busy} state={state} page={state.pages.users} onMore={()=>void loadMore('users')} writable={writable} setConfirming={setConfirming} setTyped={setTyped} selfRow={selfRow} setPlatformAccess={setPlatformAccess}/> : null}

          {view === "auditoria" ? <PlatformAudit audit={state.audit} page={state.pages.audit} busy={busy} onMore={()=>void loadMore('audit')}/> : null}

          {writable && subscriptionAgency ? (
            <SubscriptionDialog busy={busy} subscriptionAgency={subscriptionAgency} setSubscriptionAgency={setSubscriptionAgency} subscription={subscription} setSubscription={setSubscription} subscriptionLoaded={subscriptionLoaded} setSubscriptionLoaded={setSubscriptionLoaded} subscriptionError={subscriptionError} setSubscriptionError={setSubscriptionError} subscriptionRequest={subscriptionRequest} subscriptionState={subscriptionState} setSubscriptionState={setSubscriptionState} subscriptionReason={subscriptionReason} setSubscriptionReason={setSubscriptionReason} subscriptionExpiryValue={subscriptionExpiryValue} setSubscriptionExpiryValue={setSubscriptionExpiryValue} extendDays={extendDays} setExtendDays={setExtendDays} extendReason={extendReason} setExtendReason={setExtendReason} manageSubscription={manageSubscription} saveSubscription={saveSubscription} saveExtension={saveExtension}/>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const updated = platformTime(updatedAt);
  // Carga inicial: la misma pantalla de carga de la app (variante neutra, sin
  // sesión) mientras llega el overview, que además es la puerta de permisos.
  if (busy && !state && !error && !redirecting && !accessDenied) return <LoadingScreen/>;
  return (
    <main className="platform-admin-page control-shell">
      <header className="platform-admin-header">
        <Link className="platform-admin-brand" href={appHome()} aria-label="Scale OS">
          <WorkspaceBrand />
        </Link>
        <div className="platform-admin-identity">
          <p className="eyebrow">Administración global</p>
          <h1>Control de Scale OS</h1>
        </div>
        <div className="platform-admin-meta">
          <StateChip tone={writable ? "ok" : "info"} title={writable ? "Tu usuario puede administrar la plataforma" : "Tu usuario solo puede consultar la plataforma"}>{writable ? "Admin global" : "Solo lectura"}</StateChip>
          {updated ? <span className="platform-admin-updated" title={`Última actualización ${updated} (hora de Asunción)`}>Actualizado {updated}</span> : null}
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
          <Link className="secondary" href={appHome()}>
            <ArrowLeft aria-hidden="true" />
            Panel
          </Link>
        </div>
      </header>
      {pageContent}
      {confirming && writable && (
        <PlatformConfirmDialog
          request={confirming}
          busy={busy}
          self={confirmingSelf}
          error={actionError}
          emailSending={emailSending}
          typed={typed}
          setTyped={setTyped}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          authMethod={authMethod}
          onSwitchAuth={() => {
            setAuthMethod(authMethod === "password" ? "email" : "password");
            setActionError("");
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
            setActionError("");
          }}
          onRequestEmailCode={() => void requestEmailCode()}
          onRemove={() => void removeConfirmed()}
        />
      )}
      <WorkspaceFooter />
    </main>
  );
}
