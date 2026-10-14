// Seguridad (guía superadmin §6): límite antes de revelar existencia, CSV sin
// fórmulas, compare-and-set en cambios sensibles y lista cerrada anti-SSRF.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {neutralizeCsvValue,csvCell,csvRows} from './csv-safety.js';
import {personalDataExportCsv} from './personal-data.js';
import {assertOutboundUrl,hostAllowed,isPrivateAddress,outboundAllowlist,safeFetch,DEFAULT_OUTBOUND_HOSTS} from './outbound-allowlist.js';
import {requestClientKey,throttleClient} from './request-guard.js';
import {emailPasswordAuth} from './email-password-auth.js';
import {passwordAccess} from './password-access.js';
import {inviteLinks} from './invite-links.js';
import {rucLookup,RUC_LOOKUPS_PER_WINDOW} from './ruc-lookup.js';

// ── (b) CSV ──────────────────────────────────────────────────────────────────
for(const [input,expected] of [
 ['=HYPERLINK("http://x","clic")',`'=HYPERLINK("http://x","clic")`],['+cmd|calc',"'+cmd|calc"],['@SUM(A1)',"'@SUM(A1)"],['-2+3',"'-2+3"],
 ['  =1+1',"'  =1+1"],['\t=1',"'\t=1"],['\rx',"'\rx"],['-',"'-"],
 ['-12.50','-12.50'],['42','42'],['+595 981123456','+595 981123456'],['Ana','Ana'],['',''],[null,''],[true,'Sí'],
]){assert.equal(neutralizeCsvValue(input),expected,JSON.stringify(input));}
assert.equal(csvCell('a,b'),'"a,b"');assert.equal(csvCell('=1',{quote:true}),`"'=1"`);assert.equal(csvCell('di "hola"'),'"di ""hola"""');
assert.equal(csvRows([['a','=b']],{bom:true}),"﻿a,'=b\r\n");
const exported=personalDataExportCsv({subject:{kind:'lead',id:'1',name:'=cmd|"/c calc"!A1',email:'ana@example.invalid'},notice_version:'1',generated_at:'2026-10-14',sections:[{title:'Notas',rows:[{nota:'@SUM(1+1)',monto:'-150'}]}]});
assert.ok(exported.includes(`"'=cmd|""/c calc""!A1"`),'el export de datos personales neutraliza fórmulas');
assert.ok(exported.includes("'@SUM(1+1)")&&exported.includes(',-150'),'números negativos pasan tal cual');

// ── (d) Anti-SSRF ────────────────────────────────────────────────────────────
const hosts=['api.resend.com','*.okta.com'];
assert.equal(assertOutboundUrl('https://api.resend.com/emails',{allowedHosts:hosts}).hostname,'api.resend.com');
assert.equal(hostAllowed('acme.okta.com',hosts),true);assert.equal(hostAllowed('okta.com',hosts),false,'el comodín exige subdominio');
assert.equal(hostAllowed('evilokta.com',hosts),false);assert.equal(hostAllowed('acme.okta.com.evil.example',hosts),false);
for(const bad of ['http://api.resend.com/x','https://user:pw@api.resend.com/','https://api.resend.com:8443/','https://127.0.0.1/','https://[::1]/','https://169.254.169.254/latest/meta-data','https://10.0.0.8/','https://localhost/','https://8.8.8.8/','https://evil.example/','ftp://api.resend.com/','no es url']){
 assert.throws(()=>assertOutboundUrl(bad,{allowedHosts:[...hosts,'localhost','127.0.0.1','8.8.8.8']}),error=>error.code==='OUTBOUND_BLOCKED'&&error.status===502,bad);
}
for(const ip of ['10.1.2.3','172.16.0.1','192.168.1.1','127.0.0.1','169.254.1.1','100.64.0.1','0.0.0.0','::1','fd00::1','fe80::1','::ffff:10.0.0.1'])assert.equal(isPrivateAddress(ip),true,ip);
assert.equal(isPrivateAddress('api.resend.com'),false);assert.equal(isPrivateAddress('8.8.8.8'),false);
const env={OUTBOUND_ALLOWED_HOSTS:'sso.miagencia.com.py, *.keycloak.example ,mal valor',RUC_LOOKUP_PROVIDER_URL:'https://ruc.proveedor.example/api',IA_BASE_URL:'http://inseguro.example'};
const list=outboundAllowlist(env);
assert.ok(DEFAULT_OUTBOUND_HOSTS.every(host=>list.includes(host)));
assert.ok(list.includes('sso.miagencia.com.py')&&list.includes('*.keycloak.example')&&list.includes('ruc.proveedor.example'));
assert.ok(!list.includes('mal valor')&&!list.includes('inseguro.example'),'solo hosts válidos y URLs https del operador');
{
 const calls=[];const fetchImpl=async(url,init)=>{calls.push({url,init});return new Response('{}');};
 await safeFetch('https://api.resend.com/emails',{method:'POST',redirect:'follow'},{allowedHosts:hosts,fetchImpl});
 assert.equal(calls[0].init.redirect,'error','sin redirecciones');
 await assert.rejects(()=>safeFetch('https://evil.example/',{},{allowedHosts:hosts,fetchImpl}),error=>error.code==='OUTBOUND_BLOCKED');
 assert.equal(calls.length,1,'el destino bloqueado no recibe el pedido');
}

