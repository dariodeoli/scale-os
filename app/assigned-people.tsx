'use client';
import {ActorIdentity} from './actor-identity';
import './assigned-people.css';

// Server-resolved membership identities, never names matched to imported aliases.
export type AssignedPerson={id:string|number;full_name?:string|null;email?:string|null;photo_url?:string|null;is_primary:boolean};
export type AssignedPeopleProps={people?:AssignedPerson[]|null;source?:'direct'|'project'|null;loading?:boolean;error?:string};
export function AssignedPeople({people,source,loading=false,error}:AssignedPeopleProps){
 const available=Array.isArray(people)&&people.every(person=>person&&['string','number'].includes(typeof person.id)&&String(person.id).length>0);
 const inherited=source==='project';
 return <section className="assigned-people" aria-label={inherited?'Responsables del proyecto':'Responsables asignados'} aria-busy={loading||undefined}>
  <span className="assigned-people-label">{inherited?'Responsables del proyecto':'Responsables'}</span>
  {loading?<p className="assigned-people-state" role="status">Cargando responsables…</p>:error||!available?<p className="assigned-people-state" role="status">Responsables no disponibles{error?`. ${error}`:''}</p>:people.length===0?<p className="assigned-people-state">Sin responsables</p>:<ul className="assigned-people-list">{people.map(person=><li className="assigned-person" key={person.id}>
   <ActorIdentity name={person.full_name?.trim()||person.email?.trim()||'Integrante sin nombre'} photoUrl={person.photo_url} verified/>
   {person.is_primary&&<span className="assigned-person-primary">{inherited?'Principal del proyecto':'Principal'}</span>}
  </li>)}</ul>}
 </section>;
}
