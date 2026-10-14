import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {platformMetrics,platformMetricsData} from './platform-metrics.js';
import {period,parseDay,periodFromQuery,todayAsuncion} from './platform-period.js';

// Métricas honestas del Resumen (guía §3): período anterior de igual duración,
// días de Asunción, sin demos (ni siquiera como contador) y «sin datos todavía» cuando la fuente está vacía.
const read=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8');

// ── Períodos (lógica pura) ─────────────────────────────────────────────────
assert.equal(todayAsuncion(new Date('2026-10-14T02:30:00Z')).toISOString().slice(0,10),'2026-10-13','02:30Z todavía es el día anterior en Asunción');
const week=period(parseDay('2026-10-08','from'),parseDay('2026-10-14','to'));
assert.deepEqual(week.range,{from:'2026-10-08',to:'2026-10-14',days:7,previous_from:'2026-10-01',previous_to:'2026-10-07',timezone:'America/Asuncion'},'el período anterior tiene la misma duración');
const september=period(parseDay('2026-09-01','from'),parseDay('2026-09-30','to'));
assert.equal(september.range.previous_from,'2026-08-02','«mes anterior» (30 días) se compara con los 30 días previos');
assert.throws(()=>periodFromQuery(new URLSearchParams('from=2026-10-10&to=2026-10-01')),/rango es inválido/);
assert.throws(()=>periodFromQuery(new URLSearchParams('from=2026-01-01&to=2026-10-01')),/máximo/);
assert.throws(()=>periodFromQuery(new URLSearchParams('from=2026-02-30&to=2026-03-01')),/no es una fecha válida/);

// ── Base ───────────────────────────────────────────────────────────────────
const pg=new PGlite();
await pg.exec(read('./schema.sql'));
for(const file of migrationOrder)await pg.exec(read('./migrations/'+file));
await pg.exec("truncate organizations,users restart identity cascade;");
const db={query:(sql,values)=>pg.query(sql,values)};
const P=period(parseDay('2026-10-08','from'),parseDay('2026-10-14','to'));

// Sin filas reales: cada indicador declara has_data=false (el panel dice «Sin datos todavía»).
const empty=await platformMetricsData(db,P);
for(const [key,kpi] of Object.entries(empty.kpis)){
 assert.equal(kpi.has_data,false,`${key}: fuente vacía`);
 assert.equal(kpi.value,0);assert.equal(kpi.series.length,7,`${key}: una posición por día del período`);
}
assert.deepEqual(empty.days,['2026-10-08','2026-10-09','2026-10-10','2026-10-11','2026-10-12','2026-10-13','2026-10-14']);

