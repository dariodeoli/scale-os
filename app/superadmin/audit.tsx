"use client";
// Auditoría global (issue #46): extraída de superadmin/page.tsx en la lista v2.
// El API no devuelve `before_state`/`after_state` (deuda registrada): solo se
// muestran fecha, actor, acción, destino y los metadatos disponibles.
import {listDateFull} from "../list-format";
import {StateChip} from "../ui-v2";
import {formatPlatformMetric, type AuditAction} from "./model";

const TEMPLATE = "grid-cols-[11rem_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(12rem,1.4fr)]";
const COLUMNS = [{key: "date", label: "Fecha"}, {key: "actor", label: "Actor"}, {key: "action", label: "Acción"}, {key: "target", label: "Destino"}];

export function PlatformAudit({audit}: {audit: AuditAction[]}) {
  return <section className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-5" aria-labelledby="platform-audit-title">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Auditoría</p>
        <h2 id="platform-audit-title" className="mt-1 text-[17px] font-semibold tracking-tight text-fore">Actividad de administración global</h2>
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-mute">{formatPlatformMetric(audit.length)} acciones recientes</span>
    </div>
    <div role="table" aria-label="Actividad de administración global" className="silent-scroll min-w-0 overflow-x-auto">
      <div className="min-w-[52rem]">
        <div role="row" className={`grid gap-x-2 border-b border-ink-600 px-1 pb-2 text-[10px] font-bold uppercase tracking-[.06em] text-mute ${TEMPLATE}`}>
          {COLUMNS.map((column, index) => <span key={column.key} role="columnheader" className={`whitespace-nowrap ${index === COLUMNS.length - 1 ? "text-left" : ""}`}>{column.label}</span>)}
        </div>
        <div role="rowgroup">
          {audit.length ? audit.map((entry) => <div role="row" key={entry.id} className={`grid min-h-11 items-center gap-x-2 border-b border-ink-600/60 px-1 py-1.5 last:border-0 ${TEMPLATE}`}>
            <span className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{listDateFull(entry.created_at)}</span>
            <span className="min-w-0 break-words text-[12.5px] text-fore">{entry.actor_email || "Sistema"}</span>
            <span className="min-w-0"><StateChip tone="info" title={entry.action}>{entry.action}</StateChip></span>
            <div className="min-w-0">
              <span className="block break-words text-[12.5px] text-fore">{entry.target_type}{entry.target_id ? ` #${formatPlatformMetric(entry.target_id)}` : ""}</span>
              {entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) && Object.keys(entry.metadata as object).length ? <small className="mt-1 block break-words text-[11px] text-mute" title={JSON.stringify(entry.metadata)}>{JSON.stringify(entry.metadata).slice(0, 160)}</small> : null}
            </div>
          </div>) : <p role="row" className="px-1 py-3 text-xs text-mute">Sin acciones registradas.</p>}
        </div>
      </div>
    </div>
  </section>;
}
