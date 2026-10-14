import {actor} from './platform-admin.js';
import {option,text as validText} from './suite-validation.js';
import {REPORT_LIMITS,REPORT_STATUSES} from './user-reports.js';

// Sección «Reportes» del panel global (detrás del guard de platform-router.js):
// bandeja de «Reportar un problema» con estado nuevo / en curso / resuelto y nota.
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const COLUMNS=`r.id,r.category,r.message,r.route,r.app_version,r.status,r.note,r.handled_at,r.created_at,r.updated_at,
 o.name as organization_name,o.slug as organization_slug,u.email as user_email,
 (select ip.full_name from organization_person_identity ip where ip.user_id=r.user_id and ip.organization_id=r.organization_id limit 1) as user_name,
 h.email as handled_by_email`;
const FROM='from platform_user_reports r left join organizations o /*demo-ok: agencia del autor; el Demo no puede reportar*/ on o.id=r.organization_id left join users u /*demo-ok: autor del reporte; el Demo no puede reportar*/ on u.id=r.user_id left join users h /*demo-ok: administrador global que lo atendió*/ on h.id=r.handled_by';
const integer=(value,fallback)=>{if(value===null||value==='')return fallback;const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:fallback;};
async function counts(db){
 const rows=(await db.query('select status,count(*)::int as total from platform_user_reports group by status')).rows;
 return Object.fromEntries(REPORT_STATUSES.map(status=>[status,rows.find(row=>row.status===status)?.total||0]));
}

export async function platformReports({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/platform/reports'&&!url.pathname.startsWith('/api/platform/reports/'))return false;
 try{
  const {user,role}=await actor(db,session,req);
  if(url.pathname==='/api/platform/reports'){
   if(req.method!=='GET')fail('Método no permitido',405);
   const limit=Math.min(100,Math.max(1,integer(url.searchParams.get('limit'),50))),offset=integer(url.searchParams.get('offset'),0);
   const status=url.searchParams.get('status')||'';
   if(status&&!REPORT_STATUSES.includes(status))fail('Estado inválido');
   const where=status?'where r.status=$3':'';
   const total=Number((await db.query(`select count(*)::int as n from platform_user_reports r ${status?'where r.status=$1':''}`,status?[status]:[])).rows[0].n);
   const rows=(await db.query(`select ${COLUMNS} ${FROM} ${where} order by r.created_at desc,r.id desc limit $1 offset $2`,status?[limit,offset,status]:[limit,offset])).rows;
   send(res,200,{reports:rows,limit,offset,total,hasMore:offset+rows.length<total,counts:await counts(db)});return true;
  }
  const match=url.pathname.match(/^\/api\/platform\/reports\/([1-9]\d{0,17})$/);
  if(!match)fail('Reporte no encontrado.',404);
  if(req.method!=='PATCH')fail('Método no permitido',405);
  if(role!=='admin')fail('Solo un administrador global puede hacer cambios.',403);
  const input=await body(req);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida.');
  if(Object.keys(input).some(key=>!['status','note'].includes(key)))fail('La solicitud contiene campos no permitidos.');
  if(input.status===undefined&&input.note===undefined)fail('Indicá el estado o la nota.');
  const current=(await db.query('select id,status,note from platform_user_reports where id=$1',[match[1]])).rows[0];
  if(!current)fail('Reporte no encontrado.',404);
  // PATCH: solo se revalida el campo que cambia; el otro queda tal cual.
  let status=current.status,note=current.note;
  if(input.status!==undefined){try{status=option(input.status,REPORT_STATUSES);}catch{fail('Estado inválido');}}
  if(input.note!==undefined){if(input.note===null)note=null;else{try{note=validText(input.note,REPORT_LIMITS.note)||null;}catch{fail(`La nota admite hasta ${REPORT_LIMITS.note} caracteres.`);}}}
  const handled=status!==current.status;
  await db.query(`update platform_user_reports set status=$2,note=$3,updated_at=now()${handled?',handled_by=$4,handled_at=now()':''} where id=$1`,handled?[current.id,status,note,user.id]:[current.id,status,note]);
  await db.query('insert into platform_audit_log(actor_user_id,action,target_type,target_id,metadata) values($1,$2,$3,$4,$5::jsonb)',[user.id,'report.update','platform_user_report',String(current.id),JSON.stringify({status,...(input.note!==undefined?{note_changed:true}:{})})]);
  const row=(await db.query(`select ${COLUMNS} ${FROM} where r.id=$1`,[current.id])).rows[0];
  send(res,200,{report:row,counts:await counts(db)});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}
