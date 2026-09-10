"use client";
import {useState} from 'react';
import './actor-identity.css';

export type ActorIdentityProps={name?:string|null;photoUrl?:string|null;verified?:boolean;imported?:boolean};
export function actorInitials(name:string){
 const words=name.trim().split(/\s+/).filter(Boolean);
 return (words.length>1?`${Array.from(words[0])[0]}${Array.from(words[words.length-1])[0]}`:Array.from(words[0]||'?').slice(0,2).join('')).toLocaleUpperCase('es');
}
function safePhoto(value?:string|null){
 if(!value)return '';
 if(/^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/.test(value))return value;
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?value:'';}catch{return '';}
}
export function ActorIdentity({name,photoUrl,verified=false,imported=false}:ActorIdentityProps){
 const label=name?.trim()||(imported?'Autor importado':'Sistema');
 const photo=verified&&!imported?safePhoto(photoUrl):'';
 // Keying the image state to both author and URL also retries a changed photo.
 return <span className="actor-identity"><ActorAvatar key={`${label}\n${photo}`} name={label} photo={photo}/><span className="actor-identity-name">{label}</span></span>;
}
function ActorAvatar({name,photo}:{name:string;photo:string}){
 const [failed,setFailed]=useState(false);
 return <span className="actor-identity-avatar" aria-hidden="true">{photo&&!failed?<img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFailed(true)}/>:actorInitials(name)}</span>;
}
