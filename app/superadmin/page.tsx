"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  CircleAlert,
  CircleCheck,
  KeyRound,
  RefreshCw,
  ShieldAlert,
  Ticket,
  Users,
} from "lucide-react";
import { WorkspaceBrand } from "../workspace-brand";
import { WorkspaceFooter } from "../workspace-footer";
import "./platform-admin.css";
import { platformApi, subscriptionExpiry } from "../platform-admin-api";

type Overview = {
  agencies: { total: number; active: number };
  users: { total: number };
  subscriptions: { status: string; total: number }[];
  coupons: { total: number; active: number };
};
type Agency = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  active_users: number;
  subscription_status: string | null;
  subscription_currency: string | null;
  subscription_amount: string | null;
  trial_ends_at: string | null;
  due_at: string | null;
  internal_subscription_state?: "active" | "suspended" | null;
  internal_subscription_expires_at?: string | null;
};
type Subscription = {
  internal_state: "active" | "suspended" | null;
  internal_reason: string | null;
  internal_expires_at: string | null;
  provider_status?: string | null;
  currency?: string | null;
};
type Person = {
  id: number;
  email: string;
  active_agencies: number;
  platform_admin: boolean;
};
type Coupon = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: string;
  currency: string | null;
  active: boolean;
  max_redemptions: number | null;
};
type State = {
  overview: Overview;
  agencies: Agency[];
  users: Person[];
  coupons: Coupon[];
};
type BootstrapStatus = {
  configured: boolean;
  valid: boolean;
  initialized: boolean;
  state:
    | "initialized"
    | "not_configured"
    | "invalid_configuration"
    | "awaiting_eligible_user";
};

type PlatformError = Error & { status?: unknown };
const LOGIN_RETURN_PATH = "/?next=/superadmin";

function errorStatus(cause: unknown) {
  const status = (cause as PlatformError)?.status;
  return typeof status === "number" ? status : undefined;
}

function formatPlatformMetric(value: unknown, fallback = "—") {
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(number)
    ? new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(
        number,
      )
    : fallback;
}

function money(value: unknown, currency: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  const code =
    typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
      ? currency
      : "USD";
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("es-PY", {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "PYG" ? 0 : 2,
    }).format(amount);
  } catch {
    return "—";
  }
}

function platformDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-PY", { dateStyle: "medium" }).format(date)
    : "—";
}

function subscriptionSummary(rows: unknown) {
  if (!Array.isArray(rows)) return "Sin datos";
  const values = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as { total?: unknown; status?: unknown };
    const total = formatPlatformMetric(item.total, "");
    if (!total) return [];
    const status =
      typeof item.status === "string" && item.status.trim()
        ? item.status.trim()
        : "Sin estado";
    return [`${total} ${status}`];
  });
  return values.join(" · ") || "Sin datos";
}

function manualAccessLabel(agency: Agency) {
  if (agency.internal_subscription_state === "active")
    return "Acceso manual activo";
  if (agency.internal_subscription_state === "suspended")
    return "Acceso manual suspendido";
  return "Sin cambio manual";
}

