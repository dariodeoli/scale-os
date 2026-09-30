// PDP — Ley N° 7593/2025 (scale-os#112). Tests de integración sobre PGlite:
// consentimientos verificables, derechos ARSOP + portabilidad, bitácora de
// accesos, supresión con conservación legal y retención declarada.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {personalData} from './personal-data.js';
import {suite} from './agency-suite.js';
import {agencyCore} from './agency-core.js';
import {publicExperience} from './public-experience.js';
import {registerTrial} from './trial-registration.js';
import {claimInvite} from './invite-links.js';
import {runPrivacyRetention,privacyRetentionPolicies} from './personal-data-retention.js';

process.env.INVITE_LINK_SECRET??='test-invite-secret-fixture-32-chars-long';
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();
await pg.exec(await read('./schema.sql'));
for(const name of migrationOrder)await pg.exec(await read('./migrations/'+name));
// La migración PDP es re-ejecutable (idempotencia declarada).
await pg.exec(await read('./migrations/20260930_personal_data.sql'));
const query=(sql,values)=>pg.query(sql,values),db={query,connect:async()=>({query,release(){}})};
const insert=async(sql,values)=>(await query(sql+' returning id',values)).rows[0].id;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');

const orgA=await insert("insert into organizations(slug,name) values('pdp-a','PDP A')");
const orgB=await insert("insert into organizations(slug,name) values('pdp-b','PDP B')");
const ownerId=await insert("insert into users(email,password_hash) values('pdp-owner@example.invalid','unused')");
const viewerId=await insert("insert into users(email,password_hash) values('pdp-viewer@example.invalid','unused')");
const otherOwnerId=await insert("insert into users(email,password_hash) values('pdp-other@example.invalid','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[orgA,ownerId,viewerId]);
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[orgB,otherOwnerId]);
const owner={id:ownerId,email:'pdp-owner@example.invalid',organization_id:orgA,role:'owner',full_name:'Dueña PDP',organization_name:'PDP A'};
const viewer={...owner,id:viewerId,email:'pdp-viewer@example.invalid',role:'viewer'};
const otherOwner={...owner,id:otherOwnerId,email:'pdp-other@example.invalid',organization_id:orgB,organization_name:'PDP B'};

function requestFor(path,{method='GET',payload,cookie=''}={}){
 return {req:{url:path,method,headers:{host:'admin.scaleparaguay.com',...(cookie?{cookie}:{})},socket:{remoteAddress:'127.0.0.1'},async *[Symbol.asyncIterator](){if(payload!==undefined)yield JSON.stringify(payload);}},url:new URL('https://test'+path)};
}
function responseInto(out){
 return {writeHead(status,headers){out.status=status;out.headers=headers;},end(body){out.body=body||'';}};
}
async function call(handler,path,{method='GET',as=owner,payload,cookie=''}={}){
 const out={status:0};const {req,url}=requestFor(path,{method,payload,cookie});
 const handled=await handler({req,res:responseInto(out),url,db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>{out.status=status;Object.assign(out,data);},cookie:()=>'',parseCookies:()=>({}),parseCookiesList:()=>({})});
 assert.equal(handled,true,'handler must claim the route');
 return out;
}
const privacy=(path,options)=>call(personalData,path,options);
const suiteCall=(path,options)=>call(suite,path,options);
const coreCall=(path,options)=>call(agencyCore,path,options);

// --- Aviso público y catálogo de finalidades ---------------------------------
let r=await privacy('/api/privacy/notice');
assert.equal(r.status,200);assert.match(r.notice.version,/^\d{4}-\d{2}-\d{2}-v\d+$/);assert.equal(r.notice.purposes.length,5);
assert.ok(r.notice.purposes.every(purpose=>purpose.id&&purpose.label));

