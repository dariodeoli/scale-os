import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {accessSync,constants,existsSync,mkdtempSync,mkdirSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Standalone local cluster, never the configured development/production database.
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url));
const candidates=[...String(process.env.PATH||'').split(path.delimiter),'/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin','/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin'];
const bin=process.env.SCALE_TEST_PG_BIN||candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')));
assert(bin,'Provide SCALE_TEST_PG_BIN with initdb and pg_ctl');
assert.notEqual(process.getuid?.(),0,'initdb requires an unprivileged user');
for(const name of ['initdb','pg_ctl','postgres'])accessSync(path.join(bin,name),constants.X_OK);
const temporary=realpathSync(mkdtempSync('/tmp/scale-maintenance-pg-')),data=path.join(temporary,'data'),socket=path.join(temporary,'socket');
mkdirSync(socket,{mode:0o700});
const user='scale_maintenance_fixture',port=55447;
const localEnv={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const tool=(name,args)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
let started=false,cleaned=false;
function cleanup(){
 if(cleaned)return;
 if(started){tool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);started=false;}
 assert(/^\/tmp\/scale-maintenance-pg-[A-Za-z0-9]+$/.test(temporary));
 rmSync(temporary,{recursive:true});cleaned=true;console.log('CLEANUP maintenance fixture cluster stopped and removed');
}
process.once('exit',()=>{if(!cleaned)try{cleanup();}catch(error){console.error('Cluster retained:',temporary,error.message);process.exitCode=1;}});
process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));

try{
 tool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 tool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${socket}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=10 -c statement_timeout=15000 -c lock_timeout=10000 -c idle_in_transaction_session_timeout=20000`,'-w','-t','15','start']);started=true;

 const output=execFileSync(process.execPath,[path.join(repo,'test-maintenance.mjs')],{cwd:repo,env:{...process.env,SCALE_MAINTENANCE_TEST_PG_SOCKET:socket,SCALE_MAINTENANCE_TEST_PG_PORT:String(port)},encoding:'utf8',timeout:180000,maxBuffer:8*1024*1024});
 process.stdout.write(output);
 console.log('PASS real PostgreSQL maintenance: populated modern demo deletion, closed-period and immutable guards, rollback, cross-tenant refusal and active sessions preserved');
}finally{cleanup();}
