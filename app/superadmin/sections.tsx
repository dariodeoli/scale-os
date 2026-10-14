"use client";
// Navegación del panel global (guía §2/§7): UNA lista exportada. Cada módulo del
// panel (Comunicados, Mantenimiento, Errores, Reportes, …) se suma con UNA entrada
// `{id, label, icon, component}`; el shell (sidebar, barra superior, deep link
// `?vista=<id>`, chips de período y contadores) sale de esta lista sin tocar page.tsx.
//
// Contrato para un módulo nuevo:
//  - `component` recibe `PlatformSectionProps` (permiso real, período compartido,
//    manejo de errores del panel y navegación). Sus datos los pide al API (siempre
//    detrás del guard de backend/platform-router.js), nunca los trae precargados.
//  - `count` (si corresponde) devuelve el número del badge; `usesPeriod` muestra los chips
//    de período compartidos; `aliases` agrega ids de deep link; `href` hace de la
//    entrada un enlace a otra ruta (sin componente).
import type {ComponentType, FormEvent} from "react";
import {BarChart3, Bug, Building2, LayoutDashboard, Mail, MessageSquareWarning, Radar, ScrollText, ShieldCheck, Tag, type LucideIcon} from "lucide-react";
import type {Agency, BootstrapStatus, CollectionPage, ConfirmRequest, Coupon, CouponDraft, InquiryCounts, Person, PlatformView, State} from "./model";
import type {PlatformPeriodId} from "./period";
import {PlatformOverview} from "./overview";
import {PlatformInquiries} from "./inquiries";
import {PlatformAgencies} from "./agencies";
import {PlatformAccess} from "./access";
import {PlatformCatalog} from "./catalog";
import {PlatformAudit} from "./audit";
import {PlatformUsage} from "./usage";
import {PlatformErrors} from "./errors";
import {PlatformReports} from "./reports";

/** Acciones del panel que viven en page.tsx (agencias, cupones, accesos). */
export type PlatformAdminActions = {
  loadMore: (kind: keyof State["pages"]) => void;
  setConfirming: (request: ConfirmRequest) => void;
  manageSubscription: (agency: Agency) => Promise<void>;
  applyCoupon: (agency: Agency) => void;
  coupon: CouponDraft;
  setCoupon: (draft: CouponDraft) => void;
  toggleCoupon: (item: Coupon) => Promise<void>;
  createCoupon: (event: FormEvent) => Promise<void>;
  selfRow: (person: Person) => boolean;
  setPlatformAccess: (person: Person, access: "admin" | "viewer" | "none") => Promise<void>;
};

export type PlatformSectionProps = {
  state: State;
  busy: boolean;
  /** Rol real del API: solo `admin` ve controles mutantes (viewer nunca). */
  writable: boolean;
  /** Período compartido por Resumen y Uso (chips de la barra superior). */
  period: PlatformPeriodId;
  bootstrap: BootstrapStatus | null;
  inquiryCounts: InquiryCounts | null;
  setInquiryCounts: (counts: InquiryCounts) => void;
  onGoTo: (view: PlatformView) => void;
  /** Delega 401/403/404 al gate del panel; devuelve true si lo manejó. */
  onError: (cause: unknown) => boolean;
  actions: PlatformAdminActions;
};

export type PlatformSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  component?: ComponentType<PlatformSectionProps>;
  /** Título de la barra superior (por defecto, `label`). */
  title?: string;
  aliases?: string[];
  usesPeriod?: boolean;
  count?: (props: PlatformSectionProps) => number | undefined;
  /** El badge pide atención (p. ej. consultas nuevas), no es solo un total. */
  attention?: boolean;
  /** Entrada que navega a otra ruta del panel en vez de montar un componente. */
  href?: string;
};

const page = (pages: CollectionPage | undefined, loaded: number | undefined) => pages ? pages.total : loaded;

