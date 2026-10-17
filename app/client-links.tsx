"use client";
import {parseTelefono, whatsappUrl} from 'owncoding-ui/core';
type Links={website?:string;instagram?:string;whatsapp?:string;other?:{label:string;url:string}[]};
/** Enlace de WhatsApp del teléfono guardado (`+<código> <dígitos>`), conservando su país. */
export function clientWhatsappUrl(phone?:string){
 return phone?whatsappUrl(phone,'',parseTelefono(phone).countryCode):'';
}
/** Valores iniciales del editor de enlaces (ClientEditor, sección «Enlaces»). */
export function clientLinksDefaults(value:unknown):Record<'website'|'instagram'|'whatsapp'|'other',string>{
 const links=(value&&typeof value==='object'?value:{}) as Links;
 const other=(Array.isArray(links.other)?links.other:[]).filter(item=>item&&typeof item.url==='string');
 return {website:typeof links.website==='string'?links.website:'',instagram:typeof links.instagram==='string'?links.instagram:'',whatsapp:typeof links.whatsapp==='string'?links.whatsapp:'',other:other.map(l=>l.label+' | '+l.url).join('\n')};
}
/** Arma `social_links` desde el editor; «Nombre | https://…» por línea en «Otros». */
export function buildSocialLinks(v:Record<string,string>){
 const other=(v.other||'').split('\n').filter(l=>l.trim()).map(line=>{const divider=line.indexOf('|');if(divider<1)throw Error('En otros enlaces, usá Nombre | https://…');return{label:line.slice(0,divider).trim(),url:line.slice(divider+1).trim()};});
 return {website:v.website||'',instagram:v.instagram||'',whatsapp:v.whatsapp||'',other};
}
/** Resumen de solo lectura de la ficha; la edición vive en ClientEditor. */
export function ClientLinks({value,phone}:{value:unknown;phone?:string}){
 const links=(value&&typeof value==='object'?value:{}) as Links;
 const fixed=[['website','Web'],['instagram','Instagram'],['whatsapp','WhatsApp']] as const;
 const generatedWhatsapp=!links.whatsapp?clientWhatsappUrl(phone):null;
 const knownLinks=fixed.flatMap(([key,label])=>typeof links[key]==='string'?[{label,url:links[key]!}]:key==='whatsapp'&&generatedWhatsapp?[{label,url:generatedWhatsapp}]:[]);
 const otherLinks=(Array.isArray(links.other)?links.other:[]).filter(item=>item&&typeof item.url==='string');
 const items=[...knownLinks,...otherLinks];
 return <section className="client-links"><div className="panel-heading"><h3>Enlaces del cliente</h3></div><div className="quick-actions">{items.map((item,index)=>item.url.startsWith('https://')&&<a key={index} className="secondary" href={item.url} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>)}</div>{!items.length&&<p className="form-note">Sin enlaces cargados. Se agregan desde Editar cliente.</p>}</section>;
}
