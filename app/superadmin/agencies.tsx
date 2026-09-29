"use client";
// Agencias y suscripciones del panel global (#102): toolbar única (búsqueda +
// estado + contador) y lista densa con tarjetas cuando la plantilla no entra.
import {useMemo, useState} from "react";
import {SearchField, Select} from "owncoding-ui";
import {Trash2} from "lucide-react";
import {dueTone, listDateShort} from "../list-format";
import {
  FilterToolbar,
  ListActions,
  ListGrid,
  ListRow,
  MoneyText,
  StateChip,
  denseTableMinWidth,
  useDenseTableFit,
  type Column,
} from "../ui-v2";
import {
  agencyExpiry,
  formatPlatformMetric,
  manualAccessLabel,
  manualAccessTone,
  platformDate,
  type Agency,
  type CollectionPage,
  type State,
} from "./model";
import {PlatformMore} from "./states";

type PlatformAgenciesProps = {
  busy: boolean;
  state: State;
  page: CollectionPage;
  onMore: () => void;
  writable: boolean;
  setConfirming: (value: import("./model").ConfirmRequest) => void;
  setTyped: (value: string) => void;
  manageSubscription: (agency: Agency) => Promise<void>;
};

const TEMPLATE = "grid-cols-[minmax(13rem,1.6fr)_minmax(16rem,1fr)_7.5rem_5.5rem_minmax(8rem,.9fr)_20.5rem]";
const COLUMNS: Column[] = [
  {key: "agency", label: "Agencia"},
  {key: "status", label: "Estado"},
  {key: "plan", label: "Plan", align: "end"},
  {key: "users", label: "Usuarios", align: "end"},
  {key: "expiry", label: "Prueba / vencimiento"},
  {key: "actions", label: "Acciones"},
];
const MIN_WIDTH = denseTableMinWidth(70.5, 6);

