"use client";
// Modelo y helpers del panel global (issue #46): extraídos de superadmin/page.tsx
// sin cambios de comportamiento, para descomponer la pantalla por secciones.
import {fechaDia} from "owncoding-ui/core";
import {appOrigin} from "../brand-metadata";
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
  /** Propietario/administrador principal (solo nombre, correo y foto; #189). */
  owner_name?: string | null;
  owner_email?: string | null;
  owner_photo_url?: string | null;
  extra_admins?: number;
  /** Logo de la agencia (data:/https, solo si pesa menos de 300 KB). */
  logo_url?: string | null;
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
  /** Identidad visible y agencias (máx. 3) a las que pertenece (#189). */
  full_name?: string | null;
  photo_url?: string | null;
  agency_names?: string[] | null;
};
export type Coupon = {
  id: number;
  code: string;
  discount_type: "percent" | "fixed" | "days";
  discount_value: string;
  currency: string | null;
  active: boolean;
  max_redemptions: number | null;
  expires_at?: string | null;
  organization_id?: number | string | null;
  organization_name?: string | null;
  note?: string | null;
  redemptions?: number;
  expired?: boolean;
};

/** Estado visible del cupón: pausado manualmente, vencido o vigente (#189). */
export function couponStatus(item: Coupon): { label: "Vigente" | "Vencido" | "Pausado"; tone: "ok" | "warn" | "mute" } {
  if (!item.active) return { label: "Pausado", tone: "mute" };
  if (item.expired) return { label: "Vencido", tone: "warn" };
  return { label: "Vigente", tone: "ok" };
}

