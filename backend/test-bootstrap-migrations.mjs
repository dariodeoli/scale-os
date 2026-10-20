import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {maintenanceTestDatabase} from './scripts/test-maintenance-database.mjs';
import {PGlite} from '@electric-sql/pglite';
import {applyCuratedMigrations,applyPendingMigrations} from './migrations-runner.mjs';
import {migrationOrder} from './scripts/migration-order.mjs';
const storage=process.env.SCALE_MAINTENANCE_TEST_PG_SOCKET?null:await fs.mkdtemp(path.join(os.tmpdir(),'scale-bootstrap-data-'));
const database=async()=>storage?new PGlite(storage):maintenanceTestDatabase();
let pg=await database();
async function restartConnection(){await pg.close();pg=await database();}
const query=(sql,args)=>pg.query(sql,args),run=sql=>pg.exec(sql);
const root=new URL('./',import.meta.url),read=file=>fs.readFile(new URL(file,root),'utf8');
const directory=await fs.mkdtemp(path.join(os.tmpdir(),'scale-bootstrap-sql-'));
const precision='20261017_expense_currency_precision.sql';
const precisionIndex=migrationOrder.indexOf(precision);
assert.notEqual(precisionIndex,-1,'precision migration remains an explicit historical boundary');
const throughPrecision=migrationOrder.slice(0,precisionIndex+1);
const beforePrecision=throughPrecision.slice(0,-1);
const economicUpgrade=['20261017_client_representative_link.sql','20261018_economic_history.sql','20261018_commercial_same_month_revisions.sql'];
assert.equal(beforePrecision.length,110,'the tracked 110-file fixture stays frozen');
assert.equal(throughPrecision.length,111,'the precision upgrade remains migration 111');
const workspaceUpgrade=['20261018_workspace_preferences.sql','20261018_client_contacts.sql'];
const currentUpgrade=['20261020_inventory_external_owner.sql','20261020_client_monthly_income.sql','20261020_list_column_preferences.sql','20261020_mcp_connections.sql'];
const throughEconomics=[...throughPrecision,...economicUpgrade];
assert.equal(throughEconomics.length,114,'the economic upgrade remains migration 114');
const throughWorkspace=[...throughEconomics,...workspaceUpgrade];
assert.equal(throughWorkspace.length,116,'the preferences/contact upgrade remains migration116');
assert.deepEqual(migrationOrder.slice(precisionIndex+1),[...economicUpgrade,...workspaceUpgrade,...currentUpgrade],'new migrations follow the preserved 111 and 114-file baselines');
assert.equal(migrationOrder.length,120,'fresh and legacy fixtures cover every current curated file');
async function copy(files){for(const file of files)await fs.writeFile(path.join(directory,file),await read('migrations/'+file));}
async function stageOnly(files){
 // applyPendingMigrations scans the directory too: a shorter curated chain
 // alone cannot represent an older release while newer SQL files are present.
 for(const file of await fs.readdir(directory))await fs.rm(path.join(directory,file));
 await copy(files);
}
async function bootstrap(chain=migrationOrder){
 await query('begin');
 try{
  await query("select pg_advisory_xact_lock(hashtextextended('scale-core-schema',0))");
  await run(await read('schema.sql'));
  const curated=await applyCuratedMigrations(pg,directory,chain);
  const pending=await applyPendingMigrations(pg,directory);
  await query('commit');return{curated,pending};
 }catch(error){await query('rollback');throw error;}
}
async function populated(amount){
 const org=(await query("select id from organizations where slug='scale'")).rows[0].id;
 const uid=(await query("insert into users(email,password_hash) values('bootstrap-owner@example.invalid','unchanged-global-password') returning id")).rows[0].id;
 await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
 await query("insert into agency_user_profiles(organization_id,user_id,full_name) values($1,$2,'Identidad preservada')",[org,uid]);
 const account=(await query("insert into bank_accounts(organization_id,name,account_type,currency) values($1,'Bootstrap USD','cash','USD') returning id",[org])).rows[0].id;
 await query("insert into agency_account_openings(organization_id,account_id,amount,opened_on,reason,request_key,created_by) values($1,$2,1000,current_date,'Fixture','bootstrap-opening',$3)",[org,account,uid]);
 await query("insert into agency_expenses(organization_id,account_id,category,amount,currency,created_by_user_id) values($1,$2,'Fixture',$3,'USD',$4)",[org,account,amount,uid]);
 const item=(await query("insert into agency_inventory(organization_id,name,ownership_kind) values($1,'Bootstrap camera','company') returning id",[org])).rows[0].id;
 await query("insert into agency_inventory_trace(organization_id,inventory_id,event_type,actor_user_id,context) values($1,$2,'ownership.changed',$3,'{\"to\":\"company\"}')",[org,item,uid]);
 return{org,uid,account,item};
}
async function snapshot(){
 const tables=['users','organization_members','agency_user_profiles','agency_clients','agency_projects','agency_inventory','agency_inventory_trace','agency_collaborators','agency_plans','agency_client_commercial_terms','agency_invoices','agency_payouts','agency_account_openings','agency_payments'];
 const result={};for(const table of tables)result[table]=(await query(`select * from ${table} order by 1,2`)).rows;
 result.expenses=(await query('select id,amount::numeric(22,2)::text as amount,currency,reference from agency_expenses order by id')).rows;
 result.accounts=(await query('select id,balance::text from bank_accounts order by id')).rows;
 result.audit=(await query('select * from agency_operation_audit order by id')).rows;
 if((await query("select to_regclass('public.agency_salary_history')::text as name")).rows[0].name)result.salaryHistory=(await query('select * from agency_salary_history order by id')).rows;
 for(const table of ['agency_workspace_preferences','agency_client_contacts','agency_client_monthly_income','agency_client_monthly_income_events']){
  if((await query('select to_regclass($1)::text as name',['public.'+table])).rows[0].name)result[table]=(await query(`select * from ${table} order by 1,2`)).rows;
 }
 return result;
}
async function populatedWorkspace({org,uid},client){
 if(!client)client=(await query("insert into agency_clients(organization_id,name,email,phone) values($1,'Workspace primary','primary@example.invalid','+595981123456') returning id",[org])).rows[0].id;
 await query("insert into agency_workspace_preferences(organization_id,user_id,preferences) values($1,$2,$3::jsonb)",[org,uid,JSON.stringify({version:1,startup:'production',production:{clientId:String(client),mine:true,week:false}})]);
 await query("insert into agency_client_contacts(organization_id,client_id,name,role,email,phone,version,created_by_user_id,updated_by_user_id) values($1,$2,'Secondary preserved','Coordination','secondary@example.invalid','+595981654321',3,$3,$3)",[org,client,uid]);
}

