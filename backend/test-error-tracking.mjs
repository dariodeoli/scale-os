import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {scrubText,cleanRoute,normalizeMessage,firstStackFrame,errorFingerprint,scrubStack,createFloodGate,recordError,captureServerError,clientErrors,LIMITS} from './error-tracking.js';
import {platformErrors} from './platform-errors.js';

// --- Limpieza sin PII ---------------------------------------------------------
const dirty='Fallo para ana.perez@example.com en https://app.scaleparaguay.com/clientes?token=abc123&email=x@y.z con Authorization: Bearer sk_live_ABCDEF1234567890 cookie=scale_session=deadbeef';
const clean=scrubText(dirty,500);
assert.ok(!clean.includes('ana.perez@example.com')&&clean.includes('[correo]'),'sin correos');
assert.ok(!clean.includes('?token')&&!clean.includes('abc123'),'sin query string');
assert.ok(clean.includes('https://app.scaleparaguay.com/clientes'),'conserva la ruta');
assert.ok(!clean.includes('sk_live_ABCDEF1234567890'),'sin bearer');
assert.ok(!clean.includes('deadbeef'),'sin cookies');
assert.ok(!scrubText('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.c2lnbmF0dXJlLXZhbG9y').includes('eyJ'),'sin JWT');
assert.ok(!scrubText('password=Secreta123 y api_key: AKIA1234').includes('Secreta123'),'sin pares secretos');
assert.ok(!scrubText('x-scale-signature: abcdef0123456789').includes('abcdef0123456789'),'sin firmas');
assert.ok(scrubText('a'.repeat(1000),300).length<=300,'trunca');
assert.equal(cleanRoute('/clientes/123/proyectos?tab=1#x'),'/clientes/:id/proyectos');
assert.equal(cleanRoute('https://app.scaleparaguay.com/invitacion/AbCdEf0123456789XyZ0123?x=1'),'/invitacion/:token');
assert.equal(cleanRoute('/portal/ana@example.com'),'/portal/:correo');
assert.equal(cleanRoute('/x/123e4567-e89b-12d3-a456-426614174000'),'/x/:id');
assert.equal(cleanRoute(''),null);
assert.ok(cleanRoute('/'+'a'.repeat(500)).length<=LIMITS.route);

// --- Huella: mismo error con otros ids → mismo grupo; otro frame → otro grupo --
assert.equal(normalizeMessage('Cliente 123 no encontrado (id 9f8e7d6c5b4a)'),normalizeMessage('Cliente 98765 no encontrado (id 0a1b2c3d4e5f)'));
assert.equal(normalizeMessage("No existe 'abc'"),normalizeMessage("No existe 'xyz'"));
const stackA='TypeError: x is undefined\n    at renderRow (webpack://app/app/sections/clientes.tsx:120:15)\n    at map (native)';
const stackA2='TypeError: x is undefined\n    at renderRow (webpack://app/app/sections/clientes.tsx:131:9)\n    at map (native)';
const stackB='TypeError: x is undefined\n    at loadBoard (webpack://app/app/board-data.ts:20:3)';
assert.equal(firstStackFrame(stackA),firstStackFrame(stackA2),'línea/columna no separan el grupo');
assert.notEqual(firstStackFrame(stackA),firstStackFrame(stackB));
assert.equal(firstStackFrame('fn@https://app.scaleparaguay.com/_next/static/chunks/page-1a2b3c4d5e6f.js?v=1:1:200'),firstStackFrame('fn@https://app.scaleparaguay.com/_next/static/chunks/page-9f8e7d6c5b4a.js?v=2:1:350'),'hash del chunk normalizado');
const fp=args=>errorFingerprint({source:'web',...args});
assert.equal(fp({message:'Falló el cliente 12',stack:stackA}),fp({message:'Falló el cliente 99',stack:stackA2}));
assert.notEqual(fp({message:'Falló el cliente 12',stack:stackA}),fp({message:'Falló el cliente 12',stack:stackB}));
assert.notEqual(errorFingerprint({source:'api',message:'x',stack:''}),errorFingerprint({source:'web',message:'x',stack:''}),'el origen separa grupos');
assert.ok(!scrubStack('Error\n at f (https://x.test/a.js?token=SECRETO123:1:2)').includes('SECRETO123'),'stack sin query');

// --- Límites de inundación ---------------------------------------------------
{
 let t=0;const gate=createFloodGate({perFingerprint:2,global:3,now:()=>t});
 assert.equal(gate.admit('a').write,true);assert.equal(gate.admit('a').write,true);
 assert.deepEqual(gate.admit('a'),{write:false,reason:'fingerprint'});
 assert.equal(gate.admit('b').write,true);
 assert.deepEqual(gate.admit('c'),{write:false,reason:'global'},'tope global por minuto');
 t=60001;
 assert.deepEqual(gate.admit('a'),{write:true,extra:1},'las suprimidas se suman en la próxima escritura');
}

