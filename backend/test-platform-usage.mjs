import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {platformUsage} from './platform-usage.js';

const pg=new PGlite();
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
await pg.exec(await read('./schema.sql'));
await pg.exec(`
 delete from organizations where slug='scale';
 alter table users add column if not exists email_verified_at timestamptz,add column if not exists is_demo_guest boolean not null default false,add column if not exists google_photo_url text,add column if not exists google_full_name text,add column if not exists deleted_at timestamptz,add column if not exists anonymized_at timestamptz;
 alter table organizations add column if not exists demo_owner_user_id bigint,add column if not exists demo_source_id bigint,add column if not exists deleted_at timestamptz,add column if not exists deleted_by_user_id bigint;
 alter table organization_members add column if not exists active boolean not null default true,add column if not exists removed_at timestamptz;
 create table user_personal_identities(user_id bigint primary key,full_name text not null,photo_url text,updated_at timestamptz not null default now());
 create table if not exists organization_subscriptions(organization_id bigint primary key);
 create table if not exists agency_projects(id bigserial primary key,organization_id bigint);
`);
for(const file of ['20260912_platform_admin.sql','20260915_platform_admin_roles.sql','20260910_presence.sql','20261014_usage_indexes.sql','20261014_usage_indexes.sql'])await pg.exec(await read('./migrations/'+file));

const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion'}).format(new Date());
const dayAt=offset=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
await pg.exec(`
 insert into users(id,email,password_hash,email_verified_at,created_at,google_full_name) values
  (1,'owner@a.example','x',now(),'${dayAt(-40)}T12:00:00Z','Ana Dueña'),(2,'platform@scale.example','x',now(),'${dayAt(-60)}T12:00:00Z',null),
  (3,'u3@a.example','x',now(),'${dayAt(-3)}T15:00:00Z',null),(4,'u4@b.example','x',now(),'${dayAt(-2)}T15:00:00Z',null),
  (5,'demo@scale-demo.example.invalid','x',now(),'${dayAt(-2)}T15:00:00Z',null),(6,'nonadmin@a.example','x',now(),now(),null);
 insert into organizations(id,name,slug,created_at) values(10,'Agencia A','agencia-a','${dayAt(-40)}T12:00:00Z'),(20,'Agencia B','agencia-b','${dayAt(-2)}T12:00:00Z'),(30,'Demo','scale-demo-controles-20260908','${dayAt(-2)}T12:00:00Z');
 insert into organization_members(organization_id,user_id,role,active) values(10,1,'owner',true),(10,3,'viewer',true),(20,4,'owner',true),(30,5,'owner',true);
 insert into user_personal_identities(user_id,full_name,photo_url) values(3,'Tres Usuario','https://img.example/u3.webp');
 insert into platform_administrators(user_id) values(2);
`);
const ses=(org,user,key,first,last)=>pg.query('insert into agency_usage_sessions(organization_id,user_id,session_key,first_seen_at,last_seen_at) values($1,$2,$3,$4,$5)',[org,user,key,first,last]);
// Asunción está en UTC-3/-4: 02:00Z siempre cae en el día local anterior.
await ses(10,1,'a',`${dayAt(-1)}T02:00:00Z`,`${dayAt(-1)}T02:30:00Z`); // día local hoy-2
await ses(10,1,'b',`${dayAt(-1)}T15:00:00Z`,`${dayAt(-1)}T15:20:00Z`); // hoy-1
await ses(10,3,'c',`${dayAt(-1)}T15:10:00Z`,`${dayAt(-1)}T15:40:00Z`); // hoy-1
await ses(20,4,'d',`${dayAt(-2)}T15:00:00Z`,`${dayAt(-2)}T15:10:00Z`); // hoy-2
await ses(20,4,'live',new Date(Date.now()-120000),new Date());          // hoy, activo ahora
await ses(10,3,'p1',`${dayAt(-33)}T15:00:00Z`,`${dayAt(-33)}T15:10:00Z`); // período anterior
await ses(10,3,'p2',`${dayAt(-35)}T15:00:00Z`,`${dayAt(-35)}T15:10:00Z`); // período anterior
await ses(30,5,'demo',`${dayAt(-1)}T15:00:00Z`,`${dayAt(-1)}T15:10:00Z`); // Demo: excluida

