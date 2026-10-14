// Analítica de primera parte (landing y demo) y panel global «Tráfico y demos».
// Sin red: PGlite. Cubre reglas puras, el endpoint collect (lista cerrada, límites,
// privacidad), el guard del panel, los días de Asunción y la separación de demo.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Readable} from 'node:stream';
import {PGlite} from '@electric-sql/pglite';
import {ANALYTICS_LIMITS,ANALYTICS_MAX_SECONDS,analyticsPath,analyticsRange,clampScroll,clampSeconds,dailyHash,demoVisitor,parseAnalyticsEvent,referrerDomain} from './public-analytics-core.js';
import {publicAnalytics,recordDemoEvent} from './public-analytics.js';
import {platformTraffic} from './platform-traffic.js';
import {analiticaSinDemo,analiticaSoloDemo,realOrganization} from './platform-demo-filter.js';

const throws=(fn,status=400)=>assert.throws(fn,error=>error.status===status);

// ── Reglas puras ─────────────────────────────────────────────────────────────
assert.equal(analyticsPath('/','landing'),'/');
assert.equal(analyticsPath('/Scale-OS.html','landing'),'/scale-os.html');
assert.equal(analyticsPath('/clientes/12345/editar','landing'),'/clientes/:id/editar','ids numéricos fuera de la ruta');
assert.equal(analyticsPath('/p/3f2a9c0e-1b2c-4d5e-8f90-123456789abc','landing'),'/p/:id','uuids fuera de la ruta');
assert.equal(analyticsPath('/produccion/proyecto/99','demo'),'/produccion','en la demo solo cuenta la sección');
for(const path of ['/?token=1','/#hash','//evil.com','https://evil.com/','x','',' /','/a b','/%2e%2e','/a\\b',123,null,'/'+'a'.repeat(201)])throws(()=>analyticsPath(path,'landing'));
assert.equal(referrerDomain('https://www.Google.com/search?q=secreto'),'google.com','solo el dominio, sin query');
assert.equal(referrerDomain('l.instagram.com'),'l.instagram.com');
for(const value of ['http://127.0.0.1:8080/x','localhost','https://intranet.local/','10.0.0.1','',null,undefined])assert.equal(referrerDomain(value),null,String(value));
throws(()=>referrerDomain(42));
assert.equal(clampSeconds(5000),ANALYTICS_MAX_SECONDS,'pestañas olvidadas se recortan a 30 min');
assert.equal(clampSeconds(12.4),12);throws(()=>clampSeconds(-1));throws(()=>clampSeconds(NaN));throws(()=>clampSeconds('10'));
assert.equal(clampScroll(100),100);throws(()=>clampScroll(101));
const visitor='abcdefghij0123456789',view='view0001';
assert.deepEqual(parseAnalyticsEvent({event:'page_view',surface:'landing',path:'/',visitor,view,referrer:'https://www.facebook.com/x?fbclid=1',mobile:true}),{event:'page_view',surface:'landing',path:'/',visitor,view,referrer:'facebook.com',mobile:true});
assert.deepEqual(parseAnalyticsEvent({event:'engagement',surface:'landing',path:'/',visitor,view,seconds:9000,scroll:75}),{event:'engagement',surface:'landing',path:'/',visitor,view,seconds:1800,scroll:75});
assert.deepEqual(parseAnalyticsEvent({event:'cta_click',surface:'landing',path:'/',visitor,cta:'trial'}),{event:'cta_click',surface:'landing',path:'/',visitor,cta:'trial'});
assert.deepEqual(parseAnalyticsEvent({event:'page_view',surface:'demo',path:'/finanzas/x',view}),{event:'page_view',surface:'demo',path:'/finanzas',view,referrer:null,mobile:false});
for(const bad of [null,[],'page_view',{},{event:'identify',surface:'landing',path:'/',visitor},{event:'demo_start',surface:'demo',path:'/'},
 {event:'page_view',surface:'blog',path:'/',visitor,view},{event:'page_view',surface:'landing',path:'/',visitor:'corto',view},
 {event:'page_view',surface:'landing',path:'/',visitor,view,email:'a@b.c'},{event:'page_view',surface:'landing',path:'/?q=1',visitor,view},
 {event:'page_view',surface:'landing',path:'/',visitor,view:'x'},{event:'page_view',surface:'landing',path:'/',visitor,view,mobile:'si'},
 {event:'page_view',surface:'demo',path:'/',visitor,view},{event:'engagement',surface:'landing',path:'/',visitor,view},
 {event:'engagement',surface:'landing',path:'/',visitor,view,seconds:'5'},{event:'cta_click',surface:'landing',path:'/',visitor,cta:'otro'},
 {event:'cta_click',surface:'demo',path:'/',cta:'trial'},{event:'cta_click',surface:'landing',path:'/',visitor,cta:'trial',seconds:1}])throws(()=>parseAnalyticsEvent(bad));
