"use client";
import {Button} from './ui/button';

/**
 * Proyectos (dominio OPS) — tarjeta/lista y detalle v2 (campaña #41, spec #44).
 *
 * `ProjectCard` mantiene la API que consume el shell (`project`, `client`,
 * `selectable`, `selected`, `onSelect` y `children`) y suma el detalle nuevo
 * (`ProjectDetail`) con los datos que el API ya devuelve: niveles de aprobación,
 * enlaces múltiples, piezas del proyecto y auditoría. La misma tarjeta se dibuja
 * como fila finita cuando vive dentro de `.project-list` (variantes por ancestro)
 * y comparte la plantilla `--project-cols` con el encabezado de la sección.
 */
import {useEffect,useRef,useState} from 'react';
import {IconAction} from 'owncoding-ui';
import {Dialog} from './dialog';
import {EmployeeTasks,type EmployeeTasksProps} from './employee-tasks';
import {fechaLista,fechaListaCorta} from 'owncoding-ui';
import {hasDueWarning} from './list-format';
import {EmptyBlock,ErrorBlock,LoadingBlock,StateChip,type ChipTone} from './ui-v2';
import {UrgencyBadge} from './urgency';
import {ClientIdentity,identityColor} from './client-identity';
import './project-card.css';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import {DriveLinks,driveLinksText} from './drive-links';
import {DueDate} from './due-date';
import {OPS_TIME_ZONE} from './ops-time';
import {PROJECT_PIECES_LIMIT,fetchProjectPieces,remainingPiecesLabel,type ProjectPiece} from './project-pieces';
import {api} from './operations';
import {statuses} from './production-board';

export type ProjectAssignee=AssignedPerson;

type ProjectView = {
  id:string;name:string;client_name:string;status:string;work_order_count:number;
  drive_url:string|null;drive_links?:{url:string;label?:string|null}[]|null;
  start_date?:string|null;due_date?:string|null;urgency?:number|null;active?:boolean;
  approval_levels?:number|null;updated_at?:string|null;assignees?:ProjectAssignee[];
};
const STATUS_LABELS:Record<string,string>={active:'Activo',paused:'Pausado',completed:'Completado',cancelled:'Cancelado'};
const STATUS_TONE:Record<string,ChipTone>={active:'ok',paused:'warn',completed:'info',cancelled:'bad'};
const statusLabel=(status:string)=>STATUS_LABELS[status]||status;
// Targets táctiles: en móvil las acciones de ícono crecen a 44 px (32 en escritorio).
const ICON_TARGETS='[&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7';
/**
 * Detalle del proyecto: se mantiene como drawer propio de la tarjeta (decisión
 * de la ronda 6 del QA). El detalle del shell maneja clientes y piezas con sus
 * propios datos y estado; unificar exigiría que la cáscara conozca proyectos,
 * sin ganancia de producto. El patrón visual ya es el canónico (Dialog/Editor).
 */

const pieceStatusLabel=(status:string)=>statuses.find(state=>state.id===status)?.label||status;

/** Enlaces del proyecto: el API manda `drive_links` (multi) y `drive_url` legado. */
export const projectLinks=(project:Pick<ProjectView,'drive_links'|'drive_url'>)=>{
  const links=(project.drive_links||[]).filter(link=>link?.url);
  return {links,legacy:project.drive_url||'',count:links.length||(project.drive_url?1:0)};
};

