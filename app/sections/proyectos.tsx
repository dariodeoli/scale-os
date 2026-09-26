"use client";
import type {Dispatch, ReactNode, SetStateAction} from 'react';
import {X} from 'lucide-react';
import {Button,Select} from 'owncoding-ui';
import {EmptyBlock, ErrorBlock, FilterToolbar, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, type Column} from '../ui-v2';
import {BATCH_LIMITS} from '../capabilities';
import type {Client, Project} from '../workspace-types';

// Proyectos (entregas y capacidad) — contenido v2 (campaña #41, spec #44).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y props. La
// tarjeta la aporta el shell (`projectEntry`); acá viven los KPIs, los filtros,
// el lote y la lista con encabezado: la plantilla `--project-cols` la comparten
// el encabezado y las filas (la tarjeta la consume en modo lista).
const PROJECT_COLUMNS: Column[] = [
  {key: 'project', label: 'Proyecto'},
  {key: 'status', label: 'Estado'},
  {key: 'facts', label: 'Fechas y piezas'},
  {key: 'people', label: 'Responsables'},
  {key: 'actions', label: 'Acciones'},
];
const PROJECT_COLS = '[--project-cols:minmax(14rem,1.6fr)_7rem_minmax(13rem,1.1fr)_minmax(10rem,1fr)_10rem]';
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
  /** Fila de la vista lista (una línea por celda, acciones de ícono). */
  projectRow: (project: Project) => ReactNode;
  /** CTA del vacío: el modal vive en el shell. */
  createProject?: () => void;
};
export function ProyectosSection({setToast, bulkBusy, projectRow, projectView, selectedProjects, setSelectedProjects, projectsState, canManageProjects, clients, projects, projectClientFilter, setProjectClientFilter, projectKpis, visibleProjects, liveProjects, archivedProjects, load, selectVisibleProjects, batchProjects, projectEntry, createProject}: ProyectosSectionProps){
  const retry=()=>void load().catch(cause=>setToast(cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'));
  const collection=(list: Project[], label: string)=>projectView==='grid'
    ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(project => projectEntry(project))}</div>
    : <ListGrid label={label} template="grid-cols-[var(--project-cols)]" columns={PROJECT_COLUMNS} className={`project-list ${PROJECT_COLS}`} minWidthClass="min-w-[64rem]">{list.map(project => <ListRow key={project.id} template="grid-cols-[var(--project-cols)]">{projectRow(project)}</ListRow>)}</ListGrid>;
  const empty = !visibleProjects.length;
  return (
    <section className="grid min-w-0 gap-4" aria-label="Proyectos">
      <KpiStrip className="kpi-strip">
        <Kpi label="Activos" valor={projectKpis.active} hint="Con trabajo en curso" destacado/>
        <Kpi label="Pausados" valor={projectKpis.paused} hint="Sin producción activa"/>
        <Kpi label="Completados" valor={projectKpis.completed} hint="Cerrados en el historial"/>
        <Kpi label="Piezas totales" valor={projectKpis.pieces} hint="Órdenes de los proyectos visibles"/>
      </KpiStrip>
      <FilterToolbar summary={`${liveProjects.length} proyecto${liveProjects.length===1?'':'s'}`}>
        <label className="grid w-full gap-1.5 sm:w-64">
          <span className="text-[12px] font-semibold text-mute">Cliente</span>
          <Select value={projectClientFilter} onChange={(event:React.ChangeEvent<HTMLSelectElement>)=>setProjectClientFilter(event.target.value)}>
            <option value="">Todos los clientes</option>
            {clients.map(client=><option key={client.id} value={String(client.id)}>{client.name}</option>)}
          </Select>
        </label>
        {projectClientFilter?<button type="button" className="text-button" onClick={()=>setProjectClientFilter('')}><X size={14}/>Limpiar filtro</button>:null}
      </FilterToolbar>
      {canManageProjects&&liveProjects.length?<div className="bulk-bar" role="status" aria-live="polite"><span className="bulk-count">{selectedProjects.length?<><b>{selectedProjects.length}</b> de {BATCH_LIMITS.projects} seleccionado{selectedProjects.length===1?'':'s'}</>:<span className="bulk-hint whitespace-normal">Seleccioná varios para operar en lote · máximo {BATCH_LIMITS.projects}</span>}</span><div className="inline-actions bulk-actions"><button type="button" className="text-button" onClick={selectVisibleProjects}>Seleccionar visibles</button>{selectedProjects.length?<><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(true)}>Archivar</button><button type="button" className="secondary" disabled={bulkBusy} onClick={()=>void batchProjects(false)}>Reactivar</button><button type="button" className="text-button" onClick={()=>setSelectedProjects([])}>Limpiar</button></>:null}</div></div>:null}
      {projectsState === 'error' && projects.length ? <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad" role="alert">No se pudieron actualizar los proyectos. Se muestra la última lista cargada. <button type="button" className="text-button" onClick={retry}>Reintentar</button></p> : null}
      {projectsState === 'loading' && !projects.length ? <LoadingBlock label="Cargando proyectos…" lines={4}/> : null}
      {projectsState === 'error' && !projects.length ? <ErrorBlock title="No se pudieron cargar los proyectos." onRetry={retry}/> : null}
      {liveProjects.length ? collection(liveProjects, 'Proyectos') : null}
      {empty && projects.length ? <EmptyBlock title={projectClientFilter ? 'Este cliente no tiene proyectos.' : 'No hay proyectos para mostrar.'} description={projectClientFilter ? 'Elegí otro cliente o limpiá el filtro.' : 'Probá con otro filtro.'}/> : null}
      {empty && !projects.length && (projectsState === 'ready') ? <EmptyBlock compact icon="report" title="Todavía no hay proyectos." description={clients.length?'Creá el primero para agrupar las piezas y sus niveles de aprobación.':'Primero cargá un cliente; después vas a poder crear el proyecto.'} action={createProject&&clients.length?<Button type="button" onClick={createProject}>Nuevo proyecto</Button>:undefined}/> : null}
      {archivedProjects.length ? (
        <details className="archived-capsule">
          <summary>Archivados ({archivedProjects.length})</summary>
          {collection(archivedProjects, 'Proyectos archivados')}
        </details>
      ) : null}
    </section>
  );
}
