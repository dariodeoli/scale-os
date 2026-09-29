// Ventanas de las listas largas de Plataforma (#106): Actividad, Papelera e
// Historial pagan de a páginas con `?limit`/`?offset`, informan el total real y
// si queda más; sin parámetros el contrato anterior sigue funcionando.
// PGlite only; sin red ni servidor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {suite} from './agency-suite.js';
import {recordLifecycle} from './record-lifecycle.js';
import {productivity} from './productivity.js';

const pg=new PGlite();
await pg.exec(await fs.readFile('schema.sql','utf8'));
for(const name of migrationOrder)await pg.exec(await fs.readFile('migrations/'+name,'utf8'));
const query=(sql,args)=>pg.query(sql,args);
const client={query,release(){}};
const db={query,connect:async()=>client};
const insert=async(sql,args)=>(await query(sql+' returning id',args)).rows[0].id;

const org=await insert("insert into organizations(slug,name) values('windows-a','Agencia Ventanas')");
const user=await insert("insert into users(email,password_hash) values('windows@agency.test','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,user]);
const asUser={id:user,organization_id:org,role:'owner'};

async function call(handler,path,as=asUser,method='GET',payload={}){
 let result;
 const handled=await handler({req:{method,socket:{remoteAddress:'windows-test'}},res:{},url:new URL('https://test'+path),db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>{result={status,...data};}});
 assert.equal(handled,true,`el handler reconoce ${path}`);
 return result;
}

// Papelera: ventana + total + tipos contados por el API (dos tipos archivados).
const archivedClient=await insert("insert into agency_clients(organization_id,name) values($1,'Cliente archivado')",[org]);
const archivedProject=await insert("insert into agency_projects(organization_id,client_id,name) values($1,$2,'Proyecto archivado')",[org,archivedClient]);
await query("insert into agency_archived_records(organization_id,kind,record_id,removed_by) values($1,'clients',$2,$3),($1,'projects',$4,$3)",[org,archivedClient,user,archivedProject]);

// Veinticinco movimientos auditados extra (más los disparadores del setup).
await query(`insert into agency_operation_audit(organization_id,table_name,action,actor,after_state,before_state)
 select $1,'agency_work_orders','UPDATE',null,jsonb_build_object('id',n,'status','approved','title','Pieza '||n),jsonb_build_object('status','review') from generate_series(1,25) n`,[org]);
const auditTotal=Number((await query('select count(*)::int as n from agency_operation_audit where organization_id=$1',[org])).rows[0].n);
const historyTotal=Number((await query("select count(*)::int as n from agency_operation_audit where organization_id=$1 and table_name in ('agency_work_orders','agency_projects','agency_order_comments','agency_project_comments','agency_internal_tasks')",[org])).rows[0].n);
assert.ok(auditTotal>=25&&historyTotal>=25,'el setup deja movimientos auditados');

// Actividad: página de 20 + total + hasMore, y el contrato previo sin parámetros.
const activity1=await call(suite,'/api/agency/activity?limit=20&offset=0');
assert.equal(activity1.status,200);assert.equal(activity1.records.length,20);assert.equal(activity1.total,auditTotal);assert.equal(activity1.page.hasMore,true,'la primera página anuncia que queda más');
const activity2=await call(suite,'/api/agency/activity?limit=20&offset=20');
assert.equal(activity2.records.length,auditTotal-20);assert.equal(activity2.page.hasMore,false,'la última página no anuncia más');
assert.equal(new Set(activity1.records.map(row=>row.id).concat(activity2.records.map(row=>row.id))).size,auditTotal,'las páginas no repiten ni pierden filas');
for(const bad of ['limit=0','limit=101','limit=abc','offset=-1','offset=abc'])
 assert.equal((await call(suite,'/api/agency/activity?'+bad)).status,400,`${bad} se rechaza`);
const activityLegacy=await call(suite,'/api/agency/activity');
assert.equal(activityLegacy.status,200);assert.ok(activityLegacy.records.length<=100,'sin parámetros mantiene el tope histórico de 100');assert.equal(activityLegacy.total,auditTotal);
const trash1=await call(recordLifecycle,'/api/agency/trash?limit=1&offset=0');
assert.equal(trash1.status,200);assert.equal(trash1.records.length,1);assert.equal(trash1.total,2);assert.equal(trash1.kinds,2,'los tipos se cuentan sobre toda la papelera, no solo la página');assert.equal(trash1.page.hasMore,true);
const trash2=await call(recordLifecycle,'/api/agency/trash?limit=1&offset=1');
assert.equal(trash2.records.length,1);assert.equal(trash2.page.hasMore,false);
const trashLegacy=await call(recordLifecycle,'/api/agency/trash');
assert.equal(trashLegacy.records.length,2);assert.equal(trashLegacy.total,2);assert.equal(trashLegacy.kinds,2);
assert.equal((await call(recordLifecycle,'/api/agency/trash?limit=0')).status,400);

// Historial: la ventana ya existía (10/50/100) y ahora informa el total.
const history1=await call(productivity,'/api/agency/productivity/history?limit=10&offset=0');
assert.equal(history1.status,200);assert.equal(history1.records.length,10);assert.equal(history1.page.total,historyTotal);assert.equal(history1.page.hasMore,true);
const historyLast=await call(productivity,'/api/agency/productivity/history?limit=10&offset='+Math.floor(historyTotal/10)*10);
assert.equal(historyLast.records.length,historyTotal%10||10);assert.equal(historyLast.page.hasMore,false);assert.equal(historyLast.page.total,historyTotal);
assert.equal((await call(productivity,'/api/agency/productivity/history?limit=5')).status,400,'los tamaños de página siguen acotados');
const sourceEvents=await call(productivity,'/api/agency/productivity/source-events?limit=10&offset=0');
assert.equal(sourceEvents.status,200);assert.equal(sourceEvents.page.total,0);assert.equal(sourceEvents.page.hasMore,false);

await pg.close();
console.log('PASS: ventanas de Actividad/Papelera/Historial — páginas sin repetir ni perder filas, total honesto, hasMore, tipos de la papelera sobre el total y contrato previo sin parámetros');
