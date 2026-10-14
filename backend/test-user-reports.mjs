import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {userReports,reportInput,REPORT_LIMITS} from './user-reports.js';
import {platformReports} from './platform-reports.js';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
await pg.exec(await read('./migrations/20261016_platform_errors_reports.sql'));
const query=(s,v)=>pg.query(s,v),db={query,connect:async()=>({query,release(){}})};
const org=(await query("select id from organizations where slug='scale'")).rows[0].id;
const ana=(await query("insert into users(email,password_hash) values('ana@example.invalid','!') returning id")).rows[0].id;
const beto=(await query("insert into users(email,password_hash) values('beto@example.invalid','!') returning id")).rows[0].id;
const admin=(await query("insert into users(email,password_hash,email_verified_at) values('admin@example.invalid','!',now()) returning id")).rows[0].id;
const viewer=(await query("insert into users(email,password_hash,email_verified_at) values('viewer@example.invalid','!',now()) returning id")).rows[0].id;
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'editor'),($1,$3,'viewer')",[org,ana,beto]);
await query("insert into platform_administrators(user_id,role) values($1,'admin'),($2,'viewer')",[admin,viewer]);
const anaSession={id:ana,email:'ana@example.invalid',organization_id:org,role:'editor'};

async function submit(payload,user=anaSession,method='POST'){
 let answer=null;
 const handled=await userReports({req:{method,headers:{}},res:{},url:new URL('https://test/api/support/reports'),db,session:async()=>user,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
const ok={message:'No puedo guardar el presupuesto, aparece un error.',category:'error',route:'/presupuestos/12?token=abc#x',app_version:'1.0.187'};
assert.equal((await userReports({req:{method:'POST'},res:{},url:new URL('https://test/api/platform/reports'),db,session:async()=>null,body:async()=>({}),send:()=>{}})),false,'otras rutas no se tocan');
assert.equal((await submit(ok,null)).status,401,'requiere sesión');
assert.equal((await submit(ok,{...anaSession,demo_owner_user_id:ana})).status,403,'Demo no reporta');
assert.equal((await submit(ok,anaSession,'GET')).status,405);
assert.equal((await submit({...ok,message:'x'.repeat(REPORT_LIMITS.message+1)})).status,400,'≤1000 caracteres');
assert.equal((await submit({...ok,message:'hey'})).status,400,'mínimo');
assert.equal((await submit({...ok,category:'spam'})).status,400,'categoría');
assert.equal((await submit({...ok,user_id:beto})).status,400,'campos no permitidos');
let r=await submit(ok);
assert.equal(r.status,201);assert.equal(r.data.report.status,'new');
const stored=(await query('select * from platform_user_reports')).rows[0];
assert.equal(String(stored.user_id),String(ana));assert.equal(String(stored.organization_id),String(org));
assert.equal(stored.route,'/presupuestos/:id','ruta sin query');assert.equal(stored.app_version,'1.0.187');
assert.equal(reportInput({...ok,app_version:'<script>'}).appVersion,null,'versión con patrón');
// Máximo 5 por hora por usuario (el sexto se rechaza; otro usuario no se ve afectado).
for(let i=0;i<REPORT_LIMITS.perHour-1;i++)assert.equal((await submit({...ok,message:`Reporte número ${i} con detalle`})).status,201);
assert.equal((await submit(ok)).status,429,'tope por hora');
assert.equal((await submit(ok,{id:beto,organization_id:org,role:'viewer'})).status,201,'el tope es por usuario');
await query("update platform_user_reports set created_at=now()-interval '2 hours' where user_id=$1",[ana]);
assert.equal((await submit(ok)).status,201,'pasada la hora vuelve a poder');

// --- Panel global ----------------------------------------------------------
async function panel(path,{method='GET',payload={},user={id:admin}}={}){
 let answer=null;
 const handled=await platformReports({req:{method,headers:{}},res:{},url:new URL('https://test'+path),db,session:async()=>user,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
// Guard único (platform-admin.js): a quien no es admin global, 404 genérico.
assert.equal((await panel('/api/platform/reports',{user:null})).status,404);
assert.equal((await panel('/api/platform/reports',{user:{id:ana}})).status,404,'un usuario de agencia no ve el panel');
let list=await panel('/api/platform/reports?limit=3');
assert.equal(list.status,200);assert.equal(list.data.total,7);assert.equal(list.data.reports.length,3);assert.equal(list.data.hasMore,true);
assert.deepEqual(list.data.counts,{new:7,in_progress:0,resolved:0});
const first=list.data.reports[0];
assert.equal(first.organization_name,'Scale Strategy Group');assert.ok(first.user_email.endsWith('@example.invalid'));assert.ok('app_version' in first&&'route' in first);
assert.equal((await panel('/api/platform/reports?status=raro')).status,400);
assert.equal((await panel('/api/platform/reports',{user:{id:viewer}})).status,200,'visor lee');
assert.equal((await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{status:'resolved'},user:{id:viewer}})).status,403,'visor no modifica');
assert.equal((await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{status:'cerrado'}})).status,400);
assert.equal((await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{}})).status,400);
assert.equal((await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{note:'x'.repeat(2001)}})).status,400);
assert.equal((await panel('/api/platform/reports/999999',{method:'PATCH',payload:{status:'resolved'}})).status,404);
let patched=await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{status:'in_progress',note:'Revisando con el equipo'}});
assert.equal(patched.status,200);assert.equal(patched.data.report.status,'in_progress');assert.equal(patched.data.report.note,'Revisando con el equipo');
assert.equal(patched.data.report.handled_by_email,'admin@example.invalid');assert.equal(patched.data.counts.in_progress,1);
patched=await panel(`/api/platform/reports/${first.id}`,{method:'PATCH',payload:{note:null}});
assert.equal(patched.data.report.status,'in_progress','PATCH de nota conserva el estado');assert.equal(patched.data.report.note,null);
assert.equal((await panel('/api/platform/reports?status=in_progress')).data.total,1);
assert.equal((await query("select count(*)::int as n from platform_audit_log where action='report.update'")).rows[0].n,2);

await pg.close();
console.log('PASS: reportes de usuarios con sesión, tope 5/hora, ruta/versión y bandeja del panel global');