export function PlatformAgencies({busy, state, page, onMore, writable, setConfirming, setTyped, manageSubscription}: PlatformAgenciesProps) {
  // La tabla densa solo entra con ancho suficiente; si no, tarjetas (#62/#63).
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return state.agencies.filter((agency) => {
      if (status === "active" && !agency.active) return false;
      if (status === "inactive" && agency.active) return false;
      if (status === "manual" && !agency.internal_subscription_state) return false;
      if (status === "expiring") {
        const expiry = agencyExpiry(agency);
        const time = expiry ? new Date(expiry).getTime() : Number.NaN;
        if (!Number.isFinite(time) || time > Date.now() + 7 * 86_400_000) return false;
      }
      if (!text) return true;
      return `${agency.name} ${agency.slug}`.toLowerCase().includes(text);
    });
  }, [state.agencies, query, status]);
  const badges = (agency: Agency) => <>
    <StateChip tone={agency.active ? "ok" : "mute"}>{agency.active ? "Activa" : "Inactiva"}</StateChip>
    <StateChip tone={manualAccessTone(agency)}>{manualAccessLabel(agency)}</StateChip>
  </>;
  const actions = (agency: Agency) => <>
    {writable && (
      <button
        type="button"
        className="text-button platform-admin-inline-action"
        disabled={busy}
        onClick={() => void manageSubscription(agency)}
      >
        Gestionar estado manual
      </button>
    )}
    {writable && (
      <button
        type="button"
        className="text-button platform-admin-danger"
        disabled={busy}
        onClick={() => {
          setConfirming({ kind: "agency", agency });
          setTyped("");
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        Eliminar agencia
      </button>
    )}
  </>;
  return (
    <section className="panel" aria-labelledby="platform-agencies-title">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="platform-agencies-title" className="text-[15px] font-semibold tracking-tight text-fore">Agencias y suscripciones</h2>
          <StateChip tone="mute" title="Agencias cargadas en el panel">{formatPlatformMetric(state.agencies.length)}</StateChip>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">Gestioná el acceso manual junto a cada registro</small>
      </div>
      <FilterToolbar summary={`${visible.length} de ${state.agencies.length}`}>
        <SearchField className="min-w-[12rem] flex-1 sm:max-w-72" type="search" ariaLabel="Buscar agencia" value={query} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Nombre o identificador"/>
        <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
          Estado
          <Select aria-label="Filtrar por estado" value={status} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setStatus(event.target.value)} className="min-w-[11rem]">
            <option value="">Todas</option>
            <option value="active">Activas</option>
            <option value="inactive">Inactivas</option>
            <option value="manual">Con cambio manual</option>
            <option value="expiring">Vencen en 7 días</option>
          </Select>
        </label>
        {(query || status) ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => {setQuery(""); setStatus("");}}>Limpiar filtros</button> : null}
      </FilterToolbar>
      <div ref={tableRef} className="min-w-0">
        {tableFits ? (
          <ListGrid label="Agencias y suscripciones" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[73.5rem]" pinnedActions className="platform-admin-table-wrap">
            {visible.length ? visible.map((agency) => {
              const expiry = agencyExpiry(agency);
              return (
                <ListRow key={agency.id} template={TEMPLATE}>
                  <div role="cell" className="min-w-0">
                    <b className="list-identity text-fore" title={agency.name || "Agencia sin nombre"}>{agency.name || "Agencia sin nombre"}</b>
                    <small className="list-secondary" title={agency.slug || "Sin identificador"}>{agency.slug || "Sin identificador"}</small>
                  </div>
                  <div role="cell" className="flex min-w-0 flex-wrap items-center gap-1.5">{badges(agency)}</div>
                  <span role="cell" className="text-right"><MoneyText valor={agency.subscription_amount} currency={agency.subscription_currency || undefined} className="text-fore"/></span>
                  <span role="cell" className="text-right text-[12.5px] font-semibold tabular-nums text-fore">{formatPlatformMetric(agency.active_users)}</span>
                  <span role="cell" className="list-date min-w-0" data-tone={dueTone(expiry) || undefined} title={expiry ? `Vence ${platformDate(expiry)}` : "Sin vencimiento registrado"}>{listDateShort(expiry) || "—"}</span>
                  {writable ? <ListActions>{actions(agency)}</ListActions> : null}
                </ListRow>
              );
            }) : <p role="row" className="px-1 py-3 text-xs text-mute">No hay agencias que coincidan con el filtro.</p>}
          </ListGrid>
        ) : (
          <div className="platform-admin-agency-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.length ? visible.map((agency) => {
              const expiry = agencyExpiry(agency);
              return (
                <article key={agency.id} className="flex min-h-[140px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
                  <div className="min-w-0">
                    <b className="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title={agency.name || "Agencia sin nombre"}>{agency.name || "Agencia sin nombre"}</b>
                    <small className="mt-0.5 block text-[11px] text-mute">{agency.slug || "Sin identificador"}</small>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{badges(agency)}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Plan</dt><dd className="mt-0.5 font-semibold text-fore"><MoneyText valor={agency.subscription_amount} currency={agency.subscription_currency || undefined}/></dd></div>
                    <div><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usuarios</dt><dd className="mt-0.5 font-semibold tabular-nums text-fore">{formatPlatformMetric(agency.active_users)}</dd></div>
                    <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Prueba / vencimiento</dt><dd className="list-date mt-0.5" data-tone={dueTone(expiry) || undefined}>{platformDate(expiry)}</dd></div>
                  </dl>
                  {writable ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{actions(agency)}</div> : null}
                </article>
              );
            }) : <p className="text-xs text-mute">No hay agencias que coincidan con el filtro.</p>}
          </div>
        )}
      </div>
      <PlatformMore loaded={state.agencies.length} total={page.total} hasMore={page.hasMore} busy={busy} onMore={onMore} label="agencias"/>
    </section>
  );
}
