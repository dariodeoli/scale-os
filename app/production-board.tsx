"use client";
import {useDraggable,useDroppable} from '@dnd-kit/core';
import {Eye,Link as LinkIcon,Pencil} from 'lucide-react';
import {ClientIdentity,identityColor} from './client-identity';
import {UrgencyBadge} from './urgency';
import {DueDate} from './due-date';
import {AssignedPeople,type AssignedPerson} from './assigned-people';
import {ProjectCardPresence} from './presence';
import {RemoveRecord} from './archive-controls';

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
  description?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  effective_assignees?: AssignedPerson[];
  assignee_source?: 'direct' | 'project' | null;
  checklist_total?: number;
  checklist_completed?: number;
};

function DraggableOrder({ order,role,refresh,openOrder }: { order: WorkOrderCard;role:string;refresh:()=>Promise<void>;openOrder:(id:string,edit?:boolean)=>void }) {
  const canMove=['owner','admin','management','production','editor'].includes(role);
  const draggable = useDraggable({ id: order.id,disabled:!canMove });
  const style = draggable.transform
    ? {
        transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
      }
    : undefined;
  return (
    <article
      ref={draggable.setNodeRef}
      style={style}
      className={`work-card identity-card identity-${identityColor(order.client_color_key)} ${draggable.isDragging ? "dragging" : ""}`}
    >
      <div className="card-top">
        <button className="text-button order-open" aria-label={`Abrir ${order.title}`} onClick={()=>openOrder(order.id)}>{order.title}</button>
        {canMove&&<button className="icon-button" title={`Mover ${order.title}`} aria-label={`Mover ${order.title}`} {...draggable.listeners} {...draggable.attributes}>⋮⋮</button>}
      </div>
      <p>
        <ClientIdentity compact name={order.client_name} logo={order.client_logo_url} color={order.client_color_key}/> · {order.project_name}
      </p>
      <div className="card-meta"><UrgencyBadge value={order.urgency}/>
        {order.drive_url ? (
          <a
            href={order.drive_url}
            target="_blank"
            rel="noreferrer"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <LinkIcon size={12} /> Drive
          </a>
        ) : (
          <span>Sin enlace</span>
        )}
        {order.description&&<span className="order-description">{order.description}</span>}
      </div>
      <DueDate value={order.due_date} time={order.due_time} compact/>
      <AssignedPeople people={order.effective_assignees} source={order.assignee_source}/>
      <ProjectCardPresence projectId={String(order.project_id)}/>
      {!!order.checklist_total&&<small className="card-checklist" aria-label={`${order.checklist_completed||0} de ${order.checklist_total} pasos completados`}>☑ {order.checklist_completed||0}/{order.checklist_total} pasos</small>}
      <div className="order-actions">{canMove?<button className="text-button" onClick={()=>openOrder(order.id,true)}><Pencil size={14}/>Editar</button>:<button className="text-button" onClick={()=>openOrder(order.id)}><Eye size={14}/>Ver más</button>}{canMove&&<RemoveRecord kind="work-orders" id={order.id} name={order.title} done={refresh} role={role}/>}</div>
    </article>
  );
}
export function KanbanColumn({
  status,
  orders,
  role,
  refresh,
  openOrder,
}: {
  status: (typeof statuses)[number];
  orders: WorkOrderCard[];
  role:string;
  refresh:()=>Promise<void>;
  openOrder:(id:string,edit?:boolean)=>void;
}) {
  const droppable = useDroppable({ id: `status-${status.id}` });
  return (
    <section
      ref={droppable.setNodeRef}
      className={`column ${droppable.isOver ? "drop-over" : ""}`}
    >
      <div className="column-title">
        <span className={`dot ${status.tone}`} />
        <b>{status.label}</b>
        <em>{orders.length}</em>
      </div>
      {orders.map((order) => (
        <DraggableOrder key={order.id} order={order} role={role} refresh={refresh} openOrder={openOrder}/>
      ))}
    </section>
  );
}

