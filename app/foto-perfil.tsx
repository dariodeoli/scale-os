"use client";
// Foto de perfil — objeto único (#107, SOS-DSN).
//
// Un solo objeto para TODAS las superficies: tamaño (escala canónica), forma
// (círculo/cuadrado), iniciales cuando no hay foto y encuadre amable —la foto
// se guarda completa y el círculo toma desde el borde superior, donde está la
// cabeza—. Reemplaza las implementaciones paralelas (`PersonAvatar` de
// person-container, `PersonPhoto` de presence, `ActorAvatar` de
// actor-identity, el `<img>` suelto de my-profile, `identity-avatar` de
// client-identity, las miniaturas del visor y las previews de perfil).
// Las fotos de equipo del Inventario quedan fuera (no son de persona).
import {useEffect,useState,type ReactNode} from 'react';
import {actorInitials,safePhoto} from './actor-identity';

export type FotoPerfilTamano='xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl';
export type FotoPerfilForma='circulo'|'cuadrado';
export type FotoPerfilVariante='persona'|'logo';

export type FotoPerfilProps={
  nombre:string;
  foto?:string|null;
  tamano?:FotoPerfilTamano;
  forma?:FotoPerfilForma;
  /** `persona`: la foto se encuadra desde arriba. `logo`: se ve entera (`contain`). */
  variante?:FotoPerfilVariante;
  /** La foto se usa solo si viene de una fuente segura (https o data:image). */
  verificado?:boolean;
  onClick?:()=>void;
  disabled?:boolean;
  /** Acceso alternativo del botón («Cambiar foto de …»). */
  etiqueta?:string;
  title?:string;
  /** Adorno del botón (zoom, recorte): se dibuja sobre la foto. */
  badge?:ReactNode;
  className?:string;
};

export function FotoPerfil({nombre,foto,tamano='md',forma='circulo',variante='persona',verificado=true,onClick,disabled=false,etiqueta,title,badge,className=''}:FotoPerfilProps){
  const [fallo,setFallo]=useState(false);
  const source=verificado?safePhoto(foto):'';
  // Cambiar de foto reintenta la carga (y el fallo vuelve a iniciales).
  useEffect(()=>setFallo(false),[source]);
  const iniciales=actorInitials(nombre||'?');
  const contenido=source&&!fallo
    ?<img src={source} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFallo(true)}/>
    :<span className="foto-perfil-iniciales" aria-hidden="true">{iniciales}</span>;
  const clases=`foto-perfil foto-perfil-${tamano} foto-perfil-${forma} foto-perfil-${variante}${className?' '+className:''}`;
  if(onClick){
    return <button type="button" className={clases} disabled={disabled} onClick={onClick} title={title} aria-label={etiqueta||title||`Foto de ${nombre}`}>
      {contenido}
      {badge?<span className="foto-perfil-badge" aria-hidden="true">{badge}</span>:null}
    </button>;
  }
  return <span className={clases} title={title} aria-hidden="true">{contenido}</span>;
}
