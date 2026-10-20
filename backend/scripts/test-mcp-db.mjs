import {PGlite} from '@electric-sql/pglite';
import nodePg from 'pg';
import http from 'node:http';
import {mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
export async function mcpFixtureDatabase(){
 const bin=process.env.SCALE_TEST_PG_BIN;if(!bin){const pg=new PGlite();return {pg,realPostgres:false,close:()=>pg.close()};}
 const temporary=mkdtempSync(path.join(tmpdir(),'scale-mcp312-')),data=path.join(temporary,'data');
 const reserve=http.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
 const tool=(name,args)=>execFileSync(path.join(bin,name),args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});let pool,started=false;
 try{
  tool('initdb',['-D',data,'-U','mcp_fixture','--no-locale','-E','UTF8','-A','trust']);tool('pg_ctl',['-D',data,'-l',path.join(temporary,'pg.log'),'-o',`-p ${port} -h 127.0.0.1 -F -c unix_socket_directories=${temporary}`,'-w','-t','20','start']);started=true;
  pool=new nodePg.Pool({host:'127.0.0.1',port,user:'mcp_fixture',database:'postgres',max:10,connectionTimeoutMillis:5000,statement_timeout:15000});
  return {pg:{options:pool.options,exec:sql=>pool.query(sql),query:(sql,args)=>pool.query(sql,args),connect:()=>pool.connect()},realPostgres:true,async close(){await pool.end();tool('pg_ctl',['-D',data,'-m','fast','-w','-t','15','stop']);rmSync(temporary,{recursive:true,force:true});}};
 }catch(error){await pool?.end();if(started)tool('pg_ctl',['-D',data,'-m','fast','-w','-t','15','stop']);rmSync(temporary,{recursive:true,force:true});throw error;}
}
