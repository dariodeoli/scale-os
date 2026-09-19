'use client';

import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ActorIdentity} from './actor-identity';

type Person={id:string|number;full_name?:string|null;email?:string|null;photo_url?:string|null};
type Props={onSubmit:(value:{body:string;mentioned_user_ids:string[]})=>Promise<void>;label?:string;disabled?:boolean};
const errorText=(error:unknown)=>error instanceof Error?error.message:'No se pudieron cargar los integrantes.';
const name=(person:Person)=>person.full_name?.trim()||person.email||'Integrante';
function activeToken(text:string){const found=/(?:^|\s)@([^\s@]*)$/.exec(text);return found?found[1].toLocaleLowerCase('es-PY'):null;}

export function CommentComposer({onSubmit,label='Publicar comentario',disabled=false}:Props){
 const fieldId=useId(),textarea=useRef<HTMLTextAreaElement>(null);
 const [body,setBody]=useState(''),[people,setPeople]=useState<Person[]>([]),[mentions,setMentions]=useState<Map<string,string>>(new Map());
 const [loading,setLoading]=useState(true),[sending,setSending]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(0);
 useEffect(()=>{let live=true;fetch('/core-api/api/agency/productivity/people',{credentials:'include',cache:'no-store'}).then(async response=>{
  const data=await response.json();if(!response.ok)throw Error(typeof data.error==='string'?data.error:'No se pudieron cargar los integrantes');return data;
 }).then(data=>{if(live)setPeople(Array.isArray(data.people)?data.people:[]);}).catch(cause=>{if(live)setError(errorText(cause));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[]);
 const token=activeToken(body);
 const choices=useMemo(()=>token===null?[]:people.filter(person=>{
  const term=(name(person)+' '+(person.email||'')).toLocaleLowerCase('es-PY');return term.includes(token);
 }).slice(0,6),[people,token]);
 useEffect(()=>setActive(0),[token]);
 function change(value:string){setBody(value);setMentions(previous=>new Map(Array.from(previous.entries()).filter(([,display])=>value.includes('@'+display))));}
 function choose(person:Person){
  const current=activeToken(body);if(current===null)return;
  const display=name(person),start=body.lastIndexOf('@'+current);
  const next=body.slice(0,start)+'@'+display+' '+body.slice(start+current.length+1);
  setBody(next);setMentions(previous=>new Map(previous).set(String(person.id),display));requestAnimationFrame(()=>textarea.current?.focus());
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(sending)return;const content=body.trim();if(!content){setError('Escribí un comentario.');return;}
  setSending(true);setError('');
  try{const mentioned_user_ids=Array.from(mentions.entries()).filter(([,display])=>content.includes('@'+display)).map(([id])=>id);await onSubmit({body:content,mentioned_user_ids});setBody('');setMentions(new Map());}
  catch(cause){setError(errorText(cause));}finally{setSending(false);}
 }
 return <form className="comment-composer" onSubmit={submit} aria-busy={sending||undefined}>
  <label htmlFor={fieldId}>Comentario</label>
  <textarea ref={textarea} id={fieldId} value={body} onChange={event=>change(event.target.value)} onKeyDown={event=>{
   if(!choices.length)return;
   if(event.key==='ArrowDown'){event.preventDefault();setActive(value=>(value+1)%choices.length);}
   if(event.key==='ArrowUp'){event.preventDefault();setActive(value=>(value-1+choices.length)%choices.length);}
   if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();const person=choices[active];if(person)choose(person);}
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();}
  }} placeholder="Escribí @ para mencionar a alguien" maxLength={2000} disabled={disabled||sending} aria-describedby={`${fieldId}-help`}/>
  <small id={`${fieldId}-help`} className="form-note">Usá @ para avisar a un integrante. Las personas mencionadas reciben una notificación en esta empresa.</small>
  {token!==null&&<div className="mention-suggestions" role="listbox" aria-label="Personas para mencionar">{loading?<p role="status">Buscando integrantes…</p>:choices.map((person,index)=><button type="button" role="option" aria-selected={active===index} style={active===index?{background:'var(--surface-subtle)'}:undefined} key={person.id} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(person)} disabled={sending}><ActorIdentity name={name(person)} photoUrl={person.photo_url} verified/><span>{person.email&&person.full_name?person.email:null}</span></button>)}{!loading&&!choices.length&&<p className="form-note">No hay integrantes activos que coincidan.</p>}</div>}
  {mentions.size>0&&<div className="mention-selected" aria-label="Personas mencionadas">{Array.from(mentions.entries()).map(([id,display])=><span key={id}>@{display}<button type="button" aria-label={`Quitar mención a ${display}`} onClick={()=>setMentions(previous=>{const next=new Map(previous);next.delete(id);return next;})}>×</button></span>)}</div>}
  {error&&<p className="error" role="alert">{error}</p>}
  <button className="primary" type="submit" disabled={disabled||sending}>{sending?'Publicando…':label}</button>
 </form>;
}
