import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {clientContacts} from './client-contacts.js';
import {applySuppression} from './personal-data.js';
import {migrationOrder} from './scripts/migration-order.mjs';
// Standalone local cluster, never the configured development/production database.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url));
const candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));
assert(bin,'Provide SCALE_TEST_PG_BIN with initdb and pg_ctl');
assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-contacts-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');
mkdirSync(socket,{mode:0o700});
const user='scale_contacts_fixture',port=55456;
const localEnv={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
let pool,started=false,cleaned=false;
function cleanup(){
 if(cleaned)return;
 if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}
 assert(/^\/tmp\/scale-contacts-pg-[A-Za-z0-9]+$/.test(temporary));
 rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP contacts fixture cluster stopped and removed');
}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Cluster retained:',temporary,error.message);process.exitCode=1;}});
process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=10 -c statement_timeout=15000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=20000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,options:'-c search_path=public',application_name:'scale-contacts-concurrency-fixture',max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const info=(await pool.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');

 await pool.query(readFileSync(path.join(repo,'schema.sql'),'utf8'));
 for(const file of migrationOrder)await pool.query(readFileSync(path.join(repo,'migrations',file),'utf8'));
 const one=async(sql,args)=>(await pool.query(sql,args)).rows[0];
 const userId=(await one("insert into users(email,password_hash) values('contact-race@example.invalid','unused') returning id")).id;
 const org=(await one("insert into organizations(slug,name) values('contacts-race184','Contact race') returning id")).id;
 await pool.query("insert into organization_members(organization_id,user_id,role,active) values($1,$2,'owner',true)",[org,userId]);
 const clientId=(await one("insert into agency_clients(organization_id,name) values($1,'Contact race') returning id",[org])).id;
 const actor={id:userId,organization_id:org,role:'owner'},base='/api/agency/clients/'+clientId+'/contacts';
 async function call(method,suffix,body,db=pool){let result;await clientContacts({req:{method},res:{},url:new URL(base+suffix,'https://fixture.invalid'),db,session:async()=>actor,body:async()=>body,send:(_,status,data)=>result={status,...data}});return result;}
 const created=await call('POST','',{name:'Race contact'});assert.equal(created.status,201);
 const contactId=created.contact.id;
 let arrivals=0,pids=[],unlock;const both=new Promise(resolve=>unlock=resolve);
 const observed={connect:async()=>{
  const c=await pool.connect(),pid=(await c.query('select pg_backend_pid() as pid')).rows[0].pid;pids.push(pid);
  return {release:()=>c.release(),query:async(sql,args)=>{
   if(sql.includes('select * from agency_clients')&&sql.includes('for update')){
    arrivals++;if(arrivals===2)unlock();
    const work=c.query(sql,args);await both;
    const result=await work;
    if(!observed.blocked){for(let i=0;i<100;i++){
     const other=pids.find(value=>value!==pid),waiting=(await pool.query('select pg_blocking_pids($1) as blockers',[other])).rows[0];
     if(waiting.blockers.includes(pid)){observed.blocked=true;break;}await delay(10);
    }assert(observed.blocked,'Independent connection must visibly wait on parent row');}
    return result;
   }return c.query(sql,args);
  }};
 }};
 const race=await Promise.all(['First','Second'].map(role=>call('PATCH','/'+contactId,{expected_version:1,role},observed)));
 assert.equal(new Set(pids).size,2);assert.equal(race.filter(r=>r.status===200).length,1);assert.equal(race.filter(r=>r.status===409).length,1);
 assert.equal(Number((await one('select version from agency_client_contacts where id=$1',[contactId])).version),2);
 const held=await pool.connect();try{
  await held.query('begin');await held.query('select id from agency_clients where id=$1 for update',[clientId]);
  let waitingPid;const waitingDb={connect:async()=>{const c=await pool.connect();waitingPid=(await c.query('select pg_backend_pid() as pid')).rows[0].pid;return c;}};
  const writing=call('POST','',{name:'No resurrection'},waitingDb);
  let blocked=false;for(let i=0;i<100;i++){
   if(waitingPid&&(await pool.query('select cardinality(pg_blocking_pids($1)) as n',[waitingPid])).rows[0].n>0){blocked=true;break;}await delay(10);
  }assert(blocked,'Create must wait for suppression transaction');
  await applySuppression(held,{organizationId:org,subjectKind:'client',subjectId:clientId,actorUserId:userId});await held.query('commit');
  assert.equal((await writing).status,409);
 }finally{held.release();}
 assert.equal(Number((await one('select count(*) as n from agency_client_contacts where client_id=$1',[clientId])).n),0);
 console.log('PASS real PostgreSQL contacts: two independent connections/observed row lock, PATCH/PATCH winner+409 exact version; suppression/create observed wait prevents resurrection and removes contacts');
}finally{await pool?.end();cleanup();}
