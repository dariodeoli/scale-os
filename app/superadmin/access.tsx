"use client";
// Accesos entre agencias del panel global.
// Rediseño #80: panel del sistema con lista densa v2 y tarjetas cuando la
// plantilla no entra; las acciones mutantes quedan detrás de `writable`.
import {Eye, ShieldCheck, Trash2} from "lucide-react";
import {Nota} from "owncoding-ui";
import {ListActions, ListGrid, ListRow, EmptyBlock, StateChip, denseTableMinWidth, useDenseTableFit, type Column} from "../ui-v2";
import {formatPlatformMetric, type ConfirmRequest, type Person, type State} from "./model";

type PlatformAccessProps = {
  busy: boolean;
  state: State;
  writable: boolean;
  setConfirming: (value: ConfirmRequest) => void;
  setTyped: (value: string) => void;
  selfRow: (person: Person) => boolean;
  setPlatformAccess: (person: Person, access: "admin" | "viewer" | "none") => Promise<void>;
};

const TEMPLATE = "grid-cols-[minmax(11rem,1fr)_7rem_25rem]";
const COLUMNS: Column[] = [
  {key: "user", label: "Usuario"},
  {key: "access", label: "Acceso"},
  {key: "actions", label: "Acciones"},
];
const MIN_WIDTH = denseTableMinWidth(43, 3);

export function PlatformAccess({busy, state, writable, setConfirming, setTyped, selfRow, setPlatformAccess}: PlatformAccessProps){
  const {ref: listRef, fits: listFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const accessChip = (person: Person) => person.platform_admin
    ? <StateChip tone={person.platform_role === "viewer" ? "info" : "ok"}>{person.platform_role === "viewer" ? "Solo lectura" : "Admin global"}</StateChip>
    : <StateChip tone="mute">Acceso de agencia</StateChip>;
  const actions = (person: Person) => {
    if (!writable) return null;
    if (selfRow(person)) return (
      <button
        type="button"
        className="text-button platform-admin-danger"
        disabled={busy}
        onClick={() => {
          setConfirming({ kind: "user", person });
          setTyped("");
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        Eliminar mi cuenta
      </button>
    );
    return <>
      {person.platform_role !== "admin" && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => void setPlatformAccess(person, "admin")}
        >
          <ShieldCheck size={14} aria-hidden="true" />
          Hacer admin global
        </button>
      )}
      {person.platform_role !== "viewer" && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => void setPlatformAccess(person, "viewer")}
        >
          <Eye size={14} aria-hidden="true" />
          Solo lectura
        </button>
      )}
      {person.platform_role && (
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={() => void setPlatformAccess(person, "none")}
        >
          Quitar acceso
        </button>
      )}
      <button
        type="button"
        className="text-button platform-admin-danger"
        disabled={busy}
        onClick={() => {
          setConfirming({ kind: "user", person });
          setTyped("");
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        Eliminar usuario
      </button>
    </>;
  };
  const identity = (person: Person) => <>
    <b className="list-identity text-fore" title={person.email || "Usuario sin correo"}>{person.email || "Usuario sin correo"}</b>
    <small className="list-secondary">{formatPlatformMetric(person.active_agencies)} agencias activas{selfRow(person) ? " · Vos" : ""}</small>
  </>;
  return (
    <section className="panel h-full" aria-labelledby="platform-access-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="eyebrow">Usuarios</p>
          <h2 id="platform-access-title" className="text-[17px] font-semibold tracking-tight text-fore">Accesos entre agencias</h2>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">{formatPlatformMetric(state.users.length)} registrados</small>
      </div>
      {!writable && (
        <Nota tono="info" como="div" compact className="mb-3">Solo lectura: podés consultar la administración global, no modificarla.</Nota>
      )}
      <div ref={listRef} className="min-w-0">
        {state.users.length ? (listFits ? (
          <ListGrid label="Accesos entre agencias" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[45rem]" pinnedActions>
            {state.users.map((person) => {
              const rowActions = actions(person);
              return (
                <ListRow key={person.id} template={TEMPLATE}>
                  <div role="cell" className="min-w-0">{identity(person)}</div>
                  <span role="cell">{accessChip(person)}</span>
                  {rowActions ? <ListActions>{rowActions}</ListActions> : null}
                </ListRow>
              );
            })}
          </ListGrid>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.users.map((person) => {
              const cardActions = actions(person);
              return (
                <article key={person.id} className="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
                  <div className="min-w-0">
                    <b className="block text-[13px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title={person.email || "Usuario sin correo"}>{person.email || "Usuario sin correo"}</b>
                    <small className="mt-0.5 block text-[11px] text-mute">{formatPlatformMetric(person.active_agencies)} agencias activas{selfRow(person) ? " · Vos" : ""}</small>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{accessChip(person)}</div>
                  {cardActions ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{cardActions}</div> : null}
                </article>
              );
            })}
          </div>
        )) : (
          <EmptyBlock
            icon="users"
            title="No hay usuarios para mostrar."
            description="Cuando alguien cree su cuenta o reciba acceso global, va a aparecer acá."
          />
        )}
      </div>
    </section>
  );
}
