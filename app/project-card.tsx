"use client";
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
import {EmptyBlock,ErrorBlock,LoadingBlock,StateChip,type ChipTone} from './ui-v2';
import {UrgencyBadge} from './urgency';
import {ClientIdentity} from './client-identity';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import {DriveLinks,driveLinksText} from './drive-links';
import {DueDate} from './due-date';
import {listDateShort,listDateFull,dueTone} from './list-format';
import {api,Dialog} from './operations';
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
const pieceStatusLabel=(status:string)=>statuses.find(state=>state.id===status)?.label||status;

/** Enlaces del proyecto: el API manda `drive_links` (multi) y `drive_url` legado. */
export const projectLinks=(project:Pick<ProjectView,'drive_links'|'drive_url'>)=>{
  const links=(project.drive_links||[]).filter(link=>link?.url);
  return {links,legacy:project.drive_url||'',count:links.length||(project.drive_url?1:0)};
};

function ProjectDetail({project,onClose}:{project:ProjectView;onClose:()=>void}){
  const [data,setData]=useState<{record:ProjectView;assignees:ProjectAssignee[]}|null>(null);
  const [pieces,setPieces]=useState<{id:string;title:string;status:string;due_date?:string|null;due_time?:string|null;effective_assignees?:ProjectAssignee[]}[]|null>(null);
  const [error,setError]=useState('');const [reload,setReload]=useState(0);
  useEffect(()=>{
    let alive=true;setData(null);setPieces(null);setError('');
    Promise.all([
      Promise.all([api<{record:ProjectView}>(`/api/agency/projects/${project.id}`),api<{assignees:ProjectAssignee[]}>(`/api/agency/projects/${project.id}/assignees`).catch(()=>({assignees:[]}))]).then(([record,assignees])=>({record:record.record,assignees:assignees.assignees||[]})),
      api<{workOrders:{id:string;title:string;status:string;due_date?:string|null;due_time?:string|null;project_id:string|number;effective_assignees?:ProjectAssignee[]}[]}>('/api/agency/work-orders').then(result=>result.workOrders.filter(order=>String(order.project_id)===String(project.id))),
    ]).then(([head,orders])=>{if(!alive)return;setData(head);setPieces(orders);}).catch(cause=>{if(alive)setError(cause instanceof Error?cause.message:'No se pudo cargar el proyecto.');});
    return()=>{alive=false;};
  },[project.id,reload]);
  const record=data?.record||project;
  const {links,legacy,count}=projectLinks(record);
  return <Dialog variant="drawer" title={record.name} close={onClose}>
    {error?<ErrorBlock title="No se pudo cargar el proyecto." description={error} onRetry={()=>setReload(value=>value+1)}/>:null}
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StateChip tone={STATUS_TONE[record.status]||'mute'}>{statusLabel(record.status)}</StateChip>
          <UrgencyBadge value={record.urgency}/>
          {record.approval_levels?<StateChip tone="info" title={`Niveles de aprobación interna: ${record.approval_levels}`}>{record.approval_levels} nivel{record.approval_levels===1?'':'es'} de aprobación</StateChip>:null}
        </div>
        <dl className="grid gap-1 text-[13px]">
          <div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Cliente</dt><dd className="shrink-0"><ClientIdentity name={record.client_name} logo={undefined} color={undefined}/></dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Inicio</dt><dd className="shrink-0 whitespace-nowrap">{listDateShort(record.start_date)||'Sin fecha'}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Entrega</dt><dd className="shrink-0 whitespace-nowrap" data-tone={dueTone(record.due_date)||undefined}>{listDateShort(record.due_date)||'Sin fecha'}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Piezas</dt><dd className="shrink-0 tabular-nums">{record.work_order_count||0}</dd></div>
          <div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Enlaces</dt><dd className="shrink-0 whitespace-nowrap">{count?`${count} enlace${count===1?'':'s'}`:'Sin enlaces'}</dd></div>
          {record.updated_at?<div className="flex items-center justify-between gap-3"><dt className="min-w-0 text-mute">Última actualización</dt><dd className="shrink-0 whitespace-nowrap">{listDateFull(record.updated_at)}</dd></div>:null}
        </dl>
      </section>
      <section className="grid gap-2">
        <h4 className="text-sm font-semibold text-fore">Responsables</h4>
        {data?<AssignedPeople people={data.assignees}/>:<LoadingBlock label="Cargando responsables…" lines={1}/>}
      </section>
      <section className="grid gap-2">
        <h4 className="text-sm font-semibold text-fore">Enlaces de archivo o carpeta de Drive</h4>
        {links.length?<DriveLinks value={links} legacy={legacy}/>:legacy?<DriveLinks value={legacy}/>:<p className="text-[13px] text-mute">Sin enlaces registrados.</p>}
      </section>
      <section className="grid gap-2">
        <h4 className="text-sm font-semibold text-fore">Piezas del proyecto</h4>
        {pieces===null?<LoadingBlock label="Cargando piezas…" lines={2}/>:pieces.length?<ul className="grid gap-1.5">{pieces.map(piece=><li key={piece.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-ink-600/60 px-3 py-2 text-[13px]">
          <span className="min-w-0 truncate font-semibold text-fore" title={piece.title}>{piece.title}</span>
          <span className="ml-auto flex shrink-0 items-center gap-2"><DueDate value={piece.due_date} time={piece.due_time} compact/><StateChip tone={piece.status==='published'?'ok':piece.status==='approved'?'info':piece.status==='review'?'warn':'mute'}>{pieceStatusLabel(piece.status)}</StateChip></span>
        </li>)}</ul>:<p className="text-[13px] text-mute">El proyecto todavía no tiene piezas.</p>}
      </section>
    </div>
  </Dialog>;
}

export function ProjectCard({project,client,children,selectable=false,selected=false,onSelect}:{project:ProjectView;client?:{logo_url?:string|null;color_key?:string};children:React.ReactNode;selectable?:boolean;selected?:boolean;onSelect?:()=>void}){
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
  return <article id={anchor} ref={card} tabIndex={-1} className="project-entry group/project flex min-h-[200px] min-w-0 flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4 [.project-list_&]:grid [.project-list_&]:min-h-[48px] [.project-list_&]:grid-cols-[var(--project-cols)] [.project-list_&]:items-center [.project-list_&]:gap-x-2 [.project-list_&]:px-3 [.project-list_&]:py-1">
    <div className="flex min-w-0 items-start gap-2 [.project-list_&]:items-center">
      {selectable?<label className="select-check" title="Seleccionar proyecto"><input type="checkbox" aria-label={`Seleccionar ${project.name}`} checked={selected} onChange={()=>onSelect?.()}/></label>:null}
      <div className="min-w-0 [.project-list_&]:flex [.project-list_&]:items-center [.project-list_&]:gap-2">
        <h3 className="break-words text-sm font-semibold text-fore [.project-list_&]:min-w-0 [.project-list_&]:truncate" title={project.name}>{project.name}</h3>
        <button type="button" className="mt-0.5 min-w-0 text-left text-[11.5px] text-mute hover:text-fono-light [.project-list_&]:hidden" onClick={()=>setDetail(true)} aria-label={`Abrir detalle del proyecto ${project.name}`}><ClientIdentity name={project.client_name} logo={client?.logo_url} color={client?.color_key}/></button>
        <span className="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:inline" title={project.client_name}>· {project.client_name}</span>
      </div>
    </div>
    <div className="flex min-w-0 flex-wrap items-center gap-1 [.project-list_&]:flex-nowrap [.project-list_&]:justify-start">
      <StateChip tone={STATUS_TONE[project.status]||'mute'}>{statusLabel(project.status)}</StateChip>
      <span className="[.project-list_&]:hidden"><UrgencyBadge value={project.urgency}/></span>
    </div>
    <dl className="grid gap-1 text-[11.5px] [.project-list_&]:flex [.project-list_&]:flex-nowrap [.project-list_&]:items-center [.project-list_&]:gap-x-3 [.project-list_&]:overflow-hidden [.project-list_&]:whitespace-nowrap" title={`Inicio ${listDateShort(project.start_date)||'sin fecha'} · Entrega ${listDateShort(project.due_date)||'sin fecha'} · ${project.work_order_count||0} piezas`}>
      <div className="flex items-center gap-1.5"><dt className="text-mute [.project-list_&]:hidden">Inicio</dt><dd className="list-date whitespace-nowrap">{listDateShort(project.start_date)||'Sin fecha'}</dd></div>
      <div className="flex items-center gap-1.5"><dt className="text-mute [.project-list_&]:hidden">Entrega</dt><dd className="list-date whitespace-nowrap" data-tone={dueTone(project.due_date)||undefined}>{listDateShort(project.due_date)||'Sin fecha'}</dd></div>
      <div className="flex items-center gap-1.5"><dt className="text-mute [.project-list_&]:hidden">Piezas</dt><dd className="tabular-nums">{project.work_order_count}</dd><span className="hidden [.project-list_&]:inline [.project-list_&]:text-mute"> piezas</span></div>
      {project.approval_levels?<div className="flex items-center gap-1.5 [.project-list_&]:hidden" title={`Niveles de aprobación interna: ${project.approval_levels}`}><dt className="text-mute">Aprobación</dt><dd className="tabular-nums">{project.approval_levels}</dd></div>:null}
    </dl>
    <div className="min-w-0 [.project-list_&]:hidden"><AssignedPeople people={project.assignees}/></div>
    <span className="hidden min-w-0 truncate text-[11.5px] text-mute [.project-list_&]:block" title={(project.assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||undefined}>{(project.assignees||[]).map(person=>person.full_name||person.email||'').filter(Boolean).join(', ')||'Sin responsables'}</span>
    {project.updated_at?<p className="text-[10.5px] text-mute [.project-list_&]:hidden">Actualizado {listDateFull(project.updated_at)}</p>:null}
    <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2 border-t border-ink-600 pt-2 [.project-list_&]:mt-0 [.project-list_&]:flex-nowrap [.project-list_&]:overflow-x-auto [.project-list_&]:border-t-0 [.project-list_&]:pt-0">
      {count?<a className="whitespace-nowrap text-[11.5px] font-semibold text-fono-light hover:underline" href={links[0]?.url||legacy||undefined} target="_blank" rel="noreferrer" title={driveLinksText(links,legacy)}>Abrir Drive{count>1?` (${count})`:''} ↗</a>:<small className="whitespace-nowrap text-[11.5px] text-mute">Sin Drive</small>}
      <IconAction icon="eye" tone="fono" label={`Ver detalle del proyecto: ${project.name}`} onClick={()=>setDetail(true)}/>
      {children}
    </div>
    {detail?<ProjectDetail project={project} onClose={()=>setDetail(false)}/>:null}
  </article>;
}
