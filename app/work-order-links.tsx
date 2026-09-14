"use client";
import {useEffect,useState,type FormEvent} from 'react';
import {api} from './operations';

type LinkRecord={id:string;label:string;url:string;created_at:string};
const writers=['owner','admin','management','production','editor'];
function httpsUrl(value:string){try{const url=new URL(value.trim());return url.protocol==='https:'&&!url.username&&!url.password?url.toString():null;}catch{return null;}}
export function WorkOrderLinks({orderId,role}:{orderId:string;role:string}){
 const [links,setLinks]=useState<LinkRecord[]>([]),[label,setLabel]=useState(''),[url,setUrl]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const canEdit=writers.includes(role);
 async function load(){try{setLinks((await api<{links:LinkRecord[]}>(`/api/agency/work-orders/${orderId}/links`)).links);setError('');}catch(cause){setError(cause instanceof Error?cause.message:'No se pudieron cargar los enlaces.');}}
 useEffect(()=>{void load();},[orderId]);
 async function submit(event:FormEvent){event.preventDefault();const href=httpsUrl(url);if(!href||label.trim().length<2){setError('Indicá un nombre y un enlace HTTPS válido.');return;}setBusy(true);setError('');try{await api(`/api/agency/work-orders/${orderId}/links`,{label:label.trim(),url:href});setLabel('');setUrl('');await load();}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo guardar el enlace.');}finally{setBusy(false);}}
 return <section className="work-order-links" aria-label="Enlaces de la pieza"><h3>Enlaces de trabajo</h3><p className="form-note">Enlaces HTTPS con nombre para esta pieza. No exponen accesos ni credenciales.</p>{links.length?<div className="work-order-link-list">{links.map(link=><a className="comment-link-chip" key={link.id} href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>:<p className="form-note">Todavía no hay enlaces guardados.</p>}{canEdit?<form className="work-order-link-form" onSubmit={submit}><label>Nombre<input value={label} maxLength={120} disabled={busy} onChange={event=>setLabel(event.target.value)} placeholder="Guion final"/></label><label>URL HTTPS<input value={url} type="url" inputMode="url" disabled={busy} onChange={event=>setUrl(event.target.value)} placeholder="https://…"/></label><button className="secondary" disabled={busy||!label.trim()||!url.trim()}>{busy?'Guardando…':'Agregar enlace'}</button></form>:null}{error?<p role="alert" className="error">{error}</p>:null}</section>;
}
