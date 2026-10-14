// Endpoint `collect` de la analítica de primera parte (landing y demo).
// POST /api/public/analytics/collect — eventos de una lista cerrada, cuerpo de
// hasta 1 KB, origen fijo, respeta DNT/GPC y limita por visitante, por IP (hash
// diario con sal, nunca la IP) y en total. Nunca devuelve datos al navegador.
import {throttle} from './password-access.js';
import {ANALYTICS_LIMITS,DEMO_KINDS,clientIp,dailyHash,demoVisitor,doNotTrack,parseAnalyticsEvent,readAnalyticsBody} from './public-analytics-core.js';

export const ANALYTICS_COLLECT_PATH='/api/public/analytics/collect';
// La landing y la demo viven en sistema.scaleparaguay.com; la app comparte el API.
export const ANALYTICS_ORIGINS=new Set(['https://sistema.scaleparaguay.com','https://app.scaleparaguay.com']);
const headers={'Cache-Control':'no-store'};
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

async function store(db,event){
 if(event.event==='page_view'){
  await db.query(`insert into public_page_views(surface,path,visitor,view_id,referrer_domain,is_mobile) values($1,$2,$3,$4,$5,$6)
   on conflict(surface,view_id) do nothing`,[event.surface,event.path,event.visitor,event.view,event.referrer,event.mobile]);
  return;
 }
 if(event.event==='engagement'){
  // El navegador manda valores acumulados: se conserva el mayor. Solo la vista propia y reciente.
  await db.query(`update public_page_views set seconds=greatest(coalesce(seconds,0),coalesce($4::int,0)),
    scroll_pct=greatest(coalesce(scroll_pct,0),coalesce($5::int,0)),updated_at=now()
   where surface=$1 and view_id=$2 and visitor=$3 and created_at>now()-interval '1 day'`,[event.surface,event.view,event.visitor,event.seconds,event.scroll]);
  return;
 }
 await db.query('insert into public_analytics_events(surface,event,visitor,label,path) values($1,$2,$3,$4,$5)',[event.surface,'cta_click',event.visitor,event.cta,event.path]);
}

export async function publicAnalytics({req,res,url,db,session,send}){
 if(url.pathname!==ANALYTICS_COLLECT_PATH)return false;
 try{
  if(req.method!=='POST')fail('Método no permitido',405);
  if(url.search)fail('No se admiten parámetros en esta ruta');
  if(!ANALYTICS_ORIGINS.has(req.headers?.origin))fail('Origen no permitido',403);
  // DNT/GPC: se responde igual que siempre pero no se guarda nada.
  if(doNotTrack(req.headers)){send(res,202,{ok:true},headers);return true;}
  const event=parseAnalyticsEvent(await readAnalyticsBody(req));
  if(event.surface==='demo'){
   const user=await session(req);
   if(!user?.demo_owner_user_id)fail('Solo disponible dentro de una demo',403);
   event.visitor=demoVisitor(user.organization_id);
  }
  if(!await throttle(db,'pa:all',ANALYTICS_LIMITS.global))fail('Límite temporal',429);
  const ip=clientIp(req);
  if(ip&&!await throttle(db,'pa:ip:'+dailyHash(ip),ANALYTICS_LIMITS.ip))fail('Límite temporal',429);
  if(!await throttle(db,'pa:v:'+event.visitor,ANALYTICS_LIMITS.visitor))fail('Límite temporal',429);
  await store(db,event);
  send(res,202,{ok:true},headers);return true;
 }catch(error){
  if(error.status){send(res,error.status,{error:error.message},headers);return true;}
  throw error;
 }
}

/** Evento de demo escrito por el servidor (inicio o cambio de permiso). Nunca rompe la
 * demo: dentro de una transacción usa un savepoint; fuera, el error se descarta. */
export async function recordDemoEvent(db,{organizationId,event,label},{transaction=false}={}){
 if(!['demo_start','demo_role'].includes(event))return false;
 if(event==='demo_start'&&!DEMO_KINDS.includes(label))return false;
 const sql='insert into public_analytics_events(surface,event,visitor,label) values($1,$2,$3,$4)';
 const values=['demo',event,demoVisitor(organizationId),typeof label==='string'?label.slice(0,40):null];
 if(!transaction){try{await db.query(sql,values);return true;}catch{return false;}}
 try{await db.query('savepoint public_analytics_demo');}catch{return false;}
 try{await db.query(sql,values);await db.query('release savepoint public_analytics_demo');return true;}
 catch{try{await db.query('rollback to savepoint public_analytics_demo');}catch{}return false;}
}