const range=analyticsRange({from:'2026-10-01',to:'2026-10-14'},'2026-10-14');
assert.deepEqual(range,{from:'2026-10-01',to:'2026-10-14',days:14,previous_from:'2026-09-17',previous_to:'2026-09-30',today:'2026-10-14',timezone:'America/Asuncion'},'período anterior de igual duración');
assert.equal(analyticsRange({},'2026-10-14').days,30,'por defecto 30 días');
assert.equal(analyticsRange({from:'2026-10-14',to:'2026-10-14'},'2026-10-14').previous_from,'2026-10-13','Hoy compara con ayer');
assert.equal(analyticsRange({from:'2026-03-01',to:'2026-03-31'},'2026-10-14').previous_from,'2026-01-29','mes anterior completo contra los 31 días previos');
throws(()=>analyticsRange({from:'2026-10-15',to:'2026-10-14'}));throws(()=>analyticsRange({from:'2026-02-30'}));throws(()=>analyticsRange({from:'2025-01-01',to:'2026-10-14'}));throws(()=>analyticsRange({from:'hoy'}));
assert.notEqual(dailyHash('1.2.3.4','2026-10-14'),dailyHash('1.2.3.4','2026-10-15'),'el hash de IP rota cada día');
assert(!dailyHash('1.2.3.4').includes('1.2.3.4'));
assert.match(demoVisitor(42),/^d[0-9a-f]{31}$/);assert.notEqual(demoVisitor(42),demoVisitor(43));
assert.equal(realOrganization('o').includes('demo_owner_user_id is not null'),true);
assert.equal(analiticaSinDemo('v'),"v.surface<>'demo'");assert.equal(analiticaSoloDemo('v'),"v.surface='demo'");

// ── Base (PGlite) ────────────────────────────────────────────────────────────
const pg=new PGlite();
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
await pg.exec(await read('./schema.sql'));
await pg.exec(`
 delete from organizations where slug='scale';
 alter table users add column if not exists is_demo_guest boolean not null default false,add column if not exists deleted_at timestamptz;
 alter table organizations add column if not exists demo_owner_user_id bigint,add column if not exists demo_source_id bigint,add column if not exists deleted_at timestamptz;
 create table if not exists auth_throttles (key text primary key,count integer not null default 1,expires_at timestamptz not null);
`);
for(const file of ['20260912_platform_admin.sql','20260915_platform_admin_roles.sql'])await pg.exec(await read('./migrations/'+file));
// Antes de la migración, un evento de demo nunca rompe la transacción que lo contiene.
await pg.exec('begin');
assert.equal(await recordDemoEvent({query:(sql,values)=>pg.query(sql,values)},{organizationId:1,event:'demo_start',label:'privada'},{transaction:true}),false);
assert.equal((await pg.query('select 1 as ok')).rows[0].ok,1,'la transacción sigue viva tras el savepoint');
await pg.exec('rollback');
const migration=await read('./migrations/20261016_public_analytics.sql');
await pg.exec(migration);await pg.exec(migration);// idempotente y re-ejecutable

