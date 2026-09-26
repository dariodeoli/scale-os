#!/usr/bin/env node
// Benchmark opt-in de carga por página (#67). Levanta un PostgreSQL temporal,
// arranca `server.js` real (router + compresión + sesión), siembra una agencia
// grande con la MISMA semilla en cada corrida y mide, por página del panel, cada
// llamada que hace el front: TTFB (primer byte), ms totales, KB (JSON real y
// bytes de red) y codificación; además el "wall" de la carga en paralelo.
//
// Cada candidato imprime filas, ids y forma del payload (deterministas con la
// misma semilla) más un hash del cuerpo: sirven para verificar estabilidad entre
// versiones. Con `--verify` además corre los chequeos de contrato de las listas
// (`?fields=`/`?limit=`) y del filtro `due` de Resumen (#73).
//
//   npm run bench:pages                 # todas las páginas
//   npm run bench:pages -- --json       # además imprime el JSON crudo
//   npm run bench:pages -- --verify     # contrato + estabilidad de listas
//   npm run bench:pages -- --pages Resumen,Equipo --samples 5
//
// Requiere `initdb`/`pg_ctl` (igual que `npm run test:postgres`; ver
// POSTGRES-CONCURRENCY.md). No corre en `test:release` ni en CI.
import {execFileSync,spawn} from 'node:child_process';
import crypto from 'node:crypto';
import {existsSync,mkdtempSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';

const repo=path.dirname(fileURLToPath(import.meta.url));
const wantJson=process.argv.includes('--json');
const keepCluster=process.argv.includes('--keep');
const verifyMode=process.argv.includes('--verify');
const sampleCount=(()=>{const i=process.argv.indexOf('--samples');return i>=0&&process.argv[i+1]?Math.max(1,Number(process.argv[i+1])):5;})();
const pageFilter=(()=>{const i=process.argv.indexOf('--pages');return i>=0&&process.argv[i+1]?process.argv[i+1].split(',').map(v=>v.trim()):null;})();

/* ---------------------------------------------------------------- postgres */
function resolvePgBin(){
 const candidates=[...String(process.env.PATH||'').split(path.delimiter).filter(Boolean),'/opt/homebrew/opt/postgresql@17/bin','/opt/homebrew/opt/postgresql@16/bin','/usr/local/opt/postgresql@17/bin','/usr/local/opt/postgresql@16/bin','/usr/lib/postgresql/17/bin','/usr/lib/postgresql/16/bin'];
 return candidates.find(dir=>existsSync(path.join(dir,'initdb'))&&existsSync(path.join(dir,'pg_ctl')))||'/opt/homebrew/opt/postgresql@16/bin';
}
const bin=process.env.SCALE_TEST_PG_BIN?path.resolve(process.env.SCALE_TEST_PG_BIN):resolvePgBin();
const pgPort=55446,pgUser='scale_bench_pages';
const localEnv={PATH:`${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,LANG:'C',LC_ALL:'C',TZ:'UTC'};
const pgTool=(name,args,timeout=90000)=>execFileSync(path.join(bin,name),args,{env:localEnv,encoding:'utf8',timeout,maxBuffer:16*1024*1024});

const temporary=realpathSync(mkdtempSync('/tmp/scale-bench-pages-')),data=path.join(temporary,'data');
let pool=null,server=null,cleaned=false;
function cleanup(){
 if(cleaned)return;cleaned=true;
 if(keepCluster){console.log(`\n--keep: PostgreSQL en ${temporary} (puerto ${pgPort}) · API en http://127.0.0.1:${process.env.BENCH_PORT||3010}`);return;}
 try{server?.kill('SIGKILL');}catch{}
 try{pgTool('pg_ctl',['-D',data,'stop','-m','immediate','-w','-t','10']);}catch{}
 try{rmSync(temporary,{recursive:true,force:true});}catch{}
}
process.on('exit',cleanup);process.once('SIGINT',()=>process.exit(130));process.once('SIGTERM',()=>process.exit(143));

/* ------------------------------------------------------------------- seed */
const ORG=7;
async function seed(q){
 await q("insert into organizations(id,slug,name) values($1::bigint,'bench-pages','Bench Pages Agency')",[ORG]);
 await q("insert into agency_settings(organization_id,default_currency,onboarding_completed) values($1::bigint,'PYG',true)",[ORG]);
 const userIds=(await q("insert into users(email,password_hash,email_verified_at,role) select 'bench'||n||'@example.invalid','x',now(),'collaborator' from generate_series(1,40) n returning id")).rows.map(r=>Number(r.id));
 await q(`insert into user_personal_identities(user_id,full_name,photo_url) select id,'Persona Bench '||id,null from users where email like 'bench%@example.invalid'`);
 await q("insert into organization_members(organization_id,user_id,role) select $1::bigint,id,'collaborator' from users where email like 'bench%@example.invalid'",[ORG]);
 await q("update organization_members set role='owner' where organization_id=$1::bigint and user_id=$2",[ORG,userIds[0]]);
 const clientIds=(await q("insert into agency_clients(organization_id,name,email,tax_id,legal_name,lifecycle_status) select $1::bigint,'Cliente '||n,'cliente'||n||'@example.invalid',lpad(n::text,8,'0')||'-1','Cliente '||n||' S.A.','active' from generate_series(1,400) n returning id",[ORG])).rows.map(r=>Number(r.id));
 await q(`insert into agency_client_reporting_events(organization_id,client_id,event_at,event_kind,active,lifecycle_status,archived,customer_kind,service_plan_id,service_plan_name,relationship_started_on)
  select $1::bigint,c.id,now()-(n||' days')::interval,'observed',true,'active',false,'company',null,null,current_date-n from agency_clients c cross join lateral generate_series(1,3) n where c.organization_id=$1::bigint`,[ORG]);
 await q("insert into agency_reporting_coverage(organization_id,history_since) values($1::bigint,now()-interval '400 days')",[ORG]);
 await q(`insert into agency_client_commercial_terms(organization_id,client_id,activation_date,starts_on,effective_from,plan_name,plan_version,monthly_price,currency,discount_type,discount_value,recurring_amount,cadence,invoice_required,commission_mode)
  select $1::bigint,id,current_date-30,current_date-30,current_date-30,'Plan '||(n%4),'v'||(1+(n%3)),case when n between 10 and 39 then 450 else (1200000+(n%9)*350000) end,case when n between 10 and 39 then 'USD' else 'PYG' end,case when n between 10 and 39 then 'percent' else 'none' end,case when n between 10 and 39 then 10 else 0 end,case when n between 10 and 39 then 405 else (1200000+(n%9)*350000) end,'monthly',true,'none' from (select id,row_number() over(order by id) n from agency_clients where organization_id=$1::bigint) t`, [ORG]);
 const projectIds=(await q(`insert into agency_projects(organization_id,client_id,name,status,assigned_user_id) select $1::bigint,c.id,'Proyecto '||c.id,case when c.id%9=0 then 'completed' when c.id%7=0 then 'paused' else 'active' end,case when c.id%3=0 then ($2::bigint[])[1+(c.id % array_length($2::bigint[],1))] end from agency_clients c where c.organization_id=$1::bigint returning id`,[ORG,userIds])).rows.map(r=>Number(r.id));
 await q(`insert into agency_project_assignees(organization_id,project_id,user_id) select distinct $1::bigint,p.id,($2::bigint[])[1+((p.id*7) % array_length($2::bigint[],1))] from agency_projects p where p.organization_id=$1::bigint`,[ORG,userIds]);
 const orderIds=(await q(`insert into agency_work_orders(organization_id,project_id,title,description,status,assigned_user_id,due_date,due_time,urgency,work_type,updated_at)
  select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],'Orden '||n,repeat('Descripción operativa con detalle de producción. ',5),
   (array['blocked','to_record','recorded','editing','review','approved','published'])[1+(n%7)],
   case when n%4=0 then ($3::bigint[])[1+(n % array_length($3::bigint[],1))] end,
   current_date + (n%30),'18:30',((n%5)+1), (array['video','reedicion','foto','produccion','entregable'])[1+(n%5)],
   now() - (n||' minutes')::interval
  from generate_series(1,12000) n returning id`,[ORG,projectIds,userIds])).rows.map(r=>Number(r.id));
 await q(`insert into agency_work_order_assignees(organization_id,work_order_id,user_id) select distinct $1::bigint,o.id,($2::bigint[])[1+((o.id*5) % array_length($2::bigint[],1))] from agency_work_orders o where o.organization_id=$1::bigint`,[ORG,userIds]);
 await q('insert into agency_work_checklists(organization_id,work_order_id) select $1::bigint,id from agency_work_orders where organization_id=$1::bigint',[ORG]);
 await q(`insert into agency_work_checklist_items(organization_id,work_order_id,text,completed,created_by_user_id) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],'Paso '||n,(n%3=0),($3::bigint[])[1+(n % array_length($3::bigint[],1))] from generate_series(1,24000) n`,[ORG,orderIds,userIds]);
 await q(`insert into agency_archived_records(organization_id,kind,record_id) select $1::bigint,'work-orders',id from agency_work_orders where organization_id=$1::bigint and id % 250 = 0`,[ORG]);
 await q(`insert into agency_inventory(organization_id,name,serial_number,inventory_code,category,value,currency,status,photo_url) select $1::bigint,'Equipo '||n,'SN'||lpad(n::text,6,'0'),'EQ-'||lpad(n::text,5,'0'),(array['Cámara','Lente','Audio','Iluminación','Computación','Accesorio','Otro'])[1+(n%7)],1000+n,'PYG',(array['available','available','in_use','maintenance'])[1+(n%4)],case when n%10=0 then 'data:image/webp;base64,'||repeat('A',184320) end from generate_series(1,2000) n`,[ORG]);
 await q(`insert into agency_inventory_categories(organization_id,name) select $1::bigint,v.name from (values('Cámara'),('Lente'),('Audio'),('Iluminación'),('Computación'),('Accesorio'),('Otro')) v(name)`,[ORG]);
 await q("update agency_inventory i set category_id=c.id from agency_inventory_categories c where c.organization_id=i.organization_id and c.name=i.category");
 await q(`insert into agency_inventory_storage_locations(organization_id,name) select $1::bigint,'Estante '||n from generate_series(1,12) n`,[ORG]);
 const inventoryIds=(await q('select id from agency_inventory where organization_id=$1::bigint order by id',[ORG])).rows.map(r=>Number(r.id));
 const reservationIds=(await q(`insert into agency_inventory_reservations(organization_id,project_id,title,starts_at,ends_at,status,created_by_user_id,return_user_id) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],'Reserva '||n,now() - (n||' hours')::interval,now() + ((n%72)||' hours')::interval,'reserved',($3::bigint[])[1+(n % array_length($3::bigint[],1))],($3::bigint[])[1+(n % array_length($3::bigint[],1))] from generate_series(1,1000) n returning id`,[ORG,projectIds,userIds])).rows.map(r=>Number(r.id));
 await q(`insert into agency_inventory_reservation_items(organization_id,reservation_id,inventory_id,starts_at,ends_at,status) select $1::bigint,($2::bigint[])[n],($3::bigint[])[(n-1)*2+k],now() - (n||' hours')::interval,now() + ((n%72)||' hours')::interval,'checked_out' from generate_series(1,1000) n cross join generate_series(1,2) k`,[ORG,reservationIds,inventoryIds]);
 const budgetIds=(await q(`insert into agency_budgets(organization_id,client_id,number,title,currency,subtotal,total,status,valid_until,public_token,created_at) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],'P-2026-'||lpad(n::text,4,'0'),'Presupuesto '||n,'PYG',1500000,1650000,(array['draft','sent','accepted','rejected'])[1+(n%4)],current_date+15,md5(n::text),now()-(n||' hours')::interval from generate_series(1,300) n returning id`,[ORG,clientIds])).rows.map(r=>Number(r.id));
 await q(`insert into agency_budget_items(budget_id,position,description,quantity,unit_price,total) select budget_id,position,'Ítem '||budget_id||'-'||position,2,750000,1500000 from (select ($1::bigint[])[1+(n % array_length($1::bigint[],1))] as budget_id,row_number() over (partition by (n % array_length($1::bigint[],1)) order by n) as position from generate_series(1,1200) n) t`,[budgetIds]);
 await q(`insert into agency_pipeline_stages(organization_id,slug,label,position,kind) select $1::bigint,v.slug,v.label,v.position,v.kind from (values('lead','Lead',0,'open'),('contacted','Contactado',1,'open'),('proposal','Propuesta',2,'open'),('negotiation','Negociación',3,'open'),('won','Ganado',4,'won'),('lost','Perdido',5,'lost')) v(slug,label,position,kind)`,[ORG]);
 await q(`insert into agency_leads(organization_id,name,email,phone,stage,amount,currency,probability,notes,client_id,created_at) select $1::bigint,'Oportunidad '||n,'lead'||n||'@example.invalid','+595981000'||lpad((n%1000)::text,3,'0'),(array['lead','contacted','proposal','negotiation','won','lost'])[1+(n%6)],2500000+(n%20)*100000,'PYG',(n%10)*10,repeat('Nota comercial. ',3),case when n%5=0 then ($2::bigint[])[1+(n % array_length($2::bigint[],1))] end,now()-(n||' hours')::interval from generate_series(1,500) n`,[ORG,clientIds]);
 const accountIds=(await q(`insert into bank_accounts(organization_id,name,account_type,currency,balance) select $1::bigint,'Cuenta '||n,(array['bank','cash','digital','investment'])[1+(n%4)],(array['PYG','USD'])[1+(n%2)],1000000+n from generate_series(1,8) n returning id`,[ORG])).rows.map(r=>Number(r.id));
 await q(`insert into agency_invoices(organization_id,client_id,number,total,paid_amount,currency,status,issued_on,due_on,created_at) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],'F-2026-'||lpad(n::text,5,'0'),3200000,(case when n%3=0 then 3200000 when n%3=1 then 1200000 else 0 end),(array['PYG','PYG','USD'])[1+(n%3)],(array['issued','partial','paid','overdue'])[1+(n%4)],(current_date-(n%700))::date,(current_date-(n%700)+30)::date,now()-(n||' hours')::interval from generate_series(1,2000) n returning id`,[ORG,clientIds]);
 await q(`insert into agency_payments(organization_id,account_id,invoice_id,amount,received_on,reference) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],($3::bigint[])[1+(n % array_length($3::bigint[],1))],1200000,(current_date-(n%400))::date,'Ref '||n from generate_series(1,1500) n`,[ORG,accountIds,(await q('select id from agency_invoices where organization_id=$1::bigint',[ORG])).rows.map(r=>Number(r.id))]);
 await q(`insert into account_transfers(organization_id,from_account_id,to_account_id,amount,transferred_on,reference,created_by_user_id) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],($2::bigint[])[1+((n+1) % array_length($2::bigint[],1))],500000,(current_date-(n%200))::date,'Tr '||n,($3::bigint[])[1+(n % array_length($3::bigint[],1))] from generate_series(1,300) n where n % array_length($2::bigint[],1) <> (n+1) % array_length($2::bigint[],1)`,[ORG,accountIds,userIds]);
 await q(`insert into agency_expenses(organization_id,account_id,category,kind,amount,currency,paid_on,reference,created_by_user_id) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],(array['Alquiler','Servicios','Sueldos','Equipos','Impuestos'])[1+(n%5)],'operativo',250000,'PYG',(current_date-(n%700))::date,'Gasto '||n,($3::bigint[])[1+(n % array_length($3::bigint[],1))] from generate_series(1,500) n`,[ORG,accountIds,userIds]);
 await q(`insert into agency_planned_expenses(organization_id,cadence,effective_month,category,amount,currency,note,created_by_user_id) select $1::bigint,(array['monthly','recurring'])[1+(n%2)],date_trunc('month',current_date)+(n%12)*interval '1 month','Planificado '||(n%8),300000,'PYG',repeat('Nota planificada. ',2),($2::bigint[])[1+(n % array_length($2::bigint[],1))] from generate_series(1,200) n`,[ORG,userIds]);
 const spaceIds=(await q(`insert into agency_studio_spaces(organization_id,name,scenario,notes,created_by_user_id) select $1::bigint,(array['Set A','Set B','Cabina de voz','Escenario'])[1+(n%4)]||' '||n,'','',($2::bigint[])[1+(n % array_length($2::bigint[],1))] from generate_series(1,12) n returning id`,[ORG,userIds])).rows.map(r=>Number(r.id));
 await q(`insert into agency_studio_reservations(organization_id,space_id,project_id,title,production_type,starts_at,ends_at,status,notes,created_by_user_id) select $1::bigint,($2::bigint[])[1+(n % array_length($2::bigint[],1))],($3::bigint[])[1+(n % array_length($3::bigint[],1))],'Reserva estudio '||n,(array['video','podcast','ads','fotografia','streaming','otro'])[1+(n%6)],date_trunc('month',now())+(((n-1)/12)*interval '6 hours')+interval '8 hours',date_trunc('month',now())+(((n-1)/12)*interval '6 hours')+interval '9 hours','reserved','',($4::bigint[])[1+(n % array_length($4::bigint[],1))] from generate_series(1,800) n`,[ORG,spaceIds,projectIds,userIds]);
 await q(`insert into agency_collaborators(organization_id,user_id,full_name,email,compensation_type,compensation_amount,currency,active,payment_day,invoices_company) select $1::bigint,u.id,coalesce(i.full_name,u.email),u.email,(array['fixed','variable','hourly','per_project'])[1+(row_number() over(order by u.id)::int %4)],3500000,'PYG',true,5,false from users u join user_personal_identities i on i.user_id=u.id where u.email like 'bench%@example.invalid'`, [ORG]);
 await q(`insert into agency_job_roles(organization_id,name) select $1::bigint,v.name from (values('Producción'),('Edición'),('Cámara'),('Dirección')) v(name)`,[ORG]);
 await q(`insert into agency_job_roles(organization_id,name) select $1::bigint,'Cargo '||n from generate_series(1,6) n on conflict do nothing`,[ORG]);
 await q(`insert into agency_exchange_rates(organization_id,rate_date,usd_to_pyg) select $1::bigint,current_date-n,6100+(n%90) from generate_series(1,30) n`,[ORG]);
 for(const table of ['agency_work_orders','agency_projects','agency_clients','agency_project_assignees','agency_work_order_assignees','agency_work_checklist_items','agency_inventory','agency_invoices','agency_payments','agency_leads','agency_budgets','agency_studio_reservations'])await q(`analyze ${table}`);
 const sessionToken='b'.repeat(64);
 await q("insert into sessions(id,user_id,organization_id,expires_at) values($1,$2,$3,now()+interval '7 days')",[sessionToken,userIds[0],ORG]);
 return {sessionToken,counts:{clients:clientIds.length,projects:projectIds.length,orders:orderIds.length,inventory:inventoryIds.length,invoices:2000}};
}

/* ------------------------------------------------------------------ pages */
const ORDER_FIELDS_SEARCH='id,title,status,project_id,project_name,client_name,due_date';
const ORDER_FIELDS_PORTFOLIO='id,status,project_id,due_date';
const ORDER_FIELDS_SUMMARY='id,title,status,project_id,project_name,client_name,due_date,due_time,work_type,effective_assignees,assigned_user_id,assigned_user_ids,checklist_total,checklist_completed,estimated_hours,actual_hours,updated_at';
const ORDER_FIELDS_BOARD='id,project_id,project_name,client_name,title,description,status,work_type,urgency,due_date,due_time,effective_assignees,assignee_source,checklist_total,checklist_completed,approval_step,drive_url,drive_links,estimated_hours,actual_hours,updated_at';
const BOARD_STATUSES=['blocked','to_record','recorded','editing','review','approved','published'];
const enc=value=>encodeURIComponent(value);
const monthRange=()=>{const now=new Date(),y=now.getUTCFullYear(),m=now.getUTCMonth();return{from:new Date(Date.UTC(y,m,1)).toISOString(),to:new Date(Date.UTC(y,m+1,1)).toISOString()};};
const SHELL_SEARCH={clients:'/api/agency/clients',projects:'/api/agency/projects',orders:`/api/agency/work-orders?limit=300&fields=${ORDER_FIELDS_SEARCH}`};
const PAGES=[
 {name:'Resumen',calls:['/api/agency/clients','/api/agency/projects',`/api/agency/work-orders?limit=300&fields=${ORDER_FIELDS_SUMMARY}`,'/api/agency/summary','/api/agency/dashboard','/api/agency/control-center']},
 {name:'Pipeline',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/leads','/api/agency/pipeline-stages']},
 {name:'Clientes',calls:['/api/agency/clients','/api/agency/projects',`/api/agency/work-orders?fields=${ORDER_FIELDS_PORTFOLIO}`,'/api/agency/summary']},
 {name:'Presupuestos',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/summary','/api/agency/budgets']},
 {name:'Proyectos',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders]},
 {name:'Producción',calls:['/api/agency/clients','/api/agency/projects','/api/agency/summary','/api/agency/work-orders?counts=1&limit=1&fields=id',...BOARD_STATUSES.map(s=>`/api/agency/work-orders?status=${s}&fields=${ORDER_FIELDS_BOARD}&limit=51`)]},
 {name:'Inventario',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/inventory','/api/agency/inventory-context','/api/agency/inventory-categories','/api/agency/inventory-locations',`/api/agency/inventory-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}`]},
 {name:'Estudio',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/studio-spaces','/api/agency/studio-context',`/api/agency/studio-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}`]},
 {name:'Finanzas',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/accounts','/api/agency/invoices','/api/agency/transfers','/api/agency/payments']},
 {name:'Informes',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/reports?month='+monthRange().from.slice(0,7)+'&months=12']},
 {name:'Equipo',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/team','/api/agency/control-center']},
 {name:'Configuración',calls:[SHELL_SEARCH.clients,SHELL_SEARCH.projects,SHELL_SEARCH.orders,'/api/agency/settings','/api/agency/exchange-rates','/api/auth/organizations']},
];

/* --------------------------------------------------------------- measure */
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)];};
/** Filas y forma del payload, deterministas entre corridas: la lista con más
 *  objetos con `id` del cuerpo, su cantidad y las claves ordenadas de la primera
 *  fila. Los timestamps del seed no entran, así que sirve para comparar
 *  versiones con la misma semilla. */
function payloadStats(text){
 let body=null;
 try{body=JSON.parse(text);}catch{return {rows:0,ids:'',shape:''};}
 const candidates=Array.isArray(body)?body:Object.values(body??{}).filter(value=>Array.isArray(value)&&value.length&&typeof value[0]==='object'&&!Array.isArray(value[0]));
 const list=candidates.sort((a,b)=>b.length-a.length)[0]||[];
 const ids=crypto.createHash('sha256').update(list.map(row=>String(row?.id??'')).join(',')).digest('hex').slice(0,12);
 const shape=crypto.createHash('sha256').update(Object.keys(list[0]??{}).sort().join(',')).digest('hex').slice(0,12);
 return {rows:list.length,ids,shape};
}
async function timedCall(base,cookie,url,samples=5){
 const target=`${base}${url}`;
 const once=async()=>{
  const started=performance.now();
  const response=await fetch(target,{headers:{cookie,accept:'application/json','accept-encoding':'gzip, deflate, br','user-agent':'scale-bench-pages'}});
  const ttfb=performance.now()-started;
  const buffer=await response.arrayBuffer();
  const total=performance.now()-started;
  const text=Buffer.from(buffer).toString('utf8');
  // Hash del cuerpo descomprimido: prueba de estabilidad dentro de la corrida.
  const hash=crypto.createHash('sha256').update(text).digest('hex').slice(0,12);
  return{ttfb,total,bytes:buffer.byteLength,wire:Number(response.headers.get('content-length')||buffer.byteLength),encoding:response.headers.get('content-encoding')||'identity',status:response.status,hash,...payloadStats(text)};
 };
 await once();
 const runs=[];
 for(let i=0;i<samples;i++)runs.push(await once());
 // Estabilidad de lectura: todas las muestras del mismo pedido deben ser idénticas.
 const stable=new Set(runs.map(run=>run.hash)).size===1;
 return{url,status:runs[0].status,ttfb:median(runs.map(r=>r.ttfb)),total:median(runs.map(r=>r.total)),bytes:runs[0].bytes,wire:runs[0].wire,encoding:runs[0].encoding,hash:runs[0].hash,stable,rows:runs[0].rows,ids:runs[0].ids,shape:runs[0].shape};
}
async function timedPage(base,cookie,calls,samples=3){
 const once=async()=>{const started=performance.now();await Promise.all(calls.map(url=>fetch(`${base}${url}`,{headers:{cookie,'accept-encoding':'gzip, deflate, br'}}).then(r=>r.arrayBuffer())));return performance.now()-started;};
 await once();
 const runs=[];for(let i=0;i<samples;i++)runs.push(await once());
 return median(runs);
}
/* ------------------------------------------------- estabilidad y contrato */
async function jsonRequest(base,cookie,url){
 const response=await fetch(`${base}${url}`,{headers:{cookie,accept:'application/json','accept-encoding':'gzip, deflate, br'}});
 let body=null;try{body=await response.json();}catch{/* sin JSON */ }
 return {status:response.status,body};
}
/** Verificación #73: contrato de `?fields=`/`?limit=` en las seis listas y la
 *  proyección/filtros de Resumen. Devuelve la cantidad de chequeos fallidos. */
async function verifyContract(base,cookie){
 let failures=0;
 const check=(label,ok,extra='')=>{if(!ok)failures+=1;console.log(`  ${ok?'OK  ':'FALLA'} ${label}${extra?` · ${extra}`:''}`);};
 const range=monthRange(),withParam=(url,param)=>`${url}${url.includes('?')?'&':'?'}${param}`;
 const lists=[
  {name:'inventory',url:'/api/agency/inventory',key:'records'},
  {name:'inventory-reservations',url:`/api/agency/inventory-reservations?from=${enc(range.from)}&to=${enc(range.to)}`,key:'reservations'},
  {name:'studio-spaces',url:'/api/agency/studio-spaces',key:'spaces'},
  {name:'studio-reservations',url:`/api/agency/studio-reservations?from=${enc(range.from)}&to=${enc(range.to)}`,key:'reservations'},
  {name:'leads',url:'/api/agency/leads',key:'records'},
  {name:'budgets',url:'/api/agency/budgets',key:'budgets'},
 ];
 for(const list of lists){
  const full=await jsonRequest(base,cookie,list.url);
  check(`${list.name}: default 200`,full.status===200,`${full.body?.[list.key]?.length??0} filas`);
  const idOnly=await jsonRequest(base,cookie,withParam(list.url,'fields=id'));
  const rows=idOnly.body?.[list.key]??[];
  check(`${list.name}: fields=id devuelve solo id`,idOnly.status===200&&rows.length>0&&rows.every(row=>Object.keys(row).length===1&&Object.hasOwn(row,'id')));
  check(`${list.name}: campo inválido → 400`,(await jsonRequest(base,cookie,withParam(list.url,'fields=id,inexistente'))).status===400);
  const limited=await jsonRequest(base,cookie,withParam(list.url,'limit=1&fields=id'));
  check(`${list.name}: limit=1 + hasMore`,limited.status===200&&(limited.body?.[list.key]?.length??0)<=1&&typeof limited.body?.hasMore==='boolean');
  check(`${list.name}: limit inválido → 400`,(await jsonRequest(base,cookie,withParam(list.url,'limit=0'))).status===400);
 }
 const derived=[
  ['inventory','/api/agency/inventory?fields=id,category_name,current_value','records'],
  ['inventory-reservations',`/api/agency/inventory-reservations?from=${enc(range.from)}&to=${enc(range.to)}&fields=id,items,project_name`,'reservations'],
  ['studio-reservations',`/api/agency/studio-reservations?from=${enc(range.from)}&to=${enc(range.to)}&fields=id,responsible_members,space_name`,'reservations'],
  ['budgets','/api/agency/budgets?fields=id,item_count,client_name','budgets'],
 ];
 for(const [name,url,key] of derived){
  const response=await jsonRequest(base,cookie,url),row=response.body?.[key]?.[0];
  const wanted=[...new URL(url,'https://bench.invalid').searchParams.get('fields').split(',')].sort();
  check(`${name}: calculados con su nombre`,response.status===200&&row&&JSON.stringify(Object.keys(row).sort())===JSON.stringify(wanted));
 }
 const projected=await jsonRequest(base,cookie,'/api/agency/work-orders?fields=id,status,project_id&limit=5');
 check('work-orders: proyección de Resumen',projected.status===200&&projected.body.workOrders.length<=5&&Object.keys(projected.body.workOrders[0]??{}).sort().join(',')==='id,project_id,status');
 const week=await jsonRequest(base,cookie,'/api/agency/work-orders?due=week&fields=id,status,due_date');
 const weekRows=week.body?.workOrders??[];
 const today=new Date().toISOString().slice(0,10),in7=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 check('work-orders: due=week (abiertas, dentro de la semana)',week.status===200&&weekRows.length>0&&weekRows.every(row=>!['approved','published'].includes(row.status)&&String(row.due_date).slice(0,10)>=today&&String(row.due_date).slice(0,10)<in7));
 const weekCounts=await jsonRequest(base,cookie,'/api/agency/work-orders?counts=1&due=week&limit=1&fields=id');
 const countsSum=Object.values(weekCounts.body?.stage_counts??{}).reduce((sum,value)=>sum+value,0);
 check('work-orders: counts respeta el filtro due',weekCounts.status===200&&countsSum===weekRows.length,`${countsSum} vs ${weekRows.length}`);
 check('work-orders: due inválido → 400',(await jsonRequest(base,cookie,'/api/agency/work-orders?due=raro')).status===400);
 // Estabilidad de lectura: dos lecturas seguidas del default son idénticas.
 const first=await jsonRequest(base,cookie,'/api/agency/inventory?fields=id,name');
 const second=await jsonRequest(base,cookie,'/api/agency/inventory?fields=id,name');
 check('lectura repetida idéntica (inventory)',JSON.stringify(first.body)===JSON.stringify(second.body));
 return failures;
}

/* ------------------------------------------------------------------- run */
try{
 pgTool('initdb',['-D',data,`--username=${pgUser}`,'--auth-local=trust','--auth-host=trust','--encoding=UTF8','--locale=C']);
 pgTool('pg_ctl',['-D',data,'-l',path.join(temporary,'postgres.log'),'-o',`-c listen_addresses=127.0.0.1 -c unix_socket_directories='${temporary}' -c port=${pgPort} -c max_connections=30 -c timezone=UTC`,'-w','-t','20','start']);
 const databaseUrl=`postgresql://${pgUser}@127.0.0.1:${pgPort}/postgres`;
 const port=Number(process.env.BENCH_PORT||3010);
 console.log('Arrancando API (migra al boot)…');
 server=spawn(process.execPath,['server.js'],{cwd:repo,env:{...process.env,PORT:String(port),DATABASE_URL:databaseUrl,DATABASE_SSL:'false',ADMIN_EMAIL:'',ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});
 const logs=[];
 server.stdout.on('data',chunk=>logs.push(String(chunk)));
 server.stderr.on('data',chunk=>logs.push(String(chunk)));
 const health=`http://127.0.0.1:${port}/health`;
 const deadline=Date.now()+90000;
 let ready=false;
 while(Date.now()<deadline){
  try{const r=await fetch(health);if(r.ok){ready=true;break;}}catch{}
  await new Promise(done=>setTimeout(done,200));
 }
 if(!ready){console.error('El API no respondió /health. Logs:\n'+logs.join('').slice(-4000));process.exit(1);}
 pool=new pg.Pool({connectionString:databaseUrl,max:4});
 console.log('Sembrando agencia (misma semilla en cada corrida)…');
 // Carga masiva: una sola conexión y `session_replication_role=replica` para
 // desactivar triggers de guardia/auditoría (los CHECK y exclusiones siguen).
 const seedClient=await pool.connect();
 let sessionToken,counts;
 try{
  await seedClient.query('set session_replication_role=replica');
  const q=(sql,args)=>seedClient.query(sql,args);
  ({sessionToken,counts}=await seed(q));
 }finally{
  try{await seedClient.query('set session_replication_role=origin');}catch{}
  seedClient.release();
 }
 console.log(`Semilla: ${counts.clients} clientes · ${counts.projects} proyectos · ${counts.orders} órdenes · ${counts.inventory} equipos · ${counts.invoices} facturas`);
 const cookie=`scale_session=${sessionToken}`;
 const base=`http://127.0.0.1:${port}`;
 const pages=PAGES.filter(page=>!pageFilter||pageFilter.includes(page.name));
 const report={generatedAt:new Date().toISOString(),counts,widthsNote:'TTFB de red local',pages:[]};
 for(const page of pages){
  const calls=[];
  for(const url of page.calls)calls.push(await timedCall(base,cookie,url,sampleCount));
  const wall=await timedPage(base,cookie,page.calls,Math.max(1,Math.round(sampleCount/2)));
  report.pages.push({name:page.name,wall,calls});
  const worst=[...calls].sort((a,b)=>b.ttfb-a.ttfb)[0];
  console.log(`\n${page.name} · wall ${wall.toFixed(0)} ms · ${calls.length} llamadas · peor: ${worst.url.split('?')[0]} ${worst.ttfb.toFixed(0)} ms TTFB / ${(worst.bytes/1024).toFixed(0)} KB`);
  for(const call of calls)console.log(`  ${call.ttfb.toFixed(0).padStart(5)} ms TTFB · ${call.total.toFixed(0).padStart(5)} ms · ${(call.bytes/1024).toFixed(0).padStart(5)} KB JSON · ${(call.wire/1024).toFixed(0).padStart(5)} KB red · ${call.encoding.padEnd(8)} · ${call.url}`);
 }
 if(wantJson)console.log('\n'+JSON.stringify(report,null,2));
 // Candidatos de front (#67 para DSN): mismos datos con `?fields=`, medidos con
 // la misma semilla, para dimensionar el recorte antes de adoptarlo en el shell.
 const candidates=[
  ['clientes · hoy (ficha completa)','/api/agency/clients'],
  ['clientes · chrome (id,name,email,phone,active,lifecycle_status,logo_url,color_key)','/api/agency/clients?fields=id,name,email,phone,active,lifecycle_status,logo_url,color_key'],
  ['proyectos · hoy (incluye conteos y asignados)','/api/agency/projects'],
  ['proyectos · chrome (id,name,client_id,status,client_name,work_order_count,assignees)','/api/agency/projects?fields=id,name,client_id,status,client_name,work_order_count,assignees'],
  ['proyectos · mínimo (id,name,client_id,status)','/api/agency/projects?fields=id,name,client_id,status'],
  ['órdenes · ventana buscador (300, sin descripción)','/api/agency/work-orders?limit=300&fields=id,title,status,project_id,project_name,client_name,due_date'],
  // Ronda 17 (#71): propuesta de alertas/próximas entregas de Resumen sobre la proyección de órdenes.
  ['órdenes · alertas vencidas (due=overdue)','/api/agency/work-orders?due=overdue&limit=50&fields=id,title,status,due_date,due_time,project_name,client_name'],
  ['órdenes · próximas entregas (due=week)','/api/agency/work-orders?due=week&limit=50&fields=id,title,status,due_date,due_time,project_name,client_name'],
  // Ronda 17 (#71): listas con `?fields=` de OPS/COM.
  ['inventario · hoy (catálogo completo)','/api/agency/inventory'],
  ['inventario · campos de la vista','/api/agency/inventory?fields=id,name,inventory_code,serial_number,status,category_name,storage_location_name,storage_shelf,storage_row,location_type,active_reservation_id,production_name,current_value,photo_url,barcode_payload,last_verified_at,last_verification_result'],
  ['inventario · vista + limit=50','/api/agency/inventory?limit=50&fields=id,name,inventory_code,status,category_name,storage_location_name,location_type,current_value,photo_url'],
  [`reservas inventario · hoy (mes)`,`/api/agency/inventory-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}`],
  [`reservas inventario · lista`,`/api/agency/inventory-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}&fields=id,title,status,starts_at,ends_at,project_name,return_user_name,custodian_name,items,responsible_members`],
  [`reservas inventario · lista + limit=25`,`/api/agency/inventory-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}&limit=25&fields=id,title,status,starts_at,ends_at,project_name,return_user_name`],
  ['estudio espacios · hoy','/api/agency/studio-spaces'],
  ['estudio espacios · campos','/api/agency/studio-spaces?fields=id,name,scenario,active'],
  [`estudio reservas · hoy (mes)`,`/api/agency/studio-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}`],
  [`estudio reservas · lista`,`/api/agency/studio-reservations?from=${enc(monthRange().from)}&to=${enc(monthRange().to)}&fields=id,space_id,space_name,title,production_type,starts_at,ends_at,status,project_name,responsible_members`],
  ['oportunidades · hoy','/api/agency/leads'],
  ['oportunidades · pipeline','/api/agency/leads?fields=id,name,email,phone,stage,amount,currency,probability,client_id,updated_at'],
  ['presupuestos · hoy','/api/agency/budgets'],
  ['presupuestos · lista','/api/agency/budgets?fields=id,number,title,status,currency,total,client_name,item_count,valid_until,created_at'],
  ['presupuestos · lista + limit=50','/api/agency/budgets?limit=50&fields=id,number,title,status,currency,total,client_name,item_count'],
  ['órdenes · Resumen anterior (sin limit, fields mínimos)','/api/agency/work-orders?fields=id,status,project_id'],
  ['órdenes · ventana Resumen (300, buscador+alertas+planificador)','/api/agency/work-orders?limit=300&fields='+ORDER_FIELDS_SUMMARY],
 ];
 console.log('\nCandidatos (front):');
 for(const [label,url] of candidates){
  const call=await timedCall(base,cookie,url,sampleCount);
  console.log(`  ${call.ttfb.toFixed(0).padStart(5)} ms TTFB · ${(call.bytes/1024).toFixed(0).padStart(5)} KB JSON · ${(call.wire/1024).toFixed(0).padStart(4)} KB red · ${call.encoding.padEnd(8)} · ${String(call.rows).padStart(5)} filas · ids ${call.ids} · shape ${call.shape} · sha ${call.hash}${call.stable?'':' ⚠ inestable'} · ${label}`);
 }
 if(verifyMode){
  console.log('\nVerificación de contrato y estabilidad (#73):');
  const failures=await verifyContract(base,cookie);
  console.log(failures?`  ${failures} chequeos fallaron.`:'  Contrato y estabilidad OK.');
  if(failures)process.exitCode=1;
 }
 const slow=logs.join('').split('\n').filter(line=>line.includes('slow_query'));
 if(slow.length)console.log('\nConsultas >250 ms:\n'+slow.join('\n'));
}finally{try{await pool?.end();}catch{}cleanup();}