const db={query:(sql,values)=>pg.query(sql,values)};
async function call(path,{method='GET',actor={id:2,email:'platform@scale.example'}}={}){
 let answer;
 const handled=await platformUsage({req:{method,headers:{}},res:{},url:new URL(path,'https://isolated.invalid'),db,session:async()=>actor,body:async()=>({}),send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
assert.equal((await call('/api/agency/clients')).handled,false,'otras rutas no se tocan');
assert.equal((await call('/api/platform/usage',{actor:null})).status,401,'sin sesión: 401');
assert.equal((await call('/api/platform/usage',{actor:{id:6,email:'nonadmin@a.example'}})).status,403,'no admin: 403');
assert.equal((await call('/api/platform/usage',{actor:{id:2,demo_owner_user_id:2}})).status,403,'Demo: 403');
assert.equal((await call(`/api/platform/usage?from=${dayAt(-200)}&to=${today}`)).status,400,'máximo 180 días');
assert.equal((await call('/api/platform/usage?from=hoy')).status,400);
assert.equal((await call(`/api/platform/usage?from=${today}&to=${dayAt(-5)}`)).status,400);
assert.equal((await call('/api/platform/usage',{method:'POST'})).status,405);

const res=await call('/api/platform/usage');
assert.equal(res.status,200);
const d=res.data;
assert.equal(d.range.days,30);assert.equal(d.range.to,today);assert.equal(d.range.timezone,'America/Asuncion');
assert.equal(d.daily.length,30);assert.equal(d.daily.at(-1).day,today);
const byDay=Object.fromEntries(d.daily.map(row=>[row.day,row]));
assert.equal(byDay[dayAt(-2)].users,2,'02:00Z pertenece al día local anterior: usuarios 1 (a) y 4 (d)');
assert.equal(byDay[dayAt(-2)].sessions,2);
assert.equal(byDay[dayAt(-1)].users,2,'usuarios 1 y 3 en hoy-1; el Demo no cuenta');
assert.equal(byDay[dayAt(-1)].sessions,2);
assert.equal(byDay[today].users,1);
assert.equal(d.totals.unique_users,3);
assert.equal(d.totals.sessions,5);
assert.equal(d.totals.recurring_users,2,'usuarios 1 y 4 con ≥2 días distintos');
assert.equal(d.totals.active_now,1);
assert.equal(d.totals.previous_unique_users,1,'período anterior: solo el usuario 3');
assert.equal(d.daily[0].previous_day,dayAt(-59));assert.equal(d.range.previous_to,dayAt(-30));
assert.equal(d.daily.reduce((sum,row)=>sum+row.previous_users,0),2,'dos días del período anterior con actividad');
const signups=Object.fromEntries(d.signups.map(row=>[row.day,row]));
assert.equal(d.signups.length,30);
assert.equal(signups[dayAt(-3)].users,1);assert.equal(signups[dayAt(-2)].users,1,'el correo demo no es alta real');
assert.equal(signups[dayAt(-2)].agencies,1,'la agencia demo no es alta real');
assert.equal(signups[today].users,1);
assert.equal(d.hourly.length,24);
assert.equal(d.hourly[11].users+d.hourly[12].users,3,'15:00Z cae en 11–12 h locales según horario: usuarios 1, 3 y 4');
assert.equal(d.monthly.length,4);
assert.equal(d.monthly.at(-1).month,new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7));
assert(d.monthly.at(-1).active_users>=1);
assert.equal(d.agencies.length,2,'sin demo');
assert.equal(d.agencies[0].name,'Agencia A');assert.equal(d.agencies[0].active30,2);assert.equal(d.agencies[0].sessions,3);
assert.equal(d.agencies[0].owner.name,'Ana Dueña');assert.equal(d.agencies[0].owner.email,'owner@a.example');
assert.deepEqual(Object.keys(d.agencies[0].owner).sort(),['avatar_url','email','name']);
assert.equal(d.agencies[1].active30,1);assert.equal(d.agencies[1].sessions,2);
assert.deepEqual(d.users.map(user=>user.id),[4,3,1],'orden por último acceso; sin demo ni admin sin sesiones');
const u3=d.users.find(user=>user.id===3);assert.equal(u3.name,'Tres Usuario');assert.equal(u3.avatar_url,'https://img.example/u3.webp');assert.equal(u3.agency,'Agencia A');assert.equal(u3.sessions,1);
for(const row of d.users)assert.deepEqual(Object.keys(row).sort(),['agency','avatar_url','email','id','last_seen_at','name','sessions']);
assert(!/salary|amount|compensation|password/i.test(JSON.stringify(d)),'sin campos sensibles');
const custom=await call(`/api/platform/usage?from=${dayAt(-2)}&to=${dayAt(-1)}`);
assert.equal(custom.data.daily.length,2);assert.equal(custom.data.totals.unique_users,3);
console.log('platform usage ok');
