import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {platformAdmin,platformBootstrapEmail,platformBootstrapStatus,bootstrapInitialPlatformAdmin,ensurePlatformOwnerAdmin} from './platform-admin.js';
import {agencyCore} from './agency-core.js';
import bcrypt from 'bcryptjs';
import {accountSecurity} from './account-security.js';
const pg=new PGlite();
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./schema.sql',import.meta.url),'utf8'));
await pg.exec(`
 delete from organizations where slug='scale';
 alter table users add column if not exists email_verified_at timestamptz,add column if not exists is_demo_guest boolean not null default false,add column if not exists google_photo_url text,add column if not exists google_full_name text,add column if not exists deleted_at timestamptz,add column if not exists anonymized_at timestamptz;
 alter table organizations add column if not exists demo_owner_user_id bigint,add column if not exists demo_source_id bigint,add column if not exists deleted_at timestamptz,add column if not exists deleted_by_user_id bigint;
 alter table organization_members add column if not exists active boolean not null default true,add column if not exists removed_at timestamptz;
 create table if not exists agency_settings(organization_id bigint primary key,default_currency text);
 create table if not exists organization_subscriptions(organization_id bigint primary key,stripe_status text,currency text,trial_started_at timestamptz,trial_ends_at timestamptz,due_at timestamptz,paid_through_at timestamptz,binding_token uuid unique,updated_at timestamptz not null default now());
 insert into users(id,email,password_hash,email_verified_at,is_demo_guest) values(1,'owner@agency.example','unused',now(),false),(2,'platform@scale.example','unused',now(),false),(3,'member@agency.example','unused',now(),false),(4,'persona@demo.example.invalid','unused',now(),false),(5,'persona0@scale-demo.example.invalid','unused',now(),false),(6,'persona1@scale-demo.example.invalid','unused',now(),false),(7,'persona2@scale-demo.example.invalid','unused',now(),false),(8,'persona3@scale-demo.example.invalid','unused',now(),false),(9,'persona4@scale-demo.example.invalid','unused',now(),false),(10,'guest@agency.example','unused',now(),true);
 insert into organizations(id,name,slug,demo_owner_user_id,demo_source_id) values(10,'Agency One','agency-one',null,null),(20,'Agency Two','agency-two',null,null),(30,'Demo','scale-demo-controles-20260908',null,null),(40,'Private demo','private-demo',4,10),(50,'AgenciaPrueba','agencia-prueba',null,null);
 insert into organization_members(organization_id,user_id,active,removed_at,role) values(10,1,true,null,'owner'),(10,3,true,null,'viewer'),(20,2,true,null,'owner'),(30,2,true,null,'owner'),(30,4,true,null,'viewer'),(40,4,true,null,'owner'),(10,4,true,null,'viewer'),(10,5,true,null,'viewer'),(10,10,true,null,'viewer'),(50,2,true,null,'owner');
 insert into organization_subscriptions(organization_id,stripe_status,currency) values(10,'trialing','USD'),(20,'active','PYG'),(30,'canceled','PYG'),(40,'past_due','USD'),(50,'past_due','PYG');
`);
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260912_platform_admin.sql',import.meta.url),'utf8'));
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260912_platform_admin_bootstrap.sql',import.meta.url),'utf8'));
 await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260913_platform_admin_vertical_slice.sql',import.meta.url),'utf8'));
 await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260915_platform_admin_roles.sql',import.meta.url),'utf8'));
 await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260915_platform_owner_admin.sql',import.meta.url),'utf8'));
 await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260915_coupon_free_days.sql',import.meta.url),'utf8'));
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260921_platform_extend_idempotency.sql',import.meta.url),'utf8'));
// La forma coherente de los cupones también se exige en la base.
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260920_platform_coupon_shape.sql',import.meta.url),'utf8'));
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20261014_coupon_grace.sql',import.meta.url),'utf8'));
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20261014_organization_logo.sql',import.meta.url),'utf8'));
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20261014_organization_logo.sql',import.meta.url),'utf8'));
await pg.exec(`create table platform_coupon_redemptions(id bigserial primary key,coupon_id bigint not null references platform_coupons(id) on delete restrict,organization_id bigint not null references organizations(id) on delete cascade,months_granted integer not null default 1 check(months_granted >= 0),redeemed_by_user_id bigint not null references users(id) on delete restrict,created_at timestamptz not null default now(),unique(coupon_id,organization_id))`);
await pg.exec(`
  create table if not exists oauth_states(id bigint primary key,recent_auth_user_id bigint);
  create table if not exists destructive_action_previews(token_hash text primary key,user_id bigint,action text not null default 'account.delete',organization_id bigint,state_hash text not null default 'fixture',confirmation text not null default 'Eliminar',payload jsonb not null default '{}'::jsonb,expires_at timestamptz not null default now()+interval '5 minutes',consumed_at timestamptz,created_at timestamptz not null default now());
  create table if not exists destructive_email_challenges(id bigint primary key,preview_token_hash text not null references destructive_action_previews(token_hash) on delete restrict,user_id bigint);
  create table if not exists destructive_google_handoffs(token_hash text primary key,preview_token_hash text not null references destructive_action_previews(token_hash) on delete restrict,user_id bigint);
  create table if not exists destructive_auth_proofs(token_hash text primary key,preview_token_hash text not null references destructive_action_previews(token_hash) on delete restrict,user_id bigint,action text not null default 'account.delete',organization_id bigint,method text not null default 'password',expires_at timestamptz not null default now()+interval '5 minutes',consumed_at timestamptz,created_at timestamptz not null default now());
  alter table organization_members add unique(organization_id,user_id);
  -- Los CHECK reales de producción (20260914_secure_deletion.sql): el fixture
  -- los replica para que los tests no den falsa confianza con tablas laxas.
  alter table destructive_action_previews add constraint destructive_action_previews_action_check check(action in ('account.delete','organization.delete'));
  alter table destructive_action_previews add constraint destructive_action_previews_check check((action='account.delete' and organization_id is null) or (action='organization.delete' and organization_id is not null));
  alter table destructive_auth_proofs add constraint destructive_auth_proofs_action_check check(action in ('account.delete','organization.delete'));
  create table agency_inventory(id bigserial primary key,organization_id bigint,name text,serial_number text,unique(id,organization_id));
  create table user_personal_identities(user_id bigint primary key,full_name text not null,photo_url text,photo_removed_at timestamptz,updated_at timestamptz not null default now());
  create table agency_user_profiles(user_id bigint,organization_id bigint,full_name text,photo_url text,updated_at timestamptz not null default now(),primary key(user_id,organization_id));
  create table agency_inventory_verifications(id bigserial primary key,organization_id bigint,inventory_id bigint,verified_by_user_id bigint,verified_at timestamptz not null default now(),result text not null,differences text not null default '',note text not null default '',adjusted boolean not null default false,before_state jsonb not null,after_state jsonb not null,unique(id,organization_id),foreign key(inventory_id,organization_id) references agency_inventory(id,organization_id),foreign key(organization_id,verified_by_user_id) references organization_members(organization_id,user_id));
 `);
