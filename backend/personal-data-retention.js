// Retención y minimización PDP — Ley N° 7593/2025 (scale-os#112).
// Política declarada por entidad + job de purga/anonimización. En modo `report`
// (por defecto) solo cuenta candidatos y deja la corrida registrada: el dueño
// habilita `execute` cuando aprueba los plazos del RAT. Nunca borra registros
// fiscales ni la bitácora de consentimientos.
const fail=message=>Object.assign(new Error(message),{maintenanceCode:message});
const integer=(value,fallback,min,max,name)=>{
 const n=value===undefined||value===''?fallback:Number(value);
 if(!Number.isSafeInteger(n)||n<min||n>max)throw fail('INVALID_'+name);
 return n;
};
const day=86400000;

/** Plazos por defecto conservadores; cada uno se ajusta por variable de entorno. */
export function privacyRetentionPolicies(env=process.env){
 return [
  {id:'leads_inactive',label:'Oportunidades sin actividad',entity:'agency_leads',action:'anonymize',retentionDays:integer(env.PRIVACY_RETENTION_LEADS_DAYS,730,30,3650,'LEADS_DAYS'),basis:'Consentimiento o interés legítimo comercial',notes:'Anonimiza nombre, correo, teléfono y notas; la fila queda para métricas.'},
  {id:'notifications',label:'Notificaciones leídas o resueltas',entity:'agency_notifications',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_NOTIFICATIONS_DAYS,365,30,3650,'NOTIFICATIONS_DAYS'),basis:'Ejecución del servicio',notes:'El cuerpo puede contener datos personales; se conserva lo no leído.'},
  {id:'access_requests',label:'Solicitudes de acceso decididas',entity:'agency_access_requests',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_ACCESS_REQUESTS_DAYS,365,30,3650,'ACCESS_REQUESTS_DAYS'),basis:'Ejecución del servicio',notes:'Incluye nombre y correo del postulante.'},
  {id:'email_verifications',label:'Verificaciones de correo usadas o vencidas',entity:'auth_email_verifications',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_VERIFICATIONS_DAYS,30,7,365,'VERIFICATIONS_DAYS'),basis:'Seguridad de la cuenta',notes:'Tokens de un solo uso; se purgan al vencer.'},
  {id:'portal_resets',label:'Restablecimientos del portal vencidos',entity:'client_portal_password_resets',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_PORTAL_RESETS_DAYS,30,7,365,'PORTAL_RESETS_DAYS'),basis:'Seguridad de la cuenta',notes:'Tokens de un solo uso del portal del cliente.'},
  {id:'portal_invites',label:'Invitaciones del portal cerradas',entity:'client_portal_invites',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_PORTAL_INVITES_DAYS,365,30,3650,'PORTAL_INVITES_DAYS'),basis:'Ejecución del servicio',notes:'Correo invitado y token; se conservan las vigentes y pendientes.'},
  {id:'audit_activity',label:'Actividad y auditoría operativa',entity:'agency_operation_audit',action:'purge',retentionDays:integer(env.PRIVACY_RETENTION_AUDIT_DAYS,1825,365,7300,'AUDIT_DAYS'),basis:'Interés legítimo y obligaciones de auditoría',notes:'Cinco años por defecto; la bitácora PDP (personal_data_access_log) se conserva aparte.'},
 ];
}

export function privacyRetentionSettings(env=process.env){
 return {
  mode:['report','execute'].includes(env.PRIVACY_RETENTION_MODE)?env.PRIVACY_RETENTION_MODE:'report',
  enabled:env.PRIVACY_RETENTION_ENABLED!=='false',
  batch:integer(env.PRIVACY_RETENTION_BATCH_SIZE,500,1,10000,'BATCH'),
  intervalMs:integer(env.PRIVACY_RETENTION_INTERVAL_MS,86400000,3600000,604800000,'INTERVAL'),
 };
}

