'use client';

import {useId} from 'react';
import {Selector} from './ui/select';
import './assignee-picker.css';
import {PersonContainer} from './person-container';
import {isTechnicalDemoEmail,personDisplayName} from './actor-identity';

export type AssigneeMember={id:string|number;full_name?:string|null;email?:string;photo_url?:string|null;active:boolean;removed_at?:string|null};
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
 const id=useId();
 const selected=assigneeSelection(value.assigned_user_ids,value.assigned_user_id);
 const options=new Map<string,AssigneeMember>();
 for(const member of members){const person=key(member.id);if(person&&member.active===true&&!member.removed_at&&!options.has(person))options.set(person,member);}
 // Nunca se muestra el correo técnico del demo como identidad (#151): cae al
 // nombre y, si falta, a la etiqueta base; el contacto técnico queda oculto.
 const secondary=(member?:AssigneeMember)=>member?.full_name&&member?.email&&!isTechnicalDemoEmail(member.email)?member.email:undefined;
 const name=(person:string)=>{const member=options.get(person);return personDisplayName(member?.full_name?.trim()||member?.email,'Persona no disponible');};
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
   <PersonContainer size="sm" name={name(person)} photoUrl={options.get(person)?.photo_url} secondary={secondary(options.get(person))} verified/>
   <button type="button" className="assignee-primary" disabled={locked||!options.has(person)} aria-pressed={selected.assigned_user_id===person} aria-label={`Usar como principal: ${name(person)}`} onClick={()=>{if(!locked&&options.has(person))onChange({...selected,assigned_user_id:person});}}>{selected.assigned_user_id===person?'Principal':'Hacer principal'}</button>
   <button type="button" className="assignee-remove" disabled={locked} aria-label={`Quitar a ${name(person)}`} title={`Quitar a ${name(person)}`} onClick={()=>toggle(person)}>×</button>
  </li>)}</ul>:<p className="assignee-help">Sin responsables asignados.</p>}
  <Selector label={label} hideLabel presentation="inline" variant="person" multiple value={selected.assigned_user_ids}
   onChange={ids=>{if(!locked)onChange(assigneeSelection(ids,selected.assigned_user_id));}}
   options={Array.from(options,([person,member])=>({value:person,primary:name(person),secondary:secondary(member),avatarUrl:member.photo_url,kind:'person' as const,searchText:isTechnicalDemoEmail(member.email)?member.full_name||'':member.email,disabled:selected.assigned_user_ids.length>=100&&!selected.assigned_user_ids.includes(person)}))}
   searchable searchLabel="Buscar integrante" searchPlaceholder="Nombre o correo" disabled={disabled} loading={loading}
   loadingLabel="Cargando integrantes…" emptyLabel="No hay integrantes activos disponibles." noResultsLabel="No hay integrantes que coincidan."
   showMissingSelection={false} optionsClassName="assignee-options" optionClassName="assignee-option"
   renderOption={option=><span><PersonContainer name={option.primary} photoUrl={option.avatarUrl} secondary={option.secondary} verified/></span>}/>
  {selected.assigned_user_ids.some(person=>!options.has(person))&&!loading?<p role="status">Hay personas sin acceso activo. Quitalas de la selección antes de guardar.</p>:null}
  {selected.assigned_user_ids.length>=100?<p role="status">Máximo 100 responsables.</p>:null}
  {error?<p className="error" role="alert" id={`${id}-error`}>{error}</p>:null}
 </fieldset>;
}
