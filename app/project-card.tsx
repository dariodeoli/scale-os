'use client';
import {UrgencyBadge} from './urgency';
import {useEffect,useRef,type ReactNode} from 'react';
import {ClientIdentity} from './client-identity';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import './project-card.css';

export type ProjectAssignee=AssignedPerson;
export function ProjectCard({project,client,children}:{project:{id:string;urgency?:number|null;name:string;client_name:string;status:string;work_order_count:number;drive_url:string|null;assignees?:ProjectAssignee[]};client?:{logo_url?:string|null;color_key?:string};children:ReactNode}){
 const anchor=`project-${project.id}`,card=useRef<HTMLElement>(null);
 useEffect(()=>{
  const reveal=()=>{
   if(window.location.hash!==`#${anchor}`)return;
   card.current?.scrollIntoView({block:'center',behavior:'instant'});
   card.current?.focus({preventScroll:true});
  };
  // The browser may have processed the fragment before async project data arrived.
  reveal();
  window.addEventListener('hashchange',reveal);
  return()=>window.removeEventListener('hashchange',reveal);
 },[anchor]);
 return <article id={anchor} ref={card} tabIndex={-1} className="project-entry">
  <div className="project-entry-title"><h3>{project.name}</h3><ClientIdentity name={project.client_name} logo={client?.logo_url} color={client?.color_key}/></div>
  <div className="project-entry-meta"><span className="client-status" data-status={project.status}>{{active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'}[project.status]||project.status}</span><small>{project.work_order_count} piezas</small><UrgencyBadge value={project.urgency}/></div>
  <div className="project-entry-assignees"><AssignedPeople people={project.assignees}/></div>
  <div className="project-entry-actions">{project.drive_url?<a href={project.drive_url} target="_blank" rel="noreferrer">Abrir Drive ↗</a>:<small>Sin Drive</small>}{children}</div>
 </article>;
}
