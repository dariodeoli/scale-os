// PDP — Ley N° 7593/2025 (scale-os#112): consentimientos verificables, derechos
// del titular (ARSOP + portabilidad), bitácora de accesos y supresión compatible
// con conservación legal. Los textos jurídicos finales los aprueba el dueño; acá
// viven el modelo, los flujos y el versionado del aviso.
import {roleCan} from './permissions.js';
import {readClientPortalSession} from './client-portal-session.js';
import {privacyRetentionPolicies} from './personal-data-retention.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

/** Versión vigente del aviso de privacidad: la cadena mapea al texto inmutable. */
export const PRIVACY_NOTICE_VERSION='2026-09-30-v1';
const DEFAULT_NOTICE_URL='https://scaleparaguay.com/privacidad';
export const PRIVACY_PURPOSES=[
 {id:'account',label:'Cuenta y acceso',description:'Crear y administrar la cuenta, iniciar sesión y proteger el acceso.'},
 {id:'service',label:'Prestación del servicio',description:'Datos necesarios para operar la empresa: clientes, proyectos, piezas y entregas.'},
 {id:'billing',label:'Facturación y cobros',description:'Facturas, pagos y obligaciones contables y fiscales.'},
 {id:'portal',label:'Portal del cliente',description:'Entregas, revisiones, comentarios y actividad del portal.'},
 {id:'contact',label:'Contacto y consultas',description:'Responder una consulta o un pedido de contacto del titular.'},
];
export const SUBJECT_KINDS=['user','client','lead','portal_user'];
export const REQUEST_TYPES=['access','portability','rectification','suppression','opposition'];
export const CONSENT_BASES=['consent','contract','legal_obligation','vital_interests','public_interest','legitimate_interest'];
export const REQUEST_STATUSES=['received','identity_verified','in_review','resolved','rejected','cancelled'];
export const OPEN_REQUEST_STATUSES=['received','identity_verified','in_review'];
export const RESOLUTION_ACTIONS=['export_delivered','corrected','opposed','blocked','anonymized','none'];
const ACCESS_ACTIONS=['view','export','consent.grant','consent.revoke','request.create','request.update','request.resolve','request.reject','erasure','salary.view'];
const purposeIds=new Set(PRIVACY_PURPOSES.map(item=>item.id));

export function privacyNotice(){
 return {
  version:(process.env.PRIVACY_NOTICE_VERSION||'').trim()||PRIVACY_NOTICE_VERSION,
  url:(process.env.PRIVACY_NOTICE_URL||'').trim()||DEFAULT_NOTICE_URL,
  responsible:(process.env.PRIVACY_RESPONSIBLE||'').trim()||'Scale Strategy Group',
  contact:(process.env.PRIVACY_CONTACT_EMAIL||'').trim()||'privacidad@scaleparaguay.com',
  purposes:PRIVACY_PURPOSES,
 };
}

const safeText=(value,max)=>{const text=typeof value==='string'?value.trim():'';if(text.length>max)fail('Texto demasiado largo');return text;};
const requiredText=(value,max,message)=>{const text=safeText(value,max);if(text.length<2)fail(message);return text;};
const slug=value=>{const text=safeText(value,40);if(!/^[a-z0-9][a-z0-9_.-]{1,39}$/.test(text))fail('Origen inválido');return text;};
const optionalEmail=value=>{const text=safeText(value,254).toLowerCase();if(!text)return null;if(!/^\S+@\S+\.\S+$/.test(text))fail('Correo inválido');return text;};
const jsonEvidence=value=>{
 if(value===undefined||value===null)return '{}';
 if(typeof value!=='object'||Array.isArray(value))fail('Evidencia inválida');
 const raw=JSON.stringify(value);
 if(raw.length>4000)fail('Evidencia demasiado grande');
 return raw;
};

/** Registra (o actualiza) el consentimiento vigente de un titular para una finalidad. */
export async function grantConsent(c,{organizationId,subjectKind,subjectId,purpose,source,basis='consent',grantedByUserId=null,evidence={},noticeVersion=null}){
 if(!SUBJECT_KINDS.includes(subjectKind))fail('Tipo de titular inválido');
 if(!purposeIds.has(purpose))fail('Finalidad inválida');
 if(!CONSENT_BASES.includes(basis))fail('Base legal inválida');
 const version=safeText(noticeVersion,60)||privacyNotice().version;
 return (await c.query(`insert into personal_data_consents(organization_id,subject_kind,subject_id,purpose,basis,notice_version,source,granted_by_user_id,evidence)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9)
  on conflict(organization_id,subject_kind,subject_id,purpose) where revoked_at is null
  do update set basis=excluded.basis,notice_version=excluded.notice_version,source=excluded.source,granted_at=now(),granted_by_user_id=excluded.granted_by_user_id,evidence=excluded.evidence,updated_at=now()
  returning *`,[organizationId,subjectKind,String(subjectId),purpose,basis,version,slug(source),grantedByUserId,jsonEvidence(evidence)])).rows[0];
}

/** Igual que `grantConsent`, pero no reescribe la evidencia de un consentimiento ya vigente. */
export async function ensureConsent(c,{organizationId,subjectKind,subjectId,purpose,source,basis='consent',grantedByUserId=null,evidence={},noticeVersion=null}){
 if(!SUBJECT_KINDS.includes(subjectKind))fail('Tipo de titular inválido');
 if(!purposeIds.has(purpose))fail('Finalidad inválida');
 if(!CONSENT_BASES.includes(basis))fail('Base legal inválida');
 const version=safeText(noticeVersion,60)||privacyNotice().version;
 return (await c.query(`insert into personal_data_consents(organization_id,subject_kind,subject_id,purpose,basis,notice_version,source,granted_by_user_id,evidence)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9)
  on conflict(organization_id,subject_kind,subject_id,purpose) where revoked_at is null do nothing
  returning *`,[organizationId,subjectKind,String(subjectId),purpose,basis,version,slug(source),grantedByUserId,jsonEvidence(evidence)])).rows[0]||null;
}

