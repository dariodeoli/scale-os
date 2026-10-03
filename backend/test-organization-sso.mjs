import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {clearDiscoveryCache, fetchDiscovery, jitProvision, newVerificationToken, normalizeDomain, oidcCallback, oidcStart, organizationSso, providerForEmail, providerInput, recordSsoEvent, verifyDomainDns} from './organization-sso.js';

// SSO Fase 2A (#159): dominios verificados por DNS TXT, proveedor OIDC por
// organización, start con PKCE/nonce y callback mockeado con JIT provisioning.
// Sin red ni IdP reales: fetch y resolver DNS se inyectan en cada caso.
const failDns=async()=>{throw Object.assign(new Error('queryTxt ENOTFOUND'),{code:'ENOTFOUND'});};

// ── Dominios: normalización, públicos, IP y token de verificación ────────────
assert.equal(normalizeDomain('  https://Contoso.COM. '),'contoso.com');
assert.equal(normalizeDomain('ACME.com.ar'),'acme.com.ar');
assert.throws(()=>normalizeDomain('gmail.com'),/público/i);
assert.throws(()=>normalizeDomain('hotmail.com'),/público/i);
assert.throws(()=>normalizeDomain('outlook.com'),/público/i);
assert.throws(()=>normalizeDomain('192.168.0.10'),/IP/i);
assert.throws(()=>normalizeDomain('contoso'),/extensión/i);
assert.throws(()=>normalizeDomain('contoso.com/ruta'),/solo el dominio/i);
assert.throws(()=>normalizeDomain('_sso.contoso.com'),/no es válido/i);
assert.throws(()=>normalizeDomain(''),/Indicá/i);
const freshToken=newVerificationToken();
assert.match(freshToken,/^[a-f0-9]{48}$/,'token de verificación aleatorio');

// ── DNS TXT: match exacto, fragmentos, registro ausente y error de DNS ───────
assert.equal(await verifyDomainDns('contoso.com',freshToken,async()=>[['otro=1'],['scale-os-verify='+freshToken]]),true);
assert.equal(await verifyDomainDns('contoso.com',freshToken,async()=>[['scale-os-','verify='+freshToken]]),true,'el TXT puede venir en fragmentos');
assert.equal(await verifyDomainDns('contoso.com',freshToken,async()=>[['scale-os-verify=otro-token']]),false);
assert.equal(await verifyDomainDns('contoso.com',freshToken,async()=>[]),false);
assert.equal(await verifyDomainDns('contoso.com',freshToken,failDns),false,'sin registro no verifica ni rompe');

// ── Config del proveedor: validación y parciales para PATCH ──────────────────
assert.deepEqual(providerInput({issuer:'https://idp.contoso.com',client_id:'cid',client_secret:'sec'}),{kind:'oidc',issuer:'https://idp.contoso.com',clientId:'cid',clientSecret:'sec',discoveryUrl:null,active:true});
assert.deepEqual(providerInput({issuer:'https://idp.contoso.com/',client_id:'cid',client_secret:'sec',discovery_url:'https://idp.contoso.com/.well-known/openid-configuration'}),{kind:'oidc',issuer:'https://idp.contoso.com',clientId:'cid',clientSecret:'sec',discoveryUrl:'https://idp.contoso.com/.well-known/openid-configuration',active:true});
assert.deepEqual(providerInput({active:false},{partial:true}),{active:false});
assert.throws(()=>providerInput({issuer:'http://idp.contoso.com',client_id:'cid',client_secret:'sec'}),/https/i);
assert.throws(()=>providerInput({issuer:'https://idp.contoso.com',client_id:'',client_secret:'sec'}),/client_id/i);
assert.throws(()=>providerInput({otro:1},{partial:true}),/Campos/i);
assert.throws(()=>providerInput({},{partial:true}),/No hay cambios/i);

// ── Base: schema + cadena curada completa (incluye la migración 20261005) ────
const pg=new PGlite();
await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
for(const file of migrationOrder)await pg.exec(await fs.readFile(new URL(`./migrations/${file}`,import.meta.url),'utf8'));
const query=(sql,params)=>pg.query(sql,params);
const db={query,connect:async()=>({query,release(){}})};
const org=(await query("insert into organizations(slug,name) values('contoso','Contoso SA') returning id")).rows[0].id;
const other=(await query("insert into organizations(slug,name) values('otra','Otra SA') returning id")).rows[0].id;
const ownerId=(await query("insert into users(email,password_hash,role) values('owner@contoso.com','hash','owner') returning id")).rows[0].id;
const viewerId=(await query("insert into users(email,password_hash,role) values('viewer@contoso.com','hash','viewer') returning id")).rows[0].id;
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[org,ownerId,viewerId]);
const ownerUser={id:ownerId,role:'owner',organization_id:org};
const viewerUser={id:viewerId,role:'viewer',organization_id:org};

