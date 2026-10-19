import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,existsSync} from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import {printingCases,loadPrintingSchema} from './test-printing.mjs';
assert.notEqual(process.getuid?.(),0,'Run PostgreSQL as an unprivileged user');
for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const ciUrl=process.env.SCALE_PRINT_TEST_PG_CI_URL;
if(ciUrl){
 // Hosted CI gets a dedicated PostgreSQL17 service, never an arbitrary database.
 const target=new URL(ciUrl);
 assert(process.env.CI==='true'&&['postgres:','postgresql:'].includes(target.protocol)&&target.hostname==='127.0.0.1'&&target.port==='55479'&&target.pathname==='/printing_fixture'&&target.username==='printing_fixture'&&target.password==='fixture_only'&&!target.search&&!target.hash,'External printing fixture is restricted to the dedicated local CI service');
 const pool=new pg.Pool({connectionString:ciUrl,max:8});
 pool.on('error',error=>{console.error('Printing CI fixture pool error:',error.code||'UNKNOWN');process.exitCode=1;});
 try{await loadPrintingSchema(pool);await printingCases(pool,{concurrent:true});}finally{await pool.end();}
}else{
const bin=process.env.SCALE_TEST_PG_BIN||'/usr/lib/postgresql/17/bin';
assert(existsSync(path.join(bin,'initdb')),'Set SCALE_TEST_PG_BIN to PostgreSQL 16/17 binaries');
const temp=mkdtempSync('/tmp/scale-printing-pg-'),data=path.join(temp,'data'),socket=path.join(temp,'socket');mkdirSync(socket,{mode:0o700});
const port=Number(process.env.SCALE_PRINT_TEST_PORT||55473);assert(port>1024&&port<65536);
const env={PATH:`${bin}:/usr/bin:/bin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const run=(name,args)=>execFileSync(path.join(bin,name),args,{env,encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
let started=false,pool,closing=false;
try{
 run('initdb',['-D',data,'-U','printing_fixture','--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 run('pg_ctl',['-D',data,'-l',path.join(temp,'postgres.log'),'-o',`-k ${socket} -p ${port} -c listen_addresses=''`,'-w','start']);started=true;
 pool=new pg.Pool({host:socket,port,user:'printing_fixture',database:'postgres',max:8,password:'',ssl:false});
 pool.on('error',error=>{if(!closing||error.code!=='57P01'){console.error('Printing fixture pool error:',error.code||'UNKNOWN');process.exitCode=1;}});
 await loadPrintingSchema(pool);await printingCases(pool,{concurrent:true});
}finally{
 closing=true;await pool?.end();if(started)run('pg_ctl',['-D',data,'-m','fast','-w','stop']);
 // Only this process's newly created, stopped cluster is removed.
 rmSync(temp,{recursive:true});console.log('Printing PostgreSQL fixture stopped and removed');
}

}
