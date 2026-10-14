import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {platformRouter,PLATFORM_HANDLERS} from './platform-router.js';
import {PLATFORM_GATE_MESSAGE} from './platform-admin.js';
import {DEMO_FILTER_HELPERS} from './platform-demo-filter.js';

// Guard único del panel global (guía §1) y filtro único de demos (guía §3).
const here=new URL('.',import.meta.url);
const read=file=>fs.readFileSync(new URL(file,here),'utf8');
const backendFiles=fs.readdirSync(here).filter(file=>file.endsWith('.js'));

// ── 1. Inventario: quién sirve /api/platform/* ─────────────────────────────────
const routeLiteral=/['"`]\/api\/platform(?:\/|['"`])|\\\/api\\\/platform/;
const routerSource=read('platform-router.js');
const registered=[...routerSource.matchAll(/from '\.\/(platform-[\w-]+\.js)'/g)].map(match=>match[1]);
const serving=backendFiles.filter(file=>file!=='platform-router.js'&&routeLiteral.test(read(file).replace(/\/\/.*$/gm,'')));
for(const file of serving)assert.ok(registered.includes(file),`${file} sirve rutas /api/platform/* pero no está registrado en platform-router.js (se saltearía el guard)`);
assert.equal(PLATFORM_HANDLERS.length,registered.length,'cada módulo importado por el router aporta su handler a PLATFORM_HANDLERS');
const server=read('server.js');
assert.equal((server.match(/platformRouter\(/g)||[]).length,1,'server.js entra al panel global por un solo punto');
assert.doesNotMatch(server.replace(/\/\/.*$/gm,''),/['"`]\/api\/platform/,'server.js no despacha rutas globales por su cuenta');
assert.doesNotMatch(server,/\bplatform(?:Usage|Inquiries|Admin|Metrics)\(\{/,'ningún handler global se llama fuera del router');

// ── 2. Enumeración de rutas de cada módulo registrado ─────────────────────────
const routes=new Set();
for(const file of registered){
 const source=read(file);
 for(const [,path] of source.matchAll(/['"`](\/api\/platform\/[A-Za-z0-9/_-]*)['"`]/g))if(path!=='/api/platform/')routes.add(path.replace(/\/$/,'/1'));
 for(const [,pattern] of source.matchAll(/\/\^(\\\/api\\\/platform\\\/[^$]*)\$\//g)){
  routes.add(pattern.replace(/\\\//g,'/').replace(/\((?:\[1-9\])?\\d(?:\+|\{[\d,]+\})\)/g,'1').replace(/\\d\+/g,'1'));
 }
}
const routeList=[...routes].sort();
assert.ok(routeList.length>=15,`se enumeraron ${routeList.length} rutas globales`);
for(const route of routeList)assert.match(route,/^\/api\/platform\/[A-Za-z0-9/_-]+$/,`ruta concreta: ${route}`);
for(const expected of ['/api/platform/overview','/api/platform/usage','/api/platform/metrics','/api/platform/inquiries/1','/api/platform/agencies/1/subscription/extend','/api/platform/bootstrap-status','/api/platform/users/1'])
 assert.ok(routeList.includes(expected),`la enumeración encuentra ${expected}`);

// ── 3. Cada ruta × método × actor sin permiso → 404 genérico sin tocar datos ──
const pg=new PGlite();
await pg.exec(read('./schema.sql'));
for(const file of migrationOrder)await pg.exec(read('./migrations/'+file));
const scale=(await pg.query("select id from organizations where slug='scale'")).rows[0].id;
const user=async(email,extra='')=>(await pg.query(`insert into users(email,password_hash${extra?','+extra.split('=')[0]:''}) values($1,'!'${extra?','+extra.split('=')[1]:''}) returning id`,[email])).rows[0].id;
const admin=await user('admin@scale.example','email_verified_at=now()');
const google=await user('google@scale.example',"google_full_name='Admin Google'");
const unverified=await user('sin-verificar@scale.example');
const deleted=await user('borrado@scale.example','email_verified_at=now()');
const inactive=await user('inactivo@scale.example','email_verified_at=now()');
const guest=await user('invitado@scale.example','email_verified_at=now()');
const demoDomain=await user('persona@scale-demo.example.invalid','email_verified_at=now()');
const owner=await user('owner@agency.example','email_verified_at=now()');
await pg.query("update users set deleted_at=now() where id=$1",[deleted]);
await pg.query("update users set is_demo_guest=true where id=$1",[guest]);
await pg.query("insert into platform_administrators(user_id,role,active) values($1,'admin',true),($2,'viewer',true),($3,'admin',true),($4,'admin',true),($5,'admin',false),($6,'admin',true),($7,'admin',true)",[admin,google,unverified,deleted,inactive,guest,demoDomain]);
await pg.query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[scale,owner]);

const denied=[
 ['sin sesión',null],
 ['dueño de agencia sin rol global',{id:owner,email:'owner@agency.example'}],
 ['admin dentro de un Demo',{id:admin,email:'admin@scale.example',demo_owner_user_id:admin}],
 ['admin en una copia de Demo',{id:admin,email:'admin@scale.example',demo_source_id:scale}],
 ['admin sin correo verificado ni Google',{id:unverified,email:'sin-verificar@scale.example'}],
 ['admin eliminado',{id:deleted,email:'borrado@scale.example'}],
 ['rol global inactivo',{id:inactive,email:'inactivo@scale.example'}],
 ['invitado de demo con rol',{id:guest,email:'invitado@scale.example'}],
 ['dominio de demo con rol',{id:demoDomain,email:'persona@scale-demo.example.invalid'}],
 ['sesión con id inexistente',{id:999999,email:'nadie@scale.example'}],
 ['la sesión falla',()=>{throw new Error('base caída');}],
];
async function dispatch(path,method,actor,database){
 const statements=[];let bodyRead=false,answer=null;
 const spy={query:(sql,values)=>{statements.push(String(sql));return database.query(sql,values);},connect:async()=>({query:(sql,values)=>{statements.push(String(sql));return database.query(sql,values);},release(){}})};
 const handled=await platformRouter({req:{method,headers:{},socket:{remoteAddress:'127.0.0.1'}},res:{},url:new URL(path,'https://isolated.invalid'),db:spy,
  session:async()=>typeof actor==='function'?actor():actor,body:async()=>{bodyRead=true;return {};},send:(_res,status,data)=>{answer={status,data};},bootstrapValue:''});
 return {handled,statements,bodyRead,...answer};
}
let checked=0;
for(const route of [...routeList,'/api/platform/no-existe','/api/platform']){
 for(const method of ['GET','POST','PATCH','PUT','DELETE']){
  for(const [label,actor] of denied){
   const result=await dispatch(route,method,actor,pg);
   assert.equal(result.handled,true,`${method} ${route} (${label}) lo atiende el router`);
   assert.equal(result.status,404,`${method} ${route} (${label}): 404 genérico`);
   assert.deepEqual(result.data,{error:PLATFORM_GATE_MESSAGE},`${method} ${route} (${label}): sin pistas sobre el motivo`);
   assert.equal(result.bodyRead,false,`${method} ${route} (${label}): no se lee el cuerpo antes del guard`);
   assert.ok(result.statements.every(sql=>sql.includes('/*platform-gate*/')),`${method} ${route} (${label}): solo corre la consulta del guard`);
   checked++;
  }
 }
}
// Un error de base durante el guard también es el 404 genérico (nunca un 500 que delate la ruta).
const broken={query:async()=>{throw new Error('relation does not exist');}};
const failing=await dispatch('/api/platform/overview','GET',{id:admin,email:'admin@scale.example'},broken);
assert.equal(failing.status,404);assert.deepEqual(failing.data,{error:PLATFORM_GATE_MESSAGE});
// Fuera de /api/platform el router no interviene.
assert.equal((await dispatch('/api/platformx','GET',null,pg)).handled,false);
assert.equal((await dispatch('/api/agency/clients','GET',null,pg)).handled,false);

// El admin verificado (o vinculado a Google) sí pasa, y el guard relee la base en cada pedido.
const ok=await dispatch('/api/platform/overview','GET',{id:admin,email:'admin@scale.example'},pg);
assert.equal(ok.status,200,'admin con correo verificado');
assert.equal((await dispatch('/api/platform/overview','GET',{id:google,email:'google@scale.example'},pg)).status,200,'cuenta vinculada a Google sin email_verified_at');
assert.equal(ok.statements.filter(sql=>sql.includes('/*platform-gate*/')).length,1,'una sola lectura del guard por pedido (memoizada entre router y handler)');
await pg.query('update platform_administrators set active=false where user_id=$1',[admin]);
assert.equal((await dispatch('/api/platform/overview','GET',{id:admin,email:'admin@scale.example'},pg)).status,404,'revocar el rol corta el acceso en el próximo pedido, sin esperar a la sesión');
await pg.query('update platform_administrators set active=true where user_id=$1',[admin]);
assert.equal((await dispatch('/api/platform/metrics','GET',{id:admin,email:'admin@scale.example'},pg)).status,200,'las métricas del Resumen responden al admin');
assert.equal((await dispatch('/api/platform/no-existe','GET',{id:admin,email:'admin@scale.example'},pg)).status,404,'ruta inexistente: 404 también para el admin');

// ── 4. Filtro único de demos: ninguna lectura de platform-*.js lo saltea ──────
// Escáner mínimo de JS: salta cadenas, plantillas (con ${…} anidados) y comentarios.
function skipString(src,i){
 const quote=src[i];i++;
 while(i<src.length){
  const c=src[i];
  if(c==='\\'){i+=2;continue;}
  if(quote==='`'&&c==='$'&&src[i+1]==='{'){i=skipBalanced(src,i+1,'{','}');continue;}
  if(c===quote)return i+1;
  i++;
 }
 return i;
}
function skipBalanced(src,i,open,close){
 let depth=0;
 while(i<src.length){
  const c=src[i];
  if(c==='"'||c==="'"||c==='`'){i=skipString(src,i);continue;}
  if(c==='/'&&src[i+1]==='/'){i=src.indexOf('\n',i);if(i<0)return src.length;continue;}
  if(c==='/'&&src[i+1]==='*'){i=src.indexOf('*/',i)+2;continue;}
  if(c===open)depth++;
  else if(c===close){depth--;if(depth===0)return i+1;}
  i++;
 }
 return i;
}
// Expresión de una constante de módulo: hasta el `;` de primer nivel.
function definitions(src){
 const defs=new Map();
 for(const match of src.matchAll(/(?:^|\n)\s*(?:export\s+)?const\s+(\w+)\s*=/g)){
  let i=match.index+match[0].length,depth=0;const start=i;
  while(i<src.length){
   const c=src[i];
   if(c==='"'||c==="'"||c==='`'){i=skipString(src,i);continue;}
   if('([{'.includes(c))depth++;else if(')]}'.includes(c))depth--;
   else if(c===';'&&depth===0)break;
   i++;
  }
  defs.set(match[1],src.slice(start,i));
 }
 return defs;
}
function resolve(text,defs,seen=new Set()){
 let out=text;
 for(const [,name] of text.matchAll(/\b([A-Za-z_]\w*)\b/g)){
  if(seen.has(name)||!defs.has(name))continue;
  seen.add(name);out+='\n'+resolve(defs.get(name),defs,seen);
 }
 return out;
}
const helperCall=alias=>new RegExp(`\\b(?:${DEMO_FILTER_HELPERS.join('|')})\\(\\s*['"\`]${alias}['"\`]`);
const KEYWORDS=new Set(['on','where','join','left','inner','group','order','limit','for','union','set','and','using']);
const metricFiles=backendFiles.filter(file=>/^platform-.*\.js$/.test(file)&&!['platform-demo-filter.js','platform-router.js','platform-period.js'].includes(file));
assert.ok(metricFiles.length>=5,'se auditan los módulos del panel global');
let reads=0;
const offenders=[];
for(const file of metricFiles){
 const src=read(file),defs=definitions(src);
 for(const match of src.matchAll(/\.query\(/g)){
  const open=match.index+match[0].length-1,arg=src.slice(open+1,skipBalanced(src,open,'(',')')-1);
  const text=resolve(arg,defs);
  if(!/\bselect\b/i.test(text)||/^\s*[`'"]\s*(?:insert|update|delete)\b/i.test(arg))continue;
  reads++;
  for(const table of text.matchAll(/\b(from|join)\s+(users|organizations)\b(?:\s+(?:as\s+)?(\w+))?/gi)){
   const alias=table[3]&&!KEYWORDS.has(table[3].toLowerCase())?table[3]:table[2];
   const exempt=/\/\*demo-ok:[^*]+\*\//.test(text.slice(table.index,table.index+table[0].length+160));
   if(!exempt&&!helperCall(alias).test(text))offenders.push(`${file}: «${table[0]}» sin ${DEMO_FILTER_HELPERS.join('/')}('${alias}') → ${arg.slice(0,90).replace(/\s+/g,' ')}`);
  }
  if(/\bagency_usage_sessions\b/.test(text)&&!(/\b(?:realOrganization|demoOrganization)\(/.test(text)&&/\b(?:realUser|demoUser)\(/.test(text)))
   offenders.push(`${file}: sesiones sin filtrar agencia y usuario de demo → ${arg.slice(0,90).replace(/\s+/g,' ')}`);
 }
}
assert.ok(reads>=25,`se revisaron ${reads} lecturas del panel global`);
assert.deepEqual(offenders,[],'toda lectura del panel global usa el filtro único de demos (o declara /*demo-ok: motivo*/ en el join)');
// El propio verificador detecta una consulta que saltea el filtro.
{
 const sample="db.query(`select count(*) from users u join organizations o on o.id=u.id where ${realOrganization('o')}`)";
 const open=sample.indexOf('(',sample.indexOf('.query')),arg=sample.slice(open+1,skipBalanced(sample,open,'(',')')-1);
 const found=[...arg.matchAll(/\b(from|join)\s+(users|organizations)\b(?:\s+(?:as\s+)?(\w+))?/gi)].filter(table=>!helperCall(table[3]).test(arg));
 assert.deepEqual(found.map(table=>table[2]),['users'],'el escáner marca el join a users sin realUser');
}
// Ningún módulo escribe el filtro de demo a mano (se usa el helper).
for(const file of metricFiles){
 const src=read(file);
 assert.doesNotMatch(src,/demo_owner_user_id is null|is_demo_guest\s*=\s*false|not ilike '%@(?:scale-)?demo/,`${file} no reescribe el filtro de demo a mano`);
}

console.log(`platform guard ok: ${routeList.length} rutas × 5 métodos × ${denied.length} actores (${checked} pedidos) y ${reads} lecturas con el filtro único de demos`);
