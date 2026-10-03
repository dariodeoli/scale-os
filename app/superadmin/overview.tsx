"use client";
// Vista «Resumen» del panel global (#102, rediseño #155 fase 2): indicadores
// compactos, tres paneles operativos (por vencer, últimas acciones y
// suscripciones) y un riel de atención/atajos que aprovecha el ancho de 1440.
// Todo sale de los datos ya cargados: sin endpoints nuevos.
import {ArrowRight, Building2, ScrollText, ShieldCheck, Tag} from "lucide-react";
import {dueTone, listDateShort} from "../list-format";
import {Kpi, KpiStrip, StateChip} from "../ui-v2";
import {
  expiringAgencies,
  formatPlatformMetric,
  manualAccessLabel,
  manualAccessTone,
  platformDate,
  subscriptionSummary,
  type AuditAction,
  type BootstrapStatus,
  type PlatformView,
  type State,
} from "./model";

const ROW = "flex min-w-0 items-center justify-between gap-3 border-b border-ink-600/60 py-2 last:border-0";

type Attention = {id: string; label: string; detail: string; view: PlatformView; tone: "warn" | "bad" | "info"};

/** Señales de atención derivadas de lo ya cargado (sin endpoints nuevos). */
export function platformAttention(state: State, bootstrap: BootstrapStatus | null): Attention[] {
  const rows: Attention[] = [];
  if (bootstrap && !bootstrap.initialized) {
    rows.push({id: "bootstrap", label: "Primer acceso global pendiente", detail: "Revisá la configuración del administrador", view: "resumen", tone: "warn"});
  }
  const suspended = state.agencies.filter((agency) => agency.internal_subscription_state === "suspended").length;
  if (suspended) {
    rows.push({id: "suspended", label: `${formatPlatformMetric(suspended)} ${suspended === 1 ? "agencia" : "agencias"} con acceso suspendido`, detail: "Revisá el estado manual", view: "agencias", tone: "bad"});
  }
  const expiring = expiringAgencies(state.agencies).length;
  if (expiring) {
    rows.push({id: "expiring", label: `${formatPlatformMetric(expiring)} ${expiring === 1 ? "agencia vence" : "agencias vencen"} en 7 días`, detail: "Prueba o facturación", view: "agencias", tone: "warn"});
  }
  const pendingSubscriptions = (state.overview.subscriptions || [])
    .filter((row) => row.status !== "active")
    .reduce((total, row) => total + (Number(row.total) || 0), 0);
  if (pendingSubscriptions) {
    rows.push({id: "subscriptions", label: `${formatPlatformMetric(pendingSubscriptions)} suscripciones fuera de «active»`, detail: "Seguimiento de cobro", view: "agencias", tone: "info"});
  }
  return rows;
}

const SHORTCUTS: {id: string; label: string; detail: string; view: PlatformView; icon: typeof Building2}[] = [
  {id: "agencies", label: "Gestionar agencias", detail: "Estado manual, plan y vencimiento", view: "agencias", icon: Building2},
  {id: "coupons", label: "Crear cupón", detail: "Código, tipo y valor", view: "cupones", icon: Tag},
  {id: "access", label: "Revisar accesos", detail: "Roles globales y límites", view: "accesos", icon: ShieldCheck},
  {id: "audit", label: "Ver auditoría", detail: "Últimas operaciones sensibles", view: "auditoria", icon: ScrollText},
];

