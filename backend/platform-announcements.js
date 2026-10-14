import {actor,realUser} from './platform-admin.js';
import {realOrganization} from './platform-subscription-service.js';
import {optId} from './suite-validation.js';

// Comunicados de la plataforma (panel global → banner del espacio de trabajo).
// - /api/platform/announcements*: CRUD + publicar/despublicar (solo administradores
//   globales; escribir exige rol admin). Cada cambio queda en platform_audit_log.
// - /api/agency/announcements/active y /:id/dismiss: la persona con sesión ve el
//   comunicado vigente de mayor prioridad (1 = más alta) y al cerrarlo deja una
//   lectura única (announcement_id, user_id).
// Los textos son planos: se guardan sin HTML y la UI los dibuja como texto.
export const ANNOUNCEMENT_KINDS=['info','aviso','novedad'];
export const ANNOUNCEMENT_LIMITS={title:80,message:500};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const object=value=>{if(!value||typeof value!=='object'||Array.isArray(value))fail('Solicitud inválida.');return value;};
const FIELDS=['title','message','kind','priority','organizationId','startsAt','endsAt'];

// Texto plano: sin caracteres de control (salvo saltos de línea en el mensaje) ni etiquetas.
export function plainText(value,max,label,{multiline=false}={}){
 if(typeof value!=='string')fail(`${label} es obligatorio.`);
 let clean=value.replace(/\r\n?/g,'\n').replace(multiline?/[\u0000-\u0009\u000B-\u001F\u007F]/g:/[\u0000-\u001F\u007F]/g,' ').trim();
 if(multiline)clean=clean.replace(/\n{3,}/g,'\n\n');
 if(!clean)fail(`${label} es obligatorio.`);
 if([...clean].length>max)fail(`${label} admite hasta ${max} caracteres.`);
 if(/<\/?[a-z!][^>]*>/i.test(clean))fail(`${label} no admite HTML: escribí texto plano.`);
 return clean;
}
const priority=value=>{const n=Number(value);if(!Number.isInteger(n)||n<1||n>5)fail('La prioridad va de 1 (más alta) a 5.');return n;};
const kind=value=>{if(!ANNOUNCEMENT_KINDS.includes(value))fail('Tipo de comunicado inválido.');return value;};
const instant=(value,label,{optional=false}={})=>{
 if(value===null||value===undefined||value===''){if(optional)return null;fail(`Indicá ${label}.`);}
 if(typeof value!=='string'||value.length>40)fail(`${label} no es una fecha válida.`);
 const time=Date.parse(value);if(!Number.isFinite(time))fail(`${label} no es una fecha válida.`);
 return new Date(time).toISOString();
};
const organization=value=>{try{return optId(value);}catch{fail('La agencia del comunicado no es válida.');}};
const routeId=value=>{if(!/^[1-9]\d{0,17}$/.test(String(value)))fail('Comunicado no encontrado.',404);return String(value);};

/** Valida el cuerpo completo (alta) o solo los campos presentes (edición). */
export function announcementInput(input,current=null){
 object(input);
 if(Object.keys(input).some(key=>!FIELDS.includes(key)))fail('La solicitud contiene campos no permitidos.');
 const has=key=>current===null||input[key]!==undefined;
 const data={
  title:has('title')?plainText(input.title,ANNOUNCEMENT_LIMITS.title,'El título'):current.title,
  message:has('message')?plainText(input.message,ANNOUNCEMENT_LIMITS.message,'El mensaje',{multiline:true}):current.message,
  kind:has('kind')?kind(input.kind??'info'):current.kind,
  priority:has('priority')?priority(input.priority??3):current.priority,
  organizationId:has('organizationId')?organization(input.organizationId):current.organization_id===null?null:String(current.organization_id),
  startsAt:has('startsAt')?(input.startsAt===undefined||input.startsAt===null||input.startsAt===''?new Date().toISOString():instant(input.startsAt,'la fecha de inicio')):new Date(current.starts_at).toISOString(),
  endsAt:has('endsAt')?instant(input.endsAt,'la fecha de fin',{optional:true}):current.ends_at?new Date(current.ends_at).toISOString():null,
 };
 if(data.endsAt&&Date.parse(data.endsAt)<=Date.parse(data.startsAt))fail('La vigencia debe terminar después de empezar.');
 return data;
}

