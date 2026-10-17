import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {zoneTodaySql} from './business-time.js';
import {contracts,contractVariables,contractBody,contractMissing,contractHtml,contractAiMetadata} from './contracts.js';
const pg=new PGlite();await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
for(const file of ['20260908_treasury_ledger.sql','20260908_people_commissions_comments.sql','20260908_operations_complete.sql','20260908_collaborator_profiles.sql','20260908_agency_suite.sql','20260910_ruc_lookup.sql','20260913_ruc_collaboration.sql','20260930_personal_data.sql','20260914_client_commercial_lifecycle.sql','20260914_client_terms_and_planned_expenses.sql','20260915_optional_commission_terms.sql','20260915_billing_cadence_and_coupons.sql','20260915_client_terms_end_date.sql','20261017_contract_documents.sql','20261017_client_legal_profile.sql'])await pg.exec(await fs.readFile(new URL('./migrations/'+file,import.meta.url),'utf8'));
// Every migration must safely apply twice.
await pg.exec(await fs.readFile(new URL('./migrations/20261017_contract_documents.sql',import.meta.url),'utf8'));
await pg.exec('create table if not exists auth_throttles(key text primary key,count integer not null default 1,expires_at timestamptz not null)');
const query=(sql,args=[])=>pg.query(sql,args),db={query,connect:async()=>({query,release(){}})},one=async(sql,args)=>(await query(sql,args)).rows[0];
const org=(await one("select id from organizations where slug='scale'")).id,other=(await one("insert into organizations(slug,name) values('contracts-other','Other') returning id")).id;
const uid=(await one("insert into users(email,password_hash) values('contracts@example.invalid','unused') returning id")).id;
const owner={id:uid,organization_id:org,role:'owner'},viewer={...owner,role:'viewer'},sales={...owner,role:'sales',capabilities:{'contracts.view':true,'contracts.manage':true,'contracts.issue':true}},otherOwner={...owner,organization_id:other};
await query("insert into agency_settings(organization_id,legal_name,address) values($1,'Empresa Legal','Calle principal')",[org]);
const client=(await one("insert into agency_clients(organization_id,name,legal_name,tax_id,ruc_legal_name,ruc_source) values($1,'Cliente Visible','Nombre manual','80011111-1','Nombre oficial','ruc-provider') returning id",[org])).id;
const otherClient=(await one("insert into agency_clients(organization_id,name) values($1,'Other client') returning id",[other])).id;
const bank=(await one("insert into bank_accounts(organization_id,name,account_type,institution,account_number,holder_name) values($1,'Banco','bank','Familiar','123456789','Titular') returning id",[org])).id;
async function call(path,method='GET',input={},user=owner,extra={}){let result;const res={writeHead(status,headers){result={status,headers};},end(data){result.data=data;}};await contracts({req:{method,socket:{}},res,url:new URL('https://test'+path),db,session:async()=>user,body:async()=>input,send:(_,status,data)=>result={status,...data},...extra});return result;}
const root='/api/agency/contracts',profile='/api/agency/company-legal-profile';
assert.equal((await call(root,'GET',{},null)).status,401);assert.equal((await call(root,'GET',{},viewer)).status,403);
assert.equal((await call(root,'GET',{}, {...owner,role:'sales'})).status,403,'contracts are private by default');
let r=await call(profile);assert.equal(r.profile.revision,0);
r=await call(profile,'PATCH',{expected_revision:0,city:'Asunción',department:'Capital',legal_representative_name:'Representante',legal_representative_document:'1234567'});assert.equal(r.status,200);assert.equal(r.profile.revision,1);assert.equal(r.profile.provenance.city.source,'manual');
assert.equal((await call(profile,'PATCH',{expected_revision:0,city:'X'})).status,409);assert.equal((await call(profile,'PATCH',{expected_revision:1,unknown:'X'})).status,400);
assert.throws(()=>contractVariables({'__proto__.x':'bad'}));assert.throws(()=>contractBody('Hola {{unknown}}'));assert.throws(()=>contractBody('{{company.name'));assert.throws(()=>contractBody('A\u0000B'));
assert.deepEqual(contractMissing('{{company.name}}',{},['company.tax_id']),['company.tax_id','company.name']);
r=await call(root+'/templates','POST',{name:'Servicios',agreement_type:'services',body:'Empresa {{company.legal_name}} con {{counterparty.legal_name}}. Monto {{agreement.amount}} <script>alert(1)</script>',required_fields:['agreement.currency']});assert.equal(r.status,201,JSON.stringify(r));const template=r.template;
assert.equal((await call(root+'/templates/'+template.id,'GET',{},otherOwner)).status,404);
assert.equal((await call(root+'/templates/'+template.id,'PATCH',{expected_revision:0,name:'Cambio'})).status,400);
assert.equal((await call(root+'/templates/'+template.id,'PATCH',{expected_revision:2,name:'Cambio'})).status,409);
r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['company.address'],'Calle principal');assert.equal(r.variables['company.city'],'Asunción');assert.equal(r.variables['counterparty.legal_name'],'Nombre manual','manual legal identity survives a provider result');assert.equal(r.sources['counterparty.legal_name'].source,'client');
await query("update agency_clients set legal_name='' where id=$1",[client]);r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['counterparty.legal_name'],'Nombre oficial');assert.equal(r.sources['counterparty.legal_name'].source,'ruc-provider','provider is a fallback only when manual name is empty');
await query("update agency_clients set legal_name='Nombre manual' where id=$1",[client]);
assert.equal((await call(root+'/autofill','POST',{client_id:otherClient})).status,404);
assert.equal((await call(root+'/autofill','POST',{bank_account_id:bank},sales)).status,403);
r=await call(root,'POST',{template_id:template.id,title:'Contrato prueba',client_id:client});assert.equal(r.status,201,JSON.stringify(r));let doc=r.contract;assert.deepEqual(r.missing,['agreement.currency','agreement.amount']);
assert.equal((await call(root+'/'+doc.id,'GET',{},otherOwner)).status,404);
assert.equal((await call(root+'/'+doc.id+'/versions','POST',{expected_revision:doc.revision,reviewed:true})).status,400,'cannot issue with missing fields');
assert.equal((await call(root+'/'+doc.id,'PATCH',{expected_revision:doc.revision+1,title:'stale'})).status,409);
r=await call(root+'/'+doc.id,'PATCH',{expected_revision:doc.revision,variables:{...doc.variables,'agreement.amount':'1000','agreement.currency':'PYG'}});assert.equal(r.status,200,JSON.stringify(r));doc=r.contract;assert.deepEqual(r.missing,[]);assert.equal(doc.sources['agreement.amount'].source,'manual');
r=await call(root+'/'+doc.id,'PATCH',{expected_revision:doc.revision,variables:{...doc.variables,'counterparty.legal_name':'Edited manually'},sources:{'counterparty.legal_name':{source:'ruc-provider'}}});doc=r.contract;assert.equal(doc.sources['counterparty.legal_name'].source,'manual','a caller cannot spoof verified provenance');
assert.equal((await call(root+'/'+doc.id+'/versions','POST',{expected_revision:doc.revision})).status,400,'human review required');
assert.equal((await call(root+'/'+doc.id+'/versions','POST',{expected_revision:doc.revision,reviewed:true},{...sales,capabilities:{...sales.capabilities,'contracts.issue':false}})).status,403);
r=await call(root+'/'+doc.id+'/versions','POST',{expected_revision:doc.revision,reviewed:true});assert.equal(r.status,201,JSON.stringify(r));doc=r.contract;const version=r.version;assert.equal(version.version,1);assert.match(version.rendered_text,/1000/);assert.doesNotMatch(contractHtml(version),/<script>/);assert.match(contractHtml(version),/&lt;script&gt;/);
await assert.rejects(()=>query("update agency_contract_versions set title='modified' where id=$1",[version.id]),/immutable/);await assert.rejects(()=>query('delete from agency_contract_versions where id=$1',[version.id]),/immutable/);
assert.equal((await call(root+'/'+doc.id+'/versions','POST',{expected_revision:doc.revision-1,reviewed:true})).status,409,'concurrent duplicate issuance rejects stale revision');
r=await call(root+'/'+doc.id,'PATCH',{expected_revision:doc.revision,title:'Título revisado'});doc=r.contract;
assert.equal((await call(root+'/'+doc.id+'/versions')).versions[0].title,'Contrato prueba','issued title never follows mutable draft');
let html; r=await call(root+'/'+doc.id+'/versions/1/pdf','GET',{},owner,{pdfRenderer:async value=>{html=value;return Buffer.from('%PDF-1.7 fake');}});assert.equal(r.status,200);assert.equal(r.headers['Cache-Control'],'no-store');assert.match(html,/Contrato prueba/);assert(Buffer.isBuffer(r.data));
assert.equal((await call(root+'/'+doc.id+'/versions/1/pdf','GET',{},otherOwner,{pdfRenderer:()=>{throw Error('must not render');}})).status,404);
const bankTemplate=(await call(root+'/templates','POST',{name:'Banco',body:'Pagar a {{bank.account_number}}',required_fields:[]})).template;
r=await call(root,'POST',{template_id:bankTemplate.id,title:'Privado banco',bank_account_id:bank});assert.equal(r.status,201,JSON.stringify(r));const bankDoc=r.contract;assert.equal(bankDoc.contains_bank_data,true);
assert.equal((await call(root+'/'+bankDoc.id,'GET',{},sales)).status,403);assert.equal((await call(root,'GET',{},sales)).contracts.some(d=>d.id===bankDoc.id),false);
assert.equal((await call(root+'/'+bankDoc.id+'/versions','GET',{},sales)).status,403);
assert.equal((await call(root+'/'+bankDoc.id+'/versions/1/pdf','GET',{},sales,{pdfRenderer:()=>{throw Error('must not render');}})).status,403);
assert.equal((await call(root,'POST',{template_id:bankTemplate.id,title:'Forbidden',variables:{'bank.account_number':'99999'}},sales)).status,403);
assert.equal((await call(root+'/config','GET',{},sales)).bank_accounts.length,0);assert.equal((await call(root+'/config')).bank_accounts.length,1);
let messages;const aiProvider={analizar:async m=>{messages=m;return {contenido:'{"suggestion":"Revisar vigencia con asesoría"}'};}};
r=await call(root+'/'+doc.id+'/assist','POST',{},owner,{aiProvider});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.requires_review,true);assert.equal((await call(root+'/'+doc.id)).contract.revision,doc.revision,'AI never mutates draft');assert(!JSON.stringify(messages).includes('Nombre oficial'));assert(!JSON.stringify(messages).includes('123456789'));
assert(!JSON.stringify(messages).includes('Título revisado'));assert(!JSON.stringify(messages).includes('<script>'));assert(!JSON.stringify(messages).includes('Edited manually'));assert(!JSON.stringify(messages).includes('Empresa Legal'));assert(!JSON.stringify(messages).includes('1000'));
assert.deepEqual(contractAiMetadata({body:'Secreto nombre {{company.name}}',required_fields:['company.tax_id'],variables:{'company.name':'Nombre privado'}}),{fields:['company.tax_id','company.name'],required_fields:['company.tax_id'],missing:['company.tax_id'],presence:{'company.tax_id':false,'company.name':true}});
// Built-in models are read-only catalog entries until explicitly installed.
const countBefore=Number((await one('select count(*) as n from agency_contract_templates where organization_id=$1',[org])).n);
const models=(await call(root+'/models')).models;assert.equal(models.length,4);assert.equal((await call(root+'/models','GET',{},sales)).models.length,4);
assert.equal(Number((await one('select count(*) as n from agency_contract_templates where organization_id=$1',[org])).n),countBefore);
assert.equal((await call(root+'/models','GET',{},viewer)).status,403);
for(const model of models){assert.equal(contractBody(model.body),model.body);assert.equal(contractMissing(model.body,{},model.required_fields).length,model.required_fields.length);}
assert.equal((await call(root+'/templates/from-model','POST',{model_key:'missing'})).status,404);
assert.equal((await call(root+'/templates/from-model','POST',{model_key:models[0].key},{...sales,capabilities:{'contracts.view':true,'contracts.manage':false}})).status,403);
const installed=(await call(root+'/templates/from-model','POST',{model_key:models[0].key})).template;assert.equal(installed.body,models[0].body);
assert.equal((await call(root+'/templates/'+installed.id,'PATCH',{expected_revision:1,name:'Mi contrato editable'})).status,200);
// Canonical company/customer profiles populate document parties; no identity is copied from models.
await query("update agency_clients set address='Calle cliente',city='Luque',department='Central',party_type='person',document_type='ci',document_number='123456',legal_representative_name='Firmante empresa',legal_representative_document='987654',legal_representative_role='Gerente' where id=$1",[client]);
r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['counterparty.document'],'123456');assert.equal(r.variables['counterparty.document_type'],'CI');assert.equal(r.variables['counterparty.city'],'Luque');assert.equal(r.variables['counterparty.signer_name'],'Nombre manual');assert.equal(r.variables['counterparty.signer_document'],'123456');
await query("update agency_clients set document_number='' where id=$1",[client]);r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['counterparty.document'],undefined,'RUC is never relabeled as a missing CI');assert.equal(r.variables['counterparty.signer_document'],undefined);await query("update agency_clients set document_number='123456' where id=$1",[client]);
await query("update agency_clients set party_type='company' where id=$1",[client]);r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['counterparty.signer_name'],'Firmante empresa');assert.equal(r.variables['counterparty.signer_document'],'987654');assert.equal(r.variables['counterparty.legal_representative_role'],'Gerente');
await query("update agency_clients set party_type='' where id=$1",[client]);r=await call(root+'/autofill','POST',{client_id:client});assert.equal(r.variables['counterparty.signer_name'],undefined);
const unnamed=(await one("insert into agency_clients(organization_id,name) values($1,'Persona sin razón social') returning id",[org])).id;
r=await call(root+'/autofill','POST',{client_id:unnamed});assert.equal(r.variables['counterparty.legal_name'],'Persona sin razón social');assert.equal(r.sources['counterparty.legal_name'].source,'client');
await query("update agency_settings set legal_name='' where organization_id=$1",[org]);r=await call(root+'/autofill','POST',{});assert.equal(r.variables['company.legal_name'],(await one('select name from organizations where id=$1',[org])).name);await query("update agency_settings set legal_name='Empresa Legal' where organization_id=$1",[org]);
// Source selection is authorized, tenant-safe, coherent and preserves actual decimal pricing.
const budget=(await one("insert into agency_budgets(organization_id,client_id,number,title,currency,total,valid_until,notes) values($1,$2,'CT-1','Campaña audiovisual','USD',1234.56,'2099-12-31','Condiciones particulares') returning id",[org,client])).id;
await query("insert into agency_budget_items(budget_id,position,description,quantity,unit_price,total) values($1,1,'Video institucional',2,617.28,1234.56)",[budget]);
const plan=(await one(`insert into agency_plans(organization_id,name,currency,items,notes) values($1,'Plan piezas','USD','[{"description":"Reels","quantity":3,"unitPrice":0.1},{"description":"Fotografía","quantity":1,"unitPrice":12.34}]','No incluye traslados') returning id`,[org])).id;
const otherPlan=(await one("insert into agency_plans(organization_id,name) values($1,'Other plan') returning id",[other])).id;
const contractOnly={...owner,role:'editor',capabilities:{'contracts.view':true,'contracts.manage':true}};
assert.deepEqual((await call(root+'/config','GET',{},contractOnly)).budgets,[]);assert.deepEqual((await call(root+'/config','GET',{},contractOnly)).plans,[]);
assert.equal((await call(root+'/autofill','POST',{budget_id:budget,client_id:client},contractOnly)).status,403);
assert.equal((await call(root+'/autofill','POST',{plan_id:plan},contractOnly)).status,403);
assert.equal((await call(root+'/autofill','POST',{plan_id:otherPlan})).status,404);
assert.equal((await call(root+'/autofill','POST',{budget_id:budget,plan_id:plan,client_id:client})).status,400);
assert.equal((await call(root+'/autofill','POST',{budget_id:budget,client_id:unnamed})).status,409);
r=await call(root+'/autofill','POST',{budget_id:budget,client_id:client});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.amount'],'1234.56');assert.equal(r.variables['agreement.currency'],'USD');assert.equal(r.variables['agreement.deliverables'],'2.00 × Video institucional');assert.equal(r.sources['agreement.amount'].source,'budget');assert.equal(String(r.sources['agreement.amount'].record_id),String(budget));assert.equal(r.variables['agreement.ends_on'],undefined,'quotation validity is not service duration');assert.equal(r.variables['agreement.payment_terms'],undefined);
await query('update agency_budgets set tax_rate=.07 where id=$1',[budget]);r=await call(root+'/autofill','POST',{budget_id:budget,client_id:client});assert.equal(r.variables['agreement.tax_terms'],'IVA 7%; total del presupuesto con impuestos incluidos.','tax percentages use exact decimal arithmetic');
const incompletePlan=(await one("insert into agency_plans(organization_id,name,currency) values($1,'Catálogo incompleto','USD') returning id",[org])).id;
for(const items of [[],[{description:'Sin precio',quantity:1}],[{description:'Sin cantidad',unitPrice:2}],[{description:'Precio vacío',quantity:1,unitPrice:''}],[{description:'Precio negativo',quantity:1,unitPrice:-1}],[{description:'Cantidad cero',quantity:0,unitPrice:5}]]){
 await query('update agency_plans set items=$1::jsonb where id=$2',[JSON.stringify(items),incompletePlan]);r=await call(root+'/autofill','POST',{plan_id:incompletePlan});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.amount'],undefined,'incomplete catalogs never imply a zero price');assert.equal(r.sources['agreement.amount'],undefined);
}
await query('update agency_plans set items=$1::jsonb where id=$2',[JSON.stringify([{description:'Entregable sin cantidad',unitPrice:2},{description:'',quantity:1,unitPrice:5},{quantity:3,unitPrice:5},'  ',null]),incompletePlan]);r=await call(root+'/autofill','POST',{plan_id:incompletePlan});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.deliverables'],'Entregable sin cantidad','incomplete items never invent a quantity or a description');assert.equal(r.variables['agreement.amount'],undefined);
await query('update agency_plans set items=$1::jsonb where id=$2',[JSON.stringify([{description:'Sin cargo pactado',quantity:1,unitPrice:0}]),incompletePlan]);r=await call(root+'/autofill','POST',{plan_id:incompletePlan});assert.equal(r.variables['agreement.amount'],'0.00','an explicitly priced free item preserves its actual zero');
r=await call(root+'/autofill','POST',{plan_id:plan,client_id:client});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.amount'],'12.64');assert.equal(r.variables['agreement.plan_name'],'Plan piezas');assert.equal(r.variables['agreement.payment_terms'],undefined,'catalog has no assumed cadence');assert.equal(r.sources['agreement.amount'].source,'plan');
const term=(await one(`insert into agency_client_commercial_terms(organization_id,client_id,activation_date,effective_from,starts_on,plan_name,plan_version,plan_id,monthly_price,currency,discount_type,discount_value,deliverables,cadence,interval_months,commission_mode) values($1,$2,'2020-01-01','2020-01-01','2020-01-01','Plan negociado','1',$3,99.99,'USD','percent',10,'["Dos piezas pactadas"]','interval',3,'none') returning id`,[org,client,plan])).id;
r=await call(root+'/autofill','POST',{plan_id:plan,client_id:client});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.amount'],'89.99');assert.equal(r.variables['agreement.payment_terms'],'Cobro cada 3 meses');assert.equal(r.variables['agreement.deliverables'],'Dos piezas pactadas');assert.equal(r.sources['agreement.amount'].source,'client-commercial-terms');assert.equal(String(r.sources['agreement.amount'].record_id),String(term));
const catalogOnly={...sales,capabilities:{...sales.capabilities,'commercial-terms.manage':false}};r=await call(root+'/autofill','POST',{plan_id:plan,client_id:client},catalogOnly);assert.equal(r.variables['agreement.amount'],'12.64','negotiated prices require their independent permission');
r=await call(root+'/autofill','POST',{plan_id:plan,client_id:unnamed});assert.equal(r.variables['agreement.amount'],'12.64','never reuse another client terms');
// The negotiated agreement is active on today's Asunción date even when
// the database session has already crossed a different civil-day boundary.
await query(`update agency_client_commercial_terms set starts_on=${zoneTodaySql},ends_on=${zoneTodaySql} where id=$1`,[term]);
let differentCivilDates=0;
for(const timezone of ['Etc/GMT+12','Etc/GMT-14']){
 await query(`set time zone '${timezone}'`);const days=await one(`select current_date::text as database_date,${zoneTodaySql}::text as business_date`);if(days.database_date!==days.business_date)differentCivilDates++;
 r=await call(root+'/autofill','POST',{plan_id:plan,client_id:client});assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.variables['agreement.amount'],'89.99','negotiated agreement validity follows Asunción, independent of database timezone');assert.equal(r.sources['agreement.amount'].source,'client-commercial-terms');
}
assert(differentCivilDates>0,'test exercises a real database/business civil-day difference without replacing the clock');await query("set time zone 'UTC'");
r=await call(root,'POST',{template_id:template.id,title:'Desde presupuesto',client_id:client,budget_id:budget,variables:{'agreement.amount':'2000.01'}});assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.contract.variables['agreement.amount'],'2000.01');assert.equal(r.contract.sources['agreement.amount'].source,'manual');assert.equal(r.contract.sources['agreement.currency'].source,'budget');
await query('update agency_plans set active=false where id=$1',[plan]);assert.equal((await call(root+'/autofill','POST',{plan_id:plan})).status,409);assert.equal((await call(root+'/config')).plans.some(p=>String(p.id)===String(plan)),false);await query('update agency_plans set active=true where id=$1',[plan]);
for(const [kind,key] of [['plans',plan],['budgets',budget]]){await query('insert into agency_archived_records(organization_id,kind,record_id,removed_by) values($1,$2,$3,$4)',[org,kind,key,uid]);assert.equal((await call(root+'/autofill','POST',{[kind==='plans'?'plan_id':'budget_id']:key,client_id:client})).status,409);assert.equal((await call(root+'/config'))[kind].some(row=>String(row.id)===String(key)),false);}