/** Revoca el consentimiento vigente (o todos los del titular si no se indica finalidad). Idempotente. */
export async function revokeConsent(c,{organizationId,subjectKind,subjectId,purpose=null,actorUserId=null,reason=null}){
 if(!SUBJECT_KINDS.includes(subjectKind))fail('Tipo de titular inválido');
 const params=[organizationId,subjectKind,String(subjectId)];
 let clause='organization_id=$1 and subject_kind=$2 and subject_id=$3 and revoked_at is null';
 if(purpose!==null){
  const list=Array.isArray(purpose)?purpose:[purpose];
  if(!list.length||list.some(item=>!purposeIds.has(item)))fail('Finalidad inválida');
  params.push(list);clause+=` and purpose=any($${params.length}::text[])`;
 }
 params.push(actorUserId,reason?safeText(reason,500):null);
 const rows=(await c.query(`update personal_data_consents set revoked_at=now(),revoked_by_user_id=$${params.length-1},revoke_reason=$${params.length},updated_at=now() where ${clause} returning id,purpose`,[...params])).rows;
 return {revoked:rows.length,purposes:rows.map(row=>row.purpose)};
}

/** Bitácora de accesos a datos personales: quién vio o exportó qué, nunca el contenido. */
export async function logPersonalDataAccess(c,{organizationId,actorUserId=null,actorKind='user',actorLabel=null,action,subjectKind=null,subjectId=null,context=null,details={}}){
 if(!ACCESS_ACTIONS.includes(action))fail('Acción de bitácora inválida');
 await c.query(`insert into personal_data_access_log(organization_id,actor_kind,actor_user_id,actor_label,action,subject_kind,subject_id,context,details)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[organizationId,actorKind,actorUserId,actorLabel?safeText(actorLabel,160):null,action,subjectKind,subjectId===null||subjectId===undefined?null:String(subjectId),context?safeText(context,160):null,jsonEvidence(details)]);
}

/** Nombre y correo de contacto del titular dentro de una agencia (para la cola y los pedidos). */
async function subjectDisplay(c,organizationId,subjectKind,subjectId){
 if(subjectKind==='user'){
  const row=(await c.query(`select coalesce(nullif(trim(p.full_name),''),u.email) as name,u.email from organization_members m join users u on u.id=m.user_id left join agency_user_profiles p on p.user_id=u.id and p.organization_id=m.organization_id where m.organization_id=$1 and m.user_id=$2`,[organizationId,subjectId])).rows[0];
  return row?{name:row.name,email:row.email}:null;
 }
 if(subjectKind==='client'){
  const row=(await c.query('select name,email from agency_clients where organization_id=$1 and id=$2',[organizationId,subjectId])).rows[0];
  return row?{name:row.name,email:row.email}:null;
 }
 if(subjectKind==='lead'){
  const row=(await c.query('select name,email from agency_leads where organization_id=$1 and id=$2',[organizationId,subjectId])).rows[0];
  return row?{name:row.name,email:row.email}:null;
 }
 if(subjectKind==='portal_user'){
  const row=(await c.query('select full_name as name,email from client_portal_users where organization_id=$1 and id=$2',[organizationId,subjectId])).rows[0];
  return row?{name:row.name,email:row.email}:null;
 }
 return null;
}

async function requireSubject(c,organizationId,subjectKind,subjectId){
 if(subjectKind==='other')return {name:null,email:null};
 if(!SUBJECT_KINDS.includes(subjectKind))fail('Tipo de titular inválido');
 if(!/^\d+$/.test(String(subjectId||'')))fail('Indicá el titular');
 const display=await subjectDisplay(c,organizationId,subjectKind,String(subjectId));
 if(!display)fail('Titular no encontrado en esta empresa',404);
 return display;
}

const iso=value=>value instanceof Date?value.toISOString():value;

/** Export completo de los datos personales de un titular (JSON canónico). */
export async function buildPersonalDataExport(c,{organizationId,subjectKind,subjectId,organizationName}){
 const display=await requireSubject(c,organizationId,subjectKind,subjectId);
 const notice=privacyNotice();
 const sections=[];
 const section=(id,title,rows)=>sections.push({id,title,rows:rows.map(row=>Object.fromEntries(Object.entries(row).map(([key,value])=>[key,iso(value)])))});
 const consents=(await c.query('select purpose,basis,notice_version,source,granted_at,revoked_at,revoke_reason from personal_data_consents where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by created_at',[organizationId,subjectKind,String(subjectId)])).rows;
 const requests=(await c.query('select id,request_type,status,received_at,due_at,resolved_at,resolution,resolution_action from personal_data_requests where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by created_at',[organizationId,subjectKind,String(subjectId)])).rows;
 if(subjectKind==='user'){
  const account=(await c.query(`select u.email,u.created_at as account_created_at,m.role,m.active,m.created_at as member_since,m.removed_at,m.purged_at,m.personal_data_blocked_at,p.full_name as organization_name,g.full_name as personal_name from organization_members m join users u on u.id=m.user_id left join agency_user_profiles p on p.user_id=u.id and p.organization_id=m.organization_id left join user_personal_identities g on g.user_id=u.id where m.organization_id=$1 and m.user_id=$2`,[organizationId,subjectId])).rows[0]||{};
  section('cuenta','Cuenta y membresía',[{
   correo:account.email,creada:account.account_created_at,rol:account.role,acceso_activo:account.active,membresia_desde:account.member_since,acceso_retirado:account.removed_at,purgado:account.purged_at,bloqueado:account.personal_data_blocked_at,nombre_perfil:account.organization_name||account.personal_name,
  }]);
  const hr=(await c.query('select full_name,email,photo_url is not null as has_photo,job_title,compensation_type,compensation_amount,currency,payment_day,invoices_company,started_on,ended_on,active,notes from agency_collaborators where organization_id=$1 and user_id=$2',[organizationId,subjectId])).rows;
  if(hr.length)section('colaborador','Ficha de colaborador',hr);
  const sessions=(await c.query('select created_at,expires_at from sessions where user_id=$1 and organization_id=$2 order by created_at desc limit 50',[subjectId,organizationId])).rows;
  section('sesiones','Sesiones registradas',sessions);
  const activity=(await c.query('select table_name as entidad,action as accion,created_at from agency_operation_audit where organization_id=$1 and actor=$2::text order by id desc limit 200',[organizationId,String(subjectId)])).rows;
  section('actividad','Actividad registrada a tu nombre',activity);
 }else if(subjectKind==='client'){
  const client=(await c.query(`select name,legal_name,email,phone,tax_id,notes,active,created_at,updated_at,personal_data_blocked_at,to_jsonb(c)->>'lifecycle_status' as lifecycle_status from agency_clients c where c.organization_id=$1 and c.id=$2`,[organizationId,subjectId])).rows[0]||{};
  section('ficha','Ficha del cliente',[client]);
  section('proyectos','Proyectos',(await c.query('select name,status,start_date,due_date,created_at from agency_projects where organization_id=$1 and client_id=$2 order by id',[organizationId,subjectId])).rows);
  section('presupuestos','Presupuestos',(await c.query('select number,title,status,currency,total,valid_until,created_at from agency_budgets where organization_id=$1 and client_id=$2 order by id',[organizationId,subjectId])).rows);
  section('facturas','Facturas y pagos',(await c.query('select number,status,currency,total,paid_amount,issued_on,due_on from agency_invoices where organization_id=$1 and client_id=$2 order by id',[organizationId,subjectId])).rows);
  section('portal','Accesos al portal',(await c.query('select u.email,u.full_name,g.active,g.granted_at,g.revoked_at from client_portal_grants g join client_portal_users u on u.id=g.portal_user_id where g.organization_id=$1 and g.client_id=$2 order by g.id',[organizationId,subjectId])).rows);
 }else if(subjectKind==='lead'){
  section('ficha','Ficha de la oportunidad',(await c.query('select name,email,phone,stage,amount,currency,probability,notes,created_at,updated_at,personal_data_blocked_at from agency_leads where organization_id=$1 and id=$2',[organizationId,subjectId])).rows);
 }else{
  const profile=(await c.query('select email,full_name,created_at,disabled_at,personal_data_blocked_at from client_portal_users where organization_id=$1 and id=$2',[organizationId,subjectId])).rows[0]||{};
  section('portal','Cuenta del portal',[profile]);
  section('accesos','Clientes habilitados',(await c.query('select c.name as client_name,g.active,g.granted_at,g.revoked_at from client_portal_grants g join agency_clients c on c.id=g.client_id where g.organization_id=$1 and g.portal_user_id=$2 order by g.id',[organizationId,subjectId])).rows);
  section('comentarios','Comentarios en entregas',(await c.query('select d.title as entrega,c.body as comentario,c.created_at from client_portal_delivery_comments c join client_portal_deliveries d on d.id=c.delivery_id where c.organization_id=$1 and c.portal_user_id=$2 order by c.id',[organizationId,subjectId])).rows);
  section('decisiones','Decisiones sobre entregas',(await c.query('select d.title as entrega,dec.decision,dec.created_at from client_portal_delivery_decisions dec join client_portal_deliveries d on d.id=dec.delivery_id where dec.organization_id=$1 and dec.portal_user_id=$2 order by dec.id',[organizationId,subjectId])).rows);
  section('descargas','Descargas',(await c.query('select d.title as entrega,dl.created_at from client_portal_delivery_downloads dl join client_portal_deliveries d on d.id=dl.delivery_id where dl.organization_id=$1 and dl.portal_user_id=$2 order by dl.id',[organizationId,subjectId])).rows);
 }
 section('consentimientos','Consentimientos',consents);
 section('solicitudes','Solicitudes de derechos',requests);
 return {
  generated_at:new Date().toISOString(),
  notice_version:notice.version,
  notice_url:notice.url,
  organization:{name:organizationName},
  subject:{kind:subjectKind,id:String(subjectId),name:display.name,email:display.email},
  sections,
 };
}

const csvCell=value=>{
 const text=value===null||value===undefined?'':value instanceof Date?value.toISOString():typeof value==='boolean'?(value?'Sí':'No'):String(value);
 return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
};
/** CSV legible del mismo export: una fila por campo, sin perder secciones. */
export function personalDataExportCsv(data){
 const rows=[['seccion','campo','valor'],['titular','tipo',data.subject.kind],['titular','id',data.subject.id],['titular','nombre',data.subject.name||''],['titular','correo',data.subject.email||''],['aviso','version',data.notice_version],['exportado','fecha',data.generated_at]];
 for(const section of data.sections)for(const row of section.rows)for(const [key,value] of Object.entries(row))rows.push([section.title,key,value]);
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n';
}

/**
 * Supresión compatible con conservación legal: bloquea o anonimiza los datos
 * personales sin borrar registros fiscales ni trazabilidad.
 * Devuelve {action, details} con lo aplicado para dejarlo en la resolución.
 */
export async function applySuppression(c,{organizationId,subjectKind,subjectId,actorUserId=null}){
 const org=organizationId,key=String(subjectId);
 if(subjectKind==='lead'){
  const row=(await c.query(`update agency_leads set name='Prospecto suprimido',email=null,phone=null,notes=null,personal_data_blocked_at=now(),updated_at=now() where organization_id=$1 and id=$2 returning id`,[org,key])).rows[0];
  if(!row)fail('Titular no encontrado en esta empresa',404);
  return {action:'anonymized',details:{entity:'agency_leads'}};
 }
 if(subjectKind==='client'){
  const fiscal=(await c.query("select 1 from agency_invoices where organization_id=$1 and client_id=$2 and status<>'draft' limit 1",[org,key])).rows.length>0;
  const row=fiscal
   ?(await c.query(`update agency_clients set email=null,phone=null,notes=null,social_links='{}'::jsonb,logo_url=null,personal_data_blocked_at=now(),updated_at=now() where organization_id=$1 and id=$2 returning id`,[org,key])).rows[0]
   :(await c.query(`update agency_clients set name='Cliente suprimido',legal_name=null,email=null,phone=null,tax_id=null,notes=null,social_links='{}'::jsonb,logo_url=null,personal_data_blocked_at=now(),updated_at=now() where organization_id=$1 and id=$2 returning id`,[org,key])).rows[0];
  if(!row)fail('Titular no encontrado en esta empresa',404);
  return {action:fiscal?'blocked':'anonymized',details:{entity:'agency_clients',fiscal_records_kept:fiscal}};
 }
 if(subjectKind==='user'){
  const member=(await c.query('select user_id from organization_members where organization_id=$1 and user_id=$2',[org,key])).rows[0];
  if(!member)fail('Titular no encontrado en esta empresa',404);
  await c.query('update organization_members set active=false,removed_at=coalesce(removed_at,now()),purged_at=coalesce(purged_at,now()),personal_data_blocked_at=now() where organization_id=$1 and user_id=$2',[org,key]);
  await c.query('delete from sessions where organization_id=$1 and user_id=$2',[org,key]);
  await c.query("update agency_user_profiles set full_name='Persona suprimida',photo_url=null,updated_at=now() where organization_id=$1 and user_id=$2",[org,key]);
  await c.query("update agency_collaborators set full_name='Persona suprimida',email=null,photo_url=null,notes='',active=false,updated_at=now() where organization_id=$1 and user_id=$2",[org,key]);
  return {action:'anonymized',details:{entity:'organization_members',salary_amounts_kept:true}};
 }
 if(subjectKind==='portal_user'){
  const row=(await c.query("update client_portal_users set full_name='Persona suprimida',disabled_at=coalesce(disabled_at,now()),personal_data_blocked_at=now(),updated_at=now() where organization_id=$1 and id=$2 returning id",[org,key])).rows[0];
  if(!row)fail('Titular no encontrado en esta empresa',404);
  await c.query('update client_portal_grants set active=false,revoked_at=coalesce(revoked_at,now()),revoked_by_user_id=$3 where organization_id=$1 and portal_user_id=$2 and active',[org,key,actorUserId]);
  await c.query('delete from client_portal_sessions where portal_user_id=$1',[key]);
  return {action:'anonymized',details:{entity:'client_portal_users'}};
 }
 fail('Tipo de titular inválido');
}

const slaRow=row=>({...row,overdue:OPEN_REQUEST_STATUSES.includes(row.status)&&new Date(row.due_at).getTime()<Date.now(),days_left:Math.ceil((new Date(row.due_at).getTime()-Date.now())/86400000)});

async function requestOut(c,org,id,{lock=false}={}){
 const row=(await c.query(`select * from personal_data_requests where organization_id=$1 and id=$2${lock?' for update':''}`,[org,id])).rows[0];
 if(!row)fail('Solicitud no encontrada',404);
 return slaRow(row);
}

/**
 * Cola de solicitudes, consentimientos y export del titular. Nunca devuelve
 * datos de otra agencia: todo se filtra por `organization_id` del actor.
 */
export async function personalData({req,res,url,db,session,body,send}){
 const path=url.pathname;
 const noticePath=path==='/api/privacy/notice';
 const mePaths=['/api/privacy/me','/api/privacy/me/export','/api/privacy/me/requests','/api/privacy/me/consents/revoke'].includes(path);
 const portalPath=path.startsWith('/api/client-portal/privacy');
 const requestMatch=path.match(/^\/api\/privacy\/requests\/(\d+)(?:\/(export))?$/);
 const managerPaths=['/api/privacy/consents','/api/privacy/consents/revoke','/api/privacy/requests','/api/privacy/retention','/api/privacy/access-log'].includes(path);
 if(!noticePath&&!mePaths&&!portalPath&&!requestMatch&&!managerPaths)return false;
 try{
  if(noticePath){
   if(req.method!=='GET')fail('Método no permitido',405);
   send(res,200,{notice:privacyNotice()});return true;
  }
  if(portalPath)return await portalPrivacy({req,res,url,db,body,send});
  const user=await session(req);if(!user)fail('No autenticado',401);
  const org=user.organization_id,canManage=roleCan(user,'privacy.manage');
  const c=await db.connect();
  let transaction=false;
  try{
   await c.query('begin');transaction=true;
   const audit=(action,{subjectKind=null,subjectId=null,context=null,details={}}={})=>logPersonalDataAccess(c,{organizationId:org,actorUserId:user.id,actorKind:'user',actorLabel:user.full_name||user.email||null,action,subjectKind,subjectId,context,details});
   if(path==='/api/privacy/me'){
    if(req.method!=='GET')fail('Método no permitido',405);
    const consents=(await c.query('select id,subject_kind,subject_id,purpose,basis,notice_version,source,granted_at,revoked_at,revoke_reason from personal_data_consents where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by created_at desc',[org,'user',String(user.id)])).rows;
    const requests=(await c.query('select id,request_type,status,details,resolution,rejection_reason,received_at,due_at,resolved_at from personal_data_requests where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by id desc',[org,'user',String(user.id)])).rows;
    await c.query('commit');transaction=false;
    send(res,200,{notice:privacyNotice(),subject:{kind:'user',id:String(user.id),name:user.full_name||user.email},consents,requests:requests.map(slaRow),export:{path:'/api/privacy/me/export'}});return true;
   }
   if(path==='/api/privacy/me/export'){
    if(req.method!=='GET')fail('Método no permitido',405);
    const data=await buildPersonalDataExport(c,{organizationId:org,subjectKind:'user',subjectId:String(user.id),organizationName:user.organization_name});
    await audit('export',{subjectKind:'user',subjectId:String(user.id),context:'self',details:{format:url.searchParams.get('format')||'json'}});
    await c.query('commit');transaction=false;
    const format=url.searchParams.get('format')==='csv'?'csv':'json';
    if(format==='csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="mis-datos.csv"`,'Cache-Control':'no-store'});res.end(personalDataExportCsv(data));return true;}
    send(res,200,{export:data});return true;
   }
   if(path==='/api/privacy/me/requests'){
    if(req.method!=='POST')fail('Método no permitido',405);
    const b=(await body(req))||{},type=b.type;
    if(!REQUEST_TYPES.includes(type))fail('Elegí el tipo de solicitud');
    const existing=(await c.query(`select id from personal_data_requests where organization_id=$1 and subject_kind='user' and subject_id=$2 and request_type=$3 and status=any($4::text[]) order by id limit 1`,[org,String(user.id),type,OPEN_REQUEST_STATUSES])).rows[0];
    if(existing)fail(`Ya tenés una solicitud de este tipo en curso (#${existing.id}).`,409);
    const request=(await c.query(`insert into personal_data_requests(organization_id,subject_kind,subject_id,subject_name,subject_email,request_type,details,source,created_by_user_id)
     values($1,'user',$2,$3,$4,$5,$6,'self',$7) returning *`,[org,String(user.id),safeText(user.full_name||user.email,160)||'Titular',user.email||null,type,safeText(b.details,2000)||null,user.id])).rows[0];
    await audit('request.create',{subjectKind:'user',subjectId:String(user.id),context:'self',details:{request_type:type,request_id:request.id}});
    await c.query('commit');transaction=false;
    send(res,201,{request:slaRow(request),notice:privacyNotice()});return true;
   }
   if(path==='/api/privacy/me/consents/revoke'){
    if(req.method!=='POST')fail('Método no permitido',405);
    const b=(await body(req))||{},purpose=b.purpose??null;
    const result=await revokeConsent(c,{organizationId:org,subjectKind:'user',subjectId:String(user.id),purpose,actorUserId:user.id,reason:safeText(b.reason,500)||'Revocado por el titular'});
    await audit('consent.revoke',{subjectKind:'user',subjectId:String(user.id),context:'self',details:{purposes:result.purposes}});
    await c.query('commit');transaction=false;
    send(res,200,{ok:true,...result});return true;
   }
   if(!canManage)fail('Tu rol no permite gestionar protección de datos',403);
   if(path==='/api/privacy/consents'){
    if(req.method==='GET'){
     const subjectKind=url.searchParams.get('subject_kind'),subjectId=url.searchParams.get('subject_id'),purpose=url.searchParams.get('purpose'),state=url.searchParams.get('state')||'active';
     if(subjectKind!==null&&!SUBJECT_KINDS.includes(subjectKind))fail('Tipo de titular inválido');
     if(purpose!==null&&!purposeIds.has(purpose))fail('Finalidad inválida');
     if(!['active','revoked','all'].includes(state))fail('Estado inválido');
     const conditions=['organization_id=$1'],params=[org];
     if(subjectKind){params.push(subjectKind);conditions.push(`subject_kind=$${params.length}`);}
     if(subjectId){params.push(String(subjectId));conditions.push(`subject_id=$${params.length}`);}
     if(purpose){params.push(purpose);conditions.push(`purpose=$${params.length}`);}
     if(state==='active')conditions.push('revoked_at is null');
     if(state==='revoked')conditions.push('revoked_at is not null');
     const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||100,1),500);
     params.push(limit);
     const consents=(await c.query(`select id,subject_kind,subject_id,purpose,basis,notice_version,source,granted_at,granted_by_user_id,evidence,revoked_at,revoked_by_user_id,revoke_reason,created_at from personal_data_consents where ${conditions.join(' and ')} order by created_at desc limit $${params.length}`,params)).rows;
     await c.query('commit');transaction=false;
     send(res,200,{consents,notice:privacyNotice()});return true;
    }
    if(req.method==='POST'){
     const b=(await body(req))||{};
     await requireSubject(c,org,b.subject_kind,b.subject_id);
     const row=await grantConsent(c,{organizationId:org,subjectKind:b.subject_kind,subjectId:String(b.subject_id),purpose:b.purpose,source:b.source||'team',basis:CONSENT_BASES.includes(b.basis)?b.basis:'consent',grantedByUserId:user.id,evidence:b.evidence,noticeVersion:b.notice_version||null});
     await audit('consent.grant',{subjectKind:b.subject_kind,subjectId:String(b.subject_id),context:b.source||'team',details:{purpose:b.purpose,notice_version:row.notice_version}});
     await c.query('commit');transaction=false;
     send(res,201,{consent:row});return true;
    }
    fail('Método no permitido',405);
   }
   if(path==='/api/privacy/consents/revoke'){
    if(req.method!=='POST')fail('Método no permitido',405);
    const b=(await body(req))||{};
    const result=await revokeConsent(c,{organizationId:org,subjectKind:b.subject_kind,subjectId:String(b.subject_id||''),purpose:b.purpose??null,actorUserId:user.id,reason:b.reason??null});
    await audit('consent.revoke',{subjectKind:b.subject_kind,subjectId:String(b.subject_id||''),context:'team',details:{purposes:result.purposes}});
    await c.query('commit');transaction=false;
    send(res,200,{ok:true,...result});return true;
   }
   if(path==='/api/privacy/requests'&&req.method==='GET'){
    const clean=value=>value&&value!=='all'?value:null;
    const status=clean(url.searchParams.get('status')),type=clean(url.searchParams.get('type')),subjectKind=clean(url.searchParams.get('subject_kind'));
    if(status!==null&&!REQUEST_STATUSES.includes(status)&&status!=='open')fail('Estado inválido');
    if(type!==null&&!REQUEST_TYPES.includes(type))fail('Tipo inválido');
    if(subjectKind!==null&&!SUBJECT_KINDS.includes(subjectKind)&&subjectKind!=='other')fail('Tipo de titular inválido');
    const conditions=['organization_id=$1'],params=[org];
    if(status==='open'){params.push(OPEN_REQUEST_STATUSES);conditions.push(`status=any($${params.length}::text[])`);}
    else if(status){params.push(status);conditions.push(`status=$${params.length}`);}
    if(type){params.push(type);conditions.push(`request_type=$${params.length}`);}
    if(subjectKind){params.push(subjectKind);conditions.push(`subject_kind=$${params.length}`);}
    params.push(OPEN_REQUEST_STATUSES);
    const openParam=params.length;
    if(url.searchParams.get('overdue')==='1')conditions.push(`status=any($${openParam}::text[]) and due_at<now()`);
    params.push(Math.min(Math.max(Number(url.searchParams.get('limit'))||100,1),500));
    const limitParam=params.length;
    params.push(Math.max(Number(url.searchParams.get('offset'))||0,0));
    const offsetParam=params.length;
    const requests=(await c.query(`select * from personal_data_requests where ${conditions.join(' and ')} order by case when status=any($${openParam}::text[]) then 0 else 1 end,due_at,id desc limit $${limitParam} offset $${offsetParam}`,params)).rows.map(slaRow);
    const counts=(await c.query(`select count(*) filter (where status='received')::int as received,count(*) filter (where status='identity_verified')::int as identity_verified,count(*) filter (where status='in_review')::int as in_review,count(*) filter (where status='resolved')::int as resolved,count(*) filter (where status='rejected')::int as rejected,count(*) filter (where status='cancelled')::int as cancelled,count(*) filter (where status=any($2::text[]) and due_at<now())::int as overdue,count(*)::int as total from personal_data_requests where organization_id=$1`,[org,OPEN_REQUEST_STATUSES])).rows[0];
    await c.query('commit');transaction=false;
    send(res,200,{requests,counts,notice:privacyNotice()});return true;
   }
   if(path==='/api/privacy/requests'&&req.method==='POST'){
    const b=(await body(req))||{};
    const kind=b.subject_kind;
    if(!SUBJECT_KINDS.includes(kind)&&kind!=='other')fail('Tipo de titular inválido');
    if(!REQUEST_TYPES.includes(b.request_type))fail('Elegí el tipo de solicitud');
    let display={name:null,email:null};
    if(kind==='other'){
     if(b.subject_id!==undefined&&b.subject_id!==null&&b.subject_id!=='')fail('Un titular externo no lleva identificador');
     display={name:requiredText(b.subject_name,160,'Indicá el nombre del titular'),email:optionalEmail(b.subject_email)};
    }else{
     display=await requireSubject(c,org,kind,b.subject_id);
    }
    const existing=(await c.query(`select id from personal_data_requests where organization_id=$1 and subject_kind=$2 and subject_id is not distinct from $3 and request_type=$4 and status=any($5::text[]) order by id limit 1`,[org,kind,kind==='other'?null:String(b.subject_id),b.request_type,OPEN_REQUEST_STATUSES])).rows[0];
    if(existing)fail(`Ya hay una solicitud de este tipo en curso (#${existing.id}).`,409);
    const request=(await c.query(`insert into personal_data_requests(organization_id,subject_kind,subject_id,subject_name,subject_email,request_type,details,source,created_by_user_id)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *`,[org,kind,kind==='other'?null:String(b.subject_id),requiredText(b.subject_name||display.name,160,'Indicá el nombre del titular'),optionalEmail(b.subject_email)||display.email,b.request_type,safeText(b.details,2000)||null,slug(b.source||'team'),user.id])).rows[0];
    await audit('request.create',{subjectKind:kind,subjectId:kind==='other'?null:String(b.subject_id),context:'team',details:{request_type:b.request_type,request_id:request.id}});
    await c.query('commit');transaction=false;
    send(res,201,{request:slaRow(request)});return true;
   }
   if(requestMatch){
    const id=requestMatch[1],wantsExport=Boolean(requestMatch[2]);
    if(wantsExport){
     if(req.method!=='GET')fail('Método no permitido',405);
     const request=await requestOut(c,org,id);
     if(request.subject_kind==='other'||!request.subject_id)fail('Esta solicitud no tiene un titular con datos exportables',409);
     const data=await buildPersonalDataExport(c,{organizationId:org,subjectKind:request.subject_kind,subjectId:request.subject_id,organizationName:user.organization_name});
     await audit('export',{subjectKind:request.subject_kind,subjectId:request.subject_id,context:'request',details:{request_id:Number(id),format:url.searchParams.get('format')||'json'}});
     await c.query('commit');transaction=false;
     if(url.searchParams.get('format')==='csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="datos-titular-${id}.csv"`,'Cache-Control':'no-store'});res.end(personalDataExportCsv(data));return true;}
     send(res,200,{export:data});return true;
    }
    if(req.method==='GET'){const request=await requestOut(c,org,id);await c.query('commit');transaction=false;send(res,200,{request});return true;}
    if(req.method!=='PATCH')fail('Método no permitido',405);
    const request=await requestOut(c,org,id,{lock:true});
    if(!OPEN_REQUEST_STATUSES.includes(request.status))fail('La solicitud ya está cerrada',409);
    const b=(await body(req))||{},action=b.action;
    if(!['verify','start','resolve','reject','cancel'].includes(action))fail('Acción inválida');
    const target={verify:'identity_verified',start:'in_review',resolve:'resolved',reject:'rejected',cancel:'cancelled'}[action];
    const next={verify:['received'],start:['received','identity_verified'],resolve:OPEN_REQUEST_STATUSES,reject:OPEN_REQUEST_STATUSES,cancel:OPEN_REQUEST_STATUSES}[action];
    if(!next.includes(request.status))fail('La solicitud no admite esa acción en su estado actual',409);
    let resolution=null,rejectionReason=null,resolutionAction=null,suppression=null;
    if(action==='resolve'){
     resolution=requiredText(b.resolution,2000,'Contá cómo se resolvió la solicitud');
     resolutionAction=RESOLUTION_ACTIONS.includes(b.resolution_action)?b.resolution_action:(['access','portability'].includes(request.request_type)?'export_delivered':'none');
     if(request.request_type==='suppression'&&!['blocked','anonymized'].includes(resolutionAction))fail('La supresión se resuelve bloqueando o anonimizando');
     if(request.request_type==='opposition'&&resolutionAction!=='opposed')fail('La oposición se resuelve con la acción «opposed»');
     if(request.request_type==='rectification'&&!['corrected','none'].includes(resolutionAction))fail('La rectificación se resuelve con la acción «corrected»');
     if(request.subject_kind!=='other'&&request.subject_id&&['suppression','opposition'].includes(request.request_type)){
      const purposes=Array.isArray(b.purposes)&&b.purposes.length?b.purposes:null;
      if(purposes&&purposes.some(item=>!purposeIds.has(item)))fail('Finalidad inválida');
      if(request.request_type==='suppression'){
       suppression=await applySuppression(c,{organizationId:org,subjectKind:request.subject_kind,subjectId:request.subject_id,actorUserId:user.id});
       resolutionAction=suppression.action;
      }
      const revoked=await revokeConsent(c,{organizationId:org,subjectKind:request.subject_kind,subjectId:request.subject_id,purpose:purposes,actorUserId:user.id,reason:`Solicitud #${id}: ${request.request_type}`});
      if(request.request_type==='opposition'&&!revoked.revoked)fail('No hay consentimientos vigentes para las finalidades indicadas',409);
      await audit('consent.revoke',{subjectKind:request.subject_kind,subjectId:request.subject_id,context:'request',details:{request_id:Number(id),purposes:revoked.purposes}});
     }else if(request.subject_kind==='other'&&request.request_type==='suppression'){
      fail('Un titular externo no puede suprimirse desde el sistema: resolvé con la nota de la gestión',409);
     }
     if(request.request_type==='suppression')await audit('erasure',{subjectKind:request.subject_kind,subjectId:request.subject_id,context:'request',details:{request_id:Number(id),...suppression?.details}});
    }
    if(action==='reject')rejectionReason=requiredText(b.rejection_reason||b.resolution,2000,'Indicá por qué se rechaza');
    if(action==='cancel')resolution=safeText(b.resolution,2000)||'Solicitud cancelada';
    const updated=(await c.query(`update personal_data_requests set status=$2,resolution=$3,rejection_reason=$4,resolution_action=$5,identity_verified_at=case when $2='identity_verified' then now() else identity_verified_at end,resolved_at=case when $2 in ('resolved','rejected','cancelled') then now() else resolved_at end,handled_by_user_id=$6,updated_at=now() where organization_id=$1 and id=$7 returning *`,[org,target,resolution,rejectionReason,resolutionAction,user.id,id])).rows[0];
    await audit(action==='reject'?'request.reject':action==='resolve'?'request.resolve':'request.update',{subjectKind:request.subject_kind,subjectId:request.subject_id,context:'team',details:{request_id:Number(id),action,status:target,resolution_action:resolutionAction}});
    await c.query('commit');transaction=false;
    send(res,200,{request:slaRow(updated),applied:suppression});return true;
   }
   if(path==='/api/privacy/retention'&&req.method==='GET'){
    const runs=(await c.query('select id,mode,results,candidates,affected,started_at,finished_at from personal_data_retention_runs order by id desc limit 10')).rows;
    await c.query('commit');transaction=false;
    send(res,200,{policies:privacyRetentionPolicies(),runs});return true;
   }
   if(path==='/api/privacy/access-log'&&req.method==='GET'){
    const action=url.searchParams.get('action'),subjectKind=url.searchParams.get('subject_kind');
    if(action!==null&&!ACCESS_ACTIONS.includes(action))fail('Acción inválida');
    const conditions=['organization_id=$1'],params=[org];
    if(action){params.push(action);conditions.push(`action=$${params.length}`);}
    if(subjectKind){params.push(subjectKind);conditions.push(`subject_kind=$${params.length}`);}
    const limit=Math.min(Math.max(Number(url.searchParams.get('limit'))||100,1),500);
    const log=(await c.query(`select id,actor_kind,actor_user_id,actor_label,action,subject_kind,subject_id,context,details,created_at from personal_data_access_log where ${conditions.join(' and ')} order by id desc limit $${params.push(limit)}`,params)).rows;
    await c.query('commit');transaction=false;
    send(res,200,{log});return true;
   }
   fail('Método no permitido',405);
  }catch(error){if(transaction)await c.query('rollback');throw error;}
  finally{c.release();}
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la operación de protección de datos'});
  return true;
 }
}

