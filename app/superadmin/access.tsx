"use client";
// Accesos entre agencias del panel global.
// Rediseño #80: panel del sistema con lista densa v2 y tarjetas cuando la
// plantilla no entra; las acciones mutantes quedan detrás de `writable`.
import {useMemo, useState} from "react";
import {Eye, ShieldCheck, Trash2} from "lucide-react";
import {Nota, SearchField} from "owncoding-ui";
import {EmptyBlock, FilterToolbar, ListActions, ListGrid, ListRow, StateChip, denseTableMinWidth, useDenseTableFit, type Column} from "../ui-v2";
import {formatPlatformMetric, type ConfirmRequest, type Person, type State} from "./model";
import {PersonContainer} from "../person-container";
import {PlatformMore} from "./states";
import type {CollectionPage} from "./model";

type PlatformAccessProps = {
  busy: boolean;
  state: State;
  page: CollectionPage;
  onMore: () => void;
  writable: boolean;
  setConfirming: (value: ConfirmRequest) => void;
  selfRow: (person: Person) => boolean;
  setPlatformAccess: (person: Person, access: "admin" | "viewer" | "none") => Promise<void>;
};

const TEMPLATE = "grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,1fr)_8rem_25rem]";
const COLUMNS: Column[] = [
  {key: "user", label: "Usuario"},
  {key: "agencies", label: "Agencias"},
  {key: "access", label: "Acceso"},
  {key: "actions", label: "Acciones", align: "end"},
];
const MIN_WIDTH = denseTableMinWidth(14 + 10 + 8 + 25, 4);
const TEMPLATE_READONLY = "grid-cols-[minmax(14rem,1.2fr)_minmax(10rem,1fr)_8rem]";
const COLUMNS_READONLY = COLUMNS.slice(0, -1);
const MIN_WIDTH_READONLY = denseTableMinWidth(14 + 10 + 8, 3);

export function PlatformAccess({busy, state, page, onMore, writable, setConfirming, selfRow, setPlatformAccess}: PlatformAccessProps){
  const {ref: listRef, fits: listFits} = useDenseTableFit<HTMLDivElement>(writable ? MIN_WIDTH : MIN_WIDTH_READONLY);
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    return text ? state.users.filter((person) => `${person.email} ${person.full_name || ""}`.toLowerCase().includes(text)) : state.users;
  }, [state.users, query]);
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
        }}
      >
        <Trash2 size={14} aria-hidden="true" />
        Eliminar usuario
      </button>
    </>;
  };
  // Foto + nombre real + correo (secundario): solo identidad visible, nunca datos sensibles.
  const identity = (person: Person) => (
    <PersonContainer
      name={person.full_name || person.email || "Usuario sin correo"}
      photoUrl={person.photo_url}
      secondary={person.full_name ? `${person.email}${selfRow(person) ? " · Vos" : ""}` : selfRow(person) ? "Vos" : null}
      size="sm"
    />
  );
  const agencyNames = (person: Person) => {
    const names = person.agency_names ?? [];
    const more = Math.max(0, person.active_agencies - names.length);
    return names.length ? `${names.join(", ")}${more ? ` +${more}` : ""}` : "Sin agencias activas";
  };
  return (
    <section className="panel h-full" aria-labelledby="platform-access-title">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="platform-access-title" className="text-[15px] font-semibold tracking-tight text-fore">Accesos entre agencias</h2>
          <StateChip tone="mute" title="Usuarios registrados">{formatPlatformMetric(state.users.length)}</StateChip>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">El acceso global no cambia los permisos de cada agencia</small>
      </div>
      <FilterToolbar summary={`${visible.length} de ${state.users.length}`}>
        <SearchField className="min-w-[12rem] flex-1 sm:max-w-72" type="search" ariaLabel="Buscar usuario" value={query} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Correo del usuario"/>
        {query ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => setQuery("")}>Limpiar filtros</button> : null}
      </FilterToolbar>
      {!writable && (
        <Nota tono="info" como="div" compact className="mb-3">Solo lectura: podés consultar la administración global, no modificarla.</Nota>
      )}
      <div ref={listRef} className="min-w-0">
        {visible.length ? (listFits ? (
          <ListGrid label="Accesos entre agencias" template={writable ? TEMPLATE : TEMPLATE_READONLY} columns={writable ? COLUMNS : COLUMNS_READONLY} minWidthClass={writable ? "min-w-[60rem]" : "min-w-[36rem]"} pinnedActions={writable}>
            {visible.map((person) => {
              const rowActions = actions(person);
              return (
                <ListRow key={person.id} template={writable ? TEMPLATE : TEMPLATE_READONLY}>
                  <div role="cell" className="min-w-0">{identity(person)}</div>
                  <span role="cell" className="list-secondary min-w-0" title={agencyNames(person)}>{agencyNames(person)}</span>
                  <span role="cell">{accessChip(person)}</span>
                  {rowActions ? <ListActions>{rowActions}</ListActions> : null}
                </ListRow>
              );
            })}
          </ListGrid>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((person) => {
              const cardActions = actions(person);
              return (
                <article key={person.id} className="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
                  <div className="min-w-0">{identity(person)}</div>
                  <small className="block text-[11px] text-mute [overflow-wrap:anywhere]">{formatPlatformMetric(person.active_agencies)} agencias activas · {agencyNames(person)}</small>
                  <div className="flex flex-wrap gap-1.5">{accessChip(person)}</div>
                  {cardActions ? <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-ink-600 pt-3">{cardActions}</div> : null}
                </article>
              );
            })}
          </div>
        )) : (
          <EmptyBlock
            compact
            icon="users"
            title="No hay usuarios para mostrar."
            description="Cuando alguien cree su cuenta o reciba acceso global, va a aparecer acá."
          />
        )}
      </div>
      <PlatformMore loaded={state.users.length} total={page.total} hasMore={page.hasMore} busy={busy} onMore={onMore} label="usuarios"/>
    </section>
  );
}