function ProjectDetail({project,client,onClose,taskIdentity}:{project:ProjectView;client?:{logo_url?:string|null;color_key?:string};onClose:()=>void;taskIdentity?:EmployeeTasksProps}){
  const [data,setData]=useState<{record:ProjectView;assignees:ProjectAssignee[]}|null>(null);
  const [pieces,setPieces]=useState<{id:string;title:string;status:string;due_date?:string|null;due_time?:string|null;effective_assignees?:ProjectAssignee[]}[]|null>(null);
  const [error,setError]=useState('');const [reload,setReload]=useState(0);const [assigneesError,setAssigneesError]=useState(false);
  useEffect(()=>{
    let alive=true;setData(null);setPieces(null);setError('');setAssigneesError(false);
    Promise.all([
      Promise.all([api<{record:ProjectView}>(`/api/agency/projects/${project.id}`),api<{assignees:ProjectAssignee[]}>(`/api/agency/projects/${project.id}/assignees`).then(assignees=>({assignees:assignees.assignees||[],failed:false})).catch(()=>({assignees:[] as ProjectAssignee[],failed:true}))]).then(([record,assignees])=>({record:record.record,assignees:assignees.assignees,failed:assignees.failed})),
      fetchProjectPieces(project.id,(url)=>api<{workOrders:ProjectPiece[]}>(url).then(result=>result.workOrders||[])),
    ]).then(([head,orders])=>{if(!alive)return;setData(head);setAssigneesError(head.failed);setPieces(orders);}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'No se pudo cargar el proyecto.');});
    return()=>{alive=false;};
  },[project.id,reload]);
  const record=data?.record||project;
  // #146 · una sola fuente: el contador es la lista que devuelve la misma
  // consulta del detalle (el registro individual no trae `work_order_count`).
  // Los conteos del directorio solo cubren la carga y la ventana de 50 piezas.
  const knownTotal=Math.max(Number(record.work_order_count||0),Number(project.work_order_count||0));
  const piecesCount=pieces?pieces.length:knownTotal;
  const piecesTotal=Math.max(piecesCount,knownTotal);
  const {links,legacy,count}=projectLinks(record);
  // Piezas que exceden la ventana: el texto queda visible en la lista (sin rol de
  // estado propio ni aviso transitorio duplicado).
  const shownPieces=pieces?Math.min(pieces.length,PROJECT_PIECES_LIMIT):0;
  const remainingNotice=pieces&&piecesTotal>shownPieces?remainingPiecesLabel(piecesTotal,shownPieces):'';
  return <Dialog size="drawer" close={onClose} title={record.name}>
    {error?<ErrorBlock title="No se pudo cargar el proyecto." description={error} onRetry={()=>setReload(value=>value+1)}/>:null}
    <div className="grid min-w-0 gap-4">
      <section className="grid min-w-0 gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StateChip tone={STATUS_TONE[record.status]||'mute'}>{statusLabel(record.status)}</StateChip>
          <UrgencyBadge value={record.urgency}/>
          {record.approval_levels?<StateChip tone="info" title={`Niveles de aprobación interna: ${record.approval_levels}`}>{record.approval_levels} nivel{record.approval_levels===1?'':'es'} de aprobación</StateChip>:null}
        </div>
        <dl className="grid gap-1 text-[13px]">
          <div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Cliente</dt><dd className="min-w-0 shrink overflow-hidden"><ClientIdentity name={record.client_name} logo={client?.logo_url} color={client?.color_key} compact/></dd></div>
          <div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Inicio</dt><dd className="shrink-0 whitespace-nowrap">{fechaListaCorta(record.start_date,'')||'Sin fecha'}</dd></div>
          <div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Entrega</dt><dd className="shrink-0 whitespace-nowrap" data-tone={hasDueWarning(record.due_date)?'warn':undefined}>{fechaListaCorta(record.due_date,'')||'Sin fecha'}</dd></div>
          <div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Piezas</dt><dd className="shrink-0 tabular-nums" data-pieces-count={piecesCount}>{piecesCount}</dd></div>
          <div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Enlaces</dt><dd className="shrink-0 whitespace-nowrap">{count?`${count} enlace${count===1?'':'s'}`:'Sin enlaces'}</dd></div>
          {record.updated_at?<div className="flex min-w-0 items-center justify-between gap-3"><dt className="min-w-0 text-mute">Última actualización</dt><dd className="shrink-0 whitespace-nowrap">{fechaLista(record.updated_at,'',{timeZone:OPS_TIME_ZONE})}</dd></div>:null}
        </dl>
      </section>
      <section className="grid min-w-0 gap-2">
        <h4 className="text-sm font-semibold text-fore">Responsables</h4>
        {data?assigneesError?<p className="flex flex-wrap items-center gap-2 text-[13px] text-mute">No se pudieron cargar los responsables. <Button variant="ghost" type="button" className="text-button" onClick={()=>setReload(value=>value+1)}>Reintentar</Button></p>:<AssignedPeople people={data.assignees}/>:<LoadingBlock label="Cargando responsables…" lines={1}/>}
      </section>
      <section className="grid min-w-0 gap-2">
        <h4 className="text-sm font-semibold text-fore">Enlaces de archivo o carpeta de Drive</h4>
        <div className="[&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center md:[&_a]:min-h-0">{links.length?<DriveLinks value={links} legacy={legacy}/>:legacy?<DriveLinks value={legacy}/>:<p className="text-[13px] text-mute">Sin enlaces registrados.</p>}</div>
      </section>
      <section className="grid min-w-0 gap-2">
        <h4 className="text-sm font-semibold text-fore">Piezas del proyecto</h4>
        {pieces===null?<LoadingBlock label="Cargando piezas…" lines={2}/>:pieces.length?<ul className="grid gap-1.5">{pieces.slice(0,PROJECT_PIECES_LIMIT).map(piece=><li key={piece.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px]">
          <span className="min-w-0 truncate font-semibold text-fore" title={piece.title}>{piece.title}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap"><span className="list-date tabular-nums text-mute" data-tone={hasDueWarning(piece.due_date)?'warn':undefined} title={piece.due_date?`Entrega ${fechaListaCorta(piece.due_date,'')}${piece.due_time?` · ${piece.due_time.slice(0,5)} h`:``}`:undefined}>{piece.due_date?<>{fechaListaCorta(piece.due_date,'')}{piece.due_time?` · ${piece.due_time.slice(0,5)}`:``}</>:'Sin fecha'}</span><StateChip tone={piece.status==='published'?'ok':piece.status==='approved'?'info':piece.status==='review'?'warn':'mute'}>{pieceStatusLabel(piece.status)}</StateChip></span>
        </li>)}</ul>:<p className="text-[13px] text-mute">El proyecto todavía no tiene piezas.</p>}
        {remainingNotice?<p className="text-[12px] text-mute">{remainingNotice}</p>:null}
      </section>
      {taskIdentity?.organizationId&&taskIdentity?.userId?<EmployeeTasks {...taskIdentity} projectId={String(project.id)}/>:null}
    </div>
  </Dialog>;
}

