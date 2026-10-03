'use client';
import {FotoPerfil} from './foto-perfil';
import {personDisplayName} from './actor-identity';
import './person-container.css';

export type PersonContainerProps={
 name:string;
 photoUrl?:string|null;
 secondary?:string|null;
 verified?:boolean;
 size?:'sm'|'md'|'lg';
 className?:string;
};
// El avatar sale del objeto único `FotoPerfil` (#107): acá solo queda el layout
// de la cápsula (avatar + nombre + secundario) y el mapeo de tamaños.
const TAMANO={sm:'sm',md:'lg',lg:'2xl'} as const;

export function PersonContainer({name,photoUrl,secondary,verified=false,size='md',className=''}:PersonContainerProps){
 const label=personDisplayName(name);
 return <span className={`person-container person-container-${size}${className?' '+className:''}`}>
  <FotoPerfil nombre={label} foto={photoUrl} tamano={TAMANO[size]} verificado={verified}/>
  <span className="person-container-details">
   <span className="person-container-name" title={label}>{label}</span>
   {secondary?<span className="person-container-secondary" title={secondary}>{secondary}</span>:null}
  </span>
 </span>;
}
