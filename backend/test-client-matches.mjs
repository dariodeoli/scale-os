import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {clientMatches,CLIENT_MATCH_RATE} from './client-matches.js';
const pg=new PGlite();
try{
 await pg.exec(`create table agency_clients(id bigserial primary key,organization_id bigint not null,name text not null,logo_url text,email text,phone text,tax_id text,active boolean default true,lifecycle_status text,personal_data_blocked_at timestamptz);
 create table agency_archived_records(organization_id bigint,kind text,record_id bigint);
 create table auth_throttles(key text primary key,count integer not null default 1,expires_at timestamptz not null);`);
 const user={id:'7',organization_id:'11',role:'owner'};let actor=user,reads=0;const queryLog=[];
 const db={query:async(sql,args)=>{queryLog.push({sql,args});if(sql.includes('from agency_clients'))reads++;return pg.query(sql,args);}};
 let count=0;
 async function call(payload,current=user,method='POST',path='/api/agency/clients/matches'){
  actor=current;let result;
  const handled=await clientMatches({req:{method},res:{},url:new URL(path,'https://test.invalid'),db,session:async()=>actor,body:async()=>payload,send:(_res,status,data)=>{result={status,...data};}});
  count++;return {handled,...result};
 }
 const insert=async(org,name,extra={})=>(await pg.query('insert into agency_clients(organization_id,name,email,phone,tax_id,logo_url,personal_data_blocked_at) values($1,$2,$3,$4,$5,$6,$7) returning id',[org,name,extra.email??'shared@example.invalid',extra.phone??'+595 981123456',extra.tax_id??'80168807-8',extra.logo_url??null,extra.blocked??null])).rows[0].id;
 const first=await insert(11,'Cliente propio',{logo_url:'https://assets.example.invalid/logo.webp'});
 await insert(12,'Cliente privado de otra empresa');
 await insert(11,'Cliente bloqueado PDP',{blocked:'2026-10-17T00:00:00Z'});
 const deleted=await insert(11,'Cliente en papelera');await pg.query("insert into agency_archived_records values(11,'clients',$1)",[deleted]);
 for(const [kind,value] of [['tax_id','80.168.807-8'],['email',' SHARED@EXAMPLE.INVALID '],['phone','+595 0981 123 456']]){
  const response=await call({kind,value});assert.equal(response.status,200);assert.equal(response.matches.length,1);const row=response.matches[0];
  assert.equal(row.id,String(first));assert.deepEqual(Object.keys(row).sort(),['id','logo_url','name','secondary','state']);assert.match(row.secondary,/^Mismo /);assert.equal(JSON.stringify(response).includes('shared@example'),false);
 }
 assert.equal((await call({kind:'tax_id',value:'80168807'})).matches.length,0,'sin DV no se infiere coincidencia con un RUC que sí tiene DV');
 assert.equal((await call({kind:'email',value:'no-existe@example.invalid'})).matches.length,0);
 assert.equal((await call({kind:'email',value:'shared@example.invalid'},{...user,organization_id:'12'})).matches[0].name,'Cliente privado de otra empresa');
 const before=reads;
 assert.equal((await call({kind:'email',value:'shared@example.invalid'},null)).status,401);
 assert.equal((await call({kind:'email',value:'shared@example.invalid'},{...user,role:'viewer'})).status,403);
 assert.equal((await call({kind:'email',value:'shared@example.invalid'},{...user,role:'sales',capabilities:{'clients.manage':false}})).status,403);
 assert.equal((await call({kind:'email',value:'shared@example.invalid'},{...user,organization_id:null})).status,403);
 assert.equal(reads,before,'denegados no consultan clientes');
 for(const payload of [{kind:'users',value:'shared@example.invalid'},{kind:'email',value:'bad'}, {kind:'phone',value:'123'}, {kind:'tax_id',value:'x'}, {kind:'email',value:'shared@example.invalid',organizationId:12},null])assert.equal((await call(payload)).status,400);
 assert.equal((await call({},user,'GET')).status,405);
 assert.equal((await call({},user,'POST','/api/agency/clients')).handled,false);
 for(let i=0;i<15;i++)await insert(11,`Compartido ${i}`);
 const many=await call({kind:'email',value:'shared@example.invalid'});assert.equal(many.matches.length,10,'límite fijo sin paginación enumeradora');
 assert.equal((await pg.query('select count(*)::int as n from agency_clients')).rows[0].n,19,'búsqueda no crea ni modifica clientes');
 const limited={...user,id:'100'};
 for(let i=0;i<CLIENT_MATCH_RATE;i++)assert.equal((await call({kind:'email',value:'shared@example.invalid'},limited)).status,200);
 const readsBeforeLimit=reads;assert.equal((await call({kind:'email',value:'shared@example.invalid'},limited)).status,429);assert.equal(reads,readsBeforeLimit);
 assert(queryLog.filter(entry=>entry.sql.includes('from agency_clients')).every(entry=>entry.sql.includes('organization_id=$1')&&entry.sql.includes('personal_data_blocked_at')&&!entry.sql.includes('shared@example')));
 const source=await readFile(new URL('./server.js',import.meta.url),'utf8');const matchIndex=source.indexOf('if(await clientMatches(');assert(matchIndex>=0&&matchIndex<source.indexOf('if(await suite('),'matches intercepta antes de Suite genérico');
 console.log(`PASS client matches: ${count} llamadas, aislamiento tenant/permisos/PDP/papelera, normalización exacta sin inferir DV, respuesta mínima10, rate-limit previo a lectura y cero efectos comerciales.`);
}finally{await pg.close();}
