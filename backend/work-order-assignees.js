import {visibleRecord} from './record-lifecycle.js';

// One batched lookup for a complete response. Inheritance is display context,
// never a stored assignment, permission grant, or name/alias-based identity match.
export async function enrichWorkOrderAssignees(c,org,records){
 const list=(Array.isArray(records)?records:[records]).filter(Boolean);
 if(!list.length)return;
 const ids=[...new Set(list.map(row=>String(row.id)))];
  const rows=(await c.query(`with orders as (
   select o.id,o.project_id from agency_work_orders o
   join agency_projects p on p.id=o.project_id and p.organization_id=o.organization_id
   join agency_clients cl on cl.id=p.client_id and cl.organization_id=p.organization_id
   where o.organization_id=$1 and o.id=any($2::bigint[])
    and ${visibleRecord('o','work-orders')} and ${visibleRecord('p','projects')} and ${visibleRecord('cl','clients')}
  ), raw as (
   select a.work_order_id,a.user_id,false as is_primary,'direct'::text as source
   from agency_work_order_assignees a join orders o on o.id=a.work_order_id where a.organization_id=$1
   union all
   select o.id,w.assigned_user_id,true,'direct' from orders o join agency_work_orders w on w.id=o.id where w.assigned_user_id is not null
   union all
   select o.id,a.user_id,false,'project'::text
   from agency_project_assignees a join orders o on o.project_id=a.project_id where a.organization_id=$1
   union all
   select o.id,p.assigned_user_id,true,'project' from orders o join agency_projects p on p.id=o.project_id where p.assigned_user_id is not null
  ), assignments as (
   select r.work_order_id,r.user_id,r.source,bool_or(r.is_primary) as is_primary
   from raw r group by r.work_order_id,r.user_id,r.source
  ), people as materialized (
   -- La identidad se materializa una sola vez: expandir la vista por fila desviaba
   -- el plan a un nested loop que descartaba millones de filas.
   select i.user_id,i.email,i.full_name,i.photo_url from organization_person_identity i
   where i.organization_id=$1 and i.user_id in (select user_id from assignments)
  ) select a.work_order_id::text,a.user_id::text as id,a.is_primary,a.source,
   coalesce(nullif(trim(i.full_name),''),i.email) as full_name,i.photo_url
  from assignments a join people i on i.user_id=a.user_id
  order by a.work_order_id,a.source,a.is_primary desc,a.user_id`,[org,ids])).rows;
 const byOrder=new Map();
  for(const {work_order_id,source,...person} of rows){
   if(!byOrder.has(work_order_id))byOrder.set(work_order_id,{direct:[],project:[]});
   byOrder.get(work_order_id)[source].push(person);
  }
  for(const record of list){
   const assigned=byOrder.get(String(record.id))||{direct:[],project:[]};
   // El detalle directo/proyecto no se duplica en el payload: la respuesta lleva
   // la lista efectiva, su origen y los ids directos, que es lo que consume la UI.
   record.effective_assignees=assigned.direct.length?assigned.direct:assigned.project;
   record.assignee_source=assigned.direct.length?'direct':assigned.project.length?'project':null;
   record.assigned_user_ids=assigned.direct.map(person=>person.id);
  }
}
