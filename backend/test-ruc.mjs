import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {rucLookup,normalizeRuc,rucRecord,assertUniqueClientRuc,createRucProvider,rucLookupConfig,createOwnDataRucProvider,configuredRucProvider,validateOwnDataRuc,OWNDATA_RUC_URL} from './ruc-lookup.js';

assert.equal(normalizeRuc('80.168.807 - 8'),'80168807-8');assert.equal(normalizeRuc('1234567'),'1234567');assert.throws(()=>normalizeRuc('https://evil.example'));
const providerRecord={name:'Empresa de prueba',ruc:'80168807',dv:'8',fullRuc:'80168807-8',state:'ACTIVO'};
assert.equal(rucRecord(providerRecord,'80168807').tax_id,'80168807-8');assert.throws(()=>rucRecord(providerRecord,'1234567'));
const pg=new PGlite();await pg.exec(await fs.readFile('schema.sql','utf8'));for(const file of ['20260910_ruc_lookup.sql','20260913_ruc_collaboration.sql'])await pg.exec(await fs.readFile('migrations/'+file,'utf8'));
await pg.exec('create table if not exists auth_throttles (key text primary key,count integer not null default 1,expires_at timestamptz not null)');
const query=(s,v)=>pg.query(s,v),db={query,connect:async()=>({query,release(){}})};
const org=(await query("select id from organizations where slug='scale'")).rows[0].id;
await query("update scale_ruc_usage set used=0 where month=date_trunc('month',current_date)::date");
let calls=0,result;const user={id:1,organization_id:org,role:'owner'};
const config={providerUrl:'https://provider.example/ruc',timeoutMs:1000,cacheTtlSeconds:3600,noResultTtlSeconds:3600,monthlyLimit:2};
const provider={lookup:async ruc=>{calls++;if(ruc==='00000000-0')return null;if(ruc==='99999999-9')throw Object.assign(Error('private upstream detail'),{status:503});return providerRecord;}};
async function call(path,b={ruc:'80168807-8'},as=user){await rucLookup({req:{method:'POST',socket:{}},res:{},url:new URL('https://test/api/agency/'+path),db,session:async()=>as,body:async()=>b,send:(_,status,data)=>{result={status,...data};},provider,config});return result;}
assert.equal((await call('ruc-lookup',undefined,null)).status,401);
assert.equal((await call('ruc-lookup',undefined,{...user,role:'editor'})).status,403);assert.equal(calls,0);
assert.equal((await call('ruc-lookup',undefined,{...user,demo_owner_user_id:1})).status,403);
let found=await call('ruc-lookup');assert.equal(found.status,200);assert.equal(found.record.tax_id,'80168807-8');assert.equal(found.cached,false);assert.equal(calls,1);
found=await call('ruc-lookup');assert.equal(found.cached,true);assert.equal(calls,1,'cache avoids provider and quota consumption');
found=await call('ruc-lookup',{ruc:'00000000-0'});assert.deepEqual(found.record,null);assert.equal(found.status,200);assert.equal(calls,2);
found=await call('ruc-lookup',{ruc:'00000000-0'});assert.equal(found.cached,true);assert.equal(calls,2,'no-result is safely cached');
found=await call('ruc-lookup',{ruc:'99999999-9'});assert.equal(found.status,429,'only uncached external calls consume the configured quota');
await query("update scale_ruc_usage set used=0 where month=date_trunc('month',current_date)::date");
found=await call('ruc-lookup',{ruc:'99999999-9'});assert.equal(found.status,503);assert(!found.error.includes('private upstream detail'),'provider details never reach callers');
await query("update scale_ruc_usage set used=0 where month=date_trunc('month',current_date)::date");
const payload={ruc:'80168807-8',name:'Cliente de prueba',legal_name:'Razón escrita por una persona'};
assert.equal((await call('clients/from-ruc',payload)).status,201);
assert.equal((await call('clients/from-ruc',payload)).status,409);
assert.equal((await call('clients/from-ruc',{...payload,ruc:'80168807'})).status,400);
const client=(await query('select * from agency_clients where organization_id=$1',[org])).rows[0];
let refresh=await call(`clients/${client.id}/ruc-refresh`,{});assert.equal(refresh.status,200);assert.equal(refresh.updated,false);assert.equal(refresh.client.legal_name,'Razón escrita por una persona','preview never overwrites user fields');
refresh=await call(`clients/${client.id}/ruc-refresh`,{apply:true});assert.equal(refresh.updated,true);assert.equal(refresh.client.legal_name,'Razón escrita por una persona');assert.equal(refresh.client.ruc_legal_name,'Empresa de prueba');assert.equal(calls,5,'explicit refresh bypasses cache');
await assert.rejects(()=>assertUniqueClientRuc({query},org,'80.168.807-8'),error=>error.status===409);
await assert.doesNotReject(()=>assertUniqueClientRuc({query},org,'80168807-8',client.id));
assert.equal(await createRucProvider({baseUrl:'https://provider.example/ruc',allowedHosts:['provider.example'],fetcher:async()=>new Response('',{status:404})}).lookup('123'),null);
await assert.rejects(()=>createRucProvider({baseUrl:'https://169.254.169.254/latest',fetcher:async()=>{throw Error('no debería llamarse');}}).lookup('123'),error=>error.status===503,'anti-SSRF: destino fuera de la lista cerrada');
// Synthetic credentials are consumed only by a mock; no external requests.
assert.equal(rucLookupConfig({}).providerKind,'legacy');assert.equal(rucLookupConfig({}).providerUrl,'https://ruc.sun.com.py/api/ruc');
for(const env of [{RUC_LOOKUP_PROVIDER_KIND:'unknown'},{RUC_LOOKUP_PROVIDER_KIND:'owndata'},{RUC_LOOKUP_PROVIDER_KIND:'owndata',RUC_LOOKUP_PROVIDER_URL:OWNDATA_RUC_URL},{RUC_LOOKUP_PROVIDER_KIND:'owndata',RUC_LOOKUP_PROVIDER_URL:'https://other.invalid/api/v1/ruc',OWNDATA_API_KEY:'synthetic-secret'},{RUC_LOOKUP_PROVIDER_KIND:'owndata',RUC_LOOKUP_PROVIDER_URL:OWNDATA_RUC_URL,OWNDATA_API_KEY:'pk_synthetic'}])assert.throws(()=>rucLookupConfig(env));
const ownSettings=rucLookupConfig({RUC_LOOKUP_PROVIDER_KIND:'owndata',RUC_LOOKUP_PROVIDER_URL:OWNDATA_RUC_URL,OWNDATA_API_KEY:'synthetic-secret'});
assert.equal(configuredRucProvider(ownSettings).name,'owndata-ruc-provider');assert.equal(configuredRucProvider(rucLookupConfig({})).name,'configured-ruc-provider');
assert.equal(validateOwnDataRuc('80168807-8'),'80168807-8');assert.throws(()=>validateOwnDataRuc('80168807-0'));assert.throws(()=>validateOwnDataRuc('0123456'));assert.throws(()=>validateOwnDataRuc('1234567890'));
const ownEnvelope={data:{ruc:'80168807',dv:'8',fullRuc:'80168807-8',nameOfficial:'EMPRESA OFICIAL',stateRaw:'ACTIVO'},meta:{environment:'live',provenance:{source:'dnit_official_snapshot',publicationDate:'2026-10-01',sourcePage:'https://www.dnit.gov.py/web/portal-institucional/listado-de-ruc-con-sus-equivalencias',publishedText:'',importedAt:'2026-10-01T12:00:00Z',snapshotHash:'a'.repeat(64)},quota:{limit:100,used:1,remaining:99,day:'2026-10-20',resetAfter:60}}};
let ownCalls=0,ownStatus=200,ownResponse=ownEnvelope;
const ownProvider=createOwnDataRucProvider({baseUrl:OWNDATA_RUC_URL,apiKey:'synthetic-secret',allowedHosts:['app.controlaria.online'],fetcher:async(url,init)=>{ownCalls++;assert.equal(url,OWNDATA_RUC_URL+'/80168807-8');assert.equal(init.headers['X-API-Key'],'synthetic-secret');assert.equal(init.redirect,'error');assert.equal(init.credentials,'omit');assert.equal(init.headers.Cookie,undefined);assert.equal(init.headers.Authorization,undefined);assert(!url.includes('synthetic-secret'));return new Response(JSON.stringify(ownResponse),{status:ownStatus});}});
assert.equal((await ownProvider.lookup('80168807-8')).name,'EMPRESA OFICIAL');
// OwnData contract 1.4.0 deliberately strips stateRaw from commercial/public data.
const currentEnvelope={...ownEnvelope,data:{ruc:'80168807',dv:'8',fullRuc:'80168807-8',nameOfficial:'EMPRESA OFICIAL',equivalenceRaw:''}};
ownResponse=currentEnvelope;assert.equal((await ownProvider.lookup('80168807-8')).state,undefined,'absent tax status must stay unknown');ownResponse=ownEnvelope;
// Fiscal metadata never changes validity or reaches the normalized public record.
for(const fields of [{status:'ACTIVO'},{status:'INACTIVO'},{status:'SUSPENDIDO'},{status:'OTHER'},{stateRaw:'ACTIVO'},{stateRaw:null},{stateRaw:{future:'shape'},status:42},{}]){
 ownResponse=structuredClone(currentEnvelope);Object.assign(ownResponse.data,fields,{apiKey:'synthetic-secret'});
 const record=await ownProvider.lookup('80168807-8');assert.equal(record.name,'EMPRESA OFICIAL');assert.equal(record.state,undefined);
 const publicRecord=rucRecord(record,'80168807-8');assert.equal(publicRecord.tax_state,'');
 for(const forbidden of ['status','stateRaw','synthetic-secret'])assert(!JSON.stringify(publicRecord).includes(forbidden));
}
for(const mutate of [e=>delete e.data.nameOfficial,e=>e.data.nameOfficial=' ',e=>e.data.ruc='bad',e=>e.data.dv='0',e=>e.data.fullRuc='80168807-0',e=>e.meta.environment='unknown',e=>delete e.meta.environment,e=>delete e.meta.quota,e=>e.meta.quota.used=-1,e=>e.meta.quota.limit=0,e=>e.meta.quota.resetAfter=0,e=>e.meta.quota.remaining=1.5,e=>e.meta.quota.day='2026-02-30',e=>e.meta.quota.resetAfter='60',e=>delete e.meta.provenance,e=>e.meta.provenance.source='unknown',e=>e.meta.provenance.sourcePage='http://www.dnit.gov.py/data',e=>e.meta.provenance.sourcePage=['https://www.dnit.gov.py/data'],e=>e.meta.provenance.sourcePage='https://user:pass@www.dnit.gov.py/data',e=>e.meta.provenance.snapshotHash='bad',e=>e.meta.provenance.publicationDate='2026-02-30',e=>delete e.meta.provenance.importedAt,e=>e.meta.provenance.publishedText=null,e=>e.data.equivalenceRaw=42,e=>e.data.sourcePartition=10]){
 ownResponse=structuredClone(currentEnvelope);mutate(ownResponse);
 await assert.rejects(()=>ownProvider.lookup('80168807-8'),error=>error.status===503&&error.code==='OWNDATA_INVALID_RESPONSE');
}
for(const fields of [{equivalenceRaw:null,sourcePartition:0},{equivalenceRaw:'',sourcePartition:9},{ruc:80168807,dv:8}]){
 ownResponse=structuredClone(currentEnvelope);Object.assign(ownResponse.data,fields);assert.equal((await ownProvider.lookup('80168807-8')).fullRuc,'80168807-8');
}
ownResponse=ownEnvelope;
let beforeCalls=ownCalls;await assert.rejects(()=>ownProvider.lookup('80168807-0'),e=>e.status===400);assert.equal(ownCalls,beforeCalls,'invalid DV never sent or retried by base');
for(const [status,code,expected] of [[400,'INVALID_RUC_DV',400],[400,'INVALID_RUC_FORMAT',400],[401,'API_KEY_INVALID',503],[401,'API_KEY_REVOKED',503],[401,'API_KEY_EXPIRED',503],[403,'INSUFFICIENT_SCOPE',503],[403,'PLAN_REQUIRED',503],[429,'DAILY_QUOTA_REACHED',429],[503,'COMMERCIAL_API_DISABLED',503],[503,'DNIT_DATA_UNAVAILABLE',503],[404,'OTHER_NOT_FOUND',503]]){
 ownStatus=status;ownResponse={error:{code,message:'private upstream synthetic-secret'}};beforeCalls=ownCalls;
 await assert.rejects(()=>ownProvider.lookup('80168807-8'),e=>e.status===expected&&e.code===(code==='OTHER_NOT_FOUND'?'OWNDATA_INVALID_RESPONSE':code)&&!e.message.includes('synthetic-secret')&&!e.message.includes('private upstream'));assert.equal(ownCalls,beforeCalls+1,'exactly one request per error');
}
ownStatus=404;ownResponse={error:{code:'REGISTERED_RUC_NOT_FOUND'}};assert.equal(await ownProvider.lookup('80168807-8'),null);
ownStatus=200;ownResponse={...ownEnvelope,meta:{provenance:{source:'unknown',publicationDate:'2026-10-01'}}};await assert.rejects(()=>ownProvider.lookup('80168807-8'),e=>e.status===503);
ownResponse={...ownEnvelope,data:{...ownEnvelope.data,fullRuc:'80168807-0',dv:'0'}};await assert.rejects(()=>ownProvider.lookup('80168807-8'),e=>e.status===503);
ownResponse=ownEnvelope;await query("update scale_ruc_usage set used=0 where month=date_trunc('month',current_date)::date");
async function ownCall(){let output;await rucLookup({req:{method:'POST',socket:{}},res:{},url:new URL('https://test/api/agency/ruc-lookup'),db,session:async()=>user,body:async()=>({ruc:'80168807-8'}),send:(_,status,data)=>output={status,...data},provider:ownProvider,config:{...ownSettings,monthlyLimit:100}});return output;}
let ownFound=await ownCall();assert.equal(ownFound.status,200);assert.equal(ownFound.record.name,'EMPRESA OFICIAL');assert.equal(ownFound.record.source,'owndata:dnit_official_snapshot');assert.equal(ownFound.record.publication_date,'2026-10-01');assert.equal(ownFound.cached,false,'provider switch isolates legacy cache');
assert.equal(ownFound.record.tax_state,'');for(const forbidden of ['stateRaw','ACTIVO','synthetic-secret'])assert(!JSON.stringify(ownFound).includes(forbidden));assert(!Object.hasOwn(ownFound.record,'status'));
await query("update agency_ruc_lookup_cache set record=record||'{\"tax_state\":\"ACTIVO\",\"status\":\"ACTIVO\",\"stateRaw\":\"ACTIVO\",\"apiKey\":\"synthetic-secret\"}'::jsonb where lookup_key='owndata:80168807-8'");
beforeCalls=ownCalls;ownFound=await ownCall();assert.equal(ownFound.record.tax_state,'');for(const value of ['ACTIVO','stateRaw','synthetic-secret'])assert(!JSON.stringify(ownFound).includes(value));assert(!Object.hasOwn(ownFound.record,'status'));assert.equal(ownFound.cached,true);assert.equal(ownCalls,beforeCalls);
await query("delete from agency_ruc_lookup_cache where lookup_key='owndata:80168807-8'");ownStatus=429;ownResponse={error:{code:'DAILY_QUOTA_REACHED'}};assert.equal((await ownCall()).status,429);assert.equal((await query("select count(*)::int n from agency_ruc_lookup_cache where lookup_key='owndata:80168807-8'")).rows[0].n,0,'429 never cached as miss');
ownStatus=503;ownResponse={error:{code:'COMMERCIAL_API_DISABLED'}};assert.match((await ownCall()).error,/no está habilitada/);assert.equal((await query("select count(*)::int n from agency_ruc_lookup_cache where lookup_key='owndata:80168807-8'")).rows[0].n,0,'503 never cached as miss');

