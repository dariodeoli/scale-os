import {fail,text,id,optId,date,option,owned,taskTime,taskChecklist,taskMaterials} from './suite-validation.js';
import {roleCan} from './permissions.js';
import {visibleRecord} from './record-lifecycle.js';
import {historyPage} from './history-page.js';
import {mediaPeople,mediaPhoto} from './agency-media.js';
import {attributeActors} from './actor-identity.js';

const root='/api/agency/productivity/internal-tasks';
const fields=['title','description','status','priority','due_date','due_time','project_id','client_id','assigned_user_ids','checklist','materials','expected_version'];
const bucketSql={
 all:'true',
 today:"t.status<>'done' and t.due_date=(now() at time zone 'America/Asuncion')::date and (t.due_time is null or t.due_time>=(now() at time zone 'America/Asuncion')::time)",
 upcoming:"t.status<>'done' and t.due_date>(now() at time zone 'America/Asuncion')::date",
 overdue:"t.status<>'done' and (t.due_date<(now() at time zone 'America/Asuncion')::date or (t.due_date=(now() at time zone 'America/Asuncion')::date and t.due_time is not null and t.due_time<(now() at time zone 'America/Asuncion')::time))",
 completed:"t.status='done'",
 undated:"t.status<>'done' and t.due_date is null",
};
const visibleParents=`(t.project_id is null or exists(select 1 from agency_projects p where p.id=t.project_id and p.organization_id=t.organization_id and ${visibleRecord('p','projects')})) and (t.client_id is null or exists(select 1 from agency_clients cl where cl.id=t.client_id and cl.organization_id=t.organization_id and ${visibleRecord('cl','clients')})) and not exists(select 1 from agency_projects p join agency_archived_records ar on ar.organization_id=p.organization_id and ar.kind='clients' and ar.record_id=p.client_id where p.id=t.project_id and p.organization_id=t.organization_id)`;
function expected(value,current){
 if(!Number.isSafeInteger(value)||value<0)fail('Indicá la versión actual de la tarea');
 if(value!==Number(current))fail('La tarea cambió. Actualizá antes de guardar.',409);
}
function memberIds(raw){
 if(!Array.isArray(raw)||raw.length>40)fail('Seleccioná hasta 40 responsables');
 return [...new Set(raw.map(id))];
}
async function assigned(c,org,key){return(await c.query('select user_id::text as id from agency_internal_task_assignees where organization_id=$1 and task_id=$2 order by user_id',[org,key])).rows.map(r=>r.id);}
function ownTask(task,ids,user){return ids.includes(String(user.id))||(!ids.length&&String(task.created_by_user_id)===String(user.id));}
function canChange(task,ids,user){return roleCan(user,'tasks.edit')&&(roleCan(user,'tasks.assign')||ownTask(task,ids,user));}
async function parents(c,org,projectId,clientId){
 let client=optId(clientId),project=optId(projectId);
 if(project){const row=await owned(c,'agency_projects',project,org);if(client&&String(row.client_id)!==client)fail('El proyecto no pertenece al cliente seleccionado');client=String(row.client_id);}
 if(client)await owned(c,'agency_clients',client,org);
 return{project,client};
}
async function enrich(c,org,rows,user){
 if(!rows.length)return rows;
 const taskIds=rows.map(r=>String(r.id));
 const assignees=(await c.query('select task_id,user_id::text as user_id from agency_internal_task_assignees where organization_id=$1 and task_id=any($2::bigint[]) order by user_id',[org,taskIds])).rows;
 const people=mediaPeople((await c.query("select user_id as id,coalesce(nullif(trim(full_name),''),email) as full_name,photo_url from organization_person_identity where organization_id=$1 and user_id in (select user_id from agency_internal_task_assignees where organization_id=$1 and task_id=any($2::bigint[]))",[org,taskIds])).rows);
 const comments=(await c.query('select id,task_id,author_user_id,body,created_at from agency_internal_task_comments where organization_id=$1 and task_id=any($2::bigint[]) order by id',[org,taskIds])).rows;
 await attributeActors(c,org,[{rows:comments,userId:'author_user_id'}]);
 for(const row of rows){
  row.assigned_user_ids=assignees.filter(a=>String(a.task_id)===String(row.id)).map(a=>a.user_id);
  row.people=people.filter(p=>row.assigned_user_ids.includes(String(p.id)));
  row.comments=comments.filter(comment=>String(comment.task_id)===String(row.id));
  row.version=Number(row.version);
  row.due_date=row.due_date instanceof Date?row.due_date.toISOString().slice(0,10):row.due_date;
  row.due_time=row.due_time?.slice(0,5)||null;
  row.can_edit=canChange(row,row.assigned_user_ids,user);row.can_complete=row.can_edit;
 }
 return rows;
}
export async function employeeTasks({req,res,url,db,session,body,send}){
 if(url.pathname!==root&&!url.pathname.startsWith(root+'/'))return false;
 const match=url.pathname.slice(root.length).match(/^(?:\/(context|\d+))?(?:\/(comments))?$/);
 let c,tx=false;
 try{
  if(!match)fail('Ruta no encontrada',404);
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roleCan(user,'tasks.view'))fail('Sin permiso para ver tareas',403);
  const org=user.organization_id;
  const key=match[1]&&match[1]!=='context'?id(match[1]):null,action=match[2];
  c=await db.connect();await c.query('begin');tx=true;
  const membership=(await c.query('select m.role from organization_members m join organizations o on o.id=m.organization_id where m.organization_id=$1 and m.user_id=$2 and m.active=true and m.removed_at is null and o.active=true for share of m,o',[org,user.id])).rows[0];
  if(!membership)fail('Sin acceso activo a esta empresa',403);
  user.role=membership.role;
  if(!roleCan(user,'tasks.view'))fail('Sin permiso para ver tareas',403);
  const canAssign=roleCan(user,'tasks.assign'),canEdit=roleCan(user,'tasks.edit');
  await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true),set_config('app.current_organization',$3,true)",[String(user.id),req.socket?.remoteAddress||'',String(org)]);
  let result,status=200;
  if(match[1]==='context'&&req.method==='GET'&&!action){
   const people=mediaPeople((await c.query("select i.user_id as id,coalesce(nullif(trim(i.full_name),''),i.email) as full_name,i.photo_url from organization_person_identity i join organization_members m on m.organization_id=i.organization_id and m.user_id=i.user_id where i.organization_id=$1 and m.active=true and m.removed_at is null and ($2::boolean or i.user_id=$3) order by full_name,i.user_id",[org,canAssign,user.id])).rows);
   const projects=(await c.query(`select p.id,p.name,p.client_id from agency_projects p join agency_clients cl on cl.id=p.client_id and cl.organization_id=p.organization_id where p.organization_id=$1 and ${visibleRecord('p','projects')} and ${visibleRecord('cl','clients')} order by p.name,p.id`,[org])).rows;
   const clients=(await c.query(`select cl.id,cl.name,cl.logo_url from agency_clients cl where cl.organization_id=$1 and ${visibleRecord('cl','clients')} order by cl.name,cl.id`,[org])).rows;
   result={people,projects,clients:clients.map(client=>({...client,logo_url:mediaPhoto('client',client.id,client.logo_url)})),can_assign:canAssign,can_edit:canEdit};
  }else if(!key&&!match[1]&&req.method==='GET'&&!action){
   const page=historyPage(url.searchParams),params=[org];let where=`t.organization_id=$1 and ${visibleParents}`;
   const person=url.searchParams.get('assignee')||'me',bucket=option(url.searchParams.get('bucket')||'all',Object.keys(bucketSql));
   if(person==='all'){if(!canAssign)fail('Sin permiso para ver tareas de otras personas',403);}
   else{
    const personId=person==='me'?String(user.id):id(person);
    if(personId!==String(user.id)&&!canAssign)fail('Sin permiso para ver tareas de otra persona',403);
    params.push(personId);const at='$'+params.length;
    where+=` and (exists(select 1 from agency_internal_task_assignees a where a.task_id=t.id and a.organization_id=t.organization_id and a.user_id=${at}) or (t.created_by_user_id=${at} and not exists(select 1 from agency_internal_task_assignees a where a.task_id=t.id and a.organization_id=t.organization_id)))`;
   }
   for(const field of ['project_id','client_id'])if(url.searchParams.has(field)){params.push(id(url.searchParams.get(field)));where+=` and t.${field}=$${params.length}`;}
   const from=date(url.searchParams.get('from')),to=date(url.searchParams.get('to'));
   if(from&&to&&from>to)fail('El rango de fechas es inválido');
   if(from){params.push(from);where+=` and t.due_date>=$${params.length}`;}
   if(to){params.push(to);where+=` and t.due_date<=$${params.length}`;}
   const counts=(await c.query(`select ${Object.entries(bucketSql).map(([name,sql])=>`count(*) filter(where ${sql})::int as ${name}`).join(',')} from agency_internal_tasks t where ${where}`,params)).rows[0];
   const values=[...params,page.limit,page.offset];
   const rows=(await c.query(`select t.*,p.name as project_name,cl.name as client_name from agency_internal_tasks t left join agency_projects p on p.id=t.project_id and p.organization_id=t.organization_id left join agency_clients cl on cl.id=t.client_id and cl.organization_id=t.organization_id where ${where} and (${bucketSql[bucket]}) order by case when t.status='done' then 1 else 0 end,t.due_date asc nulls last,t.due_time asc nulls last,t.id desc limit $${values.length-1} offset $${values.length}`,values)).rows;
   result={records:await enrich(c,org,rows,user),counts,page:{...page,total:counts[bucket],hasMore:page.offset+rows.length<counts[bucket]},can_assign:canAssign,can_edit:canEdit};
  }else if(key){
   const task=await owned(c,'agency_internal_tasks',key,org),ids=await assigned(c,org,key);
   if(!canAssign&&!ownTask(task,ids,user))fail('Tarea no encontrada',404);
   if(req.method==='GET'&&!action){await parents(c,org,task.project_id,task.client_id);result={record:(await enrich(c,org,[task],user))[0]};}
   else{
    if(!canChange(task,ids,user))fail('Sin permiso para editar esta tarea',403);
    const incoming=await body(req);if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))fail('Datos inválidos');
    expected(incoming.expected_version,task.version);
    if(action==='comments'&&req.method==='POST'){
     if(Object.keys(incoming).some(k=>!['body','expected_version'].includes(k)))fail('Campos de comentario inválidos');
     const content=text(incoming.body,2000);if(!content)fail('Escribí un comentario');
     await parents(c,org,task.project_id,task.client_id);
     await c.query('insert into agency_internal_task_comments(organization_id,task_id,author_user_id,body) values($1,$2,$3,$4)',[org,key,user.id,content]);
     const saved=(await c.query('update agency_internal_tasks set version=version+1,updated_at=now(),updated_by_user_id=$3 where organization_id=$1 and id=$2 and version=$4 returning *',[org,key,user.id,incoming.expected_version])).rows[0];
     if(!saved)fail('La tarea cambió. Actualizá antes de guardar.',409);
     result={record:(await enrich(c,org,[saved],user))[0]};status=201;
    }else if(req.method==='PATCH'&&!action){result={record:await saveTask(c,org,user,incoming,task,ids)};}
    else fail('Método no permitido',405);
   }
  }else if(!match[1]&&req.method==='POST'&&!action){
   if(!canEdit)fail('Sin permiso para crear tareas',403);
   const incoming=await body(req);if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))fail('Datos inválidos');
   expected(incoming.expected_version,0);
   result={record:await saveTask(c,org,user,incoming,null,[])};status=201;
  }else fail('Método no permitido',405);
  await c.query('commit');tx=false;send(res,status,result);return true;
 }catch(error){if(tx)await c.query('rollback');console.error(JSON.stringify({event:'employee_tasks_error',status:error.status||500,code:error.code}));send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la tarea'});return true;}
 finally{c?.release();}
}
async function saveTask(c,org,user,incoming,old,oldIds){
 if(Object.keys(incoming).some(k=>!fields.includes(k)))fail('Campos de tarea inválidos');
 const next={...(old||{title:'',description:'',status:'pending',priority:'normal',due_date:null,due_time:null,project_id:null,client_id:null,checklist:[],materials:[]})};
 if(!old||Object.hasOwn(incoming,'title')){next.title=text(incoming.title,160);if(next.title.length<2)fail('Ingresá el título');}
 if(Object.hasOwn(incoming,'description'))next.description=text(incoming.description,4000);
 for(const [field,values] of [['status',['pending','in_progress','done']],['priority',['low','normal','high','urgent']]])if(Object.hasOwn(incoming,field))next[field]=option(incoming[field],values);
 if(Object.hasOwn(incoming,'due_date'))next.due_date=date(incoming.due_date);
 if(Object.hasOwn(incoming,'due_time'))next.due_time=taskTime(incoming.due_time);
 if(next.due_time&&!next.due_date)fail('La hora de vencimiento requiere una fecha');
 if(Object.hasOwn(incoming,'checklist'))next.checklist=taskChecklist(incoming.checklist);
 if(Object.hasOwn(incoming,'materials'))next.materials=taskMaterials(incoming.materials);
 const projectValue=Object.hasOwn(incoming,'project_id')?incoming.project_id:next.project_id;
 // Changing project without a client derives the selected project's client.
 const clientValue=Object.hasOwn(incoming,'client_id')?incoming.client_id:Object.hasOwn(incoming,'project_id')&&incoming.project_id?null:next.client_id;
 const parent=await parents(c,org,projectValue,clientValue);next.project_id=parent.project;next.client_id=parent.client;
 const ids=Object.hasOwn(incoming,'assigned_user_ids')?memberIds(incoming.assigned_user_ids):old?oldIds:[String(user.id)];
 if(!roleCan(user,'tasks.assign')&&(!old||Object.hasOwn(incoming,'assigned_user_ids'))){
  const unchanged=old&&ids.length===oldIds.length&&ids.every(person=>oldIds.includes(person));
  if(!unchanged&&(ids.length!==1||ids[0]!==String(user.id)||oldIds.length))fail('Sin permiso para cambiar responsables',403);
 }
 if(ids.length){const active=(await c.query('select user_id::text as id from organization_members where organization_id=$1 and user_id=any($2::bigint[]) and active=true and removed_at is null for share',[org,ids])).rows;if(active.length!==ids.length)fail('Responsable sin acceso activo a esta empresa');}
 const values=[org,next.title,next.description,next.status,next.priority,next.due_date,next.due_time,next.project_id,next.client_id,ids[0]||null,JSON.stringify(next.checklist),JSON.stringify(next.materials),user.id];
 let saved;
 if(old){values.push(old.id,incoming.expected_version);saved=(await c.query(`update agency_internal_tasks set title=$2,description=$3,status=$4,priority=$5,due_date=$6,due_time=$7,project_id=$8,client_id=$9,assigned_user_id=$10,checklist=$11::jsonb,materials=$12::jsonb,updated_by_user_id=$13,version=version+1,updated_at=now(),completed_at=case when $4='done' then coalesce(completed_at,now()) else null end where organization_id=$1 and id=$14 and version=$15 returning *`,values)).rows[0];if(!saved)fail('La tarea cambió. Actualizá antes de guardar.',409);}
 else saved=(await c.query(`insert into agency_internal_tasks(organization_id,title,description,status,priority,due_date,due_time,project_id,client_id,assigned_user_id,checklist,materials,created_by_user_id,updated_by_user_id,completed_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$13,case when $4='done' then now() else null end) returning *`,values)).rows[0];
 if(!old||Object.hasOwn(incoming,'assigned_user_ids')){
  await c.query('delete from agency_internal_task_assignees where organization_id=$1 and task_id=$2 and not(user_id=any($3::bigint[]))',[org,saved.id,ids]);
  for(const person of ids)await c.query('insert into agency_internal_task_assignees(organization_id,task_id,user_id) values($1,$2,$3) on conflict do nothing',[org,saved.id,person]);
 }
 return(await enrich(c,org,[saved],user))[0];
}
