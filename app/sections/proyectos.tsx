"use client";
import {clientSelectChoices} from '../client-identity-data';
import {useEffect, useState, type Dispatch, type ReactNode, type SetStateAction} from 'react';
import {Plus, X} from 'lucide-react';
import {Button} from "../ui/button";
import {BulkBar, EmptyBlock, ErrorBlock, Kpi, KpiStrip, KpiStripSkeleton, ListGrid, ListPage, ListRow, LoadingBlock, ViewSwitch, type BulkSelection, type CollectionView, type Column} from '../ui-v2';
import {SelectCustom} from '../profile-controls';
import {notify} from '../feedback';
import {BATCH_LIMITS} from '../capabilities';
import type {Client, Project} from '../workspace-types';
import {Button as ScaleButton} from "../ui/button";


// Proyectos (entregas y capacidad) — contenido v2 (campaña #41, spec #44).
// Extraído de app/scale-workspace.tsx (issue #47): misma lógica y props. La
// tarjeta la aporta el shell (`projectEntry`); acá viven los KPIs, los filtros,
// el lote y la lista con encabezado: la plantilla `--project-cols` la comparten
// el encabezado y las filas (la tarjeta la consume en modo lista).
// Orden por importancia (pase de densidad): identidad → estado → fechas y
// piezas → personas → acciones (columnas de AGENTS.md). Una celda por dato: la fila fina conserva
// todo en una línea (44–48 px) con el detalle en `title`.
const PROJECT_COLUMNS: Column[] = [
  {key: 'project', label: 'Proyecto'},
  {key: 'status', label: 'Estado'},
  {key: 'facts', label: 'Fechas y piezas'},
  {key: 'people', label: 'Responsables'},
  {key: 'actions', label: 'Acciones'},
];
const PROJECT_COLS = '[--project-cols:minmax(15rem,2fr)_6.5rem_11.5rem_minmax(10rem,1fr)_8rem]';
/** Vista elegida (lista/tarjetas): persiste en el navegador, como Clientes y Presupuestos. */
export const PROJECT_VIEW_KEY='scale:project-view';
type ProyectosSectionProps = {
  bulk: BulkSelection;
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
  batchProjects: (archived: boolean) => Promise<void>;
  projectEntry: (project: Project) => ReactNode;
  /** Fila de la vista lista (una línea por celda, acciones de ícono). */
  projectRow: (project: Project) => ReactNode;
  /** CTA del vacío: el modal vive en el shell. */
  createProject?: () => void;
};
export function ProyectosSection({bulkBusy, bulk, projectRow, projectsState, canManageProjects, clients, projects, projectClientFilter, setProjectClientFilter, projectKpis, visibleProjects, liveProjects, archivedProjects, load, batchProjects, projectEntry, createProject}: ProyectosSectionProps){
  const retry=()=>void load().catch(cause=>notify({tone:'error',message:cause instanceof Error?cause.message:'No se pudieron cargar los proyectos.'}));
  // Por defecto tarjetas; la preferencia guardada se lee tras montar (SSR igual).
  const [projectView,setProjectView]=useState<CollectionView>('grid');
  useEffect(()=>{try{setProjectView(localStorage.getItem(PROJECT_VIEW_KEY)==='list'?'list':'grid');}catch{/* Preferencia opcional de la interfaz. */}},[]);
  const changeView=(next:CollectionView)=>{setProjectView(next);try{localStorage.setItem(PROJECT_VIEW_KEY,next);}catch{/* Preferencia opcional de la interfaz. */}};
  const clientChoices=[{value:'',label:'Todos los clientes'},...clientSelectChoices(clients)];
  const collection=(list: Project[], label: string)=>projectView==='grid'
    ? <div className="project-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{list.map(project => projectEntry(project))}</div>
    : <ListGrid label={label} template="grid-cols-[var(--project-cols)]" columns={PROJECT_COLUMNS} className={`project-list ${PROJECT_COLS}`} minWidthClass="min-w-[60rem]" pinnedActions>{list.map(project => <ListRow key={project.id} template="grid-cols-[var(--project-cols)]">{projectRow(project)}</ListRow>)}</ListGrid>;
  const empty = !visibleProjects.length;
  return (
    <ListPage
      aria-label="Proyectos"
      // Toolbar en la fila del título (pase de densidad): filtro de cliente con
      // rótulo en línea, «Seleccionar visibles», contador, vista y la acción
      // primaria al final. En mobile envuelve; nada se apila por defecto.
      primaryAction={<>
        <div className="project-client-filter min-w-0 max-sm:basis-full sm:w-64 [&>.ops-select]:flex [&>.ops-select]:items-center [&>.ops-select]:gap-2 [&_.ops-label]:mb-0 [&_.ops-label]:whitespace-nowrap [&_.ops-select-trigger]:min-w-0 [&_.ops-select-trigger]:flex-1"><SelectCustom label="Cliente" choices={clientChoices} value={projectClientFilter} onChange={setProjectClientFilter}/></div>
        {projectClientFilter?<ScaleButton type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setProjectClientFilter('')} variant="ghost"><X size={14}/>Limpiar</ScaleButton>:null}
        {canManageProjects&&liveProjects.length?<ScaleButton type="button" className="text-button min-h-11 whitespace-nowrap md:min-h-8" title={`Seleccioná hasta ${BATCH_LIMITS.projects} proyectos visibles para operar en lote`} onClick={()=>bulk.selectVisible(liveProjects.map(project=>String(project.id)))} variant="ghost">Seleccionar visibles</ScaleButton>:null}
        {projectsState==='loading'&&!projects.length?null:<p className="whitespace-nowrap text-xs tabular-nums text-mute" role="status">{`${liveProjects.length} proyecto${liveProjects.length===1?'':'s'}`}</p>}
        <ViewSwitch value={projectView} onChange={changeView}/>
        {createProject?<ScaleButton type="button" className="primary whitespace-nowrap" onClick={createProject} variant="primary"><Plus size={18} aria-hidden="true"/> Nuevo proyecto</ScaleButton>:null}
      </>}
      kpis={projectsState === 'loading' && !projects.length ? <KpiStripSkeleton dense label="Cargando proyectos…"/> : <KpiStrip dense className="kpi-strip" aria-label="Métricas de proyectos">
        <Kpi label="Activos" valor={projectKpis.active} hint="Con trabajo en curso" destacado/>
        <Kpi label="Pausados" valor={projectKpis.paused} hint="Sin producción activa"/>
        <Kpi label="Completados" valor={projectKpis.completed} hint="Cerrados en el historial"/>
        <Kpi label="Piezas totales" valor={projectKpis.pieces} hint="Órdenes de los proyectos visibles"/>
      </KpiStrip>}
      bulk={canManageProjects?<BulkBar count={bulk.count} total={BATCH_LIMITS.projects} onClear={bulk.clear}><ScaleButton type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>void batchProjects(true)} variant="secondary">Archivar</ScaleButton><ScaleButton type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>void batchProjects(false)} variant="secondary">Reactivar</ScaleButton></BulkBar>:undefined}
    >
      {projectsState === 'error' && projects.length ? <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad-text" role="alert">No se pudieron actualizar los proyectos. Se muestra la última lista cargada. <ScaleButton type="button" className="text-button" onClick={retry} variant="ghost">Reintentar</ScaleButton></p> : null}
      {projectsState === 'loading' && !projects.length ? <LoadingBlock label="Cargando proyectos…" lines={4}/> : null}
      {projectsState === 'error' && !projects.length ? <ErrorBlock title="No se pudieron cargar los proyectos." onRetry={retry}/> : null}
      {liveProjects.length ? collection(liveProjects, 'Proyectos') : null}
      {empty && projects.length ? <EmptyBlock title={projectClientFilter ? 'Este cliente no tiene proyectos.' : 'No hay proyectos para mostrar.'} description={projectClientFilter ? 'Elegí otro cliente o limpiá el filtro.' : 'Probá con otro filtro.'} action={projectClientFilter ? <Button type="button" variant="outline" onClick={()=>setProjectClientFilter('')}>Limpiar filtro</Button> : undefined}/> : null}
      {empty && !projects.length && (projectsState === 'ready') ? <EmptyBlock compact icon="report" title="Todavía no hay proyectos." description={clients.length?'Creá el primero para agrupar las piezas y sus niveles de aprobación.':'Primero cargá un cliente; después vas a poder crear el proyecto.'} action={createProject&&clients.length?<Button type="button" onClick={createProject}>Nuevo proyecto</Button>:undefined}/> : null}
      {archivedProjects.length ? (
        <details className="archived-capsule">
          <summary>Archivados ({archivedProjects.length})</summary>
          {collection(archivedProjects, 'Proyectos archivados')}
        </details>
      ) : null}
    </ListPage>
  );
}
