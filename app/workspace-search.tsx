"use client";
import {useState} from 'react';
import {Search} from 'lucide-react';
import {Dialog} from './dialog';
import {RecordEditor} from './suite';
import {normalizeSearch} from './control-center-data';
export type SearchRecord={id:string;name:string;context:string;kind:'clients'|'projects'|'work-orders'};
export const searchDestination=(kind:SearchRecord['kind'])=>kind==='clients'?'Clientes':kind==='projects'?'Proyectos':'Producción';
export function WorkspaceSearch({records,role,refresh,navigate}:{records:SearchRecord[];role:string;refresh:()=>Promise<void>;navigate:(label:string)=>void}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const term=normalizeSearch(query),matches=term?records.filter(r=>normalizeSearch(`${r.name} ${r.context}`).includes(term)):[];
 return <><button className="workspace-search-trigger" aria-label="Buscar clientes, proyectos y órdenes" onClick={()=>setOpen(true)}><Search size={17}/><span>Buscar cliente, proyecto u orden</span></button>{open&&<Dialog title="Buscar en esta empresa" close={()=>setOpen(false)}><label className="search-field">Nombre, cliente o proyecto<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Escribí para buscar…"/></label><p className="form-note" role="status">{term?`${matches.length} resultados${matches.length>30?' · mostrando los primeros 30':''}`:'Buscá entre los clientes, proyectos y órdenes de la empresa actual.'}</p><div className="search-results">{matches.slice(0,30).map(r=><article key={`${r.kind}-${r.id}`}><div><h3>{r.name}</h3><p>{r.context}</p></div><RecordEditor kind={r.kind} recordId={r.id} name={r.name} role={role} refresh={refresh}/><button className="text-button" onClick={()=>{navigate(searchDestination(r.kind));setOpen(false);}}>Ir a {searchDestination(r.kind).toLocaleLowerCase('es')} →</button></article>)}</div></Dialog>}</>;
}
