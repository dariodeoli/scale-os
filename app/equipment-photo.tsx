"use client";
// Foto y categoría del equipo (#103), una sola pieza para inventario y para el
// asistente «Carga con IA» (#132): la foto con placeholder limpio —nunca un
// ícono roto— y el ícono de categoría desde una lista única.
//
// `inventory-workspace.tsx` importa `EquipmentPhoto`/`CategoryIcon` de acá
// (antes vivían adentro y sólo servían a esa pantalla); el asistente los usa en
// las tarjetas y en los candidatos del match.
import {BatteryCharging,Camera,HardDrive,Home,Lamp,Laptop,Lightbulb,Mic,Monitor,Package,Speaker,Video,type LucideIcon} from 'lucide-react';

const categoryIconMap:Record<string,LucideIcon>={'camera':Camera,'video':Video,'mic':Mic,'lamp':Lamp,'lightbulb':Lightbulb,'monitor':Monitor,'laptop':Laptop,'speaker':Speaker,'hard-drive':HardDrive,'battery-charging':BatteryCharging,'package':Package,'home':Home};

/** Lista única de íconos de categoría (el selector de inventario la recorre). */
export const CATEGORY_ICONS=categoryIconMap;

/** Ícono de la categoría; sin categoría conocida devuelve `null` (el caller decide). */
export function CategoryIcon({name,size=14}:{name?:string|null;size?:number}){const Icon=name?categoryIconMap[name]:undefined;return Icon?<Icon size={size} aria-hidden="true"/>:null;}

export type EquipmentPhotoSize='card'|'row'|'pipeline'|'chip';

/**
 * Foto o placeholder limpio: la misma pieza dibuja tarjeta (56 px), fila
 * (32 px), pipeline (36 px) y los chips del asistente (36 px).
 */
export function EquipmentPhoto({nombre,foto,icono,size='row'}:{nombre:string;foto?:string|null;icono?:string|null;size?:EquipmentPhotoSize}){
 const box=size==='card'?'h-14 w-14':size==='pipeline'?'h-9 w-9':size==='chip'?'h-9 w-9':'h-8 w-8';
 const iconSize=size==='card'?20:size==='chip'?16:14;
 if(foto)return <img className={`${box} shrink-0 rounded-lg border border-ink-600 object-cover`} src={foto} alt={`Foto de ${nombre}`} loading="lazy" referrerPolicy="no-referrer"/>;
 return <span className={`${box} grid shrink-0 place-items-center rounded-lg border border-ink-600 bg-ink-700/40 text-mute`} role="img" aria-label={`Sin foto: ${nombre}`} title="Sin foto"><CategoryIcon name={icono} size={iconSize}/></span>;
}
