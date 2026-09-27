"use client";
// Auditoría global (issue #46): lista densa v2 del panel del sistema (#80).
// El API no devuelve `before_state`/`after_state` (deuda registrada): solo se
// muestran fecha, actor, acción, destino y los metadatos disponibles.
import {listDateFull} from "../list-format";
import {EmptyBlock, ListGrid, ListRow, StateChip, type Column} from "../ui-v2";
import {formatPlatformMetric, type AuditAction} from "./model";

const TEMPLATE = "grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]";
const COLUMNS: Column[] = [{key: "date", label: "Fecha"}, {key: "actor", label: "Actor"}, {key: "action", label: "Acción"}, {key: "target", label: "Destino"}];

export function PlatformAudit({audit}: {audit: AuditAction[]}) {
  return <section className="panel" aria-labelledby="platform-audit-title">
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <p className="eyebrow">Auditoría</p>
        <h2 id="platform-audit-title" className="text-[17px] font-semibold tracking-tight text-fore">Actividad de administración global</h2>
      </div>
      <span className="whitespace-nowrap text-xs tabular-nums text-mute">{formatPlatformMetric(audit.length)} acciones recientes</span>
    </div>
    {audit.length ? (
      <ListGrid label="Actividad de administración global" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[49.5rem]">
        {audit.map((entry) => <ListRow key={entry.id} template={TEMPLATE}>
          <span role="cell" className="whitespace-nowrap text-[11.5px] tabular-nums text-mute">{listDateFull(entry.created_at) || "—"}</span>
          <span role="cell" className="min-w-0 truncate text-[12.5px] text-fore" title={entry.actor_email || "Sistema"}>{entry.actor_email || "Sistema"}</span>
          <span role="cell" className="min-w-0"><StateChip tone="info" title={entry.action}>{entry.action}</StateChip></span>
          <div role="cell" className="min-w-0">
            <span className="block break-words text-[12.5px] text-fore">{entry.target_type}{entry.target_id ? ` #${formatPlatformMetric(entry.target_id)}` : ""}</span>
            {entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) && Object.keys(entry.metadata as object).length ? <small className="mt-1 block truncate text-[11px] text-mute" title={JSON.stringify(entry.metadata)}>{JSON.stringify(entry.metadata).slice(0, 160)}</small> : null}
          </div>
        </ListRow>)}
      </ListGrid>
    ) : (
      <EmptyBlock
        icon="report"
        title="Sin acciones registradas."
        description="Las operaciones sensibles de la plataforma quedan acá con su actor, su acción y el destino."
      />
    )}
  </section>;
}
