'use client';
import type {ReactNode} from 'react';
import {ClientIdentity} from './client-identity';
import {ActorIdentity} from './actor-identity';
import './project-card.css';

export type ProjectAssignee={id:string;full_name:string;photo_url?:string|null;is_primary:boolean};
export function ProjectCard({project,client,children}:{project:{name:string;client_name:string;status:string;work_order_count:number;drive_url:string|null;assignees?:ProjectAssignee[]};client?:{logo_url?:string|null;color_key?:string};children:ReactNode}){
 const people=project.assignees;
 return <article className="project-entry">
  <div className="project-entry-title"><h3>{project.name}</h3><ClientIdentity name={project.client_name} logo={client?.logo_url} color={client?.color_key}/></div>
  <div className="project-entry-meta"><span className="client-status" data-status={project.status}>{{active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'}[project.status]||project.status}</span><small>{project.work_order_count} piezas</small></div>
  <div className="project-entry-assignees" aria-label="Responsables">{people?.length?<>{people.slice(0,3).map(person=><div key={person.id}><ActorIdentity name={person.full_name} photoUrl={person.photo_url} verified/>{person.is_primary&&<small>Principal</small>}</div>)}{people.length>3&&<small title={people.slice(3).map(person=>person.full_name).join(', ')}>+{people.length-3} responsables</small>}</>:<small>{people?'Sin responsables':'Responsables no disponibles'}</small>}</div>
  <div className="project-entry-actions">{project.drive_url?<a href={project.drive_url} target="_blank" rel="noreferrer">Abrir Drive ↗</a>:<small>Sin Drive</small>}{children}</div>
 </article>;
}
