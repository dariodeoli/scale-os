/*
 * Stack local de QA para la vertical OPS (ola 2, issue #123).
 * Receta (misma que e2e-drag.mjs / e2e-com-stack.mjs):
 *   1) clúster Postgres temporal propio (nunca el de otro slot)
 *   2) API real (backend/server.js) con migraciones al arrancar
 *   3) demo privada sembrada por /api/demo/start (org descartable)
 *   4) sesiones fijas: `measure-token` (owner) y `viewer-token` (viewer),
 *      para correr e2e-drag.mjs y qa-ola2-ops.mjs sin login.
 *   5) front `next start` y proxy de un solo origen (/core-api → API)
 * Deja BASE/ORG/SESSION en work/visual-harness/ops-qa-session.txt.
 * Puertos por defecto de la receta OPS: API 3901 · front 3005 · proxy 3006.
 *
 * Uso: node build-tools/visual-harness/e2e-ops-stack.mjs   (queda corriendo)
 */
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/Cellar/postgresql@17/17.11/bin';
const PG_DIR=process.env.PG_DIR||'/tmp/mobos-e2e-pg-MOS-OPS';
const PG_PORT=Number(process.env.PG_PORT||55432);
const API_PORT=Number(process.env.API_PORT||3901);
const FRONT_PORT=Number(process.env.FRONT_PORT||3005);
const PROXY_PORT=Number(process.env.PROXY_PORT||3006);
const WORK_DIR=resolve(here,'../../work/visual-harness');
const WORK_SESSION=resolve(WORK_DIR,process.env.QA_SESSION||'ops-qa-session.txt');
const LOG=resolve(WORK_DIR,'ops-qa-stack.log');
const log=(...parts)=>{const line=`[${new Date().toISOString()}] ${parts.join(' ')}`;appendFileSync(LOG,line+'\n');console.log(line);};
const psql=(sql)=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