// ── Admin: capability, CRUD de proveedores/dominios y secreto nunca en GET ───
const fakeSend=result=>(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(payload));return true;};
async function admin({method='GET',path,payload,user=ownerUser,dnsRecords}={}){
 const result={status:0,headers:{},body:''};
 await organizationSso({
  req:{method,socket:{remoteAddress:'127.0.0.1'}},
  res:{setHeader(k,v){result.headers[k]=v;},writeHead(status,headers){result.status=status;Object.assign(result.headers,headers||{});},end(body){result.body=body||'';}},
  url:new URL('https://api.scaleparaguay.com'+path),
  db,
  session:async()=>user,
  body:async()=>({...(payload||{})}),
  send:fakeSend(result),
  resolveTxt:async()=>dnsRecords||[],
 });
 return result;
}
let r=await admin({user:viewerUser,path:'/api/agency/sso/providers'});
assert.equal(r.status,403,'viewer no configura SSO');
r=await admin({path:'/api/agency/sso/providers'});
assert.equal(r.status,200);assert.deepEqual(JSON.parse(r.body),{providers:[]});
r=await admin({method:'POST',path:'/api/agency/sso/providers',payload:{issuer:'https://idp.contoso.com',client_id:'cid-contoso',client_secret:'super-secreto'}});
assert.equal(r.status,201);
const created=JSON.parse(r.body).provider;
assert.equal(created.client_secret_set,true);assert.equal(Object.hasOwn(created,'client_secret'),false);
assert.equal(created.active,true);assert.equal(created.issuer,'https://idp.contoso.com');
r=await admin({method:'POST',path:'/api/agency/sso/providers',payload:{issuer:'https://idp.contoso.com',client_id:'otro',client_secret:'x'}});
assert.equal(r.status,409,'emisor duplicado por organización');
r=await admin({path:'/api/agency/sso/providers'});
assert.equal(r.status,200);assert.ok(!r.body.includes('super-secreto'),'el GET no expone el client_secret');assert.equal(JSON.parse(r.body).providers[0].client_secret_set,true);
r=await admin({method:'PATCH',path:`/api/agency/sso/providers/${created.id}`,payload:{active:false}});
assert.equal(r.status,200);assert.equal(JSON.parse(r.body).provider.active,false);
r=await admin({method:'PATCH',path:`/api/agency/sso/providers/${created.id}`,payload:{active:true}});
assert.equal(r.status,200);assert.equal(JSON.parse(r.body).provider.active,true);
r=await admin({method:'POST',path:'/api/agency/sso/domains',payload:{domain:'https://Contoso.com.'}});
assert.equal(r.status,201);
const domain=JSON.parse(r.body).domain;
assert.equal(domain.domain,'contoso.com');assert.equal(domain.verified,false);
assert.match(domain.txt_value,/^scale-os-verify=[a-f0-9]{48}$/);
r=await admin({method:'POST',path:'/api/agency/sso/domains',payload:{domain:'gmail.com'}});
assert.equal(r.status,400,'dominio público rechazado en el endpoint');
r=await admin({method:'POST',path:'/api/agency/sso/domains',payload:{domain:'contoso.com'}});
assert.equal(r.status,409,'dominio duplicado');
r=await admin({method:'POST',path:`/api/agency/sso/domains/${domain.id}/verify`});
assert.equal(r.status,200);assert.equal(JSON.parse(r.body).verified,false);
const verifiedToken=JSON.parse((await admin({path:'/api/agency/sso/domains'})).body).domains[0].txt_value.split('=')[1];
r=await admin({method:'POST',path:`/api/agency/sso/domains/${domain.id}/verify`,dnsRecords:[[`scale-os-verify=${verifiedToken}`]]});
assert.equal(r.status,200);assert.equal(JSON.parse(r.body).verified,true);assert.equal(JSON.parse(r.body).domain.verified,true);

