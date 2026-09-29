"use client";
// Vista «Resumen» del panel global (#102): indicadores compactos, señales de
// estado y dos listas operativas derivadas de los datos ya cargados (sin
// endpoints nuevos): agencias por vencer y últimas acciones auditadas.
import {ArrowRight} from "lucide-react";
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
  type PlatformView,
  type State,
} from "./model";

const ROW = "flex min-w-0 items-center justify-between gap-3 border-b border-ink-600/60 py-2 last:border-0";

export function PlatformOverview({state, audit, onGoTo}: {state: State; audit: AuditAction[]; onGoTo: (view: PlatformView) => void}) {
  const subscriptions = state.overview.subscriptions || [];
  const activeSubscriptions = subscriptions.find((row) => row.status === "active")?.total ?? null;
  const expiring = expiringAgencies(state.agencies).slice(0, 6);
  const recent = audit.slice(0, 6);
  return <div className="grid min-w-0 gap-4">
    <KpiStrip aria-label="Resumen de plataforma">
      <Kpi label="Agencias activas" valor={state.overview.agencies?.active} hint={`de ${formatPlatformMetric(state.overview.agencies?.total)} agencias`} destacado/>
      <Kpi label="Usuarios registrados" valor={state.overview.users?.total} hint="Cuentas de todas las agencias"/>
      <Kpi label="Cupones activos" valor={state.overview.coupons?.active} hint={`de ${formatPlatformMetric(state.overview.coupons?.total)} códigos`}/>
      <Kpi label="Suscripciones" valor={activeSubscriptions} hint={subscriptionSummary(subscriptions)}/>
    </KpiStrip>

    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
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
    </div>

  </div>;
}