// Audiencia real: miembros activos de agencias reales (sin demo ni cuentas de prueba).
const AUDIENCE=`select distinct m.user_id from organization_members m
 join users u on u.id=m.user_id join organizations o on o.id=m.organization_id
 where m.active and m.removed_at is null and o.active and ${realOrganization('o')} and ${realUser('u')}
  and (a.organization_id is null or m.organization_id=a.organization_id)`;
const COLUMNS=`a.id,a.title,a.message,a.kind,a.priority,a.organization_id,o.name as organization_name,a.starts_at,a.ends_at,a.published_at,a.created_at,a.updated_at,
 case when a.published_at is null then 'draft' when a.starts_at>now() then 'scheduled' when a.ends_at is not null and a.ends_at<=now() then 'expired' else 'active' end as status,
 (select count(*)::int from (${AUDIENCE}) audience) as audience_users,
 (select count(*)::int from platform_announcement_reads r where r.announcement_id=a.id and r.user_id in (${AUDIENCE})) as reads`;
const withPct=row=>row&&({...row,read_pct:row.audience_users?Math.round(row.reads*1000/row.audience_users)/10:0});
async function detail(db,id){return withPct((await db.query(`select ${COLUMNS} from platform_announcements a left join organizations o on o.id=a.organization_id where a.id=$1`,[id])).rows[0]);}
async function audit(db,user,action,id,metadata={}){
 await db.query('insert into platform_audit_log(actor_user_id,action,target_type,target_id,metadata) values($1,$2,$3,$4,$5::jsonb)',[user.id,action,'platform_announcement',String(id),JSON.stringify(metadata)]);
}
async function assertOrganization(db,id){
 if(id===null)return;
 if(!(await db.query(`select 1 from organizations o where o.id=$1 and ${realOrganization('o')}`,[id])).rows[0])fail('La agencia del comunicado no existe.',404);
}

