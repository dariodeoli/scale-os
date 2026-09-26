/*
 * Stack local de QA para la vertical FIN (ronda 16, #70, refs #67).
 * Receta (misma que e2e-com-stack.mjs de COM):
 *   1) clúster Postgres temporal propio (nunca el de otro slot)
 *   2) API real (backend/server.js) con migraciones al arrancar
 *   3) demo privada sembrada por /api/demo/start + datos de estrés FIN
 *      (>20 facturas y >20 cobros para medir las ventanas, transferencias,
 *      descuentos por referido, gastos reales y comisiones en varios estados)
 *   4) front `next start` y proxy de un solo origen (/core-api → API)
 * Deja la sesión en work/visual-harness/fin-qa-session.txt.
 * Puertos y binarios por env.
 *
 * Uso: node build-tools/visual-harness/e2e-fin-stack.mjs   (queda corriendo)
 */
import {execFileSync, spawn} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync, appendFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/Cellar/postgresql@17/17.11/bin';
const PG_DIR=process.env.PG_DIR||'/tmp/mobos-e2e-pg-SOS-FIN';
const PG_PORT=Number(process.env.PG_PORT||55434);
const API_PORT=Number(process.env.API_PORT||3903);
const FRONT_PORT=Number(process.env.FRONT_PORT||3020);
const PROXY_PORT=Number(process.env.PROXY_PORT||3021);
const WORK_DIR=resolve(here,'../../work/visual-harness');
const WORK_SESSION=resolve(WORK_DIR,process.env.QA_SESSION||'fin-qa-session.txt');
const LOG=resolve(WORK_DIR,'fin-qa-stack.log');
const log=(...parts)=>{const line=`[${new Date().toISOString()}] ${parts.join(' ')}`;appendFileSync(LOG,line+'\n');console.log(line);};
const psql=(sql)=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',String(PG_PORT),'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

// Puertos propios del stack: si un intento anterior quedó vivo, se libera antes
// de arrancar (el API de esta corrida todavía no existe en este punto).
for(const port of [API_PORT,FRONT_PORT,PROXY_PORT]){try{execFileSync('bash',['-c',`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`],{stdio:'ignore'});}catch{}}

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
const demoRes=await fetch(`http://127.0.0.1:${API_PORT}/api/demo/start`,{method:'POST',headers:{'content-type':'application/json',origin:'https://sistema.scaleparaguay.com'},body:'{}'});
const setCookie=demoRes.headers.get('set-cookie')||'';
const cookie=(setCookie.match(/scale_session=([^;]+)/)||[])[1]||'';
log('demo creada',demoRes.status,'sesión',cookie?'ok':'FALTA');
if(!cookie)throw new Error('sin sesión de demo');

// 4) datos de estrés FIN: ventanas de facturas/cobros (>20), transferencias,
// descuentos por referido, gastos reales y comisiones en todos los estados.
const org=psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
const userId=psql(`select user_id from organization_members where organization_id=${org} and active order by user_id limit 1`);
const invoices=Number(psql(`select count(*) from agency_invoices where organization_id=${org}`));
if(invoices<28)psql(`insert into agency_invoices(organization_id,client_id,number,total,currency,due_on,notes)
 select ${org},c.id,'QA-FIN-2026-'||lpad(c.id::text,4,'0'),case when c.id%4=0 then 1200 else 3500000 end,case when c.id%4=0 then 'USD' else 'PYG' end,current_date+((c.id%40)-12),'Factura de volumen para QA de la ventana (ronda 16).'
 from agency_clients c where c.organization_id=${org} limit 16`);
const payments=Number(psql(`select count(*) from agency_payments where organization_id=${org} and reference='Cobro de volumen QA'`));
if(payments<20)psql(`insert into agency_payments(organization_id,invoice_id,account_id,amount,received_by_user_id,reference,received_on)
 select ${org},i.id,a.id,case when i.currency='USD' then 600 else 1750000 end,${userId},'Cobro de volumen QA',current_date-((i.id%25)::int)
 from agency_invoices i join lateral (select id from bank_accounts where organization_id=${org} and active and currency=i.currency order by id limit 1) a on true
 where i.organization_id=${org} and i.number like 'QA-FIN-%' and i.notes like 'Factura de volumen%' and i.id not in (select invoice_id from agency_payments) limit 20`);
