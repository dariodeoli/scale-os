import {companyLocalityCatalog,companyLocalityProfile,companyLocalityProvenance,CompanyLocalityValidationError} from './company-locality.js';
import {assertDemoEffectAllowed,isDemoActor} from './demo-effects.js';
import {roleCan} from './permissions.js';
import {fillContractCommercial} from './contract-commercial.js';
import {BUILTIN_CONTRACT_MODELS} from './contract-models.js';
import {assertRecordAvailable,visibleRecord} from './record-lifecycle.js';
import {fail,text,id,optId} from './suite-validation.js';
import {renderBudgetPdf} from './budget-document.js';
import {iaConfig,iaProviderDeConfig,parsearSalidaIa} from './ia-carga.js';
import {throttle} from './request-guard.js';
import {logPersonalDataAccess} from './personal-data.js';

export const CONTRACT_VARIABLES=[
 'company.name','company.legal_name','company.tax_id','company.address','company.city','company.department','company.phone',
 'company.legal_representative_name','company.legal_representative_document','company.legal_representative_role',
 'counterparty.name','counterparty.legal_name','counterparty.tax_id','counterparty.address','counterparty.city','counterparty.department',
 'counterparty.legal_representative_name','counterparty.legal_representative_document','counterparty.legal_representative_role','counterparty.email','counterparty.phone',
 'counterparty.document_type','counterparty.document','counterparty.document_number','counterparty.party_type','counterparty.signer_name','counterparty.signer_document',
 'bank.institution','bank.account_number','bank.holder_name','bank.currency','agreement.type','agreement.amount','agreement.currency','agreement.starts_on','agreement.ends_on',
 ...['signed_on','signing_city','title','scope','deliverables','exclusions','payment_terms','delivery_terms','renewal_terms','cancellation_terms','corrections_terms','client_obligations','intellectual_property','portfolio_terms','confidentiality_terms','jurisdiction','amount_in_words','tax_terms','plan_name','notes'].map(key=>'agreement.'+key),
];
const bankKeys=CONTRACT_VARIABLES.filter(k=>k.startsWith('bank.'));
const hasBank=(body,variables)=>bankKeys.some(k=>Object.hasOwn(variables,k)&&variables[k]!=='')||/\{\{\s*bank\./.test(body);
const clean=(v,max)=>{const s=text(v,max);if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(s))fail('Texto contiene caracteres inválidos');return s;};
const object=v=>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Objeto inválido');return v;};
const parse=v=>typeof v==='string'?JSON.parse(v):v;
export function contractVariables(input={}){const result={};for(const [key,value] of Object.entries(object(input))){if(!CONTRACT_VARIABLES.includes(key))fail('Variable de contrato desconocida');result[key]=clean(value,4000);}return result;}
export function contractSources(input={}){const result={};for(const [key,value] of Object.entries(object(input))){if(!CONTRACT_VARIABLES.includes(key))fail('Origen desconocido');const item=object(value);if(Object.keys(item).some(k=>!['source','record_id','verified_at'].includes(k)))fail('Origen inválido');result[key]={source:clean(item.source,120),...(item.record_id?{record_id:id(item.record_id)}:{}),...(item.verified_at?{verified_at:clean(item.verified_at,60)}:{})};}return result;}
function trustedSources(variables,baselineVariables,baselineSources,incoming){
 // Callers cannot turn a manual correction into a supposedly verified provider result.
 contractSources(incoming??{});
 return Object.fromEntries(Object.keys(variables).map(key=>[key,variables[key]===baselineVariables[key]&&baselineSources[key]?baselineSources[key]:{source:'manual'}]));
}
export function contractBody(value){const body=clean(value,60000);if(!body)fail('Agregá texto al documento');const tokens=[...body.matchAll(/\{\{([\s\S]*?)\}\}/g)];for(const token of tokens)if(!CONTRACT_VARIABLES.includes(token[1].trim()))fail('Variable de plantilla desconocida');if(body.replace(/\{\{[\s\S]*?\}\}/g,'').includes('{{')||body.replace(/\{\{[\s\S]*?\}\}/g,'').includes('}}'))fail('Variable de plantilla incompleta');return body;}
function required(input=[]){if(!Array.isArray(input)||input.length>CONTRACT_VARIABLES.length||input.some(k=>!CONTRACT_VARIABLES.includes(k)))fail('Campos requeridos inválidos');return [...new Set(input)];}
export function contractMissing(body,variables,fields=[]){return [...new Set([...required(parse(fields)),...[...body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m=>m[1])])].filter(k=>!variables[k]?.trim());}
export function renderContractText(body,variables){return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g,(_,k)=>variables[k]??'');}
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contractHtml(version){return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escape(version.title)}</title><style>@page{size:A4;margin:20mm}body{font:12pt/1.55 Arial,sans-serif;color:#171717}h1{font-size:19pt;overflow-wrap:anywhere}.body{white-space:pre-wrap;overflow-wrap:anywhere}footer{margin-top:24pt;font-size:9pt;color:#555}</style></head><body><h1>${escape(version.title)}</h1><div class="body">${escape(version.rendered_text)}</div><footer>Versión ${Number(version.version)} · Documento revisado por una persona. La asistencia de IA no constituye validación legal.</footer></body></html>`;}
function revision(value,old){if(!Number.isSafeInteger(value)||value<1)fail('Indicá la revisión esperada');if(value!==old.revision)fail('El documento cambió. Actualizá antes de guardar.',409);}
function bankAccess(user){return roleCan(user,'contracts.bank-data.view');}
function guardBank(user,row){if(row.contains_bank_data&&!bankAccess(user))fail('Sin permiso para datos bancarios del contrato',403);}
function hydrate(row){if(!row)return row;for(const key of ['variables','sources','required_fields','provenance'])if(row[key]!=null)row[key]=parse(row[key]);return row;}
async function audit(c,u,type,key,action,rev){await c.query('insert into agency_contract_audit(organization_id,actor_user_id,entity_type,entity_id,action,revision) values($1,$2,$3,$4,$5,$6)',[u.organization_id,u.id,type,String(key),action,rev??null]);}
async function owned(c,table,key,u){const row=hydrate((await c.query(`select * from ${table} where id=$1 and organization_id=$2 for update`,[id(key),u.organization_id])).rows[0]);if(!row)fail('Documento no encontrado',404);return row;}
async function fill(c,u,b){
 const variables={},sources={};const put=(key,value,source,record_id,verified_at)=>{if(value!=null&&String(value).trim()){variables[key]=clean(String(value),4000);sources[key]={source,...(record_id?{record_id:String(record_id)}:{}),...(verified_at?{verified_at:String(verified_at)}:{})};}};
 const settings=(await c.query('select o.name,s.legal_name,s.tax_id,s.address,s.phone from organizations o left join agency_settings s on s.organization_id=o.id where o.id=$1',[u.organization_id])).rows[0]||{};
 for(const [key,value] of Object.entries(settings))put('company.'+key,value,'company-profile',u.organization_id);
 if(!String(settings.legal_name??'').trim())put('company.legal_name',settings.name,'company-profile',u.organization_id);
 const profile=(await c.query('select * from agency_company_legal_profiles where organization_id=$1',[u.organization_id])).rows[0];
 if(profile)for(const key of ['city','department','legal_representative_name','legal_representative_document','legal_representative_role'])put('company.'+key,profile[key],parse(profile.provenance)?.[key]?.source||'manual',u.organization_id);
 if(b.client_id&&b.collaborator_id)fail('Elegí una sola contraparte');
 if(b.client_id){
  const row=await owned(c,'agency_clients',b.client_id,u);await assertRecordAvailable(c,'agency_clients',row);if(row.active===false)fail('El cliente está inactivo',409);
  for(const key of ['name','legal_name','tax_id','email','phone','address','city','department','document_type','document_number','party_type','legal_representative_name','legal_representative_document','legal_representative_role'])put('counterparty.'+key,row[key],'client',row.id);
  put('counterparty.document_type',({ci:'CI',ruc:'RUC',passport:'Pasaporte',other:'Documento'})[row.document_type], 'client',row.id);
  const partyDocument=row.document_number||(!row.document_type||row.document_type==='ruc'?row.tax_id:'');
  put('counterparty.document',partyDocument,'client',row.id);
  if(!row.document_type&&row.tax_id&&!row.document_number)put('counterparty.document_type','RUC','client',row.id);
  if(!String(row.legal_name??'').trim()){
   if(row.ruc_legal_name)put('counterparty.legal_name',row.ruc_legal_name,row.ruc_source||'ruc-provider',row.id,row.ruc_refreshed_at);
   else put('counterparty.legal_name',row.name,'client',row.id);
  }
  if(row.party_type==='person'){
   put('counterparty.signer_name',variables['counterparty.legal_name'],'client',row.id);
   put('counterparty.signer_document',partyDocument,'client',row.id);
  }else if(row.party_type==='company'){
   put('counterparty.signer_name',row.legal_representative_name,'client',row.id);
   put('counterparty.signer_document',row.legal_representative_document,'client',row.id);
  }
 }
 if(b.collaborator_id){const row=await owned(c,'agency_collaborators',b.collaborator_id,u);await assertRecordAvailable(c,'agency_collaborators',row);if(row.active===false)fail('El colaborador está inactivo',409);put('counterparty.name',row.full_name,'collaborator',row.id);put('counterparty.email',row.email,'collaborator',row.id);}
 if(b.bank_account_id){if(!bankAccess(u)||!roleCan(u,'finance.view'))fail('Sin permiso para seleccionar cuentas bancarias',403);const row=await owned(c,'bank_accounts',b.bank_account_id,u);if(!row.active)fail('Cuenta bancaria inactiva');for(const key of ['institution','account_number','holder_name','currency'])put('bank.'+key,row[key],'bank-account',row.id);}
 await fillContractCommercial(c,u,b,put);
 return {variables,sources,missing:[]};
}
export function contractAiMetadata(contract){
 const fields=[...new Set([...contract.required_fields,...[...contract.body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(m=>m[1])])].filter(key=>CONTRACT_VARIABLES.includes(key));
 return {fields,required_fields:contract.required_fields.filter(key=>CONTRACT_VARIABLES.includes(key)),missing:contractMissing(contract.body,contract.variables,contract.required_fields),presence:Object.fromEntries(fields.map(key=>[key,Boolean(contract.variables[key]?.trim())]))};
}
export async function contracts({req,res,url,db,session,body,send,pdfRenderer=renderBudgetPdf,aiProvider=null}){
 const path=url.pathname,profilePath='/api/agency/company-legal-profile';
 if(path!==profilePath&&!path.startsWith('/api/agency/contracts'))return false;
 let c,tx=false;
 try{
  const u=await session(req);if(!u)fail('No autenticado',401);
  if(!roleCan(u,path===profilePath?'settings.manage':'contracts.view'))fail('Sin permiso para contratos',403);
  c=await db.connect();await c.query('begin');tx=true;
  const mutate=req.method!=='GET';if(mutate&&path!==profilePath&&!roleCan(u,'contracts.manage'))fail('Sin permiso para gestionar contratos',403);
  let result,status=200;
  if(path===profilePath){
   if(req.method==='GET')result={profile:companyLocalityProfile(hydrate((await c.query('select * from agency_company_legal_profiles where organization_id=$1',[u.organization_id])).rows[0])||{revision:0,city:'',department:'',legal_representative_name:'',legal_representative_document:'',legal_representative_role:'',provenance:{}}),locality_catalog:companyLocalityCatalog()};
   else if(req.method==='PATCH'){
    const b=object(await body(req));await c.query('select id from organizations where id=$1 for update',[u.organization_id]);
    const old=hydrate((await c.query('select * from agency_company_legal_profiles where organization_id=$1',[u.organization_id])).rows[0])||{revision:0};
    if(!Number.isSafeInteger(b.expected_revision)||b.expected_revision!==old.revision)fail('El perfil cambió. Actualizá antes de guardar.',409);
    const fields=['city','department','legal_representative_name','legal_representative_document','legal_representative_role'];
    if(Object.keys(b).some(k=>!fields.includes(k)&&!['expected_revision','locality_id','locality_catalog_version'].includes(k)))fail('Campo de perfil inválido');
    const values=fields.map(k=>clean(b[k]??old[k]??'',k.includes('document')?60:160)),provenance=companyLocalityProvenance(b,old,{city:values[0],department:values[1]},u.id);for(const key of fields)if(!['city','department'].includes(key)&&Object.hasOwn(b,key))provenance[key]={source:'manual',updated_by:String(u.id)};
    const row=(await c.query('insert into agency_company_legal_profiles(organization_id,city,department,legal_representative_name,legal_representative_document,legal_representative_role,provenance,revision,updated_by) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) on conflict(organization_id) do update set city=excluded.city,department=excluded.department,legal_representative_name=excluded.legal_representative_name,legal_representative_document=excluded.legal_representative_document,legal_representative_role=excluded.legal_representative_role,provenance=excluded.provenance,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=now() returning *',[u.organization_id,...values,JSON.stringify(provenance),old.revision+1,u.id])).rows[0];result={profile:companyLocalityProfile(hydrate(row))};await audit(c,u,'company-profile',u.organization_id,'update',row.revision);
   }else fail('Método no permitido',405);
  }else if(path==='/api/agency/contracts/config'&&req.method==='GET'){
   const manage=roleCan(u,'contracts.manage'),bank=bankAccess(u)&&roleCan(u,'finance.view'),commercial=manage&&roleCan(u,'budgets.manage');
   result={capabilities:{view:true,create:manage,edit:manage,templates_manage:manage,issue:roleCan(u,'contracts.issue'),bank_data_view:bankAccess(u),assist:manage&&!isDemoActor(u)&&Boolean(iaConfig())},clients:manage?(await c.query(`select r.id,r.name from agency_clients r where r.organization_id=$1 and r.active=true and ${visibleRecord('r','clients')} order by r.name`,[u.organization_id])).rows:[],collaborators:manage?(await c.query(`select r.id,r.full_name as name from agency_collaborators r where r.organization_id=$1 and r.active=true and ${visibleRecord('r','collaborators')} order by r.full_name`,[u.organization_id])).rows:[],budgets:commercial?(await c.query(`select r.id,r.title as name,r.client_id from agency_budgets r join agency_clients cl on cl.id=r.client_id and cl.organization_id=r.organization_id where r.organization_id=$1 and r.status not in ('rejected','expired') and cl.active=true and ${visibleRecord('r','budgets')} and ${visibleRecord('cl','clients')} order by r.id desc`,[u.organization_id])).rows:[],plans:commercial?(await c.query(`select r.id,r.name from agency_plans r where r.organization_id=$1 and r.active=true and ${visibleRecord('r','plans')} order by r.name`,[u.organization_id])).rows:[],bank_accounts:manage&&bank?(await c.query('select id,name from bank_accounts where organization_id=$1 and active=true order by name',[u.organization_id])).rows:[]};
  }else if(path==='/api/agency/contracts/models'&&req.method==='GET'){result={models:BUILTIN_CONTRACT_MODELS};}
  else if(path==='/api/agency/contracts/templates/from-model'&&req.method==='POST'){
   const b=object(await body(req)),model=BUILTIN_CONTRACT_MODELS.find(model=>model.key===b.model_key);if(!model)fail('Modelo no encontrado',404);
   const row=(await c.query('insert into agency_contract_templates(organization_id,name,agreement_type,body,required_fields,created_by) values($1,$2,$3,$4,$5::jsonb,$6) returning *',[u.organization_id,clean(model.name,160),clean(model.agreement_type,120),contractBody(model.body),JSON.stringify(required(model.required_fields)),u.id])).rows[0];result={template:hydrate(row)};status=201;await audit(c,u,'template',row.id,'create',1);
  }else if(path==='/api/agency/contracts/autofill'&&req.method==='POST'){result=await fill(c,u,object(await body(req)));}
  else if(path==='/api/agency/contracts/templates'){
   if(req.method==='GET')result={templates:(await c.query('select * from agency_contract_templates where organization_id=$1 order by id desc',[u.organization_id])).rows.map(hydrate),variables:CONTRACT_VARIABLES};
   else if(req.method==='POST'){const b=object(await body(req)),name=clean(b.name,160);if(!name)fail('Ingresá el nombre');const row=(await c.query('insert into agency_contract_templates(organization_id,name,agreement_type,body,required_fields,created_by) values($1,$2,$3,$4,$5::jsonb,$6) returning *',[u.organization_id,name,clean(b.agreement_type??'',120),contractBody(b.body),JSON.stringify(required(b.required_fields)),u.id])).rows[0];result={template:hydrate(row)};status=201;await audit(c,u,'template',row.id,'create',1);}
   else fail('Método no permitido',405);
  }else if(/^\/api\/agency\/contracts\/templates\/\d+$/.test(path)){
   const old=await owned(c,'agency_contract_templates',path.split('/').at(-1),u);
   if(req.method==='GET')result={template:old};
   else if(req.method==='PATCH'){const b=object(await body(req));revision(b.expected_revision,old);const merged={...old,...b};const name=clean(merged.name,160);if(!name)fail('Ingresá el nombre');const row=(await c.query('update agency_contract_templates set name=$1,agreement_type=$2,body=$3,required_fields=$4::jsonb,revision=revision+1,updated_at=now() where id=$5 and organization_id=$6 returning *',[name,clean(merged.agreement_type,120),contractBody(merged.body),JSON.stringify(required(merged.required_fields)),old.id,u.organization_id])).rows[0];result={template:hydrate(row)};await audit(c,u,'template',old.id,'update',row.revision);}
   else fail('Método no permitido',405);
  }else if(path==='/api/agency/contracts'){
   if(req.method==='GET')result={contracts:(await c.query('select id,title,template_id,revision,contains_bank_data,created_at,updated_at from agency_contracts where organization_id=$1 and (contains_bank_data=false or $2=true) order by id desc',[u.organization_id,bankAccess(u)])).rows};
   else if(req.method==='POST'){
    const b=object(await body(req)),template=await owned(c,'agency_contract_templates',b.template_id,u),filled=await fill(c,u,b),variables={...filled.variables,...contractVariables(b.variables??{})},sources=trustedSources(variables,filled.variables,filled.sources,b.sources);
    
    const title=clean(b.title,160);if(!title)fail('Ingresá el título');const containsBank=Boolean(b.bank_account_id)||hasBank(template.body,variables);if(containsBank&&!bankAccess(u))fail('Sin permiso para datos bancarios',403);
    const row=(await c.query('insert into agency_contracts(organization_id,template_id,title,body,required_fields,variables,sources,client_id,collaborator_id,bank_account_id,contains_bank_data,created_by,template_revision) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9,$10,$11,$12,$13) returning *',[u.organization_id,template.id,title,template.body,JSON.stringify(template.required_fields),JSON.stringify(variables),JSON.stringify(sources),optId(b.client_id),optId(b.collaborator_id),optId(b.bank_account_id),containsBank,u.id,template.revision])).rows[0];result={contract:hydrate(row),missing:contractMissing(row.body,variables,template.required_fields)};status=201;await audit(c,u,'contract',row.id,'create',1);
   }else fail('Método no permitido',405);
  }else{
   const match=path.match(/^\/api\/agency\/contracts\/(\d+)(?:\/(versions|assist)(?:\/(\d+)\/(pdf))?)?$/);if(!match)fail('Ruta no encontrada',404);
   const old=await owned(c,'agency_contracts',match[1],u);guardBank(u,old);
   if(!match[2]){
    if(req.method==='GET')result={contract:old,missing:contractMissing(old.body,old.variables,old.required_fields)};
    else if(req.method==='PATCH'){
     const b=object(await body(req));revision(b.expected_revision,old);const variables=Object.hasOwn(b,'variables')?contractVariables(b.variables):old.variables,sources=trustedSources(variables,old.variables,old.sources,b.sources);
     for(const key of Object.keys(variables))if(variables[key]!==old.variables[key]&&!Object.hasOwn(b.sources??{},key))sources[key]={source:'manual'};
     const title=clean(b.title??old.title,160),document=contractBody(b.body??old.body);if(!title)fail('Ingresá el título');const containsBank=old.contains_bank_data||hasBank(document,variables);if(containsBank&&!bankAccess(u))fail('Sin permiso para datos bancarios',403);
     const row=(await c.query('update agency_contracts set title=$1,body=$2,variables=$3::jsonb,sources=$4::jsonb,contains_bank_data=$5,revision=revision+1,updated_at=now() where id=$6 and organization_id=$7 returning *',[title,document,JSON.stringify(variables),JSON.stringify(sources),containsBank,old.id,u.organization_id])).rows[0];result={contract:hydrate(row),missing:contractMissing(document,variables,old.required_fields)};await audit(c,u,'contract',old.id,'update',row.revision);
    }else fail('Método no permitido',405);
   }else if(match[2]==='versions'){
    if(req.method==='GET'&&match[3]){
     const version=hydrate((await c.query('select * from agency_contract_versions where contract_id=$1 and organization_id=$2 and version=$3',[old.id,u.organization_id,Number(match[3])])).rows[0]);if(!version)fail('Versión no encontrada',404);guardBank(u,version);await audit(c,u,'version',version.id,'pdf',version.version);await c.query('commit');tx=false;const pdf=await pdfRenderer(contractHtml(version));res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="contrato-${old.id}-v${version.version}.pdf"`,'Cache-Control':'no-store'});res.end(pdf);return true;
    }else if(req.method==='GET')result={versions:(await c.query('select * from agency_contract_versions where contract_id=$1 and organization_id=$2 order by version desc',[old.id,u.organization_id])).rows.map(hydrate)};
    else if(req.method==='POST'&&!match[3]){
     if(!roleCan(u,'contracts.issue'))fail('Sin permiso para emitir contratos',403);const b=object(await body(req));revision(b.expected_revision,old);if(b.reviewed!==true)fail('Confirmá la revisión humana antes de emitir');const missing=contractMissing(old.body,old.variables,old.required_fields);if(missing.length)fail('Faltan campos: '+missing.join(', '));
     const template=await owned(c,'agency_contract_templates',old.template_id,u),n=Number((await c.query('select coalesce(max(version),0)+1 as next from agency_contract_versions where contract_id=$1',[old.id])).rows[0].next);
     const version=(await c.query('insert into agency_contract_versions(organization_id,contract_id,version,title,body,rendered_text,variables,sources,template_id,template_revision,contains_bank_data,reviewed_by) values($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12) returning *',[u.organization_id,old.id,n,old.title,old.body,renderContractText(old.body,old.variables),JSON.stringify(old.variables),JSON.stringify(old.sources),template.id,old.template_revision,old.contains_bank_data,u.id])).rows[0];
     const row=(await c.query('update agency_contracts set revision=revision+1,updated_at=now() where id=$1 and organization_id=$2 returning *',[old.id,u.organization_id])).rows[0];result={version:hydrate(version),contract:hydrate(row)};status=201;await audit(c,u,'contract',old.id,'issue',row.revision);
    }else fail('Método no permitido',405);
   }else if(match[2]==='assist'&&req.method==='POST'){
    assertDemoEffectAllowed(u,'ai');
    const config=iaConfig();if(!config&&!aiProvider)fail('La IA no está configurada',503);if(!await throttle(db,'contracts-ai:'+u.organization_id,10))fail('Esperá antes de consultar de nuevo',429);
    // Only whitelisted field names and presence booleans leave the tenant. No body, title, values, identifiers or snapshots enter a prompt.
    const provider=aiProvider||iaProviderDeConfig(config),out=await provider.analizar([{role:'system',content:'Revisá consistencia estructural de campos contractuales según metadatos. Recibís solo nombres de campos y presencia, nunca sus valores. Sugerí un checklist de revisión; no redactes ni inventes nombres, documentos, cláusulas o montos. Devolvé JSON {"suggestion":"observaciones"}. Requiere revisión humana y no garantiza validez legal.'},{role:'user',content:JSON.stringify(contractAiMetadata(old))}],{maxTokens:3000});
    const parsed=parsearSalidaIa(typeof out==='string'?out:out.contenido),suggestion=clean(parsed.suggestion,12000);await logPersonalDataAccess(c,{organizationId:u.organization_id,actorUserId:u.id,actorKind:'user',actorLabel:null,action:'ai.transfer',context:'contracts',details:{modelo:config?.modelo||'test-provider',contract_id:String(old.id)}});result={suggestion,requires_review:true};await audit(c,u,'contract',old.id,'assist',old.revision);
   }else fail('Método no permitido',405);
  }
  await c.query('commit');tx=false;send(res,status,result);return true;
 }catch(error){if(tx)await c.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la operación de contratos.',...(error instanceof CompanyLocalityValidationError?{fieldErrors:error.fieldErrors}:{})});return true;}finally{c?.release();}
}