// ── Routing por dominio verificado (y no por dominio suelto o inactivo) ──────
const providerRow=await providerForEmail(db,'ANA@contoso.com');
assert.equal(String(providerRow.id),String(created.id));
assert.equal(String(providerRow.organization_slug),'contoso');
await query("insert into organization_identity_providers(organization_id,kind,issuer,client_id,client_secret) values($1,'oidc','https://idp.otra.com','cid-otra','sec-otra')",[other]);
await query("insert into organization_email_domains(organization_id,domain,verification_token) values($1,'sinverificar.com','tok')",[other]);
assert.equal(await providerForEmail(db,'ana@sinverificar.com'),null,'dominio sin verificar no rutea');
await query("update organization_identity_providers set active=false where id=$1",[created.id]);
assert.equal(await providerForEmail(db,'ana@contoso.com'),null,'proveedor inactivo no rutea');
await query("update organization_identity_providers set active=true where id=$1",[created.id]);

// ── Discovery cacheado y con emisor validado ─────────────────────────────────
const discoveryData={issuer:'https://idp.contoso.com',authorization_endpoint:'https://idp.contoso.com/authorize',token_endpoint:'https://idp.contoso.com/token',userinfo_endpoint:'https://idp.contoso.com/userinfo'};
let discoveryCalls=0;
const discoveryFetch=async()=>{discoveryCalls++;return {ok:true,json:async()=>discoveryData};};
clearDiscoveryCache();
const discovery=await fetchDiscovery({issuer:'https://idp.contoso.com',discovery_url:null},{fetchImpl:discoveryFetch});
assert.equal(discovery.authorizationEndpoint,'https://idp.contoso.com/authorize');
await fetchDiscovery({issuer:'https://idp.contoso.com',discovery_url:null},{fetchImpl:discoveryFetch});
assert.equal(discoveryCalls,1,'el discovery se cachea por proceso');
await assert.rejects(()=>fetchDiscovery({issuer:'https://idp.otro.com',discovery_url:null},{fetchImpl:discoveryFetch,force:true}),/no coincide/i);

// ── Start OIDC: PKCE + nonce + state en DB y redirect al authorize ───────────
clearDiscoveryCache();
const oauthCookie=(value,age,provider)=>`scale_oauth_state_${provider}=${value}; Max-Age=${age}`;
async function start(queryString,fetchImpl=discoveryFetch,env={}){
 const result={status:0,headers:{},body:''};
 await oidcStart({
  req:{method:'GET',socket:{remoteAddress:'127.0.0.1'}},
  res:{writeHead(status,headers){result.status=status;Object.assign(result.headers,headers||{});},end(body){result.body=body||'';}},
  url:new URL('https://api.scaleparaguay.com/api/auth/oidc/start?'+queryString),
  db,
  send:fakeSend(result),
  oauthStateCookie:oauthCookie,
  fetchImpl,
  env:{APP_URL:'https://app.scaleparaguay.com',OIDC_REDIRECT_URI:'https://admin.scaleparaguay.com/api/auth/oidc/callback',...env},
 });
 return result;
}
let started=await start('org=contoso');
assert.equal(started.status,302);
const authorize=new URL(started.headers.Location);
assert.equal(`${authorize.origin}${authorize.pathname}`,'https://idp.contoso.com/authorize');
assert.equal(authorize.searchParams.get('client_id'),'cid-contoso');
assert.equal(authorize.searchParams.get('code_challenge_method'),'S256');
assert.equal(authorize.searchParams.get('scope'),'openid email profile');
assert.equal(authorize.searchParams.get('redirect_uri'),'https://admin.scaleparaguay.com/api/auth/oidc/callback');
const state=authorize.searchParams.get('state'),nonce=authorize.searchParams.get('nonce');
assert.match(state,/^[a-f0-9]{64}$/);assert.match(nonce,/^[a-f0-9]{64}$/);
assert.equal(started.headers['Set-Cookie'],`scale_oauth_state_oidc=${state}; Max-Age=600`);
const saved=(await query('select organization_slug,redirect_uri,provider,code_verifier,nonce from oauth_states where state=$1',[state])).rows[0];
assert.equal(saved.organization_slug,'contoso');
assert.equal(saved.provider,`oidc:${created.id}`);
assert.equal(saved.nonce,nonce);
assert.ok(saved.code_verifier&&saved.code_verifier.length>=43,'PKCE verifier guardado');
assert.match(authorize.searchParams.get('code_challenge'),/^[A-Za-z0-9_-]{43}$/);
started=await start('email=ana@contoso.com');
assert.equal(started.status,302,'el correo de un dominio verificado rutea al IdP');
started=await start('email=ana@gmail.com');
assert.equal(started.status,404,'sin proveedor para el correo');
started=await start('org=sin-sso');
assert.equal(started.status,404,'organización sin SSO');
started=await start('org=1');
assert.equal(started.status,404,'organización sin SSO por id');

