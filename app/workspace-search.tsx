"use client";
import {useState} from 'react';
import {Search} from 'lucide-react';
import {Dialog} from './dialog';
import {normalizeSearch} from './control-center-data';
import {ClientIdentity} from './client-identity';
import {ActorIdentity} from './actor-identity';
import type {AssignedPerson} from './assigned-people';
export type SearchRecord={id:string;name:string;context:string;kind:'clients'|'projects'|'work-orders';clientName?:string;clientLogo?:string|null;clientColor?:string|null;assignees?:AssignedPerson[]};
export const searchDestination=(kind:SearchRecord['kind'])=>kind==='clients'?'Clientes':kind==='projects'?'Proyectos':'Producción';
const kindLabel:Record<SearchRecord['kind'],string>={clients:'Cliente',projects:'Proyecto','work-orders':'Orden'};
function SearchAssignees({people=[]}:{people?:AssignedPerson[]}){
 const visible=people.slice(0,4);
 if(!visible.length)return null;
 return <div className="search-result-assignees" aria-label={`Responsables: ${visible.map(person=>person.full_name||person.email||'Integrante').join(', ')}`}><span>Responsables</span><div>{visible.map(person=><ActorIdentity key={person.id} name={person.full_name||person.email||'Integrante'} photoUrl={person.photo_url} verified/>)}</div>{people.length>visible.length&&<small>+{people.length-visible.length}</small>}</div>;
}
export function WorkspaceSearch({records,navigate}:{records:SearchRecord[];navigate:(label:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const term=normalizeSearch(query),matches=term?records.filter(r=>normalizeSearch(`${r.name} ${r.context}`).includes(term)):[];
 return <><button className="workspace-search-trigger" aria-label="Buscar clientes, proyectos y órdenes" onClick={()=>setOpen(true)}><Search size={17}/><span>Buscar cliente, proyecto u orden</span></button>{open&&<Dialog title="Buscar en esta empresa" close={()=>setOpen(false)}><label className="search-field">Nombre, cliente o proyecto<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Escribí para buscar…"/></label><p className="form-note" role="status">{term?`${matches.length} resultados${matches.length>30?' · mostrando los primeros 30':''}`:'Buscá entre los clientes, proyectos y órdenes de la empresa actual.'}</p><div className="search-results">{matches.slice(0,30).map(r=>{const destination=searchDestination(r.kind);return <article key={`${r.kind}-${r.id}`}><div className="search-result-main"><ClientIdentity compact name={r.clientName||r.name} logo={r.clientLogo} color={r.clientColor}/><div><small>{kindLabel[r.kind]}</small><h3>{r.name}</h3><p>{r.context}</p></div></div><SearchAssignees people={r.assignees}/><button className="text-button" onClick={()=>{navigate(destination);setOpen(false);}}>Ver {destination.toLocaleLowerCase('es')} →</button></article>;})}</div></Dialog>}</>;
}