// ── Base para límites y compare-and-set ──────────────────────────────────────
const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');
const pg=new PGlite();await pg.exec(await read('./schema.sql'));
for(const f of migrationOrder)await pg.exec(await read('./migrations/'+f));
const seen=[];
const query=(s,v)=>{seen.push(String(s));return pg.query(s,v);},db={query,connect:async()=>({query,release(){}})};
const touched=pattern=>seen.filter(sql=>pattern.test(sql)).length;

// requestClientKey: hash sin IP en crudo, X-Forwarded-For primero.
assert.match(requestClientKey({headers:{'x-forwarded-for':'203.0.113.1, 10.0.0.1'}}),/^[a-f0-9]{32}$/);
assert.equal(requestClientKey({headers:{'x-forwarded-for':'203.0.113.1'}}),requestClientKey({headers:{},socket:{remoteAddress:'203.0.113.1'}}));
assert.notEqual(requestClientKey({headers:{'x-forwarded-for':'203.0.113.1'}}),requestClientKey({headers:{'x-forwarded-for':'203.0.113.2'}}));
assert.equal(await throttleClient(db,{headers:{'x-forwarded-for':'198.51.100.1'}},'unit',1),true);
assert.equal(await throttleClient(db,{headers:{'x-forwarded-for':'198.51.100.1'}},'unit',1),false);
assert.equal(await throttleClient(db,{headers:{'x-forwarded-for':'198.51.100.2'}},'unit',1),true,'otro cliente, otro balde');

// ── (a) Límite ANTES de revelar existencia ───────────────────────────────────
// Registro por invitación: rotando correos desde un mismo cliente, el tope corta
// antes de consultar el enlace (resolveInvite revela si el token existe).
async function inviteRegister(i,ip='203.0.113.10'){
 let response;
 await emailPasswordAuth({req:{method:'POST',headers:{'x-forwarded-for':ip}},res:{},url:new URL('https://admin.scaleparaguay.com/api/auth/password/invitations/register'),db,
  body:async()=>({email:`rota${i}@example.invalid`,password:'ClaveSegura!2026',token:crypto.randomBytes(32).toString('base64url')}),
  send:(_,status,data)=>{response={status,data};},sendVerification:async()=>true,emailAvailable:true,cookie:()=>'',id:()=>'x'});
 return response;
}
for(let i=0;i<10;i++)assert.equal((await inviteRegister(i)).status,410,'enlace inexistente');
const lookupsBefore=touched(/from agency_invite_links/);
assert.equal((await inviteRegister(99)).status,429,'tope por cliente aunque cambie el correo');
assert.equal(touched(/from agency_invite_links/),lookupsBefore,'el 429 no consultó el enlace');

// Alta con correo: el 409 «ya existe» queda detrás del tope por cliente.
await pg.query("insert into users(email,password_hash,email_verified_at) values('existe@example.invalid','x',now())");
async function signup(email,ip='203.0.113.11'){
 let response;
 await emailPasswordAuth({req:{method:'POST',headers:{'x-forwarded-for':ip}},res:{},url:new URL('https://admin.scaleparaguay.com/api/auth/password/register'),db,
  body:async()=>({email,password:'ClaveSegura!2026',company:'Agencia',currency:'USD',consent:true}),send:(_,status,data)=>{response={status,data};},sendVerification:async()=>true,emailAvailable:true,cookie:()=>'',id:()=>'x'});
 return response;
}
for(let i=0;i<10;i++)await signup(`nuevo${i}@example.invalid`);
const usersBefore=touched(/from users where email=\$1 for update/);
assert.equal((await signup('existe@example.invalid')).status,429,'no revela que la cuenta existe');
assert.equal(touched(/from users where email=\$1 for update/),usersBefore);

// Recuperar contraseña: tras el tope por cliente ya no se busca la cuenta (respuesta idéntica).
async function resetRequest(email,ip='203.0.113.12'){
 let response;
 await passwordAccess({req:{method:'POST',headers:{'x-forwarded-for':ip}},res:{},url:new URL('https://test/api/auth/password/request'),db,body:async()=>({email}),send:(_,status,data)=>{response={status,data};},sendReset:async()=>true,emailAvailable:true});
 return response;
}
const quiet=console.info;console.info=()=>{};
for(let i=0;i<10;i++)await resetRequest(`enum${i}@example.invalid`);
const accountLookups=touched(/select id from users where email=\$1 and exists/);
const limited=await resetRequest('existe@example.invalid');
console.info=quiet;
assert.equal(limited.status,202,'misma respuesta para no revelar el tope');
assert.equal(touched(/select id from users where email=\$1 and exists/),accountLookups,'sin búsqueda de la cuenta');

