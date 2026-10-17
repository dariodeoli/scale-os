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
const beforePrecision=migrationOrder.filter(file=>file!==precision);
assert.equal(migrationOrder.at(-1),precision);
async function copy(files){for(const file of files)await fs.writeFile(path.join(directory,file),await read('migrations/'+file));}
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
 const tables=['users','organization_members','agency_user_profiles','agency_clients','agency_projects','agency_inventory','agency_inventory_trace'];
 const result={};for(const table of tables)result[table]=(await query(`select * from ${table} order by 1,2`)).rows;
 result.expenses=(await query('select id,amount::numeric(22,2)::text as amount,currency,reference from agency_expenses order by id')).rows;
 result.accounts=(await query('select id,balance::text from bank_accounts order by id')).rows;
 result.audit=(await query('select * from agency_operation_audit order by id')).rows;
 return result;
}
async function reset(){await run('drop schema public cascade; create schema public;');}
try{
 // Fresh install records each curated file, then restarts with real modern data.
 await copy(migrationOrder);
 assert.deepEqual(await bootstrap(),{curated:migrationOrder,pending:[]});
 await populated('100.25');
 const freshState=await snapshot(),freshTracker=(await query('select * from schema_migrations order by filename')).rows;
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]});
 assert.deepEqual(await snapshot(),freshState,'restart never changes USD cents, inventory trace, identity or seeds');
 assert.deepEqual((await query('select * from schema_migrations order by filename')).rows,freshTracker);
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]},'second restart is also empty');
 // Upgrade an existing tracked 110-file installation. The newer trace makes
 // historical enum replay provably invalid; preserve it instead of relaxing it.
 await reset();await fs.rm(path.join(directory,precision));
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
 assert.deepEqual(await bootstrap(),{curated:[precision],pending:[future]},'only precision upgrade and unlisted future migration execute');
 assert.deepEqual(await snapshot(),oldState,'upgrade preserves every historical row');
 assert.deepEqual((await query('select * from schema_migrations where filename<>$1 and filename<>$2 order by filename',[precision,future])).rows,oldTracker,'old tracker timestamps stay untouched');
 await query("insert into agency_expenses(organization_id,account_id,category,amount,currency,created_by_user_id) values($1,$2,'USD cents',100.25,'USD',$3)",[old.org,old.account,old.uid]);
 const upgraded=await snapshot();
 for(let restart=0;restart<2;restart++)assert.deepEqual(await bootstrap(),{curated:[],pending:[]});
 assert.deepEqual(await snapshot(),upgraded);
 assert.equal((await query("select amount::text as amount from agency_expenses where category='USD cents'")).rows[0].amount,'100.25');
 assert.equal((await query('select count(*)::int as n from bootstrap_future')).rows[0].n,1,'future migration executes once');
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
 for(const file of [future,beforeFailure,failure])await fs.rm(path.join(directory,file));
 await fs.rm(path.join(directory,precision));
 await bootstrap(beforePrecision);await query('drop table schema_migrations');
 await query("insert into agency_clients(organization_id,name) select id,'Legacy client preserved' from organizations where slug='scale'");
 await restartConnection();await copy([precision]);
 assert.deepEqual(await bootstrap(),{curated:migrationOrder,pending:[]});
 assert.equal((await query("select count(*)::int as n from agency_clients where name='Legacy client preserved'")).rows[0].n,1);
 assert.equal((await query("select numeric_scale from information_schema.columns where table_name='agency_expenses' and column_name='amount'")).rows[0].numeric_scale,2);
 assert.deepEqual(await bootstrap(),{curated:[],pending:[]});
 console.log(`PASS bootstrap: ${migrationOrder.length} curated files fresh/legacy; tracked 110 upgrade runs only111, preserves ownership.changed and USD100.25 across two restarts; future files once; DDL+tracker rollback atomic, no reseeding`);
}finally{await pg.close();await fs.rm(directory,{recursive:true,force:true});if(storage)await fs.rm(storage,{recursive:true,force:true});}