// ── Callback mockeado: canje, userinfo, JIT viewer y eventos ─────────────────
const idToken=claims=>`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.firma`;
const authFetchFor=({profile,claims})=>{
 const calls=[];
 const impl=async(url,init={})=>{
  const target=String(url);
  if(target.includes('.well-known'))return {ok:true,json:async()=>discoveryData};
  if(target.includes('/token')){
   calls.push({url:target,body:String(init.body||'')});
   const token={access_token:'at-'+(profile.sub||'x')};
   if(claims)token.id_token=idToken(claims);
   return {ok:true,json:async()=>token};
  }
  if(target.includes('/userinfo'))return {ok:true,json:async()=>profile};
  throw Error('fetch inesperado '+target);
 };
 return {calls,impl};
};
async function callback({state:stateValue,code='code',auth,method='GET'}){
 const result={status:0,headers:{},body:''};
 await oidcCallback({
  req:{method,headers:{cookie:`scale_oauth_state_oidc=${stateValue}`},socket:{remoteAddress:'127.0.0.1'}},
  res:{writeHead(status,headers){result.status=status;Object.assign(result.headers,headers||{});},end(body){result.body=body||'';}},
  url:new URL('https://api.scaleparaguay.com/api/auth/oidc/callback'),
  db,
  send:fakeSend(result),
  parseCookies:()=>({'scale_oauth_state_oidc':stateValue}),
  oauthStateCookie:oauthCookie,
  fields:{state:stateValue,code},
  fetchImpl:auth.impl,
  env:{APP_URL:'https://app.scaleparaguay.com'},
 });
 return result;
}
const anaClaims={iss:'https://idp.contoso.com',aud:'cid-contoso',sub:'sub-ana',exp:Math.floor(Date.now()/1000)+300,nonce};
const anaAuth=authFetchFor({profile:{sub:'sub-ana',email:'ana@contoso.com',name:'Ana Pérez',email_verified:true},claims:anaClaims});
const completed=await callback({state,code:'code-ana',auth:anaAuth});
assert.equal(completed.status,302);
const complete=new URL(completed.headers.Location);
assert.equal(complete.origin,'https://app.scaleparaguay.com');
assert.equal(complete.pathname,'/core-api/api/auth/oidc/complete');
const ticket=complete.searchParams.get('ticket');assert.match(ticket,/^[a-f0-9]{64}$/);
assert.equal(completed.headers['Set-Cookie'],'scale_oauth_state_oidc=; Max-Age=0');
assert.ok(anaAuth.calls[0].body.includes('code_verifier='),'el canje manda el verifier de PKCE');
assert.ok(anaAuth.calls[0].body.includes('client_secret=super-secreto'));
const replay=await callback({state,auth:anaAuth});
assert.equal(replay.status,400,'el state es single-use');
const ana=(await query("select id,role,email_verified_at from users where email='ana@contoso.com'")).rows[0];
assert.equal(ana.role,'viewer');assert.ok(ana.email_verified_at);
assert.deepEqual((await query('select role,active from organization_members where organization_id=$1 and user_id=$2',[org,ana.id])).rows[0],{role:'viewer',active:true});
assert.deepEqual((await query('select provider,subject from user_social_identities where user_id=$1',[ana.id])).rows[0],{provider:`oidc:${created.id}`,subject:'sub-ana'});
assert.deepEqual((await query('select event,email from organization_sso_events where user_id=$1 order by id',[ana.id])).rows,[{event:'jit_created',email:'ana@contoso.com'},{event:'login',email:'ana@contoso.com'}]);
assert.equal((await query('select count(*)::int as n from oauth_handoffs where user_id=$1 and organization_id=$2 and normal_login',[ana.id,org])).rows[0].n,1);

// Usuario existente: se vincula sin duplicar y registra `linked` + `login`.
const bobId=(await query("insert into users(email,password_hash,role) values('bob@contoso.com','hash','editor') returning id")).rows[0].id;
const bobStarted=await start('email=bob@contoso.com');
assert.equal(bobStarted.status,302);
const bobAuthorize=new URL(bobStarted.headers.Location);
const bobState=bobAuthorize.searchParams.get('state'),bobNonce=bobAuthorize.searchParams.get('nonce');
const bobAuth=authFetchFor({profile:{sub:'sub-bob',email:'bob@contoso.com',email_verified:true},claims:{iss:'https://idp.contoso.com',aud:'cid-contoso',sub:'sub-bob',exp:Math.floor(Date.now()/1000)+300,nonce:bobNonce}});
assert.equal((await callback({state:bobState,auth:bobAuth})).status,302);
assert.equal((await query("select count(*)::int as n from users where email='bob@contoso.com'")).rows[0].n,1,'no duplica el usuario existente');
assert.deepEqual((await query('select event from organization_sso_events where user_id=$1 order by id',[bobId])).rows.map(row=>row.event),['linked','login']);
assert.equal(String((await query('select user_id from organization_members where organization_id=$1 and user_id=$2',[org,bobId])).rows[0].user_id),String(bobId));

