"use client";
import {OptionsSelect as Select} from '../ui/options-select';
// Auditoría global (issue #46): lista densa v2 del panel del sistema (#80).
// El API no devuelve `before_state`/`after_state` (deuda registrada): solo se
// muestran fecha, actor, acción, destino y los metadatos disponibles.
import {useMemo, useState} from "react";

import {SearchField} from '../search-field';
import {listDateFull} from "../list-format";
import {EmptyBlock, FilterToolbar, ListGrid, ListRow, StateChip, denseTableMinWidth, useDenseTableFit, type Column} from "../ui-v2";
import {formatPlatformMetric, type AuditAction, type CollectionPage} from "./model";
import {PlatformMore} from "./states";

const TEMPLATE = "grid-cols-[9.5rem_minmax(9rem,1fr)_17rem_minmax(12rem,1.4fr)]";
const MIN_WIDTH = denseTableMinWidth(47.5, 4);
const auditTarget = (entry: AuditAction) => `${entry.target_type}${entry.target_id ? ` #${formatPlatformMetric(entry.target_id)}` : ""}`;
/** Metadatos reales del registro en una línea (vacío si no hay). */
const auditMeta = (entry: AuditAction) => entry.metadata && typeof entry.metadata === "object" && !Array.isArray(entry.metadata) && Object.keys(entry.metadata as object).length ? JSON.stringify(entry.metadata) : "";
const COLUMNS: Column[] = [{key: "date", label: "Fecha"}, {key: "actor", label: "Actor"}, {key: "action", label: "Acción"}, {key: "target", label: "Destino"}];

export function PlatformAudit({audit, page, busy, onMore}: {audit: AuditAction[]; page: CollectionPage; busy: boolean; onMore: () => void}) {
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
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
      <SearchField className="min-w-[12rem] flex-1 sm:max-w-72"  label="Buscar en la auditoría" hideLabel value={query} onChange={(nextSearchValue)=>setQuery(nextSearchValue)} placeholder="Actor, acción o destino"/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Acción
        <Select hideLabel label="Filtrar por acción" value={action} onChange={(value:string)=>setAction(value)} className="min-w-[13rem]">
          <option value="">Todas las acciones</option>
          {actions.map((item) => <option key={item} value={item}>{item}</option>)}
        </Select>
      </label>
      {(query || action) ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => {setQuery(""); setAction("");}}>Limpiar filtros</button> : null}
    </FilterToolbar>
    <div ref={tableRef} className="min-w-0">
    {visible.length ? (tableFits ? (
      <ListGrid label="Actividad de administración global" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[49.5rem]">
        {visible.map((entry) => {
          const target = auditTarget(entry);
          const meta = auditMeta(entry);
          return <ListRow key={entry.id} template={TEMPLATE}>
            <span role="cell" className="list-date" title={listDateFull(entry.created_at) || undefined}>{listDateFull(entry.created_at) || "—"}</span>
            <span role="cell" className="list-identity text-fore" title={entry.actor_email || "Sistema"}>{entry.actor_email || "Sistema"}</span>
            <span role="cell" className="min-w-0"><StateChip tone="info" title={entry.action}>{entry.action}</StateChip></span>
            <span role="cell" className="list-secondary text-[12.5px] text-fore" title={meta ? `${target} · ${meta}` : target}>{target}{meta ? <span className="text-mute"> · {meta.slice(0, 160)}</span> : null}</span>
          </ListRow>;
        })}
      </ListGrid>
    ) : (
      <div className="platform-admin-audit-cards grid gap-3 sm:grid-cols-2">
        {visible.map((entry) => <article key={entry.id} className="min-w-0 rounded-xl border border-ink-600 bg-ink-800 p-4">
          <dl className="grid gap-3 [&_dd]:mt-0.5 [&_dd]:text-[12.5px] [&_dd]:leading-normal [&_dd]:text-fore [&_dd]:[overflow-wrap:anywhere] [&_dt]:text-[10px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-[.06em] [&_dt]:text-mute">
            <div><dt>Fecha</dt><dd>{listDateFull(entry.created_at) || "—"}</dd></div>
            <div><dt>Actor</dt><dd>{entry.actor_email || "Sistema"}</dd></div>
            <div><dt>Acción</dt><dd>{entry.action}</dd></div>
            <div><dt>Destino</dt><dd>{auditTarget(entry)}</dd></div>
            {auditMeta(entry) ? <div><dt>Metadatos</dt><dd>{auditMeta(entry)}</dd></div> : null}
          </dl>
        </article>)}
      </div>
    )) : (
      <EmptyBlock
        compact
        icon="report"
        title={audit.length ? "Sin acciones que coincidan con el filtro." : "Sin acciones registradas."}
        description={audit.length ? "Probá con otro actor, acción o texto." : "Las operaciones sensibles de la plataforma quedan acá con su actor, su acción y el destino."}
      />
    )}
    </div>
    <PlatformMore loaded={audit.length} total={page.total} hasMore={page.hasMore} busy={busy} onMore={onMore} label="acciones"/>
  </section>;
}
