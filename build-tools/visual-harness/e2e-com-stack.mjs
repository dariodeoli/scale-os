/*
 * Stack local de QA para la vertical COM (ronda 6, issue #43).
 * Receta (misma que e2e-drag.mjs de OPS):
 *   1) clúster Postgres temporal propio (nunca el de otro slot)
 *   2) API real (backend/server.js) con migraciones al arrancar
 *   3) demo privada sembrada por /api/demo/start + datos extra (>300 órdenes,
 *      presupuestos y oportunidades) para ejercitar la ventana de 300
 *   4) front `next start` y proxy de un solo origen (/core-api → API) para que
 *      el navegador no vea TLS propio
 * Deja la sesión (cookie httpOnly + org) en work/visual-harness/com-qa-session.txt
 * para build-tools/visual-harness/e2e-com-qa.mjs. Puertos y binarios por env.
 *
 * Uso: node build-tools/visual-harness/e2e-com-stack.mjs   (queda corriendo)
 */
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/Cellar/postgresql@17/17.11/bin';
const PG_DIR=process.env.PG_DIR||'/tmp/mobos-e2e-pg-MOS-COM';
const PG_PORT=Number(process.env.PG_PORT||55433);
const API_PORT=Number(process.env.API_PORT||3902);
const FRONT_PORT=Number(process.env.FRONT_PORT||3015);
const PROXY_PORT=Number(process.env.PROXY_PORT||3016);
const WORK_DIR=resolve(here,'../../work/visual-harness');
const WORK_SESSION=resolve(WORK_DIR,process.env.QA_SESSION||'com-qa-session.txt');
const LOG=resolve(WORK_DIR,'com-qa-stack.log');
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

// 3) demo privada (endpoint exige el Origin del sistema) + sesión
let cookie='';
const demoRes=await fetch(`http://127.0.0.1:${API_PORT}/api/demo/start`,{method:'POST',headers:{'content-type':'application/json',origin:'https://sistema.scaleparaguay.com'},body:'{}'});
const setCookie=demoRes.headers.get('set-cookie')||'';
cookie=(setCookie.match(/scale_session=([^;]+)/)||[])[1]||'';
log('demo creada',demoRes.status,'sesión',cookie?'ok':'FALTA');
if(!cookie)throw new Error('sin sesión de demo');

// 4) datos extra: >300 órdenes, más presupuestos y oportunidades
const org=psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
const projects=Number(psql(`select count(*) from agency_projects where organization_id=${org}`));
const orders=Number(psql(`select count(*) from agency_work_orders where organization_id=${org}`));
log(`demo org ${org}: ${projects} proyectos, ${orders} órdenes`);
const missing=Math.max(0,360-orders);
if(missing>0){
 psql(`insert into agency_work_orders(organization_id,project_id,title,description,status,due_date,assigned_user_id,estimated_hours)
  select ${org},p.id,'Pieza de volumen '||g,'Carga de prueba para la ventana de 300.','${'recorded'}'::text,current_date+(g%45)-15,
   (select m.user_id from organization_members m where m.organization_id=${org} and m.active=true order by m.user_id limit 1 offset (g%3)),
   2+(g%6)
  from generate_series(1,${missing}) g
  join lateral (select id from agency_projects where organization_id=${org} order by id limit 1 offset (g%(select count(*) from agency_projects where organization_id=${org}))) p on true`);
 psql(`update agency_work_orders set status=case (id%6) when 0 then 'blocked' when 1 then 'to_record' when 2 then 'recorded' when 3 then 'editing' when 4 then 'review' else 'approved' end where organization_id=${org} and title like 'Pieza de volumen %'`);
 psql(`update agency_work_orders set updated_at=now()-(id%300)*interval '1 minute' where organization_id=${org}`);
}
const budgets=Number(psql(`select count(*) from agency_budgets where organization_id=${org}`));
if(budgets<18)psql(`insert into agency_budgets(organization_id,client_id,number,title,currency,subtotal,total,status,valid_until,notes)
 select ${org},c.id,'QA-2026-'||lpad(c.id::text,4,'0'),'Presupuesto de QA',case when c.id%4=0 then 'USD' else 'PYG' end,case when c.id%4=0 then 1000 else 2500000 end,case when c.id%4=0 then 1100 else 2750000 end,
  (array['draft','sent','accepted','rejected'])[1+(c.id%4)],current_date+10,'Dato de QA (ronda 6).'
 from agency_clients c where c.organization_id=${org}`);
const leads=Number(psql(`select count(*) from agency_leads where organization_id=${org}`));
if(leads<30)psql(`insert into agency_leads(organization_id,name,stage,amount,currency,probability,notes,created_at)
 select ${org},'Oportunidad QA '||g,(select slug from agency_pipeline_stages where organization_id=${org} and active=true order by position offset (g%3) limit 1),(1000000*(1+(g%9))),case when g%5=0 then 'USD' else 'PYG' end,10+(g%9)*10,'Dato de QA (ronda 6).',now()-(g%40)*interval '1 day'
 from generate_series(1,${Math.max(0,34-leads)}) g`);
log(`datos: órdenes ${psql(`select count(*) from agency_work_orders where organization_id=${org}`)}, presupuestos ${psql(`select count(*) from agency_budgets where organization_id=${org}`)}, oportunidades ${psql(`select count(*) from agency_leads where organization_id=${org}`)}`);

// 5) front (build ya hecho) y proxy de un solo origen
const front=spawn('npx',['next','start','-p',String(FRONT_PORT),'-H','127.0.0.1'],{cwd:repo,env:{...process.env,SCALE_API_ORIGIN:`http://127.0.0.1:${API_PORT}`},stdio:['ignore','pipe','pipe']});
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
writeFileSync(resolve(WORK_SESSION),`BASE=http://127.0.0.1:${PROXY_PORT}\nORG=${org}\nSESSION=${cookie}\nDEMO_ROLE=owner\n`);
log(`LISTO: front http://127.0.0.1:${PROXY_PORT} · org ${org} · sesión en work/visual-harness/com-qa-session.txt`);
log('CTRL+C para cortar');
process.on('SIGINT',()=>{proxy.close();front.kill();api.kill();try{execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'stop','-m','fast'],{stdio:'ignore'});}catch{}process.exit(0);});
