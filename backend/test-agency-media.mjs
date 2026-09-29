// Medios de identidad (#108): las fotos y logos guardados como `data:` se sirven
// como URL interna cacheable (ETag + caché privada) y los listados devuelven esa
// URL en vez de repetir el base64. Aditivo: los enlaces externos se conservan.
// PGlite only; sin red ni servidor.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {agencyMedia,mediaPhoto,mediaPeople} from './agency-media.js';
import {operations} from './operations.js';
import {suite} from './agency-suite.js';
import {agencyCore} from './agency-core.js';
import {presence} from './presence.js';
import {productivity} from './productivity.js';
import {projectAssignees} from './project-assignees.js';

const WEBP=Buffer.from('5249464624000000574542505650382000000000000000000000000000000000','hex');
const DATA=`data:image/webp;base64,${WEBP.toString('base64')}`;
const EXTERNAL='https://cdn.example.invalid/foto.webp';

const pg=new PGlite();
await pg.exec(await fs.readFile('schema.sql','utf8'));
for(const name of migrationOrder)await pg.exec(await fs.readFile('migrations/'+name,'utf8'));
const query=(sql,args)=>pg.query(sql,args);
const client={query,release(){}};
const db={query,connect:async()=>client};
const insert=async(sql,args)=>(await query(sql+' returning id',args)).rows[0].id;

const org=await insert("insert into organizations(slug,name) values('media-a','Agencia Medios')");
const other=await insert("insert into organizations(slug,name) values('media-b','Otra Agencia')");
const user=await insert("insert into users(email,password_hash) values('media@agency.test','unused')");
const foreign=await insert("insert into users(email,password_hash) values('media-foreign@agency.test','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,user]);
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[other,foreign]);
await query("insert into agency_user_profiles(organization_id,user_id,full_name,photo_url) values($1,$2,'Ana Medios',$3)",[org,user,DATA]);
const person=await insert("insert into agency_collaborators(organization_id,user_id,full_name,photo_url) values($1,$2,'Ana Medios',$3)",[org,user,DATA]);
const external=await insert("insert into agency_collaborators(organization_id,full_name,photo_url) values($1,'Beto Externo',$2)",[org,EXTERNAL]);
const logoClient=await insert("insert into agency_clients(organization_id,name,logo_url) values($1,'Cliente Medios',$2)",[org,DATA]);
const project=await insert("insert into agency_projects(organization_id,client_id,name) values($1,$2,'Proyecto Medios')",[org,logoClient]);
await query('insert into agency_project_assignees(organization_id,project_id,user_id) values($1,$2,$3)',[org,project,user]);

const asUser={id:user,organization_id:org,role:'owner'};
const asForeign={id:foreign,organization_id:other,role:'owner'};
async function call(handler,path,as=asUser,method='GET',payload={}){
 const response={status:0,headers:null,body:null};
 const handled=await handler({req:{method,socket:{remoteAddress:'media-test'},headers:{}},res:{writeHead:(status,headers)=>{response.status=status;response.headers=headers;},end:body=>{response.body=body;}},url:new URL('https://test'+path),db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>{response.status=status;response.data=data;}});
 return {...response,handled};
}

// El helper sólo convierte `data:`; los enlaces externos y el vacío no cambian.
assert.equal(mediaPhoto('person',7,DATA),`/core-api/api/agency/media/person/7?v=${mediaPhoto('person',7,DATA).split('v=')[1]}`);
assert.ok(/^\/core-api\/api\/agency\/media\/person\/7\?v=[a-f0-9]{10}$/.test(mediaPhoto('person',7,DATA)));
assert.equal(mediaPhoto('person',7,EXTERNAL),EXTERNAL);
assert.equal(mediaPhoto('person',7,null),null);
assert.equal(mediaPeople([{id:9,photo_url:DATA},{id:10,photo_url:EXTERNAL}])[0].photo_url,mediaPhoto('person',9,DATA));
assert.equal(mediaPeople([{id:10,photo_url:EXTERNAL}])[0].photo_url,EXTERNAL);

// El endpoint sirve los bytes con caché privada y ETag; 304 si no cambió.
const served=await call(agencyMedia,`/api/agency/media/collaborator/${person}?v=0000000000`);
assert.equal(served.status,200);assert.equal(served.headers['Content-Type'],'image/webp');
assert.equal(served.headers['Cache-Control'],'private, max-age=86400, immutable');
assert.ok(served.headers.ETag);assert.deepEqual(Buffer.from(served.body),WEBP);
const cached=await call(agencyMedia,`/api/agency/media/collaborator/${person}?v=0000000000`);
assert.equal(cached.headers.ETag,served.headers.ETag,'el ETag es estable para el mismo contenido');
const mediaCall=await (async()=>{const response={};await agencyMedia({req:{method:'GET',socket:{},headers:{'if-none-match':served.headers.ETag}},res:{writeHead:(s,h)=>{response.status=s;response.headers=h;},end:()=>{}},url:new URL('https://test/api/agency/media/collaborator/'+person),db,session:async()=>asUser});return response;})();
assert.equal(mediaCall.status,304,'If-None-Match devuelve 304 sin cuerpo');

