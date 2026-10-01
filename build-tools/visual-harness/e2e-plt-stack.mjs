/*
 * Stack local de QA para la vertical PLT (Equipo/Plataforma, QA ola 2 #125).
 * Misma receta que e2e-fin-stack.mjs, con datos de Plataforma:
 *   1) clúster Postgres temporal propio (nunca el de otro slot)
 *   2) API real (backend/server.js) con migraciones al arrancar
 *   3) demo privada + enlaces de invitación, solicitud pendiente y accesos de
 *      administración global; un registro archivado para la Papelera
 *   4) front `next start` y proxy de un solo origen (/core-api → API)
 * Deja la sesión en work/visual-harness/plt-qa2-session.txt (SESSION + OWNER_SESSION).
 *
 * Uso: node build-tools/visual-harness/e2e-plt-stack.mjs   (queda corriendo)
 */
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin';
const PG_DIR=process.env.PG_DIR||'/tmp/plt-qa-pg-SOS-PLT';
const PG_PORT=Number(process.env.PG_PORT||55456);
const API_PORT=Number(process.env.API_PORT||3933);
const FRONT_PORT=Number(process.env.FRONT_PORT||3050);
const PROXY_PORT=Number(process.env.PROXY_PORT||3051);
const WORK_DIR=resolve(here,'../../work/visual-harness');
const WORK_SESSION=resolve(WORK_DIR,process.env.QA_SESSION||'plt-qa2-session.txt');
const LOG=resolve(WORK_DIR,'plt-qa-stack.log');
const log=(...parts)=>{const line=`[${new Date().toISOString()}] ${parts.join(' ')}`;appendFileSync(LOG,line+'\n');console.log(line);};
const psql=(sql)=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

for(const port of [API_PORT,FRONT_PORT,PROXY_PORT]){try{execFileSync('bash',['-c',`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`],{stdio:'ignore'});}catch{}}