// New relations reject inactive or archived parties, without invalidating historical document snapshots.
await query('update agency_clients set active=false where id=$1',[client]);
assert.equal((await call(root+'/autofill','POST',{client_id:client})).status,409);
assert.equal((await call(root,'POST',{template_id:template.id,title:'Inactive client',client_id:client})).status,409);
await query('update agency_clients set active=true where id=$1',[client]);
await query("insert into agency_archived_records(organization_id,kind,record_id,removed_by) values($1,'clients',$2,$3)",[org,client,uid]);
assert.equal((await call(root+'/autofill','POST',{client_id:client})).status,409);
assert.equal((await call(root,'POST',{template_id:template.id,title:'Archived client',client_id:client})).status,409);
assert.equal((await call(root+'/config')).clients.some(row=>String(row.id)===String(client)),false);
assert.equal((await call(root+'/'+doc.id)).status,200,'historical draft remains accessible after party archive');
assert.equal((await call(root+'/'+doc.id+'/versions')).versions[0].rendered_text,version.rendered_text,'issued snapshot survives party archive');
const collaborator=(await one("insert into agency_collaborators(organization_id,full_name) values($1,'Colaborador prueba') returning id",[org])).id;
assert.equal((await call(root+'/autofill','POST',{collaborator_id:collaborator})).status,200);
await query('update agency_collaborators set active=false where id=$1',[collaborator]);
assert.equal((await call(root+'/autofill','POST',{collaborator_id:collaborator})).status,409);
await query('update agency_collaborators set active=true where id=$1',[collaborator]);
await query("insert into agency_archived_records(organization_id,kind,record_id,removed_by) values($1,'collaborators',$2,$3)",[org,collaborator,uid]);
assert.equal((await call(root+'/autofill','POST',{collaborator_id:collaborator})).status,409);
assert.equal((await call(root,'POST',{template_id:template.id,title:'Archived employee',collaborator_id:collaborator})).status,409);
assert.equal((await call(root+'/config')).collaborators.some(row=>String(row.id)===String(collaborator)),false);
const auditRows=(await query('select * from agency_contract_audit where organization_id=$1',[org])).rows;assert(auditRows.some(a=>a.action==='issue'));assert(auditRows.every(a=>String(a.actor_user_id)===String(uid)));assert(!JSON.stringify(auditRows).includes('123456789'),'audit never includes bank/account/body');
await pg.close();console.log('PASS contracts: tenant/role access, legal profile provenance and conflicts, template variables, missing data, review and issuance, immutable versions, concurrent revision protection, sensitive bank access across list/detail/versions/PDF, safe HTML PDF, editable built-in models, legal party/signature fields, authorized budget/plan sources and exact decimal negotiated pricing, optional mock AI without mutation, audit and repeatable migration');