// --- Consentimientos: otorgar/consultar/revocar, idempotencia y aislamiento ---
const clientId=await insert("insert into agency_clients(organization_id,name,email) values($1,'Cliente Uno','cliente@example.invalid')",[orgA]);
r=await privacy('/api/privacy/consents',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service',source:'crm_client',basis:'contract'}});
assert.equal(r.status,201);assert.equal(r.consent.purpose,'service');assert.equal(r.consent.subject_id,String(clientId));
assert.ok(r.consent.notice_version);
assert.equal(r.consent.basis,'contract');
r=await privacy('/api/privacy/consents',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service',source:'crm_client',basis:'contract'}});
assert.equal(r.status,201);
assert.equal((await query('select count(*)::int as n from personal_data_consents where organization_id=$1 and subject_kind=$2 and subject_id=$3 and purpose=$4 and revoked_at is null',[orgA,'client',String(clientId),'service'])).rows[0].n,1,'un solo consentimiento vigente por titular y finalidad');
r=await privacy('/api/privacy/consents?subject_kind=client&subject_id='+clientId);
assert.equal(r.status,200);assert.equal(r.consents.length,1);
assert.equal((await privacy('/api/privacy/consents',{as:viewer})).status,403,'viewer no gestiona protección de datos');
assert.equal((await privacy('/api/privacy/consents',{as:otherOwner})).consents.length,0,'cada agencia solo ve sus titulares');
r=await privacy('/api/privacy/consents',{method:'POST',as:otherOwner,payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service',source:'crm_client'}});
assert.equal(r.status,404,'no se otorgan consentimientos sobre titulares de otra agencia');
r=await privacy('/api/privacy/consents/revoke',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service'}});
assert.equal(r.status,200);assert.equal(r.revoked,1);
r=await privacy('/api/privacy/consents/revoke',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service'}});
assert.equal(r.status,200);assert.equal(r.revoked,0,'revocar de nuevo es idempotente');
r=await privacy('/api/privacy/consents',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),purpose:'service',source:'crm_client',basis:'contract'}});
assert.equal(r.status,201,'tras revocar se puede volver a otorgar');
assert.equal((await query('select count(*)::int as n from personal_data_consents where organization_id=$1 and subject_kind=$2 and subject_id=$3',[orgA,'client',String(clientId)])).rows[0].n,2);

// --- Solicitudes ARSOP + portabilidad ----------------------------------------
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),request_type:'access',details:'Quiero una copia.'}});
assert.equal(r.status,201);const accessRequest=r.request;
assert.equal(accessRequest.status,'received');assert.equal(accessRequest.overdue,false);assert.equal(accessRequest.days_left,30);
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),request_type:'access'}});
assert.equal(r.status,409,'no se duplican solicitudes abiertas del mismo tipo');
r=await privacy('/api/privacy/requests?status=open');
assert.equal(r.status,200);assert.ok(r.counts.received>=1);assert.equal(r.requests[0].id,accessRequest.id);
r=await privacy(`/api/privacy/requests/${accessRequest.id}`,{method:'PATCH',payload:{action:'verify'}});
assert.equal(r.request.status,'identity_verified');assert.ok(r.request.identity_verified_at);
r=await privacy(`/api/privacy/requests/${accessRequest.id}`,{method:'PATCH',payload:{action:'start'}});
assert.equal(r.request.status,'in_review');
r=await privacy(`/api/privacy/requests/${accessRequest.id}/export`);
assert.equal(r.status,200);assert.equal(r.export.subject.kind,'client');assert.ok(r.export.sections.some(section=>section.id==='ficha'));
assert.equal((await query("select count(*)::int as n from personal_data_access_log where organization_id=$1 and action='export' and context='request'",[orgA])).rows[0].n,1,'el export queda en la bitácora');
r=await privacy(`/api/privacy/requests/${accessRequest.id}/export?format=csv`);
assert.equal(r.status,200);assert.match(String(r.body.slice(0,1)),/\uFEFF/, 'el CSV lleva BOM para Excel');
assert.match(String(r.body),/seccion,campo,valor/);
r=await privacy(`/api/privacy/requests/${accessRequest.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Copia entregada por correo.',resolution_action:'export_delivered'}});
assert.equal(r.request.status,'resolved');assert.ok(r.request.resolved_at);
assert.equal((await privacy(`/api/privacy/requests/${accessRequest.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Otra vez'}})).status,409,'una solicitud cerrada no se reabre');
assert.equal((await privacy('/api/privacy/requests',{as:viewer})).status,403);

// --- Supresión: bloqueo si hay factura (conservación legal), anonimización si no
const invoiceId=await insert("insert into agency_invoices(organization_id,client_id,number,currency,total) values($1,$2,'F-1','PYG',100000)",[orgA,clientId]);
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'client',subject_id:String(clientId),request_type:'suppression'}});
const suppressClient=r.request;
r=await privacy(`/api/privacy/requests/${suppressClient.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Se bloquean los datos de contacto; la factura se conserva.',resolution_action:'blocked'}});
assert.equal(r.status,200);assert.equal(r.request.resolution_action,'blocked');assert.deepEqual(r.applied,{action:'blocked',details:{entity:'agency_clients',fiscal_records_kept:true}});
const blocked=(await query('select name,email,phone,notes,personal_data_blocked_at from agency_clients where id=$1',[clientId])).rows[0];
assert.equal(blocked.email,null);assert.equal(blocked.phone,null);assert.equal(blocked.notes,null);assert.ok(blocked.personal_data_blocked_at);assert.equal(blocked.name,'Cliente Uno','la razón social se conserva por la factura');
assert.equal((await query("select count(*)::int as n from personal_data_consents where organization_id=$1 and subject_kind='client' and subject_id=$2 and revoked_at is null",[orgA,String(clientId)])).rows[0].n,0,'la supresión revoca los consentimientos vigentes');
assert.equal((await query("select count(*)::int as n from personal_data_access_log where organization_id=$1 and action='erasure'",[orgA])).rows[0].n,1);

const leadId=await insert("insert into agency_leads(organization_id,name,email,phone,notes) values($1,'Prospecto Dos','lead@example.invalid','+595 981 000 000','notas')",[orgA]);
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'lead',subject_id:String(leadId),request_type:'suppression'}});
r=await privacy(`/api/privacy/requests/${r.request.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Sin obligación legal de conservar.',resolution_action:'anonymized'}});
assert.equal(r.request.resolution_action,'anonymized');
const anonymized=(await query('select name,email,phone,notes,personal_data_blocked_at from agency_leads where id=$1',[leadId])).rows[0];
assert.deepEqual(anonymized,{name:'Prospecto suprimido',email:null,phone:null,notes:null,personal_data_blocked_at:anonymized.personal_data_blocked_at});
assert.ok(anonymized.personal_data_blocked_at);

// --- Oposición por finalidad --------------------------------------------------
const oppClient=await insert("insert into agency_clients(organization_id,name,email) values($1,'Cliente Oposición','opp@example.invalid')",[orgA]);
await privacy('/api/privacy/consents',{method:'POST',payload:{subject_kind:'client',subject_id:String(oppClient),purpose:'service',source:'crm_client',basis:'contract'}});
await privacy('/api/privacy/consents',{method:'POST',payload:{subject_kind:'client',subject_id:String(oppClient),purpose:'contact',source:'crm_client',basis:'consent'}});
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'client',subject_id:String(oppClient),request_type:'opposition',details:'No quiero comunicaciones.'}});
assert.equal(r.status,201,JSON.stringify(r));
r=await privacy(`/api/privacy/requests/${r.request.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Se revoca el contacto.',resolution_action:'opposed',purposes:['contact']}});
assert.equal(r.status,200,JSON.stringify(r));
assert.equal(r.request.resolution_action,'opposed');
const oppConsents=(await query("select purpose,revoked_at from personal_data_consents where organization_id=$1 and subject_kind='client' and subject_id=$2 order by purpose",[orgA,String(oppClient)])).rows;
assert.equal(oppConsents.find(row=>row.purpose==='contact').revoked_at!==null,true);
assert.equal(oppConsents.find(row=>row.purpose==='service').revoked_at,null);

// --- Supresión de un integrante: acceso bloqueado, salario conservado ---------
const memberId=await insert("insert into users(email,password_hash) values('pdp-collab@example.invalid','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'editor')",[orgA,memberId]);
await query("insert into agency_collaborators(organization_id,user_id,full_name,email,compensation_amount) values($1,$2,'Colaborador PDP','pdp-collab@example.invalid',5000000)",[orgA,memberId]);
await query("insert into sessions(id,user_id,organization_id,expires_at) values('pdp-member-session',$1,$2,now()+interval '1 day')",[memberId,orgA]);
r=await privacy('/api/privacy/requests',{method:'POST',payload:{subject_kind:'user',subject_id:String(memberId),request_type:'suppression'}});
r=await privacy(`/api/privacy/requests/${r.request.id}`,{method:'PATCH',payload:{action:'resolve',resolution:'Se bloquea el acceso; los importes quedan por contabilidad.',resolution_action:'anonymized'}});
assert.equal(r.status,200);
const member=(await query('select active,removed_at,purged_at,personal_data_blocked_at from organization_members where organization_id=$1 and user_id=$2',[orgA,memberId])).rows[0];
assert.equal(member.active,false);assert.ok(member.purged_at);assert.ok(member.personal_data_blocked_at);
assert.equal((await query('select count(*)::int as n from sessions where user_id=$1 and organization_id=$2',[memberId,orgA])).rows[0].n,0);
const hr=(await query('select full_name,email,compensation_amount from agency_collaborators where organization_id=$1 and user_id=$2',[orgA,memberId])).rows[0];
assert.equal(hr.full_name,'Persona suprimida');assert.equal(hr.email,null);assert.equal(Number(hr.compensation_amount),5000000,'el importe contable se conserva');

// --- Captura en registro, invitación y landing --------------------------------
const trialConn=await db.connect();
let trialAccount;
try{
 await trialConn.query('begin');
 trialAccount=await registerTrial(trialConn,{email:'pdp-trial@example.invalid',email_verified:true,name:'Titular Trial'},{name:'Agencia Trial PDP',currency:'PYG'},{method:'password'});
 await trialConn.query('commit');
}catch(error){await trialConn.query('rollback');throw error;}finally{trialConn.release();}
const trialConsents=(await query("select purpose,source,notice_version from personal_data_consents where organization_id=$1 and subject_kind='user' and subject_id=$2 order by purpose",[trialAccount.organizationId,String(trialAccount.userId)])).rows;
assert.deepEqual(trialConsents.map(row=>row.purpose),['account','service']);
assert.ok(trialConsents.every(row=>row.source==='registration'&&row.notice_version));

const inviteId=await insert("insert into agency_invite_links(organization_id,token_hash,token_ciphertext,role,mode,created_by,expires_at) values($1,$2,'sealed','editor','single',$3,now()+interval '7 days')",[orgA,hash('invite-token-pdp'),ownerId]);
const inviteConn=await db.connect();
let invited;
try{
 await inviteConn.query('begin');
 invited=await claimInvite(inviteConn,inviteId,{email:'pdp-invited@example.invalid',email_verified:true,name:'Invitada PDP'},{method:'password'});
 await inviteConn.query('commit');
}catch(error){await inviteConn.query('rollback');throw error;}finally{inviteConn.release();}
const invitedConsents=(await query("select purpose,source,evidence->>'method' as method from personal_data_consents where organization_id=$1 and subject_kind='user' and subject_id=$2 order by purpose",[orgA,String(invited.userId)])).rows;
assert.deepEqual(invitedConsents.map(row=>row.purpose),['account','service']);
assert.ok(invitedConsents.every(row=>row.source==='invitation'&&row.method==='password'));

r=await call(publicExperience,'/api/public/contact',{method:'POST',as:null,payload:{name:'Ana Contacto',company:'ACME',email:'ana-pdp@example.invalid',phone:'+595 981 123 456',message:'Quiero información.',consent:true}});
assert.equal(r.status,202);
const landingLead=(await query("select id,name,email from agency_leads where email='ana-pdp@example.invalid' and organization_id=(select id from organizations where slug='scale')")).rows[0];
assert.ok(landingLead);
const landingConsent=(await query("select purpose,source,basis from personal_data_consents where organization_id=(select id from organizations where slug='scale') and subject_kind='lead' and subject_id=$1",[String(landingLead.id)])).rows[0];
assert.deepEqual(landingConsent,{purpose:'contact',source:'landing',basis:'consent'});

// --- Altas del CRM: base legal declarada y conversión -------------------------
r=await suiteCall('/api/agency/leads',{method:'POST',payload:{name:'Lead CRM',email:'lead-crm@example.invalid',lawful_basis:'consent'}});
assert.equal(r.status,201);const crmLead=r.record;
const crmLeadConsent=(await query("select purpose,source,basis from personal_data_consents where organization_id=$1 and subject_kind='lead' and subject_id=$2",[orgA,String(crmLead.id)])).rows[0];
assert.deepEqual(crmLeadConsent,{purpose:'contact',source:'crm_lead',basis:'consent'});
r=await suiteCall(`/api/agency/leads/${crmLead.id}/convert`,{method:'POST'});
assert.equal(r.status,200);const convertedClient=r.clientId;
const convertedConsent=(await query("select purpose,source,basis from personal_data_consents where organization_id=$1 and subject_kind='client' and subject_id=$2",[orgA,String(convertedClient)])).rows[0];
assert.deepEqual(convertedConsent,{purpose:'contact',source:'lead_conversion',basis:'consent'});
r=await suiteCall('/api/agency/leads',{method:'POST',payload:{name:'Lead sin base',lawful_basis:'inventada'}});
assert.equal(r.status,400,'una base legal inválida no crea el registro');
r=await coreCall('/api/agency/clients',{method:'POST',payload:{name:'Cliente Core',email:'core@example.invalid',lawful_basis:'contract'}});
assert.equal(r.status,201);const coreClient=r.client;
const coreConsent=(await query("select purpose,source,basis from personal_data_consents where organization_id=$1 and subject_kind='client' and subject_id=$2",[orgA,String(coreClient.id)])).rows[0];
assert.deepEqual(coreConsent,{purpose:'service',source:'crm_client',basis:'contract'});

// --- Portal del cliente: autoservicio ----------------------------------------
const portalUserId=await insert("insert into client_portal_users(organization_id,client_id,email,email_normalized,password_hash,full_name) values($1,$2,'portal-pdp@example.invalid','portal-pdp@example.invalid','x','Portal Persona')",[orgA,convertedClient]);
await query("insert into client_portal_grants(organization_id,client_id,portal_user_id,granted_by_user_id) values($1,$2,$3,$4)",[orgA,convertedClient,portalUserId,ownerId]);
const portalRaw=crypto.randomBytes(32).toString('hex');
await query("insert into client_portal_sessions(token_hash,portal_user_id,expires_at) values($1,$2,now()+interval '1 day')",[hash(portalRaw),portalUserId]);
const portalCookie='__Host-scale_client_session='+portalRaw;
r=await privacy('/api/client-portal/privacy',{cookie:portalCookie,as:null});
assert.equal(r.status,200);assert.equal(r.subject.kind,'portal_user');assert.ok(r.notice.version);
const portalConsent=(await query("select count(*)::int as n from personal_data_consents where organization_id=$1 and subject_kind='portal_user' and subject_id=$2",[orgA,String(portalUserId)])).rows[0].n;
r=await privacy('/api/client-portal/privacy/consents',{method:'POST',cookie:portalCookie,as:null,payload:{purpose:'portal'}});
assert.equal(r.status,201);assert.equal(r.consent.purpose,'portal');
r=await privacy('/api/client-portal/privacy/requests',{method:'POST',cookie:portalCookie,as:null,payload:{type:'portability',details:'Copia de mis datos.'}});
assert.equal(r.status,201);assert.equal(r.request.subject_kind,'portal_user');assert.equal(r.request.status,'received');
r=await privacy('/api/client-portal/privacy/requests',{method:'POST',cookie:portalCookie,as:null,payload:{type:'portability'}});
assert.equal(r.status,409);
r=await privacy('/api/client-portal/privacy/export',{cookie:portalCookie,as:null});
assert.equal(r.status,200);assert.ok(r.export.sections.some(section=>section.id==='portal'));
assert.equal((await query("select count(*)::int as n from personal_data_access_log where organization_id=$1 and actor_kind='portal_user' and action='export'",[orgA])).rows[0].n,1);
assert.equal((await privacy('/api/client-portal/privacy',{as:null})).status,401,'sin sesión del portal no hay autoservicio');

// --- Autoservicio del usuario interno y bitácora ------------------------------
r=await privacy('/api/privacy/me');
assert.equal(r.status,200);assert.equal(r.subject.kind,'user');
r=await privacy('/api/privacy/me/requests',{method:'POST',payload:{type:'access',details:'Mi copia.'}});
assert.equal(r.status,201);
r=await privacy('/api/privacy/me/export');
assert.equal(r.status,200);assert.equal(r.export.subject.id,String(ownerId));
assert.equal((await query("select count(*)::int as n from personal_data_access_log where organization_id=$1 and actor_user_id=$2 and action='export' and context='self'",[orgA,ownerId])).rows[0].n,1);
r=await privacy('/api/privacy/access-log?limit=50');
assert.equal(r.status,200);assert.ok(r.log.some(entry=>entry.action==='consent.grant'));
assert.equal((await privacy('/api/privacy/access-log',{as:viewer})).status,403);

// --- Retención declarada: reporte y ejecución ---------------------------------
const oldLead=await insert("insert into agency_leads(organization_id,name,email,updated_at) values($1,'Lead Viejo','viejo@example.invalid',now()-interval '3 years')",[orgA]);
const oldNotification=await insert("insert into agency_notifications(organization_id,user_id,kind,title,body,dedupe_key,read_at,resolved_at,created_at) values($1,$2,'comment','Aviso viejo','Cuerpo con dato','pdp-old',now(),now(),now()-interval '2 years')",[orgA,ownerId]);
assert.equal(privacyRetentionPolicies().length,7);
let retention=await runPrivacyRetention(db,{mode:'report'});
assert.equal(retention.mode,'report');assert.ok(retention.candidates>=2);assert.equal(retention.affected,0);
assert.equal((await query('select name from agency_leads where id=$1',[oldLead])).rows[0].name,'Lead Viejo','el reporte no toca los datos');
retention=await runPrivacyRetention(db,{mode:'execute'});
assert.ok(retention.affected>=2);
assert.equal((await query('select name from agency_leads where id=$1',[oldLead])).rows[0].name,'Prospecto suprimido');
assert.equal((await query('select count(*)::int as n from agency_notifications where id=$1',[oldNotification])).rows[0].n,0);
assert.equal((await query('select count(*)::int as n from personal_data_retention_runs')).rows[0].n,2);
r=await privacy('/api/privacy/retention');
assert.equal(r.status,200);assert.equal(r.policies.length,7);assert.equal(r.runs.length,2);

await pg.close();
console.log('PASS: PDP — aviso versionado, consentimientos idempotentes por finalidad, captura en registro/invitación/landing/CRM/portal, ARSOP con SLA, export JSON/CSV, supresión con conservación fiscal, bitácora y retención report/execute');
