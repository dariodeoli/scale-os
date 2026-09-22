"use client";
import {useState} from 'react';
import {parseTelefono, whatsappUrl} from 'owncoding-ui';
import {api,Editor} from './operations';
import {Dialog} from './dialog';
import {Pencil} from 'lucide-react';
type Links={website?:string;instagram?:string;whatsapp?:string;other?:{label:string;url:string}[]};
/** Enlace de WhatsApp del teléfono guardado (`+<código> <dígitos>`), conservando su país. */
export function clientWhatsappUrl(phone?:string){
 return phone?whatsappUrl(phone,'',parseTelefono(phone).countryCode):'';
}
export function ClientLinks({id,value,canEdit,refresh,phone}:{id:string;value:unknown;canEdit:boolean;refresh:()=>Promise<void>;phone?:string}){
 const links=(value&&typeof value==='object'?value:{}) as Links,[editing,setEditing]=useState(false);
 const fixed=[['website','Web'],['instagram','Instagram'],['whatsapp','WhatsApp']] as const;
 const generatedWhatsapp=!links.whatsapp?clientWhatsappUrl(phone):null;
 const knownLinks=fixed.flatMap(([key,label])=>typeof links[key]==='string'?[{label,url:links[key]!}]:key==='whatsapp'&&generatedWhatsapp?[{label,url:generatedWhatsapp}]:[]);
 const otherLinks=(Array.isArray(links.other)?links.other:[]).filter(item=>item&&typeof item.url==='string');
 const items=[...knownLinks,...otherLinks];
 return <section className="client-links"><div className="panel-heading"><h3>Enlaces del cliente</h3>{canEdit&&<button className="text-button" onClick={()=>setEditing(true)}><Pencil size={14}/>{items.length?'Editar enlaces':'Agregar enlaces'}</button>}</div><div className="quick-actions">{items.map((item,index)=>item.url.startsWith('https://')&&<a key={index} className="secondary" href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>)}</div>{!items.length&&<p className="form-note">Web, redes y contactos en un solo lugar.</p>}
 {editing&&<Dialog title="Enlaces del cliente" close={()=>setEditing(false)}><p>Pegá los enlaces completos. Para WhatsApp podés usar https://wa.me/ seguido del número con código de país.</p><Editor columns fields={[...fixed.map(([key,label])=>({key,label,type:'url' as const,optional:true})),{key:'other',label:'Otros: nombre | enlace (uno por línea)',type:'textarea',optional:true,wide:true}]} defaults={{website:typeof links.website==='string'?links.website:'',instagram:typeof links.instagram==='string'?links.instagram:'',whatsapp:typeof links.whatsapp==='string'?links.whatsapp:'',other:otherLinks.map(l=>l.label+' | '+l.url).join('\n')}} save={async v=>{const other=v.other.split('\n').filter(l=>l.trim()).map(line=>{const divider=line.indexOf('|');if(divider<1)throw Error('En otros enlaces, usá Nombre | https://…');return{label:line.slice(0,divider).trim(),url:line.slice(divider+1).trim()};});await api('/api/agency/clients/'+id,{social_links:{website:v.website,instagram:v.instagram,whatsapp:v.whatsapp,other}},'PATCH');await refresh();setEditing(false);}}/></Dialog>}</section>;
}
