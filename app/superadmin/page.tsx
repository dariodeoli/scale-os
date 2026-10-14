"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceBrand } from "../workspace-brand";
import { WorkspaceFooter } from "../workspace-footer";
import "./platform-admin.css";
import { platformApi, subscriptionExpiry, asuncionInput } from "../platform-admin-api";
import {
  appHome,
  errorCode,
  errorStatus,
  newExtendKey,
  PLATFORM_GOOGLE_STORAGE_KEY,
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
  PLATFORM_ACCESS_NOTE,
  PLATFORM_GATE_MESSAGE,
  type InquiryCounts,
  type InquiryPage,
  type State,
  type Subscription,
} from "./model";
import {PageHeader, StateChip} from "../ui-v2";
import {notify} from "../feedback";
import {PlatformAdminSkeleton, PlatformNotices, PlatformRedirecting} from "./states";
import {SubscriptionDialog} from "./subscription-dialog";
import {PLATFORM_SECTIONS, resolveSection, type PlatformSectionProps} from "./sections";
import {PlatformSidebar} from "./sidebar";
import {PlatformPeriodChips} from "./period-chips";
import {DEFAULT_PLATFORM_PERIOD, isPlatformPeriod, type PlatformPeriodId} from "./period";
import {PlatformConfirmDialog, type PlatformAuthMethod} from "./confirm";
import {ApplyCouponDialog} from "./apply-coupon-dialog";
import {preflightGoogleStart} from "../deletion-danger-zone";


