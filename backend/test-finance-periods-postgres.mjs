import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import {migrationOrder} from './scripts/migration-order.mjs';
import {financeTreasury} from './finance-treasury.js';
import {financeControls} from './finance-controls.js';

// Isolated Unix-socket-only cluster; never connect to a configured database.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url)),bin=process.env.SCALE_TEST_PG_BIN||['/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin'].find(dir=>existsSync(path.join(dir,'initdb')));
assert(bin,'Set SCALE_TEST_PG_BIN');assert.notEqual(process.getuid?.(),0);
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-finance-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');mkdirSync(socket,{mode:0o700});
const user='scale_finance_fixture',port=55449,localEnv={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
let pool,started=false,cleaned=false;
function cleanup(){if(cleaned)return;if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}assert(/^\/tmp\/scale-finance-pg-[A-Za-z0-9]+$/.test(temporary));rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP finance fixture cluster stopped and removed');}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Cluster retained:',temporary,error.message);process.exitCode=1;}});process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
const gate=()=>{let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};};
async function blocked(waiter,holder){for(let n=0;n<400;n++){const result=await pool.query('select pg_blocking_pids($1::int) as blockers',[waiter]);if(result.rows[0].blockers.includes(holder)){console.log(`BLOCK PID ${waiter} waits for PID ${holder}`);return;}await delay(10);}assert.fail('A real PostgreSQL lock wait must be observed');}
async function call(actor,pathname,method,payload,db=pool){let response;const args={req:{method,socket:{remoteAddress:'local-pg-fixture'}},res:{},url:new URL('https://fixture.invalid'+pathname),db,session:async()=>actor,body:async()=>payload,send:(_,status,data)=>response={status,...data}};for(const handler of [financeTreasury,financeControls])if(await handler(args))return response;throw Error('Unhandled '+pathname);}
function intercept(pattern,{held=null,arriving=null}={}){let pid;const ready=gate();const db={async connect(){const client=await pool.connect();pid=(await client.query('select pg_backend_pid() as pid')).rows[0].pid;ready.resolve(pid);return {release:()=>client.release(),async query(sql,args){if(pattern.test(sql)){arriving?.resolve(pid);const result=await client.query(sql,args);if(held){held.locked.resolve(pid);await held.release.promise;}return result;}return client.query(sql,args);}};}};return {db,ready:ready.promise,get pid(){return pid;}};}
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=10 -c statement_timeout=15000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=20000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,options:'-c search_path=public',application_name:'scale-finance-concurrency-fixture',max:6,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const query=(sql,args)=>pool.query(sql,args),one=async(sql,args)=>(await query(sql,args)).rows[0];
 const info=await one("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version");assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');
 await query(readFileSync(path.join(repo,'schema.sql'),'utf8'));for(const file of [...migrationOrder,'20261017_finance_periods_receipts.sql'])await query(readFileSync(path.join(repo,'migrations',file),'utf8'));
 const org=(await one("insert into organizations(slug,name) values('finance-pg','Finance fixture') returning id")).id,uid=(await one("insert into users(email,password_hash) values('finance-pg@example.invalid','unused') returning id")).id;await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
 const actor={id:uid,organization_id:org,role:'owner'},account=(await one("insert into bank_accounts(organization_id,name,account_type,currency) values($1,'Fixture cash','cash','USD') returning id",[org])).id;
 const root='/api/agency',receipt=on=>({mode:'unassigned',accountId:account,amount:50,receivedOn:on,reference:'Concurrent receipt',requestId:randomUUID()});
 // Closing owns the mutex first: the waiting receipt is rejected after close,
 // rather than escaping between the snapshot read and the closed-state write.
 {
  const held={locked:gate(),release:gate()},closer=intercept(/^select lock_agency_finance_period/,{held}),writer=intercept(/^select pg_advisory_xact_lock/);
  const closing=call(actor,root+'/finance/periods/2026-07/close','POST',{reason:'Concurrent monthly close',expectedRevision:0},closer.db);const holder=await held.locked.promise;
  const writing=call(actor,root+'/payments','POST',receipt('2026-07-15'),writer.db),waiter=await writer.ready;try{await blocked(waiter,holder);}finally{held.release.resolve();}
  const [closed,written]=await Promise.all([closing,writing]);assert.equal(closed.status,200,JSON.stringify(closed));assert.equal(written.status,409,JSON.stringify(written));assert.equal(Number((await one('select balance from bank_accounts where id=$1',[account])).balance),0);assert.equal(Number(closed.period.snapshot.accounts[0].closing_balance),0);
 }
 // Receipt owns the mutex first: close waits and includes that receipt in its
 // immutable month-end snapshot, even for an earlier-month backdated receipt.
 {
  const held={locked:gate(),release:gate()},writer=intercept(/^select pg_advisory_xact_lock/,{held}),closer=intercept(/^select lock_agency_finance_period/);
  const writing=call(actor,root+'/payments','POST',receipt('2026-08-15'),writer.db);const holder=await held.locked.promise;
  const closing=call(actor,root+'/finance/periods/2026-08/close','POST',{reason:'Close after receipt settles',expectedRevision:0},closer.db),waiter=await closer.ready;try{await blocked(waiter,holder);}finally{held.release.resolve();}
  const [written,closed]=await Promise.all([writing,closing]);assert.equal(written.status,201,JSON.stringify(written));assert.equal(closed.status,200,JSON.stringify(closed));assert.equal(Number(closed.period.snapshot.accounts[0].closing_balance),50);
 }
 const duplicate=receipt('2026-09-01'),duplicates=await Promise.all([call(actor,root+'/payments','POST',duplicate),call(actor,root+'/payments','POST',duplicate)]);assert.deepEqual(duplicates.map(r=>r.status).sort(),[200,201]);assert.equal(Number((await one('select count(*) as n from agency_payments where request_key=$1',[duplicate.requestId])).n),1);
 const client=(await one("insert into agency_clients(organization_id,name) values($1,'Application race') returning id",[org])).id,invoice=(await one("insert into agency_invoices(organization_id,client_id,number,currency,total) values($1,$2,'F-RACE','USD',80) returning id",[org,client])).id;
 const payA=(await call(actor,root+'/payments','POST',receipt('2026-09-02'))).payment,payB=(await call(actor,root+'/payments','POST',receipt('2026-09-02'))).payment;
 // Independent receipts competing for the same invoice serialize on the invoice.
 const held={locked:gate(),release:gate()},first=intercept(/^select \* from agency_invoices where id=\$1 and organization_id=\$2 for update/,{held}),second=intercept(/^select \* from agency_invoices where id=\$1 and organization_id=\$2 for update/);
 const applying=call(actor,root+'/payments/'+payA.id+'/applications','POST',{invoiceId:invoice,amount:50,requestId:randomUUID()},first.db),holder=await held.locked.promise;
 const competing=call(actor,root+'/payments/'+payB.id+'/applications','POST',{invoiceId:invoice,amount:50,requestId:randomUUID()},second.db),waiter=await second.ready;try{await blocked(waiter,holder);}finally{held.release.resolve();}
 const results=await Promise.all([applying,competing]);assert.deepEqual(results.map(r=>r.status).sort(),[201,409],JSON.stringify(results));assert.equal(Number((await one('select paid_amount from agency_invoices where id=$1',[invoice])).paid_amount),50);
 assert.equal(Number((await one('select balance from bank_accounts where id=$1',[account])).balance),200,'Applications never create a second cash movement');
 console.log('PASS real PostgreSQL finance: observed close/write and write/close advisory blocking, exact snapshots/no escaped backdates, duplicate receipt idempotency, observed application row-lock race with one winner and no overpayment or duplicate cash');
}finally{if(pool)await pool.end();cleanup();}
