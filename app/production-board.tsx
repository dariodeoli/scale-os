"use client";
/**
 * Tablero de Producción (dominio OPS) — contenido v2 (campaña #41, spec #44).
 *
 * Tailwind + `owncoding-ui` + primitivas de `app/ui-v2.tsx`. La tarjeta muestra
 * todo lo que el API ya devuelve de una pieza (spec §2.1: tipo de trabajo,
 * horas, nivel de aprobación, enlaces múltiples y auditoría) sin cortar montos,
 * fechas, códigos ni seriales. El diccionario de estados sigue siendo la fuente
 * única del dominio (`statuses`).
 */
import {useEffect,useRef,useState} from 'react';
import {useDraggable,useDroppable} from '@dnd-kit/core';
import {StateChip,type ChipTone} from './ui-v2';
import {ClientIdentity} from './client-identity';
import {UrgencyBadge} from './urgency';
import {DueDate} from './due-date';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import {ProjectCardPresence} from './presence';
import {RemoveRecord} from './archive-controls';
import {roleCan} from './capabilities';
import {listDateFull} from './list-format';

export const statuses = [
  { id: "blocked", label: "Bloqueado", tone: "red" },
  { id: "to_record", label: "Por grabar", tone: "yellow" },
  { id: "recorded", label: "Grabado", tone: "teal" },
  { id: "editing", label: "Editando", tone: "purple" },
  { id: "review", label: "Revisión", tone: "blue" },
  { id: "approved", label: "Aprobado", tone: "green" },
  { id: "published", label: "Publicado", tone: "green" },
] as const;
export type Status = (typeof statuses)[number]["id"];

const STATUS_TONE: Record<string, ChipTone> = {blocked: 'bad', to_record: 'warn', recorded: 'info', editing: 'info', review: 'warn', approved: 'ok', published: 'ok'};
const WORK_TYPE_LABELS: Record<string, string> = {video: 'Video', reedicion: 'Reedición', foto: 'Foto', produccion: 'Producción', entregable: 'Entregable'};
const workTypeLabel = (value?: string | null) => (value ? WORK_TYPE_LABELS[value] || value : 'Sin clasificar');

export type WorkOrderCard = {
  id: string;
  title: string;
  status: string;
  urgency?: number | null;
  client_name: string;
  client_logo_url?: string | null;
  client_color_key?: string | null;
  project_id: string | number;
  project_name: string;
  drive_url?: string | null;
  drive_links?: {url: string; label?: string | null}[] | null;
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  work_type?: string | null;
  estimated_hours?: string | number | null;
  actual_hours?: string | number | null;
  approval_step?: number | null;
  updated_at?: string | null;
  effective_assignees?: AssignedPerson[];
  assignee_source?: 'direct' | 'project' | null;
  checklist_total?: number;
  checklist_completed?: number;
};

const hoursLabel = (order: WorkOrderCard) => {
  const estimated = order.estimated_hours ? `${order.estimated_hours} h est.` : '';
  const actual = order.actual_hours ? `${order.actual_hours} h reales` : '';
  return [estimated, actual].filter(Boolean).join(' · ');
};

