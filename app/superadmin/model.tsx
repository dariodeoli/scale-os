"use client";
// Modelo y helpers del panel global (issue #46): extraídos de superadmin/page.tsx
// sin cambios de comportamiento, para descomponer la pantalla por secciones.
import {money as formatMoney} from "../operations";

export type Overview = {
  agencies: { total: number; active: number };
  users: { total: number };
  subscriptions: { status: string; total: number }[];
  coupons: { total: number; active: number };
};
export type Agency = {
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
export type Subscription = {
  internal_state: "active" | "suspended" | null;
  internal_reason: string | null;
  internal_expires_at: string | null;
  provider_status?: string | null;
  currency?: string | null;
};
export type Person = {
  id: number;
  email: string;
  active_agencies: number;
  platform_admin: boolean;
  platform_role?: "admin" | "viewer" | null;
};
export type Coupon = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed" | "days";
  discount_value: string;
  currency: string | null;
  active: boolean;
  max_redemptions: number | null;
};
export type AuditAction = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: unknown;
  created_at: string;
  actor_email: string | null;
};
export type State = {
  overview: Overview;
  agencies: Agency[];
  users: Person[];
  coupons: Coupon[];
  audit: AuditAction[];
};
export type BootstrapStatus = {
  configured: boolean;
  valid: boolean;
  initialized: boolean;
  state:
    | "initialized"
    | "not_configured"
    | "invalid_configuration"
    | "awaiting_eligible_user";
};

export type PlatformError = Error & { status?: unknown; code?: unknown };
export function loginReturnPath() {
  if (typeof window !== "undefined" && window.location.hostname === "admin.scaleparaguay.com") return "https://app.scaleparaguay.com/";
  return "/";
}
export function appHome() {
  if (typeof window !== "undefined" && window.location.hostname === "admin.scaleparaguay.com") return "https://app.scaleparaguay.com/";
  return "/";
}

export function errorStatus(cause: unknown) {
  const status = (cause as PlatformError)?.status;
  return typeof status === "number" ? status : undefined;
}

export function errorCode(cause: unknown) {
  const code = (cause as PlatformError)?.code;
  return typeof code === "string" ? code : undefined;
}

export function formatPlatformMetric(value: unknown, fallback = "—") {
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

export function money(value: unknown, currency: unknown) {
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
    return formatMoney(amount, code);
  } catch {
    return "—";
  }
}

export function platformDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-PY", { dateStyle: "medium", timeZone: "America/Asuncion" }).format(date)
    : "—";
}

export function subscriptionSummary(rows: unknown) {
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

export function manualAccessLabel(agency: Agency) {
  if (agency.internal_subscription_state === "active")
    return "Acceso manual activo";
  if (agency.internal_subscription_state === "suspended")
    return "Acceso manual suspendido";
  return "Sin cambio manual";
}

export function StatusBadge({
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

/** Clave estable por apertura del diálogo: un reintento del mismo extend no duplica días. */
export function newExtendKey(){
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `extend-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