// Vista previa pública de invitaciones.
async function preview(ip='203.0.113.13'){
 let response;
 await inviteLinks({req:{method:'GET',headers:{'x-forwarded-for':ip}},res:{},url:new URL('https://test/api/invitations/preview?token='+crypto.randomBytes(32).toString('base64url')),db,session:async()=>null,body:async()=>({}),send:(_,status,data)=>{response={status,data};}});
 return response;
}
for(let i=0;i<60;i++)assert.equal((await preview()).status,410);
const previewLookups=touched(/from agency_invite_links/);
assert.equal((await preview()).status,429);
assert.equal(touched(/from agency_invite_links/),previewLookups);
assert.equal((await preview('203.0.113.14')).status,410,'otro cliente sigue pudiendo');

// RUC: tope por usuario antes de la caché (que revela si un RUC ya se consultó).
{
 const org=(await pg.query("select id from organizations where slug='scale'")).rows[0].id;
 const user={id:777,organization_id:org,role:'owner'};let providerCalls=0,last;
 const provider={lookup:async()=>{providerCalls++;return null;}};
 const config={providerUrl:'https://ruc.sun.com.py/api/ruc',timeoutMs:1000,cacheTtlSeconds:60,noResultTtlSeconds:60,monthlyLimit:100};
 await pg.query("insert into scale_ruc_usage(month,used) values(date_trunc('month',current_date)::date,0) on conflict(month) do update set used=0");
 const call=()=>rucLookup({req:{method:'POST',socket:{}},res:{},url:new URL('https://test/api/agency/ruc-lookup'),db,session:async()=>user,body:async()=>({ruc:'80168807-8'}),send:(_,status,data)=>{last={status,...data};},provider,config});
 const quietError=console.error;console.error=()=>{};
 for(let i=0;i<RUC_LOOKUPS_PER_WINDOW;i++){await call();assert.equal(last.status,200);}
 const cacheReads=touched(/from agency_ruc_lookup_cache/);
 await call();console.error=quietError;
 assert.equal(last.status,429,'tope por usuario');assert.equal(touched(/from agency_ruc_lookup_cache/),cacheReads,'el 429 no lee la caché');
 assert.equal(providerCalls,1,'la caché evitó el resto de las consultas externas');
}

// Orden en el login (server.js): el tope por cliente y por correo antes de buscar el usuario.
{
 const server=await read('./server.js');
 const block=server.slice(server.indexOf("url.pathname === '/api/auth/login'"),server.indexOf("url.pathname === '/api/auth/providers'"));
 assert.ok(block.indexOf("throttleClient(db,req,'login'")>0&&block.indexOf("throttleClient(db,req,'login'")<block.indexOf('from users where email'),'login: límite antes de la búsqueda');
}

// ── (c) Compare-and-set en el cambio de contraseña ───────────────────────────
{
 const uid=(await pg.query("insert into users(email,password_hash,email_verified_at) values('cas@example.invalid','hash-original',now()) returning id")).rows[0].id;
 const tokenA=crypto.randomBytes(32).toString('hex');
 const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
 await pg.query("insert into password_resets(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[sha(tokenA),uid]);
 // Simula un segundo pedido que cambia la contraseña entre la lectura y la escritura.
 const racing={query:async(s,v)=>{const result=await pg.query(s,v);if(/select password_hash from users where id=\$1/.test(s))await pg.query("update users set password_hash='hash-del-otro-pedido' where id=$1",[uid]);return result;}};
 const racingDb={query:racing.query,connect:async()=>({query:racing.query,release(){}})};
 let response;const quietError=console.error;console.error=()=>{};
 await passwordAccess({req:{method:'POST',headers:{}},res:{},url:new URL('https://test/api/auth/password/reset'),db:racingDb,body:async()=>({token:tokenA,password:'OtraClave!2026'}),send:(_,status,data)=>{response={status,data};},sendReset:async()=>true});
 console.error=quietError;
 assert.equal(response.status,409,'el segundo cambio simultáneo no pisa al primero');
 // (PGlite usa una sola conexión: el rollback también revierte el cambio simulado; lo importante es que el hash nuevo no se escribió.)
 assert.ok(!(await pg.query('select password_hash from users where id=$1',[uid])).rows[0].password_hash.startsWith('$2'),'el hash de este pedido no se escribió');
 assert.equal((await pg.query('select count(*)::int as n from password_resets where token_hash=$1',[sha(tokenA)])).rows[0].n,1,'el 409 revierte: el enlace sigue sin consumir');
}

await pg.close();
console.log('PASS: seguridad §6 — límite antes de revelar existencia, CSV sin fórmulas, compare-and-set y lista cerrada anti-SSRF');
