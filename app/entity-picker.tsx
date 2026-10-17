"use client";
// Picker único para listas largas de entidades (clientes, facturas, personas):
// buscador arriba y opciones con nombre, foto/logo y contexto. Reemplaza las
// grillas de botones que no escalan cuando hay 20+ entidades (#149).
//
// Un solo diseño: cápsula de persona (`PersonContainer`) cuando la opción es
// una persona, y fila compacta con `FotoPerfil` para registros (logo de cliente
// entero, iniciales cuando no hay foto). El contexto lo dibuja quien llama.
import {type ReactNode} from 'react';
import {FotoPerfil} from './foto-perfil';
import {PersonContainer} from './person-container';
import {Selector} from './ui/select';
import {PersonSelect} from './profile-controls';
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
  if(options.length>0&&options.every(option=>option.person))return <div className={className}><PersonSelect label={legend} value={value} onChange={onChange} disabled={disabled} invalid={Boolean(error)} error={error} choices={[...(allowEmpty?[{value:'',label:emptyLabel}]:[]),...options.map(option=>({value:option.id,label:option.name,photoUrl:option.photoUrl,secondary:option.secondary,searchText:option.searchText,kind:'person' as const}))]}/></div>;
  return <fieldset className={className ? `entity-picker ${className}` : 'entity-picker'} disabled={disabled} aria-invalid={error ? true : undefined}>
    <legend>{legend}</legend>
    <Selector label={legend} hideLabel presentation="inline" variant="entity" value={value} onChange={onChange} disabled={disabled} error={error}
      searchable={options.length>6} searchLabel={searchLabel} searchPlaceholder={placeholder}
      options={[...(allowEmpty?[{value:'',primary:emptyLabel,kind:'plain' as const,pinned:true}]:[]),...options.map(option=>({value:option.id,primary:option.name,secondary:option.secondary,avatarUrl:option.photoUrl,kind:option.person?'person' as const:'entity' as const,searchText:option.searchText}))]}
      optionsClassName="entity-picker-options" renderOption={option=>{
        const source=options.find(item=>item.id===option.value);
        if(!source)return option.primary;
        return <>{source.person?<PersonContainer name={source.name} photoUrl={source.photoUrl} secondary={source.secondary} size="sm"/>:<span className="entity-picker-main"><FotoPerfil nombre={source.name} foto={source.photoUrl} tamano="sm" variante={source.logo?'logo':'persona'}/><span className="entity-picker-text"><b title={source.name}>{source.name}</b>{source.secondary?<small title={source.secondary}>{source.secondary}</small>:null}</span></span>}{source.context?<span className="entity-picker-context">{source.context}</span>:null}</>;
      }}/>
  </fieldset>;
}
