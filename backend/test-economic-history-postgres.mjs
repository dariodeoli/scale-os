import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {migrationOrder} from './scripts/migration-order.mjs';
import {economicHistorySchema,economicHistoryCases} from './test-economic-history.mjs';
import {economicHistory} from './economic-history.js';
import {financeTreasury} from './finance-treasury.js';
import {randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
// This process owns an isolated Unix-socket cluster, never an application DB.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url)),candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));assert(bin,'Set SCALE_TEST_PG_BIN with initdb/pg_ctl');assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-economic-history-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');mkdirSync(socket,{mode:0o700});
const user='economic_history_fixture',port=55457,env={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});let pool,started=false,cleaned=false;
function cleanup(){if(cleaned)return;if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}assert(/^\/tmp\/scale-economic-history-pg-[A-Za-z0-9]+$/.test(temporary));rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP economic history fixture cluster stopped and removed');}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Fixture retained:',temporary,error.message);process.exitCode=1;}});process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=8 -c statement_timeout=20000 -c lock_timeout=10000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const info=(await pool.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');
 await economicHistorySchema(pool);
 const {actor,person}=await economicHistoryCases(pool);
 async function call(path,method,payload,db=pool){let response;const args={req:{method,socket:{remoteAddress:'fixture'}},res:{},url:new URL('https://fixture.invalid/api/agency'+path),db,session:async()=>actor,body:async()=>payload,send:(_,status,data)=>response={status,...data}};for(const f of [economicHistory,financeTreasury])if(await f(args))return response;throw Error(path);}
 const pathSalary='/collaborators/'+person+'/salary-history';
 let state=await call(pathSalary,'GET');
 const change={amount:'901.25',currency:'USD',compensationType:'fixed',effectiveFrom:'2026-11-01',reason:'Cambio concurrente acordado',requestId:randomUUID(),expectedRevision:state.revision};
 const results=await Promise.all([call(pathSalary,'POST',change),call(pathSalary,'POST',{...change,amount:'902.25',requestId:randomUUID()})]);
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409],JSON.stringify(results));
 state=await call(pathSalary,'GET');const duplicate={...change,amount:'950.25',effectiveFrom:'2026-12-01',expectedRevision:state.revision,requestId:randomUUID()};
 const retries=await Promise.all([call(pathSalary,'POST',duplicate),call(pathSalary,'POST',duplicate)]);assert.deepEqual(retries.map(r=>r.status).sort(),[200,201]);
 // A close and a salary agreement share the same organization mutex. Observe
 // PostgreSQL blocking while close owns it, then require the waiting backdate
 // to fail after the close commits.
 let release,locked,pidClose,pidWrite;const hold=new Promise(resolve=>release=resolve),ready=new Promise(resolve=>locked=resolve);
 const closer={async connect(){const client=await pool.connect();pidClose=(await client.query('select pg_backend_pid() as pid')).rows[0].pid;return {release:()=>client.release(),async query(sql,args){const result=await client.query(sql,args);if(/^select lock_agency_finance_period/.test(sql)){locked();await hold;}return result;}};}};
 const writer={async connect(){const client=await pool.connect();pidWrite=(await client.query('select pg_backend_pid() as pid')).rows[0].pid;return {release:()=>client.release(),query:(s,a)=>client.query(s,a)};}};
 state=await call(pathSalary,'GET');
 const closing=call('/finance/periods/2026-10/close','POST',{reason:'Cierre concurrente de remuneraciones',expectedRevision:0},closer);await ready;
 const writing=call(pathSalary,'POST',{...duplicate,amount:'960.25',effectiveFrom:'2026-10-01',requestId:randomUUID(),expectedRevision:state.revision},writer);
 let observed=false;try{for(let n=0;n<300;n++){if(pidWrite){const blockers=(await pool.query('select pg_blocking_pids($1::int) as ids',[pidWrite])).rows[0].ids;if(blockers.includes(pidClose)){observed=true;break;}}await delay(10);}}finally{release();}
 const [closed,written]=await Promise.all([closing,writing]);assert(observed,'Observed real advisory-lock blocking');assert.equal(closed.status,200,JSON.stringify(closed));assert.equal(written.status,409,JSON.stringify(written));assert.match(written.error,/cerrado/);
 console.log('PASS PostgreSQL17 economic history: migrations twice; preserved months, exact amounts, permissions and ledger; concurrent optimistic changes one winner, duplicate requests one event, observed close/write lock blocking');
}finally{if(pool)await pool.end();cleanup();}