export default function PlatformAdmin() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [view, setView] = useState<PlatformView>("resumen");
  // Período compartido por Resumen y Uso (guía §3): un solo estado, chips en la barra.
  const [period, setPeriod] = useState<PlatformPeriodId>(DEFAULT_PLATFORM_PERIOD);
  const headerRef = useRef<HTMLDivElement | null>(null);
  // Contadores de Consultas: el ítem del menú muestra las nuevas sin abrirlo.
  const [inquiryCounts, setInquiryCounts] = useState<InquiryCounts | null>(null);
  // Enlace directo a una sección (`?vista=consultas`, el CTA del correo de aviso;
  // alias como `?vista=actividad` → Uso) y al período (`?periodo=7d`).
  useEffect(() => {
    if (typeof window === "undefined" || !window.location) return;
    const query = new URLSearchParams(window.location.search);
    const requested = query.get("vista");
    if (requested) setView(resolveSection(requested).id);
    const requestedPeriod = query.get("periodo");
    if (isPlatformPeriod(requestedPeriod)) setPeriod(requestedPeriod);
  }, []);

  // La URL refleja la sección y el período: recargar o compartir abre lo mismo.
  function syncUrl(next: {vista?: string; periodo?: string}) {
    if (typeof window === "undefined" || !window.location || !window.history?.replaceState) return;
    const query = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(next)) if (value) query.set(key, value);
    window.history.replaceState(null, "", `${window.location.pathname}?${query.toString()}${window.location.hash}`);
  }

  function changeView(nextView: PlatformView) {
    if (nextView === view) return;
    const section = resolveSection(nextView);
    setView(section.id);
    syncUrl({vista: section.id});
    headerRef.current?.scrollIntoView({block: "start", behavior: "instant"});
  }

  function changePeriod(next: PlatformPeriodId) {
    setPeriod(next);
    syncUrl({periodo: next});
  }
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [coupon, setCoupon] = useState({
    code: "",
    discount_value: "10",
    discount_type: "percent" as "percent" | "fixed" | "days",
    currency: "USD",
    expires_at: "",
    organization_id: "",
    note: "",
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
  const [confirmPassword, setConfirmPassword] = useState("");
  // Google es el camino principal (un clic); contraseña y código por correo son alternativas.
  const [authMethod, setAuthMethod] = useState<PlatformAuthMethod>("google");
  const [authPreview, setAuthPreview] = useState<{ id: string; confirmation: string } | null>(null);
  const [googleProof, setGoogleProof] = useState("");
  const [googleStarting, setGoogleStarting] = useState(false);
  const [applyAgency, setApplyAgency] = useState<Agency | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [actionError, setActionError] = useState("");

  // Sin acceso al panel (guía §1): el API responde el mismo 404 genérico a quien
  // no es admin global (sin sesión, demo, sin rol, cuenta no verificada). El panel
  // no explica nada: borra lo cargado y vuelve al inicio de la app.
  const leaving = useRef(false);
  function redirectHome() {
    if (leaving.current) return;
    leaving.current = true;
    setState(null);
    setError("");
    setRedirecting(true);
    const target = appHome();
    if (target.startsWith("https://")) window.location.replace(target);
    else router.replace(target);
  }

  function handlePlatformError(cause: unknown, fromLoad = false) {
    const status = errorStatus(cause);
    // 401 o el 404 genérico del guard: la sesión o el rol global ya no están (en la
    // carga o a mitad de uso). Un 404 propio de una acción («Cupón no encontrado») no.
    const gate = status === 404 && (fromLoad || (cause instanceof Error && cause.message === PLATFORM_GATE_MESSAGE));
    if (status === 401 || gate) {
      redirectHome();
      return true;
    }
    if (status === 403) {
      // Solo la carga inicial decide el acceso. Un 403 de una acción se muestra
      // inline y el panel sigue montado (viewer nunca ve acciones, issue #22).
      if (!fromLoad) return false;
      redirectHome();
      return true;
    }
    return false;
  }

  async function load() {
    setBusy(true);
    setError("");
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
      // Sin bloquear el panel: si la bandeja no responde, la pestaña queda sin contador.
      void platformApi<InquiryPage>("/api/platform/inquiries?limit=1")
        .then((page) => { if (page?.counts) setInquiryCounts(page.counts); })
        .catch(() => undefined);
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
        // Compare-and-set: el acceso que muestra la fila; el API responde 409 si cambió.
        body: JSON.stringify({ platform_access, expected_access: person.platform_admin ? person.platform_role ?? undefined : "none" }),
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
      const preview = await platformApi<{ preview: { id: string; confirmation: string } }>(
        "/api/platform/destructive/preview",
        { method: "POST", body: JSON.stringify({ action, targetId }) },
      );
      setAuthPreview({ id: preview.preview.id, confirmation: preview.preview.confirmation });
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

  function resetConfirm() {
    setConfirming(null);
    setConfirmPassword("");
    setAuthMethod("google");
    setAuthPreview(null);
    setGoogleProof("");
    setGoogleStarting(false);
    setEmailSent(false);
    setEmailCode("");
    setActionError("");
  }

  function deletionTarget(request: NonNullable<ConfirmRequest>) {
    return request.kind === "user"
      ? { action: "platform.user.delete", targetId: request.person.id }
      : { action: "platform.agency.delete", targetId: request.agency.id };
  }

  // La vista previa del servidor trae el texto de confirmación que el API exige:
  // el usuario confirma con la palabra corta y el marco lo envía tal cual.
  async function ensurePreview(request: NonNullable<ConfirmRequest>) {
    if (authPreview) return authPreview;
    const created = await platformApi<{ preview: { id: string; confirmation: string } }>("/api/platform/destructive/preview", {
      method: "POST",
      body: JSON.stringify(deletionTarget(request)),
    });
    const preview = { id: created.preview.id, confirmation: created.preview.confirmation };
    setAuthPreview(preview);
    return preview;
  }

  async function startGoogle() {
    if (!confirming || busy || googleStarting) return;
    setGoogleStarting(true);
    setActionError("");
    try {
      const preview = await ensurePreview(confirming);
      const startPath = `/api/auth/account/recent-auth/google/start?previewId=${encodeURIComponent(preview.id)}`;
      await preflightGoogleStart(startPath);
      const request = confirming.kind === "user"
        ? { kind: "user", id: confirming.person.id, email: confirming.person.email, full_name: confirming.person.full_name ?? null }
        : { kind: "agency", id: confirming.agency.id, name: confirming.agency.name };
      try {
        sessionStorage.setItem(PLATFORM_GOOGLE_STORAGE_KEY, JSON.stringify({ preview, request }));
      } catch {
        throw new Error("No pudimos conservar la confirmación durante la verificación. Habilitá el almacenamiento de sesión e intentá nuevamente.");
      }
      window.location.assign(`/core-api${startPath}`);
    } catch (cause) {
      const code = errorCode(cause);
      if (code === "GOOGLE_REAUTH_NOT_ALLOWED") {
        setAuthMethod("password");
        setActionError("Tu cuenta tiene contraseña: confirmá con ella o pedí un código por correo.");
      } else if (code === "GOOGLE_REAUTH_UNAVAILABLE") {
        setAuthMethod("password");
        setActionError("Google no está disponible en este momento. Usá tu contraseña o el código por correo.");
      } else if (!handlePlatformError(cause)) {
        setActionError(cause instanceof Error ? cause.message : "No pudimos iniciar la verificación con Google.");
      }
      setGoogleStarting(false);
    }
  }

  // Vuelta de Google: el API redirige acá con un ticket de un solo uso; se canjea
  // por la prueba de identidad y se restaura la eliminación que quedó pendiente.
  useEffect(() => {
    if (typeof window === "undefined" || !window.location) return;
    const query = new URLSearchParams(window.location.search);
    const ticket = query.get("recentAuthTicket");
    if (!ticket) return;
    query.delete("recentAuthTicket");
    query.delete("error");
    const rest = query.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}${window.location.hash}`);
    let stored: { preview?: { id?: unknown; confirmation?: unknown }; request?: Record<string, unknown> } | null = null;
    try {
      stored = JSON.parse(sessionStorage.getItem(PLATFORM_GOOGLE_STORAGE_KEY) || "null");
      sessionStorage.removeItem(PLATFORM_GOOGLE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const request = stored?.request;
    if (typeof stored?.preview?.id !== "string" || typeof stored.preview.confirmation !== "string" || !request) {
      notify({ tone: "error", message: "La verificación con Google venció. Volvé a iniciar la eliminación." });
      return;
    }
    const preview = { id: stored.preview.id, confirmation: stored.preview.confirmation };
    void platformApi<{ proof: string }>("/api/auth/account/recent-auth/google/complete", {
      method: "POST",
      body: JSON.stringify({ ticket }),
    }).then((auth) => {
      setConfirming(
        request.kind === "user"
          ? { kind: "user", person: { id: Number(request.id), email: String(request.email ?? ""), full_name: typeof request.full_name === "string" ? request.full_name : null, active_agencies: 0, platform_admin: false } }
          : { kind: "agency", agency: { id: Number(request.id), name: String(request.name ?? ""), slug: "", active: true, active_users: 0, subscription_status: null, subscription_currency: null, subscription_amount: null, trial_ends_at: null, due_at: null } },
      );
      setAuthPreview(preview);
      setGoogleProof(auth.proof);
      setAuthMethod("google");
      setActionError("");
    }).catch((cause) => {
      if (!handlePlatformError(cause)) notify({ tone: "error", message: cause instanceof Error ? cause.message : "No pudimos confirmar tu identidad con Google." });
    });
  }, []);

  async function removeConfirmed() {
    if (busy || !confirming) return;
    if (!googleProof && authMethod === "google") {
      setActionError("Confirmá tu identidad con Google antes de eliminar.");
      return;
    }
    if (!googleProof && authMethod === "password" && !confirmPassword) {
      setActionError("Ingresá tu contraseña actual para confirmar la eliminación.");
      return;
    }
    if (!googleProof && authMethod === "email" && emailCode.length !== 8) {
      setActionError("Ingresá el código de 8 dígitos que enviamos a tu correo.");
      return;
    }
    // El API exige vista previa + prueba de re-autenticación (issue #22).
    setBusy(true);
    setActionError("");
    try {
      const previewData = await ensurePreview(confirming);
      const preview = { preview: previewData };
      const confirmation = previewData.confirmation;
      let recentAuthProof: string;
      try {
        if (googleProof) {
          recentAuthProof = googleProof;
        } else {
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
        }
      } catch (cause) {
        const code = errorCode(cause);
        if (code === "PASSWORD_REAUTH_FAILED") {
          setActionError("No pudimos confirmar tu contraseña. Revisala y volvé a intentar.");
          return;
        }
        if (code === "PASSWORD_REAUTH_UNAVAILABLE") {
          setAuthMethod("google");
          setActionError("Esta cuenta no usa contraseña: confirmá con Google o pedí el código de 8 dígitos a tu correo.");
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
      resetConfirm();
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

  // Gracia en un clic (#189): reutiliza el endpoint de pago manual con un motivo editable.
  async function grantGrace(days: number, reason: string, key: string) {
    if (!subscriptionAgency) return "";
    const agency = subscriptionAgency;
    try {
      await platformApi(`/api/platform/agencies/${agency.id}/subscription/extend`, {
        method: "POST",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({ days, reason }),
      });
    } catch (cause) {
      if (handlePlatformError(cause)) return "";
      return cause instanceof Error ? cause.message : "No pudimos dar la gracia.";
    }
    notify({ tone: "success", message: `Gracia de ${days} días otorgada a ${agency.name}.` });
    await load();
    await manageSubscription(agency);
    return "";
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
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          currency: coupon.discount_type === "fixed" ? coupon.currency : null,
          ...(coupon.expires_at ? { expires_at: coupon.expires_at } : {}),
          ...(coupon.organization_id ? { organization_id: coupon.organization_id } : {}),
          ...(coupon.note.trim() ? { note: coupon.note.trim() } : {}),
        }),
      });
      setCoupon({
        code: "",
        discount_value: "10",
        discount_type: "percent",
        currency: "USD",
        expires_at: "",
        organization_id: "",
        note: "",
      });
      await load();
    } catch (cause) {
      if (!handlePlatformError(cause)) setError("No pudimos crear el cupón.");
      setBusy(false);
    }
  }

  const sectionProps: PlatformSectionProps | null = state ? {
    state, busy, writable, period, bootstrap, inquiryCounts, setInquiryCounts,
    onGoTo: changeView,
    onError: (cause) => handlePlatformError(cause),
    actions: {
      loadMore: (kind) => void loadMore(kind),
      setConfirming, manageSubscription, applyCoupon: setApplyAgency,
      coupon, setCoupon, toggleCoupon, createCoupon, selfRow, setPlatformAccess,
    },
  } : null;
  const current = resolveSection(view);
  const Section = current.component;

  const updated = platformTime(updatedAt);
  if (redirecting) return <PlatformRedirecting/>;
  // Carga inicial: forma neutra del shell hasta que el API (la puerta de permisos) responda.
  if (!state && !error) return <PlatformAdminSkeleton/>;
  const content: ReactNode = <>
    <PlatformNotices state={state} error={error} bootstrap={bootstrap} onRetry={() => void load()}/>
    {sectionProps && Section ? <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <Section {...sectionProps}/>
      {writable && subscriptionAgency ? (
        <SubscriptionDialog busy={busy} subscriptionAgency={subscriptionAgency} setSubscriptionAgency={setSubscriptionAgency} subscription={subscription} setSubscription={setSubscription} subscriptionLoaded={subscriptionLoaded} setSubscriptionLoaded={setSubscriptionLoaded} subscriptionError={subscriptionError} setSubscriptionError={setSubscriptionError} subscriptionRequest={subscriptionRequest} subscriptionState={subscriptionState} setSubscriptionState={setSubscriptionState} subscriptionReason={subscriptionReason} setSubscriptionReason={setSubscriptionReason} subscriptionExpiryValue={subscriptionExpiryValue} setSubscriptionExpiryValue={setSubscriptionExpiryValue} extendDays={extendDays} setExtendDays={setExtendDays} extendReason={extendReason} setExtendReason={setExtendReason} manageSubscription={manageSubscription} saveSubscription={saveSubscription} saveExtension={saveExtension} grantGrace={grantGrace} applyCoupon={setApplyAgency}/>
      ) : null}
      {writable && applyAgency ? (
        <ApplyCouponDialog agency={applyAgency} onClose={() => setApplyAgency(null)} onApplied={() => load()} onFailure={(cause) => handlePlatformError(cause)}/>
      ) : null}
    </div> : null}
  </>;

  // Shell (guía §2/§7): riel lateral con la lista única de secciones + barra superior
  // compacta (título de la sección, «Actualizado HH:MM», Actualizar, Panel). En mobile
  // el riel pasa a una tira horizontal con scroll silencioso debajo de la barra.
  return (
    <main className="platform-admin-page control-shell platform-shell">
      <PlatformSidebar sections={PLATFORM_SECTIONS} current={current.id} props={sectionProps} onSelect={changeView}/>
      <div ref={headerRef} className="platform-admin-top">
        <Link className="platform-admin-brand" href={appHome()} aria-label="Scale OS">
          <WorkspaceBrand />
        </Link>
        <PageHeader
          className="min-w-0 flex-[1_1_20rem] !mb-0"
          title={current.title || current.label}
          subtitle={<span className="platform-admin-meta">
            {/* El estado refleja el permiso real del API (#147); sin rol resuelto, sin chip. */}
            {myRole ? <StateChip tone={writable ? "ok" : "info"} title={`${writable ? "Tu usuario puede administrar la plataforma" : "Tu usuario solo puede consultar la plataforma"}. ${PLATFORM_ACCESS_NOTE}`}>{writable ? "Admin global" : "Solo lectura"}</StateChip> : null}
            {updated ? <span className="platform-admin-updated" title={`Última actualización ${updated} (hora de Asunción)`}>Actualizado {updated}</span> : null}
          </span>}
          actions={<div className="platform-admin-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void load()}
              disabled={busy}
              aria-label="Actualizar"
              title="Actualizar los datos del panel"
            >
              <RefreshCw aria-hidden="true" />
              <span className="platform-admin-action-label">Actualizar</span>
            </button>
            <Link className="secondary" href={appHome()} aria-label="Volver al panel" title="Volver al panel de la agencia">
              <ArrowLeft aria-hidden="true" />
              <span className="platform-admin-action-label">Panel</span>
            </Link>
          </div>}
        />
      </div>
      <div className="platform-main">
        {current.usesPeriod ? <PlatformPeriodChips value={period} onChange={changePeriod}/> : null}
        {content}
      </div>
      {confirming && writable && (
        <PlatformConfirmDialog
          request={confirming}
          busy={busy}
          self={confirmingSelf}
          error={actionError}
          emailSending={emailSending}
          googleStarting={googleStarting}
          googleVerified={Boolean(googleProof)}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          authMethod={authMethod}
          setAuthMethod={(method) => {
            setAuthMethod(method);
            setActionError("");
          }}
          emailSent={emailSent}
          emailCode={emailCode}
          setEmailCode={setEmailCode}
          onClose={() => {
            if (busy) return;
            resetConfirm();
          }}
          onGoogle={() => void startGoogle()}
          onRequestEmailCode={() => void requestEmailCode()}
          onRemove={() => void removeConfirmed()}
        />
      )}
      <div className="platform-footer"><WorkspaceFooter /></div>
    </main>
  );
}
