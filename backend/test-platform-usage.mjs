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
 create table user_personal_identities(user_id bigint primary key,full_name text not null,photo_url text,photo_removed_at timestamptz,updated_at timestamptz not null default now());
 create table agency_user_profiles(user_id bigint,organization_id bigint,full_name text,photo_url text,updated_at timestamptz not null default now(),primary key(user_id,organization_id));
 create table if not exists organization_subscriptions(organization_id bigint primary key);
 create table if not exists agency_projects(id bigserial primary key,organization_id bigint);
`);
for(const file of ['20260912_platform_admin.sql','20260915_platform_admin_roles.sql','20260910_presence.sql','20261014_usage_indexes.sql','20261014_usage_indexes.sql','20261014_organization_logo.sql','20261014_organization_logo.sql'])await pg.exec(await read('./migrations/'+file));

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
assert.equal((await call('/api/platform/usage',{actor:null})).status,404,'sin sesión: 404 genérico (no confirma que el panel existe)');
assert.equal((await call('/api/platform/usage',{actor:{id:6,email:'nonadmin@a.example'}})).status,404,'no admin: 404 genérico');
assert.equal((await call('/api/platform/usage',{actor:{id:2,demo_owner_user_id:2}})).status,404,'Demo: 404 genérico');
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
// La hora local de 15:00Z se calcula (11 o 12 según el horario). Sumar 11+12 fallaba
// cuando el test corría entre las 11:00 y las 12:59 de Asunción: la sesión «live»
// del usuario 4 caía en la otra franja y lo contaba dos veces.
const hourOf15z=Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/Asuncion',hour:'2-digit',hourCycle:'h23'}).format(new Date(`${dayAt(-1)}T15:00:00Z`)));
assert.equal(d.hourly[hourOf15z].users,3,'15:00Z cae en la misma hora local para los usuarios 1, 3 y 4');
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
// Fotos del panel global: identidad personal → foto de perfil en una empresa real → Google;
// la foto quitada (tombstone) no revive la de Google. Logo de agencia directo, con tope.
await pg.exec(`
 insert into agency_user_profiles(user_id,organization_id,full_name,photo_url,updated_at) values(1,10,'Ana','https://img.example/ana-perfil.webp',now()),(1,30,'Ana demo','https://img.example/ana-demo.webp',now()+interval '1 day');
 update users set google_photo_url='https://lh.example/u4.jpg' where id=4;
 update users set google_photo_url='https://lh.example/u3.jpg' where id=3;
 update user_personal_identities set photo_url=null,photo_removed_at=now() where user_id=3;
 update organizations set logo_url='https://img.example/logo-a.webp' where id=10;
 update organizations set logo_url='data:image/webp;base64,'||repeat('A',300000) where id=20;