/** Autoservicio del portal del cliente: aviso, consentimientos, solicitudes y copia. */
async function portalPrivacy({req,res,url,db,body,send}){
 const path=url.pathname;
 const user=await readClientPortalSession(db,req);
 if(!user)fail('Ingresá al portal de cliente',401);
 const org=user.organization_id;
 if(path==='/api/client-portal/privacy'&&req.method==='GET'){
  const consents=(await db.query('select id,purpose,basis,notice_version,source,granted_at,revoked_at,revoke_reason from personal_data_consents where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by created_at desc',[org,'portal_user',String(user.id)])).rows;
  const requests=(await db.query('select id,request_type,status,details,resolution,rejection_reason,received_at,due_at,resolved_at from personal_data_requests where organization_id=$1 and subject_kind=$2 and subject_id=$3 order by id desc',[org,'portal_user',String(user.id)])).rows;
  send(res,200,{notice:privacyNotice(),subject:{kind:'portal_user',id:String(user.id),name:user.full_name,email:user.email},consents,requests:requests.map(slaRow)});return true;
 }
 if(path==='/api/client-portal/privacy/consents'&&req.method==='POST'){
  const b=(await body(req))||{};
  const row=await grantConsent(db,{organizationId:org,subjectKind:'portal_user',subjectId:String(user.id),purpose:b.purpose,source:'client_portal',grantedByUserId:null,evidence:{portal_user_id:String(user.id)}});
  await logPersonalDataAccess(db,{organizationId:org,actorKind:'portal_user',actorUserId:user.id,actorLabel:user.email,action:'consent.grant',subjectKind:'portal_user',subjectId:String(user.id),context:'client_portal',details:{purpose:b.purpose}});
  send(res,201,{consent:row});return true;
 }
 if(path==='/api/client-portal/privacy/consents/revoke'&&req.method==='POST'){
  const b=(await body(req))||{};
  const result=await revokeConsent(db,{organizationId:org,subjectKind:'portal_user',subjectId:String(user.id),purpose:b.purpose??null,actorUserId:null,reason:safeText(b.reason,500)||'Revocado por el titular'});
  await logPersonalDataAccess(db,{organizationId:org,actorKind:'portal_user',actorUserId:user.id,actorLabel:user.email,action:'consent.revoke',subjectKind:'portal_user',subjectId:String(user.id),context:'client_portal',details:{purposes:result.purposes}});
  send(res,200,{ok:true,...result});return true;
 }
 if(path==='/api/client-portal/privacy/requests'){
  if(req.method!=='POST')fail('Método no permitido',405);
  const b=(await body(req))||{},type=b.type;
  if(!REQUEST_TYPES.includes(type))fail('Elegí el tipo de solicitud');
  const existing=(await db.query(`select id from personal_data_requests where organization_id=$1 and subject_kind='portal_user' and subject_id=$2 and request_type=$3 and status=any($4::text[]) order by id limit 1`,[org,String(user.id),type,OPEN_REQUEST_STATUSES])).rows[0];
  if(existing)fail(`Ya tenés una solicitud de este tipo en curso (#${existing.id}).`,409);
  const request=(await db.query(`insert into personal_data_requests(organization_id,subject_kind,subject_id,subject_name,subject_email,request_type,details,source)
   values($1,'portal_user',$2,$3,$4,$5,$6,'client_portal') returning *`,[org,String(user.id),safeText(user.full_name,160)||'Titular',user.email||null,type,safeText(b.details,2000)||null])).rows[0];
  await logPersonalDataAccess(db,{organizationId:org,actorKind:'portal_user',actorUserId:user.id,actorLabel:user.email,action:'request.create',subjectKind:'portal_user',subjectId:String(user.id),context:'client_portal',details:{request_type:type,request_id:request.id}});
  send(res,201,{request:slaRow(request),notice:privacyNotice()});return true;
 }
 if(path==='/api/client-portal/privacy/export'){
  if(req.method!=='GET')fail('Método no permitido',405);
  const organizationName=(await db.query('select name from organizations where id=$1',[org])).rows[0]?.name||'';
  const data=await buildPersonalDataExport(db,{organizationId:org,subjectKind:'portal_user',subjectId:String(user.id),organizationName});
  await logPersonalDataAccess(db,{organizationId:org,actorKind:'portal_user',actorUserId:user.id,actorLabel:user.email,action:'export',subjectKind:'portal_user',subjectId:String(user.id),context:'client_portal',details:{format:url.searchParams.get('format')||'json'}});
  if(url.searchParams.get('format')==='csv'){res.writeHead(200,{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="mis-datos.csv"','Cache-Control':'no-store'});res.end(personalDataExportCsv(data));return true;}
  send(res,200,{export:data});return true;
 }
 fail('Método no permitido',405);
}
