import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {publicExperience} from './public-experience.js';
import {platformInquiries,notifyInquiry,platformContactEmail,inquiryEmail,DEFAULT_PLATFORM_CONTACT_EMAIL} from './platform-inquiries.js';
import {migrationOrder} from './scripts/migration-order.mjs';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
// Re-ejecutable: aplicar la migración otra vez no falla ni duplica nada.
await pg.exec(await read('./migrations/20261015_platform_inquiries.sql'));

const query=(s,v)=>pg.query(s,v),db={query,connect:async()=>({query,release(){}})};
const scaleOrg=(await query("select id from organizations where slug='scale'")).rows[0].id;
const admin=(await query("insert into users(email,password_hash,email_verified_at) values('platform@example.invalid','!',now()) returning id")).rows[0].id;
const viewer=(await query("insert into users(email,password_hash,email_verified_at) values('viewer@example.invalid','!',now()) returning id")).rows[0].id;
const owner=(await query("insert into users(email,password_hash,email_verified_at) values('owner@example.invalid','!',now()) returning id")).rows[0].id;
await query("insert into platform_administrators(user_id,role) values($1,'admin'),($2,'viewer')",[admin,viewer]);
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[scaleOrg,owner]);

// --- Envío público: mismo contrato (202 {ok:true}) + consulta + aviso -----------
const sent=[];let mode='ok';
const delivery={send:async payload=>{sent.push(payload);if(mode==='throw')throw new Error('relay caído con datos de ana@example.invalid');return mode==='ok';}};
const logs=[];const log={warn:message=>logs.push(message)};
async function submit(payload,headers={}){
 let answer=null;
 await publicExperience({req:{method:'POST',headers:{origin:'https://sistema.scaleparaguay.com','user-agent':'UA test','x-forwarded-for':'203.0.113.9',...headers},socket:{remoteAddress:'10.0.0.1'}},res:{},url:new URL('https://test/api/public/contact'),db,session:async()=>null,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};},cookie:()=>'',parseCookies:()=>({}),
  onInquiry:inquiry=>notifyInquiry({send:delivery.send,inquiry,appUrl:'https://app.scaleparaguay.com',to:platformContactEmail(),log})});
 return answer;
}
const evil={name:'Ana <b>Pérez</b>',company:'ACME & "Hijos"',email:'Ana@Example.invalid',phone:'0981 123 456',message:'<script>alert(1)</script>\nNecesito una demo.',consent:true};
let r=await submit(evil,{referer:'https://sistema.scaleparaguay.com/scale-os.html#contacto'});
assert.deepEqual(r,{status:202,data:{ok:true}},'contrato público intacto');
const stored=(await query('select * from platform_inquiries')).rows;
assert.equal(stored.length,1,'la consulta queda guardada');
const row=stored[0];
assert.equal(row.name,'Ana <b>Pérez</b>');assert.equal(row.company,'ACME & "Hijos"');assert.equal(row.email,'ana@example.invalid');
assert.equal(row.whatsapp,'+595 981123456','WhatsApp normalizado con phone()');
assert.equal(row.status,'new');assert.equal(row.consent,true);assert.equal(row.source,'landing');
assert.equal(row.source_url,'https://sistema.scaleparaguay.com/scale-os.html#contacto');
assert.match(row.client_hash,/^[a-f0-9]{32}$/,'huella con hash');
assert.ok(!JSON.stringify(row).includes('203.0.113.9')&&!JSON.stringify(row).includes('UA test'),'sin IP ni user agent en crudo');
// Comportamiento previo intacto: lead en el CRM de Scale y consentimiento PDP.
const lead=(await query("select id from agency_leads where organization_id=$1 and email='ana@example.invalid'",[scaleOrg])).rows[0];
assert.ok(lead,'sigue creando el lead del CRM');
assert.ok((await query("select 1 from personal_data_consents where subject_kind='lead' and subject_id=$1 and source='landing'",[String(lead.id)])).rows[0],'consentimiento registrado');

