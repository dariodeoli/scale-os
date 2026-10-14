import {actor} from './platform-admin.js';

// Modo mantenimiento de la plataforma (panel global). Distinto de maintenance.js
// (limpieza de datos): esto es el interruptor que corta el espacio de trabajo.
// - Estado en platform_settings(key='maintenance'); se lee con caché ≤30 s por
//   instancia. Si la lectura falla, la plataforma queda ABIERTA (fail-open).
// - Con el modo activo, las rutas privadas del espacio (/api/agency/* y sus
//   lecturas hermanas) responden 503 {maintenance:true,message,until} salvo a un
//   administrador global. Todo lo demás pasa siempre: /api/platform/*, /health,
//   /api/auth/*, /api/public/*, webhooks de cobro (/api/billing/*), estáticos.
// - Cada cambio del interruptor queda en platform_audit_log.
export const MAINTENANCE_CACHE_MS=30_000;
export const MAINTENANCE_MESSAGE_MAX=500;
export const DEFAULT_MAINTENANCE_MESSAGE='Estamos haciendo mejoras en Scale OS. Volvé a intentar en unos minutos.';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const OPEN=Object.freeze({enabled:false,message:'',until:null});

const SISTER_PATHS=new Set(['/api/metrics','/api/hub/overview','/api/ia/carga']);
/** Rutas que el mantenimiento corta para quien no es administrador global. */
export function maintenanceGuarded(pathname){
 return typeof pathname==='string'&&(pathname.startsWith('/api/agency/')||SISTER_PATHS.has(pathname));
}

function normalize(value){
 if(!value||typeof value!=='object')return OPEN;
 const until=typeof value.until==='string'&&Number.isFinite(Date.parse(value.until))?new Date(value.until).toISOString():null;
 return {enabled:value.enabled===true,message:typeof value.message==='string'?value.message.slice(0,MAINTENANCE_MESSAGE_MAX):'',until};
}

const cache=new WeakMap();
/** Estado con caché ≤30 s por conexión de base; ante cualquier error, abierto. */
export async function maintenanceState(db,{now=Date.now(),ttl=MAINTENANCE_CACHE_MS}={}){
 const hit=cache.get(db);
 if(hit&&now-hit.at<ttl)return hit.state;
 let state;
 try{state=normalize((await db.query("select value from platform_settings where key='maintenance'")).rows[0]?.value);}
 catch(error){
  console.warn?.(JSON.stringify({event:'maintenance_state_unavailable',reason:error?.name||'Error'}));
  state=OPEN;
 }
 cache.set(db,{at:now,state});
 return state;
}
export function invalidateMaintenance(db){cache.delete(db);}

const publicPayload=state=>({maintenance:state.enabled,message:state.enabled?(state.message||DEFAULT_MAINTENANCE_MESSAGE):'',until:state.enabled?state.until:null});

async function isPlatformAdmin(db,session,req){
 try{
  const user=await session(req);
  if(!user||user.demo_owner_user_id||user.demo_source_id)return false;
  return Boolean((await db.query('select 1 from platform_administrators where user_id=$1 and active=true',[user.id])).rows[0]);
 }catch{return false;}
}

/** Corta la ruta con 503 cuando corresponde; devuelve true si respondió. */
export async function maintenanceGate({req,res,url,db,session,send}){
 if(!maintenanceGuarded(url.pathname))return false;
 const state=await maintenanceState(db);
 if(!state.enabled)return false;
 if(await isPlatformAdmin(db,session,req))return false;
 send(res,503,publicPayload(state),{'Retry-After':'120'});
 return true;
}

function messageInput(value){
 if(value===null||value===undefined)return '';
 if(typeof value!=='string')fail('El mensaje debe ser texto.');
 const clean=value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g,' ').trim();
 if([...clean].length>MAINTENANCE_MESSAGE_MAX)fail(`El mensaje admite hasta ${MAINTENANCE_MESSAGE_MAX} caracteres.`);
 if(/<\/?[a-z!][^>]*>/i.test(clean))fail('El mensaje no admite HTML: escribí texto plano.');
 return clean;
}
function untilInput(value){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value!=='string'||value.length>40||!Number.isFinite(Date.parse(value)))fail('El fin estimado no es una fecha válida.');
 return new Date(Date.parse(value)).toISOString();
}

async function readSetting(db){
 const row=(await db.query(`select s.value,s.updated_at,u.email as updated_by_email from platform_settings s left join users u on u.id=s.updated_by where s.key='maintenance'`)).rows[0];
 return {...normalize(row?.value),updated_at:row?.updated_at||null,updated_by_email:row?.updated_by_email||null};
}

export async function platformMaintenance({req,res,url,db,session,body,send}){
 if(url.pathname==='/api/public/maintenance'){
  if(req.method!=='GET'){send(res,405,{error:'Método no permitido'});return true;}
  const state=await maintenanceState(db);
  send(res,200,{...publicPayload(state),bypass:state.enabled?await isPlatformAdmin(db,session,req):false});
  return true;
 }
 if(url.pathname!=='/api/platform/maintenance')return false;
 try{
  const {user,role}=await actor(db,session,req);
  if(req.method==='GET'){send(res,200,{maintenance:await readSetting(db)});return true;}
  if(req.method!=='PATCH')fail('Método no permitido',405);
  if(role!=='admin')fail('Solo un administrador global puede hacer cambios.',403);
  const input=await body(req);
  if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida.');
  if(Object.keys(input).some(key=>!['enabled','message','until'].includes(key)))fail('La solicitud contiene campos no permitidos.');
  const current=await readSetting(db);
  if(input.enabled!==undefined&&typeof input.enabled!=='boolean')fail('El interruptor debe ser verdadero o falso.');
  const next={
   enabled:input.enabled===undefined?current.enabled:input.enabled,
   message:input.message===undefined?current.message:messageInput(input.message),
   until:input.until===undefined?current.until:untilInput(input.until),
  };
  await db.query(`insert into platform_settings(key,value,updated_by,updated_at) values('maintenance',$1::jsonb,$2,now())
   on conflict(key) do update set value=excluded.value,updated_by=excluded.updated_by,updated_at=now()`,[JSON.stringify(next),user.id]);
  const action=next.enabled!==current.enabled?(next.enabled?'maintenance.enable':'maintenance.disable'):'maintenance.update';
  await db.query('insert into platform_audit_log(actor_user_id,action,target_type,target_id,metadata) values($1,$2,$3,$4,$5::jsonb)',
   [user.id,action,'platform_setting','maintenance',JSON.stringify({enabled:next.enabled,until:next.until,message_length:next.message.length})]);
  invalidateMaintenance(db);
  send(res,200,{maintenance:await readSetting(db)});return true;
 }catch(error){
  send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});return true;
 }
}