if(!existsSync(`${PG_DIR}/PG_VERSION`)){
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

const api=spawn('node',['server.js'],{cwd:resolve(repo,'backend'),detached:false,env:{...process.env,DATABASE_URL:`postgres://postgres@127.0.0.1:${PG_PORT}/scaleos`,PORT:String(API_PORT),PUBLIC_ORIGIN:`http://127.0.0.1:${PROXY_PORT}`,SCALE_CORE_API_DISABLE_LISTEN:'0'},stdio:['ignore','pipe','pipe']});
api.stdout.on('data',d=>appendFileSync(LOG,`[api] ${d}`));api.stderr.on('data',d=>appendFileSync(LOG,`[api:err] ${d}`));
const waitFor=async(fn,{timeout=90000,every=500,label=''}={})=>{const start=Date.now();while(Date.now()-start<timeout){try{const value=await fn();if(value)return value;}catch{}await new Promise(r=>setTimeout(r,every));}throw new Error(`timeout esperando ${label}`);};
const health=await waitFor(async()=>{const res=await fetch(`http://127.0.0.1:${API_PORT}/health`);const data=await res.json().catch(()=>null);return data&&data.database==='ready'?data:null;},{label:'API ready'});
log('API lista:',JSON.stringify(health));

const demoRes=await fetch(`http://127.0.0.1:${API_PORT}/api/demo/start`,{method:'POST',headers:{'content-type':'application/json',origin:'https://sistema.scaleparaguay.com'},body:'{}'});
const setCookie=demoRes.headers.get('set-cookie')||'';
const cookie=(setCookie.match(/scale_session=([^;]+)/)||[])[1]||'';
if(!cookie)throw new Error('sin sesión de demo');
const demoOrg=psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
const demoUser=psql(`select user_id from organization_members where organization_id=${demoOrg} and active order by user_id limit 1`);
log('demo creada',demoRes.status,'org',demoOrg);

// Sesión real del dueño de `scale` (provisionado al arrancar por env).
const ownerEmail=process.env.SCALE_OS_OWNER_EMAIL||'qa-plt@example.invalid';
const ownerPassword=process.env.SCALE_OS_OWNER_PASSWORD||'qa-plt-12345678';
let ownerCookie='';
for(let intento=1;intento<=3&&!ownerCookie;intento++){
 const res=await fetch(`http://127.0.0.1:${API_PORT}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:ownerEmail,password:ownerPassword})});
 ownerCookie=((res.headers.get('set-cookie')||'').match(/scale_session=([^;]+)/)||[])[1]||'';
 if(!ownerCookie)log('login del dueño intento',intento,'HTTP',res.status);
}
if(!ownerCookie)throw new Error('sin sesión del dueño');
const org=psql("select id from organizations where slug='scale'");
const owner=psql(`select m.user_id from organization_members m where m.organization_id=${org} and m.role='owner' and m.active and m.removed_at is null order by m.user_id limit 1`);

// Datos PLT: enlaces, solicitud pendiente, administración global y papelera.
psql(`insert into agency_invite_links(organization_id,role,mode,token_hash,created_by,expires_at,used_at)
 select ${org},'editor','single',md5(random()::text||clock_timestamp()::text),${owner},now()+interval '6 days',now()-interval '2 days'
 where not exists(select 1 from agency_invite_links where organization_id=${org} and mode='single')`);
psql(`insert into agency_invite_links(organization_id,role,mode,token_hash,created_by,expires_at)
 select ${org},'viewer','approval',md5(random()::text||clock_timestamp()::text),${owner},now()+interval '5 days'
 where not exists(select 1 from agency_invite_links where organization_id=${org} and mode='approval')`);
psql(`insert into users(email,password_hash) values('qa-postulante@example.invalid','x') on conflict(email) do nothing`);
psql(`insert into agency_access_requests(link_id,user_id,full_name,status)
 select l.id,u.id,'Postulante QA','pending' from agency_invite_links l, users u
 where l.organization_id=${org} and l.mode='approval' and u.email='qa-postulante@example.invalid'
 and not exists(select 1 from agency_access_requests r where r.link_id=l.id)`);
for(const userId of [owner,demoUser].filter(Boolean)){
 psql(`insert into platform_administrators(user_id,role,active) values(${userId},'admin',true) on conflict(user_id) do update set role='admin',active=true`);
}
// Papelera: un cliente archivado (la fila no se borra; se marca).
const archived=psql(`select id from agency_clients where organization_id=${demoOrg} order by id limit 1`);
if(archived){
 psql(`insert into agency_archived_records(organization_id,kind,record_id,removed_by)
  values(${demoOrg},'clients',${archived},${demoUser}) on conflict do nothing`);
}
log(`PLT: org scale ${org} · dueño ${owner} · demo ${demoOrg}`);

const front=spawn('npx',['next','start','-p',String(FRONT_PORT),'-H','127.0.0.1'],{cwd:repo,env:{...process.env,SCALE_API_ORIGIN:`http://127.0.0.1:${API_PORT}`},stdio:['ignore','pipe','pipe']});
front.stdout.on('data',d=>appendFileSync(LOG,`[front] ${d}`));front.stderr.on('data',d=>appendFileSync(LOG,`[front:err] ${d}`));
await waitFor(async()=>{if(front.exitCode!==null)throw new Error(`el front terminó con código ${front.exitCode}`);const res=await fetch(`http://127.0.0.1:${FRONT_PORT}/status`);return res.ok;},{label:'front'});
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
writeFileSync(WORK_SESSION,`BASE=http://127.0.0.1:${PROXY_PORT}\nORG=${demoOrg}\nSESSION=${cookie}\nDEMO_ROLE=owner\nOWNER_SESSION=${ownerCookie}\n`);
log(`LISTO: front http://127.0.0.1:${PROXY_PORT} · demo ${demoOrg} · sesión en ${WORK_SESSION}`);
log('CTRL+C para cortar');
const stop=()=>{proxy.close();front.kill();api.kill();try{execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'stop','-m','fast'],{stdio:'ignore'});}catch{}process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);
