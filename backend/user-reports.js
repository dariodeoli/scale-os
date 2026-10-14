import {option,text as validText} from './suite-validation.js';
import {cleanRoute} from './error-tracking.js';

// «Reportar un problema» (guía superadmin §5): el usuario con sesión manda un
// texto de hasta 1000 caracteres con categoría; se guardan la ruta (sin query)
// y la versión de la app. Máximo 5 por hora por usuario. El panel global los
// lista con estado nuevo / en curso / resuelto y una nota interna.
export const REPORT_STATUSES=['new','in_progress','resolved'];
export const REPORT_CATEGORIES=['error','datos','lentitud','sugerencia','otro'];
export const REPORT_LIMITS=Object.freeze({message:1000,minMessage:5,perHour:5,note:2000});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};

export function reportInput(input){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Solicitud inválida.');
 if(Object.keys(input).some(key=>!['message','category','route','app_version'].includes(key)))fail('La solicitud contiene campos no permitidos.');
 let message;
 try{message=validText(input.message,REPORT_LIMITS.message);}catch{fail(`Contanos el problema en hasta ${REPORT_LIMITS.message} caracteres.`);}
 if(message.length<REPORT_LIMITS.minMessage)fail('Contanos un poco más del problema.');
 let category;
 try{category=option(input.category,REPORT_CATEGORIES);}catch{fail('Elegí una categoría.');}
 const version=typeof input.app_version==='string'&&/^[0-9A-Za-z.+-]{1,40}$/.test(input.app_version)?input.app_version:null;
 return {message,category,route:cleanRoute(typeof input.route==='string'?input.route.slice(0,600):''),appVersion:version};
}

export async function userReports({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/support/reports')return false;
 let c;
 try{
  if(req.method!=='POST')fail('Método no permitido',405);
  const user=await session(req);if(!user)fail('Ingresá a tu cuenta para reportar un problema.',401);
  if(user.demo_owner_user_id||user.demo_source_id)fail('El Demo no envía reportes. Usá tu agencia para reportar un problema.',403);
  const data=reportInput(await body(req));
  c=await db.connect();await c.query('begin');
  // Serializa por usuario para que el tope de 5 por hora no se pueda pasar en paralelo.
  await c.query("select pg_advisory_xact_lock(hashtextextended('platform-user-report:'||$1::text,0))",[String(user.id)]);
  const recent=Number((await c.query("select count(*)::int as n from platform_user_reports where user_id=$1 and created_at>now()-interval '1 hour'",[user.id])).rows[0].n);
  if(recent>=REPORT_LIMITS.perHour)fail('Ya enviaste varios reportes en la última hora. Esperá un rato o escribinos por correo.',429);
  const row=(await c.query(`insert into platform_user_reports(user_id,organization_id,category,message,route,app_version)
   values($1,$2,$3,$4,$5,$6) returning id,category,status,created_at`,[user.id,user.organization_id||null,data.category,data.message,data.route,data.appVersion])).rows[0];
  await c.query('commit');
  send(res,201,{report:row});return true;
 }catch(error){
  if(c)await c.query('rollback').catch(()=>{});
  send(res,error.status||500,{error:error.status?error.message:'No se pudo enviar el reporte. Intentá nuevamente.'});return true;
 }finally{c?.release();}
}