// Orden aprobado (#155 B): personas (Accesos) antes que catálogo (Cupones).
export const PLATFORM_SECTIONS: PlatformSection[] = [
  {id: "resumen", label: "Resumen", icon: LayoutDashboard, usesPeriod: true, title: "Resumen de la plataforma",
    component: (p) => <PlatformOverview state={p.state} audit={p.state.audit} onGoTo={p.onGoTo} bootstrap={p.bootstrap} period={p.period} onError={p.onError}/>},
  {id: "consultas", label: "Consultas", icon: Mail, attention: true, title: "Consultas de la landing",
    count: (p) => p.inquiryCounts?.new ? p.inquiryCounts.new : undefined,
    component: (p) => <PlatformInquiries writable={p.writable} onError={p.onError} onCounts={p.setInquiryCounts}/>},
  {id: "agencias", label: "Agencias", icon: Building2, title: "Agencias y suscripciones",
    count: (p) => page(p.state.pages?.agencies, p.state.agencies.length),
    component: (p) => <PlatformAgencies busy={p.busy} state={p.state} page={p.state.pages.agencies} onMore={() => p.actions.loadMore("agencies")} writable={p.writable} setConfirming={p.actions.setConfirming} manageSubscription={p.actions.manageSubscription} applyCoupon={p.actions.applyCoupon}/>},
  {id: "accesos", label: "Accesos", icon: ShieldCheck, title: "Accesos entre agencias",
    count: (p) => page(p.state.pages?.users, p.state.users.length),
    component: (p) => <PlatformAccess busy={p.busy} state={p.state} page={p.state.pages.users} onMore={() => p.actions.loadMore("users")} writable={p.writable} setConfirming={p.actions.setConfirming} selfRow={p.actions.selfRow} setPlatformAccess={p.actions.setPlatformAccess}/>},
  {id: "cupones", label: "Cupones", icon: Tag, title: "Cupones y gracia",
    count: (p) => page(p.state.pages?.coupons, p.state.coupons.length),
    component: (p) => <PlatformCatalog busy={p.busy} state={p.state} page={p.state.pages.coupons} onMore={() => p.actions.loadMore("coupons")} writable={p.writable} coupon={p.actions.coupon} setCoupon={p.actions.setCoupon} toggleCoupon={p.actions.toggleCoupon} createCoupon={p.actions.createCoupon}/>},
  {id: "auditoria", label: "Auditoría", icon: ScrollText, title: "Auditoría global",
    count: (p) => page(p.state.pages?.audit, p.state.audit.length),
    component: (p) => <PlatformAudit audit={p.state.audit} page={p.state.pages.audit} busy={p.busy} onMore={() => p.actions.loadMore("audit")}/>},
  // «Actividad» es un alias: Uso ya cubre actividad diaria, por hora y por agencia.
  {id: "uso", label: "Uso", icon: BarChart3, aliases: ["actividad"], usesPeriod: true, title: "Uso y actividad",
    component: (p) => <PlatformUsage period={p.period} onError={p.onError}/>},
  // Errores del API y la web agrupados por huella (sin PII) y «Reportar un problema».
  {id: "errores", label: "Errores", icon: Bug, title: "Errores de la plataforma",
    component: (p) => <PlatformErrors writable={p.writable} onError={p.onError}/>},
  {id: "reportes", label: "Reportes", icon: MessageSquareWarning, title: "Reportes de usuarios",
    component: (p) => <PlatformReports writable={p.writable} onError={p.onError}/>},
  // Tráfico y demos (rama superadmin-analitica): la actividad demo vive SOLO ahí,
  // nunca en los KPIs, tablas ni gráficos de las demás secciones.
  {id: "trafico", label: "Tráfico y demos", icon: Radar, href: "/superadmin/trafico"},
];

/** Ids válidos de deep link (`?vista=`), alias incluidos. */
export function resolveSection(requested: string | null | undefined, sections: PlatformSection[] = PLATFORM_SECTIONS): PlatformSection {
  const mountable = sections.filter((item) => item.component);
  const value = (requested || "").trim().toLowerCase();
  return mountable.find((item) => item.id === value || item.aliases?.includes(value)) || mountable[0];
}

