"use client";

import {useState} from 'react';
import {ExternalLink,X} from 'lucide-react';
import './drive-links.css';

export type DriveLink={url:string;label:string};
const validUrl=(value:string)=>{try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}};
export function driveLinks(value:unknown,legacy?:string|null):DriveLink[]{
 const raw=Array.isArray(value)?value:(legacy?[legacy]:[]);
 return raw.map(item=>typeof item==='string'?{url:item,label:''}:{url:typeof item?.url==='string'?item.url:'',label:typeof item?.label==='string'?item.label:''}).filter(item=>validUrl(item.url)).slice(0,10).map(item=>({...item,label:item.label.trim()||'Archivo o carpeta'}));
}
export function driveLinksText(value:unknown,legacy?:string|null){return driveLinks(value,legacy).map(item=>item.label==='Archivo o carpeta'?item.url:`${item.label} | ${item.url}`).join('\n');}
export function parseDriveLinksText(value:string):DriveLink[]{
 return value.split(/\r?\n/).map(line=>line.trim()).filter(Boolean).map(line=>{const separator=line.lastIndexOf('|');const possibleUrl=separator>=0?line.slice(separator+1).trim():line;const label=separator>=0?line.slice(0,separator).trim():'';return{url:possibleUrl,label:label||'Archivo o carpeta'};});
}
export function DriveLinksInput({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled?:boolean}){
 const [url,setUrl]=useState(''),[label,setLabel]=useState(''),[error,setError]=useState('');const links=parseDriveLinksText(value);
 function write(next:DriveLink[]){onChange(next.map(item=>item.label==='Archivo o carpeta'?item.url:`${item.label} | ${item.url}`).join('\n'));}
 function add(){const clean=url.trim();if(!validUrl(clean)){setError('Pegá un enlace HTTPS válido.');return;}if(links.length>=10){setError('Podés agregar hasta 10 enlaces.');return;}write([...links,{url:clean,label:label.trim()||'Archivo o carpeta'}]);setUrl('');setLabel('');setError('');}
 return <div className="drive-links-input"><div className="drive-links-list">{links.map((item,index)=><span className="drive-link-chip" key={`${item.url}-${index}`}><a href={item.url} target="_blank" rel="noreferrer" title={item.url}>{item.label}<ExternalLink size={13}/></a><button type="button" aria-label={`Quitar enlace ${item.label}`} disabled={disabled} onClick={()=>write(links.filter((_,position)=>position!==index))}><X size={14}/></button></span>)}{!links.length&&<small>Sin enlaces todavía.</small>}</div><div className="drive-links-add"><label>Nombre del enlace · opcional<input value={label} disabled={disabled} maxLength={80} placeholder="Ej.: Reel final" onChange={event=>setLabel(event.target.value)}/></label><label>Enlace HTTPS<input value={url} disabled={disabled} type="url" placeholder="https://drive.google.com/…" onChange={event=>setUrl(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();add();}}}/></label><button type="button" className="secondary" disabled={disabled||!url.trim()} onClick={add}>Agregar enlace</button></div>{error&&<small className="error" role="alert">{error}</small>}<input type="hidden" value={value} readOnly aria-label="Enlaces guardados"/></div>;
}
export function DriveLinks({value,legacy,compact=false}:{value:unknown;legacy?:string|null;compact?:boolean}){const links=driveLinks(value,legacy);if(!links.length)return null;return <div className={`drive-links-display${compact?' compact':''}`}>{links.map((item,index)=><a key={`${item.url}-${index}`} href={item.url} target="_blank" rel="noreferrer" title={item.url}>{item.label}<ExternalLink size={13}/></a>)}</div>;}
