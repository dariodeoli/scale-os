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
  return (
    <article
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className={`flex min-w-0 flex-col gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3 ${draggable.isDragging ? "opacity-60" : ""} ${canMove ? "cursor-grab" : ""}`}
      data-order={order.id}
      data-status={order.status}
    >
      <div className="flex items-start justify-between gap-2">
        <button type="button" className="min-w-0 text-left text-[13px] font-semibold text-fore hover:text-fono-light" aria-label={`Abrir ${order.title}`} onClick={()=>openOrder(order.id)}>{order.title}</button>
        {canMove?<span className="flex h-11 w-11 shrink-0 select-none items-center justify-center text-mute md:h-7 md:w-7" role="img" aria-label={`Mover ${order.title}`} title={`Mover ${order.title}`}>⋮⋮</span>:null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11.5px] text-mute">
        <ClientIdentity compact name={order.client_name} logo={order.client_logo_url} color={order.client_color_key}/>
        <span aria-hidden="true">·</span>
        <span className="min-w-0 truncate" title={order.project_name}>{order.project_name}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <StateChip tone={STATUS_TONE[order.status] || 'mute'}>{statuses.find(state => state.id === order.status)?.label || order.status}</StateChip>
        <UrgencyBadge value={order.urgency}/>
        <StateChip tone="info">{workTypeLabel(order.work_type)}</StateChip>
        {order.approval_step ? <StateChip tone="ok" title={`Niveles de aprobación completados: ${order.approval_step}`}>Aprobaciones: {order.approval_step}</StateChip> : null}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mute">
        {links.length ? <span className="whitespace-nowrap" title={links.map(link => link.label || link.url).join(' · ')}>{links.length === 1 ? '1 enlace' : `${links.length} enlaces`}</span> : order.drive_url ? <a className="whitespace-nowrap text-fono-light hover:underline" href={order.drive_url} target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>Drive ↗</a> : <span>Sin enlace</span>}
        {hours ? <span className="whitespace-nowrap" title={`Horas: ${hours}`}>{hours}</span> : null}
        {order.checklist_total ? <span className="whitespace-nowrap" aria-label={`${order.checklist_completed||0} de ${order.checklist_total} pasos completados`}>☑ {order.checklist_completed||0}/{order.checklist_total} pasos</span> : null}
      </div>
      {order.description ? <p className="line-clamp-2 text-[11.5px] leading-5 text-mute" title={order.description}>{order.description}</p> : null}
      <DueDate value={order.due_date} time={order.due_time} compact/>
      <AssignedPeople people={order.effective_assignees} source={order.assignee_source}/>
      <ProjectCardPresence projectId={String(order.project_id)}/>
      {order.updated_at ? <p className="text-[10.5px] text-mute">Actualizada {listDateFull(order.updated_at)}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-600 pt-2">
        {canMove?<button className="text-button" onClick={()=>openOrder(order.id,true)}>Editar</button>:<button className="text-button" onClick={()=>openOrder(order.id)}>Ver más</button>}
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
  onLoadMore?:()=>void;
}) {
  const droppable = useDroppable({ id: `status-${status.id}` });
  return (
    <section
      ref={droppable.setNodeRef}
      className={`flex min-w-0 w-72 shrink-0 snap-start flex-col gap-2 rounded-xl border p-3 transition ${droppable.isOver ? "border-fono bg-fono/10" : "border-ink-600 bg-ink-800/60"}`}
      data-column={status.id}
    >
      <div className="flex items-center gap-2">
        <StateChip tone={STATUS_TONE[status.id] || 'mute'}>{status.label}</StateChip>
        <em className="ml-auto whitespace-nowrap rounded-full bg-ink-700 px-2 py-0.5 text-[10px] font-medium not-italic tabular-nums text-mute" title={`${counts ?? orders.length} piezas en ${status.label}`}>{counts ?? orders.length}</em>
      </div>
      {orders.map((order) => (
        <DraggableOrder key={order.id} order={order} role={role} refresh={refresh} openOrder={openOrder}/>
      ))}
      {hasMore && onLoadMore ? <button type="button" className="text-button justify-center" disabled={loadingMore} aria-label={`Ver más piezas en ${status.label}`} onClick={onLoadMore}>{loadingMore ? 'Trayendo…' : 'Ver más'}</button> : null}
      {!orders.length ? <p className="py-3 text-center text-[11px] text-mute">Sin piezas en esta etapa</p> : null}
    </section>
  );
}