await pg.exec(`
 insert into users(id,email,password_hash,email_verified_at,created_at,is_demo_guest) values
  (1,'ana@real.example','!',now(),'2026-10-09T15:00:00Z',false),
  (2,'beto@real.example','!',now(),'2026-10-09T02:30:00Z',false),
  (3,'previo@real.example','!',now(),'2026-10-03T15:00:00Z',false),
  (4,'persona@scale-demo.example.invalid','!',now(),'2026-10-10T15:00:00Z',false),
  (5,'visitante@demo.example.invalid','!',now(),'2026-10-10T15:00:00Z',true),
  (6,'borrado@real.example','!',now(),'2026-10-10T15:00:00Z',false);
 update users set deleted_at=now() where id=6;
 insert into organizations(id,name,slug,created_at) values
  (10,'Agencia Real','agencia-real','2026-10-12T15:00:00Z'),
  (11,'Agencia Previa','agencia-previa','2026-10-02T15:00:00Z'),
  (12,'Demo','scale-demo-controles-20260908','2026-10-12T15:00:00Z'),
  (13,'AgenciaPrueba','agencia-prueba','2026-10-12T15:00:00Z');
 insert into organizations(id,name,slug,created_at,demo_owner_user_id,demo_source_id,demo_expires_at) values(14,'Demo privada','demo-privada','2026-10-13T15:00:00Z',4,10,now()+interval '1 day');
 insert into organization_members(organization_id,user_id,role) values(10,1,'owner'),(10,2,'viewer'),(11,3,'owner'),(12,4,'owner'),(14,5,'owner');
 insert into agency_usage_sessions(organization_id,user_id,session_key,first_seen_at,last_seen_at) values
  (10,1,'a','2026-10-09T15:00:00Z','2026-10-09T15:30:00Z'),
  (10,1,'b','2026-10-10T15:00:00Z','2026-10-10T15:30:00Z'),
  (10,2,'c','2026-10-11T02:30:00Z','2026-10-11T03:00:00Z'),
  (11,3,'p','2026-10-05T15:00:00Z','2026-10-05T15:10:00Z'),
  (12,4,'d','2026-10-10T15:00:00Z','2026-10-10T15:10:00Z'),
  (10,4,'e','2026-10-10T16:00:00Z','2026-10-10T16:10:00Z');
 insert into platform_inquiries(name,company,email,created_at) values('Carla','Estudio','carla@example.com','2026-10-14T12:00:00Z'),('Dani','Otro','dani@example.com','2026-10-01T12:00:00Z');
`);
const data=await platformMetricsData(db,P);
const k=data.kpis;
// 2026-10-09T02:30Z es el 8-oct a las 23:30 en Asunción: el día se agrupa en hora local.
assert.deepEqual(k.users,{value:2,previous:1,series:[1,1,0,0,0,0,0],has_data:true},'usuarios reales nuevos por día de Asunción, sin demos ni eliminados');
assert.deepEqual(k.agencies,{value:1,previous:1,series:[0,0,0,0,1,0,0],has_data:true},'agencias reales nuevas; demos, controles y AgenciaPrueba quedan afuera');
assert.deepEqual(k.sessions,{value:3,previous:1,series:[0,1,2,0,0,0,0],has_data:true},'sesiones reales (la de las 02:30Z cuenta en el día local anterior)');
assert.deepEqual(k.active_users,{value:2,previous:1,series:[0,1,2,0,0,0,0],has_data:true},'activos distintos del período (no la suma de los días)');
assert.deepEqual(k.inquiries,{value:1,previous:1,series:[0,0,0,0,0,0,1],has_data:true});
assert.deepEqual(k.redemptions,{value:0,previous:0,series:[0,0,0,0,0,0,0],has_data:false},'sin canjes reales todavía: has_data=false, nunca un cero inventado');
assert.equal('demo' in data,false,'el Resumen no expone actividad demo (vive en «Tráfico y demos»)');
assert.equal(JSON.stringify(data).includes('scale-demo'),false);

// HTTP: solo GET y siempre detrás del guard.
await pg.exec("insert into users(id,email,password_hash,email_verified_at,created_at) values(50,'admin@scale.example','!',now(),'2025-01-01T12:00:00Z'); insert into platform_administrators(user_id,role) values(50,'viewer');");
async function call(path,{method='GET',actor={id:50,email:'admin@scale.example'}}={}){
 let answer=null;
 const handled=await platformMetrics({req:{method,headers:{}},res:{},url:new URL(path,'https://isolated.invalid'),db,session:async()=>actor,body:async()=>({}),send:(_r,status,body)=>{answer={status,body};}});
 return {handled,...answer};
}
assert.equal((await call('/api/platform/usage')).handled,false,'otras rutas no se tocan');
const ok=await call('/api/platform/metrics?from=2026-10-08&to=2026-10-14');
assert.equal(ok.status,200);assert.deepEqual(ok.body.kpis.users,k.users,'el endpoint devuelve las mismas métricas');
assert.equal((await call('/api/platform/metrics?from=2026-10-08&to=2026-10-14',{method:'POST'})).status,405);
assert.equal((await call('/api/platform/metrics',{actor:null})).status,404,'sin sesión: 404 genérico');
assert.equal((await call('/api/platform/metrics',{actor:{id:1,email:'ana@real.example'}})).status,404,'dueño de agencia: 404 genérico');
assert.equal((await call('/api/platform/metrics?from=2026-10-14&to=2026-10-01')).status,400,'rango inválido');
console.log('platform metrics ok');