const transfers=Number(psql(`select count(*) from account_transfers where organization_id=${org}`));
if(transfers<4)psql(`insert into account_transfers(organization_id,from_account_id,to_account_id,amount,reference,created_by_user_id)
 select ${org},a.id,b.id,500000,'Movimiento de caja QA',${userId}
 from bank_accounts a, bank_accounts b
 where a.organization_id=${org} and b.organization_id=${org} and a.name='Caja de oficina' and b.name like 'Banco Continental%' limit 3`);
const discounts=Number(psql(`select count(*) from agency_referral_discounts where organization_id=${org}`));
if(discounts<3)psql(`insert into agency_referral_discounts(organization_id,invoice_id,referrer,amount,reason,created_by_user_id)
 select ${org},i.id,case (i.id%3) when 0 then 'Estudio Contable Ramírez' when 1 then 'María González' else 'Colega de la industria' end,case when i.currency='USD' then 50 else 150000 end,'Recomendación directa de un cliente. Datos de QA (ronda 16).',${userId}
 from agency_invoices i where i.organization_id=${org} and i.id not in (select invoice_id from agency_referral_discounts) order by i.id desc limit 3`);
const expenses=Number(psql(`select count(*) from agency_expenses where organization_id=${org}`));
if(expenses<2)psql(`insert into agency_expenses(organization_id,account_id,category,kind,amount,currency,paid_on,reference,created_by_user_id)
 select ${org},a.id,case when g=1 then 'Herramientas' else 'Marketing' end,'variable',case when g=1 then 350000 else 900000 end,a.currency,current_date-(g*2),'Gasto real QA '||g,${userId}
 from generate_series(1,2) g join lateral (select id,currency from bank_accounts where organization_id=${org} and active and currency='PYG' order by id limit 1) a on true`);
const commissions=Number(psql(`select count(*) from agency_commissions where organization_id=${org}`));
if(commissions<4)psql(`insert into agency_commissions(organization_id,collaborator_id,kind,beneficiary_name,amount,currency,status,due_on)
 select ${org},c.id,'sales',c.full_name||' · QA',case when g%2=0 then 150000 else 320 end,case when g%2=0 then 'PYG' else 'USD' end,(array['pending','approved','paid'])[1+(g%3)],current_date+5-g
 from generate_series(1,3) g join lateral (select id,full_name from agency_collaborators where organization_id=${org} order by id limit 1 offset (g%3)) c on true`);
log(`datos FIN: ${psql(`select count(*) from agency_invoices where organization_id=${org}`)} facturas · ${psql(`select count(*) from agency_payments where organization_id=${org}`)} cobros · ${psql(`select count(*) from account_transfers where organization_id=${org}`)} transferencias · ${psql(`select count(*) from agency_referral_discounts where organization_id=${org}`)} descuentos · ${psql(`select count(*) from agency_expenses where organization_id=${org}`)} gastos · ${psql(`select count(*) from agency_commissions where organization_id=${org}`)} comisiones`);

// 5) front (build ya hecho) y proxy de un solo origen.
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
writeFileSync(WORK_SESSION,`BASE=http://127.0.0.1:${PROXY_PORT}\nORG=${org}\nSESSION=${cookie}\nDEMO_ROLE=owner\n`);
log(`LISTO: front http://127.0.0.1:${PROXY_PORT} · org ${org} · sesión en ${WORK_SESSION}`);
log('CTRL+C para cortar');
process.on('SIGINT',()=>{proxy.close();front.kill();api.kill();try{execFileSync(`${PG_BIN}/pg_ctl`,['-D',PG_DIR,'stop','-m','fast'],{stdio:'ignore'});}catch{}process.exit(0);});
