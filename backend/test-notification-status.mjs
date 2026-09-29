// Estados canónicos de envío (#84, §16 — owncoding-ui v0.51.0): el aviso nace
// una sola vez en la bandeja (`agency_notifications`) y el correo deriva de ahí.
// `enviado` = el relay aceptó (nunca «entregado»), `encolado` = en cola (también
// sin relay configurado), `duplicado` = no corresponde un envío nuevo y
// `fallido` = agotó los reintentos. PGlite only; sin red ni servidor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {notifications,notificationEmail,notificationHref} from './notifications.js';
import {deliverNotifications} from './automation.js';

const statusMigration='20260929_notification_email_status.sql';
const pg=new PGlite();
await pg.exec(await fs.readFile('schema.sql','utf8'));
// Todas las migraciones menos la de estados: simula una base de la versión previa.
for(const name of migrationOrder.filter(name=>name!==statusMigration))await pg.exec(await fs.readFile('migrations/'+name,'utf8'));
const query=(sql,args)=>pg.query(sql,args);
const client={query,release(){}};
const db={query,connect:async()=>client};
const insert=async(sql,args)=>(await query(sql+' returning id',args)).rows[0].id;

const org=await insert("insert into organizations(slug,name) values('status-a','Agencia Status')");
const user=await insert("insert into users(email,password_hash) values('status-a@agency.test','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,user]);

// Mapeo del vocabulario anterior al canónico; la migración es idempotente y
// re-ejecutable (se corre dos veces) y traduce sin dejar valores viejos.
const legacy={};
for(const [status,expected] of Object.entries({sent:'enviado',pending:'encolado',failed:'fallido',skipped:'duplicado'})){
 legacy[expected]=await insert("insert into agency_notifications(organization_id,user_id,kind,title,dedupe_key,email_status) values($1,$2,'due',$3,$4,$5)",[org,user,'Aviso '+status,'legacy:'+status,status]);
}
const migration=await fs.readFile('migrations/'+statusMigration,'utf8');
await pg.exec(migration);await pg.exec(migration);
for(const [expected,id] of Object.entries(legacy))assert.equal((await query('select email_status from agency_notifications where id=$1',[id])).rows[0].email_status,expected,'mapeo canónico '+expected);

// Default canónico: un aviso nuevo nace «encolado» (sin relay no se marca enviado).
const fresh=await insert("insert into agency_notifications(organization_id,user_id,kind,title,dedupe_key) values($1,$2,'due','Nuevo','fresh:1')",[org,user]);
assert.equal((await query('select email_status from agency_notifications where id=$1',[fresh])).rows[0].email_status,'encolado','sin relay el aviso nace en cola');
await assert.rejects(query("update agency_notifications set email_status='pending' where id=$1",[fresh]),'el vocabulario anterior ya no se acepta');

// La ruta interna se deriva una sola vez y sirve a la bandeja y al correo.
assert.equal(notificationHref({work_order_id:12,comment_id:3,project_id:4}),'/resumen?order=12#comment-3');
assert.equal(notificationHref({project_id:4}),'/proyectos#project-4');
assert.equal(notificationHref({}),'/resumen');
const message=notificationEmail({title:'Entrega pendiente: Prueba',body:'Revisá la pieza.',work_order_id:12,comment_id:3},'https://app.test/');
assert.ok(message.text.includes('https://app.test/resumen?order=12#comment-3'),'el texto usa la ruta única');
assert.ok(message.html.includes('https://app.test/resumen?order=12#comment-3'),'el HTML usa la ruta única');
assert.ok(message.text.includes('Desarrollado por Owncoding')&&message.html.includes('Desarrollado por Owncoding'),'firma canónica');

// Con relay: la aceptación cuenta como envío, una sola vez. Las filas del
// fixture de mapeo quedan sin preferencias (no elegibles para correo).
const orgB=await insert("insert into organizations(slug,name) values('status-b','Agencia Status B')");
const userB=await insert("insert into users(email,password_hash) values('status-b@agency.test','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[orgB,userB]);
await query("insert into agency_notification_preferences(organization_id,user_id,email_enabled,assignment,comment,due) values($1,$2,true,true,true,true)",[orgB,userB]);
await query("select enqueue_agency_notification($1,$2,'due','Entrega pendiente: Relay','La pieza vence hoy.',null,null,'relay:1')",[orgB,userB]);
assert.equal((await query("select email_status from agency_notifications where dedupe_key='relay:1'")).rows[0].email_status,'encolado','el hecho nace en la bandeja, no en el correo');
const calls=[];
const mail={status:{available:true,appUrl:'https://app.test'},send:async sent=>{calls.push(sent);return true;}};
assert.equal(await deliverNotifications(db,mail),1,'el relay acepta y se registra un envío');
const delivered=(await query("select email_status,email_attempts from agency_notifications where dedupe_key='relay:1'")).rows[0];
assert.equal(delivered.email_status,'enviado');assert.equal(delivered.email_attempts,1);
assert.equal(await deliverNotifications(db,mail),0,'no se reenvía el mismo aviso');
assert.equal(calls.length,1);

// Rechazo sostenido: reintenta en cola y recién al agotar los intentos queda «fallido».
await query("select enqueue_agency_notification($1,$2,'due','Entrega pendiente: Falla','La pieza vence hoy.',null,null,'falla:1')",[orgB,userB]);
const failing={status:{available:true,appUrl:'https://app.test'},send:async()=>false};
for(let intento=0;intento<4;intento++){
 assert.equal(await deliverNotifications(db,failing),0);
 await query("update agency_notifications set next_attempt_at=now() where dedupe_key='falla:1'");
}
let failingRow=(await query("select email_status,email_attempts from agency_notifications where dedupe_key='falla:1'")).rows[0];
assert.equal(failingRow.email_status,'encolado');assert.equal(failingRow.email_attempts,4);
assert.equal(await deliverNotifications(db,failing),0);
failingRow=(await query("select email_status,email_attempts from agency_notifications where dedupe_key='falla:1'")).rows[0];
assert.equal(failingRow.email_status,'fallido');assert.equal(failingRow.email_attempts,5);

// Sin relay configurado: el envío queda en cola, nunca «enviado» ni «fallido».
await query("select enqueue_agency_notification($1,$2,'due','Entrega pendiente: Sin relay','La pieza vence hoy.',null,null,'sin-relay:1')",[orgB,userB]);
const relayless={status:{available:false,appUrl:'https://app.test'},send:async()=>{throw Error('no debe enviarse');}};
assert.equal(await deliverNotifications(db,relayless),0);
const queued=(await query("select email_status,email_attempts from agency_notifications where dedupe_key='sin-relay:1'")).rows[0];
assert.equal(queued.email_status,'encolado','sin relay queda en cola');assert.equal(queued.email_attempts,0);

// Leer o resolver no reencola: el envío pendiente pasa a «duplicado».
const userObject={id:userB,organization_id:orgB,role:'owner'};
async function call(handler,path,as,method='GET',payload={}){let result;await handler({req:{method,socket:{}},res:{},url:new URL('https://test'+path),db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>{result={status,...data};}});return result;}
await query("select enqueue_agency_notification($1,$2,'due','Entrega pendiente: Lectura','Revisá la pieza.',null,null,'lectura:1')",[orgB,userB]);
const inbox=await call(notifications,'/api/agency/notifications',userObject);
assert.equal(inbox.status,200);
const notice=inbox.notifications.find(row=>row.title==='Entrega pendiente: Lectura');
assert.equal(notice.href,'/resumen','la bandeja sirve la ruta interna');
assert.equal((await call(notifications,'/api/agency/notifications/'+notice.id,userObject,'PATCH',{})).status,200);
assert.equal((await query('select email_status from agency_notifications where id=$1',[notice.id])).rows[0].email_status,'duplicado','leer cancela el envío sin marcarlo enviado');

// Guardas de fuente: la cola usa el vocabulario canónico y la versión sale de /health.
const [notificationsSource,automationSource,server,order]=await Promise.all(['notifications.js','automation.js','server.js','scripts/migration-order.mjs'].map(file=>fs.readFile(file,'utf8')));
for(const source of [notificationsSource,automationSource])assert(!/email_status\s*=\s*'(?:pending|sent|failed|skipped)'/.test(source),'sin vocabulario anterior de estados');
assert.match(automationSource,/email_status='encolado' and n\.next_attempt_at/,'la cola canónica es «encolado»');
assert.match(automationSource,/email_status='enviado'/);assert.match(automationSource,/then 'fallido' else 'encolado'/);
assert.ok(server.includes(statusMigration),'la migración queda registrada en el arranque');
assert.match(server,/url\.pathname === '\/health'[\s\S]{0,200}release/,'/health publica la versión del release');
assert.ok(order.includes(statusMigration),'la migración queda en la cadena curada');

await pg.close();
console.log('PASS: estados canónicos de envío — mapeo legacy, default en cola, check del vocabulario, aceptación del relay, reintentos hasta fallido, sin relay en cola, ruta única del aviso y firma de plantilla');
