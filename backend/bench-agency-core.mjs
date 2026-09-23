// Benchmark opt-in de las listas más pesadas del panel (work-orders, projects e
// inventario). Levanta un PostgreSQL temporal, carga schema + migraciones y
// mide el handler real con una semilla comparable a una agencia grande.
//
//   npm run bench:agency
//
// Requiere `initdb`/`pg_ctl` (igual que `npm run test:postgres`; ver
// POSTGRES-CONCURRENCY.md). No corre en `test:release` ni en CI.
import {execFileSync} from 'node:child_process';
import {existsSync,mkdtempSync,readFileSync,realpathSync,rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {agencyCore} from './agency-core.js';
import {inventoryReservations} from './inventory-reservations.js';
import {migrationOrder} from './scripts/migration-order.mjs';

for(const name of Object.keys(process.env))if(name.startsWith('PG')||name==='DATABASE_URL')delete process.env[name];
const repo=path.dirname(fileURLToPath(import.meta.url));
// Binarios de PostgreSQL: `SCALE_TEST_PG_BIN` manda; si no, el `initdb`/`pg_ctl`
// del PATH (Homebrew los enlaza) y, como respaldo, el keg de postgresql@16/17.
function resolvePgBin(){
 const candidates=[...String(process.env.PATH||'').split(path.delimiter).filter(Boolean),'/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin','/usr/local/opt/postgresql@17/bin','/usr/local/opt/postgresql@16/bin','/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin'];
 return candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')))||'/opt/homebrew/opt/postgresql@16/bin';
}
const bin=process.env.SCALE_TEST_PG_BIN?path.resolve(process.env.SCALE_TEST_PG_BIN):resolvePgBin();
const port=55444,user='scale_bench_fixture';
const localEnv={PATH:`${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const pgTool=(name,args,timeout=60000)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout,maxBuffer:8*1024*1024});

const temporary=realpathSync(mkdtempSync('/tmp/scale-bench-pg-')),data=path.join(temporary,'data');
let pool=null;
function cleanup(){
 try{pgTool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);}catch{}
 try{rmSync(temporary,{recursive:true,force:true});}catch{}
}
process.on('exit',cleanup);process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));

try{
 pgTool('initdb',['-D',data,`--username=${user}`,'--auth-local=trust','--auth-host=reject','--encoding=UTF8','--locale=C']);
 pgTool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses='' -c unix_socket_directories='${temporary}' -c unix_socket_permissions=0700 -c port=${port} -c max_connections=20 -c timezone=UTC`,'-w','-t','20','start']);
 pool=new pg.Pool({host:temporary,port,user,database:'postgres',max:6});
 const q=(sql,args)=>pool.query(sql,args);
 await q(readFileSync(path.join(repo,'schema.sql'),'utf8'));
 for(const name of migrationOrder)await q(readFileSync(path.join(repo,'migrations',name),'utf8'));
 console.log(`PostgreSQL: ${(await q('select version()')).rows[0].version.split(',')[0]} · migraciones: ${migrationOrder.length}`);

 // Semilla fija: 400 clientes · 500 proyectos · 12.000 órdenes · 8.000 asignaciones
 // de orden · 3.000 de proyecto · 24.000 ítems de checklist · 2.000 equipos.
 await q("insert into organizations(id,slug,name) values(7,'bench','Bench Agency')");
 const userIds=(await q("insert into users(email,password_hash) select 'bench'||n||'@example.invalid','x' from generate_series(1,40) n returning id")).rows.map(r=>Number(r.id));
 await q("insert into organization_members(organization_id,user_id,role) select 7,id,'collaborator' from users where email like 'bench%@example.invalid'");
 const clientIds=(await q("insert into agency_clients(organization_id,name,email) select 7,'Cliente '||n,'cliente'||n||'@example.invalid' from generate_series(1,400) n returning id")).rows.map(r=>Number(r.id));
 await q(`insert into agency_projects(organization_id,client_id,name,status,assigned_user_id) select 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],'Proyecto '||n,case when n%9=0 then 'completed' when n%7=0 then 'paused' else 'active' end,case when n%3=0 then ($2::bigint[])[1+(n % array_length($2::bigint[],1))] end from generate_series(1,500) n`,[clientIds,userIds]);
 const projectIds=(await q('select id from agency_projects where organization_id=7')).rows.map(r=>Number(r.id));
 await q(`insert into agency_work_orders(organization_id,project_id,title,description,status,assigned_user_id,due_date,updated_at) select 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],'Orden '||n,repeat('Descripción operativa con detalle de producción. ',5),(array['blocked','to_record','recorded','editing','review','approved','published'])[1+(n%7)],case when n%4=0 then ($2::bigint[])[1+(n % array_length($2::bigint[],1))] end,current_date + (n%30),now() - (n||' minutes')::interval from generate_series(1,12000) n`,[projectIds,userIds]);
 const orderIds=(await q('select id from agency_work_orders where organization_id=7')).rows.map(r=>Number(r.id));
 await q(`insert into agency_project_assignees(organization_id,project_id,user_id) select distinct 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],($2::bigint[])[1+((n*7) % array_length($2::bigint[],1))] from generate_series(1,3000) n on conflict do nothing`,[projectIds,userIds]);
 await q(`insert into agency_work_order_assignees(organization_id,work_order_id,user_id) select distinct 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],($2::bigint[])[1+((n*5) % array_length($2::bigint[],1))] from generate_series(1,8000) n on conflict do nothing`,[orderIds,userIds]);
 await q('insert into agency_work_checklists(organization_id,work_order_id) select 7,id from agency_work_orders');
 await q(`insert into agency_work_checklist_items(organization_id,work_order_id,text,completed,created_by_user_id) select 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],'Paso '||n,(n%3=0),($2::bigint[])[1+(n % array_length($2::bigint[],1))] from generate_series(1,24000) n`,[orderIds,userIds]);
 await q(`insert into agency_inventory(organization_id,name,serial_number,status,value,currency) select 7,'Equipo '||n,'SN'||lpad(n::text,6,'0'),(array['available','available','in_use','maintenance'])[1+(n%4)],1000+n,'PYG' from generate_series(1,2000) n`);
 const inventoryIds=(await q('select id from agency_inventory where organization_id=7 order by id')).rows.map(r=>Number(r.id));
 const reservations=await q(`insert into agency_inventory_reservations(organization_id,project_id,title,starts_at,ends_at,status,created_by_user_id,return_user_id) select 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],'Reserva '||n,now() - (n||' hours')::interval,now() + ((n%72)||' hours')::interval,'reserved',($2::bigint[])[1+(n % array_length($2::bigint[],1))],($2::bigint[])[1+(n % array_length($2::bigint[],1))] from generate_series(1,1000) n returning id`,[projectIds,userIds]);
 await q(`insert into agency_inventory_reservation_items(organization_id,reservation_id,inventory_id,starts_at,ends_at,status) select distinct 7,($1::bigint[])[1+(n % array_length($1::bigint[],1))],($2::bigint[])[1+(n % array_length($2::bigint[],1))],now() - (n||' hours')::interval,now() + ((n%72)||' hours')::interval,'checked_out' from generate_series(1,300) n on conflict do nothing`,[reservations.rows.map(r=>Number(r.id)),inventoryIds]);
 await q(`insert into agency_archived_records(organization_id,kind,record_id) select 7,'work-orders',id from agency_work_orders where id % 250 = 0`);
 for(const table of ['agency_work_orders','agency_projects','agency_clients','agency_project_assignees','agency_work_order_assignees','agency_work_checklist_items','agency_inventory'])await q(`analyze ${table}`);
 console.log('Semilla: 400 clientes · 500 proyectos · 12.000 órdenes · 24.000 checklist · 2.000 equipos');

 const session=async()=>({id:userIds[0],email:'bench1@example.invalid',organization_id:7,role:'owner',organization_name:'Bench Agency'});
 const coreArgs=pathname=>({req:{method:'GET',socket:{}},res:{},url:new URL(`https://bench.invalid${pathname}`),db:pool,session,body:async()=>({}),cookie:()=>'',parseCookies:()=>({}),id:()=>'',requestSubscription:async()=>null,sendInvitation:async()=>false,sendTrialEmail:async()=>false,auditContext:async()=>{},auditedQuery:async()=>{throw new Error('no aplica')}});
 async function timed(label,run,samples=4){
  await run();const times=[];
  for(let i=0;i<samples;i++){const started=performance.now();await run();times.push(performance.now()-started);}
  times.sort((a,b)=>a-b);
  console.log(`${label}: mediana ${times[Math.floor(samples/2)].toFixed(0)} ms (min ${times[0].toFixed(0)} / max ${times[samples-1].toFixed(0)})`);
 }
 // Proyección recomendada para pickers/tarjetas: sin descripción completa ni enlaces.
 const PROJECTED_FIELDS='id,title,status,project_id,project_name,client_name,urgency,work_type,due_date,due_time,updated_at,effective_assignees,assignee_source,description_preview';
 let listResponse,pageResponse,leanResponse,projectsResponse,inventoryResponse;
 await timed('GET /api/agency/work-orders',async()=>{listResponse=null;await agencyCore({...coreArgs('/api/agency/work-orders'),send:(_,status,data)=>{listResponse=data;}});});
 await timed('GET /api/agency/work-orders?limit=300',async()=>{pageResponse=null;await agencyCore({...coreArgs('/api/agency/work-orders?limit=300'),send:(_,status,data)=>{pageResponse=data;}});});
 await timed('GET /api/agency/work-orders?fields=<preset>',async()=>{leanResponse=null;await agencyCore({...coreArgs(`/api/agency/work-orders?fields=${PROJECTED_FIELDS}`),send:(_,status,data)=>{leanResponse=data;}});});
 await timed('GET /api/agency/projects',async()=>{projectsResponse=null;await agencyCore({...coreArgs('/api/agency/projects'),send:(_,status,data)=>{projectsResponse=data;}});});
 await timed('GET /api/agency/inventory',async()=>{inventoryResponse=null;await inventoryReservations({req:{method:'GET',socket:{}},res:{},url:new URL('https://bench.invalid/api/agency/inventory'),db:pool,session,body:async()=>({}),send:(_,status,data)=>{inventoryResponse=data;}});});
 const size=value=>(JSON.stringify(value||{}).length/1024).toFixed(0);
 console.log(`Payload work-orders: ${listResponse.workOrders.length} filas · ${size(listResponse)} KB`);
 console.log(`Payload work-orders?limit=300: ${pageResponse.workOrders.length} filas · ${size(pageResponse)} KB · page ${JSON.stringify(pageResponse.page)}`);
 console.log(`Payload work-orders?fields=<preset>: ${leanResponse.workOrders.length} filas · ${size(leanResponse)} KB`);
 console.log(`Payload projects: ${projectsResponse.projects.length} filas · ${size(projectsResponse)} KB`);
 console.log(`Payload inventario: ${(inventoryResponse?.records||[]).length} filas · ${size(inventoryResponse)} KB`);
}finally{try{await pool?.end();}catch{}cleanup();}
