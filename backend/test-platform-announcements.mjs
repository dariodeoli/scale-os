import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {platformAnnouncements,agencyAnnouncements,announcementInput,plainText} from './platform-announcements.js';
import {migrationOrder} from './scripts/migration-order.mjs';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
// Re-ejecutable: aplicar la migración otra vez no falla ni duplica nada.
await pg.exec(await read('./migrations/20261016_platform_announcements_maintenance.sql'));

const query=(s,v)=>pg.query(s,v),db={query,connect:async()=>({query,release(){}})};
const user=async email=>(await query("insert into users(email,password_hash) values($1,'!') returning id",[email])).rows[0].id;
const org=async(slug,extra='')=>(await query(`insert into organizations(slug,name${extra?',demo_owner_user_id':''}) values($1,$2${extra?',$3':''}) returning id`,extra?[slug,slug.toUpperCase(),extra]:[slug,slug.toUpperCase()])).rows[0].id;
const scale=(await query("select id from organizations where slug='scale'")).rows[0].id;
const other=await org('agencia-norte');
const admin=await user('platform@example.invalid'),viewer=await user('viewer@example.invalid');
const ana=await user('ana@example.invalid'),beto=await user('beto@example.invalid'),caro=await user('caro@example.invalid');
const demo=await user('guest@demo.example.invalid');
const demoOrg=await org('demo-x',String(ana));
await query("insert into platform_administrators(user_id,role) values($1,'admin'),($2,'viewer')",[admin,viewer]);
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'sales'),($4,$5,'owner'),($6,$7,'viewer')",[scale,ana,beto,other,caro,demoOrg,demo]);

