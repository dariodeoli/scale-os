'use client';
import {ActorAvatar,ActorIdentity,personDisplayName,safePhoto} from './actor-identity';
import './assigned-people.css';

// Server-resolved membership identities, never names matched to imported aliases.
export type AssignedPerson={id:string|number;full_name?:string|null;email?:string|null;photo_url?:string|null;is_primary:boolean};
export type AssignedPeopleProps={people?:AssignedPerson[]|null;source?:'direct'|'project'|null;loading?:boolean;error?:string;compact?:boolean};
/**
 * Responsables de una pieza o proyecto (#99): una sola línea compacta con el
 * rótulo y los chips de persona, sin caja ni altura reservada. Cuando no hay
 * dato es un texto auxiliar (`Cargando…`, `no disponibles`, `Sin responsables`),
 * nunca un bloque vacío.
 */
/**
 * Variante `compact` (filas finas de lista): avatares apilados + el primer
 * nombre (el principal primero) + «+N», en una sola línea de 24 px. El detalle
 * completo (todos los nombres y quién es principal) queda en el `title`.
 */
function CompactPeople({people,inherited,ariaLabel}:{people:AssignedPerson[];inherited:boolean;ariaLabel:string}){
 if(!people.length)return <section className="assigned-people assigned-people-compact" aria-label={ariaLabel}><span className="assigned-people-state">Sin responsables</span></section>;
 const ordered=[...people].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary));
 const names=ordered.map(person=>personDisplayName(person.full_name?.trim()||person.email,'Integrante sin nombre'));
 const detail=ordered.map((person,index)=>`${names[index]}${person.is_primary?` (${inherited?'principal del proyecto':'principal'})`:''}`).join(', ');
 return <section className="assigned-people assigned-people-compact" aria-label={ariaLabel} title={detail}>
  <span className="assigned-people-stack" aria-hidden="true">{ordered.slice(0,3).map((person,index)=><ActorAvatar key={person.id} name={names[index]} photo={safePhoto(person.photo_url)}/>)}</span>
  <span className="assigned-people-names">{names[0]}</span>
  {ordered.length>1?<span className="assigned-people-more">{`+${ordered.length-1}`}</span>:null}
  <span className="sr-only">{detail}</span>
 </section>;
}

export function AssignedPeople({people,source,loading=false,error,compact=false}:AssignedPeopleProps){
 const available=Array.isArray(people)&&people.every(person=>person&&['string','number'].includes(typeof person.id)&&String(person.id).length>0);
 const inherited=source==='project';
 const ariaLabel=inherited?'Responsables del proyecto':'Responsables asignados';
 if(loading)return <section className="assigned-people" aria-label={ariaLabel} aria-busy={true}><span className="assigned-people-state" role="status">Cargando responsables…</span></section>;
 if(error||!available)return <section className="assigned-people" aria-label={ariaLabel}><span className="assigned-people-state" role="status" title={error||undefined}>Responsables no disponibles{error?`. ${error}`:''}</span></section>;
 if(compact)return <CompactPeople people={people} inherited={inherited} ariaLabel={ariaLabel}/>;
 return <section className="assigned-people" aria-label={ariaLabel}>
  <span className="assigned-people-label">{inherited?'Responsables del proyecto':'Responsables'}</span>
  {people.length?<ul className="assigned-people-list">{people.map(person=><li className="assigned-person" key={person.id}>
   <ActorIdentity name={personDisplayName(person.full_name?.trim()||person.email,'Integrante sin nombre')} photoUrl={person.photo_url} verified/>
   {person.is_primary&&<span className="assigned-person-primary">{inherited?'Principal del proyecto':'Principal'}</span>}
  </li>)}</ul>:<span className="assigned-people-state">Sin responsables</span>}
 </section>;
}
