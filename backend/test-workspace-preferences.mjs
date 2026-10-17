import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {workspacePreferences} from './workspace-preferences.js';
const pg=new PGlite();
await pg.exec(`create table organizations(id bigint primary key,active boolean default true);
create table users(id bigint primary key);
create table organization_members(organization_id bigint references organizations on delete cascade,user_id bigint references users on delete cascade,role text,active boolean default true,removed_at timestamptz,primary key(organization_id,user_id));
create table agency_clients(id bigint primary key,organization_id bigint references organizations);
insert into organizations(id) values(1),(2),(3);insert into users values(10),(11);
insert into organization_members(organization_id,user_id,role) values(1,10,'owner'),(2,10,'viewer'),(1,11,'editor'),(3,10,'owner');
insert into agency_clients values(100,1),(200,2);`);
const migration=await fs.readFile(new URL('./migrations/20261018_workspace_preferences.sql',import.meta.url),'utf8');await pg.exec(migration);await pg.exec(migration);
const query=(sql,params)=>pg.query(sql,params),db={connect:async()=>({query,release(){}})},self={id:'10',organization_id:'1',role:'owner'};
async function call(user=self,method='GET',payload={},headers={},database=db){let response;const handled=await workspacePreferences({req:{method,headers:{'x-scale-preference-scope':`${user?.id}:${user?.organization_id}`,...headers}},res:{},url:new URL('https://test/api/agency/workspace-preferences'),db:database,session:async()=>user,body:async()=>payload,send:(_,status,data)=>{response={status,...data};}});assert.equal(handled,true);return response;}
try{
 assert.equal((await call(null)).status,401);assert.equal((await call({...self,role:'unknown'})).status,403);
 assert.equal((await call({...self,organization_id:'2'},'GET',{}, {'x-scale-preference-scope':'10:1'})).status,409);assert.equal((await call(self,'POST')).status,405);
 assert.deepEqual((await call()).preferences,{version:1,startup:'summary',production:{clientId:'',mine:false,week:false}});assert.equal((await call()).stored,false);
 for(const invalid of [null,[],{}, {organization_id:'2'}, {user_id:'11'},{startup:'https://evil.invalid'},{version:2},{production:null},{production:{mine:'true'}},{production:{week:1}},{production:{clientId:100}},{production:{clientId:'-1'}},{production:{clientId:'9223372036854775808'}},{production:{other:true}},{notes:'x'.repeat(1100)}])assert.equal((await call(self,'PATCH',invalid)).status,400,JSON.stringify(invalid));
 assert.equal((await call(self,'PATCH',{production:{clientId:'200'}})).status,400);assert.equal((await call()).stored,false,'failed validation creates no defaults row');
 assert.equal((await call(self,'PATCH',{startup:'production',production:{clientId:'100',mine:true}},{'if-none-match':'*'})).status,200);
 assert.equal((await call(self,'PATCH',{startup:'my-day'},{'if-none-match':'*'})).status,412);assert.equal((await call()).preferences.startup,'production','conditional import cannot overwrite winning device');
 assert.equal((await call(self,'PATCH',{production:{week:true}})).status,200);assert.deepEqual((await call()).preferences.production,{clientId:'100',mine:true,week:true});
 assert.equal((await call({...self,id:'11'})).preferences.startup,'summary');assert.equal((await call({...self,organization_id:'2'})).preferences.startup,'summary');
 assert.equal((await call({...self,organization_id:'2'},'PATCH',{startup:'my-day'})).status,200);assert.equal((await call()).preferences.startup,'production');
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','collaborator'])assert.equal((await call({...self,role},'PATCH',{startup:'summary'})).status,200,role);
 await query('update organization_members set active=false where organization_id=1 and user_id=10');assert.equal((await call()).status,403);assert.equal((await call(self,'PATCH',{startup:'my-day'})).status,403);await query('update organization_members set active=true where organization_id=1 and user_id=10');
 assert.equal((await call({...self,organization_id:'3',demo_owner_user_id:'10'},'PATCH',{startup:'my-day'})).status,200);assert.equal((await call()).preferences.startup,'summary');
 await query('delete from agency_clients where id=100');assert.equal((await call()).preferences.production.clientId,'');
 const failure=await call(self,'PATCH',{startup:'my-day'},{},{connect:async()=>{throw Error('database fixture unavailable');}});assert.equal(failure.status,500);assert.doesNotMatch(failure.error,/fixture unavailable/);
 await query('delete from organization_members where organization_id=2 and user_id=10');assert.equal((await query('select count(*)::int n from agency_workspace_preferences where organization_id=2')).rows[0].n,0);
 await query('delete from users where id=10');assert.equal((await query('select count(*)::int n from agency_workspace_preferences')).rows[0].n,0);
 console.log('PASS workspace preferences: reentrant schema, strict inputs, own user+tenant, active membership, roles, demo isolation, conditional legacy import, partial merge, deleted clients, safe errors and FK cleanup');
}finally{await pg.close();}