const db={query:(sql,values)=>pg.query(sql,values)};
const ORIGIN='https://sistema.scaleparaguay.com';
function request(body,{method='POST',headers={},chunks}={}){
 const raw=typeof body==='string'?body:JSON.stringify(body);
 const stream=Readable.from(chunks||[Buffer.from(raw)]);
 return Object.assign(stream,{method,headers:{origin:ORIGIN,'content-type':'application/json','x-forwarded-for':'203.0.113.7, 10.0.0.1',...headers},socket:{remoteAddress:'10.0.0.1'}});
}
async function collect(body,{path='/api/public/analytics/collect',session=async()=>null,...options}={}){
 let answer;
 const handled=await publicAnalytics({req:request(body,options),res:{},url:new URL(path,'https://api.invalid'),db,session,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
const count=async table=>(await pg.query(`select count(*)::int as n from ${table}`)).rows[0].n;
assert.equal((await collect({},{path:'/api/public/telemetry'})).handled,false,'otras rutas no se tocan');
assert.equal((await collect({},{method:'GET'})).status,405);
assert.equal((await collect({},{path:'/api/public/analytics/collect?x=1'})).status,400);
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view},{headers:{origin:'https://evil.example'}})).status,403);
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view},{headers:{origin:undefined}})).status,403);
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view},{headers:{'content-type':'application/x-www-form-urlencoded'}})).status,415);
assert.equal((await collect('x'.repeat(2000))).status,413,'tope de 1 KB');
assert.equal((await collect('',{chunks:[Buffer.alloc(600,32),Buffer.alloc(600,32)]})).status,413,'el tope vale también para cuerpos chunked');
assert.equal((await collect('{"event":',{})).status,400,'JSON inválido');
assert.equal((await collect({event:'identify',surface:'landing',path:'/',visitor})).status,400,'evento fuera de la lista cerrada');
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view,email:'persona@example.com'})).status,400,'campos de más');
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view},{headers:{dnt:'1'}})).status,202);
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view},{headers:{'sec-gpc':'1'}})).status,202);
assert.equal(await count('public_page_views'),0,'DNT/GPC no guarda nada');
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view,referrer:'https://www.google.com/search?q=privado',mobile:true},{headers:{'content-type':'text/plain;charset=UTF-8'}})).status,202,'sendBeacon con texto plano');
assert.equal((await collect({event:'page_view',surface:'landing',path:'/',visitor,view})).status,202,'repetir la vista no duplica');
assert.equal(await count('public_page_views'),1);
assert.equal((await collect({event:'engagement',surface:'landing',path:'/',visitor,view,seconds:40,scroll:60})).status,202);
assert.equal((await collect({event:'engagement',surface:'landing',path:'/',visitor,view,seconds:20,scroll:30})).status,202);
assert.equal((await collect({event:'engagement',surface:'landing',path:'/',visitor:'otrovisitante0000000',view,seconds:999,scroll:100})).status,202,'otro visitante no puede tocar esta vista');
let stored=(await pg.query('select * from public_page_views')).rows[0];
assert.equal(stored.seconds,40,'se conserva el acumulado mayor');assert.equal(stored.scroll_pct,60);
assert.equal(stored.referrer_domain,'google.com');assert.equal(stored.is_mobile,true);
assert.equal((await collect({event:'cta_click',surface:'landing',path:'/',visitor,cta:'demo'})).status,202);
// Demo: el visitante sale de la sesión demo; sin sesión demo, 403.
assert.equal((await collect({event:'page_view',surface:'demo',path:'/produccion',view:'demoview1'})).status,403);
assert.equal((await collect({event:'page_view',surface:'demo',path:'/produccion',view:'demoview1'},{session:async()=>({id:9,organization_id:77})})).status,403,'una sesión real no escribe como demo');
const demoSession=async()=>({id:9,organization_id:77,demo_owner_user_id:9});
assert.equal((await collect({event:'page_view',surface:'demo',path:'/produccion/tablero',view:'demoview1'},{session:demoSession})).status,202);
assert.equal((await collect({event:'engagement',surface:'demo',path:'/produccion',view:'demoview1',seconds:90},{session:demoSession})).status,202);
const demoRow=(await pg.query("select * from public_page_views where surface='demo'")).rows[0];
assert.equal(demoRow.visitor,demoVisitor(77));assert.equal(demoRow.path,'/produccion');assert.equal(demoRow.seconds,90);
// Privacidad: ni la IP ni sus hashes estables quedan en tablas o throttles.
const dump=JSON.stringify([(await pg.query('select * from public_page_views')).rows,(await pg.query('select * from public_analytics_events')).rows,(await pg.query('select * from auth_throttles')).rows]);
assert(!dump.includes('203.0.113.7')&&!dump.includes('10.0.0.1'),'sin IP');
assert(!/privado|search\?|q=|@/.test(dump),'sin query string ni correos');
// Límite por visitante (ventana de 15 min).
const limits={...ANALYTICS_LIMITS};
ANALYTICS_LIMITS.visitor=3;
const flood='inundacion0000000000';
const statuses=[];for(let i=0;i<5;i++)statuses.push((await collect({event:'cta_click',surface:'landing',path:'/',visitor:flood,cta:'trial'})).status);
assert.deepEqual(statuses,[202,202,202,429,429],'por visitante');
ANALYTICS_LIMITS.visitor=limits.visitor;ANALYTICS_LIMITS.ip=1;
assert.equal((await collect({event:'cta_click',surface:'landing',path:'/',visitor:'otraip00000000000000',cta:'trial'},{headers:{'x-forwarded-for':'198.51.100.9'}})).status,202);
assert.equal((await collect({event:'cta_click',surface:'landing',path:'/',visitor:'otraip11111111111111',cta:'trial'},{headers:{'x-forwarded-for':'198.51.100.9'}})).status,429,'por IP (hash diario)');
Object.assign(ANALYTICS_LIMITS,limits);
await pg.exec("delete from public_page_views;delete from public_analytics_events;delete from auth_throttles");