assert.equal(sent.length,1,'un aviso por consulta');
const mail=sent[0];
assert.equal(DEFAULT_PLATFORM_CONTACT_EMAIL,'dariodeoli@gmail.com');
assert.equal(mail.to,'dariodeoli@gmail.com','destino por defecto');
assert.equal(mail.message.reply_to,'ana@example.invalid','responder va al visitante');
assert.equal(mail.message.subject,'Nueva consulta desde la landing: Ana <b>Pérez</b> · ACME & "Hijos"');
assert.equal(mail.idempotencyKey,'platform-inquiry-'+row.id);
const html=mail.message.html;
assert.ok(html.includes('Ana &lt;b&gt;Pérez&lt;/b&gt;')&&html.includes('ACME &amp; &quot;Hijos&quot;'),'datos escapados');
assert.ok(!html.includes('<script>')&&html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'),'mensaje escapado');
assert.ok(html.includes('Ver en el panel')&&html.includes('https://app.scaleparaguay.com/superadmin?vista=consultas'),'CTA al tab Consultas');
assert.ok(html.includes('+595 981123456')&&html.includes('template-version" content="v3.0.0"'),'layout v3 con todos los campos');
assert.ok(mail.message.text.includes('Necesito una demo.')&&mail.message.text.includes('https://wa.me/595981123456')&&mail.message.text.includes('Ver en el panel: https://app.scaleparaguay.com/superadmin?vista=consultas'),'alternativa de texto plano');

// Honeypot: responde igual, no guarda ni avisa.
r=await submit({...evil,email:'bot@example.invalid',website:'http://spam.example'});
assert.equal(r.status,202);
assert.equal((await query("select count(*)::int as n from platform_inquiries where email='bot@example.invalid'")).rows[0].n,0);
assert.equal(sent.length,1);
// Validación previa intacta.
assert.equal((await submit({...evil,email:'x@example.invalid',consent:false})).status,400);
assert.equal((await submit({...evil,email:'x@example.invalid',phone:'12'})).status,400,'teléfono inválido');

// Falla del correo: la consulta igual se guarda y el pedido responde 202; el log no lleva PII.
mode='throw';
r=await submit({...evil,name:'Beto',email:'beto@example.invalid',phone:''});
assert.equal(r.status,202,'falla del proveedor no rompe el envío');
mode='fail';
r=await submit({...evil,name:'Caro',email:'caro@example.invalid',phone:''});
assert.equal(r.status,202);
assert.equal((await query("select count(*)::int as n from platform_inquiries where email in('beto@example.invalid','caro@example.invalid')")).rows[0].n,2);
assert.equal(logs.length,2,'cada falla queda registrada');
assert.ok(logs.every(entry=>!/example\.invalid|Beto|Caro|relay/.test(entry)),'el log no incluye PII');
// Aunque el callback mismo explote, el pedido público responde.
{
 let answer=null;
 await publicExperience({req:{method:'POST',headers:{}},res:{},url:new URL('https://test/api/public/contact'),db,session:async()=>null,body:async()=>({...evil,email:'dani@example.invalid',phone:''}),send:(_r,status,data)=>{answer={status,data};},cookie:()=>'',parseCookies:()=>({}),onInquiry:()=>{throw new Error('boom');}});
 assert.deepEqual(answer,{status:202,data:{ok:true}});
}
// Variable de entorno: PLATFORM_CONTACT_EMAIL manda; inválida cae al default.
assert.equal(platformContactEmail('Equipo@Scale.example'),'equipo@scale.example');
assert.equal(platformContactEmail('no-es-correo'),'dariodeoli@gmail.com');
assert.equal(platformContactEmail(''),'dariodeoli@gmail.com');
assert.ok(!inquiryEmail({inquiry:{id:9,name:'A\r\nBcc: x@y.z',company:'B',email:'a@b.c',message:''},appUrl:'https://app.scaleparaguay.com'}).subject.includes('\n'),'sin saltos en el asunto');

// --- Panel global: autorización, lista paginada y filtro --------------------------
async function panel(path,{method='GET',payload={},user={id:admin,email:'platform@example.invalid'}}={}){
 let answer=null;
 const handled=await platformInquiries({req:{method,headers:{}},res:{},url:new URL('https://test'+path),db,session:async()=>user,body:async()=>payload,send:(_r,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
assert.equal((await panel('/api/platform/agencies')).handled,false,'otras rutas no se tocan');
assert.equal((await panel('/api/platform/inquiries',{user:null})).status,404,'sin sesión: 404 genérico');
assert.equal((await panel('/api/platform/inquiries',{user:{id:owner,email:'owner@example.invalid'}})).status,404,'dueño de agencia sin acceso global: 404 genérico');
assert.equal((await panel('/api/platform/inquiries',{user:{id:admin,demo_owner_user_id:admin}})).status,404,'Demo: 404 genérico');
let list=await panel('/api/platform/inquiries');
assert.equal(list.status,200);
assert.equal(list.data.total,4);assert.equal(list.data.inquiries.length,4);
assert.deepEqual(list.data.counts,{new:4,contacted:0,closed:0});
assert.ok(!('client_hash' in list.data.inquiries[0]),'la huella no sale del API');
list=await panel('/api/platform/inquiries?limit=2&offset=0');
assert.equal(list.data.inquiries.length,2);assert.equal(list.data.hasMore,true);
assert.equal((await panel('/api/platform/inquiries?status=raro')).status,400);
assert.equal((await panel('/api/platform/inquiries',{method:'POST'})).status,405);

// Lectura para el visor; escritura solo admin.
assert.equal((await panel('/api/platform/inquiries',{user:{id:viewer}})).status,200,'visor global lee');
const target=row.id;
assert.equal((await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{status:'contacted'},user:{id:viewer}})).status,403,'visor no modifica');
assert.equal((await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{status:'contacted'},user:{id:owner}})).status,404,'no admin: 404 genérico');
assert.equal((await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{status:'spam'}})).status,400);
assert.equal((await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{email:'x@y.z'}})).status,400,'campos no permitidos');
assert.equal((await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{note:'x'.repeat(2001)}})).status,400);
assert.equal((await panel('/api/platform/inquiries/999999',{method:'PATCH',payload:{status:'closed'}})).status,404);
let patched=await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{status:'contacted'}});
assert.equal(patched.status,200);
assert.equal(patched.data.inquiry.status,'contacted');assert.equal(patched.data.inquiry.handled_by_email,'platform@example.invalid');assert.ok(patched.data.inquiry.handled_at);
assert.deepEqual(patched.data.counts,{new:3,contacted:1,closed:0});
patched=await panel(`/api/platform/inquiries/${target}`,{method:'PATCH',payload:{note:'Llamar el lunes'}});
assert.equal(patched.data.inquiry.note,'Llamar el lunes');assert.equal(patched.data.inquiry.status,'contacted','la nota preserva el estado');
list=await panel('/api/platform/inquiries?status=contacted');
assert.equal(list.data.total,1);assert.equal(list.data.inquiries[0].id,target);
assert.ok((await query("select 1 from platform_audit_log where action='inquiry.update' and target_id=$1",[String(target)])).rows[0],'queda en la auditoría');
console.log('PASS: consultas de la landing — guardado, aviso por correo (destino, reply-to, escape, texto plano), fallas sin romper el envío y bandeja del panel global con permisos');