const statements={
 leads_inactive:{
  candidates:`select count(*)::int as n from agency_leads where personal_data_blocked_at is null and client_id is null and updated_at<now()-($1::int*interval '1 day')`,
  run:`with picked as (select id from agency_leads where personal_data_blocked_at is null and client_id is null and updated_at<now()-($1::int*interval '1 day') order by updated_at limit $2 for update skip locked)
   update agency_leads l set name='Prospecto suprimido',email=null,phone=null,notes=null,personal_data_blocked_at=now(),updated_at=now() from picked where l.id=picked.id`,
 },
 notifications:{
  candidates:`select count(*)::int as n from agency_notifications where created_at<now()-($1::int*interval '1 day') and (read_at is not null or resolved_at is not null)`,
  run:`delete from agency_notifications where id in (select id from agency_notifications where created_at<now()-($1::int*interval '1 day') and (read_at is not null or resolved_at is not null) order by created_at limit $2 for update skip locked)`,
 },
 access_requests:{
  candidates:`select count(*)::int as n from agency_access_requests where status<>'pending' and decided_at<now()-($1::int*interval '1 day')`,
  run:`delete from agency_access_requests where id in (select id from agency_access_requests where status<>'pending' and decided_at<now()-($1::int*interval '1 day') order by decided_at limit $2 for update skip locked)`,
 },
 email_verifications:{
  candidates:`select count(*)::int as n from auth_email_verifications where created_at<now()-($1::int*interval '1 day') and (used_at is not null or expires_at<now())`,
  run:`delete from auth_email_verifications where id in (select id from auth_email_verifications where created_at<now()-($1::int*interval '1 day') and (used_at is not null or expires_at<now()) order by created_at limit $2 for update skip locked)`,
 },
 portal_resets:{
  candidates:`select count(*)::int as n from client_portal_password_resets where created_at<now()-($1::int*interval '1 day') and expires_at<now()`,
  run:`delete from client_portal_password_resets where id in (select id from client_portal_password_resets where created_at<now()-($1::int*interval '1 day') and expires_at<now() order by created_at limit $2 for update skip locked)`,
 },
 portal_invites:{
  candidates:`select count(*)::int as n from client_portal_invites where created_at<now()-($1::int*interval '1 day') and (accepted_at is not null or revoked_at is not null or expires_at<now())`,
  run:`delete from client_portal_invites where id in (select id from client_portal_invites where created_at<now()-($1::int*interval '1 day') and (accepted_at is not null or revoked_at is not null or expires_at<now()) order by created_at limit $2 for update skip locked)`,
 },
 audit_activity:{
  candidates:`select count(*)::int as n from agency_operation_audit where created_at<now()-($1::int*interval '1 day')`,
  run:`delete from agency_operation_audit where id in (select id from agency_operation_audit where created_at<now()-($1::int*interval '1 day') order by created_at limit $2 for update skip locked)`,
 },
};

/**
 * Corre la retención declarada. `mode` sale del entorno salvo override de tests.
 * Devuelve el resumen que también queda registrado en personal_data_retention_runs.
 */
export async function runPrivacyRetention(db,{mode=null,env=process.env}={}){
 const settings=privacyRetentionSettings(env);
 const effective=mode||settings.mode;
 if(!['report','execute'].includes(effective))fail('INVALID_MODE');
 const policies=privacyRetentionPolicies(env);
 const raw=await db.connect();
 try{
  await raw.query('begin');
  const locked=(await raw.query("select pg_try_advisory_xact_lock(hashtextextended('scale-privacy-retention',0)) as locked")).rows[0].locked;
  if(!locked){await raw.query('rollback');return {mode:effective,skipped:'busy',results:[]};}
  const results=[];
  let candidates=0,affected=0;
  for(const policy of policies){
   const sql=statements[policy.id];
   const found=Number((await raw.query(sql.candidates,[policy.retentionDays])).rows[0]?.n)||0;
   const applied=effective==='execute'&&found>0?Number((await raw.query(sql.run,[policy.retentionDays,settings.batch])).rowCount)||0:0;
   candidates+=found;affected+=applied;
   results.push({id:policy.id,entity:policy.entity,action:policy.action,retention_days:policy.retentionDays,candidates:found,...(effective==='execute'?{affected:applied}:{})});
  }
  const run=(await raw.query('insert into personal_data_retention_runs(mode,results,candidates,affected,finished_at) values($1,$2,$3,$4,now()) returning id,finished_at',[effective,JSON.stringify(results),candidates,affected])).rows[0];
  await raw.query('commit');
  return {mode:effective,runId:String(run.id),finishedAt:run.finished_at,candidates,affected,results};
 }catch(error){await raw.query('rollback');throw error;}
 finally{raw.release();}
}

const workers=new WeakMap();
/** Job programado: corre al arrancar y cada `PRIVACY_RETENTION_INTERVAL_MS`. */
export function startPrivacyRetention(db,{env=process.env,log=console.log,timers=globalThis}={}){
 if(workers.has(db))return workers.get(db);
 if(!privacyRetentionSettings(env).enabled)return ()=>{};
 const settings=privacyRetentionSettings(env);
 let running=false,stopped=false;
 const tick=async()=>{
  if(running||stopped)return;
  running=true;
  try{log(JSON.stringify({event:'privacy_retention_complete',...await runPrivacyRetention(db,{env})}));}
  catch(error){log(JSON.stringify({event:'privacy_retention_failed',code:error.maintenanceCode||error.code||'UNKNOWN'}));}
  finally{running=false;}
 };
 const timer=timers.setInterval(()=>{void tick();},settings.intervalMs);
 timer.unref?.();
 const stop=()=>{stopped=true;timers.clearInterval(timer);workers.delete(db);};
 workers.set(db,stop);
 void tick();
 return stop;
}

export const privacyRetentionInternals={integer,statements,day};