async function call(handler,path,{method='GET',payload={},as={id:admin}}={}){
 let answer=null;
 const handled=await handler({req:{method,headers:{}},res:{},url:new URL('https://test'+path),db,session:async()=>as,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
const panel=(path,options)=>call(platformAnnouncements,path,options);
const agency=(path,options)=>call(agencyAnnouncements,path,options);

// --- Validación pura -------------------------------------------------------------
assert.throws(()=>plainText('x'.repeat(81),80,'El título'),/hasta 80/);
assert.equal(plainText('ñ'.repeat(80),80,'El título').length,80,'cuenta caracteres, no bytes');
assert.throws(()=>plainText('Hola <b>mundo</b>',80,'El título'),/no admite HTML/);
assert.throws(()=>plainText('   ',80,'El título'),/obligatorio/);
assert.equal(plainText('a\u0007b\r\nc',500,'El mensaje',{multiline:true}),'a b\nc','controles fuera, saltos normalizados');
assert.throws(()=>announcementInput({title:'T',message:'M',priority:0}),/prioridad/);
assert.throws(()=>announcementInput({title:'T',message:'M',priority:6}),/prioridad/);
assert.throws(()=>announcementInput({title:'T',message:'M',kind:'alerta'}),/Tipo/);
assert.throws(()=>announcementInput({title:'T',message:'M',startsAt:'2026-10-10T00:00:00Z',endsAt:'2026-10-09T00:00:00Z'}),/terminar después/);
assert.throws(()=>announcementInput({title:'T',message:'M',html:'<x>'}),/no permitidos/);

// --- Autorización -------------------------------------------------------------------
assert.equal((await panel('/api/platform/agencies')).handled,false,'otras rutas no se tocan');
assert.equal((await panel('/api/platform/announcements',{as:null})).status,401);
assert.equal((await panel('/api/platform/announcements',{as:{id:ana}})).status,403,'dueño de agencia sin acceso global');
assert.equal((await panel('/api/platform/announcements',{as:{id:admin,demo_owner_user_id:admin}})).status,403,'Demo: 403');
assert.equal((await panel('/api/platform/announcements',{as:{id:viewer}})).status,200,'el visor global lee');
assert.equal((await panel('/api/platform/announcements',{method:'POST',as:{id:viewer},payload:{title:'T',message:'M'}})).status,403,'el visor no crea');

// --- Alta, edición, publicación ------------------------------------------------------
const past=new Date(Date.now()-3600_000).toISOString(),future=new Date(Date.now()+86400_000).toISOString();
let r=await panel('/api/platform/announcements',{method:'POST',payload:{title:'Nueva función',message:'<script>x</script>',kind:'novedad'}});
assert.equal(r.status,400,'el mensaje con HTML se rechaza');
r=await panel('/api/platform/announcements',{method:'POST',payload:{title:'Mantenimiento & mejoras "nocturnas"',message:'Hoy a las 22:00 actualizamos Scale OS.\nPuede haber cortes breves.',kind:'aviso',priority:2,startsAt:past,endsAt:future}});
assert.equal(r.status,201);
const general=r.data.announcement;
assert.equal(general.status,'draft');assert.equal(general.published_at,null);
assert.equal(general.audience_users,3,'audiencia real: Ana, Beto y Caro (sin demo ni admins sin agencia)');
assert.equal(general.reads,0);assert.equal(general.read_pct,0);
assert.equal(general.title,'Mantenimiento & mejoras "nocturnas"','texto plano tal cual (la UI escapa)');
r=await panel('/api/platform/announcements',{method:'POST',payload:{title:'Solo para Norte',message:'Tu plan cambia el lunes.',kind:'info',priority:1,organizationId:String(other),startsAt:past}});
const targeted=r.data.announcement;
assert.equal(targeted.organization_name,'AGENCIA-NORTE');assert.equal(targeted.audience_users,1,'audiencia de una agencia');
assert.equal((await panel('/api/platform/announcements',{method:'POST',payload:{title:'X',message:'Y',organizationId:String(demoOrg)}})).status,404,'la agencia demo no es destino');
r=await panel('/api/platform/announcements',{method:'POST',payload:{title:'Más tarde',message:'Programado',priority:1,startsAt:future}});
const scheduled=r.data.announcement;

// Sin publicar no se ve.
assert.deepEqual((await agency('/api/agency/announcements/active',{as:{id:ana,organization_id:scale}})).data,{announcement:null,pending:0});
assert.equal((await panel(`/api/platform/announcements/${general.id}/publish`,{method:'POST',as:{id:viewer}})).status,403);
for(const item of [general,targeted,scheduled])assert.equal((await panel(`/api/platform/announcements/${item.id}/publish`,{method:'POST'})).status,200);
r=await panel(`/api/platform/announcements/${scheduled.id}`);
assert.equal(r.data.announcement.status,'scheduled','publicado a futuro queda programado');

// Edición: solo el campo que cambia se revalida; el resto se preserva.
r=await panel(`/api/platform/announcements/${general.id}`,{method:'PATCH',payload:{priority:3}});
assert.equal(r.status,200);assert.equal(r.data.announcement.priority,3);assert.equal(r.data.announcement.title,general.title);assert.equal(r.data.announcement.status,'active');
assert.equal((await panel(`/api/platform/announcements/${general.id}`,{method:'PATCH',payload:{title:'x'.repeat(81)}})).status,400);
assert.equal((await panel('/api/platform/announcements/abc',{method:'PATCH',payload:{priority:1}})).status,404);

// --- Banner: uno por vez, por prioridad y audiencia ------------------------------------
r=await agency('/api/agency/announcements/active',{as:{id:caro,organization_id:other}});
assert.equal(r.data.announcement.id,targeted.id,'prioridad 1 primero');assert.equal(r.data.pending,2);
assert.deepEqual(Object.keys(r.data.announcement).sort(),['ends_at','id','kind','message','priority','starts_at','title'],'sin datos internos');
r=await agency('/api/agency/announcements/active',{as:{id:ana,organization_id:scale}});
assert.equal(r.data.announcement.id,general.id,'la otra agencia no ve el dirigido');assert.equal(r.data.pending,1);
assert.equal((await agency(`/api/agency/announcements/${targeted.id}/dismiss`,{method:'POST',as:{id:ana,organization_id:scale}})).status,404,'no cierra lo que no le corresponde');
assert.equal((await agency(`/api/agency/announcements/${scheduled.id}/dismiss`,{method:'POST',as:{id:ana,organization_id:scale}})).status,404,'ni lo programado');
r=await agency(`/api/agency/announcements/${general.id}/dismiss`,{method:'POST',as:{id:ana,organization_id:scale}});
assert.equal(r.status,200);assert.equal(r.data.announcement,null,'tras cerrar no queda otro');
r=await agency(`/api/agency/announcements/${general.id}/dismiss`,{method:'POST',as:{id:ana,organization_id:scale}});
assert.equal(r.status,200,'cerrar dos veces es idempotente');
assert.equal((await query('select count(*)::int as n from platform_announcement_reads where announcement_id=$1 and user_id=$2',[general.id,ana])).rows[0].n,1,'lectura única');
r=await agency(`/api/agency/announcements/${targeted.id}/dismiss`,{method:'POST',as:{id:caro,organization_id:other}});
assert.equal(r.data.announcement.id,general.id,'al cerrar llega el siguiente');
// La lectura del demo no cuenta en el porcentaje.
await agency(`/api/agency/announcements/${general.id}/dismiss`,{method:'POST',as:{id:demo,organization_id:demoOrg}});
r=await panel(`/api/platform/announcements/${general.id}`);
assert.equal(r.data.announcement.reads,1);assert.equal(r.data.announcement.audience_users,3);assert.equal(r.data.announcement.read_pct,33.3,'% leídas sobre usuarios reales');
assert.equal((await agency('/api/agency/announcements/active',{as:null})).status,401);
assert.equal((await agency('/api/agency/announcements/active',{method:'POST',as:{id:ana,organization_id:scale}})).status,405);

// Vencido: deja de mostrarse; despublicar lo saca.
await query("update platform_announcements set starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' where id=$1",[targeted.id]);
assert.equal((await panel(`/api/platform/announcements/${targeted.id}`)).data.announcement.status,'expired');
assert.equal((await panel(`/api/platform/announcements/${targeted.id}/unpublish`,{method:'POST'})).data.announcement.status,'draft');
assert.equal((await panel(`/api/platform/announcements/${targeted.id}/publish`,{method:'POST'})).status,400,'no publica algo vencido');
assert.equal((await agency('/api/agency/announcements/active',{as:{id:beto,organization_id:scale}})).data.announcement.id,general.id);
await panel(`/api/platform/announcements/${general.id}/unpublish`,{method:'POST'});
assert.equal((await agency('/api/agency/announcements/active',{as:{id:beto,organization_id:scale}})).data.announcement,null);

// Lista y borrado.
r=await panel('/api/platform/announcements');
assert.equal(r.data.announcements.length,3);assert.deepEqual(r.data.limits,{title:80,message:500});
assert.equal((await panel(`/api/platform/announcements/${scheduled.id}`,{method:'DELETE',as:{id:viewer}})).status,403);
assert.equal((await panel(`/api/platform/announcements/${scheduled.id}`,{method:'DELETE'})).status,200);
assert.equal((await panel(`/api/platform/announcements/${scheduled.id}`)).status,404);
const actions=(await query("select action from platform_audit_log where target_type='platform_announcement' order by id")).rows.map(row=>row.action);
for(const action of ['announcement.create','announcement.publish','announcement.update','announcement.unpublish','announcement.delete'])assert.ok(actions.includes(action),`auditoría: ${action}`);
console.log('PASS: comunicados — validación de texto plano, permisos, publicación, vigencia, audiencia, banner por prioridad, lectura única y % sobre usuarios reales');
