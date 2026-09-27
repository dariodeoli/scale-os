"use client";
// Agencias y suscripciones del panel global.
// Rediseño #80: panel del sistema con el contrato de tablas densas
// (`ListGrid`/`ListRow`/`ListActions` + tarjetas cuando la plantilla no entra).
import {Trash2} from "lucide-react";
import {dueTone, listDateShort} from "../list-format";
import {
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
  formatPlatformMetric,
  manualAccessLabel,
  manualAccessTone,
  platformDate,
  type Agency,
  type State,
} from "./model";

type PlatformAgenciesProps = {
  busy: boolean;
  state: State;
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

/** Vencimiento visible del registro: manual, prueba o facturación. */
function agencyExpiry(agency: Agency) {
  return agency.internal_subscription_expires_at || agency.trial_ends_at || agency.due_at;
}

export function PlatformAgencies({busy, state, writable, setConfirming, setTyped, manageSubscription}: PlatformAgenciesProps) {
  // La tabla densa solo entra con ancho suficiente; si no, tarjetas (#62/#63).
  const {ref: tableRef, fits: tableFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
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
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="eyebrow">Agencias</p>
          <h2 id="platform-agencies-title" className="text-[17px] font-semibold tracking-tight text-fore">Agencias y suscripciones</h2>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">Gestioná el acceso manual junto a cada registro</small>
      </div>
      <div ref={tableRef} className="min-w-0">
        {tableFits ? (
          <ListGrid label="Agencias y suscripciones" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[73.5rem]" pinnedActions className="platform-admin-table-wrap">
            {state.agencies.length ? state.agencies.map((agency) => {
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
            }) : <p role="row" className="px-1 py-3 text-xs text-mute">No hay agencias para mostrar.</p>}
          </ListGrid>
        ) : (
          <div className="platform-admin-agency-cards grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {state.agencies.length ? state.agencies.map((agency) => {
              const expiry = agencyExpiry(agency);
              return (
                <article key={agency.id} className="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
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
            }) : <p className="text-xs text-mute">No hay agencias para mostrar.</p>}
          </div>
        )}
      </div>
    </section>
  );
}