// 1) clúster
if(!existsSync(PG_DIR)){
 mkdirSync(PG_DIR,{recursive:true});
 execFileSync(`${PG_BIN}/initdb`,['-D',PG_DIR,'-U','postgres','--auth=trust'],{stdio:'ignore'});
 log('initdb listo en',PG_DIR);
}
let running=false;
try{execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'status'],{stdio:'ignore'});running=true;}catch{running=false;}
if(!running){
 execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'-l',`${PG_DIR}/pg.log`,'-o',`-p ${PG_PORT} -h 127.0.0.1`,'start'],{stdio:'ignore'});
 log('postgres en',PG_PORT);
}
try{psql('select 1');}catch{execFileSync(`${PG_BIN}/createdb`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','scaleos']);log('base scaleos creada');}

// 2) API
const api=spawn('node',['server.js'],{cwd:resolve(repo,'backend'),detached:false,env:{...process.env,DATABASE_URL:`postgres://postgres@127.0.0.1:${PG_PORT}/scaleos`,PORT:String(API_PORT),PUBLIC_ORIGIN:`http://127.0.0.1:${PROXY_PORT}`,SCALE_CORE_API_DISABLE_LISTEN:'0'},stdio:['ignore','pipe','pipe']});
api.stdout.on('data',d=>appendFileSync(LOG,`[api] ${d}`));api.stderr.on('data',d=>appendFileSync(LOG,`[api:err] ${d}`));
const waitFor=async(fn,{timeout=90000,every=500,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{const value=await fn();if(value)return value;}catch{}await new Promise(r=>setTimeout(r,every));}throw new Error(`timeout esperando ${label}`);};
const health=await waitFor(async()=>{const res=await fetch(`http://127.0.0.1:${API_PORT}/health`);const data=await res.json().catch(()=>null);return data&&data.database==='ready'?data:null;},{label:'API ready'});
log('API lista:',JSON.stringify(health));

// 3) demo privada + sesiones fijas
const demoRes=await fetch(`http://127.0.0.1:${API_PORT}/api/demo/start`,{method:'POST',headers:{'content-type':'application/json',origin:'https://sistema.scaleparaguay.com'},body:'{}'});
const setCookie=demoRes.headers.get('set-cookie')||'';
const cookie=(setCookie.match(/scale_session=([^;]+)/)||[])[1]||'';
if(!cookie)throw new Error('sin sesión de demo');
const org=psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
psql(`delete from sessions where id='measure-token'`);
psql(`update sessions set id='measure-token' where id=${`'${cookie}'`}`);
psql(`update sessions set expires_at=now()+interval '7 days' where id='measure-token'`);
log(`demo creada (${demoRes.status}) org ${org}; sesión owner → measure-token`);

// Viewer: misma cuenta del dueño demo con `demo_role='viewer'` (el modo «ver como»
// del propio shell); así el QA de permisos corre dentro de una única organización demo.
psql(`delete from sessions where id='viewer-token'`);
psql(`insert into sessions(id,user_id,organization_id,expires_at,demo_role) select 'viewer-token',user_id,organization_id,now()+interval '7 days','viewer' from sessions where id='measure-token'`);
log('sesión viewer lista');

// 4) datos base del QA (los formularios/estados vacíos se ejercitan desde la UI):
//    el demo trae clientes/proyectos/piezas, inventario y 2 reservas planificadas.
const counts=psql("select (select count(*) from agency_projects where organization_id="+org+")||' proyectos · '||(select count(*) from agency_work_orders where organization_id="+org+")||' piezas · '||(select count(*) from agency_inventory where organization_id="+org+")||' equipos · '||(select count(*) from agency_studio_spaces where organization_id="+org+")||' espacios'");
log('datos demo:',counts);

// 5) front standalone (el build usa `output: standalone`) y proxy de un solo origen
execFileSync('cp',['-r','.next/static','.next/standalone/.next/'],{cwd:repo,stdio:'ignore'});
if(!existsSync(resolve(repo,'.next/standalone/public')))execFileSync('cp',['-r','public','.next/standalone/'],{cwd:repo,stdio:'ignore'});
const front=spawn('node',['.next/standalone/server.js'],{cwd:repo,env:{...process.env,PORT:String(FRONT_PORT),HOSTNAME:'127.0.0.1',SCALE_API_ORIGIN:`http://127.0.0.1:${API_PORT}`},stdio:['ignore','pipe','pipe']});
front.stdout.on('data',d=>appendFileSync(LOG,`[front] ${d}`));front.stderr.on('data',d=>appendFileSync(LOG,`[front:err] ${d}`));
await waitFor(async()=>{const res=await fetch(`http://127.0.0.1:${FRONT_PORT}/status`);return res.ok;},{label:'front'});
const proxy=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const target=url.pathname.startsWith('/core-api/')?`http://127.0.0.1:${API_PORT}${url.pathname.replace('/core-api','')}${url.search}`:`http://127.0.0.1:${FRONT_PORT}${req.url}`;
  const body=req.method==='GET'||req.method==='HEAD'?undefined:await new Promise(r=>{const chunks=[];req.on('data',c=>chunks.push(c));req.on('end',()=>r(Buffer.concat(chunks)));});
  const upstream=await fetch(target,{method:req.method,headers:{...req.headers,host:undefined},body,redirect:'manual'});
  const headers={};upstream.headers.forEach((value,key)=>{if(!['content-encoding','transfer-encoding','content-length'].includes(key))headers[key]=value;});
  res.writeHead(upstream.status,headers);
  res.end(Buffer.from(await upstream.arrayBuffer()));
 }catch(error){res.writeHead(502,{'content-type':'text/plain'});res.end(`proxy: ${error.message}`);}
});
await new Promise(r=>proxy.listen(PROXY_PORT,'127.0.0.1',r));
mkdirSync(WORK_DIR,{recursive:true});
writeFileSync(WORK_SESSION,`BASE=http://127.0.0.1:${PROXY_PORT}\nORG=${org}\nSESSION=${cookie}\nOWNER_TOKEN=measure-token\nVIEWER_TOKEN=viewer-token\n`);
log(`LISTO: http://127.0.0.1:${PROXY_PORT} · org ${org} · sesiones en ${WORK_SESSION}`);
log('CTRL+C para cortar');
process.on('SIGINT',()=>{proxy.close();front.kill();api.kill();try{execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'stop','-m','fast'],{stdio:'ignore'});}catch{}process.exit(0);});
