import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {migrationOrder} from './scripts/migration-order.mjs';
import {expenseCurrencyCases} from './test-expense-currency-cases.mjs';
// This process owns an isolated Unix-socket cluster, never an application DB.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url)),candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));assert(bin,'Set SCALE_TEST_PG_BIN with initdb/pg_ctl');assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-expense-currency-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');mkdirSync(socket,{mode:0o700});
const user='expense_currency_fixture',port=55455,env={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});let pool,started=false,cleaned=false;
function cleanup(){if(cleaned)return;if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}assert(/^\/tmp\/scale-expense-currency-pg-[A-Za-z0-9]+$/.test(temporary));rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP expense currency fixture cluster stopped and removed');}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Fixture retained:',temporary,error.message);process.exitCode=1;}});process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));
try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=8 -c statement_timeout=20000 -c lock_timeout=10000`,'-w','-t','15','start']);started=true;
 pool=new pg.Pool({host:socket,port,user,database:'postgres',password:'fixture-local-only',ssl:false,max:4,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const info=(await pool.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];assert.equal(realpathSync(info.data),data);assert.equal(info.listen,'');assert.equal(info.address,null);console.log(info.version+'; Unix socket only');
 await pool.query(readFileSync(path.join(repo,'schema.sql'),'utf8'));for(const file of migrationOrder)if(file!=='20261017_expense_currency_precision.sql')await pool.query(readFileSync(path.join(repo,'migrations',file),'utf8'));
 await expenseCurrencyCases(pool);
 console.log('PASS real PostgreSQL expense ALTER/view dependency migration and cent-precise ledger reversals');
}finally{if(pool)await pool.end();cleanup();}