// Nonce del id_token equivocado: no crea identidad ni sesión.
const badStarted=await start('email=nuevo@contoso.com');
const badAuthorize=new URL(badStarted.headers.Location);
const badState=badAuthorize.searchParams.get('state');
const badAuth=authFetchFor({profile:{sub:'sub-malo',email:'nuevo@contoso.com',email_verified:true},claims:{iss:'https://idp.contoso.com',aud:'cid-contoso',sub:'sub-malo',exp:Math.floor(Date.now()/1000)+300,nonce:'otro-nonce'}});
const badResult=await callback({state:badState,auth:badAuth});
assert.equal(badResult.status,302);
assert.match(decodeURIComponent(new URL(badResult.headers.Location).searchParams.get('authError')),/nonce/i);
assert.equal((await query("select count(*)::int as n from users where email='nuevo@contoso.com'")).rows[0].n,0);

// Acceso removido no se reactiva con un nuevo login SSO.
await query("update organization_members set active=false,removed_at=now() where organization_id=$1 and user_id=$2",[org,ana.id]);
const removedStarted=await start('email=ana@contoso.com');
const removedAuthorize=new URL(removedStarted.headers.Location);
const removedState=removedAuthorize.searchParams.get('state'),removedNonce=removedAuthorize.searchParams.get('nonce');
const removedAuth=authFetchFor({profile:{sub:'sub-ana',email:'ana@contoso.com',email_verified:true},claims:{iss:'https://idp.contoso.com',aud:'cid-contoso',sub:'sub-ana',exp:Math.floor(Date.now()/1000)+300,nonce:removedNonce}});
const removedResult=await callback({state:removedState,auth:removedAuth});
assert.equal(removedResult.status,302);
assert.match(decodeURIComponent(new URL(removedResult.headers.Location).searchParams.get('authError')),/no está activo/i);
assert.deepEqual((await query('select active,removed_at is not null as removed from organization_members where organization_id=$1 and user_id=$2',[org,ana.id])).rows[0],{active:false,removed:true});

// Proveedor desactivado entre start y callback: se rechaza con destino fijo.
const lateStarted=await start('org=contoso');
const lateAuthorize=new URL(lateStarted.headers.Location);
const lateState=lateAuthorize.searchParams.get('state');
await query('update organization_identity_providers set active=false where id=$1',[created.id]);
const lateResult=await callback({state:lateState,auth:authFetchFor({profile:{sub:'x'}})});
assert.equal(lateResult.status,302);
assert.match(decodeURIComponent(new URL(lateResult.headers.Location).searchParams.get('authError')),/ya no está disponible/i);
await query('update organization_identity_providers set active=true where id=$1',[created.id]);

// Cookie/state ausente en GET: no se canjea nada.
const noCookie={status:0,headers:{},body:''};
await oidcCallback({
 req:{method:'GET',headers:{cookie:''},socket:{remoteAddress:'127.0.0.1'}},
 res:{writeHead(status,headers){noCookie.status=status;Object.assign(noCookie.headers,headers||{});},end(body){noCookie.body=body||'';}},
 url:new URL('https://api.scaleparaguay.com/api/auth/oidc/callback'),
 db,
 send:fakeSend(noCookie),
 parseCookies:()=>({}),
 oauthStateCookie:oauthCookie,
 fields:{state:'a'.repeat(64),code:'x'},
 fetchImpl:authFetchFor({profile:{}}).impl,
 env:{APP_URL:'https://app.scaleparaguay.com'},
});
assert.equal(noCookie.status,400,'sin cookie de state no hay callback');

// ── Eventos: evento inválido rechazado; jitProvision exige correo verificado ─
await assert.rejects(()=>recordSsoEvent(db,{organizationId:org,event:'otro'}),/Evento SSO inválido/);
await assert.rejects(()=>jitProvision(db,{organizationId:org,provider:{id:created.id},profile:{subject:'s',email:'x@contoso.com',emailVerified:false}}),/correo verificado/i);
await pg.close();
console.log('PASS: SSO Fase 2A #159 — dominios verificados por DNS TXT, proveedor OIDC por organización (secreto nunca en GET), start con PKCE/nonce y callback mockeado con JIT viewer, vinculación y eventos.');
