import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {publicExperience} from './public-experience.js';
import {employeeTasks} from './employee-tasks.js';
import {contracts} from './contracts.js';
import {financeTreasury} from './finance-treasury.js';
import {studioReservations} from './studio-reservations.js';
import {seedDemoModules} from './demo-modules.js';
import {commercialLifecycle} from './commercial-lifecycle.js';
import {financialForecast} from './forecast.js';

// Real handlers over in-memory PostgreSQL; external traffic is forbidden.
const pg=new PGlite(),originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw Error('Provider traffic is forbidden in demo tests');};
const query=(sql,args=[])=>pg.query(sql,args),one=async(sql,args)=>(await query(sql,args)).rows[0],db={query,connect:async()=>({query,release(){}})};
try{
 await pg.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 for(const file of migrationOrder)await pg.exec(await readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
 const real=(await one("select id from organizations where slug='scale'")).id;
 const realBefore=(await query('select to_jsonb(o) as row from organizations o where id=$1',[real])).rows;
 async function start(){let result;await publicExperience({req:{method:'POST',headers:{origin:'https://sistema.scaleparaguay.com'},socket:{remoteAddress:'fixture'}},res:{},url:new URL('https://test/api/demo/start'),db,session:async()=>null,body:async()=>({}),send:(_,status,data,headers)=>result={status,...data,headers},cookie:(name,value)=>name+'='+value,parseCookies:()=>({})});assert.equal(result.status,201,JSON.stringify(result));const token=result.headers['Set-Cookie'].split('=')[1];const user=await one('select u.id,s.organization_id,o.demo_owner_user_id,u.is_demo_guest,m.role,o.demo_expires_at>now() as unexpired from sessions s join users u on u.id=s.user_id join organizations o on o.id=s.organization_id join organization_members m on m.organization_id=s.organization_id and m.user_id=s.user_id where s.id=$1',[token]);return {token,user};}
 const a=await start(),b=await start();assert.notEqual(a.token,b.token);assert.notEqual(String(a.user.organization_id),String(b.user.organization_id));assert.notEqual(String(a.user.id),String(b.user.id));assert(a.user.is_demo_guest&&b.user.is_demo_guest&&a.user.unexpired&&b.user.unexpired);
 async function call(handler,actor,path,method='GET',input={},extra={}){let result;const handled=await handler({req:{method,socket:{remoteAddress:'fixture'}},res:{},url:new URL('https://test'+path),db,session:async()=>({...actor}),body:async()=>input,send:(_,status,data)=>result={status,...data},...extra});assert.equal(handled,true,path);return result;}
 const tasks='/api/agency/productivity/internal-tasks';
 for(const {user} of [a,b]){
  const org=user.organization_id,r=await call(employeeTasks,user,tasks+'?bucket=today&assignee=me');assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.records.length,3,'Inicio has three of the visitor’s own tasks today regardless of the current hour');assert(r.records.every(task=>task.assigned_user_ids.includes(String(user.id))&&task.checklist.length===3));
  for(const bucket of ['overdue','upcoming','completed','undated'])assert((await call(employeeTasks,user,tasks+'?bucket='+bucket)).records.length>0,bucket);
  const center=await call(commercialLifecycle,user,'/api/agency/control-center');assert.equal(center.status,200,JSON.stringify(center));
  assert.deepEqual(center.contracted_billing.records,[{currency:'PYG',net_monthly:'22000000.00'},{currency:'USD',net_monthly:'2400.00'}],'Inicio shows only the seven monthly agreements, by their actual currency');
  const forecast=await call(financialForecast,user,'/api/agency/forecast');assert.equal(forecast.status,200,JSON.stringify(forecast));assert.deepEqual(forecast.contracted_recurring.records.map(row=>({currency:row.currency,amount:row.amount})),[{currency:'PYG',amount:22000000},{currency:'USD',amount:2400}],'canonical monthly metadata does not reprice or duplicate the existing forecast');
  assert.equal(Number((await one("select count(*) as n from agency_client_commercial_terms t join agency_plans p on p.organization_id=t.organization_id and p.id=t.plan_id where t.organization_id=$1 and (p.currency<>t.currency or (t.cadence='monthly' and (t.effective_from is distinct from t.starts_on or t.activation_date is distinct from t.starts_on or t.monthly_price is distinct from t.recurring_amount or t.plan_name is distinct from p.name or t.plan_version is null)) or (t.cadence<>'monthly' and (t.effective_from is not null or t.monthly_price is not null)))",[org])).n),0,'one coherent lifecycle snapshot per monthly agreement; intervals and one-off services stay outside the monthly KPI');
  const studio=await call(studioReservations,user,'/api/agency/studio-spaces');assert.equal(studio.status,200);assert.equal(studio.spaces.length,2);
  assert.equal(Number((await one("select count(*) as n from agency_studio_reservations where organization_id=$1 and (starts_at at time zone 'America/Asuncion')::date=(now() at time zone 'America/Asuncion')::date",[org])).n),2);
  assert.equal(Number((await one('select count(*) as n from agency_contract_templates where organization_id=$1',[org])).n),4);assert.equal(Number((await one('select count(*) as n from agency_contracts where organization_id=$1',[org])).n),4);assert.equal(Number((await one('select count(*) as n from agency_contract_versions where organization_id=$1',[org])).n),1);
  const docs=(await call(contracts,user,'/api/agency/contracts')).contracts;const detail=await call(contracts,user,'/api/agency/contracts/'+docs[0].id);assert.equal(detail.status,200);assert.deepEqual(detail.missing,[]);assert.match(detail.contract.body,/EJEMPLO FICTICIO/);
  const cash=await call(financeTreasury,user,'/api/agency/finance/treasury');assert.equal(cash.status,200);assert.equal(cash.accounts.length,3);assert(cash.movements.some(row=>row.movement_type==='expense'));assert(cash.movements.some(row=>row.movement_type==='payment'));
  const debt=(await call(financeTreasury,user,'/api/agency/finance/opening-receivables')).receivables[0];assert.equal(Number(debt.amount),800000);assert.equal(Number(debt.paid_amount),200000);assert.equal(Number(debt.outstanding_amount),600000);assert(debt.expected_on>debt.due_on);
  assert.equal(Number((await one('select count(*) as n from bank_accounts a where a.organization_id=$1 and a.balance<>coalesce((select sum(m.amount) from agency_cash_movements m where m.organization_id=a.organization_id and m.account_id=a.id),0)',[org])).n),0,'cached balances exactly match all canonical ledger entries');
  assert.equal(Number((await one('select count(*) as n from agency_invoices where organization_id=$1',[org])).n),78,'20 current and 58 real history fixture invoices, with no fictional invoice for prior debt');
  assert.equal(Number((await one('select count(*) as n from agency_inventory where organization_id=$1 and owner_user_id is not null',[org])).n),1);assert.equal(Number((await one('select count(*) as n from agency_inventory_maintenance where organization_id=$1',[org])).n),1);
  assert.equal(Number((await one('select count(*) as n from agency_presence_tabs where organization_id=$1',[org])).n),0,'do not manufacture live people');
 }
 const current=(await call(employeeTasks,a.user,tasks+'?bucket=today')).records[0],other=(await call(employeeTasks,b.user,tasks+'?bucket=today')).records.find(row=>row.title===current.title),beforeOther=JSON.stringify((await call(employeeTasks,b.user,tasks+'/'+other.id)).record);
 const updated=await call(employeeTasks,a.user,tasks+'/'+current.id,'PATCH',{expected_version:current.version,checklist:current.checklist.map((item,index)=>index===1?{...item,completed:!item.completed}:item)});assert.equal(updated.status,200,JSON.stringify(updated));assert.notDeepEqual(updated.record.checklist,current.checklist);
 assert.equal(JSON.stringify((await call(employeeTasks,b.user,tasks+'/'+other.id)).record),beforeOther,'saving a checklist only changes this browser’s private demo');assert.equal((await call(employeeTasks,b.user,tasks+'/'+current.id)).status,404);
 const contract=(await one('select contract_id from agency_contract_versions where organization_id=$1',[a.user.organization_id])).contract_id;
 let html,headers;const pdfRes={writeHead(status,value){headers={status,...value};},end(data){assert(Buffer.isBuffer(data));}};await contracts({req:{method:'GET',socket:{}},res:pdfRes,url:new URL('https://test/api/agency/contracts/'+contract+'/versions/1/pdf'),db,session:async()=>a.user,body:async()=>({}),send:()=>assert.fail('PDF should render'),pdfRenderer:async value=>{html=value;return Buffer.from('%PDF-1.7 demo test');}});assert.equal(headers.status,200);assert.match(html,/EJEMPLO FICTICIO/);
 // Reopening or calling a builder cannot reset a visitor's edits.
 await pg.exec('begin');assert.deepEqual(await seedDemoModules({query},{organizationId:a.user.organization_id,userId:a.user.id}),{seeded:false});await assert.rejects(()=>seedDemoModules({query},{organizationId:real,userId:a.user.id}),{status:403});await pg.exec('commit');
 assert.deepEqual((await query('select to_jsonb(o) as row from organizations o where id=$1',[real])).rows,realBefore);assert.equal(Number((await one('select count(*) as n from agency_clients where organization_id=$1',[real])).n),0);
 const brief=await readFile(new URL('../public/demo-materiales/brief.txt',import.meta.url),'utf8');assert.match(brief,/Todos los nombres, contenidos e importes son ficticios/);
 console.log('PASS complete public demo: distinct browser tokens/users/tenants, own tasks today and private checklist persistence, all task buckets, two studio spaces and today bookings, four editable contract models/drafts and PDF snapshot, legal profiles, coherent cash/debt applications, inventory ownership/maintenance, unchanged real agency and no provider traffic');
}finally{globalThis.fetch=originalFetch;await pg.close();}