/** Usos del cupón como «n/max» (∞ sin límite). */
export function couponUses(item: Coupon) {
  return `${formatPlatformMetric(item.redemptions ?? 0)}/${item.max_redemptions === null ? "∞" : formatPlatformMetric(item.max_redemptions)}`;
}
export type AuditAction = {
  id: string;
  action: string;
  target_type: string;
  target_id: string;
  metadata: unknown;
  created_at: string;
  actor_email: string | null;
};
export type CollectionPage = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};
export type State = {
  overview: Overview;
  agencies: Agency[];
  users: Person[];
  coupons: Coupon[];
  audit: AuditAction[];
  /** Ventana de cada lista (#106): contador honesto y "Ver más" por colección. */
  pages: {
    agencies: CollectionPage;
    users: CollectionPage;
    coupons: CollectionPage;
    audit: CollectionPage;
  };
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

/**
 * Origen absoluto del panel de la app (env > origen de producción).
 * El admin y la app son el mismo build servido en hosts distintos, así que la
 * resolución no puede depender de `window`: en SSR el link «Panel» caía en `/`,
 * que el middleware del host admin reescribe a `/superadmin` (bucle silencioso).
 */
const APP_HOME = `${(process.env.NEXT_PUBLIC_APP_ORIGIN || appOrigin).replace(/\/+$/, "")}/`;

/** Destino del link «Panel» (brand, header y «Volver al panel»): igual en SSR y cliente. */
export function appHome() {
  // En desarrollo queda relativo para no saltar al host de producción.
  return process.env.NODE_ENV === "production" ? APP_HOME : "/";
}

/** Retorno del login del panel: el mismo destino determinista que «Panel». */
export function loginReturnPath() {
  return appHome();
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
  // Fecha de calendario en la zona de la empresa (util compartida, v0.39).
  return fechaDia(value, "—", { timeZone: "America/Asuncion" });
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

/** Tono del chip de acceso manual: un solo chip (`StateChip`), sin variantes. */
export function manualAccessTone(agency: Agency): "ok" | "warn" | "info" | "mute" {
  if (agency.internal_subscription_state === "active") return "info";
  if (agency.internal_subscription_state === "suspended") return "warn";
  return "mute";
}

/** Clave estable por apertura del diálogo: un reintento del mismo extend no duplica días. */
export function newExtendKey(){
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `extend-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type ConfirmRequest = { kind: "user"; person: Person } | { kind: "agency"; agency: Agency } | null;

/** Id de una sección del panel (lista única en `sections.tsx`). */
export type PlatformView = string;
/** Aviso de acceso separado (antes, una fila propia del panel): vive en el tooltip del permiso. */
/** Respuesta única del guard del API a quien no es admin global (backend/platform-admin.js). */
export const PLATFORM_GATE_MESSAGE = "No encontrado.";
export const PLATFORM_ACCESS_NOTE = "Acceso separado por plataforma: ser dueño de una agencia no habilita este panel ni sus datos.";

/** Contrato de `GET /api/platform/inquiries`: consultas de la landing («¿Tenés alguna duda?»). */
export type InquiryStatus = "new" | "contacted" | "closed";
export type Inquiry = {
  id: number | string;
  name: string;
  company: string;
  email: string;
  whatsapp: string | null;
  message: string;
  consent: boolean;
  source: string;
  source_url: string | null;
  status: InquiryStatus;
  note: string | null;
  handled_at: string | null;
  handled_by_email: string | null;
  created_at: string;
};
export type InquiryCounts = Record<InquiryStatus, number>;
export type InquiryPage = {inquiries: Inquiry[]; total: number; hasMore: boolean; limit: number; offset: number; counts: InquiryCounts};

/** Contrato de `GET /api/platform/errors`: errores del API y de la web agrupados por huella (sin PII). */
export type ErrorStatus = "new" | "resolved" | "ignored";
export type ErrorSource = "api" | "web";
export type ErrorGroup = {
  id: number | string;
  source: ErrorSource;
  message: string;
  route: string | null;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  status: ErrorStatus;
  resolved_at: string | null;
  resolved_by_email: string | null;
  sample_stack?: string | null;
  sample_meta?: Record<string, string | number>;
};
export type ErrorCounts = Record<ErrorStatus, number>;
export type ErrorPage = {errors: ErrorGroup[]; total: number; hasMore: boolean; limit: number; offset: number; counts: ErrorCounts; last24h: {groups: number; new_groups: number}};

/** Contrato de `GET /api/platform/reports`: «Reportar un problema» de los usuarios. */
export type ReportStatus = "new" | "in_progress" | "resolved";
export type UserReport = {
  id: number | string;
  category: "error" | "datos" | "lentitud" | "sugerencia" | "otro";
  message: string;
  route: string | null;
  app_version: string | null;
  status: ReportStatus;
  note: string | null;
  handled_at: string | null;
  handled_by_email: string | null;
  created_at: string;
  organization_name: string | null;
  user_email: string | null;
  user_name: string | null;
};
export type ReportCounts = Record<ReportStatus, number>;
export type ReportPage = {reports: UserReport[]; total: number; hasMore: boolean; limit: number; offset: number; counts: ReportCounts};

/** Contrato de `GET /api/platform/usage` (#191): solo presencia y altas, sin datos financieros. */
export type UsagePerson = { name: string; avatar_url: string | null; email: string };
export type UsagePayload = {
  range: { from: string; to: string; days: number; previous_from: string; previous_to: string; timezone: string };
  totals: { unique_users: number; recurring_users: number; sessions: number; previous_unique_users: number; previous_sessions?: number; previous_recurring_users?: number; active_now: number };
  daily: { day: string; users: number; sessions: number; recurring?: number; previous_day: string | null; previous_users: number; previous_sessions?: number }[];
  /** La fuente tiene filas reales (si no, «Sin datos todavía» en vez de ceros). */
  has_data?: { sessions: boolean; users: boolean };
  signups: { day: string; users: number; agencies: number }[];
  hourly: { hour: number; users: number }[];
  monthly: { month: string; signups: number; active_users: number }[];
  agencies: { id: number | string; name: string; logo_url?: string | null; active7: number; active30: number; sessions: number; last_seen_at: string | null; owner: UsagePerson | null }[];
  users: { id: number | string; name: string; avatar_url: string | null; email: string; agency: string; last_seen_at: string | null; sessions: number }[];
};

/** Hora de Asunción en 24 h para el chip «Actualizado» del encabezado. */
export function platformTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PY", {timeZone: "America/Asuncion", hour: "2-digit", minute: "2-digit", hourCycle: "h23"}).format(date);
}

/** Vencimiento visible del registro: manual, prueba o facturación. */
export function agencyExpiry(agency: Agency) {
  return agency.internal_subscription_expires_at || agency.trial_ends_at || agency.due_at;
}

/** Agencias que piden atención: vencidas o dentro de los próximos `days` días. */
export function expiringAgencies(agencies: Agency[], days = 7) {
  const limit = Date.now() + days * 86_400_000;
  return agencies
    .flatMap((agency) => {
      const expiry = agencyExpiry(agency);
      const time = expiry ? new Date(expiry).getTime() : Number.NaN;
      return Number.isFinite(time) && time <= limit ? [{agency, expiry: expiry as string, time}] : [];
    })
    .sort((a, b) => a.time - b.time);
}
export type CouponDraft = { code: string; discount_value: string; discount_type: "percent" | "fixed" | "days"; currency: string; expires_at: string; organization_id: string; note: string };

/** Clave de sesión donde se guarda la eliminación pendiente durante la ida a Google. */
export const PLATFORM_GOOGLE_STORAGE_KEY = "scale.platform.recent-auth-google";
/** Palabra corta que confirma una eliminación global (la re-autenticación es el control real). */
export const PLATFORM_DELETE_WORD = "ELIMINAR";

/** Contrato de `GET /api/platform/metrics`: indicadores del Resumen, sin demos. */
export type PlatformMetric = { value: number; previous: number; series: number[]; has_data: boolean };
export type PlatformMetricsPayload = {
  range: UsagePayload["range"];
  days: string[];
  kpis: Record<"agencies" | "users" | "active_users" | "sessions" | "inquiries" | "redemptions", PlatformMetric>;
};
