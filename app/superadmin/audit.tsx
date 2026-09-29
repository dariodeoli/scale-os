"use client";
// Auditoría global (issue #46): lista densa v2 del panel del sistema (#80).
// El API no devuelve `before_state`/`after_state` (deuda registrada): solo se
// muestran fecha, actor, acción, destino y los metadatos disponibles.
import {useMemo, useState} from "react";
import {SearchField, Select} from "owncoding-ui";
import {listDateFull} from "../list-format";
import {EmptyBlock, FilterToolbar, ListGrid, ListRow, StateChip, type Column} from "../ui-v2";
import {formatPlatformMetric, type AuditAction} from "./model";

const TEMPLATE = "grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]";
const COLUMNS: Column[] = [{key: "date", label: "Fecha"}, {key: "actor", label: "Actor"}, {key: "action", label: "Acción"}, {key: "target", label: "Destino"}];

export function PlatformAudit({audit}: {audit: AuditAction[]}) {
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  // Tipos de acción presentes en lo cargado: filtro real, sin taxonomía inventada.
  const actions = useMemo(() => Array.from(new Set(audit.map((entry) => entry.action))).sort(), [audit]);
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return audit.filter((entry) => {
      if (action && entry.action !== action) return false;
      if (!text) return true;
      return `${entry.actor_email || ""} ${entry.action} ${entry.target_type} ${entry.target_id}`.toLowerCase().includes(text);
    });
  }, [audit, query, action]);
  return <section className="panel" aria-labelledby="platform-audit-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <div className="flex min-w-0 items-center gap-2">
        <h2 id="platform-audit-title" className="text-[15px] font-semibold tracking-tight text-fore">Actividad de administración global</h2>
        <StateChip tone="mute" title="Acciones cargadas">{formatPlatformMetric(audit.length)}</StateChip>
      </div>
      <small className="text-[12px] leading-[1.35] text-mute">Cada operación sensible queda registrada con actor, acción y destino</small>
    </div>
    <FilterToolbar summary={`${visible.length} de ${audit.length}`}>
      <SearchField className="min-w-[12rem] flex-1 sm:max-w-72" type="search" ariaLabel="Buscar en la auditoría" value={query} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Actor, acción o destino"/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Acción
        <Select aria-label="Filtrar por acción" value={action} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setAction(event.target.value)} className="min-w-[13rem]">
          <option value="">Todas las acciones</option>
          {actions.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
      </label>
      {(query || action) ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => {setQuery(""); setAction("");}}>Limpiar filtros</button> : null}
    </FilterToolbar>
    {visible.length ? (
      <ListGrid label="Actividad de administración global" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[49.5rem]">
        {visible.map((entry) => <ListRow key={entry.id} template={TEMPLATE}>
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
        compact
        icon="report"
        title={audit.length ? "Sin acciones que coincidan con el filtro." : "Sin acciones registradas."}
        description={audit.length ? "Probá con otro actor, acción o texto." : "Las operaciones sensibles de la plataforma quedan acá con su actor, su acción y el destino."}
      />
    )}
  </section>;
}
