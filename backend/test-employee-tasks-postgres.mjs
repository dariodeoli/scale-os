import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {employeeTasks} from './employee-tasks.js';
// Standalone local cluster, never the configured development/production database.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url));
const candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));
assert(bin,'Provide SCALE_TEST_PG_BIN with initdb and pg_ctl');
assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-tasks-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');
mkdirSync(socket,{mode:0o700});
const user='scale_tasks_fixture',port=55439;
const localEnv={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
let pool,started=false,cleaned=false;
function cleanup(){
 if(cleaned)return;
 if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}
 assert(/^\/tmp\/scale-tasks-pg-[A-Za-z0-9]+$/.test(temporary));
 rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP task fixture cluster stopped and removed');
}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Cluster retained:',temporary,error.message);process.exitCode=1;}});
process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
const migrations=['20260908_treasury_ledger.sql','20260908_people_commissions_comments.sql','20260908_operations_complete.sql','20260908_referral_discounts.sql','20260908_collaborator_profiles.sql','20260908_agency_suite.sql','20260908_daily_controls.sql','20260910_productivity.sql','20260910_profile_identity.sql','20260908_google_oauth.sql','20260910_demo_sessions.sql','20260910_invite_links.sql','20260910_global_identity.sql','20261017_employee_tasks.sql'];
async function call(actor,key,method,payload,db=pool){let result;assert.equal(await employeeTasks({req:{method,socket:{remoteAddress:'local-pg-fixture'}},res:{},url:new URL('https://fixture.invalid/api/agency/productivity/internal-tasks'+key),db,session:async()=>({...actor}),body:async()=>payload,send:(_,status,data)=>result={status,...data}}),true);return result;}
async function race(actor,key,version,operations){
 let arrivals=0,release;const gate=new Promise(yes=>release=yes),pids=[];let holder;
 const timer=setTimeout(()=>release(),8000);
 const db={async connect(){const client=await pool.connect();const pid=(await client.query('select pg_backend_pid() as pid')).rows[0].pid;pids.push(pid);
  return {release:()=>client.release(),async query(sql,args){
   if(/^select \* from agency_internal_tasks where id=\$1 and organization_id=\$2 for update$/.test(sql)){
    arrivals++;if(arrivals===2)release();await gate;
    const result=await client.query(sql,args);
    if(!holder){holder=pid;const waiter=pids.find(other=>other!==pid);let blocked=false;
     for(let i=0;i<400;i++){const r=await pool.query('select pg_blocking_pids($1::int) as blockers',[waiter]);if(r.rows[0].blockers.includes(pid)){blocked=true;break;}await delay(10);}
     assert(blocked,'Real PostgreSQL row lock wait must be observed');console.log(`BLOCK task ${key}: PID ${waiter} waits for PID ${pid}`);
    }
    return result;
   }
   return client.query(sql,args);
  }};
 }};
 try{
  const results=await Promise.all(operations.map(op=>call(actor,key+op.suffix,op.method,{expected_version:version,...op.payload},db)));
  assert.equal(arrivals,2);assert.equal(new Set(pids).size,2);
  assert.equal(results.filter(result=>result.status===409).length,1,JSON.stringify(results));
  assert.equal(results.filter(result=>[200,201].includes(result.status)).length,1,JSON.stringify(results));
  const stored=(await pool.query('select version from agency_internal_tasks where id=$1',[key.slice(1)])).rows[0];assert.equal(Number(stored.version),version+1,'Exactly one mutation advances the version');
  console.log(`RACE task ${key}: PIDs ${pids.join(', ')} -> ${results.map(result=>result.status).join(', ')}`);return results;
 }finally{clearTimeout(timer);}
}
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=10 -c statement_timeout=15000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=20000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,options:'-c search_path=public',application_name:'scale-tasks-concurrency-fixture',max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const info=(await pool.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');
 await pool.query(readFileSync(path.join(repo,'schema.sql'),'utf8'));
 for(const file of migrations)await pool.query(readFileSync(path.join(repo,'migrations',file),'utf8'));
 await pool.query(readFileSync(path.join(repo,'migrations/20261017_employee_tasks.sql'),'utf8'));
 const org=(await pool.query("insert into organizations(slug,name) values('task-pg-fixture','Task PG fixture') returning id")).rows[0].id;
 const uid=(await pool.query("insert into users(email,password_hash) values('tasks-concurrency@example.invalid','fixture-unused') returning id")).rows[0].id;
 await pool.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
 const actor={id:uid,organization_id:org,role:'owner'};
 const created=await call(actor,'','POST',{title:'Concurrent task',expected_version:0,checklist:[{id:'review',text:'Review',completed:false}]});assert.equal(created.status,201,JSON.stringify(created));const key='/'+created.record.id;
 await race(actor,key,1,[{suffix:'',method:'PATCH',payload:{title:'First writer'}},{suffix:'',method:'PATCH',payload:{title:'Second writer'}}]);
 const results=await race(actor,key,2,[{suffix:'',method:'PATCH',payload:{checklist:[{id:'review',text:'Review',completed:true}]}},{suffix:'/comments',method:'POST',payload:{body:'Concurrent comment'}}]);
 const comments=Number((await pool.query('select count(*) as n from agency_internal_task_comments where task_id=$1',[created.record.id])).rows[0].n);
 assert.equal(comments,results[1].status===201?1:0,'Losing comment rolls back without a persisted row');
 const audit=Number((await pool.query("select count(*) as n from agency_operation_audit where organization_id=$1 and table_name='agency_internal_tasks' and action='UPDATE'",[org])).rows[0].n);assert.equal(audit,2,'Only the two winning writes are audited');
 console.log('PASS real PostgreSQL employee tasks: two independent connections, observed row-lock blocking, PATCH/PATCH and checklist/comment races each produce one winner + 409, exact version increment, no losing comment/audit');
}finally{if(pool)await pool.end();cleanup();}