function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "success" | "warning" | "neutral";
}) {
  return (
    <span className="platform-admin-badge" data-tone={tone}>
      {children}
    </span>
  );
}

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
    discount_type: "percent" as "percent" | "fixed",
    currency: "USD",
  });
  const [bootstrap, setBootstrap] = useState<BootstrapStatus | null>(null);
  const [subscriptionAgency, setSubscriptionAgency] = useState<Agency | null>(
    null,
  );
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoaded, setSubscriptionLoaded] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<
    "active" | "suspended" | "clear"
  >("active");
  const [subscriptionReason, setSubscriptionReason] = useState("");
  const [subscriptionExpiryValue, setSubscriptionExpiryValue] = useState("");

  function handlePlatformError(cause: unknown) {
    const status = errorStatus(cause);
    if (status === 401) {
      setState(null);
      setError("");
      setAccessDenied(false);
      setRedirecting(true);
      router.replace(LOGIN_RETURN_PATH);
      return true;
    }
    if (status === 403) {
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
      const [agencies, users, coupons] = await Promise.all([
        platformApi<{ agencies: Agency[] }>("/api/platform/agencies?limit=50"),
        platformApi<{ users: Person[] }>("/api/platform/users?limit=50"),
        platformApi<{ coupons: Coupon[] }>("/api/platform/coupons?limit=50"),
      ]);
      setState({
        overview,
        agencies: agencies.agencies,
        users: users.users,
        coupons: coupons.coupons,
      });
    } catch (cause) {
      if (!handlePlatformError(cause))
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

  async function manageSubscription(agency: Agency) {
    setError("");
    setSubscriptionAgency(agency);
    setSubscription(null);
    setSubscriptionLoaded(false);
    try {
      const data = await platformApi<{ subscription: Subscription | null }>(
        `/api/platform/agencies/${agency.id}/subscription`,
      );
      setSubscription(data.subscription);
      setSubscriptionLoaded(true);
      setSubscriptionState(data.subscription?.internal_state || "active");
      setSubscriptionReason(data.subscription?.internal_reason || "");
      setSubscriptionExpiryValue(
        data.subscription?.internal_expires_at
          ? data.subscription.internal_expires_at.slice(0, 16)
          : "",
      );
    } catch (cause) {
      if (!handlePlatformError(cause))
        setError("No pudimos cargar el estado manual.");
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
    try {
      await platformApi("/api/platform/coupons", {
        method: "POST",
        body: JSON.stringify({
          ...coupon,
          currency: coupon.discount_type === "percent" ? null : coupon.currency,
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
    <section className="platform-admin-state" role="status">
      <KeyRound aria-hidden="true" />
      <div>
        <h2>Redirigiendo al inicio de sesión</h2>
        <p>Verificá tu acceso para continuar con la administración global.</p>
      </div>
    </section>
  ) : accessDenied ? (
    <section className="platform-admin-access-denied" role="alert">
      <div className="platform-admin-access-denied-icon">
        <ShieldAlert aria-hidden="true" />
      </div>
      <div>
        <p className="eyebrow">ACCESO RESTRINGIDO</p>
        <h2>No tenés acceso global</h2>
        <p>
          Tu sesión está activa, pero no tiene el permiso necesario para
          administrar la plataforma.
        </p>
        <Link className="secondary platform-admin-back-link" href="/">
          <ArrowLeft aria-hidden="true" />
          Volver al panel
        </Link>
      </div>
    </section>
  ) : (
    <>
      <section className="platform-admin-notice">
        <ShieldAlert aria-hidden="true" />
        <span>
          <strong>Acceso separado por plataforma.</strong> Ser dueño de una
          agencia no habilita este panel ni sus datos.
        </span>
      </section>
      {bootstrap && !bootstrap.initialized ? (
        <section className="platform-admin-bootstrap" role="status">
          <strong>Primer acceso global pendiente.</strong>
          <span>
            {bootstrap.state === "not_configured"
              ? "Falta definir la configuración inicial del administrador en el servidor."
              : bootstrap.state === "invalid_configuration"
                ? "La configuración inicial del administrador no tiene un formato válido."
                : bootstrap.state === "awaiting_eligible_user"
                  ? "La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia."
                  : "Estado de configuración pendiente."}
          </span>
          <small>Este diagnóstico no expone correos ni secretos.</small>
        </section>
      ) : null}
      {error ? (
        <section className="platform-admin-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <div>
            <h2>No pudimos actualizar el control global</h2>
            <p>{error}</p>
          </div>
        </section>
      ) : null}
      {busy && !state ? (
        <section className="platform-admin-state" role="status">
          <RefreshCw aria-hidden="true" />
          <div>
            <h2>Cargando control global</h2>
            <p>Reuniendo indicadores, accesos y catálogo comercial.</p>
          </div>
        </section>
      ) : null}
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
                            <button
                              type="button"
                              className="text-button platform-admin-inline-action"
                              disabled={busy}
                              onClick={() => void manageSubscription(agency)}
                            >
                              Gestionar estado manual
                            </button>
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
                    <button
                      type="button"
                      className="text-button platform-admin-inline-action"
                      disabled={busy}
                      onClick={() => void manageSubscription(agency)}
                    >
                      Gestionar estado manual
                    </button>
                  </article>
                ))
              ) : (
                <p className="platform-admin-empty">
                  No hay agencias para mostrar.
                </p>
              )}
            </div>
          </section>

          {subscriptionAgency ? (
            <section
          className="platform-admin-section platform-admin-subscription"
          role="dialog"
          aria-label={`Estado manual de ${subscriptionAgency.name}`}
        >
          <div className="platform-admin-section-heading">
            <div>
              <p className="eyebrow">ACCESO MANUAL</p>
              <h2>{subscriptionAgency.name}</h2>
            </div>
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => setSubscriptionAgency(null)}
            >
              Cerrar
            </button>
          </div>
          {!subscriptionLoaded ? (
            <p role="status">Cargando estado manual…</p>
          ) : subscription === null ? (
            <p className="form-note">
              Esta agencia no tiene una suscripción interna administrable. No se
              aplicó ningún cambio.
            </p>
          ) : (
            <form
              className="platform-admin-subscription-form"
              onSubmit={saveSubscription}
            >
              <p className="form-note">
                Este control es un override manual y auditado de acceso. No
                cobra, no guarda secretos y no confirma pagos.
              </p>
              <label>
                Estado
                <select
                  value={subscriptionState}
                  disabled={busy}
                  onChange={(event) =>
                    setSubscriptionState(
                      event.target.value as typeof subscriptionState,
                    )
                  }
                >
                  <option value="active">Acceso manual activo</option>
                  <option value="suspended">Acceso manual suspendido</option>
                  <option value="clear">Quitar estado manual</option>
                </select>
              </label>
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
            </form>
          )}
            </section>
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
              <ul className="platform-admin-list">
                {state.users.length ? (
                  state.users.map((person) => (
                    <li key={person.id}>
                      <span>
                        <b>{person.email || "Usuario sin correo"}</b>
                        <small>
                          {formatPlatformMetric(person.active_agencies)}{" "}
                          agencias activas
                        </small>
                      </span>
                      {person.platform_admin ? (
                        <StatusBadge tone="success">Admin global</StatusBadge>
                      ) : (
                        <StatusBadge>Acceso de agencia</StatusBadge>
                      )}
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
                <label>
                  Tipo
                  <select
                    value={coupon.discount_type}
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        discount_type: event.target.value as
                          "percent" | "fixed",
                      })
                    }
                  >
                    <option value="percent">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                </label>
                <label>
                  Valor
                  <input
                    value={coupon.discount_value}
                    inputMode="decimal"
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        discount_value: event.target.value,
                      })
                    }
                    required
                  />
                </label>
                {coupon.discount_type === "fixed" ? (
                  <label>
                    Moneda
                    <select
                      value={coupon.currency}
                      onChange={(event) =>
                        setCoupon({ ...coupon, currency: event.target.value })
                      }
                    >
                      <option value="USD">USD</option>
                      <option value="PYG">PYG</option>
                    </select>
                  </label>
                ) : null}
                <button className="primary" disabled={busy}>
                  Crear cupón
                </button>
              </form>
              <p className="form-note">
                Crear un cupón no inicia cobros ni activa un proveedor de pagos.
              </p>
              <ul className="platform-admin-list">
                {state.coupons.length ? (
                  state.coupons.map((item) => (
                    <li key={item.id}>
                      <span>
                        <b>{item.code || "Cupón sin código"}</b>
                        <small>
                          {item.discount_type === "percent"
                            ? `${formatPlatformMetric(item.discount_value)}%`
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
                        <button
                          type="button"
                          className="text-button"
                          disabled={busy}
                          onClick={() => void toggleCoupon(item)}
                        >
                          {item.active ? "Pausar" : "Reactivar"}
                        </button>
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
        </>
      ) : null}

    </>
  );

  return (
    <main className="platform-admin-page">
      <header className="platform-admin-header">
        <Link href="/" aria-label="Scale OS">
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
          <Link className="text-button" href="/">
            <ArrowLeft aria-hidden="true" />
            Panel
          </Link>
        </div>
      </header>
      {pageContent}
      <WorkspaceFooter />
    </main>
  );
}