// --- Base: agrupación, regresión, re-ejecución de la migración ---------------
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
await pg.exec(await read('./migrations/20261016_platform_errors_reports.sql'));
const query=(s,v)=>pg.query(s,v),db={query,connect:async()=>({query,release(){}})};
const gate=createFloodGate({perFingerprint:3,global:50});
let r=await recordError(db,{source:'web',message:'Falló el cliente 12 de ana@example.com',stack:stackA,route:'/clientes/12?q=ana'},{gate});
assert.equal(r.recorded,true);
await recordError(db,{source:'web',message:'Falló el cliente 77 de beto@example.com',stack:stackA2,route:'/clientes/77'},{gate});
let rows=(await query('select * from platform_error_groups')).rows;
assert.equal(rows.length,1,'mismo grupo');
assert.equal(rows[0].occurrences,2);
assert.equal(rows[0].route,'/clientes/:id');
assert.ok(!JSON.stringify(rows[0]).includes('@example.com'),'sin correos en la base');
await recordError(db,{source:'web',message:'Falló el cliente 1 de c1@example.com',stack:stackA},{gate});
assert.equal((await recordError(db,{source:'web',message:'Falló el cliente 2 de c2@example.com',stack:stackA},{gate})).recorded,false,'tope por huella');
await query("update platform_error_groups set status='resolved'");
gate.reset();
await recordError(db,{source:'web',message:'Falló el cliente 3 de c3@example.com',stack:stackA},{gate});
rows=(await query('select * from platform_error_groups')).rows;
assert.equal(rows[0].status,'new','un resuelto que reaparece vuelve a nuevo');
assert.equal(rows[0].occurrences,4,'la ocurrencia descartada por el tope no se escribe');
await query("update platform_error_groups set status='ignored'");
await recordError(db,{source:'web',message:'Falló el cliente 4 de c4@example.com',stack:stackA},{gate});
assert.equal((await query('select status from platform_error_groups')).rows[0].status,'ignored','ignorado sigue ignorado');
assert.equal((await recordError(db,{source:'otro',message:'x'})).recorded,false,'origen inválido');

// captureServerError: solo 5xx, nunca lanza.
const err=Object.assign(new Error('relation "agency_x" does not exist para ana@example.com'),{stack:'Error: relation\n    at query (/app/backend/server.js:10:5)'});
assert.equal((await captureServerError(db,{error:err,req:{url:'/api/agency/x?token=abc',method:'GET'},status:404})).recorded,false);
r=await captureServerError(db,{error:err,req:{url:'/api/agency/clients/55?token=abc',method:'GET'},status:500,gate});
assert.equal(r.recorded,true);
const apiRow=(await query("select * from platform_error_groups where source='api'")).rows[0];
assert.equal(apiRow.route,'/api/agency/clients/:id');assert.ok(!apiRow.message.includes('ana@example.com'));
assert.equal(apiRow.sample_meta.status,500);
const broken={query:async()=>{throw new Error('db caída');}};const warns=[];
assert.equal((await captureServerError(broken,{error:err,req:{},log:{warn:m=>warns.push(m)},gate:createFloodGate()})).recorded,false);
assert.equal(warns.length,1);

// --- Endpoint público -------------------------------------------------------
async function post(payload,{headers={},method='POST',readBody}={}){
 let answer=null;
 const handled=await clientErrors({req:{method,headers:{'x-forwarded-for':'198.51.100.7',...headers},socket:{}},res:{},url:new URL('https://test/api/public/client-errors'),db,send:(_r,status,data)=>{answer={status,data};},readBody:readBody||(async()=>payload),gate:createFloodGate({perFingerprint:5,global:100})});
 return {handled,...answer};
}
assert.equal((await clientErrors({req:{method:'POST',headers:{}},res:{},url:new URL('https://test/api/public/contact'),db,send:()=>{}})),false,'otras rutas no se tocan');
assert.equal((await post({},{method:'GET'})).status,405);
assert.equal((await post({message:'x'},{headers:{'content-length':'90000'}})).status,413,'tamaño declarado');
// Lector real con tope de bytes.
{
 const big=JSON.stringify({message:'x'.repeat(LIMITS.body+10)});
 let answer=null;
 await clientErrors({req:Object.assign((async function*(){yield Buffer.from(big);})(),{method:'POST',headers:{}}),res:{},url:new URL('https://test/api/public/client-errors'),db,send:(_r,status,data)=>{answer={status,data};}});
 assert.equal(answer.status,413,'cuerpo real demasiado grande');
}
assert.equal((await post([])).status,400);
assert.equal((await post({message:''})).status,400);
let p=await post({message:'ChunkLoadError: Loading chunk 42 failed',stack:'ChunkLoadError\n    at f (https://app.scaleparaguay.com/_next/static/chunks/42-abcdef123456.js?x=1:1:1)',route:'/finanzas?mes=2026-10',kind:'error',version:'1.0.187'});
assert.deepEqual(p,{handled:true,status:202,data:{ok:true}});
const web=(await query("select * from platform_error_groups where message like 'ChunkLoadError%'")).rows[0];
assert.equal(web.source,'web');assert.equal(web.route,'/finanzas');assert.equal(web.sample_meta.version,'1.0.187');assert.equal(web.sample_meta.kind,'error');
// Tope por cliente (ventana de 15 min): pasado el tope responde 202 sin escribir.
for(let i=0;i<LIMITS.clientPer15Minutes;i++)await post({message:`otro error ${i}`},{headers:{'x-forwarded-for':'203.0.113.50'}});
const before=Number((await query('select coalesce(sum(occurrences),0)::int as n from platform_error_groups')).rows[0].n);
p=await post({message:'error número cualquiera'},{headers:{'x-forwarded-for':'203.0.113.50'}});
assert.deepEqual(p.data,{ok:true,dropped:true},'tope por cliente');
assert.equal(Number((await query('select coalesce(sum(occurrences),0)::int as n from platform_error_groups')).rows[0].n),before);

