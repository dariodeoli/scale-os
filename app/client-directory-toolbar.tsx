"use client";

import { Plus, Search } from "lucide-react";
import { clientState, clientStatuses } from "./client-status";
import { SelectCustom } from "./profile-controls";
import { ViewToggle, type CollectionView } from "./view-toggle";

export type DirectoryClient = {
  active: boolean;
  email: string | null;
  lifecycle_status?: string;
  name: string;
  phone: string | null;
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");

export function filterClientDirectory<T extends DirectoryClient>(
  clients: readonly T[],
  query: string,
  lifecycleStatus: string,
): T[] {
  const term = normalizeSearch(query);

  return clients.filter((client) => {
    if (lifecycleStatus && clientState(client).value !== lifecycleStatus)
      return false;
    if (!term) return true;

    return [client.name, client.email, client.phone]
      .filter((value): value is string => Boolean(value))
      .some((value) => normalizeSearch(value).includes(term));
  });
}

type ClientDirectoryToolbarProps = {
  canCreate: boolean;
  children?: React.ReactNode;
  onCreate: () => void;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onViewChange: (view: CollectionView) => void;
  query: string;
  resultCount: number;
  status: string;
  totalCount: number;
  view: CollectionView;
};

export function ClientDirectoryToolbar({
  canCreate,
  children,
  onCreate,
  onQueryChange,
  onStatusChange,
  onViewChange,
  query,
  resultCount,
  status,
  totalCount,
  view,
}: ClientDirectoryToolbarProps) {
  const clientLabel = resultCount === 1 ? "cliente" : "clientes";
  const totalLabel = totalCount === 1 ? "cliente" : "clientes";

  return (
    <div
      className="client-directory-toolbar"
      aria-label="Controles del directorio de clientes"
    >
      <div className="client-directory-toolbar-title">
        <h1>Clientes</h1>
        <p className="directory-summary" role="status" aria-atomic="true">
          Mostrando {resultCount} {clientLabel} de {totalCount} {totalLabel}
        </p>
      </div>
      <label className="client-directory-search">
        <span className="sr-only">Buscar clientes</span>
        <Search aria-hidden="true" size={18} />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar por nombre, correo o teléfono"
        />
      </label>
      <SelectCustom
        label="Estado"
        value={status}
        onChange={onStatusChange}
        choices={[{ value: "", label: "Todos los estados" }, ...clientStatuses]}
      />
      <div className="workspace-view-controls">
        <ViewToggle
          label="Vista de clientes"
          value={view}
          onChange={onViewChange}
        />
      </div>
      {children}
      {canCreate && (
        <button
          type="button"
          className="primary client-directory-create"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" size={18} /> Nuevo cliente
        </button>
      )}
    </div>
  );
}
