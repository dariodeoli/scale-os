"use client";
import {listDateFull} from './list-format';
import {FotoPerfil} from './foto-perfil';
import './actor-identity.css';

export type ActorIdentityProps={name?:string|null;photoUrl?:string|null;verified?:boolean;imported?:boolean;timestamp?:string|null};
export function actorInitials(name:string){
 const words=name.trim().split(/\s+/).filter(Boolean);
 return (words.length>1?`${Array.from(words[0])[0]}${Array.from(words[words.length-1])[0]}`:Array.from(words[0]||'?').slice(0,2).join('')).toLocaleUpperCase('es');
}
export function safePhoto(value?:string|null){
 if(!value)return '';
 if(/^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value;
 // Medios de identidad (#108): la API sirve las fotos guardadas como URL interna
 // cacheable (mismo origen) en vez de repetir el base64 en cada listado.
 if(/^\/core-api\/api\/agency\/media\/(?:person|collaborator|client)\/\d+\?v=[a-f0-9]{10}$/.test(value))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:'';}catch{return '';}
}
/**
 * Correo técnico de una demo (`…@demo.example.invalid`, `…@scale-demo.example.invalid`):
 * identificador interno del fixture, nunca una identidad visible (#151).
 */
export function isTechnicalDemoEmail(value?:string|null){
 return /^[^@\s]+@(?:scale-)?demo\.example\.invalid$/i.test(String(value||'').trim());
}
/**
 * Nombre visible de una persona: vacío cae al texto base; un correo técnico del
 * demo se reemplaza por una etiqueta humana en vez de mostrarse crudo (#151).
 */
export function personDisplayName(name?:string|null,emptyLabel='Sistema'){
 const value=name?.trim();
 if(!value)return emptyLabel;
 return isTechnicalDemoEmail(value)?'Persona del demo':value;
}
export function ActorIdentity({name,photoUrl,verified=false,imported=false,timestamp}:ActorIdentityProps){
 const label=personDisplayName(name,imported?'Autor importado':'Sistema');
 const photo=verified&&!imported?safePhoto(photoUrl):'';
 // Keying the image state to both author and URL also retries a changed photo.
 const date=timestamp?new Date(timestamp):null;
 const validDate=date&&!Number.isNaN(date.getTime())?date:null;
 return <span className="actor-identity"><ActorAvatar key={`${label}\n${photo}`} name={label} photo={photo}/><span className="actor-identity-details"><span className="actor-identity-name" title={label}>{label}</span>{validDate&&<time className="actor-identity-time" dateTime={validDate.toISOString()}>{listDateFull(validDate.toISOString())}</time>}{imported&&<span className="actor-identity-source">Autor de registro importado</span>}</span></span>;
}
/** Avatar de una identidad: el objeto único de foto de perfil (#107). */
export function ActorAvatar({name,photo}:{name:string;photo:string}){
 return <FotoPerfil nombre={name} foto={photo} tamano="lg"/>;
}