async function populatedEconomics({org,uid,account}){
 const person=(await query("insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency,monthly_salary_amount,monthly_salary_currency,started_on) values($1,'Legacy salary fixture','fixed',500,'USD',500,'USD','2001-01-01') returning id",[org])).rows[0].id;
 const client=(await query("insert into agency_clients(organization_id,name,legal_name,legal_representative_name) values($1,'Legacy client','Legacy legal name','Explicit representative') returning id",[org])).rows[0].id;
 const plan=(await query("insert into agency_plans(organization_id,name,currency,items) values($1,'Legacy plan','USD','[]'::jsonb) returning id",[org])).rows[0].id;
 await query("insert into agency_client_commercial_terms(organization_id,client_id,plan_id,activation_date,effective_from,starts_on,plan_name,plan_version,monthly_price,recurring_amount,currency,invoice_required) values($1,$2,$3,'2026-07-01','2026-07-01','2026-07-01','Legacy plan','fixture-v1',250,250,'USD',false)",[org,client,plan]);
 await query("insert into agency_invoices(organization_id,client_id,number,currency,total,issued_on,notes) values($1,$2,'BOOTSTRAP-LEGACY','USD',250,'2026-07-02','Historical invoice snapshot')",[org,client]);
 await query("insert into agency_payouts(organization_id,collaborator_id,account_id,amount,paid_on,reference,created_by_user_id) values($1,$2,$3,12.34,'2026-07-03','Historical payout',$4)",[org,person,account,uid]);
 return{person,client};
}
function exactSalaryMinor(value){
 const match=/^(-?)([0-9]+)(?:\.([0-9]*))?$/.exec(String(value));
 assert(match,`salary amount is an exact decimal: ${value}`);
 assert(!/[1-9]/.test((match[3]||'').slice(2)),`salary amount exceeds two minor digits: ${value}`);
 return(match[1]?-1n:1n)*(BigInt(match[2])*100n+BigInt((match[3]||'').slice(0,2).padEnd(2,'0')));
}
function comparableRow(table,row){
 // This one declared type migration changes bigint transport to numeric(22,2).
 // Preserve null and compare its value exactly; all other columns stay strict.
 return table==='agency_collaborators'&&row.monthly_salary_amount!==null
  ?{...row,monthly_salary_amount:exactSalaryMinor(row.monthly_salary_amount)}:row;
}
function assertEconomicUpgradePreserves(before,after){
 const additions={agency_clients:['legal_representative_same_as_client'],agency_client_commercial_terms:['change_reason','changed_by_user_id','request_key']};
 for(const [table,rows] of Object.entries(before)){
  assert.equal(after[table].length,rows.length,`${table}: no row added or removed`);
  for(let index=0;index<rows.length;index++){
   const previous=rows[index],current=after[table][index];
   assert.deepEqual(comparableRow(table,Object.fromEntries(Object.keys(previous).map(key=>[key,current[key]]))),comparableRow(table,previous),`${table}: every pre-existing column preserved`);
   assert.deepEqual(Object.keys(current).filter(key=>!Object.hasOwn(previous,key)).sort(),(additions[table]||[]).slice().sort(),`${table}: only declared schema additions`);
   for(const key of additions[table]||[])assert.equal(current[key],key==='legal_representative_same_as_client'?false:null,`${table}.${key}: safe explicit default`);
  }
 }
}
async function rejectedWrite(sql,args,pattern){
 await query('begin');
 try{await assert.rejects(query(sql,args),pattern);}finally{await query('rollback');}
}
async function reset(){await run('drop schema public cascade; create schema public;');}
try{
 // Fresh install records each curated file, then restarts with real modern data.
 await copy(migrationOrder);
 assert.deepEqual(await bootstrap(),{curated:migrationOrder,pending:[]});
 await populatedWorkspace(await populated('100.25'));
 const freshState=await snapshot(),freshTracker=(await query('select * from schema_migrations order by filename')).rows;
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]});
 assert.deepEqual(await snapshot(),freshState,'restart never changes USD cents, inventory trace, identity or seeds');
 assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,freshTracker);
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]},'second restart is also empty');
 // Upgrade an existing tracked 110-file installation. The newer trace makes
 // historical enum replay provably invalid; preserve it instead of relaxing it.
 await reset();await stageOnly(beforePrecision);
 assert.deepEqual(await bootstrap(beforePrecision),{curated:beforePrecision,pending:[]});
 const old=await populated('100');
 await query('begin');
 await assert.rejects(run(await read('migrations/20260915_inventory_location_pipeline.sql')),/check constraint|violates/i);
 await query('rollback');
 const oldState=await snapshot(),oldTracker=(await query('select * from schema_migrations order by filename')).rows;
 await restartConnection(); // A process restart has no cached bigint trigger plans.
 await copy([precision]);
 const future='20271001_bootstrap_future.sql';
 await fs.writeFile(path.join(directory,future),'create table bootstrap_future(id int primary key); insert into bootstrap_future values(1);');
 assert.deepEqual(await bootstrap(throughPrecision),{curated:[precision],pending:[future]},'only precision upgrade and unlisted future migration execute');
 assert.deepEqual(await snapshot(),oldState,'upgrade preserves every historical row');
 assert.deepEqual((await query('select * from schema_migrations where filename<>$1 and filename<>$2 order by filename',[precision,future])).rows,oldTracker,'old tracker timestamps stay untouched');
 await query("insert into agency_expenses(organization_id,account_id,category,amount,currency,created_by_user_id) values($1,$2,'USD cents',100.25,'USD',$3)",[old.org,old.account,old.uid]);
 let upgraded=await snapshot();
 for(let restart=0;restart<2;restart++)assert.deepEqual(await bootstrap(throughPrecision),{curated:[],pending:[]});
 assert.deepEqual(await snapshot(),upgraded);
 assert.equal((await query("select amount::text as amount from agency_expenses where category='USD cents'")).rows[0].amount,'100.25');
 assert.equal((await query('select count(*)::int as n from bootstrap_future')).rows[0].n,1,'future migration executes once');
 // Separately upgrade the tracked 111-file release with real economic data.
 // Neither the 110->111 fixture nor pending-file scanning can run these early.
 const economic=await populatedEconomics(old);
 const beforeEconomic=await snapshot(),tracker111=(await query('select * from schema_migrations order by filename')).rows;
 assert.equal(tracker111.filter(row=>throughPrecision.includes(row.filename)).length,111);
 await restartConnection();await copy(economicUpgrade);
 assert.deepEqual(await bootstrap(throughEconomics),{curated:economicUpgrade,pending:[]},'111->114 executes exactly the three new migrations');
 const afterEconomic=await snapshot();
 assertEconomicUpgradePreserves(beforeEconomic,afterEconomic);
 assert.deepEqual((await query('select * from schema_migrations where not(filename=any($1::text[])) order by filename',[economicUpgrade])).rows,tracker111,'all prior tracker timestamps survive 111->114');
 assert.equal((await query('select count(*)::int as n from schema_migrations where filename=any($1::text[])',[throughEconomics])).rows[0].n,114);
 assert.equal(afterEconomic.salaryHistory.length,beforeEconomic.agency_collaborators.length,'one baseline per existing person');
 const baseline=afterEconomic.salaryHistory.find(row=>String(row.collaborator_id)===String(economic.person));
 assert(baseline,'the legacy salary has a history baseline');
 assert.equal(baseline.source,'legacy-baseline');assert.equal(baseline.effective_from,null,'employment start never becomes invented salary effective date');
 assert.equal(baseline.actor_user_id,null);assert.equal(baseline.request_key,null);
 const originalSalary=beforeEconomic.agency_collaborators.find(row=>String(row.id)===String(economic.person));
 assert.deepEqual(baseline.after_state,{amount:String(originalSalary.compensation_amount),currency:'USD',compensation_type:'fixed',monthly_salary_amount:'500.00',monthly_salary_currency:'USD'});
 assert.equal(exactSalaryMinor(baseline.after_state.monthly_salary_amount),exactSalaryMinor(originalSalary.monthly_salary_amount));
 assert.deepEqual((await query("select numeric_precision,numeric_scale from information_schema.columns where table_name='agency_collaborators' and column_name='monthly_salary_amount'")).rows,[{numeric_precision:22,numeric_scale:2}]);
 const observed=(await query("select agency_salary_at($1,$2,'2001-01-01'::date) as state",[old.org,economic.person])).rows[0].state;
 assert.equal(observed.history_known,false);assert.equal(observed.effective_from,null);assert.equal(observed.amount,baseline.after_state.amount);
 await rejectedWrite('update agency_salary_history set reason=$1 where id=$2',['Rewritten history',baseline.id],/append-only/i);
 await rejectedWrite('delete from agency_salary_history where id=$1',[baseline.id],/append-only/i);
 await rejectedWrite('update agency_client_commercial_terms set recurring_amount=999 where client_id=$1',[economic.client],/immutable|append/i);
 upgraded=await snapshot();const trackerLatest=(await query('select * from schema_migrations order by filename')).rows;
 for(let restart=0;restart<2;restart++){
  await restartConnection();assert.deepEqual(await bootstrap(throughEconomics),{curated:[],pending:[]},'114-file process restart has no migration replay');
  assert.deepEqual(await snapshot(),upgraded,'114 restart preserves baselines, invoices, payouts, cents and ownership trace');
  assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,trackerLatest);
 }
 // Upgrade 114->116 separately; no prior file or populated row may change.
 const beforeWorkspace=await snapshot(),tracker114=(await query('select * from schema_migrations order by filename')).rows;
 await restartConnection();await copy(workspaceUpgrade);
 assert.deepEqual(await bootstrap(throughWorkspace),{curated:workspaceUpgrade,pending:[]},'114->116 executes preferences and contacts once in curated order');
 const afterWorkspace=await snapshot();
 for(const [table,rows] of Object.entries(beforeWorkspace))assert.deepEqual(afterWorkspace[table],rows,`${table}: 114->116 preserves every historical value`);
 assert.deepEqual(afterWorkspace.agency_workspace_preferences,[],'migration never invents user preferences');
 assert.deepEqual(afterWorkspace.agency_client_contacts,[],'migration never duplicates principal contacts');
 assert.deepEqual((await query('select * from schema_migrations where not(filename=any($1::text[])) order by filename',[workspaceUpgrade])).rows,tracker114,'114 tracker timestamps remain unchanged');
 assert.equal((await query('select count(*)::int as n from schema_migrations where filename=any($1::text[])',[migrationOrder])).rows[0].n,116);
 await populatedWorkspace(old,economic.client);
 upgraded=await snapshot();
 const workspaceTracker=(await query('select * from schema_migrations order by filename')).rows;
 for(let restart=0;restart<2;restart++){
  await restartConnection();assert.deepEqual(await bootstrap(throughWorkspace),{curated:[],pending:[]},'116-file restart has no replay');
  assert.deepEqual(await snapshot(),upgraded,'116 restart preserves preferences, versioned contacts, principal and economic history');
  assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,workspaceTracker);
 }
 // Upgrade 116->120 separately, without changing any historical snapshot.
 const beforeIncome=await snapshot(),tracker116=(await query('select * from schema_migrations order by filename')).rows;
 await restartConnection();await copy(currentUpgrade);
 assert.deepEqual(await bootstrap(),{curated:currentUpgrade,pending:[]},'116->120 adds monthly income once');
 const afterIncome=await snapshot();for(const [table,rows] of Object.entries(beforeIncome)){
  const actual=table==='agency_inventory'?afterIncome[table].map(({external_owner_name,...row})=>{assert.equal(external_owner_name,null,'external owner is unknown for all existing inventory');return row;}):afterIncome[table];
  assert.deepEqual(actual,rows,`${table}: new features preserve every historical field and row`);
 }
 assert.deepEqual(afterIncome.agency_client_monthly_income,[],'no monthly income invented during migration');
 assert.deepEqual(afterIncome.agency_client_monthly_income_events,[],'no monthly events invented during migration');
 assert.deepEqual((await query('select * from schema_migrations where not(filename=any($1::text[])) order by filename',[currentUpgrade])).rows,tracker116,'116 tracker timestamps remain unchanged');
 assert.equal((await query('select count(*)::int as n from schema_migrations where filename=any($1::text[])',[migrationOrder])).rows[0].n,120);
 upgraded=afterIncome;const incomeTracker=(await query('select * from schema_migrations order by filename')).rows;
 for(let restart=0;restart<2;restart++){
  await restartConnection();assert.deepEqual(await bootstrap(),{curated:[],pending:[]},'120-file restart has no replay');assert.deepEqual(await snapshot(),upgraded,'120 restart preserves all data');assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,incomeTracker);
 }
 // A later failure rolls back earlier new DDL AND tracker rows in the same TX.
 const beforeFailure='20271002_bootstrap_before_failure.sql',failure='20271003_bootstrap_failure.sql';
 await fs.writeFile(path.join(directory,beforeFailure),'create table bootstrap_before_failure(id int primary key); insert into bootstrap_before_failure values(2);');
 await fs.writeFile(path.join(directory,failure),'create table bootstrap_failure(id int); select * from missing_bootstrap_relation;');
 const trackedBefore=(await query('select * from schema_migrations order by filename')).rows;
 await assert.rejects(bootstrap([...migrationOrder,beforeFailure,failure]),/missing_bootstrap_relation/);
 assert.equal((await query("select to_regclass('public.bootstrap_before_failure')::text as name")).rows[0].name,null);
 assert.equal((await query("select to_regclass('public.bootstrap_failure')::text as name")).rows[0].name,null);
 assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,trackedBefore);
 assert.deepEqual(await snapshot(),upgraded,'rollback preserves all application rows');
 await fs.writeFile(path.join(directory,failure),'create table bootstrap_failure(id int);');
 assert.deepEqual(await bootstrap([...migrationOrder,beforeFailure,failure]),{curated:[beforeFailure,failure],pending:[]});
 assert.deepEqual(await bootstrap([...migrationOrder,beforeFailure,failure]),{curated:[],pending:[]});
 // Legacy pre-tracker schema: run missing curated files instead of marking a
 // blanket baseline that would skip unapplied columns. Data are pre-ownership.
 await reset();
 await stageOnly(beforePrecision);
 await bootstrap(beforePrecision);await query('drop table schema_migrations');
 await query("insert into agency_clients(organization_id,name) select id,'Legacy client preserved' from organizations where slug='scale'");
 await restartConnection();await copy([precision,...economicUpgrade,...workspaceUpgrade,...currentUpgrade]);
 assert.deepEqual(await bootstrap(),{curated:migrationOrder,pending:[]});
 assert.equal((await query("select count(*)::int as n from agency_clients where name='Legacy client preserved'")).rows[0].n,1);
 assert.equal((await query("select numeric_scale from information_schema.columns where table_name='agency_expenses' and column_name='amount'")).rows[0].numeric_scale,2);
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]});
 console.log(`PASS bootstrap: ${migrationOrder.length} curated files fresh/legacy; tracked 110->111 111->114 114->116 and 116->120 upgrades preserve preferences, secondary contacts, ownership.changed, USD100.25, invoices and payouts across restarts; unknown legacy salary dates remain null and economic history stays immutable; future files once; DDL+tracker rollback atomic, no reseeding`);
}finally{await pg.close();await fs.rm(directory,{recursive:true,force:true});if(storage)await fs.rm(storage,{recursive:true,force:true});}
