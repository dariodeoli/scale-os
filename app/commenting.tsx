"use client";

import {useEffect,useRef,useState} from 'react';
import {api} from './operations';
import {PersonContainer} from './person-container';
import './commenting.css';

export type CommentPerson={id:string;full_name?:string|null;email?:string|null;photo_url?:string|null};
const displayName=(person:CommentPerson)=>person.full_name?.trim()||person.email?.trim()||'Integrante';
const urlPattern=/(https?:\/\/[^\s<>]+)/g;
const namedLinkPattern=/\[([^\]\n]{1,120})\]\((https:\/\/[^\s)]+)\)/g;
export function namedHttpsLink(label:string,url:string){
 const name=label.trim().replace(/[\[\]\n]/g,' '),value=url.trim();
 let parsed:URL;
 try{parsed=new URL(value);}catch{throw new Error('Ingresá un enlace HTTPS válido.');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||name.length<2)throw new Error('Indicá un nombre y un enlace HTTPS válido.');
 return `[${name.slice(0,120)}](${parsed.toString()})`;
}

export function CommentBody({value}:{value:string}){
 const parts=value.split(namedLinkPattern);
 return <p className="comment-body">{parts.map((part,index)=>{
  if(index%3===1){const url=parts[index+1];return <a className="comment-link-chip" key={index} href={url} target="_blank" rel="noreferrer">{part}</a>;}
  if(index%3===2)return null;
  return part.split(urlPattern).map((segment,urlIndex)=>{
   if(/^https?:\/\//.test(segment))return <a key={`${index}-${urlIndex}`} href={segment} target="_blank" rel="noreferrer">{segment}</a>;
   return segment.split(/(@[\wÀ-ÿ][\wÀ-ÿ .'-]*)/g).map((item,mentionIndex)=>item.startsWith('@')?<mark className="comment-mention" key={`${index}-${urlIndex}-${mentionIndex}`}>{item}</mark>:item);
  });
 })}</p>;
}

export function CommentComposer({label='Comentario',save}:{label?:string;save:(body:string,mentionedUserIds:string[])=>Promise<void>}){
 const [body,setBody]=useState(''),[people,setPeople]=useState<CommentPerson[]>([]),[mentions,setMentions]=useState<Map<string,string>>(new Map()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(0),[linkLabel,setLinkLabel]=useState(''),[linkUrl,setLinkUrl]=useState('');
 const textarea=useRef<HTMLTextAreaElement|null>(null),nextCursor=useRef<number|null>(null);
 useEffect(()=>{let alive=true;void api<{people:CommentPerson[]}>('/api/agency/productivity/people').then(data=>{if(alive)setPeople(Array.isArray(data.people)?data.people:[]);}).catch(()=>{if(alive)setPeople([]);});return()=>{alive=false;};},[]);
 useEffect(()=>{if(nextCursor.current===null||!textarea.current)return;textarea.current.setSelectionRange(nextCursor.current,nextCursor.current);nextCursor.current=null;},[body]);
 const before=body.slice(0,textarea.current?.selectionStart??body.length);
 const at=before.lastIndexOf('@');
 const query=at>=0&&(at===0||/\s/.test(before[at-1]))?before.slice(at+1):'';
 const mentioning=at>=0&&(at===0||/\s/.test(before[at-1]))&&!/\s/.test(query);
 const suggestions=mentioning?people.filter(person=>`${displayName(person)} ${person.email||''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))).slice(0,6):[];
 useEffect(()=>setActive(0),[query]);
 function choose(person:CommentPerson){
  const cursor=textarea.current?.selectionStart??body.length;
  const end=textarea.current?.selectionEnd??cursor;
  const name=displayName(person);
  const next=`${body.slice(0,at)}@${name} ${body.slice(end)}`;
  nextCursor.current=at+name.length+2;setBody(next);setMentions(previous=>new Map(previous).set(String(person.id),name));setActive(0);
 }
 function addLink(){try{const link=namedHttpsLink(linkLabel,linkUrl);setBody(current=>`${current}${current&& !/\s$/.test(current)?' ':''}${link}`);setLinkLabel('');setLinkUrl('');setError('');textarea.current?.focus();}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo agregar el enlace.');}}
 return <form className="comment-composer" onSubmit={async event=>{event.preventDefault();const content=body.trim();if(!content||busy)return;setBusy(true);setError('');try{const mentionedUserIds=Array.from(mentions).filter(([,name])=>content.includes('@'+name)).map(([id])=>id);await save(content,mentionedUserIds);setBody('');setMentions(new Map());}catch(e){setError(e instanceof Error?e.message:'No se pudo publicar el comentario.');}finally{setBusy(false);}}}>
  <label>{label}<textarea ref={textarea} value={body} disabled={busy} placeholder="Escribí una actualización. Usá @ para mencionar a alguien." onChange={event=>{setBody(event.target.value);setMentions(previous=>new Map(Array.from(previous).filter(([,name])=>event.target.value.includes('@'+name))));}} onKeyDown={event=>{
   if(!suggestions.length)return;
   if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>(value+1)%suggestions.length);}
   if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>(value-1+suggestions.length)%suggestions.length);}
   if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();choose(suggestions[active]);}
   if(event.key==='Escape'){event.preventDefault();textarea.current?.setSelectionRange(body.length,body.length);}
  }}/></label>
   {suggestions.length>0&&<div className="mention-menu" role="listbox" aria-label="Personas para mencionar">{suggestions.map((person,index)=><button type="button" role="option" aria-selected={active===index} className={active===index?'active':''} key={person.id} onMouseDown={event=>{event.preventDefault();choose(person);}}><PersonContainer size="sm" name={displayName(person)} photoUrl={person.photo_url} secondary={person.email||undefined} verified/></button>)}</div>}
  <fieldset className="comment-link-fields"><legend>Enlace con nombre</legend><label>Nombre visible<input value={linkLabel} maxLength={120} disabled={busy} onChange={event=>setLinkLabel(event.target.value)} placeholder="Brief aprobado"/></label><label>URL HTTPS<input value={linkUrl} type="url" inputMode="url" disabled={busy} onChange={event=>setLinkUrl(event.target.value)} placeholder="https://…"/></label><button type="button" className="secondary" disabled={busy||!linkLabel.trim()||!linkUrl.trim()} onClick={addLink}>Agregar enlace</button></fieldset>
  <div className="inline-actions"><small className="form-note">Enter agrega la mención elegida · Shift + Enter crea una línea.</small><button className="primary" disabled={busy||!body.trim()}>{busy?'Publicando…':'Publicar comentario'}</button></div>
  {error&&<p role="alert" className="error">{error}</p>}
 </form>;
}