export function PlatformOverview({state, audit, onGoTo, bootstrap = null}: {state: State; audit: AuditAction[]; onGoTo: (view: PlatformView) => void; bootstrap?: BootstrapStatus | null}) {
  const subscriptions = state.overview.subscriptions || [];
  const activeSubscriptions = subscriptions.find((row) => row.status === "active")?.total ?? null;
  const expiring = expiringAgencies(state.agencies).slice(0, 6);
  const recent = audit.slice(0, 6);
  const attention = platformAttention(state, bootstrap);
  return <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="grid min-w-0 gap-4">
      <KpiStrip aria-label="Resumen de plataforma">
        <Kpi label="Agencias activas" valor={state.overview.agencies?.active} hint={`de ${formatPlatformMetric(state.overview.agencies?.total)} agencias`} destacado/>
        <Kpi label="Usuarios registrados" valor={state.overview.users?.total} hint="Cuentas de todas las agencias"/>
        <Kpi label="Cupones activos" valor={state.overview.coupons?.active} hint={`de ${formatPlatformMetric(state.overview.coupons?.total)} códigos`}/>
        <Kpi label="Suscripciones" valor={activeSubscriptions} hint={subscriptionSummary(subscriptions)}/>
      </KpiStrip>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <section className="panel" aria-labelledby="platform-expiring-title">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
            <h2 id="platform-expiring-title" className="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Agencias por vencer</h2>
            <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => onGoTo("agencias")}>Ver agencias<ArrowRight size={14} aria-hidden="true"/></button>
          </div>
          {expiring.length ? <div>{expiring.map(({agency, expiry}) => <div className={ROW} key={agency.id}>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-semibold text-fore" title={agency.name || "Agencia sin nombre"}>{agency.name || "Agencia sin nombre"}</b>
              <small className="block truncate text-[11px] text-mute" title={agency.slug || "Sin identificador"}>{agency.slug || "Sin identificador"}</small>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <StateChip tone={manualAccessTone(agency)}>{manualAccessLabel(agency)}</StateChip>
              <span className="list-date text-[12px] tabular-nums" data-tone={dueTone(expiry) || undefined} title={`Vence ${platformDate(expiry)}`}>{listDateShort(expiry) || "—"}</span>
            </span>
          </div>)}</div> : <p className="py-3 text-xs text-mute">Sin vencimientos en los próximos 7 días.</p>}
        </section>

        <section className="panel" aria-labelledby="platform-recent-title">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
            <h2 id="platform-recent-title" className="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Últimas acciones</h2>
            <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => onGoTo("auditoria")}>Ver auditoría<ArrowRight size={14} aria-hidden="true"/></button>
          </div>
          {recent.length ? <div>{recent.map((entry) => <div className={ROW} key={entry.id}>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-semibold text-fore" title={entry.actor_email || "Sistema"}>{entry.actor_email || "Sistema"}</b>
              <small className="block truncate text-[11px] text-mute" title={`${entry.action} · ${entry.target_type}${entry.target_id ? ` #${entry.target_id}` : ""}`}>{entry.target_type}{entry.target_id ? ` #${formatPlatformMetric(entry.target_id)}` : ""}</small>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <StateChip tone="info" title={entry.action}>{entry.action}</StateChip>
              <span className="list-date text-[12px] tabular-nums" title={platformDate(entry.created_at)}>{listDateShort(entry.created_at) || "—"}</span>
            </span>
          </div>)}</div> : <p className="py-3 text-xs text-mute">Sin acciones registradas.</p>}
        </section>

        <section className="panel" aria-labelledby="platform-subscriptions-title">
          <div className="mb-2 flex min-w-0 items-center justify-between gap-3">
            <h2 id="platform-subscriptions-title" className="min-w-0 text-[15px] font-semibold tracking-tight text-fore">Suscripciones por estado</h2>
            <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => onGoTo("agencias")}>Ver agencias<ArrowRight size={14} aria-hidden="true"/></button>
          </div>
          {subscriptions.length ? <div>{subscriptions.map((row) => <div className={ROW} key={row.status}>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-semibold text-fore" title={row.status}>{row.status || "Sin estado"}</b>
              <small className="block text-[11px] text-mute">Estado informado por la plataforma</small>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-fore">{formatPlatformMetric(row.total)}</span>
          </div>)}</div> : <p className="py-3 text-xs text-mute">Sin datos de suscripciones.</p>}
        </section>
      </div>
    </div>

    <aside className="grid min-w-0 content-start gap-4" aria-label="Requiere tu atención">
      <section className="panel" aria-labelledby="platform-attention-title">
        <h2 id="platform-attention-title" className="mb-2 text-[15px] font-semibold tracking-tight text-fore">Requiere tu atención</h2>
        {attention.length ? <div>{attention.map((row) => <button key={row.id} type="button" className="flex w-full min-w-0 items-start justify-between gap-3 border-b border-ink-600/60 py-2.5 text-left transition last:border-0 hover:bg-ink-700/40" onClick={() => onGoTo(row.view)}>
          <span className="min-w-0">
            <b className="block text-[13px] font-semibold leading-snug text-fore">{row.label}</b>
            <small className="mt-0.5 block text-[11px] text-mute">{row.detail}</small>
          </span>
          <StateChip tone={row.tone === "bad" ? "bad" : row.tone === "warn" ? "warn" : "info"}>{row.tone === "bad" ? "Revisar" : row.tone === "warn" ? "Atender" : "Seguir"}</StateChip>
        </button>)}</div> : <p className="py-2 text-xs text-mute" role="status">Nada pendiente por ahora.</p>}
      </section>

      <section className="panel" aria-labelledby="platform-shortcuts-title">
        <h2 id="platform-shortcuts-title" className="mb-2 text-[15px] font-semibold tracking-tight text-fore">Atajos</h2>
        <div className="grid gap-1.5">
          {SHORTCUTS.map((item) => <button key={item.id} type="button" className="flex min-h-11 items-center gap-3 rounded-lg border border-ink-600 px-3 py-2 text-left transition hover:border-fono hover:bg-fono/10" onClick={() => onGoTo(item.view)}>
            <item.icon size={16} className="shrink-0 text-fono" aria-hidden="true"/>
            <span className="min-w-0">
              <b className="block truncate text-[13px] font-semibold text-fore">{item.label}</b>
              <small className="block truncate text-[11px] text-mute">{item.detail}</small>
            </span>
          </button>)}
        </div>
      </section>
    </aside>
  </div>;
}
