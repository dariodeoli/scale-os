"use client";
// Picker único para listas largas de entidades (clientes, facturas, personas):
// buscador arriba y opciones con nombre, foto/logo y contexto. Reemplaza las
// grillas de botones que no escalan cuando hay 20+ entidades (#149).
//
// Un solo diseño: cápsula de persona (`PersonContainer`) cuando la opción es
// una persona, y fila compacta con `FotoPerfil` para registros (logo de cliente
// entero, iniciales cuando no hay foto). El contexto lo dibuja quien llama.
import {useMemo, useState, type ReactNode} from 'react';
import {FotoPerfil} from './foto-perfil';
import {PersonContainer} from './person-container';
import {SearchField} from './search-field';
import './entity-picker.css';

export type EntityOption = {
  id: string;
  name: string;
  /** Línea secundaria: razón social, número, cargo o correo. */
  secondary?: string;
  /** Contexto a la derecha del renglón (saldo, moneda, vencimiento). */
  context?: ReactNode;
  photoUrl?: string | null;
  /** Logo de empresa: la imagen se muestra entera, sin recorte de persona. */
  logo?: boolean;
  /** Persona: usa la cápsula compartida (avatar + nombre + secundario). */
  person?: boolean;
  /** Texto extra para la búsqueda (razón social, RUC, correo, referencia). */
  searchText?: string;
};

export type EntityPickerProps = {
  legend: string;
  options: EntityOption[];
  value: string;
  onChange: (value: string) => void;
  /** Con más de 6 opciones aparece el buscador. */
  placeholder?: string;
  searchLabel?: string;
  disabled?: boolean;
  error?: string;
  /** Permite limpiar la selección con la opción «Sin asignar». */
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
};

export function EntityPicker({legend, options, value, onChange, placeholder = 'Buscar…', searchLabel = 'Buscar', disabled = false, error, allowEmpty = false, emptyLabel = 'Sin asignar', className}: EntityPickerProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase('es');
  const visible = useMemo(() => options.filter(option => !query || `${option.name} ${option.secondary || ''} ${option.searchText || ''}`.toLocaleLowerCase('es').includes(query)), [options, query]);
  const withSearch = options.length > 6;
  return <fieldset className={className ? `entity-picker ${className}` : 'entity-picker'} disabled={disabled} aria-invalid={error ? true : undefined}>
    <legend>{legend}</legend>
    {withSearch ? <SearchField label={searchLabel} value={search} onChange={setSearch} placeholder={placeholder} disabled={disabled} className="w-full"/> : null}
    {allowEmpty ? <button type="button" className={value ? 'choice' : 'choice active'} aria-pressed={!value} disabled={disabled} onClick={() => onChange('')}>{emptyLabel}</button> : null}
    <div className="entity-picker-options" role="group" aria-label={`${legend}: opciones`}>
      {visible.map(option => <button
        key={option.id}
        type="button"
        className={option.id === value ? 'choice active' : 'choice'}
        aria-pressed={option.id === value}
        disabled={disabled}
        title={option.secondary ? `${option.name} · ${option.secondary}` : option.name}
        onClick={() => onChange(option.id)}
      >
        {option.person
          ? <PersonContainer name={option.name} photoUrl={option.photoUrl} secondary={option.secondary} size="sm"/>
          : <span className="entity-picker-main">
            <FotoPerfil nombre={option.name} foto={option.photoUrl} tamano="sm" variante={option.logo ? 'logo' : 'persona'}/>
            <span className="entity-picker-text">
              <b title={option.name}>{option.name}</b>
              {option.secondary ? <small title={option.secondary}>{option.secondary}</small> : null}
            </span>
          </span>}
        {option.context ? <span className="entity-picker-context">{option.context}</span> : null}
      </button>)}
    </div>
    {withSearch && !visible.length ? <small className="field-help">Sin coincidencias para «{search.trim()}».</small> : null}
    {!withSearch && !options.length ? <small className="field-help">No hay opciones disponibles.</small> : null}
    {error ? <small className="error" role="alert">{error}</small> : null}
  </fieldset>;
}