export async function platformAnnouncements({req,res,url,db,session,body,send}){
 const base='/api/platform/announcements';
 if(url.pathname!==base&&!url.pathname.startsWith(base+'/'))return false;
 try{
  const {user,role}=await actor(db,session,req);
  const write=()=>{if(role!=='admin')fail('Solo un administrador global puede hacer cambios.',403);};
  if(url.pathname===base){
   if(req.method==='GET'){
    const rows=(await db.query(`select ${COLUMNS} from platform_announcements a left join organizations o on o.id=a.organization_id order by a.created_at desc,a.id desc limit 200`)).rows.map(withPct);
    send(res,200,{announcements:rows,limits:ANNOUNCEMENT_LIMITS,kinds:ANNOUNCEMENT_KINDS});return true;
   }
   if(req.method!=='POST')fail('Método no permitido',405);
   write();
   const data=announcementInput(await body(req));
   await assertOrganization(db,data.organizationId);
   const id=(await db.query(`insert into platform_announcements(title,message,kind,priority,organization_id,starts_at,ends_at,created_by)
    values($1,$2,$3,$4,$5,$6,$7,$8) returning id`,[data.title,data.message,data.kind,data.priority,data.organizationId,data.startsAt,data.endsAt,user.id])).rows[0].id;
   await audit(db,user,'announcement.create',id,{kind:data.kind,priority:data.priority,audience:data.organizationId?'organization':'all'});
   send(res,201,{announcement:await detail(db,id)});return true;
  }
  const match=url.pathname.slice(base.length).match(/^\/([^/]+)(?:\/(publish|unpublish))?$/);
  if(!match)fail('Comunicado no encontrado.',404);
  const id=routeId(match[1]),action=match[2]||null;
  const current=(await db.query('select * from platform_announcements where id=$1',[id])).rows[0];
  if(!current)fail('Comunicado no encontrado.',404);
  if(action){
   if(req.method!=='POST')fail('Método no permitido',405);
   write();
   if(action==='publish'){
    if(current.ends_at&&new Date(current.ends_at).getTime()<=Date.now())fail('La vigencia ya terminó: cambiá la fecha de fin antes de publicar.');
    await db.query('update platform_announcements set published_at=coalesce(published_at,now()),updated_at=now() where id=$1',[id]);
   }else await db.query('update platform_announcements set published_at=null,updated_at=now() where id=$1',[id]);
   await audit(db,user,`announcement.${action}`,id);
   send(res,200,{announcement:await detail(db,id)});return true;
  }
  if(req.method==='GET'){send(res,200,{announcement:await detail(db,id)});return true;}
  if(req.method==='PATCH'){
   write();
   const input=object(await body(req));
   if(!Object.keys(input).length)fail('No hay cambios para guardar.');
   const data=announcementInput(input,current);
   if(input.organizationId!==undefined)await assertOrganization(db,data.organizationId);
   await db.query(`update platform_announcements set title=$2,message=$3,kind=$4,priority=$5,organization_id=$6,starts_at=$7,ends_at=$8,updated_at=now() where id=$1`,
    [id,data.title,data.message,data.kind,data.priority,data.organizationId,data.startsAt,data.endsAt]);
   await audit(db,user,'announcement.update',id,{fields:Object.keys(input)});
   send(res,200,{announcement:await detail(db,id)});return true;
  }
  if(req.method==='DELETE'){
   write();
   await db.query('delete from platform_announcements where id=$1',[id]);
   await audit(db,user,'announcement.delete',id,{was_published:Boolean(current.published_at)});
   send(res,200,{ok:true});return true;
  }
  fail('Método no permitido',405);
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}

// Vigente para la persona: publicado, dentro de la ventana, para todas las agencias
// o la suya, y sin lectura propia. Prioridad 1 primero; a igual prioridad, el más nuevo.
const VISIBLE=`a.published_at is not null and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())
 and (a.organization_id is null or a.organization_id=$2)`;
const PUBLIC_COLUMNS='a.id,a.title,a.message,a.kind,a.priority,a.starts_at,a.ends_at';
async function nextActive(db,user){
 const sql=`select ${PUBLIC_COLUMNS},(select count(*)::int from platform_announcements a where ${VISIBLE} and not exists(select 1 from platform_announcement_reads r where r.announcement_id=a.id and r.user_id=$1)) as pending
  from platform_announcements a where ${VISIBLE} and not exists(select 1 from platform_announcement_reads r where r.announcement_id=a.id and r.user_id=$1)
  order by a.priority asc,a.starts_at desc,a.id desc limit 1`;
 const row=(await db.query(sql,[user.id,user.organization_id])).rows[0];
 if(!row)return {announcement:null,pending:0};
 const {pending,...announcement}=row;
 return {announcement,pending};
}

export async function agencyAnnouncements({req,res,url,db,session,send}){
 const base='/api/agency/announcements';
 if(url.pathname!==base+'/active'&&!/^\/api\/agency\/announcements\/[^/]+\/dismiss$/.test(url.pathname))return false;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(url.pathname===base+'/active'){
   if(req.method!=='GET')fail('Método no permitido',405);
   send(res,200,await nextActive(db,user));return true;
  }
  if(req.method!=='POST')fail('Método no permitido',405);
  const id=routeId(url.pathname.split('/')[4]);
  const visible=(await db.query(`select a.id from platform_announcements a where a.id=$1 and ${VISIBLE}`,[id,user.organization_id])).rows[0];
  if(!visible)fail('Comunicado no encontrado.',404);
  await db.query('insert into platform_announcement_reads(announcement_id,user_id) values($1,$2) on conflict do nothing',[id,user.id]);
  send(res,200,{ok:true,...await nextActive(db,user)});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}
