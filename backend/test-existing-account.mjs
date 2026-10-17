// Disposable database only; email capture never contacts a provider.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import {maintenanceTestDatabase} from './scripts/test-maintenance-database.mjs';
import {emailPasswordAuth} from './email-password-auth.js';
import {registerTrial} from './trial-registration.js';
import {registrationIdentity} from './existing-account.js';

const checked=await maintenanceTestDatabase();
const real=Boolean(process.env.SCALE_MAINTENANCE_TEST_PG_SOCKET);
let database=checked;
if(real){
 await checked.close();
 const pool=new pg.Pool({host:process.env.SCALE_MAINTENANCE_TEST_PG_SOCKET,port:Number(process.env.SCALE_MAINTENANCE_TEST_PG_PORT),user:'scale_maintenance_fixture',database:'postgres',ssl:false,max:6});
 database={query:(s,v)=>pool.query(s,v),exec:s=>pool.query(s),connect:()=>pool.connect(),close:()=>pool.end()};
}
let tail=Promise.resolve();
async function connect(){
 if(real)return database.connect();
 const before=tail;let done;tail=new Promise(r=>done=r);await before;
 return {query:(s,v)=>database.query(s,v),release:done};
}
const db={query:(s,v)=>database.query(s,v),connect};
const rows=async(s,v)=>(await db.query(s,v)).rows;
const insert=async(s,v)=>(await rows(s+' returning id',v))[0].id;
const count=async table=>Number((await rows(`select count(*) as n from ${table}`))[0].n);
const snapshot=async()=>{
 const result={};
 for(const table of ['users','organizations','organization_members','organization_subscriptions','os_trial_registrations','agency_settings','personal_data_consents'])result[table]=await rows(`select * from ${table} order by 1,2`);
 return result;
};
const deliveries=[];let requestNumber=0;
async function register(input,{emailAvailable=true,database:registrationDb=db}={}){
 let result;
 await emailPasswordAuth({req:{method:'POST',headers:{'x-forwarded-for':`198.51.100.${++requestNumber}`}},res:{},url:new URL('http://localhost/api/auth/password/register'),db:registrationDb,
  body:async()=>input,send:(_,status,data,headers)=>result={status,data,headers},emailAvailable,
  sendVerification:async(email,token)=>{deliveries.push({email,token});return true},cookie:(n,v)=>`${n}=${v}`,id:()=>crypto.randomUUID()});
 return result;
}
async function trial(email,details={name:'New fixture agency',currency:'USD'}){
 const c=await connect();
 try{await c.query('begin');const result=await registerTrial(c,{email,email_verified:true,name:'Fixture'},details);await c.query('commit');return result;}
 catch(error){await c.query('rollback');throw error;}finally{c.release();}
}
try{
 await database.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 const source=await fs.readFile(new URL('./server.js',import.meta.url),'utf8');
 const init=source.slice(source.indexOf('async function init()'),source.indexOf('async function provisionOwner('));
 const migrations=[...init.matchAll(/['"](?:migrations\/)?(\d{8}_[\w-]+\.sql)['"]/g)].map(m=>m[1]).filter(f=>f!=='20260908_dadoo_hub.sql');
 for(const file of migrations)await database.exec(await fs.readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const hash=await bcrypt.hash('old',4),password='UnaClaveSegura!2026';
 const org=await insert("insert into organizations(slug,name) values('existing-signup','Existing account')");
 const second=await insert("insert into organizations(slug,name) values('existing-signup-second','Second account')");
 const user=await insert("insert into users(email,password_hash,email_verified_at) values('historical@example.invalid',$1,now())",[hash]);
 await db.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'viewer'),($3,$2,'editor')",[org,user,second]);
 let before=await snapshot();
 for(const intent of ['resolve',undefined]){
  const r=await register({intent,email:'historical@example.invalid',password:'old'});
  assert.equal(r.status,200);assert.equal(r.data.existing,true);assert.equal(r.data.redirect,'/?chooseCompany=1');assert.match(r.headers['Set-Cookie'],/^scale_session=/);
  const session=(await rows('select user_id,organization_id from sessions where id=$1',[r.headers['Set-Cookie'].split('=')[1]]))[0];assert.equal(String(session.user_id),String(user));
 }
 assert.deepEqual(await snapshot(),before);assert.equal(deliveries.length,0);
 const incorrect=await register({intent:'resolve',email:'historical@example.invalid',password:'wrong'});assert.equal(incorrect.status,401);assert.equal(incorrect.headers,undefined);
 assert.deepEqual(await snapshot(),before);
 await db.query('insert into user_login_preferences(user_id,default_organization_id) values($1,$2)',[user,second]);
 let r=await register({intent:'resolve',email:'historical@example.invalid',password:'old'},{emailAvailable:false});assert.equal(r.status,200);assert.equal(r.data.redirect,'/');
 assert.equal(String((await rows('select organization_id from sessions where id=$1',[r.headers['Set-Cookie'].split('=')[1]]))[0].organization_id),String(second));
 await db.query('update organization_members set active=false where user_id=$1 and organization_id=$2',[user,second]);
 r=await register({intent:'resolve',email:'historical@example.invalid',password:'old'});assert.equal(r.status,200);assert.equal(r.data.redirect,'/?chooseCompany=1');
 assert.equal(String((await rows('select organization_id from sessions where id=$1',[r.headers['Set-Cookie'].split('=')[1]]))[0].organization_id),String(org));
 console.log('PASS historical verified account: legacy password, default/multi-company fallback, wrong password, delivery disabled, no profile/trial/role writes');

 before=await snapshot();
 r=await register({intent:'resolve',email:'unknown@example.invalid',password});assert.equal(r.status,200);assert.deepEqual(r.data,{requiresAgency:true});assert.deepEqual(await snapshot(),before);assert.equal(deliveries.length,0);
 r=await register({email:'weak-new@example.invalid',password:'weak',company:'New',currency:'USD',consent:true});assert.equal(r.status,400);assert.deepEqual(await snapshot(),before);
 const pending=await insert("insert into users(email,password_hash) values('unverified-existing@example.invalid',$1)",[hash]);
 r=await register({intent:'resolve',email:'unverified-existing@example.invalid',password:'old'});assert.equal(r.status,401);assert.equal((await registrationIdentity(db,'unverified-existing@example.invalid')).existing,true);
 await assert.rejects(trial('unverified-existing@example.invalid'),{status:403});
 assert.equal((await rows('select 1 from organization_members where user_id=$1',[pending])).length,0);

 for(const state of ['revoked','inactive','closed','demo','orphan']){
  const email=`${state}-signup@example.invalid`,actor=await insert('insert into users(email,password_hash,email_verified_at,is_demo_guest) values($1,$2,now(),$3)',[email,hash,state==='demo']);
  if(state!=='orphan')await db.query("insert into organization_members(organization_id,user_id,role,active,removed_at) values($1,$2,'viewer',$3,case when $4 then now() else null end)",[org,actor,state!=='inactive',state==='revoked']);
  if(state==='closed')await db.query("insert into account_closure_requests(user_id,recoverable_until) values($1,now()+interval '1 day')",[actor]);
  before=await snapshot();const sessions=await count('sessions');
  r=await register({intent:'resolve',email,password:'old'});assert.equal(r.status,state==='demo'?401:403,state);assert.equal(r.headers,undefined);
  if(state==='closed')assert.equal(r.data.code,'ACCOUNT_CLOSURE_PENDING');
  await assert.rejects(trial(email),{status:403});assert.deepEqual(await snapshot(),before,state);assert.equal(await count('sessions'),sessions,state);
 }
 console.log('PASS unknown resolution has no writes; new password policy; unverified/orphan/revoked/inactive/closure/demo identities cannot enroll again');

 const applicant=await insert("insert into users(email,password_hash,email_verified_at) values('pending-existing@example.invalid',$1,now())",[hash]);
 const link=await insert("insert into agency_invite_links(organization_id,token_hash,role,mode,created_by,expires_at) values($1,$2,'viewer','approval',$3,now()+interval '1 day')",[org,crypto.randomUUID(),user]);
 await db.query("insert into agency_access_requests(link_id,user_id,full_name) values($1,$2,'Pending fixture')",[link,applicant]);
 before=await snapshot();r=await register({intent:'resolve',email:'pending-existing@example.invalid',password:'old'});assert.equal(r.status,200);assert.equal(r.data.pending,true);assert.equal(r.data.redirect,'/acceso-pendiente');assert.deepEqual(await snapshot(),before);
 const existing=await trial('pending-existing@example.invalid');assert.equal(existing.pending,true);assert.deepEqual(await snapshot(),before);
 for(const change of ["revoked_at=now()","revoked_at=null,expires_at=now()-interval '1 second'","expires_at=now()+interval '1 day',used_at=now()"]){
  await db.query('update agency_invite_links set '+change+' where id=$1',[link]);
  r=await register({intent:'resolve',email:'pending-existing@example.invalid',password:'old'});assert.equal(r.status,403);await assert.rejects(trial('pending-existing@example.invalid'),{status:403});
 }
 console.log('PASS pending access uses only live invitation; revoked/expired/used links deny both password and Google trial resolution');

 // New signup holds a transaction connection. A bounded pool must not be
 // asked for a second connection for throttling while the first is retained.
 let held=false;
 const bounded={query:(sql,args)=>{assert.equal(held,false,'no nested pool query while retaining signup transaction');return db.query(sql,args);},connect:async()=>{
  const c=await connect();held=true;
  return {query:(sql,args)=>c.query(sql,args),release:()=>{held=false;c.release();}};
 }};
 r=await register({email:'bounded-pool@example.invalid',password,company:'Bounded pool agency',currency:'USD',consent:true},{database:bounded});assert.equal(r.status,202,JSON.stringify(r.data));assert.equal(held,false);
 console.log('PASS new signup never requests a nested pool connection while retaining its transaction');

 // A legitimate unfinished password enrollment keeps its credential hash when
 // Google proves the same email. Pending first enrollment is the sole exception.
 r=await register({email:'unfinished@example.invalid',password,company:'Unfinished agency',currency:'USD',consent:true});assert.equal(r.status,202);
 const unfinished=(await rows("select * from users where email='unfinished@example.invalid'"))[0];
 const created=await trial('unfinished@example.invalid');assert.equal(created.created,true);assert.equal(String(created.userId),String(unfinished.id));assert.equal((await rows('select password_hash from users where id=$1',[unfinished.id]))[0].password_hash,unfinished.password_hash);
 before=await snapshot();const again=await trial('unfinished@example.invalid');assert.equal(again.existing,true);assert.equal(String(again.organizationId),String(created.organizationId));assert.deepEqual(await snapshot(),before);
 console.log('PASS Google may complete a genuine pending first enrollment without replacing password, and repeat enrollment is login only');

 const orgCount=await count('organizations');
 const concurrent=await Promise.all([trial('concurrent-new@example.invalid'),trial('concurrent-new@example.invalid',{name:'Other concurrent agency',currency:'PYG'})]);
 assert.equal(concurrent.filter(a=>a.created).length,1);assert.equal(concurrent.filter(a=>a.existing).length,1);assert.equal(String(concurrent[0].organizationId),String(concurrent[1].organizationId));assert.equal(await count('organizations'),orgCount+1);
 assert.equal((await rows("select 1 from os_trial_registrations t join users u on u.id=t.user_id where u.email='concurrent-new@example.invalid'")).length,1);
 // Password registration overlaps the same email advisory lock. Either it creates
 // an unfinished first identity, or Google wins and password login fails safely.
 const mixed=await Promise.all([trial('concurrent-mixed@example.invalid'),register({email:'concurrent-mixed@example.invalid',password,company:'Mixed agency',currency:'USD',consent:true})]);
 assert.equal(mixed[0].created,true);assert([202,401].includes(mixed[1].status));assert.equal((await rows("select 1 from organization_members m join users u on u.id=m.user_id where u.email='concurrent-mixed@example.invalid'")).length,1);
 console.log(`PASS ${real?'PostgreSQL concurrent connections':'PGlite serialized requests'}: two first Google enrollments and mixed Google/password enrollment create one agency each`);
}finally{await database.close();}