`);
const photos=(await call('/api/platform/usage')).data;
assert.equal(photos.agencies.find(row=>row.id===10).owner.avatar_url,'https://img.example/ana-perfil.webp','sin identidad personal: la foto de perfil más reciente de una empresa real (no la del demo)');
assert.equal(photos.users.find(row=>row.id===1).avatar_url,'https://img.example/ana-perfil.webp');
assert.equal(photos.users.find(row=>row.id===4).avatar_url,'https://lh.example/u4.jpg','solo foto de Google: se usa la de Google');
assert.equal(photos.agencies.find(row=>row.id===20).owner.avatar_url,'https://lh.example/u4.jpg');
assert.equal(photos.users.find(row=>row.id===3).avatar_url,null,'la foto quitada no vuelve desde Google');
assert.equal(photos.agencies.find(row=>row.id===10).logo_url,'https://img.example/logo-a.webp','el logo de la agencia viaja al panel global');
assert.equal(photos.agencies.find(row=>row.id===20).logo_url,null,'un logo de 300 KB o más no viaja en el listado');
const custom=await call(`/api/platform/usage?from=${dayAt(-2)}&to=${dayAt(-1)}`);
assert.equal(custom.data.daily.length,2);assert.equal(custom.data.totals.unique_users,3);
// Regresión (índices de uso): cada filtro por día local lleva un rango sargable sobre la
// columna cruda. Quitarlo (marcadores /*idx:...*/) no cambia ni un dato de la respuesta,
// y con el rango el plan puede usar los índices de 20261014_usage_indexes.
async function callWith(database,path){
 let answer;
 await platformUsage({req:{method:'GET',headers:{}},res:{},url:new URL(path,'https://isolated.invalid'),db:database,session:async()=>({id:2,email:'platform@scale.example'}),body:async()=>({}),send:(_r,status,data)=>{answer={status,data};}});
 return answer;
}
const captured=[];
const indexedDb={query:(sql,values)=>{captured.push({sql,values});return pg.query(sql,values);}};
const unindexedDb={query:(sql,values)=>pg.query(sql.replace(/\/\*idx:start\*\/[^]*?\/\*idx:end\*\//g,''),values)};
for(const path of ['/api/platform/usage',`/api/platform/usage?from=${dayAt(-2)}&to=${dayAt(-1)}`,`/api/platform/usage?from=${dayAt(-1)}&to=${dayAt(-1)}`,`/api/platform/usage?from=${dayAt(-179)}&to=${today}`]){
 const [withRange,withoutRange]=[await callWith(indexedDb,path),await callWith(unindexedDb,path)];
 assert.equal(withRange.status,200);
 assert.deepEqual(withRange.data,withoutRange.data,'the sargable range keeps the response identical for '+path);
}
// El sondeo «¿la fuente tiene datos?» es un exists sin período (corta en la primera fila)
// y el guard relee al usuario por id (clave primaria): ninguno de los dos filtra por fecha.
const usageQueries=captured.filter(({sql})=>/agency_usage_sessions|from users u|from organizations o/.test(sql)&&!sql.includes('/*fuente:has_data*/')&&!sql.includes('/*platform-gate*/'));
assert.ok(usageQueries.length&&usageQueries.every(({sql})=>sql.includes('/*idx:start*/')),'every usage query carries a raw-column range');
await pg.exec('set enable_seqscan=off');
const daily=captured.find(({sql})=>/count\(ev\.user_id\)::int as sessions/.test(sql));
const plan=(await pg.query('explain '+daily.sql,daily.values)).rows.map(row=>row['QUERY PLAN']).join('\n');
assert.match(plan,/Index Scan on agency_usage_first_seen[^]*?Index Cond: \(\(first_seen_at >=/,'daily sessions can use the first_seen_at index');
const signupPlan=captured.find(({sql})=>/as agencies\s+from generate_series/.test(sql));
assert.match((await pg.query('explain '+signupPlan.sql,signupPlan.values)).rows.map(row=>row['QUERY PLAN']).join('\n'),/users_created_at_idx/,'daily signups can use the users created_at index');
await pg.exec('reset enable_seqscan');
// Regresión: las sesiones y el último acceso por agencia excluyen a los usuarios demo
// (invitados del Demo o correos demo), igual que activos 7/30 días y el resto del panel.
{
 const before=(await call('/api/platform/usage')).data.agencies.find(row=>row.id===10);
 await pg.exec(`
  insert into users(id,email,password_hash,email_verified_at,is_demo_guest) values(7,'guest@a.example','x',now(),true),(8,'visita@demo.example.invalid','x',now(),false);
  insert into organization_members(organization_id,user_id,role,active) values(10,7,'viewer',true),(10,8,'viewer',true);
 `);
 await ses(10,7,'guest',new Date(Date.now()-60000),new Date());
 await ses(10,8,'visita',`${dayAt(-1)}T16:00:00Z`,new Date(Date.now()+60000));
 const after=(await call('/api/platform/usage')).data.agencies.find(row=>row.id===10);
 assert.equal(after.sessions,before.sessions,'demo sessions do not count in the agency sessions');
 assert.equal(new Date(after.last_seen_at).getTime(),new Date(before.last_seen_at).getTime(),'demo sessions do not move the agency last access');
 assert.equal(after.active30,before.active30);
}
console.log('platform usage ok');
