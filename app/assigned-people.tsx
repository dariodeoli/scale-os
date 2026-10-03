'use client';
import {ActorIdentity,personDisplayName} from './actor-identity';
import './assigned-people.css';

// Server-resolved membership identities, never names matched to imported aliases.
export type AssignedPerson={id:string|number;full_name?:string|null;email?:string|null;photo_url?:string|null;is_primary:boolean};
export type AssignedPeopleProps={people?:AssignedPerson[]|null;source?:'direct'|'project'|null;loading?:boolean;error?:string};
/**
 * Responsables de una pieza o proyecto (#99): una sola línea compacta con el
 * rótulo y los chips de persona, sin caja ni altura reservada. Cuando no hay
 * dato es un texto auxiliar (`Cargando…`, `no disponibles`, `Sin responsables`),
 * nunca un bloque vacío.
 */
export function AssignedPeople({people,source,loading=false,error}:AssignedPeopleProps){
 const available=Array.isArray(people)&&people.every(person=>person&&['string','number'].includes(typeof person.id)&&String(person.id).length>0);
 const inherited=source==='project';
 const ariaLabel=inherited?'Responsables del proyecto':'Responsables asignados';
 if(loading)return <section className="assigned-people" aria-label={ariaLabel} aria-busy={true}><span className="assigned-people-state" role="status">Cargando responsables…</span></section>;
 if(error||!available)return <section className="assigned-people" aria-label={ariaLabel}><span className="assigned-people-state" role="status" title={error||undefined}>Responsables no disponibles{error?`. ${error}`:''}</span></section>;
 return <section className="assigned-people" aria-label={ariaLabel}>
  <span className="assigned-people-label">{inherited?'Responsables del proyecto':'Responsables'}</span>
  {people.length?<ul className="assigned-people-list">{people.map(person=><li className="assigned-person" key={person.id}>
   <ActorIdentity name={personDisplayName(person.full_name?.trim()||person.email,'Integrante sin nombre')} photoUrl={person.photo_url} verified/>
   {person.is_primary&&<span className="assigned-person-primary">{inherited?'Principal del proyecto':'Principal'}</span>}
  </li>)}</ul>:<span className="assigned-people-state">Sin responsables</span>}
 </section>;
}
