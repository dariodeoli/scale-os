import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {Readable} from 'node:stream';
import {PGlite} from '@electric-sql/pglite';
import {budgetSections} from './budget-sections.js';
import {roleCan} from './permissions.js';
import {ensurePersonalIdentity} from './identity-session.js';
import {visibleRecord} from './record-lifecycle.js';
import {suite} from './agency-suite.js';
import {compressionPlan} from './response-compression.js';
import {currencies} from './currencies.js';
import {amount,date as validDate,email as normalizedEmail,fail,items as validItems,option,phone as normalizedPhone,text,clientLegalProfile} from './suite-validation.js';
import {clientColor,clientLogo} from './client-identity.js';
import {assertUniqueClientRuc} from './ruc-lookup.js';

// Issue #21: el alta (POST) de clientes y presupuestos en agency-core.js tiene
// que usar la misma validación, los mismos límites y el mismo redondeo que la
// edición (PATCH del suite). Antes el alta aceptaba largos y fechas que la
// edición después rechazaba. Este test ejecuta los cuerpos reales de las rutas
// contra una base PGlite y verifica la paridad en los dos sentidos.
const core=await fs.readFile(new URL('./agency-core.js',import.meta.url),'utf8');
const server=await fs.readFile(new URL('./server.js',import.meta.url),'utf8');
function between(text,start,end){
 const a=text.indexOf(start),b=text.indexOf(end,a+start.length);
 assert(a>=0&&b>a,`Anchor missing: ${start}`);
 assert.equal(text.indexOf(start,a+start.length),-1,`Ambiguous anchor: ${start}`);
 return text.slice(a,b);
}
const routes=[
 between(core,"    if (url.pathname === '/api/agency/clients' && req.method === 'POST') {","    if (url.pathname === '/api/agency/projects' && req.method === 'GET') {"),
 between(core,"    if (url.pathname === '/api/agency/budgets' && req.method === 'POST') {","    if (url.pathname === '/api/agency/accounts' && req.method === 'GET') {"),
 between(core,"    if (url.pathname === '/api/agency/accounts' && req.method === 'GET') {","    if (url.pathname === '/api/agency/accounts' && req.method === 'POST') {")
].join('\n');
const helpers=between(server,'const send =','const cookie =')+between(server,'const parseCookies =','const id =')+between(server,'const sessionCache =','async function session(req) {')+between(server,'async function session(req) {','function security(');
const pg=new PGlite();
try{
 await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 for(const name of ['20260908_treasury_ledger.sql','20260908_google_oauth.sql','20260908_people_commissions_comments.sql','20260908_operations_complete.sql','20260908_referral_discounts.sql','20260908_collaborator_profiles.sql','20260908_agency_suite.sql','20260908_daily_controls.sql','20260910_productivity.sql','20260910_profile_identity.sql','20260910_demo_sessions.sql','20260910_invite_links.sql','20260910_client_links.sql','20260910_currencies.sql','20260910_company_currency.sql','20260910_global_identity.sql','20260916_identity_photo_removal.sql','20260919_pipeline_stages.sql','20260914_client_commercial_lifecycle.sql','20261017_client_legal_profile.sql','20261017_client_representative_link.sql'])await pg.exec(await fs.readFile(new URL(`./migrations/${name}`,import.meta.url),'utf8'));
 const query=(sql,args)=>pg.query(sql,args),db={query,connect:async()=>({query,release(){}})};
 const {post,session}=new Function('db','budgetSections','crypto','visibleRecord','ensurePersonalIdentity','demoOrganization','currencies','roleCan','amount','validDate','fail','validItems','option','text','normalizedEmail','normalizedPhone','clientLogo','clientColor','assertUniqueClientRuc','compressionPlan','clientLegalProfile',`${helpers}
  return {session,post:async function(req,res){const url=new URL(req.url,'https://test.invalid');${routes}
   throw new Error('Unexpected route in isolated POST test');}};`)(db,budgetSections,crypto,visibleRecord,ensurePersonalIdentity,()=>{throw new Error('Demo setup is outside this test');},currencies,roleCan,amount,validDate,fail,validItems,option,text,normalizedEmail,normalizedPhone,clientLogo,clientColor,assertUniqueClientRuc,compressionPlan,clientLegalProfile);
 const userId=(await query("insert into users(email,password_hash) values('alta-validacion@example.invalid','unused') returning id")).rows[0].id;
 const otherUserId=(await query("insert into users(email,password_hash) values('alta-otro@example.invalid','unused') returning id")).rows[0].id;
 const org=(await query("insert into organizations(slug,name) values('alta-validacion','Alta validación') returning id")).rows[0].id;
 const otherOrg=(await query("insert into organizations(slug,name) values('alta-otra','Alta otra') returning id")).rows[0].id;
 await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($3,$4,'owner')",[org,userId,otherOrg,otherUserId]);
 const token='fixture-alta-validacion',otherToken='fixture-alta-otra';
 await query("insert into sessions(id,user_id,organization_id,expires_at) values($1,$2,$3,now()+interval '1 hour'),($4,$5,$6,now()+interval '1 hour')",[token,userId,org,otherToken,otherUserId,otherOrg]);
 function request(path,method,payload,current){const req=Readable.from([JSON.stringify(payload??{})]);req.method=method;req.url=path;req.headers={cookie:`scale_session=${current}`};req.socket={remoteAddress:'127.0.0.1'};return req;}
 async function alta(path,payload,current=token){
  let result={status:0};
  await post(request(path,'POST',payload,current),{writeHead(status){result.status=status;},end(value){Object.assign(result,JSON.parse(value));}});
  return result;
 }
 async function editar(path,payload,current=token){
  let result={status:0};
  const handled=await suite({req:request(path,'PATCH',payload,current),res:{},url:new URL(`https://test.invalid${path}`),db,session,body:async()=>payload,send:(_res,status,data)=>{result={status,...data};}});
  assert.equal(handled,true,`la edición cubre ${path}`);
  return result;
 }
 async function get(path,current=token){
  let result={status:0};
  await post(request(path,'GET',{},current),{writeHead(status){result.status=status;},end(value){Object.assign(result,JSON.parse(value));}});
  return result;
 }
 async function detalle(clientId,current=token){
  let result={status:0};const path=`/api/agency/clients/${clientId}`;
  assert.equal(await suite({req:request(path,'GET',{},current),res:{},url:new URL(`https://test.invalid${path}`),db,session,body:async()=>({}),send:(_res,status,data)=>{result={status,...data};}}),true);
  return result;
 }
 // #220: alta legal reutilizable, sin inferir documentos ni representantes.
 await pg.exec(await fs.readFile(new URL('./migrations/20261017_client_legal_profile.sql',import.meta.url),'utf8'));
 const profile={address:' Domicilio contractual de prueba ',city:'Ciudad de prueba',department:'Departamento de prueba',document_type:'passport',document_number:'DOC-TEST',legal_representative_name:'Representante de prueba',legal_representative_document:'REP-TEST',legal_representative_role:'Apoderado',party_type:'company'};
 const legalCreated=await alta('/api/agency/clients',{name:'Cliente legal de prueba',...profile});
 assert.equal(legalCreated.status,201,JSON.stringify(legalCreated));
 for(const [key,value] of Object.entries(profile))assert.equal(legalCreated.client[key],value.trim(),`alta conserva ${key}`);
 const emptyLegal=await alta('/api/agency/clients',{name:'Cliente sin ficha legal'});
 assert.equal(emptyLegal.client.document_type,'');assert.equal(emptyLegal.client.party_type,'');
 for(const invalid of [{document_type:'inventado'},{party_type:'individual'},{address:'x'.repeat(401)},{city:'x'.repeat(121)},{document_number:123}]){
  assert.equal((await alta('/api/agency/clients',{name:'Alta inválida',...invalid})).status,400);
 }
 // #239: nombre vinculado explícito, persistente y protegido en todos los caminos.
 await pg.exec(await fs.readFile(new URL('./migrations/20261017_client_representative_link.sql',import.meta.url),'utf8'));
 const longLegal='L'.repeat(160);
 const longLinked=await alta('/api/agency/clients',{name:'Nombre comercial corto',legal_name:longLegal,legal_representative_same_as_client:true});
 assert.equal(longLinked.status,201);assert.equal(longLinked.client.legal_representative_name,longLegal,'la razón social de160 caracteres se conserva completa');
 assert.equal((await editar(`/api/agency/clients/${longLinked.client.id}`,{legal_name:'R'.repeat(160)})).record.legal_representative_name,'R'.repeat(160));
 const linkedProfile={name:'Cliente comercial',legal_name:'Persona jurídica declarada',legal_representative_same_as_client:true,legal_representative_name:'No debe imponerse',document_type:'ruc',document_number:'RUC-DECLARADO',legal_representative_document:'CI-INDEPENDIENTE',legal_representative_role:'Cargo declarado'};
 const linked=await alta('/api/agency/clients',linkedProfile);
 assert.equal(linked.status,201,JSON.stringify(linked));
 const linkedId=linked.client.id;
 assert.equal(linked.client.legal_representative_same_as_client,true);
 assert.equal(linked.client.legal_representative_name,'Persona jurídica declarada');
 for(const key of ['document_type','document_number','legal_representative_document','legal_representative_role'])assert.equal(linked.client[key],linkedProfile[key]);
 for(const value of ['true',1,null])assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_representative_same_as_client:value})).status,400,'la relación requiere boolean real');
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_name:'Razón social renovada'})).record.legal_representative_name,'Razón social renovada');
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{name:'Comercial renovado',legal_name:''})).record.legal_representative_name,'Comercial renovado');
 await query('update agency_clients set legal_name=$1 where id=$2',['Nombre legal por otro camino',linkedId]);
 assert.equal((await query('select legal_representative_name from agency_clients where id=$1',[linkedId])).rows[0].legal_representative_name,'Nombre legal por otro camino');
 const reopened=(await detalle(linkedId)).record;
 assert.equal(reopened.legal_representative_same_as_client,true,'la decisión viaja al reabrir');
 assert.equal(reopened.legal_representative_name,'Nombre legal por otro camino');
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_representative_same_as_client:false,legal_representative_name:'Representante separado'})).status,200);
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_name:'Empresa separada'})).record.legal_representative_name,'Representante separado');
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_representative_same_as_client:true})).record.legal_representative_name,'Empresa separada');
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_representative_same_as_client:false},otherToken)).status,404,'otra empresa no puede modificar la relación');
 await query("update organization_members set role='viewer' where user_id=$1 and organization_id=$2",[userId,org]);
 assert.equal((await editar(`/api/agency/clients/${linkedId}`,{legal_representative_same_as_client:false})).status,403);
 const redacted=(await detalle(linkedId)).record;
 assert.equal(redacted.legal_representative_same_as_client,null);assert.equal(redacted.legal_representative_name,null);
 await query("update organization_members set role='owner' where user_id=$1 and organization_id=$2",[userId,org]);
 // La relación no modifica los snapshots contractuales emitidos.
 await pg.exec(await fs.readFile(new URL('./migrations/20261017_contract_documents.sql',import.meta.url),'utf8'));
 const template=(await query("insert into agency_contract_templates(organization_id,name,body,created_by) values($1,'Contrato fixture','Texto emitido',$2) returning id",[org,userId])).rows[0].id;
 const contract=(await query("insert into agency_contracts(organization_id,template_id,title,body,client_id,created_by) values($1,$2,'Contrato fixture','Texto emitido',$3,$4) returning id",[org,template,linkedId,userId])).rows[0].id;
 const version=(await query("insert into agency_contract_versions(organization_id,contract_id,version,title,body,rendered_text,variables,sources,template_id,template_revision,reviewed_by) values($1,$2,1,'Emitido','Cuerpo','Empresa separada',$3,'{}',$4,1,$5) returning *",[org,contract,JSON.stringify({'counterparty.legal_representative_name':'Empresa separada'}),template,userId])).rows[0];
 await editar(`/api/agency/clients/${linkedId}`,{legal_name:'Identidad actual posterior'});
 assert.deepEqual((await query('select * from agency_contract_versions where id=$1',[version.id])).rows[0],version,'el contrato emitido conserva su snapshot');
 assert.equal(emptyLegal.client.legal_representative_same_as_client,false,'no se infiere una relación para otros clientes');
 await query('alter table agency_clients add column if not exists personal_data_blocked_at timestamptz');
 await query("update agency_clients set legal_representative_name='' where id=$1",[longLinked.client.id]);
 await query('update agency_clients set personal_data_blocked_at=now() where id=$1',[longLinked.client.id]);
 const suppressed=(await query('select legal_name,legal_representative_name,legal_representative_same_as_client from agency_clients where id=$1',[longLinked.client.id])).rows[0];
 assert.equal(suppressed.legal_name,'R'.repeat(160),'la retención fiscal conserva la razón social');
 assert.equal(suppressed.legal_representative_name,'','la supresión no reconstruye el representante');
 assert.equal(suppressed.legal_representative_same_as_client,false);
 console.log('PASS #239: vínculo explícito, rename/toggle/reopen, documentos independientes, permisos/tenant y snapshot emitido');
 const clientPaths={name:'Cliente paridad',email:'paridad@example.invalid',phone:'+595 981123456',tax_id:'80012345-6',legal_name:'Razón social de prueba',notes:'Nota de alta'};
 const altaCliente=await alta('/api/agency/clients',clientPaths);
 assert.equal(altaCliente.status,201,JSON.stringify(altaCliente));
 const clienteId=altaCliente.client.id;
 assert.equal(altaCliente.client.tax_id,'80012345-6');
 assert.equal(altaCliente.client.legal_name,'Razón social de prueba');
 assert.equal((await editar(`/api/agency/clients/${clienteId}`,clientPaths)).status,200,'lo que el alta crea, la edición lo acepta');
 // La edición rechaza estos largos: el alta tiene que rechazarlos igual.
 for(const [field,value,label] of [
  ['name','x'.repeat(121),'nombre 121'],
  ['tax_id','8'.repeat(61),'RUC 61'],
  ['legal_name','L'.repeat(161),'razón social 161'],
  ['notes','N'.repeat(2001),'notas 2001'],
 ]){
  const payload={...clientPaths,[field]:value};
  assert.equal((await alta('/api/agency/clients',payload)).status,400,`el alta rechaza ${label}`);
  assert.equal((await editar(`/api/agency/clients/${clienteId}`,payload)).status,400,`la edición rechaza ${label}`);
 }
 assert.equal((await alta('/api/agency/clients',{...clientPaths,email:'sin-arroba'})).status,400,'el alta reusa el validador de correo');
 assert.equal((await alta('/api/agency/clients',{...clientPaths,phone:'++'})).status,400,'el alta reusa el validador de teléfono');
 const altaClienteLargo=await alta('/api/agency/clients',{...clientPaths,name:'Cliente de límites',tax_id:'80099999-1',legal_name:'L'.repeat(160),notes:'N'.repeat(2000)});
 assert.equal(altaClienteLargo.status,201,'los límites máximos de la edición también entran por el alta');
 assert.equal((await editar(`/api/agency/clients/${altaClienteLargo.client.id}`,{name:'Cliente de límites',tax_id:'80099999-1',legal_name:'L'.repeat(160),notes:'N'.repeat(2000)})).status,200,'el registro de límites queda editable');
 const budgetPaths={title:'Propuesta de paridad',clientId:clienteId,currency:'USD',validUntil:'2026-10-01',notes:'Condiciones',items:[{description:'Servicio mensual',quantity:2,unitPrice:10.555}]};
 const altaPresupuesto=await alta('/api/agency/budgets',budgetPaths);
 assert.equal(altaPresupuesto.status,201,JSON.stringify(altaPresupuesto));
 const presupuesto=altaPresupuesto.budget;
 assert.equal(presupuesto.valid_until.slice(0,10),'2026-10-01','la vigencia se guarda como fecha civil');
 assert.equal(presupuesto.subtotal,'21.12','el subtotal se redondea a dos decimales');
 assert.equal(presupuesto.total,'23.23','el total se redondea igual que en la edición');
 const itemRow=(await query('select description,quantity,unit_price::text as unit_price,total::text as total from agency_budget_items where budget_id=$1',[presupuesto.id])).rows[0];
 assert.deepEqual({...itemRow,quantity:itemRow.quantity},{description:'Servicio mensual',quantity:'2.00',unit_price:'10.56',total:'21.12'},'los ítems del alta guardan el mismo redondeo que la edición');
 assert.equal((await editar(`/api/agency/budgets/${presupuesto.id}`,budgetPaths)).status,200,'lo que el alta crea, la edición lo acepta');
 // La edición rechaza estos valores: el alta tiene que rechazarlos igual (400, no 500 por fecha inválida).
 for(const [payload,label] of [
  [{...budgetPaths,title:'T'.repeat(161)},'título 161'],
  [{...budgetPaths,title:'x'},'título de un carácter'],
  [{...budgetPaths,items:[]},'sin ítems'],
  [{...budgetPaths,items:Array.from({length:101},(_,index)=>({description:`Ítem ${index}`,quantity:1,unitPrice:1}))},'101 ítems'],
  [{...budgetPaths,items:[{description:'Servicio',quantity:0,unitPrice:1}]},'cantidad cero'],
  [{...budgetPaths,items:[{description:'Servicio',quantity:1000000,unitPrice:1}]},'cantidad fuera de tope'],
  [{...budgetPaths,items:[{description:'Servicio',quantity:1,unitPrice:-1}]},'precio negativo'],
  [{...budgetPaths,items:[{description:'Servicio',quantity:1,unitPrice:10000000000000}]},'precio fuera de tope'],
  [{...budgetPaths,items:[{description:'S'.repeat(501),quantity:1,unitPrice:1}]},'descripción 501'],
  [{...budgetPaths,validUntil:'2026-13-40'},'fecha inválida'],
  [{...budgetPaths,currency:'GBP'},'moneda inválida'],
  [{...budgetPaths,clientId:'abc'},'cliente inválido'],
 ]){
  assert.equal((await alta('/api/agency/budgets',payload)).status,400,`el alta rechaza ${label}`);
 }
 assert.equal((await alta('/api/agency/budgets',{...budgetPaths,clientId:999999})).status,404,'cliente inexistente');
 assert.equal((await alta('/api/agency/clients',{...clientPaths,tax_id:'80012345-6'})).status,409,'RUC duplicado en la empresa');
 assert.equal((await alta('/api/agency/budgets',{...budgetPaths},otherToken)).status,404,'el cliente de otra empresa no es direccionable');
 // #152/#149: la custodia resuelve nombre/foto; la UI prefiere el nombre al correo.
 const demoCustodian=(await query("insert into users(email,password_hash) values('persona-99@demo.example.invalid','unused') returning id")).rows[0].id;
 const realCustodian=(await query("insert into users(email,password_hash) values('custodia.real@estudio.com.py','unused') returning id")).rows[0].id;
 await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'finance'),($1,$3,'finance')",[org,demoCustodian,realCustodian]);
 await query("insert into agency_user_profiles(user_id,organization_id,full_name) values($1,$3,'Lucía Demo'),($2,$3,'Ana Real')",[demoCustodian,realCustodian,org]);
 await query("insert into bank_accounts(organization_id,name,account_type,custodian_user_id) values($1,'Caja demo','cash',$2),($1,'Caja real','bank',$3)",[org,demoCustodian,realCustodian]);
 const custodia=await get('/api/agency/accounts');
 assert.equal(custodia.status,200,JSON.stringify(custodia));
 const cajaDemo=custodia.accounts.find(a=>a.name==='Caja demo'),cajaReal=custodia.accounts.find(a=>a.name==='Caja real');
 assert.equal(cajaDemo.custodian_name,'Lucía Demo','la custodia demo se identifica por nombre');
 assert.equal(cajaReal.custodian_email,'custodia.real@estudio.com.py','la custodia real conserva su correo');
 assert.equal(cajaReal.custodian_name,'Ana Real');
 const after=(await query('select count(*)::int as count from agency_budgets')).rows[0].count;
 assert.equal(after,1,'los rechazos no dejan presupuestos creados');
 console.log('PASS: el alta de clientes y presupuestos comparte validación, límites y redondeo con la edición; 21 rechazos (18 con 400, dos 404 y un 409), fechas civiles y montos a dos decimales. PGlite only; no server/init/network started.');
}finally{await pg.close();}
