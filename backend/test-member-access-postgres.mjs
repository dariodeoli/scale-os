import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import pg from 'pg';
import {recordLifecycle} from './record-lifecycle.js';
import {suite} from './agency-suite.js';
import {migrationOrder} from './scripts/migration-order.mjs';
// Standalone local cluster, never the configured development/production database.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url));
const candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));
assert(bin,'Provide SCALE_TEST_PG_BIN with initdb and pg_ctl');
assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-members-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');
mkdirSync(socket,{mode:0o700});
const user='scale_members_fixture',port=55444;
const localEnv={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
let pool,started=false,cleaned=false;
function cleanup(){
 if(cleaned)return;
 if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}
 assert(/^\/tmp\/scale-members-pg-[A-Za-z0-9]+$/.test(temporary));
 rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP membership fixture cluster stopped and removed');
}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Cluster retained:',temporary,error.message);process.exitCode=1;}});
process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));

async function call(db,actor,target,method){
 let response;
 const args={req:{method,socket:{remoteAddress:'members-pg-fixture'}},res:{},url:new URL(`https://fixture.invalid/api/agency/members/${target}`),db,session:async()=>({...actor}),body:async()=>({active:false}),send:(_,status,data)=>response={status,...data}};
 assert(await recordLifecycle(args)||await suite(args));return response;
}
async function race(index,methods){
 const org=(await pool.query("insert into organizations(slug,name) values($1,'Members concurrency fixture') returning id",['members-pg-'+index])).rows[0].id;
 const owners=[];
 for(let i=0;i<2;i++){
  const uid=(await pool.query("insert into users(email,password_hash) values($1,'unused') returning id",[`members-${index}-${i}@example.invalid`])).rows[0].id;
  await pool.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);owners.push({id:uid,organization_id:org,role:'owner'});
 }
 let arrivals=0,release,holder;
 const gate=new Promise(resolve=>release=resolve),pids=[];
 const timer=setTimeout(()=>release(),8000);
 const db={async connect(){const connection=await pool.connect();const pid=(await connection.query('select pg_backend_pid() as pid')).rows[0].pid;pids.push(pid);
  return {release:()=>connection.release(),async query(sql,params){
   if(sql==='select id from organizations where id=$1 for update'){
    arrivals++;if(arrivals===2)release();await gate;
    const result=await connection.query(sql,params);
    if(!holder){
     holder=pid;const waiter=pids.find(other=>other!==pid);let blocked=false;
     for(let attempt=0;attempt<400;attempt++){
      const rows=(await pool.query('select pg_blocking_pids($1::int) as blockers',[waiter])).rows;
      if(rows[0].blockers.includes(pid)){blocked=true;break;}await delay(10);
     }
     assert(blocked,'observe independent PostgreSQL connection waiting on company lock');
     console.log(`BLOCK members ${index}: PID ${waiter} waits for PID ${pid}`);
    }
    return result;
   }
   return connection.query(sql,params);
  }};
 }};
 try{
  const result=await Promise.all(owners.map((actor,i)=>call(db,actor,owners[1-i].id,methods[i])));
  assert.equal(arrivals,2);assert.equal(new Set(pids).size,2);
  assert.deepEqual(result.map(row=>row.status).sort(),[200,403],JSON.stringify(result));
  const remaining=(await pool.query("select count(*)::int as n from organization_members where organization_id=$1 and active and removed_at is null and role='owner'",[org])).rows[0].n;
  assert.equal(remaining,1,'exactly one owner survives simultaneous removal/suspension');
  console.log(`RACE members ${methods.join('/')} -> ${result.map(row=>row.status).join(', ')}; active owners ${remaining}`);
 }finally{clearTimeout(timer);}
}
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=10 -c statement_timeout=15000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=20000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,options:'-c search_path=public',application_name:'scale-members-concurrency-fixture',max:5,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const info=(await pool.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');
 await pool.query(readFileSync(path.join(repo,'schema.sql'),'utf8'));
 for(const file of migrationOrder)await pool.query(readFileSync(path.join(repo,'migrations',file),'utf8'));

 await race(1,['DELETE','DELETE']);
 await race(2,['PATCH','PATCH']);
 await race(3,['DELETE','PATCH']);
 console.log('PASS real PostgreSQL member access: two connections and observed company-lock waits; owner/owner revoke, suspend and mixed races each preserve one active owner and reject stale actor');
}finally{if(pool)await pool.end();cleanup();}