// Persona (vista de identidad), cliente (logo) y enlace externo (redirección).
assert.equal((await call(agencyMedia,`/api/agency/media/person/${user}?v=0000000000`)).status,200);
assert.equal((await call(agencyMedia,`/api/agency/media/client/${logoClient}?v=0000000000`)).status,200);
const redirected=await call(agencyMedia,`/api/agency/media/collaborator/${external}?v=0000000000`);
assert.equal(redirected.status,302);assert.equal(redirected.headers.Location,EXTERNAL);
// Guardas: sin sesión, otra empresa, id inválido y sin foto.
assert.equal((await call(agencyMedia,`/api/agency/media/collaborator/${person}`,null)).status,401);
assert.equal((await call(agencyMedia,`/api/agency/media/collaborator/${person}`,asForeign)).status,404);
assert.equal((await call(agencyMedia,'/api/agency/media/collaborator/abc')).handled,false,'un id no numérico no entra al handler');
const noPhoto=await insert("insert into agency_clients(organization_id,name) values($1,'Sin logo')",[org]);
assert.equal((await call(agencyMedia,`/api/agency/media/client/${noPhoto}`)).status,404);
assert.equal(await agencyMedia({req:{method:'GET'},res:{},url:new URL('https://test/api/agency/nope'),db,session:async()=>asUser}),false,'otras rutas no se tocan');

// Los listados devuelven la URL del medio (no el base64) y conservan el externo.
const team=await call(operations,'/api/agency/team');
assert.equal(team.handled,true);
const collaborator=team.data.collaborators.find(row=>String(row.id)===String(person));
assert.match(collaborator.photo_url,/^\/core-api\/api\/agency\/media\/collaborator\/\d+\?v=[a-f0-9]{10}$/,'la foto del colaborador viaja como URL del medio');
assert.equal(team.data.collaborators.find(row=>String(row.id)===String(external)).photo_url,EXTERNAL,'el enlace externo se conserva');
assert.match(team.data.members.find(row=>String(row.id)===String(user)).photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto del miembro viaja como URL del medio');
const clients=await call(agencyCore,'/api/agency/clients');
assert.match(clients.data.clients.find(row=>String(row.id)===String(logoClient)).logo_url,/^\/core-api\/api\/agency\/media\/client\/\d+\?v=[a-f0-9]{10}$/,'el logo del cliente viaja como URL del medio');
const projects=await call(agencyCore,'/api/agency/projects?fields=id,name,assignees');
const assignee=projects.data.projects.find(row=>String(row.id)===String(project)).assignees[0];
assert.match(assignee.photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto del responsable viaja como URL del medio');
// Presencia, directorio de responsables y selector de responsables: la foto viaja
// como URL del medio y no como base64 repetido en cada pantalla.
const presenceCall=await call(presence,'/api/agency/presence/usage');
assert.match(presenceCall.data.people.find(row=>String(row.id)===String(user)).actor_photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto de presencia/uso viaja como URL del medio');
const directory=await call(productivity,'/api/agency/productivity/people');
assert.match(directory.data.people.find(row=>String(row.id)===String(user)).photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto del directorio de responsables viaja como URL del medio');
const assignees=await call(projectAssignees,'/api/agency/assignees');
assert.match(assignees.data.members.find(row=>String(row.id)===String(user)).photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto del selector de responsables viaja como URL del medio');
await query("insert into agency_operation_audit(organization_id,table_name,action,actor,after_state) values($1,'agency_work_orders','UPDATE',$2,'{\"id\":1,\"title\":\"Pieza\"}')",[org,String(user)]);
const activity=await call(suite,'/api/agency/activity?limit=20&offset=0');
assert.match(activity.data.records[0].actor_photo_url,/^\/core-api\/api\/agency\/media\/person\/\d+\?v=[a-f0-9]{10}$/,'la foto del actor en Actividad viaja como URL del medio');

await pg.close();
console.log('PASS: medios de identidad — URL interna cacheable con ETag/304, redirección de enlaces externos, guardas de sesión/empresa y listados sin base64 (Equipo, clientes, proyectos, actividad, presencia/uso, directorio y selector de responsables)');
