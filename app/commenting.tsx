"use client";

import {useEffect,useRef,useState} from 'react';
import {api} from './operations';
import './commenting.css';

export type CommentPerson={id:string;full_name?:string|null;email?:string|null;photo_url?:string|null};
const displayName=(person:CommentPerson)=>person.full_name?.trim()||person.email?.trim()||'Integrante';
const urlPattern=/(https?:\/\/[^\s<>]+)/g;

export function CommentBody({value}:{value:string}){
 const parts=value.split(urlPattern);
 return <p className="comment-body">{parts.map((part,index)=>{
  if(/^https?:\/\//.test(part))return <a key={index} href={part} target="_blank" rel="noreferrer">{part}</a>;
  const mentionParts=part.split(/(@[\wÀ-ÿ][\wÀ-ÿ .'-]*)/g);
  return mentionParts.map((item,mentionIndex)=>item.startsWith('@')?<mark className="comment-mention" key={`${index}-${mentionIndex}`}>{item}</mark>:item);
 })}</p>;
}

export function CommentComposer({label='Comentario',save}:{label?:string;save:(body:string)=>Promise<void>}){
 const [body,setBody]=useState(''),[people,setPeople]=useState<CommentPerson[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(0);
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
  nextCursor.current=at+name.length+2;setBody(next);setActive(0);
 }
 return <form className="comment-composer" onSubmit={async event=>{event.preventDefault();const content=body.trim();if(!content||busy)return;setBusy(true);setError('');try{await save(content);setBody('');}catch(e){setError(e instanceof Error?e.message:'No se pudo publicar el comentario.');}finally{setBusy(false);}}}>
  <label>{label}<textarea ref={textarea} value={body} disabled={busy} placeholder="Escribí una actualización. Usá @ para mencionar a alguien." onChange={event=>setBody(event.target.value)} onKeyDown={event=>{
   if(!suggestions.length)return;
   if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>(value+1)%suggestions.length);}
   if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>(value-1+suggestions.length)%suggestions.length);}
   if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();choose(suggestions[active]);}
   if(event.key==='Escape'){event.preventDefault();textarea.current?.setSelectionRange(body.length,body.length);}
  }}/></label>
  {suggestions.length>0&&<div className="mention-menu" role="listbox" aria-label="Personas para mencionar">{suggestions.map((person,index)=><button type="button" role="option" aria-selected={active===index} className={active===index?'active':''} key={person.id} onMouseDown={event=>{event.preventDefault();choose(person);}}>{person.photo_url?<img src={person.photo_url} alt=""/>:<span>{displayName(person)[0]}</span>}<b>{displayName(person)}</b>{person.email&&<small>{person.email}</small>}</button>)}</div>}
  <div className="inline-actions"><small className="form-note">Enter agrega la mención elegida · Shift + Enter crea una línea.</small><button className="primary" disabled={busy||!body.trim()}>{busy?'Publicando…':'Publicar comentario'}</button></div>
  {error&&<p role="alert" className="error">{error}</p>}
 </form>;
}
