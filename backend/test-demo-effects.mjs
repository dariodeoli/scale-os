import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {demoEffectGate,demoRequestEffect,isDemoActor} from './demo-effects.js';
import {clientPortal} from './client-portal.js';
import {iaCarga} from './ia-carga.js';
import {contracts} from './contracts.js';
import {rucLookup} from './ruc-lookup.js';
import {employeeTasks} from './employee-tasks.js';
import {financeControls} from './finance-controls.js';
import {organizationSso} from './organization-sso.js';
import {zoneToday} from './business-time.js';
import {deliverNotifications} from './automation.js';
import {emailPasswordAuth} from './email-password-auth.js';

const pg=new PGlite();
await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
for(const file of migrationOrder)await pg.exec(await fs.readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
const query=(sql,values)=>pg.query(sql,values),db={query,connect:async()=>({query,release(){}})};
const org=(await query("insert into organizations(slug,name) values('effects-fixture','Synthetic company') returning id")).rows[0].id;
const uid=(await query("insert into users(email,password_hash) values('effects-owner@example.invalid','unused') returning id")).rows[0].id;
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
const normal={id:uid,organization_id:org,role:'owner',organization_slug:'effects-fixture'};
const demos=[{...normal,demo_owner_user_id:uid},{...normal,demo_source_id:org},{...normal,organization_slug:'scale-demo-controles-20260908'},{...normal,is_demo_guest:true}];
const client=(await query("insert into agency_clients(organization_id,name) values($1,'Synthetic client') returning id",[org])).rows[0].id;
let mailCalls=0,aiCalls=0,contractAiCalls=0,rucCalls=0,dnsCalls=0,pdfCalls=0;
const externalMail=async()=>{mailCalls++;return true;};
const provider={analizar:async()=>{aiCalls++;return JSON.stringify({clientes:[],equipos:[],acciones:[]});}};
const contractAi={analizar:async()=>{contractAiCalls++;return JSON.stringify({suggestion:'Revisar los campos completos.'});}};
const rucProvider={lookup:async()=>{rucCalls++;return {name:'Synthetic company',ruc:'80168807',dv:'8',fullRuc:'80168807-8',state:'ACTIVO'};}};
async function call(handler,path,method='GET',payload={},actor=normal,extra={}){
 let result={status:0};
 const res={writeHead(status){result.status=status;},end(value){result.content=value;}};
 const handled=await handler({req:{method,headers:{},socket:{remoteAddress:'127.0.0.1'}},res,url:new URL('https://fixture.invalid'+path),db,session:async()=>actor,body:async()=>payload,send:(_,status,data)=>{result={status,...data};},...extra});
 assert(handled!==false&&result.status>0,`Handler claims ${method} ${path}`);
 return result;
}
const countInvites=async()=>Number((await query('select count(*) as count from client_portal_invites')).rows[0].count);
const beforeKey=process.env.IA_API_KEY;
try{
 process.env.IA_API_KEY='synthetic-test-only';
 for(const actor of demos){
  assert(isDemoActor(actor));
  const before=await countInvites();
  let result=await call(clientPortal,`/api/agency/clients/${client}/client-portal-invites`,'POST',{email:'recipient@example.invalid'},actor,{sendInvite:externalMail});
  assert.equal(result.status,403);assert.equal(result.url,undefined);assert.equal(await countInvites(),before);
  assert.equal((await call(clientPortal,`/api/agency/clients/${client}/client-portal-invites`,'GET',{},actor)).status,200,'local portal access list remains readable');
  assert.equal((await call(iaCarga,'/api/ia/carga','POST',{texto:'Synthetic input'},actor,{proveedor:provider})).status,403);
  result=await call(iaCarga,'/api/ia/carga','GET',{},actor);
  assert.equal(result.demoRestricted,true);assert.equal(result.configurada,false);assert.equal(result.modelo,null);
  assert(!JSON.stringify(result).includes('synthetic-test-only'));
  assert.equal((await call(rucLookup,'/api/agency/ruc-lookup','POST',{ruc:'80168807-8'},actor,{provider:rucProvider})).status,403);
  assert.equal((await call(organizationSso,'/api/agency/sso/domains/1/verify','POST',{},actor,{resolveTxt:async()=>{dnsCalls++;return [];}})).status,403);
 }
 assert.deepEqual([mailCalls,aiCalls,rucCalls,dnsCalls],[0,0,0,0],'demo never invokes the injected external services');
 // Normal callers retain the existing integrations and delivery contracts.
 assert.equal((await call(clientPortal,`/api/agency/clients/${client}/client-portal-invites`,'POST',{email:'recipient@example.invalid'},normal,{sendInvite:externalMail})).status,201);
 assert.equal(mailCalls,1);
 assert.equal((await call(iaCarga,'/api/ia/carga','POST',{texto:'Synthetic input'},normal,{proveedor:provider})).status,200);
 assert.equal(aiCalls,1);
 const domain=(await query("insert into organization_email_domains(organization_id,domain,verification_token,created_by_user_id) values($1,'fixture.invalid','synthetic-dns-proof',$2) returning id",[org,uid])).rows[0];
 assert.equal((await call(organizationSso,`/api/agency/sso/domains/${domain.id}/verify`,'POST',{},normal,{resolveTxt:async()=>{dnsCalls++;return [['scale-os-verify=synthetic-dns-proof']];}})).verified,true);
 assert.equal(dnsCalls,1);
 assert.equal((await call(iaCarga,'/api/ia/carga','GET')).configurada,true);
 // Contract drafting, immutable issuance and local PDF rendering stay usable.
 const demo=demos[0],root='/api/agency/contracts';
 const template=await call(contracts,root+'/templates','POST',{name:'Manual demo',agreement_type:'services',body:'Acuerdo manual de demostración.',required_fields:[]},demo);
 assert.equal(template.status,201,JSON.stringify(template));
 let created=await call(contracts,root,'POST',{title:'Documento manual',template_id:template.template.id},demo);
 assert.equal(created.status,201,JSON.stringify(created));
 let record=created.contract;
 for(const actor of demos)assert.equal((await call(contracts,`${root}/${record.id}/assist`,'POST',{},actor,{aiProvider:contractAi})).status,403);
 assert.equal(contractAiCalls,0);
 assert.equal((await call(contracts,root+'/config','GET',{},demo)).capabilities.assist,false);
 assert.equal((await call(contracts,`${root}/${record.id}/assist`,'POST',{},normal,{aiProvider:contractAi})).status,200);
 assert.equal(contractAiCalls,1);
 assert.equal((await call(contracts,`${root}/${record.id}`,'GET',{},demo)).contract.revision,record.revision);
 const issued=await call(contracts,`${root}/${record.id}/versions`,'POST',{expected_revision:record.revision,reviewed:true},demo);
 assert.equal(issued.status,201,JSON.stringify(issued));
 const pdf=await call(contracts,`${root}/${record.id}/versions/1/pdf`,'GET',{},demo,{pdfRenderer:async()=>{pdfCalls++;return Buffer.from('%PDF-1.4 synthetic');}});
 assert.equal(pdf.status,200);assert.equal(pdfCalls,1);
 const manual=await call(rucLookup,'/api/agency/clients/from-ruc','POST',{ruc:'1234567-4',name:'Cliente manual',legal_name:'Cliente manual'},demo,{provider:rucProvider});
 assert.equal(manual.status,201,JSON.stringify(manual));assert.equal(rucCalls,0,'manual client creation never queries the provider');
 assert.equal((await call(rucLookup,'/api/agency/ruc-lookup','POST',{ruc:'80168807-8'},normal,{provider:rucProvider})).status,200);assert.equal(rucCalls,1);
 const task=await call(employeeTasks,'/api/agency/productivity/internal-tasks','POST',{title:'Tarea local',expected_version:0,assigned_user_ids:[String(uid)]},demo);
 assert.equal(task.status,201,JSON.stringify(task));
 const account=(await query("insert into bank_accounts(organization_id,name,account_type,currency) values($1,'Synthetic cash','cash','PYG') returning id",[org])).rows[0].id;
 const receipt=await call(financeControls,'/api/agency/payments','POST',{mode:'unassigned',accountId:account,amount:100,receivedOn:zoneToday(),requestId:randomUUID()},demo);
 assert.equal(receipt.status,201,JSON.stringify(receipt));
 assert.equal(Number((await query('select balance from bank_accounts where id=$1',[account])).rows[0].balance),100);
 // A local CRUD write must not indirectly send a queued notification from a demo.
 await query("update users set email='effects-notification@example.com' where id=$1",[uid]);
 await query('insert into agency_notification_preferences(organization_id,user_id,email_enabled) values($1,$2,true) on conflict(organization_id,user_id) do update set email_enabled=true',[org,uid]);
 let backgroundCalls=0;
 const relay={status:{available:true,appUrl:'https://fixture.invalid'},send:async()=>{backgroundCalls++;return true;}};
 for(const marker of ['owner','source']){
  await query('update organizations set demo_owner_user_id=$2,demo_source_id=$3 where id=$1',[org,marker==='owner'?uid:null,marker==='source'?org:null]);
  await query("insert into agency_notifications(organization_id,user_id,kind,title,dedupe_key,email_status) values($1,$2,'assignment','Synthetic notification',$3,'encolado')",[org,uid,'demo-'+marker]);
  assert.equal(await deliverNotifications(db,relay),0);
 }
 assert.equal(backgroundCalls,0,'background delivery skips demo owners and demo sources even with a configured relay');
 await query('update organizations set demo_owner_user_id=null,demo_source_id=null where id=$1',[org]);
 await query("insert into agency_notifications(organization_id,user_id,kind,title,dedupe_key,email_status) values($1,$2,'assignment','Normal notification','normal-notification','encolado')",[org,uid]);
 assert.equal(await deliverNotifications(db,relay),1);assert.equal(backgroundCalls,1);
 // Public account creation is an explicit real-account action, even if the
 // browser still carries its demo cookie. Its own validation and throttles apply.
 const signupRequest={method:'POST',headers:{cookie:'scale_session=synthetic-demo-session'},socket:{remoteAddress:'127.0.0.1'}};
 const signupUrl=new URL('https://fixture.invalid/api/auth/password/register');
 assert.equal(await demoEffectGate({req:signupRequest,res:{},url:signupUrl,session:async()=>demo,send:()=>{throw Error('Public registration must not be blocked by the demo gate');}}),false);
 let signupResult,signupMails=0;
 await emailPasswordAuth({req:signupRequest,res:{},url:signupUrl,db,body:async()=>({email:'effects-signup@example.invalid',password:randomUUID(),company:'Explicit new company',currency:'PYG',consent:true}),send:(_,status,data)=>{signupResult={status,...data};},sendVerification:async()=>{signupMails++;return true;},emailAvailable:true,cookie:()=>'',id:randomUUID});
 assert.equal(signupResult.status,202,JSON.stringify(signupResult));assert.equal(signupMails,1,'explicit public signup reaches its normal verification flow');
 for(const path of ['/api/auth/password/register','/api/auth/password/invitations/register','/api/auth/password/request','/api/auth/password/reset','/api/auth/password/verification/request','/api/client-portal/auth/password/request','/api/public/contact'])assert.equal(demoRequestEffect('POST',path),null,'public conversion, recovery and contact remain independent from the tenant demo');
 // The shared gate is mounted before handlers which used to bypass late guards.
 const source=await fs.readFile(new URL('./server.js',import.meta.url),'utf8');
 const guard=source.indexOf('demoEffectGate({');
 assert(guard>0&&guard<source.indexOf('subscriptionBilling({')&&guard<source.indexOf('clientPortal({')&&guard<source.indexOf('iaCarga({'));
 for(const path of ['/api/ia/carga',`${root}/${record.id}/assist`,`/api/agency/clients/${client}/client-portal-invites`,'/api/agency/sso/domains/1/verify','/api/billing/checkout']){
  assert(demoRequestEffect('POST',path));
  let response;const base={req:{method:'POST'},res:{},url:new URL('https://fixture.invalid'+path),send:(_,status,data)=>{response={status,...data};}};
  assert.equal(await demoEffectGate({...base,session:async()=>demo}),true);assert.equal(response.status,403);
  assert.equal(await demoEffectGate({...base,session:async()=>normal}),false);
  assert.equal(await demoEffectGate({...base,session:async()=>null}),false,'normal authentication still owns anonymous callers');
 }
 let disclosed=false;await assert.rejects(()=>demoEffectGate({req:{method:'POST'},res:{},url:new URL('https://fixture.invalid/api/ia/carga'),session:async()=>{throw Error('Synthetic authentication failure');},send:()=>{disclosed=true;}}));assert.equal(disclosed,false,'unexpected authentication errors stay with the server error handler');
 for(const [method,path] of [['POST',root],['POST',`${root}/${record.id}/versions`],['GET',`${root}/${record.id}/versions/1/pdf`],['POST','/api/agency/payments'],['POST','/api/agency/productivity/internal-tasks'],['POST','/api/agency/clients/from-ruc'],['POST','/api/auth/organizations/select']])assert.equal(demoRequestEffect(method,path),null,`${method} ${path} remains local`);
}finally{
 if(beforeKey===undefined)delete process.env.IA_API_KEY;else process.env.IA_API_KEY=beforeKey;
 await pg.close();
}
console.log('PASS demo effects: zero invitation/AI/RUC/DNS calls, early gate, normal integrations preserved, manual contracts/tasks/receipts/PDF functional.');
