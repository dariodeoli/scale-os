import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {platformMaintenance,maintenanceGate,maintenanceGuarded,maintenanceState,invalidateMaintenance,MAINTENANCE_CACHE_MS,DEFAULT_MAINTENANCE_MESSAGE} from './platform-maintenance.js';
import {migrationOrder} from './scripts/migration-order.mjs';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
await pg.exec(await read('./migrations/20261016_platform_announcements_maintenance.sql'));
const query=(s,v)=>pg.query(s,v),db={query};
const user=async email=>(await query("insert into users(email,password_hash,email_verified_at) values($1,'!',now()) returning id",[email])).rows[0].id;
const admin=await user('platform@example.invalid'),viewer=await user('viewer@example.invalid'),owner=await user('owner@example.invalid');
await query("insert into platform_administrators(user_id,role) values($1,'admin'),($2,'viewer')",[admin,viewer]);

async function call(handler,path,{method='GET',payload={},as={id:admin}}={},database=db){
 let answer=null;
 const handled=await handler({req:{method,headers:{}},res:{},url:new URL('https://test'+path),db:database,session:async()=>as,body:async()=>payload,send:(_r,status,data,headers)=>{answer={status,data,headers};return true;}});
 return {handled,...answer};
}
const panel=(options)=>call(platformMaintenance,'/api/platform/maintenance',options);
const gate=(path,as)=>call(maintenanceGate,path,{as});

// Rutas: solo el espacio privado queda cortado.
for(const path of ['/api/agency/clients','/api/agency/announcements/active','/api/metrics','/api/hub/overview','/api/ia/carga'])assert.equal(maintenanceGuarded(path),true,path);
for(const path of ['/health','/api/platform/maintenance','/api/platform/agencies','/api/auth/login','/api/auth/me','/api/auth/google/callback','/api/public/contact','/api/public/maintenance','/api/billing/webhook','/api/billing/pagaya/callback','/api/integrations/scale/subscriptions','/','/core-api/x.js','/_next/static/a.js'])assert.equal(maintenanceGuarded(path),false,path);

// Apagado: nada se corta.
assert.equal((await gate('/api/agency/clients',{id:owner})).handled,false);
let pub=await call(platformMaintenance,'/api/public/maintenance',{as:null});
assert.deepEqual(pub.data,{maintenance:false,message:'',until:null,bypass:false});

// Permisos del interruptor.
assert.equal((await panel({as:null})).status,404,'sin sesión: el 404 genérico del panel');
assert.equal((await panel({as:{id:owner}})).status,404,'sin acceso global: 404 genérico');
assert.equal((await panel({as:{id:viewer}})).status,200,'el visor global lee');
assert.equal((await panel({method:'PATCH',payload:{enabled:true},as:{id:viewer}})).status,403,'el visor no cambia');
assert.equal((await panel({method:'PATCH',payload:{enabled:'si'}})).status,400);
assert.equal((await panel({method:'PATCH',payload:{message:'x'.repeat(501)}})).status,400);
assert.equal((await panel({method:'PATCH',payload:{message:'<b>hola</b>'}})).status,400,'sin HTML');
assert.equal((await panel({method:'PATCH',payload:{until:'mañana'}})).status,400);
assert.equal((await panel({method:'PATCH',payload:{otro:1}})).status,400);

// Encender: 503 para el resto; el administrador global pasa.
const until=new Date(Date.now()+2*3600_000).toISOString();
let r=await panel({method:'PATCH',payload:{enabled:true,message:'Actualizamos la base de datos.',until}});
assert.equal(r.status,200);assert.equal(r.data.maintenance.enabled,true);assert.equal(r.data.maintenance.updated_by_email,'platform@example.invalid');
let blocked=await gate('/api/agency/clients',{id:owner,organization_id:1});
assert.equal(blocked.handled,true);assert.equal(blocked.status,503);
assert.deepEqual(blocked.data,{maintenance:true,message:'Actualizamos la base de datos.',until});
assert.equal(blocked.headers['Retry-After'],'120');
assert.equal((await gate('/api/agency/clients',null)).status,503,'sin sesión también');
assert.equal((await gate('/api/agency/clients',{id:viewer})).handled,false,'administrador global (visor) pasa');
assert.equal((await gate('/api/agency/clients',{id:admin,demo_owner_user_id:admin})).status,503,'el Demo no se salta el mantenimiento');
assert.equal((await gate('/api/auth/login',{id:owner})).handled,false,'login siempre');
assert.equal((await gate('/api/billing/webhook',null)).handled,false,'webhooks siempre');
pub=await call(platformMaintenance,'/api/public/maintenance',{as:{id:owner}});
assert.deepEqual(pub.data,{maintenance:true,message:'Actualizamos la base de datos.',until,bypass:false});
assert.equal((await call(platformMaintenance,'/api/public/maintenance',{as:{id:admin}})).data.bypass,true);
// Mensaje vacío → texto por defecto.
await panel({method:'PATCH',payload:{message:''}});
assert.equal((await gate('/api/agency/x',{id:owner})).data.message,DEFAULT_MAINTENANCE_MESSAGE);
assert.equal((await panel()).data.maintenance.enabled,true,'cambiar el mensaje preserva el interruptor');

// Caché ≤30 s: otra instancia (otra conexión) ve el cambio recién al vencer.
const other={query};
const t0=Date.now();
assert.equal((await maintenanceState(other,{now:t0})).enabled,true);
await query("update platform_settings set value=jsonb_set(value,'{enabled}','false') where key='maintenance'");
assert.equal((await maintenanceState(other,{now:t0+MAINTENANCE_CACHE_MS-1})).enabled,true,'dentro del TTL sirve la caché');
assert.equal((await maintenanceState(other,{now:t0+MAINTENANCE_CACHE_MS})).enabled,false,'al vencer relee');
assert.ok(MAINTENANCE_CACHE_MS<=30_000);
await query("update platform_settings set value=jsonb_set(value,'{enabled}','true') where key='maintenance'");invalidateMaintenance(db);

// Fail-open: si la lectura falla, queda abierto.
const broken={query:async sql=>{if(/platform_settings/.test(sql))throw new Error('db caída');return query(sql);}};
const warn=console.warn;console.warn=()=>{};
try{
 assert.equal((await call(maintenanceGate,'/api/agency/clients',{as:{id:owner}},broken)).handled,false,'falla de lectura → abierto');
 assert.equal((await call(platformMaintenance,'/api/public/maintenance',{as:null},broken)).data.maintenance,false);
}finally{console.warn=warn;}

// Apagar: abre y todo queda auditado.
r=await panel({method:'PATCH',payload:{enabled:false}});
assert.equal(r.data.maintenance.enabled,false);
assert.equal((await gate('/api/agency/clients',{id:owner})).handled,false);
const actions=(await query("select action,metadata from platform_audit_log where target_id='maintenance' order by id")).rows;
assert.deepEqual(actions.map(row=>row.action),['maintenance.enable','maintenance.update','maintenance.disable'],'cada cambio del interruptor queda en la auditoría');
assert.equal(actions[0].metadata.enabled,true);
console.log('PASS: mantenimiento — rutas siempre permitidas, 503 con mensaje y fin estimado, bypass del administrador global, caché ≤30 s, fail-open y auditoría');