function DraggableOrder({ order,role,refresh,openOrder }: { order: WorkOrderCard;role:string;refresh:()=>Promise<void>;openOrder:(id:string,edit?:boolean)=>void }) {
  const canMove=roleCan(role,'work-orders.edit');
  const draggable = useDraggable({ id: order.id,disabled:!canMove });
  const links = (order.drive_links || []).filter(link => link?.url);
  const hours = hoursLabel(order);
  // La descripción de Trello se resume a dos líneas; "Ver detalle" aparece solo
  // cuando el texto quedó realmente recortado (medido, no supuesto).
  const description=useRef<HTMLParagraphElement|null>(null);
  const [clamped,setClamped]=useState(false);
  useEffect(()=>{
    const node=description.current;if(!node)return;
    const measure=()=>setClamped(node.scrollHeight-node.clientHeight>1);
    measure();
    const observer=new ResizeObserver(measure);
    observer.observe(node);
    return()=>observer.disconnect();
  },[order.description]);
  return (
    <article
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className={`scroll-mt-24 flex min-w-0 flex-col gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3 shadow-sm transition-colors ${draggable.isDragging ? "opacity-60" : ""} ${canMove ? "cursor-grab" : ""}`}
      data-order={order.id}
      data-status={order.status}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-h-11 min-w-11 flex-1 text-left text-[13px] font-semibold leading-5 text-fore outline-none transition-colors hover:text-fono-light focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" aria-label={`Abrir ${order.title}`} onClick={()=>openOrder(order.id)}>{order.title}</button>
        {canMove?<span className="flex h-11 w-11 shrink-0 select-none items-center justify-center rounded-md text-mute md:h-7 md:w-7" role="img" aria-label={`Mover ${order.title}`} title={`Mover ${order.title}`}>⋮⋮</span>:null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 border-l-2 border-ink-600 pl-2 text-[11.5px] leading-4 text-mute">
        <ClientIdentity compact name={order.client_name} logo={order.client_logo_url} color={order.client_color_key}/>
        <span aria-hidden="true">·</span>
        <span className="min-w-0 truncate" title={order.project_name}>{order.project_name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1 border-y border-ink-600 py-2">
        <StateChip tone={STATUS_TONE[order.status] || 'mute'}>{statuses.find(state => state.id === order.status)?.label || order.status}</StateChip>
        <UrgencyBadge value={order.urgency}/>
        <StateChip tone="info">{workTypeLabel(order.work_type)}</StateChip>
        {order.approval_step ? <StateChip tone="ok" title={`Niveles de aprobación completados: ${order.approval_step}`}>Aprobaciones: {order.approval_step}</StateChip> : null}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] leading-4 text-mute">
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-mute/80">Recursos</span>
          {links.length ? <span className="block truncate" title={links.map(link => link.label || link.url).join(' · ')}>{links.length === 1 ? '1 enlace' : `${links.length} enlaces`}</span> : order.drive_url ? <a className="inline-flex min-h-11 min-w-11 items-center text-fono-light outline-none hover:underline focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" href={order.drive_url} target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>Drive ↗</a> : <span>Sin enlace</span>}
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-mute/80">Capacidad</span>
          {hours ? <span className="block truncate" title={`Horas: ${hours}`}>{hours}</span> : <span>Sin horas</span>}
        </div>
        {order.checklist_total ? <div className="col-span-2 flex items-center gap-1 border-t border-ink-600 pt-1.5" aria-label={`${order.checklist_completed||0} de ${order.checklist_total} pasos completados`}><span aria-hidden="true">☑</span><span>{order.checklist_completed||0}/{order.checklist_total} pasos</span></div> : null}
      </div>
      {order.description ? <div className="grid gap-1">
        <p ref={description} className="line-clamp-2 text-[11.5px] leading-5 text-mute" title={order.description}>{order.description}</p>
        {clamped?<button type="button" className="text-button min-h-11 min-w-11 justify-self-start rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" onClick={()=>openOrder(order.id)} title={`Ver la descripción completa de ${order.title}`}>Ver detalle</button>:null}
      </div> : null}
      <DueDate value={order.due_date} time={order.due_time} compact/>
      <AssignedPeople people={order.effective_assignees} source={order.assignee_source}/>
      <ProjectCardPresence projectId={String(order.project_id)}/>
      {order.updated_at ? <p className="text-[10.5px] text-mute">Actualizada {listDateFull(order.updated_at)}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-600 pt-2">
        {canMove?<button className="text-button min-h-11 min-w-11 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" onClick={()=>openOrder(order.id,true)}>Editar</button>:<button className="text-button min-h-11 min-w-11 rounded-md px-1 outline-none focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" onClick={()=>openOrder(order.id)}>Ver más</button>}
        {canMove?<RemoveRecord kind="work-orders" id={order.id} name={order.title} done={refresh} role={role}/>:null}
      </div>
    </article>
  );
}
export function KanbanColumn({
  status,
  orders,
  role,
  refresh,
  openOrder,
  counts,
  hasMore,
  loadingMore,
  loading,
  onLoadMore,
}: {
  status: (typeof statuses)[number];
  orders: WorkOrderCard[];
  role:string;
  refresh:()=>Promise<void>;
  openOrder:(id:string,edit?:boolean)=>void;
  /** Total exacto de la etapa (`?counts=1`); si falta, se usa lo cargado. */
  counts?:number;
  /** La ventana de la columna tiene más piezas para pedir. */
  hasMore?:boolean;
  loadingMore?:boolean;
  /** La primera carga está en curso: ni el badge ni el vacío mienten. */
  loading?:boolean;
  onLoadMore?:()=>void;
}) {
  const droppable = useDroppable({ id: `status-${status.id}` });
  return (
    <section
      ref={droppable.setNodeRef}
      className={`flex min-w-0 w-[calc((100%-(var(--board-cols)-1)*0.75rem)/var(--board-cols))] shrink-0 snap-start flex-col gap-2 rounded-xl border p-3 transition ${droppable.isOver ? "border-fono bg-fono/10" : "border-ink-600 bg-ink-800/60"}`}
      data-column={status.id}
      aria-label={loading&&counts===undefined?`${status.label}: cargando piezas`:`${status.label}: ${orders.length} pieza${orders.length === 1 ? "" : "s"}`}
    >
      <div className="sticky top-0 z-10 -mx-3 -mt-3 flex items-center gap-2 rounded-t-xl border-b border-ink-600 bg-ink-800/95 px-3 py-2.5 backdrop-blur-sm">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-mute">Etapa</p>
          <h2 className="mt-0.5"><StateChip tone={STATUS_TONE[status.id] || 'mute'}>{status.label}</StateChip></h2>
        </div>
        <em className="ml-auto whitespace-nowrap rounded-full bg-ink-700 px-2 py-1 text-[10px] font-medium not-italic tabular-nums text-mute" title={`${counts ?? orders.length} piezas en ${status.label}`}>{loading&&counts===undefined?'…':counts ?? orders.length}</em>
      </div>
      {orders.map((order) => (
        <DraggableOrder key={order.id} order={order} role={role} refresh={refresh} openOrder={openOrder}/>
      ))}
      {hasMore && onLoadMore ? <button type="button" className="text-button min-h-11 min-w-11 justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-fono focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 md:min-h-0 md:min-w-0" disabled={loadingMore} aria-label={`Ver más piezas en ${status.label}`} onClick={onLoadMore}>{loadingMore ? 'Trayendo…' : 'Ver más'}</button> : null}
      {!orders.length ? <p className="py-3 text-center text-[11px] text-mute">{loading?'Cargando piezas…':'Sin piezas en esta etapa'}</p> : null}
    </section>
  );
}
