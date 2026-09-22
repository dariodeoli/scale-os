"use client";
// Rediseño v2 (campaña #41 / spec #43 §1.2) reconciliado con la adaptación de
// DSN para la referencia de Clientes (#42): mismos props y objetos de la
// librería, con la lógica pura centralizada en ./client-directory-data.
import { Plus } from "lucide-react";
import type {ChangeEvent} from 'react';
import {Button, Label, ListGridToggle, SearchField, Select} from 'owncoding-ui';
import { clientStatuses } from "./client-status";
import type { CollectionView } from "./view-toggle";
import {directorySummaryText} from "./client-directory-data";

// La lógica pura vive en ./client-directory-data; se reexporta para no romper
// a los consumidores existentes (el shell importa filterClientDirectory de acá).
export {filterClientDirectory, normalizeSearch, directorySummaryText} from "./client-directory-data";
export type {DirectoryClient, DirectoryClientRecord} from "./client-directory-data";

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
  return (
    <div
      className="client-directory-toolbar flex flex-wrap items-end gap-3"
      aria-label="Controles del directorio de clientes"
    >
      <div className="client-directory-toolbar-title min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-fore">Clientes</h1>
        <p className="directory-summary text-xs tabular-nums text-mute" role="status" aria-atomic="true">
          {directorySummaryText(resultCount, totalCount)}
        </p>
      </div>
      <SearchField className="client-directory-search w-full sm:w-72" type="search" ariaLabel="Buscar clientes" value={query} onChange={(event:ChangeEvent<HTMLInputElement>)=>onQueryChange(event.target.value)} placeholder="Buscar por nombre, correo o teléfono"/>
      <div className="grid gap-1.5">
        <Label htmlFor="clientes-estado">Estado</Label>
        <Select id="clientes-estado" value={status} onChange={(event:ChangeEvent<HTMLSelectElement>)=>onStatusChange(event.target.value)} className="min-w-[11rem]">
          <option value="">Todos los estados</option>
          {clientStatuses.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </Select>
      </div>
      <ListGridToggle value={view} onChange={onViewChange}/>
      {children}
      {canCreate && (
        <Button
          type="button"
          className="client-directory-create ml-auto"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" size={18} /> Nuevo cliente
        </Button>
      )}
    </div>
  );
}
