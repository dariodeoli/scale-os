// Aviso de suspensión por falta de pago (#59): el barrido avisa una sola vez
// por ciclo de cobro, respeta gracia, demo y override de plataforma, y libera el
// sello si el envío falla para reintentar. PGlite only; sin red ni servidor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {sweepSuspensions} from './automation.js';
import {migrationOrder} from './scripts/migration-order.mjs';

const pg=new PGlite();
await pg.exec(await fs.readFile('schema.sql','utf8'));
for(const name of migrationOrder)await pg.exec(await fs.readFile('migrations/'+name,'utf8'));
const query=(sql,args)=>pg.query(sql,args),db={query};
const insert=async(sql,args)=>(await query(sql+' returning id',args)).rows[0].id;
const mail=()=>{const sent=[];return {sent,status:{available:true,appUrl:'https://app.scaleparaguay.com'},send:async message=>{sent.push(message);return true;}};};
const failingMail=()=>({status:{available:true,appUrl:'https://app.scaleparaguay.com'},send:async()=>false});

async function fixture(slug,name,{dueDaysAgo=null,paidThroughDays=null,notifiedDaysAgo=null,demo=false,ownerEmail=null}={}){
 const organization=await insert('insert into organizations(slug,name,demo_owner_user_id) values($1,$2,$3)',[slug,name,demo?await insert("insert into users(email,password_hash) values($1,'x')",[`demo-${slug}@example.invalid`]):null]);
 const email=ownerEmail??`owner-${slug}@agency.invalid`;
 const user=await insert("insert into users(email,password_hash) values($1,'x')",[email]);
 await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[organization,user]);
 if(dueDaysAgo!==null)await query("insert into organization_subscriptions(organization_id,currency,trial_started_at,trial_ends_at,due_at,paid_through_at,suspension_notified_at,binding_token) values($1,'USD',now()-($2||' days')::interval-interval '30 days',now()-($2||' days')::interval,now()-($2||' days')::interval,$3,case when $4::text is null then null else now()-($4||' days')::interval end,gen_random_uuid())",[organization,String(dueDaysAgo),paidThroughDays===null?null:new Date(Date.now()-paidThroughDays*86400000).toISOString(),notifiedDaysAgo===null?null:String(notifiedDaysAgo)]);
 return organization;
}
const markerOf=async organization=>(await query('select suspension_notified_at from organization_subscriptions where organization_id=$1',[organization])).rows[0].suspension_notified_at;

// Suspensión vencida (4 días de mora > gracia de 2) → avisa una vez.
const suspended=await fixture('suspendida','Agencia Suspendida',{dueDaysAgo:4});
// Dentro de la gracia (1 día) → todavía no.
const inGrace=await fixture('en-gracia','Agencia En Gracia',{dueDaysAgo:1});
// Pagada después del vencimiento → no es suspensión.
const paid=await fixture('paga','Agencia Al Día',{dueDaysAgo:-30,paidThroughDays:-20});
// Demo → nunca.
const demo=await fixture('demo-x','Agencia Demo',{dueDaysAgo:4,demo:true});
// Override de plataforma vigente → no.
const overridden=await fixture('override','Agencia Con Override',{dueDaysAgo:4});
const admin=await insert("insert into users(email,password_hash) values('platform-admin@example.invalid','x')");
await query("insert into platform_subscription_states(organization_id,state,reason,updated_by_user_id) values($1,'active','Override de plataforma vigente para la prueba',$2)",[overridden,admin]);
// Ya avisada en este ciclo → no repite.
const already=await fixture('ya-avisada','Agencia Ya Avisada',{dueDaysAgo:4,notifiedDaysAgo:1});
// Sin correo real de dueño → no envía (el sello queda para no reintentar al vacío).
const noOwner=await fixture('sin-correo','Agencia Sin Correo',{dueDaysAgo:4,ownerEmail:'sin-correo@example.invalid'});

const first=mail();
assert.equal(await sweepSuspensions(db,first),1,'solo la suspensión vencida avisa');
assert.equal(first.sent.length,1);
assert.equal(first.sent[0].to,'owner-suspendida@agency.invalid');
assert.match(first.sent[0].message.subject,/quedó suspendido/);
assert.match(first.sent[0].message.text,/al regularizar el pago el acceso se reactiva solo/);
assert.match(first.sent[0].message.text,/https:\/\/app\.scaleparaguay\.com/);
assert.equal(first.sent[0].idempotencyKey.startsWith(`suspension-${suspended}-`),true,'la clave de idempotencia es por ciclo de cobro');
assert(markerOf(suspended),'la suspendida queda sellada');
assert.equal(await markerOf(inGrace),null,'la gracia no sella');
assert.equal(await markerOf(paid),null,'una empresa al día no sella');
assert.equal(await markerOf(demo),null,'el demo no sella');
assert.equal(await markerOf(overridden),null,'el override vigente no sella');
assert(await markerOf(already),'la ya avisada conserva su sello');
assert(await markerOf(noOwner),'sin correo igual se sella para no reintentar al vacío');

// Reintento por ciclo: un envío fallido libera el sello y el siguiente barrido manda.
const retryable=await fixture('reintento','Agencia Reintento',{dueDaysAgo:5});
assert.equal(await sweepSuspensions(db,failingMail()),0,'el envío fallido no cuenta');
assert.equal(await markerOf(retryable),null,'el sello se libera para reintentar');
const retry=mail();
assert.equal(await sweepSuspensions(db,retry),1,'el siguiente barrido manda');
assert.equal(retry.sent[0].to,'owner-reintento@agency.invalid');
assert.equal(await sweepSuspensions(db,retry),0,'no se repite mientras el ciclo siga avisado');

// Proveedor no disponible → no hace nada ni sella.
const unavailable=await fixture('sin-proveedor','Agencia Sin Proveedor',{dueDaysAgo:6});
assert.equal(await sweepSuspensions(db,{status:{available:false,appUrl:'https://app.scaleparaguay.com'},send:async()=>true}),0);
assert.equal(await markerOf(unavailable),null);

await pg.close();
console.log('PASS: aviso de suspensión — una vez por ciclo, con gracia/demo/override respetados, sello atómico, reintento ante fallo y proveedor no disponible sin efectos');