// --- Panel global ----------------------------------------------------------
const admin=(await query("insert into users(email,password_hash,email_verified_at) values('pa@example.invalid','!',now()) returning id")).rows[0].id;
const viewer=(await query("insert into users(email,password_hash,email_verified_at) values('pv@example.invalid','!',now()) returning id")).rows[0].id;
const outsider=(await query("insert into users(email,password_hash,email_verified_at) values('po@example.invalid','!',now()) returning id")).rows[0].id;
await query("insert into platform_administrators(user_id,role) values($1,'admin'),($2,'viewer')",[admin,viewer]);
async function panel(path,{method='GET',payload={},user={id:admin}}={}){
 let answer=null;
 const handled=await platformErrors({req:{method,headers:{}},res:{},url:new URL('https://test'+path),db,session:async()=>user,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
assert.equal((await panel('/api/platform/inquiries')).handled,false);
// Guard único (platform-admin.js): a quien no es admin global, 404 genérico.
assert.equal((await panel('/api/platform/errors',{user:null})).status,404);
assert.equal((await panel('/api/platform/errors',{user:{id:outsider}})).status,404);
assert.equal((await panel('/api/platform/errors',{user:{id:admin,demo_owner_user_id:admin}})).status,404);
let list=await panel('/api/platform/errors');
assert.equal(list.status,200);
assert.ok(list.data.total>=3);
assert.ok(!('sample_stack' in list.data.errors[0]),'el listado no trae el stack');
assert.ok(list.data.last24h.groups>=3&&typeof list.data.counts.new==='number');
assert.equal((await panel('/api/platform/errors?source=api')).data.errors.every(row=>row.source==='api'),true);
assert.equal((await panel('/api/platform/errors?status=raro')).status,400);
assert.equal((await panel('/api/platform/errors?source=raro')).status,400);
assert.equal((await panel('/api/platform/errors',{method:'POST'})).status,405);
const detail=await panel(`/api/platform/errors/${web.id}`,{user:{id:viewer}});
assert.equal(detail.status,200);assert.ok(detail.data.error.sample_stack.includes('ChunkLoadError'));assert.ok(!detail.data.error.sample_stack.includes('?x=1'));
assert.equal((await panel('/api/platform/errors/999999')).status,404);
assert.equal((await panel(`/api/platform/errors/${web.id}`,{method:'PATCH',payload:{status:'resolved'},user:{id:viewer}})).status,403,'visor no modifica');
assert.equal((await panel(`/api/platform/errors/${web.id}`,{method:'PATCH',payload:{status:'borrado'}})).status,400);
assert.equal((await panel(`/api/platform/errors/${web.id}`,{method:'PATCH',payload:{status:'resolved',message:'x'}})).status,400);
let patched=await panel(`/api/platform/errors/${web.id}`,{method:'PATCH',payload:{status:'resolved'}});
assert.equal(patched.status,200);assert.equal(patched.data.error.status,'resolved');assert.equal(patched.data.error.resolved_by_email,'pa@example.invalid');
assert.ok(patched.data.counts.resolved>=1);
patched=await panel(`/api/platform/errors/${web.id}`,{method:'PATCH',payload:{status:'new'}});
assert.equal(patched.data.error.resolved_by_email,null,'reabrir limpia el responsable');
assert.equal((await query("select count(*)::int as n from platform_audit_log where action='error.update'")).rows[0].n,2,'auditado');

await pg.close();
console.log('PASS: errores agrupados por huella, sin PII, límites de inundación y panel global');
