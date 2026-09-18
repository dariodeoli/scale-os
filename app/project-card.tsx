'use client';
import {UrgencyBadge} from './urgency';
import {useEffect,useRef,type ReactNode} from 'react';
import {ClientIdentity} from './client-identity';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import {listDateShort,dueTone} from './list-format';
import './project-card.css';

export type ProjectAssignee=AssignedPerson;
export function ProjectCard({project,client,children,selectable=false,selected=false,onSelect}:{project:{id:string;urgency?:number|null;name:string;client_name:string;status:string;work_order_count:number;drive_url:string|null;start_date?:string|null;due_date?:string|null;assignees?:ProjectAssignee[]};client?:{logo_url?:string|null;color_key?:string};children:ReactNode;selectable?:boolean;selected?:boolean;onSelect?:()=>void}){
 const anchor=`project-${project.id}`,card=useRef<HTMLElement>(null);
 const shortDate=(value?:string|null)=>value?String(value).slice(0,10).split('-').reverse().slice(0,2).join('/'):null;
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
  <div className="project-entry-title">{selectable?<label className="select-check" title="Seleccionar proyecto"><input type="checkbox" aria-label={`Seleccionar ${project.name}`} checked={selected} onChange={()=>onSelect?.()}/></label>:null}<h3 title={project.name}>{project.name}</h3><ClientIdentity name={project.client_name} logo={client?.logo_url} color={client?.color_key}/></div>
  <div className="project-entry-meta"><span className="client-status" data-status={project.status}>{{active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'}[project.status]||project.status}</span><UrgencyBadge value={project.urgency}/></div>
  <dl className="project-entry-facts">
   <div><dt>Inicio</dt><dd className="list-date">{listDateShort(project.start_date)||'Sin fecha'}</dd></div>
   <div><dt>Entrega</dt><dd className="list-date" data-tone={dueTone(project.due_date)||undefined}>{listDateShort(project.due_date)||'Sin fecha'}</dd></div>
   <div><dt>Piezas</dt><dd>{project.work_order_count}</dd></div>
  </dl>
  <div className="project-entry-assignees"><AssignedPeople people={project.assignees}/></div>
  <div className="project-entry-actions">{project.drive_url?<a href={project.drive_url} target="_blank" rel="noreferrer">Abrir Drive ↗</a>:<small>Sin Drive</small>}{children}</div>
 </article>;
}
