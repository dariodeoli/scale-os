"use client";
// Rediseño v2 (campaña #41 / spec #43 §1.2) reconciliado con la adaptación de
// DSN para la referencia de Clientes (#42): mismos props y objetos de la
// librería, con la lógica pura centralizada en ./client-directory-data.
//
// Pase compacto (#91): el header vive en UNA fila (≥1280, 56 px) con el
// contador junto al título (`Clientes · 11`), el resumen como texto auxiliar —
// nunca un bloque propio—, los filtros en línea y la acción primaria al final.
// En mobile se apila sólo lo que no entra, con targets de 44 px.
import { Plus } from "lucide-react";
import type {ChangeEvent} from 'react';
import {Button, Label, SearchField, Select} from 'owncoding-ui';
import {ViewSwitch} from './ui-v2';
import {directorySummaryText} from './client-directory-data';
import { clientStatuses } from "./client-status";
import type { CollectionView } from "./view-toggle";

// La lógica pura vive en ./client-directory-data; se reexporta para no romper
// a los consumidores existentes (el shell importa filterClientDirectory de acá).
export {filterClientDirectory, normalizeSearch, directorySummaryText} from "./client-directory-data";
export type {DirectoryClient, DirectoryClientRecord} from "./client-directory-data";

type ClientDirectoryToolbarProps = {
  canCreate: boolean;
  children?: React.ReactNode;
  /** false = el rol no recibe contacto: el buscador solo promete nombre (#114). */
  contactVisible?: boolean;
  onCreate: () => void;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: string) => void;
  onViewChange: (view: CollectionView) => void;
  query: string;
  resultCount: number;
  /** #109: el shell todavía está cargando; el contador no afirma cero. */
  loading?: boolean;
  status: string;
  totalCount: number;
  view: CollectionView;
};

export function ClientDirectoryToolbar({
  canCreate,
  children,
  contactVisible = true,
  onCreate,
  onQueryChange,
  onStatusChange,
  onViewChange,
  query,
  resultCount,
  loading = false,
  status,
  totalCount,
  view,
}: ClientDirectoryToolbarProps) {
  // El contador del título es el total del directorio; el resumen auxiliar
  // aclara cuántos se ven con los filtros activos (`directorySummaryText`).
  const summary = directorySummaryText(resultCount, totalCount);
  // La preferencia se guarda en el shell por navegador. También se muestra en
  // pantallas chicas: allí la lista usa fichas compactas, no una tabla recortada.
  return (
    <div
      className="client-directory-toolbar flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-2 md:min-h-14"
      aria-label="Controles del directorio de clientes"
    >
      <div className="client-directory-toolbar-title flex min-w-[12rem] flex-1 flex-nowrap items-baseline gap-x-2">
        <h1 className="whitespace-nowrap text-[22px] font-bold leading-tight tracking-tight text-fore md:text-2xl">
          Clientes{loading ? null : <><span aria-hidden="true"> · </span><span className="tabular-nums">{totalCount}</span></>}
        </h1>
        <p className="directory-summary min-w-0 truncate text-[12px] leading-5 tabular-nums text-mute" role="status" aria-atomic="true" title={loading ? undefined : summary}>{loading ? 'Cargando el directorio…' : summary}</p>
      </div>
      {/* El icono de la librería es absoluto y el padding base del shell lo pisa
          (ui-system.css): se refuerza el pl/pr igual que Finanzas/Mora para que
          el placeholder no quede debajo de la lupa. Causa raíz compartida: DSN. */}
      <SearchField className="client-directory-search w-full sm:w-72 [&>input]:!pl-9 [&>input]:!pr-9 [&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7" type="search" ariaLabel="Buscar clientes" value={query} onChange={(event:ChangeEvent<HTMLInputElement>)=>onQueryChange(event.target.value)} placeholder={contactVisible?'Buscar por nombre, correo o teléfono':'Buscar por nombre'}/>
      <div className="min-w-0">
        <Label htmlFor="clientes-estado" className="sr-only">Estado</Label>
        <Select id="clientes-estado" aria-label="Estado" value={status} onChange={(event:ChangeEvent<HTMLSelectElement>)=>onStatusChange(event.target.value)} className="min-w-[11rem]">
          <option value="">Todos los estados</option>
          {clientStatuses.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
        </Select>
      </div>
      <div className="client-directory-view-controls" role="group" aria-label="Vista del directorio">
        <ViewSwitch value={view} onChange={onViewChange}/>
      </div>
      {query || status ? <button type="button" className="text-button min-h-11 md:min-h-8" onClick={() => {onQueryChange(''); onStatusChange('');}}>Limpiar filtros</button> : null}
      {children}
      {canCreate && (
        <Button
          type="button"
          className="client-directory-create max-md:w-full"
          onClick={onCreate}
        >
          <Plus aria-hidden="true" size={18} /> Nuevo cliente
        </Button>
      )}
    </div>
  );
}
