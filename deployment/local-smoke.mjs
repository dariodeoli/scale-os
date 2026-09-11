// Opt-in smoke test against a disposable local PostgreSQL + unified local service.
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const {Pool}=createRequire(new URL('../backend/package.json',import.meta.url))('pg');
const base=new URL(process.env.SMOKE_BASE_URL||'http://127.0.0.1:32147');
const database=new URL(process.env.DATABASE_URL||'');
assert.equal(base.hostname,'127.0.0.1');assert.equal(base.protocol,'http:');
assert.equal(database.pathname,'/scale_unified_fixture');
assert(database.searchParams.get('host')?.startsWith('/tmp/scale-unified-pg-'),'Disposable UNIX-socket fixture required; never production');
const pool=new Pool({connectionString:database.href});
const version=readFileSync(new URL('../app/app-version.ts',import.meta.url),'utf8').match(/APP_VERSION\s*=\s*'([^']+)'/)[1];
function request(path,{host='app.scaleparaguay.com',cookie,method='GET',body}={}){
 return new Promise((resolve,reject)=>{
  const req=http.request(new URL(path,base),{method,headers:{Host:host,Origin:'https://app.scaleparaguay.com',...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})}},res=>{
   let text='';res.setEncoding('utf8');res.on('data',chunk=>{text+=chunk;});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text,json:()=>JSON.parse(text)}));
  });
  req.setTimeout(5000,()=>req.destroy(Error('Fixture request timeout')));req.on('error',reject);req.end(body?JSON.stringify(body):undefined);
 });
}
try{
 for(const path of ['/health','/core-api/health']){
  const r=await request(path);assert.equal(r.status,200);assert.equal(r.json().database,'ready');
 }
 assert.equal((await request('/invitacion')).status,200);
 assert.equal((await request('/brand/icon-192.png')).status,200);
 const alias=await request('/api/auth/providers',{host:'admin.scaleparaguay.com'});
 assert.equal(alias.status,200);assert.equal(alias.json().google,false,'No external Google credentials in fixture');
 const landing=await request('/',{host:'sistema.scaleparaguay.com'});
 assert.equal(landing.status,200);assert(landing.text.includes('v'+version));
 assert.equal((await request('/core-api/api/invitations/preview?token=invalid')).status,410);
 const org=(await pool.query("select id from organizations where slug='scale'")).rows[0].id;
 const user=(await pool.query("insert into users(email,password_hash) values($1,'!fixture') returning id",[`unified-${crypto.randomUUID()}@example.invalid`])).rows[0].id;
 await pool.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,user]);
 const token=crypto.randomUUID();
 await pool.query("insert into sessions(id,user_id,organization_id,expires_at) values($1,$2,$3,now()+interval '5 minutes')",[token,user,org]);
 const cookie='scale_session='+token;
 assert.equal((await request('/core-api/api/auth/me',{cookie})).status,200);
 for(const mode of ['single','approval']){
  const made=await request('/core-api/api/agency/invite-links',{cookie,method:'POST',body:{role:'viewer',mode}});
  assert.equal(made.status,200);
  const link=new URL(made.json().url);
  assert.equal(link.origin,'https://app.scaleparaguay.com');
  const preview=await request('/core-api/api/invitations/preview?'+link.searchParams);
  assert.equal(preview.status,200);assert.equal(preview.json().mode,mode);
  const legacy=await request('/api/invitations/preview?'+link.searchParams,{host:'admin.scaleparaguay.com'});
  assert.equal(legacy.status,200);assert.equal(legacy.json().mode,mode);
 }
 console.log('PASS unified HTTP + real disposable PostgreSQL: health, app, images, landing, admin alias, session, both invitation modes and invalid token. No OAuth provider called.');
}finally{await pool.end();}