// ── Panel global: guard, días de Asunción y separación de demo ───────────────
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Asuncion'}).format(new Date());
const dayAt=offset=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
await pg.exec(`
 alter table users add column if not exists email_verified_at timestamptz, add column if not exists google_full_name text, add column if not exists google_photo_url text, add column if not exists deleted_at timestamptz; -- la verificación vive en 20260912_email_password_auth.sql
 insert into users(id,email,password_hash,email_verified_at,created_at) values(1,'platform@scale.example','x',now(),'${dayAt(-60)}T15:00:00Z'),(2,'nadie@a.example','x',null,'${dayAt(-1)}T15:00:00Z'),(3,'visitante-x@demo.example.invalid','x',null,'${dayAt(-1)}T15:00:00Z');
 update users set is_demo_guest=true where id=3;
 insert into platform_administrators(user_id) values(1);
`);
async function traffic(path,actor={id:1,email:'platform@scale.example'}){
 let answer;
 const handled=await platformTraffic({req:{method:path.method||'GET',headers:{}},res:{},url:new URL(path.url||path,'https://api.invalid'),db,session:async()=>actor,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
assert.equal((await traffic('/api/platform/usage')).handled,false);
assert.equal((await traffic('/api/platform/traffic',null)).status,404,'sin sesión: el 404 genérico del panel');
assert.equal((await traffic('/api/platform/traffic',{id:2,email:'nadie@a.example'})).status,404,'no es admin global');
assert.equal((await traffic('/api/platform/traffic',{id:1,demo_owner_user_id:1})).status,404,'la demo no entra al panel');
assert.equal((await traffic({url:'/api/platform/traffic',method:'POST'})).status,405);
assert.equal((await traffic(`/api/platform/traffic?from=${dayAt(-200)}&to=${today}`)).status,400,'máximo 180 días');
// Sin datos: ceros y promedios nulos, nunca números inventados.
const empty=(await traffic('/api/platform/traffic')).data;
assert.equal(empty.landing.totals.views,0);assert.equal(empty.landing.totals.avg_seconds,null);assert.equal(empty.landing.totals.avg_scroll,null);
assert.equal(empty.demo.totals.started,0);assert.equal(empty.demo.totals.avg_seconds,null);assert.equal(empty.landing.daily.length,30);
assert.equal(empty.demo.conversion.measurable,false);
const pv=(surface,path,visitorId,viewId,at,seconds,scroll,referrer=null)=>pg.query('insert into public_page_views(surface,path,visitor,view_id,created_at,seconds,scroll_pct,referrer_domain) values($1,$2,$3,$4,$5,$6,$7,$8)',[surface,path,visitorId,viewId,at,seconds,scroll,referrer]);
const ev=(surface,event,visitorId,label,at)=>pg.query('insert into public_analytics_events(surface,event,visitor,label,created_at) values($1,$2,$3,$4,$5)',[surface,event,visitorId,label,at]);
// 02:00Z es todavía el día local anterior en Asunción (UTC-3/-4).
await pv('landing','/','visitante00000000001','v1',`${dayAt(-1)}T02:00:00Z`,30,100,'google.com');
await pv('landing','/','visitante00000000001','v2',`${dayAt(-1)}T15:00:00Z`,60,50,null);
await pv('landing','/scale-os.html','visitante00000000002','v3',`${dayAt(-1)}T16:00:00Z`,null,null,'google.com');
await pv('landing','/','visitante00000000003','v4',new Date(),10,25,'instagram.com');
await pv('landing','/','visitante00000000009','v5',`${dayAt(-40)}T15:00:00Z`,20,10,null);// período anterior
await ev('landing','cta_click','visitante00000000001','trial',`${dayAt(-1)}T15:01:00Z`);
await ev('landing','cta_click','visitante00000000002','demo',`${dayAt(-1)}T16:01:00Z`);
await ev('landing','cta_click','visitante00000000009','trial',`${dayAt(-40)}T15:01:00Z`);
// Demo: dos demos públicas y una privada; nada de esto entra en los números de la landing.
const d1=demoVisitor(101),d2=demoVisitor(102),d3=demoVisitor(103);
await ev('demo','demo_start',d1,'publica',`${dayAt(-1)}T15:00:00Z`);
await ev('demo','demo_start',d2,'publica',`${dayAt(-2)}T15:00:00Z`);
await ev('demo','demo_start',d3,'privada',`${dayAt(-2)}T16:00:00Z`);
await ev('demo','demo_start',d3,'publica',`${dayAt(-45)}T16:00:00Z`);
await ev('demo','demo_role',d1,'finance',`${dayAt(-1)}T15:05:00Z`);
await ev('demo','demo_role',d1,'editor',`${dayAt(-1)}T15:06:00Z`);
await ev('demo','demo_role',d2,'finance',`${dayAt(-2)}T15:05:00Z`);
await pv('demo','/produccion',d1,'dv1',`${dayAt(-1)}T15:00:00Z`,120,null);
await pv('demo','/finanzas',d1,'dv2',`${dayAt(-1)}T15:03:00Z`,60,null);
await pv('demo','/produccion',d2,'dv3',`${dayAt(-2)}T15:00:00Z`,30,null);
await pv('demo','/clientes',d3,'dv4',`${dayAt(-2)}T16:00:00Z`,null,null);
const captured=[];
const capturingDb={query:(sql,values)=>{captured.push(sql);return pg.query(sql,values);}};
let answer;
await platformTraffic({req:{method:'GET',headers:{}},res:{},url:new URL('/api/platform/traffic','https://api.invalid'),db:capturingDb,session:async()=>({id:1}),send:(_r,status,data)=>{answer={status,data};}});
assert.equal(answer.status,200);
const t=answer.data,L=t.landing,D=t.demo;
assert.equal(t.range.timezone,'America/Asuncion');assert.equal(t.range.to,today);assert.equal(t.range.days,30);
assert.equal(L.totals.views,4,'solo vistas de la landing del período; sin demo');
assert.equal(L.totals.visitors,3);
assert.equal(L.totals.avg_seconds,33,'(30+60+10)/3 vistas con tiempo medido');assert.equal(L.totals.timed,3);
assert.equal(L.totals.avg_scroll,58,'(100+50+25)/3');
assert.deepEqual([L.totals.s25,L.totals.s50,L.totals.s75,L.totals.s100],[3,2,1,1],'distribución de scroll alcanzado');
assert.equal(L.previous.views,1);assert.equal(L.previous.avg_seconds,20);
assert.equal(L.totals.cta_clicks,2);assert.equal(L.previous.cta_clicks,1);
assert.deepEqual(L.ctas.find(row=>row.cta==='trial'),{cta:'trial',clicks:1,previous:1,visitors:1});
assert.equal(L.totals.signups,1,'altas reales: sin invitados demo');
assert.equal(L.today.views,1);assert.equal(L.today.visitors,1);assert.equal(L.today.day,today);
const byDay=Object.fromEntries(L.daily.map(row=>[row.day,row]));
assert.equal(byDay[dayAt(-2)].views,1,'02:00Z cuenta en el día local anterior');
assert.equal(byDay[dayAt(-1)].views,2);assert.equal(byDay[dayAt(-1)].cta_clicks,2);
assert.equal(byDay[today].views,1);
assert.deepEqual(L.pages[0],{path:'/',views:3,visitors:2,avg_seconds:33,avg_scroll:58});
assert.deepEqual(L.referrers.map(row=>[row.domain,row.views]),[['google.com',2],[null,1],['instagram.com',1]],'agrupado por dominio; directo = null');
assert.equal(D.totals.started,3);assert.equal(D.previous.started,1);
assert.deepEqual(D.kinds,[{kind:'publica',started:2,previous:1},{kind:'privada',started:1,previous:0}]);
assert.equal(D.totals.views,4);assert.equal(D.totals.demos_with_views,3);
assert.equal(D.totals.avg_seconds,105,'demo 1: 180 s, demo 2: 30 s; la demo 3 no tiene tiempo medido');
assert.equal(D.totals.role_changes,3);
assert.deepEqual(D.roles,[{role:'finance',changes:2,demos:2},{role:'editor',changes:1,demos:1}]);
assert.deepEqual(D.screens[0],{path:'/produccion',views:2,demos:2,avg_seconds:75});
assert.equal(D.daily.find(row=>row.day===dayAt(-2)).started,2);
// Separación de demo: toda consulta de la landing excluye la superficie demo y la de demo solo lee demo.
const landingSql=captured.filter(sql=>/public_page_views|public_analytics_events/.test(sql));
assert(landingSql.length>=10);
for(const sql of landingSql)assert(sql.includes("surface<>'demo'")||sql.includes("surface='demo'"),'cada consulta elige su superficie: '+sql.slice(0,80));
// Rango exacto y sargable sobre created_at: los índices por fecha sirven.
await pg.exec('set enable_seqscan=off');
const plan=(await pg.query(`explain select count(*) from public_page_views pv where pv.surface<>'demo' and pv.created_at>=(('${dayAt(-29)}'::date)::timestamp at time zone 'America/Asuncion') and pv.created_at<(('${today}'::date+1)::timestamp at time zone 'America/Asuncion')`)).rows.map(row=>row['QUERY PLAN']).join('\n');
assert.match(plan,/public_page_views_(created|view)_idx/,'usa un índice por fecha');
console.log('public analytics ok');