export function ProjectCard({project,client,children,selectable=false,selected=false,onSelect,taskIdentity}:{taskIdentity?:EmployeeTasksProps;project:ProjectView;client?:{logo_url?:string|null;color_key?:string};children:React.ReactNode;selectable?:boolean;selected?:boolean;onSelect?:()=>void}){
  const anchor=`project-${project.id}`,card=useRef<HTMLElement>(null);
  const [detail,setDetail]=useState(false);
  const {links,legacy,count}=projectLinks(project);
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
  // Tarjeta compacta (pase de densidad): encabezado (título de hasta 2 líneas
  // con title + estado), contexto (cliente + urgencia), hechos alineados en 4
  // columnas, responsables en una línea y acciones al pie. La altura la define
  // el contenido; la fila de la cuadrícula la iguala por `stretch`. La línea
  // «Actualizado …» es auditoría y vive en el detalle (como en Producción, #99).
  return <article id={anchor} ref={card} tabIndex={-1} className={`project-entry project-card-v3 identity-${identityColor(client?.color_key)} group/project flex min-w-0 flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3 [.project-list_&]:grid [.project-list_&]:min-h-[48px] [.project-list_&]:grid-cols-[var(--project-cols)] [.project-list_&]:items-center [.project-list_&]:gap-x-2 [.project-list_&]:px-3 [.project-list_&]:py-1`}>
    <div className="project-card-header flex min-w-0 items-start gap-2 [.project-list_&]:items-center">
      {selectable?<label className="select-check flex h-11 min-w-11 items-center justify-center md:h-5 md:min-w-5" title="Seleccionar proyecto"><input type="checkbox" aria-label={`Seleccionar ${project.name}`} checked={selected} onChange={()=>onSelect?.()}/></label>:null}
      <div className="min-w-0 flex-1 [.project-list_&]:flex [.project-list_&]:items-center [.project-list_&]:gap-2">
        <div className="flex min-w-0 items-start gap-2 [.project-list_&]:contents">
          <h3 className="break-words project-card-title min-w-0 flex-1 text-[15px] font-semibold leading-5 text-fore [.project-list_&]:flex-none [.project-list_&]:truncate" title={project.name}>{project.name}</h3>
          <StateChip tone={project.active===false?'mute':STATUS_TONE[project.status]||'mute'} className="shrink-0">{project.active===false?'Archivado':statusLabel(project.status)}</StateChip>
        </div>
        <div className="project-card-context flex min-w-0 items-center justify-between gap-2 [.project-list_&]:contents">
          <button type="button" className="mt-0.5 flex min-h-11 min-w-0 items-center text-left text-[11.5px] leading-4 text-mute hover:text-fono-light md:min-h-0 [.project-list_&]:hidden" onClick={()=>setDetail(true)} aria-label={`Abrir detalle del proyecto ${project.name}`}><ClientIdentity name={project.client_name} logo={client?.logo_url} color={client?.color_key} compact/></button>
          <span className="shrink-0 [.project-list_&]:hidden"><UrgencyBadge value={project.urgency}/></span>
        </div>
        <span className="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:inline" title={project.client_name}>· {project.client_name}</span>
      </div>
    </div>
    <dl className="project-card-facts grid grid-cols-2 gap-x-2 rounded-lg bg-ink-700/40 px-2.5 py-1.5 text-[12px] [.project-list_&]:flex [.project-list_&]:flex-nowrap [.project-list_&]:items-center [.project-list_&]:gap-x-3 [.project-list_&]:overflow-hidden [.project-list_&]:whitespace-nowrap [.project-list_&]:bg-transparent [.project-list_&]:p-0" title={`Inicio ${fechaListaCorta(project.start_date,'')||'sin fecha'} · Entrega ${fechaListaCorta(project.due_date,'')||'sin fecha'} · ${project.work_order_count||0} piezas${project.approval_levels?` · ${project.approval_levels} niveles de aprobación`:''} · ${count} enlaces de Drive`}>
      <div className="grid min-w-0 gap-0.5 [.project-list_&]:block"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute [.project-list_&]:hidden">Inicio</dt><dd className="list-date whitespace-nowrap">{fechaListaCorta(project.start_date,'')||'Sin fecha'}</dd></div>
      <div className="grid min-w-0 gap-0.5 [.project-list_&]:block"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute [.project-list_&]:hidden">Entrega</dt><dd className="list-date whitespace-nowrap" data-tone={hasDueWarning(project.due_date)?'warn':undefined}>{fechaListaCorta(project.due_date,'')||'Sin fecha'}</dd></div>
      <div className="grid min-w-0 gap-0.5 [.project-list_&]:block"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute [.project-list_&]:hidden">Piezas</dt><dd className="font-semibold tabular-nums">{Number(project.work_order_count||0)}</dd><span className="hidden [.project-list_&]:inline [.project-list_&]:text-mute"> piezas</span></div>
      <div className="grid min-w-0 gap-0.5 [.project-list_&]:hidden"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Aprobación</dt><dd className="tabular-nums">{project.approval_levels?`${project.approval_levels} nivel${project.approval_levels===1?'':'es'}`:'Sin niveles'}</dd></div>
    </dl>
    <div className="min-w-0 text-[11.5px] [.project-list_&]:hidden"><AssignedPeople people={project.assignees}/></div>
    <span className="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:block" title={(project.assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||undefined}>{(project.assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||'Sin responsables'}</span>
    <div className="mt-auto flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto border-t border-ink-600 pt-1.5 silent-scroll [.project-list_&]:mt-0 [.project-list_&]:flex-nowrap [.project-list_&]:overflow-x-auto [.project-list_&]:border-t-0 [.project-list_&]:pt-0">
      {count?<a className="inline-flex min-h-11 items-center whitespace-nowrap text-[11.5px] font-semibold text-fono-light hover:underline md:min-h-0" href={links[0]?.url||legacy||undefined} target="_blank" rel="noreferrer" title={driveLinksText(links,legacy)}>Abrir Drive{count>1?` (${count})`:''} ↗</a>:<small className="whitespace-nowrap text-[11.5px] text-mute">Sin Drive</small>}
      <span className={`ml-auto ${ICON_TARGETS}`}><IconAction icon="eye" tone="fono" label={`Ver detalle del proyecto: ${project.name}`} onClick={()=>setDetail(true)}/></span>
      {children}
    </div>
    {detail?<ProjectDetail project={project} client={client} taskIdentity={taskIdentity} onClose={()=>setDetail(false)}/>:null}
  </article>;
}
