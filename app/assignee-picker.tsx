'use client';

import {useId,useState} from 'react';
import './assignee-picker.css';

export type AssigneeMember={id:string|number;full_name?:string|null;email?:string;active:boolean;removed_at?:string|null};
export type AssigneeSelection={assigned_user_ids:string[];assigned_user_id:string|null};
export type AssigneeSnapshot=AssigneeSelection&{assignee_version:string};
export type AssigneePickerProps={
 members:AssigneeMember[];
 value:AssigneeSelection;
 onChange:(value:AssigneeSelection)=>void;
 disabled?:boolean;
 loading?:boolean;
 error?:string;
 label?:string;
};
function key(value:string|number){
 if(typeof value==='number'&&!Number.isSafeInteger(value))return '';
 const raw=String(value);if(!/^\d{1,30}$/.test(raw))return '';
 const normalized=raw.replace(/^0+/,'');
 return normalized&&normalized.length<=19&&(normalized.length<19||normalized<='9223372036854775807')?normalized:'';
}
export function assigneeSelection(ids:readonly (string|number)[],primary?:string|number|null):AssigneeSelection{
 const selected=Array.from(new Set(ids.map(key).filter(Boolean))),main=primary==null?'':key(primary);
 return {assigned_user_ids:selected,assigned_user_id:selected.includes(main)?main:selected[0]??null};
}

// Controlled, network-free field: the parent owns the tenant, loading and save lifecycle.
export function AssigneePicker({members,value,onChange,disabled=false,loading=false,error,label='Responsables'}:AssigneePickerProps){
 const id=useId(),[search,setSearch]=useState('');
 const selected=assigneeSelection(value.assigned_user_ids,value.assigned_user_id);
 const options=new Map<string,AssigneeMember>();
 for(const member of members){const person=key(member.id);if(person&&member.active===true&&!member.removed_at&&!options.has(person))options.set(person,member);}
 const name=(person:string)=>{const member=options.get(person);return member?.full_name?.trim()||member?.email||'Persona no disponible';};
 const query=search.trim().toLocaleLowerCase('es');
 const visible=Array.from(options).filter(([,member])=>`${member.full_name||''} ${member.email||''}`.toLocaleLowerCase('es').includes(query));
 const locked=disabled||loading;
 function toggle(person:string){
  if(locked)return;
  const exists=selected.assigned_user_ids.includes(person);
  if(!exists&&(!options.has(person)||selected.assigned_user_ids.length>=100))return;
  onChange(assigneeSelection(exists?selected.assigned_user_ids.filter(id=>id!==person):[...selected.assigned_user_ids,person],selected.assigned_user_id));
 }
 return <fieldset className="assignee-picker" disabled={locked} aria-busy={loading} aria-describedby={`${id}-help${error?` ${id}-error`:''}`}>
  <legend>{label} <span>({selected.assigned_user_ids.length})</span></legend>
  <p className="assignee-help" id={`${id}-help`}>Podés elegir varias personas. Una queda como responsable principal; sus permisos no cambian.</p>
  {selected.assigned_user_ids.length?<ul className="assignee-selected" aria-label="Responsables seleccionados">{selected.assigned_user_ids.map(person=><li key={person}>
   <span>{name(person)}</span>
   <button type="button" className="assignee-primary" disabled={locked||!options.has(person)} aria-pressed={selected.assigned_user_id===person} aria-label={`Usar como principal: ${name(person)}`} onClick={()=>{if(!locked&&options.has(person))onChange({...selected,assigned_user_id:person});}}>{selected.assigned_user_id===person?'Principal':'Hacer principal'}</button>
   <button type="button" className="assignee-remove" disabled={locked} aria-label={`Quitar a ${name(person)}`} title={`Quitar a ${name(person)}`} onClick={()=>toggle(person)}>×</button>
  </li>)}</ul>:<p className="assignee-help">Sin responsables asignados.</p>}
  <label className="assignee-search" htmlFor={`${id}-search`}>Buscar integrante<input id={`${id}-search`} type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Nombre o correo" autoComplete="off" disabled={locked}/></label>
  {loading?<p role="status">Cargando integrantes…</p>:<div className="assignee-options">{visible.map(([person,member])=><label className="assignee-option" key={person}>
   <input type="checkbox" checked={selected.assigned_user_ids.includes(person)} disabled={locked||selected.assigned_user_ids.length>=100&&!selected.assigned_user_ids.includes(person)} onChange={()=>toggle(person)}/>
   <span>{name(person)}{member.full_name&&member.email?<small>{member.email}</small>:null}</span>
  </label>)}{!visible.length?<p className="assignee-help">{options.size?'No hay integrantes que coincidan.':'No hay integrantes activos disponibles.'}</p>:null}</div>}
  {selected.assigned_user_ids.some(person=>!options.has(person))&&!loading?<p role="status">Hay personas sin acceso activo. Quitalas de la selección antes de guardar.</p>:null}
  {selected.assigned_user_ids.length>=100?<p role="status">Máximo 100 responsables.</p>:null}
  {error?<p className="error" role="alert" id={`${id}-error`}>{error}</p>:null}
 </fieldset>;
}