// La migración que habilita las acciones globales de borrado en el CHECK real
// (issue #22): sin ella, el flujo completo del panel falla contra producción.
await pg.exec(await (await import('node:fs/promises')).readFile(new URL('./migrations/20260929_destructive_platform_actions.sql',import.meta.url),'utf8'));
await pg.query('insert into platform_administrators(user_id) values(2)');
const db={query:(sql,values)=>pg.query(sql,values)};
async function call(path,{method='GET',actor={id:2,email:'platform@scale.example'},payload={},headers={},bootstrapValue=''}={}){
 let answer;const handled=await platformAdmin({req:{method,headers},res:{},url:new URL(path,'https://isolated.invalid'),db,session:async()=>actor,body:async()=>payload,bootstrapValue,send:(_res,status,data)=>{answer={status,data};}});
 return {handled,...answer};
}
// #69: `/api/auth/me` resuelve el rol global contra la tabla (nunca por email).
async function me(actor){
 let answer;
 const handled=await agencyCore({req:{method:'GET',headers:{},socket:{remoteAddress:'127.0.0.1'}},res:{},url:new URL('/api/auth/me','https://isolated.invalid'),db,session:async()=>actor,body:async()=>({}),send:(_res,status,data)=>{answer={status,...data};},requestSubscription:async()=>null});
 assert.equal(handled,true,'agencyCore cubre /api/auth/me');
 return answer;
}
assert.equal(platformBootstrapEmail(' Platform@Scale.Example '),'platform@scale.example');
assert.equal(platformBootstrapEmail('platform@scale.example,other@scale.example'),null,'the bootstrap accepts exactly one explicit email');
assert.equal(platformBootstrapEmail('invalid'),null);
// Borrados globales (issue #22): el admin global confirma con su contraseña real.
await pg.query('update users set password_hash=$1 where id=2',[await bcrypt.hash('fixture-password',4)]);
async function recentAuth(actor,previewId,password='fixture-password'){
 let answer;const handled=await accountSecurity({req:{method:'POST',headers:{},socket:{remoteAddress:'127.0.0.1'}},res:{},url:new URL('/api/auth/account/recent-auth/password','https://isolated.invalid'),db,session:async()=>actor,body:async()=>({previewId,password}),send:(_res,status,data)=>{answer={status,...data};},parseCookies:()=>({}),throttle:async()=>true,emailAvailable:false,sendDestructiveEmailCode:null});
 assert(handled!==false,'accountSecurity cubre la re-autenticación');return answer;
}
const platformActor={id:2,email:'platform@scale.example'};
const destructivePreview=(actor,action,targetId)=>call('/api/platform/destructive/preview',{method:'POST',actor,payload:{action,targetId}});
const platformSource=fs.readFileSync(new URL('./platform-admin.js',import.meta.url),'utf8');
assert(platformSource.includes('stripe_status as status'),'global subscription summary must use the production stripe_status column');
assert(platformSource.includes('s.stripe_status as subscription_status'),'global agency list must use the production stripe_status column');
assert(platformSource.includes("case s.currency when 'USD' then 10::numeric when 'PYG' then 50000::numeric"),'global agency list must derive the launch price from the supported subscription currency');
assert(platformSource.includes('platform_administrators'),'the global guard must remain independent from agency membership');
// #69: el arranque del servidor liga el correo configurado al bootstrap y a la
// reafirmación idempotente del dueño como admin global activo.
const serverSource=fs.readFileSync(new URL('./server.js',import.meta.url),'utf8');
assert.match(serverSource,/previewAction\.startsWith\('platform\.'\)\?'\/superadmin':'\/configuracion'/,'#189: la vuelta de Google de una eliminación global regresa al superadmin');
assert.match(serverSource,/const initialPlatformAdminEmail = process\.env\.SCALE_INITIAL_PLATFORM_ADMIN_EMAIL/,'el correo del admin inicial sale del entorno del servidor');
assert.match(serverSource,/await bootstrapInitialPlatformAdmin\(db,initialPlatformAdminEmail\)/,'el arranque ejecuta el bootstrap del admin inicial');
assert.match(serverSource,/await ensurePlatformOwnerAdmin\(db,initialPlatformAdminEmail\)/,'el arranque reafirma al dueño configurado como admin activo');
assert.equal((await call('/api/agency/clients')).handled,false);
assert.deepEqual((await call('/api/platform/bootstrap-status',{actor:null,bootstrapValue:'invalid'})).data,{configured:true,valid:false,initialized:true,state:'initialized'},'the public diagnostic never exposes the configured address');
assert.equal((await call('/api/platform/overview',{actor:{id:1,email:'owner@agency.example'}})).status,403,'agency owner must not inherit platform access');
assert.equal((await call('/api/platform/overview',{actor:{id:2,email:'platform@scale.example',demo_owner_user_id:2}})).status,403,'a Demo context cannot access platform administration');
const overview=await call('/api/platform/overview');assert.equal(overview.status,200);assert.equal(overview.data.agencies.total,2,'metadata and canonical demo organizations are excluded');assert.equal(overview.data.users.total,3,'both demo email domains and demo guests are excluded');assert.deepEqual(overview.data.subscriptions.map(row=>row.status),['active','trialing'],'demo organization subscriptions are excluded from aggregates');
// #106: la ventana informa total y si queda más (aditivo, sin romper el consumidor).
const agencyWindow=await call('/api/platform/agencies?limit=1');assert.equal(agencyWindow.status,200);assert.equal(agencyWindow.data.agencies.length,1);assert.equal(agencyWindow.data.total,2);assert.equal(agencyWindow.data.hasMore,true,'la lista de agencias informa total y que queda más');
const agencyNext=await call('/api/platform/agencies?limit=1&offset=1');assert.equal(agencyNext.data.agencies.length,1);assert.equal(agencyNext.data.hasMore,false,'la última página no anuncia más');
const userWindow=await call('/api/platform/users?limit=1');assert.equal(userWindow.data.users.length,1);assert.equal(userWindow.data.total,3);assert.equal(userWindow.data.hasMore,true);
const agencies=await call('/api/platform/agencies?limit=100');assert.equal(agencies.status,200);assert.deepEqual(agencies.data.agencies.map(row=>row.id).sort((a,b)=>a-b),[10,20]);assert.equal(agencies.data.agencies.find(row=>row.id===10).active_users,2,'demo-domain accounts and demo guests do not inflate real-agency counts');assert(!Object.keys(agencies.data.agencies[0]).some(k=>k.includes('stripe')||k.includes('password')));
const users=await call('/api/platform/users?limit=100');assert.equal(users.status,200);assert.deepEqual(users.data.users.map(row=>row.email).sort(),['member@agency.example','owner@agency.example','platform@scale.example']);assert.equal(users.data.users.find(row=>row.email==='platform@scale.example').active_agencies,1,'a real superadmin remains visible and only real organizations are counted');
// #189: accesos y agencias muestran solo identidad visible (nombre, foto, agencias), sin datos sensibles.
await pg.query("insert into user_personal_identities(user_id,full_name,photo_url) values(1,'Ana Dueña','https://cdn.example/ana.webp')");
const owner1=(await call('/api/platform/users?limit=100')).data.users.find(row=>row.email==='owner@agency.example');
assert.equal(owner1.full_name,'Ana Dueña');assert.equal(owner1.photo_url,'https://cdn.example/ana.webp');assert.deepEqual(owner1.agency_names,['Agency One']);
assert(!Object.keys(owner1).some(k=>/salary|password|compensation/.test(k)),'la lista de accesos no expone datos sensibles');
const agency10=(await call('/api/platform/agencies?limit=100')).data.agencies.find(row=>row.id===10);
assert.equal(agency10.owner_email,'owner@agency.example');assert.equal(agency10.owner_name,'Ana Dueña');assert.equal(agency10.owner_photo_url,'https://cdn.example/ana.webp');assert.equal(agency10.extra_admins,0);
// Fotos del panel global: misma precedencia que la app (identidad personal → foto de
// perfil en una empresa real → Google) y la foto quitada no revive desde Google.
await pg.query("insert into agency_user_profiles(user_id,organization_id,full_name,photo_url) values(3,10,'Miembro','https://cdn.example/miembro.webp')");
await pg.query("update users set google_photo_url='https://lh.example/platform.jpg' where id=2");
const photoUsers=(await call('/api/platform/users?limit=100')).data.users;
assert.equal(photoUsers.find(row=>row.id===3).photo_url,'https://cdn.example/miembro.webp','solo foto de perfil de agencia: se devuelve');
assert.equal(photoUsers.find(row=>row.id===2).photo_url,'https://lh.example/platform.jpg','solo foto de Google: se devuelve');
await pg.query("update users set google_photo_url='https://lh.example/ana.jpg' where id=1");
await pg.query("update user_personal_identities set photo_url=null,photo_removed_at=now() where user_id=1");
assert.equal((await call('/api/platform/users?limit=100')).data.users.find(row=>row.id===1).photo_url,null,'la foto quitada no vuelve desde Google');
assert.equal((await call('/api/platform/agencies?limit=100')).data.agencies.find(row=>row.id===10).owner_photo_url,null,'el responsable de la agencia respeta la foto quitada');
await pg.query("update user_personal_identities set photo_url='https://cdn.example/ana.webp',photo_removed_at=null where user_id=1");
// Logo de la agencia: viaja directo al panel global (no es miembro), con tope de tamaño.
await pg.query("update organizations set logo_url='https://cdn.example/logo-one.webp' where id=10");
await pg.query("update organizations set logo_url='data:image/webp;base64,'||repeat('A',300000) where id=20");
const logoRows=(await call('/api/platform/agencies?limit=100')).data.agencies;
assert.equal(logoRows.find(row=>row.id===10).logo_url,'https://cdn.example/logo-one.webp');
assert.equal(logoRows.find(row=>row.id===20).logo_url,null,'un logo de 300 KB o más no viaja en el listado');
await pg.query("update organizations set logo_url=null where id in (10,20)");
assert.equal((await call('/api/platform/agencies/10/subscription',{actor:{id:1,email:'owner@agency.example'}})).status,403,'agency ownership cannot inspect platform subscription controls');
const inspected=await call('/api/platform/agencies/10/subscription');assert.equal(inspected.status,200);assert.equal(inspected.data.subscription.currency,'USD');assert.equal(inspected.data.subscription.internal_state,null);
const updated=await call('/api/platform/agencies/10/subscription',{method:'PATCH',payload:{state:'suspended',reason:'Security review',expires_at:null}});assert.equal(updated.status,200);assert.equal(updated.data.subscription.internal_state,'suspended');assert.equal(updated.data.subscription.internal_reason,'Security review');
assert.equal((await call('/api/platform/agencies/10/subscription',{method:'PATCH',payload:{state:'active',reason:'x'}})).status,400,'a short reason cannot grant access');
// Una agencia eliminada o de prueba no es administrable por id, igual que en el listado.
await pg.query("update organizations set deleted_at=now(),active=false where id=10");
assert.equal((await call('/api/platform/agencies/10/subscription')).status,404,'a deleted agency cannot be inspected by id');
assert.equal((await call('/api/platform/agencies/10/subscription',{method:'PATCH',payload:{state:'active',reason:'Reactivar sin auditoría'}})).status,409,'a deleted agency cannot receive an internal state');
await pg.query('update organizations set deleted_at=null,active=true where id=10');
let coupon=await call('/api/platform/coupons',{method:'POST',payload:{code:'SCALE10',discount_type:'percent',discount_value:10,currency:null,max_redemptions:25,lifetime_eligible:true}});assert.equal(coupon.status,201);assert.equal(coupon.data.coupon.code,'SCALE10');assert.equal(coupon.data.coupon.lifetime_eligible,true);
coupon=await call('/api/platform/coupons/'+coupon.data.coupon.id,{method:'PATCH',payload:{active:false}});assert.equal(coupon.status,200);assert.equal(coupon.data.coupon.active,false);
assert.equal((await call('/api/platform/coupons')).data.coupons[0].lifetime_eligible,true,'coupon listing preserves lifetime eligibility');
const couponWindow=await call('/api/platform/coupons?limit=1');assert.equal(couponWindow.data.coupons.length,1);assert.equal(couponWindow.data.total>=1,true,'los cupones informan el total');
assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'bad code',discount_type:'percent',discount_value:10}})).status,400);
const daysCoupon=await call('/api/platform/coupons',{method:'POST',payload:{code:'DAYS30',discount_type:'days',discount_value:30,currency:null}});assert.equal(daysCoupon.status,201);assert.equal(daysCoupon.data.coupon.discount_type,'days','coupons can grant free days');
assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'DAYSBAD',discount_type:'days',discount_value:30.5}})).status,400,'free days must be an integer');
assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'DAYSCUR',discount_type:'days',discount_value:7,currency:'USD'}})).status,400,'free days carry no currency');
const audit=await call('/api/platform/audit');assert.equal(audit.status,200);assert.equal(audit.data.actions.length,4);assert.equal(audit.data.total,4,'la auditoría informa el total fuera de la ventana');assert.equal(audit.data.hasMore,false);assert.equal((await call('/api/platform/audit?limit=1')).data.hasMore,true,'la auditoría pagina con hasMore');assert.equal(audit.data.actions[0].action,'coupon.create');assert.equal(audit.data.actions[1].action,'coupon.deactivate');assert.equal((await pg.query('select count(*)::int as n from platform_audit_log')).rows[0].n,4);
// Manual payments extend the runway, even before any trial, and are audited.
const extended=await call('/api/platform/agencies/20/subscription/extend',{method:'POST',payload:{days:7,reason:'Efectivo recibido'}});
assert.equal(extended.status,200);assert.equal(extended.data.subscription.internal_state,'active','manual payments activate the internal access state');
assert(extended.data.subscription.internal_expires_at,'manual payments set an internal expiry');
assert(extended.data.subscription.paid_through_at,'manual payments extend the paid runway');
assert.equal((await call('/api/platform/agencies/20/subscription/extend',{method:'POST',payload:{days:0,reason:'Nada'}})).status,400,'days must be a positive integer');
assert.equal((await call('/api/platform/agencies/20/subscription/extend',{method:'POST',actor:{id:3,email:'member@agency.example'},payload:{days:7,reason:'Intento'}})).status,403,'only global admins register manual payments');
assert.equal((await call('/api/platform/audit')).data.actions[0].action,'subscription.manual_extend','manual payments are audited');
// Un reintento con la misma Idempotency-Key no vuelve a sumar días (issue #23).
const retryKey='extend-retry-fixture-0001';
const retried=await call('/api/platform/agencies/20/subscription/extend',{method:'POST',headers:{'idempotency-key':retryKey},payload:{days:7,reason:'Efectivo recibido'}});
const replayed=await call('/api/platform/agencies/20/subscription/extend',{method:'POST',headers:{'idempotency-key':retryKey},payload:{days:7,reason:'Efectivo recibido'}});
assert.equal(replayed.status,200);
assert.equal(replayed.data.idempotent_replay,true,'a retry with the same key reports the replay');
assert.equal(String(replayed.data.subscription.paid_through_at),String(retried.data.subscription.paid_through_at),'the retry never doubles the days');
assert.equal(String(replayed.data.subscription.internal_expires_at),String(retried.data.subscription.internal_expires_at),'the internal runway is untouched on retry');
const freshKey=await call('/api/platform/agencies/20/subscription/extend',{method:'POST',headers:{'idempotency-key':'extend-retry-fixture-0002'},payload:{days:7,reason:'Efectivo recibido'}});
assert.equal(freshKey.data.idempotent_replay,undefined,'a new key applies the extension');
assert.notEqual(String(freshKey.data.subscription.paid_through_at),String(retried.data.subscription.paid_through_at),'a new key does extend the runway');
assert.equal((await call('/api/platform/agencies/20/subscription/extend',{method:'POST',payload:{days:7,reason:'Efectivo recibido',idempotencyKey:'short'}})).status,400,'invalid idempotency keys are rejected');
// La suscripción manual abre el runway con la moneda de la empresa, no en USD fijo.
await pg.query("insert into agency_settings(organization_id,default_currency) values(20,'PYG') on conflict(organization_id) do update set default_currency='PYG'");
await pg.query('delete from organization_subscriptions where organization_id=20');
const opened=await call('/api/platform/agencies/20/subscription/extend',{method:'POST',payload:{days:5,reason:'Efectivo en guaraníes'}});
assert.equal(opened.status,200);
// #189: cupones de gracia — vencimiento, empresa destino, nota y aplicación desde el superadmin.
{
 const dueOf=async id=>new Date((await pg.query('select due_at from organization_subscriptions where organization_id=$1',[id])).rows[0].due_at).getTime();
 const day=offset=>new Date(Date.now()+offset*86400000).toISOString().slice(0,10);
 await pg.query("insert into organizations(id,name,slug) values(66,'Agency Sixty Six','agency-sixty-six') on conflict do nothing");
 const created=await call('/api/platform/coupons',{method:'POST',payload:{code:'GRACE7',discount_type:'days',discount_value:7,currency:null,max_redemptions:1,expires_at:day(5),organization_id:'20',note:'Gracia acordada por WhatsApp'}});
 assert.equal(created.status,201);
 assert.equal(String(created.data.coupon.organization_id),'20');assert.equal(created.data.coupon.organization_name,'Agency Two');
 assert.equal(created.data.coupon.note,'Gracia acordada por WhatsApp');assert.equal(created.data.coupon.redemptions,0);assert.equal(created.data.coupon.expired,false);assert(created.data.coupon.expires_at);
 assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'PASTDUE',discount_type:'days',discount_value:3,currency:null,expires_at:day(-2)}})).status,400,'el vencimiento debe ser futuro al crear');
 assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'NOORG',discount_type:'days',discount_value:3,currency:null,organization_id:'99999'}})).status,404,'la empresa destino debe existir');
 assert.equal((await call('/api/platform/coupons',{method:'POST',payload:{code:'LONGNOTE',discount_type:'days',discount_value:3,currency:null,note:'x'.repeat(2001)}})).status,400,'la nota admite hasta 2000 caracteres');
 const id=created.data.coupon.id;
 // Aplicable solo a su empresa destino.
 assert.deepEqual((await call('/api/platform/coupons?organization=20')).data.coupons.map(c=>c.code).sort(),['DAYS30','GRACE7']);
 assert.equal((await call('/api/platform/coupons?organization=66')).data.coupons.some(c=>c.code==='GRACE7'),false,'un cupón dirigido no es aplicable a otra empresa');
 const apply=(org,payload,opts={})=>call(`/api/platform/agencies/${org}/coupons/apply`,{method:'POST',payload,...opts});
 assert.equal((await apply(20,{coupon_id:id},{actor:{id:3,email:'member@agency.example'}})).status,403,'solo un admin global aplica cupones');
 assert.equal((await apply(66,{coupon_id:id,reason:'Prueba'})).status,409,'un cupón dirigido a otra empresa se rechaza');
 const before=await dueOf(20);
 const key='coupon-apply-fixture-01';
 const applied=await apply(20,{coupon_id:id,idempotency_key:key,reason:'Gracia por mora'});
 assert.equal(applied.status,200);assert.equal(applied.data.coupon.code,'GRACE7');
 const after=await dueOf(20);assert(after-before>=6.9*86400000,'el cupón extiende los días en la suscripción');
 const row=(await pg.query("select action,target_type,target_id,metadata from platform_audit_log where action='coupon.apply'")).rows;
 assert.equal(row.length,1);assert.equal(row[0].metadata.code,'GRACE7');assert.equal(row[0].metadata.discount_type,'days');assert.equal(Number(row[0].metadata.discount_value),7);assert.equal(row[0].metadata.reason,'Gracia por mora');
 const replay=await apply(20,{coupon_id:id,idempotency_key:key});
 assert.equal(replay.status,200);assert.equal(replay.data.idempotent_replay,true);assert.equal(await dueOf(20),after,'la misma clave no suma días dos veces');
 assert.equal((await pg.query("select count(*)::int as n from platform_coupon_redemptions where coupon_id=$1",[id])).rows[0].n,1);
 assert.equal((await apply(20,{coupon_id:id})).status,400,'el cupón de un solo uso queda agotado');
 const open=(await call('/api/platform/coupons')).data.coupons.find(c=>c.code==='DAYS30');
 assert.equal((await apply(66,{coupon_id:open.id})).status,200);
 assert.equal((await apply(66,{coupon_id:open.id})).status,409,'una empresa canjea el cupón una sola vez');
 assert.equal((await call('/api/platform/coupons?organization=20')).data.coupons.some(c=>c.code==='GRACE7'),false,'el cupón ya usado deja de ser aplicable');
 const listed=(await call('/api/platform/coupons')).data.coupons.find(c=>c.id===id);assert.equal(listed.redemptions,1);
 // Máximo de usos: un cupón global de un solo uso se agota tras la primera empresa.
 const single=(await call('/api/platform/coupons',{method:'POST',payload:{code:'ONCE3',discount_type:'days',discount_value:3,currency:null,max_redemptions:1}})).data.coupon;
 assert.equal((await apply(20,{coupon_id:single.id})).status,200);
 assert.equal((await apply(66,{coupon_id:single.id})).status,400,'se respeta max_redemptions');
 // Vencido: se rechaza al aplicar y la lista lo marca.
 const old=(await call('/api/platform/coupons',{method:'POST',payload:{code:'OLD3',discount_type:'days',discount_value:3,currency:null}})).data.coupon;
 await pg.query("update platform_coupons set expires_at=now()-interval '1 day' where id=$1",[old.id]);
 assert.equal((await apply(66,{coupon_id:old.id})).status,409,'un cupón vencido no se aplica');
 assert.equal((await call('/api/platform/coupons')).data.coupons.find(c=>c.id===old.id).expired,true);
 assert.equal((await apply(66,{})).status,400,'falta el cupón');
 const patched=await call('/api/platform/coupons/'+id,{method:'PATCH',payload:{note:'Actualizada',organization_id:null,expires_at:null}});
 assert.equal(patched.status,200);assert.equal(patched.data.coupon.organization_id,null);assert.equal(patched.data.coupon.expires_at,null);assert.equal(patched.data.coupon.note,'Actualizada');
}
assert.equal((await pg.query('select currency from organization_subscriptions where organization_id=20')).rows[0].currency,'PYG','the manual runway uses the company currency');
await pg.query("insert into sessions(id,user_id,organization_id,expires_at) values('1',1,10,now()+interval '7 days')");
// Borrado global (issue #22): sin prueba de re-autenticación no hay borrado.
assert.equal((await call('/api/platform/agencies/10',{method:'DELETE'})).status,401,'an agency delete without a proof is rejected');
assert.equal((await call('/api/platform/agencies/10',{method:'DELETE',payload:{previewId:'x'.repeat(43),confirmation:'Agency One',recentAuthProof:'x'.repeat(43)}})).status,409,'an unknown preview is rejected');
assert.equal((await destructivePreview(platformActor,'platform.agency.delete',30)).status,404,'demo agencies are protected before the preview');
assert.equal((await destructivePreview({id:3,email:'member@agency.example'},'platform.agency.delete',10)).status,403,'a viewer cannot even preview a deletion');
const agencyPreview=await destructivePreview(platformActor,'platform.agency.delete',10);
assert.equal(agencyPreview.status,200);assert.equal(agencyPreview.data.preview.confirmation,'Agency One','the confirmation is the agency name on record');
assert.equal((await call('/api/platform/agencies/10',{method:'DELETE',payload:{previewId:agencyPreview.data.preview.id,confirmation:'Otra agencia',recentAuthProof:'x'.repeat(43)}})).status,400,'the typed confirmation must match');
assert.equal((await recentAuth(platformActor,agencyPreview.data.preview.id,'wrong-password')).status,401,'a wrong password never issues a proof');
const agencyAuth=await recentAuth(platformActor,agencyPreview.data.preview.id);
assert.equal(agencyAuth.status,200,JSON.stringify(agencyAuth));
assert.equal((await call('/api/platform/agencies/10',{method:'DELETE',payload:{previewId:agencyPreview.data.preview.id,confirmation:'Agency One',recentAuthProof:'y'.repeat(43)}})).status,401,'a forged proof is rejected');
const removedAgency=await call('/api/platform/agencies/10',{method:'DELETE',payload:{previewId:agencyPreview.data.preview.id,confirmation:'Agency One',recentAuthProof:agencyAuth.proof}});
assert.equal(removedAgency.status,200);assert.deepEqual(removedAgency.data.deleted,{agencyId:10,name:'Agency One',slug:'agency-one'},'an admin deletes a real agency with a fresh proof');
assert.equal((await pg.query('select active from organizations where id=10')).rows[0].active,false,'the agency is soft-deleted');
assert.equal((await pg.query('select deleted_at is not null as gone from organizations where id=10')).rows[0].gone,true);
assert.equal((await pg.query('select count(*)::int as n from sessions where organization_id=10')).rows[0].n,0,'agency deletion revokes its sessions');
assert.equal((await pg.query("select count(*)::int as n from destructive_auth_proofs where consumed_at is not null")).rows[0].n,1,'the proof is consumed exactly once');
assert.equal((await destructivePreview(platformActor,'platform.agency.delete',10)).status,409,'a deleted agency cannot be previewed again');
assert.equal((await call('/api/platform/agencies/10',{method:'DELETE',payload:{previewId:agencyPreview.data.preview.id,confirmation:'Agency One',recentAuthProof:agencyAuth.proof}})).status,404,'a soft-deleted agency leaves the deletable set even with a proof');
assert.equal((await call('/api/platform/agencies/20',{method:'DELETE',payload:{previewId:agencyPreview.data.preview.id,confirmation:'Agency Two',recentAuthProof:agencyAuth.proof}})).status,409,'a consumed preview cannot be reused on another target');
assert.equal((await call('/api/platform/audit')).data.actions.find(entry=>entry.action==='agency.delete').target_id,'10','agency deletion is audited');
await pg.query('delete from platform_administrators');
let bootstrap=await bootstrapInitialPlatformAdmin(db,'platform@scale.example');
assert.equal(bootstrap.activated,true);
assert.equal(bootstrap.initialized,true);
assert.equal((await pg.query("select count(*)::int as n from platform_bootstrap_audit_log where action='initial_admin_granted'")).rows[0].n,1);
const bootstrappedRole=(await pg.query('select role,active from platform_administrators where user_id=2')).rows[0];
assert.equal(bootstrappedRole.role,'admin','el bootstrap deja al dueño como admin');
assert.equal(bootstrappedRole.active,true,'el bootstrap deja el rol activo');
assert.equal((await call('/api/platform/audit')).data.actions[0].action,'initial_admin_granted','the unified audit includes the one-time bootstrap');
bootstrap=await bootstrapInitialPlatformAdmin(db,'member@agency.example');
assert.equal(bootstrap.activated,false,'an initialized platform never grants a second admin from configuration');
await pg.query('delete from platform_administrators');
bootstrap=await bootstrapInitialPlatformAdmin(db,'unverified@scale.example');
assert.equal(bootstrap.activated,false);
assert.equal(bootstrap.state,'awaiting_eligible_user');
assert.equal((await ensurePlatformOwnerAdmin(db,'not-an-email')).valueOf(),false,'an invalid owner email never grants access');
assert.equal((await ensurePlatformOwnerAdmin(db,'unverified@scale.example')).valueOf(),false,'an unverified user is never forced into admin');
await pg.query("insert into users(id,email,password_hash,email_verified_at,is_demo_guest) values(12,'dario@scale.example','unused',now(),false)");
await pg.query("insert into organization_members(organization_id,user_id,role) values(10,12,'owner')");
assert.equal((await ensurePlatformOwnerAdmin(db,'dario@scale.example')).valueOf(),true,'the configured owner becomes global admin after initialization');
assert.equal((await pg.query("select role,active from platform_administrators where user_id=12")).rows[0].role,'admin','the owner grant is an active admin role');
assert.equal((await ensurePlatformOwnerAdmin(db,'dario@scale.example')).valueOf(),false,'the owner grant is idempotent');
await pg.query("update platform_administrators set active=false where user_id=12");
assert.equal((await ensurePlatformOwnerAdmin(db,'dario@scale.example')).valueOf(),true,'the owner grant reactivates a revoked row');
await pg.query('delete from platform_administrators');
const hiddenStatus=await platformBootstrapStatus(db,'invalid');
assert.deepEqual(hiddenStatus,{configured:true,valid:false,initialized:false,state:'invalid_configuration'});
await pg.query("insert into platform_administrators(user_id,role) values(2,'admin')");
assert.equal((await call('/api/platform/users/3',{method:'PATCH',payload:{platform_access:'viewer'}})).status,200);
assert.equal((await call('/api/platform/users')).data.users.find(row=>row.email==='member@agency.example').platform_role,'viewer','the user list exposes the explicit global role');
assert.equal((await call('/api/platform/overview',{actor:{id:3,email:'member@agency.example'}})).status,200,'a viewer can inspect the global panel');
assert.equal((await call('/api/platform/coupons',{method:'POST',actor:{id:3,email:'member@agency.example'},payload:{code:'VIEWER10',discount_type:'percent',discount_value:10}})).status,403,'a viewer cannot mutate the global panel');
assert.equal((await call('/api/platform/agencies/20',{method:'DELETE',actor:{id:3,email:'member@agency.example'}})).status,403,'a viewer cannot delete agencies');
assert.equal((await call('/api/platform/users/2',{method:'PATCH',payload:{platform_access:'viewer'}})).status,400,'an admin cannot change its own global access');
assert.equal((await call('/api/platform/users/1',{method:'PATCH',payload:{platform_access:'bogus'}})).status,400);
assert.equal((await call('/api/platform/users/999',{method:'PATCH',payload:{platform_access:'admin'}})).status,404);
assert.equal((await call('/api/platform/users/1',{method:'PATCH',payload:{platform_access:'admin'}})).status,200);
// #69: `/api/auth/me` refleja el rol global vigente (admin / viewer / null).
let sessionMe=await me({id:2,email:'platform@scale.example'});
assert.equal(sessionMe.status,200);
assert.equal(sessionMe.user.platform_role,'admin','un admin global activo viaja en /me');
assert.equal(sessionMe.user.platform_admin,true);
sessionMe=await me({id:3,email:'member@agency.example'});
assert.equal(sessionMe.user.platform_role,'viewer','el rol viewer viaja en /me');
assert.equal(sessionMe.user.platform_admin,true);
sessionMe=await me({id:1,email:'owner@agency.example'});
assert.equal(sessionMe.user.platform_role,'admin','el rol otorgado por PATCH viaja en /me');
sessionMe=await me({id:4,email:'persona@demo.example.invalid'});
assert.equal(sessionMe.user.platform_role,null,'sin fila activa, /me devuelve null (nunca un email)');
assert.equal(sessionMe.user.platform_admin,false);
const adminPreview=await destructivePreview(platformActor,'platform.user.delete',1);
assert.equal(adminPreview.status,200);assert.equal(adminPreview.data.preview.confirmation,'owner@agency.example','the confirmation is the user email on record');
const adminAuth=await recentAuth(platformActor,adminPreview.data.preview.id);
assert.equal((await call('/api/platform/users/1',{method:'DELETE',payload:{previewId:adminPreview.data.preview.id,confirmation:'owner@agency.example',recentAuthProof:adminAuth.proof}})).status,403,'a global admin cannot delete another global admin');
assert.equal((await call('/api/platform/users/1',{method:'PATCH',payload:{platform_access:'none'}})).status,200,'revoking access leaves the account intact');
assert.equal((await call('/api/platform/users')).data.users.find(row=>row.email==='owner@agency.example').platform_role,null);
sessionMe=await me({id:1,email:'owner@agency.example'});
assert.equal(sessionMe.user.platform_role,null,'la revocación se refleja en /me sin re-login');
assert.equal(sessionMe.user.platform_admin,false);
await pg.query("insert into users(id,email,password_hash,email_verified_at,is_demo_guest) values(11,'tester@scale.example','unused',now(),false)");
await pg.query("insert into organizations(id,name,slug) values(60,'Tester Agency','tester-agency')");
await pg.query("insert into organization_members(organization_id,user_id,active,removed_at,role) values(60,11,true,null,'owner')");
const inventoryId=(await pg.query("insert into agency_inventory(organization_id,name,serial_number) values(60,'Cámara Sony','SN-60') returning id")).rows[0].id;
await pg.query("insert into agency_inventory_verifications(organization_id,inventory_id,verified_by_user_id,result,before_state,after_state) values(60,$1,11,'confirmed','{}'::jsonb,'{}'::jsonb)",[inventoryId]);
await pg.query("insert into destructive_action_previews(token_hash,user_id) values('preview-11',11)");
await pg.query("insert into destructive_email_challenges(id,preview_token_hash,user_id) values(1,'preview-11',11)");
await pg.query("insert into destructive_google_handoffs(token_hash,preview_token_hash,user_id) values('handoff-11','preview-11',11)");
// Sin prueba no hay borrado de usuario; con la prueba atada al objetivo, sí.
assert.equal((await call('/api/platform/users/11',{method:'DELETE'})).status,401,'a user delete without a proof is rejected');
const ownerPreview=await destructivePreview(platformActor,'platform.user.delete',11);
assert.equal(ownerPreview.status,200);assert.equal(ownerPreview.data.preview.confirmation,'tester@scale.example');
assert.equal((await call('/api/platform/users/11',{method:'DELETE',payload:{previewId:ownerPreview.data.preview.id,confirmation:'tester@scale.example',recentAuthProof:adminAuth.proof}})).status,401,'a proof issued for another preview never applies');
const ownerAuth=await recentAuth(platformActor,ownerPreview.data.preview.id);
const removedOwner=await call('/api/platform/users/11',{method:'DELETE',payload:{previewId:ownerPreview.data.preview.id,confirmation:'tester@scale.example',recentAuthProof:ownerAuth.proof}});
assert.equal(removedOwner.status,200,'deleting a user with inventory history succeeds');assert.deepEqual(removedOwner.data.deleted,{userId:11,self:false,agencies:[60]},'deleting an owner removes their agency too');
assert.equal((await pg.query('select deleted_at is not null as gone,active from organizations where id=60')).rows[0].gone,true,'the owned agency is soft-deleted with the user');
assert.equal((await pg.query('select deleted_at is not null as gone from users where id=11')).rows[0].gone,true);
assert.equal((await pg.query('select removed_at is not null as gone,active from organization_members where user_id=11 and organization_id=60')).rows[0].gone,true,'the membership is soft-removed, not hard-deleted');
assert.equal((await pg.query('select count(*)::int as n from agency_inventory_verifications where verified_by_user_id=11')).rows[0].n,1,'inventory history survives the user deletion');
assert.equal((await pg.query('select count(*)::int as n from destructive_email_challenges where user_id=11')).rows[0].n,0,'destructive challenges are removed with the user');
const viewerPreview=await destructivePreview(platformActor,'platform.user.delete',3);
const viewerAuth=await recentAuth(platformActor,viewerPreview.data.preview.id);
// Regresión: la vista previa (y la confirmación con el correo) de una persona no sirve
// para borrar a otra; el intento no consume la prueba ni toca a ninguna de las dos.
await pg.query("insert into users(id,email,password_hash,email_verified_at,is_demo_guest) values(912,'bystander@scale.example','unused',now(),false)");
const crossTarget=await call('/api/platform/users/912',{method:'DELETE',payload:{previewId:viewerPreview.data.preview.id,confirmation:'member@agency.example',recentAuthProof:viewerAuth.proof}});
assert.equal(crossTarget.status,409,'a user-delete preview is bound to its target user');
assert.equal((await pg.query('select deleted_at is null as alive from users where id=912')).rows[0].alive,true,'the other user survives a cross-target delete');
const removedViewer=await call('/api/platform/users/3',{method:'DELETE',payload:{previewId:viewerPreview.data.preview.id,confirmation:'member@agency.example',recentAuthProof:viewerAuth.proof}});
assert.equal(removedViewer.status,200);assert.deepEqual(removedViewer.data.deleted,{userId:3,self:false,agencies:[]});
assert.ok(!(await call('/api/platform/users?limit=100')).data.users.some(row=>row.email==='member@agency.example'),'deleted users leave the global listing');
assert.equal((await pg.query('select deleted_at is not null as gone from users where id=3')).rows[0].gone,true);
assert.equal((await destructivePreview(platformActor,'platform.user.delete',4)).status,404,'demo accounts are never deleted from the global panel');
assert.equal((await call('/api/platform/users/2',{method:'DELETE'})).status,401,'self deletion also requires a proof');
const selfPreview=await destructivePreview(platformActor,'platform.user.delete',2);
const selfAuth=await recentAuth(platformActor,selfPreview.data.preview.id);
const selfDeleted=await call('/api/platform/users/2',{method:'DELETE',payload:{previewId:selfPreview.data.preview.id,confirmation:'platform@scale.example',recentAuthProof:selfAuth.proof}});
assert.equal(selfDeleted.status,200);assert.equal(selfDeleted.data.deleted.self,true,'only the admin themselves can delete their own account');
assert.equal((await pg.query('select deleted_at is not null as gone from users where id=2')).rows[0].gone,true);
assert.equal((await pg.query('select count(*)::int as n from platform_administrators where active=true')).rows[0].n,0,'self-deletion also removes the global role');
await pg.close();
console.log('PASS: separated platform admin authorization, scoped lists, one-time explicit bootstrap and audit, explicit admin/viewer roles with write gating, /api/auth/me exposes the live global role (admin/viewer/null) and the startup wiring keeps the configured owner as active admin, re-authenticated global deletions (preview + single-use proof, forged/replayed/cross-preview rejection, demo targets protected), self-protected admins, and audited user/agency deletion.');