for(const code of ['COMMERCIAL_API_DISABLED','API_KEY_EXPIRED','API_KEY_REVOKED','API_KEY_INVALID']){
 ownStatus=code==='COMMERCIAL_API_DISABLED'?503:401;ownResponse={error:{code,message:'private upstream synthetic-secret'},diagnostics:'synthetic-secret'};
 const response=await ownCall();assert.equal(response.status,503);assert.equal(response.code,code);assert(!JSON.stringify(response).includes('synthetic-secret'));assert(!JSON.stringify(response).includes('private upstream'));
}
ownStatus=200;ownResponse={error:{code:'COMMERCIAL_API_DISABLED',message:'synthetic-secret'}};assert.equal((await ownCall()).code,'COMMERCIAL_API_DISABLED');
ownResponse={error:{code:'synthetic-secret',message:'private upstream'}};assert.equal((await ownCall()).code,'OWNDATA_INVALID_RESPONSE');
const beforeRateFailure=ownCalls;let failedRate;
await rucLookup({req:{method:'POST',socket:{}},res:{},url:new URL('https://test/api/agency/ruc-lookup'),db:{query:async()=>{throw Error('private limiter diagnostics synthetic-secret');}},session:async()=>user,body:async()=>({ruc:'80168807-8'}),send:(_,status,data)=>failedRate={status,...data},provider:ownProvider,config:ownSettings});
assert.equal(failedRate.status,503);assert.equal(ownCalls,beforeRateFailure);assert(!JSON.stringify(failedRate).includes('synthetic-secret'));
for(const response of [new Response(' '.repeat(65537)),new Response('{}',{headers:{'Content-Length':'65537'}}),new Response('not JSON')]){
 const bounded=createOwnDataRucProvider({baseUrl:OWNDATA_RUC_URL,apiKey:'synthetic-secret',allowedHosts:['app.controlaria.online'],fetcher:async()=>response});
 await assert.rejects(()=>bounded.lookup('80168807-8'),e=>e.status===503&&e.code==='OWNDATA_INVALID_RESPONSE');
}
await pg.close();console.log('PASS: legacy provider and OwnData opt-in, explicit config/auth, envelope/provenance validation, DV validation, no retries, error mapping, provider cache isolation, quota, and non-destructive client refresh');
