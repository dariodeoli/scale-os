import {actor} from './platform-admin.js';
import {option} from './suite-validation.js';
import {ERROR_SOURCES,ERROR_STATUSES} from './error-tracking.js';

// Sección «Errores» del panel global (detrás del guard de platform-router.js).
// Los grupos los escribe error-tracking.js ya sin PII; acá se listan, se ve el
// detalle con el stack de muestra y el admin los marca resueltos/ignorados.
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const LIST_COLUMNS='e.id,e.source,e.message,e.route,e.occurrences,e.first_seen_at,e.last_seen_at,e.status,e.resolved_at,u.email as resolved_by_email';
const integer=(value,fallback)=>{if(value===null||value==='')return fallback;const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:fallback;};
async function counts(db){
 const rows=(await db.query('select status,count(*)::int as total from platform_error_groups group by status')).rows;
 const recent=(await db.query("select count(*)::int as groups,coalesce(sum(case when first_seen_at>now()-interval '24 hours' then 1 else 0 end),0)::int as fresh from platform_error_groups where last_seen_at>now()-interval '24 hours'")).rows[0];
 return {counts:Object.fromEntries(ERROR_STATUSES.map(status=>[status,rows.find(row=>row.status===status)?.total||0])),last24h:{groups:recent.groups,new_groups:recent.fresh}};
}

export async function platformErrors({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/platform/errors'&&!url.pathname.startsWith('/api/platform/errors/'))return false;
 try{
  const {user,role}=await actor(db,session,req);
  if(url.pathname==='/api/platform/errors'){
   if(req.method!=='GET')fail('Método no permitido',405);
   const limit=Math.min(100,Math.max(1,integer(url.searchParams.get('limit'),50))),offset=integer(url.searchParams.get('offset'),0);
   const status=url.searchParams.get('status')||'',source=url.searchParams.get('source')||'';
   if(status&&!ERROR_STATUSES.includes(status))fail('Estado inválido');
   if(source&&!ERROR_SOURCES.includes(source))fail('Origen inválido');
   const filters=[],values=[];
   if(status){values.push(status);filters.push(`e.status=$${values.length}`);}
   if(source){values.push(source);filters.push(`e.source=$${values.length}`);}
   const where=filters.length?`where ${filters.join(' and ')}`:'';
   const total=Number((await db.query(`select count(*)::int as n from platform_error_groups e ${where}`,values)).rows[0].n);
   const rows=(await db.query(`select ${LIST_COLUMNS} from platform_error_groups e left join users u /*demo-ok: correo del administrador global que resolvió*/ on u.id=e.resolved_by ${where} order by e.last_seen_at desc,e.id desc limit $${values.length+1} offset $${values.length+2}`,[...values,limit,offset])).rows;
   send(res,200,{errors:rows,limit,offset,total,hasMore:offset+rows.length<total,...await counts(db)});return true;
  }
  const match=url.pathname.match(/^\/api\/platform\/errors\/([1-9]\d{0,17})$/);
  if(!match)fail('Error no encontrado.',404);
  if(req.method==='GET'){
   const row=(await db.query(`select ${LIST_COLUMNS},e.sample_stack,e.sample_meta from platform_error_groups e left join users u /*demo-ok: correo del administrador global que resolvió*/ on u.id=e.resolved_by where e.id=$1`,[match[1]])).rows[0];
   if(!row)fail('Error no encontrado.',404);
   send(res,200,{error:row});return true;
  }
  if(req.method!=='PATCH')fail('Método no permitido',405);
  if(role!=='admin')fail('Solo un administrador global puede hacer cambios.',403);
  const input=await body(req);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida.');
  if(Object.keys(input).some(key=>key!=='status'))fail('La solicitud contiene campos no permitidos.');
  let status;try{status=option(input.status,ERROR_STATUSES);}catch{fail('Estado inválido');}
  const row=(await db.query(`update platform_error_groups set status=$2,updated_at=now(),resolved_by=case when $2='new' then null else $3::bigint end,resolved_at=case when $2='new' then null else now() end where id=$1 returning id`,[match[1],status,user.id])).rows[0];
  if(!row)fail('Error no encontrado.',404);
  await db.query('insert into platform_audit_log(actor_user_id,action,target_type,target_id,metadata) values($1,$2,$3,$4,$5::jsonb)',[user.id,'error.update','platform_error',String(row.id),JSON.stringify({status})]);
  const updated=(await db.query(`select ${LIST_COLUMNS} from platform_error_groups e left join users u /*demo-ok: correo del administrador global que resolvió*/ on u.id=e.resolved_by where e.id=$1`,[row.id])).rows[0];
  send(res,200,{error:updated,...await counts(db)});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}
