"use client";
import {SelectCustom} from '../profile-controls';
import {BATCH_LIMITS} from '../capabilities';
import type {Dispatch, ReactNode, SetStateAction} from 'react';
import type {Client, Project} from '../workspace-types';

// Proyectos (entregas y capacidad).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y JSX, sin cambios.
type ProyectosSectionProps = {
  setToast: Dispatch<SetStateAction<string>>;
  projectView: string;
  selectedProjects: string[];
  setSelectedProjects: Dispatch<SetStateAction<string[]>>;
  projectsState: 'loading'|'ready'|'error';
  canManageProjects: boolean;
  bulkBusy: boolean;
  clients: Client[];
  projects: Project[];
  projectClientFilter: string;
  setProjectClientFilter: Dispatch<SetStateAction<string>>;
  projectKpis: {active:number;paused:number;completed:number;pieces:number};
  visibleProjects: Project[];
  liveProjects: Project[];
  archivedProjects: Project[];
  load: () => Promise<void>;
  selectVisibleProjects: () => void;
  batchProjects: (archived: boolean) => Promise<void>;
  projectEntry: (project: Project) => ReactNode;
};
export function ProyectosSection({setToast, bulkBusy, projectView, selectedProjects, setSelectedProjects, projectsState, canManageProjects, clients, projects, projectClientFilter, setProjectClientFilter, projectKpis, visibleProjects, liveProjects, archivedProjects, load, selectVisibleProjects, batchProjects, projectEntry}: ProyectosSectionProps){
  return (
    <section className="panel directory">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">ENTREGAS Y CAPACIDAD</p>
                <h2>{liveProjects.length} proyecto{liveProjects.length === 1 ? "" : "s"}</h2>
              </div>
              <SelectCustom label="Cliente" choices={[{value:'',label:'Todos'},...clients.map(client=>({value:String(client.id),label:client.name}))]} value={projectClientFilter} onChange={setProjectClientFilter}/>
            </div>
            <div className="kpi-strip" aria-label="Métricas de proyectos">
              <article className="kpi-card tone-green">
                <p className="eyebrow">ACTIVOS</p>
                <strong>{projectKpis.active}</strong>
                <small>Con trabajo en curso</small>
              </article>
              <article className="kpi-card tone-warning">
                <p className="eyebrow">PAUSADOS</p>
                <strong>{projectKpis.paused}</strong>
                <small>Sin producción activa</small>
              </article>
              <article className="kpi-card tone-blue">
                <p className="eyebrow">COMPLETADOS</p>
                <strong>{projectKpis.completed}</strong>
                <small>Cerrados en el historial</small>
              </article>
              <article className="kpi-card tone-brand">
                <p className="eyebrow">PIEZAS TOTALES</p>
                <strong>{projectKpis.pieces}</strong>
                <small>Órdenes de los proyectos visibles</small>
              </article>
            </div>
            {canManageProjects&&liveProjects.length?<div className="bulk-bar" role="status" aria-live="polite"><span className="bulk-count">{selectedProjects.length?<><b>{selectedProjects.length}</b> de {BATCH_LIMITS.projects} seleccionado{selectedProjects.length===1?'':'s'}</>:<span className="bulk-hint">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.projects}</span>}</span><div className="inline-actions bulk-actions"><button type="button" className="text-button" onClick={selectVisibleProjects}>Seleccionar visibles</button>{selectedProjects.length?<><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(true)}>Archivar</button><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(false)}>Reactivar</button><button type="button" className="text-button" onClick={()=>setSelectedProjects([])}>Limpiar</button></>:null}</div></div>:null}
            {projectsState === 'error' && projects.length ? <p className="error" role="alert">No se pudieron actualizar los proyectos. Se muestra la última lista cargada. <button type="button" className="text-button" onClick={()=>void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'))}>Reintentar</button></p> : null}
            <div className={projectView==='grid'?'project-grid':'project-list'}>
              {projectView==='list'?<div className="project-entry-head" aria-hidden="true"><span>Proyecto</span><span>Estado</span><span>Fechas y piezas</span><span>Responsables</span><span>Acciones</span></div>:null}
              {liveProjects.map(project => projectEntry(project))}
              {!visibleProjects.length ? (
                projectsState === 'loading' && !projects.length ? (
                  <p role="status">Cargando proyectos…</p>
                ) : projectsState === 'error' && !projects.length ? (
                  <p className="error" role="alert">No se pudieron cargar los proyectos. <button type="button" className="text-button" onClick={()=>void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'))}>Reintentar</button></p>
                ) : (
                  <p className="empty-copy">
                    {projectClientFilter ? "Este cliente no tiene proyectos." : "Creá un proyecto después de cargar un cliente."}
                  </p>
                )
              ) : null}
            </div>
            {archivedProjects.length ? (
              <details className="archived-capsule">
                <summary>Archivados ({archivedProjects.length})</summary>
                <div className={projectView==='grid'?'project-grid':'project-list'}>
                  {projectView==='list'?<div className="project-entry-head" aria-hidden="true"><span>Proyecto</span><span>Estado</span><span>Fechas y piezas</span><span>Responsables</span><span>Acciones</span></div>:null}
                  {archivedProjects.map(project => projectEntry(project))}
                </div>
              </details>
            ) : null}
          </section>
  );
}
