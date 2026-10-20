// Refs #330: fixed, typed routes to the same handlers used by the application.
// This catalog neither executes SQL nor accepts a model-selected URL/method.
import {agencyCore} from './agency-core.js';
import {suite} from './agency-suite.js';
import {operations} from './operations.js';
import {employeeTasks} from './employee-tasks.js';
import {productivity} from './productivity.js';
import {workChecklists} from './work-checklists.js';
import {workOrderLinks} from './work-order-links.js';
import {projectAssignees} from './project-assignees.js';
import {contracts,CONTRACT_VARIABLES} from './contracts.js';
import {inventoryReservations} from './inventory-reservations.js';
import {studioReservations} from './studio-reservations.js';
import {pipelineStages} from './pipeline-stages.js';
import {recordLifecycle} from './record-lifecycle.js';

// More-specific routes precede the broad suite/core routes. In particular the
// modern employee task handler MUST precede productivity's legacy task branch.
const canonicalOperationsHandlers=[employeeTasks,workChecklists,workOrderLinks,projectAssignees,contracts,inventoryReservations,studioReservations,pipelineStages,recordLifecycle,productivity,operations,suite,agencyCore];
const read='scale:read',write='scale:write';
const str=(maxLength=2000,minLength=0)=>({type:'string',maxLength,...(minLength?{minLength}:{})});
const choice=(...values)=>({type:'string',enum:values});
const bool={type:'boolean'},id={type:'string',pattern:'^[1-9][0-9]{0,18}$'},revision={type:'string',pattern:'^(0|[1-9][0-9]*)$'};
const integer=(minimum=0,maximum=9007199254740991)=>({type:'integer',minimum,maximum});
const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const array=(items,maxItems=100,minItems=0)=>({type:'array',items,maxItems,minItems});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const money={anyOf:[{type:'number',minimum:0,maximum:9007199254740991},{type:'string',pattern:'^(0|[1-9][0-9]*)(\\.[0-9]{1,2})?$'}]};
const currency=choice('PYG','USD','EUR','BRL','ARS','MXN');
const date={type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])-[0-9]{2}$'};
const month={type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'};
const timestamp={type:'string',maxLength:40,pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\\.[0-9]{1,3})?)?(Z|[+-][0-9]{2}:[0-9]{2})$'};
const time={type:'string',pattern:'^([01][0-9]|2[0-3]):[0-5][0-9]$'};
const link={type:'string',maxLength:2048,pattern:'^https://[^\\s]+$'};
const ids=(max=40,min=0)=>({...array(id,max,min),uniqueItems:true});
const empty=object({});
export const operationsDefinitions=[];
function add(name,method,path,cap,{dataSchema,query,requiredQuery,description,listKey,listMode='memory',...extra}={}){
 const params=Object.fromEntries([...path.matchAll(/:([A-Za-z][A-Za-z0-9_]*)/g)].map(([,key])=>[key,id]));
 operationsDefinitions.push({name:'scale_'+name,method,path,params,cap,scope:method==='GET'?read:write,domain:'operations',description:description||`${method} ${path}. Reutiliza permisos, validaciones e historial del formulario de Scale; sólo empresa autorizada.`,...(method==='GET'?{}:{dataSchema:dataSchema||empty}),...(query?{query}:{}),...(requiredQuery?{requiredQuery}:{}),...(listKey?{list:true,listKey,listMode}:{}),...extra});
}
function crud(plural,singular,path,cap,properties,required=[],options={}){
 add('list_'+plural,'GET',path,options.readCap??cap,{listKey:options.listKey||plural,...options.readOptions});
 if(options.detail!==false)add('get_'+singular,'GET',path+'/:id',options.readCap??cap);
 add('create_'+singular,'POST',path,options.createCap??cap,{dataSchema:object(properties,required)});
 add('update_'+singular,'PATCH',path+'/:id',cap,{dataSchema:object(properties,options.updateRequired||[])});
}
function archive(plural,singular,cap){
 add('archive_'+singular,'DELETE','/api/agency/'+plural+'/:id',cap,{description:'Archiva en Papelera sin purgar; conserva validaciones de padres y reservas abiertas. Requiere confirmación explícita.'});
 add('restore_'+singular,'POST','/api/agency/'+plural+'/:id/restore',cap,{description:'Restaura desde Papelera, sin modificar roles ni acceso y con el permiso canónico del recurso.'});
}

const assignees=object({assigned_user_ids:ids(),assigned_user_id:nullable(id),expected_version:revision},['assigned_user_ids','expected_version']);
const driveLinks=array(object({label:str(80),url:link},['url']),10);
const urgency=nullable({anyOf:[integer(1,5),{type:'string',pattern:'^[1-5]$'}]});
const projectPath='/api/agency/projects',orderPath='/api/agency/work-orders';
add('list_projects','GET',projectPath,null,{listKey:'projects'});
add('get_project','GET',projectPath+'/:id',null);
add('create_project','POST',projectPath,'projects.manage',{dataSchema:object({name:str(160,2),clientId:id,driveUrl:nullable(link),urgency},['name','clientId'])});
add('update_project','PATCH',projectPath+'/:id','projects.edit',{dataSchema:object({name:str(160,2),approval_levels:{type:'integer',enum:[1,2,3]},status:choice('active','paused','completed','cancelled'),start_date:nullable(date),due_date:nullable(date),drive_url:nullable(link),drive_links:driveLinks,active:bool,urgency,assignees,expected_updated_at:timestamp})});
archive('projects','project','projects.edit');
add('list_work_orders','GET',orderPath,null,{listKey:'workOrders',listMode:'native',query:{status:choice('blocked','to_record','recorded','editing','review','approved','published'),project_id:id}});
add('get_work_order','GET',orderPath+'/:id',null);
const workState=choice('blocked','to_record','recorded','editing','review','approved','published');
const workType=nullable(choice('video','reedicion','foto','produccion','entregable'));
add('create_work_order','POST',orderPath,'work-orders.edit',{dataSchema:object({title:str(160,2),projectId:id,status:choice('blocked','to_record','recorded','editing','review'),description:nullable(str()),driveUrl:nullable(link),urgency,work_type:workType,due_time:nullable(time)},['title','projectId'])});
add('update_work_order','PATCH',orderPath+'/:id','work-orders.edit',{dataSchema:object({title:str(160,2),description:str(),status:workState,drive_url:nullable(link),drive_links:driveLinks,due_date:nullable(date),due_time:nullable(time),assigned_user_id:nullable(id),estimated_hours:money,actual_hours:money,work_type:workType,urgency,assignees,expected_updated_at:timestamp})});
for(const action of ['approve','publish'])add(action+'_work_order','POST',orderPath+'/:id/'+action,'work-orders.manage');
archive('work-orders','work_order','work-orders.manage');
for(const [plural,singular] of [['projects','project'],['work-orders','work_order']]){
 add('get_'+singular+'_assignees','GET','/api/agency/'+plural+'/:id/assignees','inventory.view');
 add('update_'+singular+'_assignees','PATCH','/api/agency/'+plural+'/:id/assignees','assignees.manage',{dataSchema:assignees});
}
add('list_assignable_people','GET','/api/agency/assignees','inventory.view',{listKey:'members'});
const comment=object({body:str(2000,1),mentioned_user_ids:ids(40)},['body']);
add('list_project_comments','GET',projectPath+'/:id/comments',null,{listKey:'comments'});
add('add_project_comment','POST',projectPath+'/:id/comments','projects.edit',{dataSchema:comment});
add('get_work_order_activity','GET','/api/agency/productivity/orders/:id',null,{description:'Detalle de pieza, historial de estados y comentarios; historial limitado por el handler y redacción por rol.'});
add('add_work_order_comment','POST','/api/agency/productivity/orders/:id/comments','work-orders.edit',{dataSchema:comment});
add('duplicate_work_order','POST','/api/agency/productivity/orders/:id/duplicate','work-orders.edit');
add('list_work_order_links','GET',orderPath+'/:id/links',null,{listKey:'links'});
add('add_work_order_link','POST',orderPath+'/:id/links','work-orders.edit',{dataSchema:object({label:str(120,2),url:link,visible_to_client:bool},['label','url']),description:'Guarda un enlace HTTPS de entrega; no descarga ni ejecuta la URL. Visibilidad al cliente sólo si se solicita explícitamente.'});
add('update_work_order_link','PATCH',orderPath+'/:id/links/:linkId','work-orders.edit',{dataSchema:object({visible_to_client:bool},['visible_to_client'])});
add('remove_work_order_link','DELETE',orderPath+'/:id/links/:linkId','work-orders.edit');
add('get_work_checklist','GET',orderPath+'/:id/checklist','work-checklists.view');
add('add_work_checklist_item','POST',orderPath+'/:id/checklist/items','checklists.edit',{dataSchema:object({expected_version:revision,text:str(500,1)},['expected_version','text'])});
add('update_work_checklist_item','PATCH',orderPath+'/:id/checklist/items/:itemId','checklists.edit',{dataSchema:object({expected_version:revision,text:str(500,1),completed:bool},['expected_version'])});
add('remove_work_checklist_item','DELETE',orderPath+'/:id/checklist/items/:itemId','checklists.edit',{dataSchema:object({expected_version:revision},['expected_version'])});
const taskProps={title:str(160,2),description:str(4000),status:choice('pending','in_progress','done'),priority:choice('low','normal','high','urgent'),due_date:nullable(date),due_time:nullable(time),project_id:nullable(id),client_id:nullable(id),assigned_user_ids:ids(),expected_version:integer(),checklist:array(object({id:{type:'string',maxLength:80,pattern:'^[A-Za-z0-9_-]+$'},text:str(500,1),completed:bool},['id','text','completed'])),materials:array(object({label:str(120),url:link},['url']),40)};
crud('tasks','task','/api/agency/productivity/internal-tasks','tasks.edit',taskProps,['title','expected_version'],{readCap:'tasks.view',updateRequired:['expected_version'],listKey:'records',readOptions:{listMode:'native',defaultLimit:10,pageLimits:[10,50],query:{assignee:{anyOf:[id,choice('me','all')]},bucket:choice('all','today','upcoming','overdue','completed','undated'),project_id:id,client_id:id,from:date,to:date}}});
add('get_task_context','GET','/api/agency/productivity/internal-tasks/context','tasks.view');
add('add_task_comment','POST','/api/agency/productivity/internal-tasks/:id/comments','tasks.edit',{dataSchema:object({body:str(2000,1),expected_version:integer()},['body','expected_version'])});
add('list_production_history','GET','/api/agency/productivity/history',null,{listKey:'records',listMode:'native',defaultLimit:10,pageLimits:[10,50],query:{userId:id}});
add('list_production_source_events','GET','/api/agency/productivity/source-events','activity.view',{listKey:'records',listMode:'native',defaultLimit:10,pageLimits:[10,50]});
add('import_production_source_events','POST','/api/agency/productivity/source-events',['activity.view'],{dataSchema:object({events:array(object({source_key:str(160,1),source_url:link,source_author:str(120),body:str(4000),occurred_at:timestamp},['source_key','source_url','occurred_at']),100)},['events'])});
add('batch_update_work_orders','POST','/api/agency/productivity/batch','work-orders.edit',{dataSchema:object({ids:ids(100,1),versions:{type:'object',maxProperties:100,patternProperties:{'^[1-9][0-9]{0,18}$':timestamp},additionalProperties:false},change:object({status:choice('blocked','to_record','recorded','editing','review'),assigned_user_id:nullable(id),due_date:nullable(date)})},['ids','versions','change'])});
const productionItem=object({title:str(160,2),day:integer(1,31),hours:{type:'number',minimum:0,maximum:500},checklist:str()},['title','day']);
add('list_production_templates','GET','/api/agency/productivity/templates','work-orders.manage',{listKey:'templates'});
add('create_production_template','POST','/api/agency/productivity/templates','work-orders.manage',{dataSchema:object({name:str(120,2),items:array(productionItem,40,1)},['name','items'])});
add('generate_production_template','POST','/api/agency/productivity/templates/:id/generate','work-orders.manage',{dataSchema:object({project_id:id,month,assigned_user_id:nullable(id)},['project_id','month'])});

const lead={name:str(160,2),email:str(200),phone:str(60),stage:str(40),amount:money,currency,probability:integer(0,100),notes:str(),do_not_contact:bool,lawful_basis:choice('consent','contract','legal_obligation','vital_interests','public_interest','legitimate_interest')};
crud('leads','lead','/api/agency/leads','commercial.manage',lead,['name'],{listKey:'records',detail:false,readOptions:{listMode:'native'}});
add('convert_lead','POST','/api/agency/leads/:id/convert','commercial.manage');
archive('leads','lead','commercial.manage');
crud('pipeline_stages','pipeline_stage','/api/agency/pipeline-stages','commercial.manage',{label:str(60,2),slug:{type:'string',maxLength:40,pattern:'^[a-z0-9][a-z0-9_-]{0,39}$'},kind:choice('open','won','lost'),position:integer(0,9999),active:bool},['label'],{detail:false,listKey:'stages'});
const budgetItem=object({description:str(500,1),quantity:{type:'number',minimum:0,maximum:999999},unitPrice:money},['description','quantity','unitPrice']);
const sections=array(object({type:choice('meta','items','totals','notes','text'),title:str(120),body:str(5000),enabled:bool},['type','enabled']),24,2);
const budgetProps={title:str(160,2),currency,items:array(budgetItem,100,1),notes:str(),valid_until:nullable(date),tax_rate:{type:'number',enum:[0,0.05,0.1]},sections};
add('list_budgets','GET','/api/agency/budgets','budgets.manage',{listKey:'budgets',listMode:'native'});
add('get_budget','GET','/api/agency/budgets/:id','budgets.manage');
add('create_budget','POST','/api/agency/budgets','budgets.manage',{dataSchema:object({...budgetProps,clientId:id,validUntil:nullable(date)},['title','clientId','items'])});
add('update_budget','PATCH','/api/agency/budgets/:id','budgets.manage',{dataSchema:object(budgetProps,['title','items'])});
for(const action of ['share','revoke','invoice'])add(action+'_budget','POST','/api/agency/budgets/:id/'+action,'budgets.manage',{description:action==='invoice'?'Genera factura del presupuesto aceptado; handler también exige invoices.manage. No registra cobros ni cambia saldo.':action==='share'?'Habilita el enlace público de propuesta para el cliente sólo con confirmación explícita.':'Revoca el enlace público de la propuesta; no borra el documento.'});
archive('budgets','budget','budgets.manage');

const variables=object(Object.fromEntries(CONTRACT_VARIABLES.map(key=>[key,str(4000)])));
const source=object({source:str(120),record_id:id,verified_at:str(60)},['source']);
const sources=object(Object.fromEntries(CONTRACT_VARIABLES.map(key=>[key,source])));
const requiredFields=array(choice(...CONTRACT_VARIABLES),CONTRACT_VARIABLES.length);
const contractProps={title:str(160,1),body:str(60000,1),variables,sources,expected_revision:integer()};
add('list_contracts','GET','/api/agency/contracts','contracts.view',{listKey:'contracts'});
add('get_contract','GET','/api/agency/contracts/:id','contracts.view');
add('create_contract','POST','/api/agency/contracts','contracts.manage',{dataSchema:object({template_id:id,title:str(160,1),variables,sources,client_id:nullable(id),collaborator_id:nullable(id),bank_account_id:nullable(id),budget_id:nullable(id),plan_id:nullable(id)},['template_id','title'])});
add('update_contract','PATCH','/api/agency/contracts/:id','contracts.manage',{dataSchema:object(contractProps,['expected_revision'])});
add('get_contract_config','GET','/api/agency/contracts/config','contracts.view');
add('list_contract_models','GET','/api/agency/contracts/models','contracts.view',{listKey:'models'});
const templateProps={name:str(160,1),agreement_type:str(120),body:str(60000,1),required_fields:requiredFields,expected_revision:integer()};
crud('contract_templates','contract_template','/api/agency/contracts/templates','contracts.manage',templateProps,['name','body'],{readCap:'contracts.view',updateRequired:['expected_revision'],listKey:'templates'});
add('import_contract_model','POST','/api/agency/contracts/templates/from-model','contracts.manage',{dataSchema:object({model_key:str(120,1)},['model_key'])});
add('autofill_contract','POST','/api/agency/contracts/autofill','contracts.manage',{dataSchema:object({client_id:nullable(id),collaborator_id:nullable(id),bank_account_id:nullable(id),budget_id:nullable(id),plan_id:nullable(id)})});
add('preview_contract','POST','/api/agency/contracts/preview','contracts.view',{dataSchema:object({...contractProps,model_key:str(120,1),template_id:id,contract_id:id,sample:bool,client_id:nullable(id),collaborator_id:nullable(id),bank_account_id:nullable(id),budget_id:nullable(id),plan_id:nullable(id)}),description:'Vista previa de borrador o modelo con datos ficticios opcionales. No emite ni firma un contrato; handler controla edición y acceso bancario.'});
add('list_contract_versions','GET','/api/agency/contracts/:id/versions','contracts.view',{listKey:'versions'});
add('issue_contract_version','POST','/api/agency/contracts/:id/versions','contracts.issue',{dataSchema:object({expected_revision:integer(),reviewed:{type:'boolean',const:true}},['expected_revision','reviewed']),description:'Emite una versión inmutable sólo después de revisión humana explícita y campos completos. Handler exige también contracts.manage. No aplica firma digital.'});
add('assist_contract','POST','/api/agency/contracts/:id/assist','contracts.manage',{description:'Solicita revisión estructural al proveedor IA configurado; no envía contenido ni emite ni firma. Demo y proveedor no habilitado son rechazados por el handler.'});

const inventoryProps={name:str(160,2),category_id:id,category:str(80),serial_number:str(160),custodian_user_id:nullable(id),ownership_kind:choice('unspecified','company','person','external'),owner_user_id:nullable(id),external_owner_name:nullable(str(160)),value:money,currency,status:choice('available','in_use','maintenance','retired'),acquired_on:nullable(date),notes:str(),storage_location_id:nullable(id),storage_location_name:str(100),storage_shelf:str(100),storage_row:str(80),inventory_code:str(60),photo_url:nullable(link),purchase_value:nullable(money),purchase_date:nullable(date),depreciation_method:choice('none','linear'),useful_life_months:nullable(integer(1,600)),residual_value:money};
crud('inventory','inventory','/api/agency/inventory','inventory.manage',inventoryProps,['name'],{readCap:'inventory.view',listKey:'records'});
archive('inventory','inventory','inventory.manage');
add('get_inventory_context','GET','/api/agency/inventory-context','inventory.view');
add('verify_inventory','POST','/api/agency/inventory/:id/verify','inventory.manage',{dataSchema:object({result:choice('confirmed','difference','missing'),differences:str(),note:str(),counted_quantity:integer(0,1),adjustment:object({status:choice('available','maintenance','retired'),storage_shelf:str(100),storage_row:str(80)})},['result']),description:'Registra verificación declarada por el usuario. No acredita haber inspeccionado físicamente el equipo desde MCP.'});
const location=object({location_id:nullable(id),storage_shelf:str(100),storage_row:str(80)});
const ownership=object({kind:inventoryProps.ownership_kind,owner_user_id:nullable(id),external_owner_name:nullable(str(160))},['kind']);
add('batch_update_inventory','POST','/api/agency/inventory/batch','inventory.manage',{dataSchema:object({ids:ids(50,1),change:object({verify:bool,location,ownership})},['ids','change'])});
crud('inventory_categories','inventory_category','/api/agency/inventory-categories','inventory.manage',{name:str(80,2),icon:nullable(str(60)),active:bool},['name'],{readCap:'inventory.view',detail:false,listKey:'categories'});
crud('inventory_locations','inventory_location','/api/agency/inventory-locations','inventory.manage',{name:str(100,2),responsible_user_id:nullable(id),active:bool},['name'],{readCap:'inventory.view',detail:false,listKey:'locations'});
add('reorder_inventory_locations','PATCH','/api/agency/inventory-locations/order','inventory.manage',{dataSchema:object({ids:ids(200,1)},['ids'])});
crud('inventory_maintenance','inventory_maintenance','/api/agency/inventory-maintenance','inventory.manage',{inventory_id:id,maintenance_date:date,kind:str(80,2),description:str(),cost:money,currency,responsible_user_id:nullable(id)},['inventory_id','maintenance_date','kind'],{readCap:'inventory.view',detail:false,listKey:'maintenance',readOptions:{query:{inventory_id:id}}});
add('void_inventory_maintenance','DELETE','/api/agency/inventory-maintenance/:id','inventory.manage',{description:'Anula mantenimiento conservando registro auditado; no purga ni mueve dinero.'});
const reservation={title:str(160,2),project_id:id,starts_at:timestamp,ends_at:timestamp,inventory_ids:ids(50,1),responsible_user_ids:ids(30,1),return_user_id:id,notes:str(),expected_version:integer()};
crud('inventory_reservations','inventory_reservation','/api/agency/inventory-reservations','inventory.book',reservation,['title','project_id','starts_at','ends_at','inventory_ids','responsible_user_ids','return_user_id'],{readCap:'inventory.view',updateRequired:['title','project_id','starts_at','ends_at','inventory_ids','responsible_user_ids','return_user_id','expected_version'],listKey:'reservations',readOptions:{query:{from:timestamp,to:timestamp}}});
add('checkout_inventory_reservation','POST','/api/agency/inventory-reservations/:id/checkout','inventory.book',{dataSchema:object({expected_version:integer(),custodian_user_id:id,note:str()},['expected_version','custodian_user_id'])});
add('return_inventory_reservation','POST','/api/agency/inventory-reservations/:id/return','inventory.book',{dataSchema:object({expected_version:integer(),note:str(),locations:array(object({inventory_id:id,storage_location_id:nullable(id),storage_location_name:str(100),storage_shelf:str(100),storage_row:str(80),status:choice('available','maintenance')},['inventory_id','status']),50,1)},['expected_version','locations'])});
add('cancel_inventory_reservation','POST','/api/agency/inventory-reservations/:id/cancel','inventory.book',{dataSchema:object({expected_version:integer()},['expected_version'])});
add('get_studio_context','GET','/api/agency/studio-context','inventory.view');
crud('studio_spaces','studio_space','/api/agency/studio-spaces','studio.manage',{name:str(120,2),scenario:str(120),notes:str(),active:bool},['name'],{readCap:'inventory.view',detail:false,listKey:'spaces'});
const studio={title:str(160,2),space_id:id,project_id:nullable(id),production_type:choice('video','podcast','ads','fotografia','streaming','otro'),starts_at:timestamp,ends_at:timestamp,responsible_user_ids:ids(30,1),notes:str(),expected_version:integer()};
const studioRequired=['title','space_id','production_type','starts_at','ends_at','responsible_user_ids'];
crud('studio_reservations','studio_reservation','/api/agency/studio-reservations','studio.manage',studio,studioRequired,{readCap:'inventory.view',updateRequired:[...studioRequired,'expected_version'],listKey:'reservations',readOptions:{query:{from:timestamp,to:timestamp}}});
add('cancel_studio_reservation','POST','/api/agency/studio-reservations/:id/cancel','studio.manage',{dataSchema:object({expected_version:integer()},['expected_version'])});
add('batch_cancel_studio_reservations','POST','/api/agency/studio-reservations/batch','studio.manage',{dataSchema:object({action:{type:'string',const:'cancel'},ids:ids(50,1)},['action','ids'])});

// An exclusion is a documented limitation, never a claim that MCP implements it.
export const operationsExclusions=[
 {method:'DELETE',path:'/api/agency/inventory-locations/:id',reason:'Permanent catalog deletion excluded; update_inventory_location active=false retains history and provides the recoverable business operation.'},
 {method:'DELETE',path:'/api/agency/pipeline-stages/:id',reason:'Deletion can physically remove unused stages; update_pipeline_stage active=false is exposed instead with canonical last-open-stage guard.'},
 {method:'POST',path:'/p/:token/respond',reason:'External customer acceptance must use the customer public session/link; agency MCP must not impersonate the counterparty.'},
 {method:'GET',path:'/p/:token',reason:'Public customer token routes are not tenant agency operations; get_budget returns the authenticated document.'},
 {method:'GET',path:'/p/:token/pdf',reason:'Use authenticated budget PDF metadata operation; no bearer public token or arbitrary URL input.'},
 {method:'PATCH',path:'/api/agency/productivity/profile',reason:'Self identity/profile owned by platform MCP module; not an operations duplicate.'},
 {method:'GET',path:'/api/agency/productivity/profile',reason:'Self identity/profile owned by platform MCP module.'},
 {method:'GET',path:'/api/agency/productivity/people',reason:'Canonical assignable people directory exposed through /api/agency/assignees; no duplicate unfiltered contact directory.'},
 {method:'POST',path:'/api/agency/inventory-reservations/:id/check-out',reason:'Legacy alias; checkout_inventory_reservation exposes canonical /checkout exactly once.'},
 {method:'POST',path:'/api/agency/inventory-reservations/:id/check-in',reason:'Legacy alias; return_inventory_reservation exposes canonical /return exactly once.'},
 {method:'GET',path:'/api/agency/productivity/clients/:id',reason:'Combined legacy 100-row report overlaps canonical client reporting and project/work-order/financial tools; does not have independent edit actions.'},
 {method:'PATCH',path:'/api/agency/productivity/templates/:id',reason:'No canonical API for editing production templates exists; create and generate supported. Do not invent a route or direct SQL.'},
 {method:'POST',path:'/api/agency/contracts/:id/sign',reason:'No bilateral certified digital signature API exists; issue_contract_version emits reviewed document only.'},
 {method:'POST',path:'/api/agency/inventory/:id/print',reason:'Physical printer dispatch is browser/device-dependent and no server print route exists; inventory detail supplies code/label data.'},
];

export const operationsRouteMatrix=()=>[
 ...operationsDefinitions.map(({name,method,path,cap,scope,description})=>({method,path,tool:name,cap,scope,description})),
 ...operationsExclusions.map(entry=>({...entry,tool:null})),
];

// Public core interface. Legacy names are extended in place; no duplicate tool
// registration and no capability/scope override can relax an existing grant.
const legacyNames=new Set([
 'list_projects','get_project','create_project','update_project',
 'list_work_orders','get_work_order','create_work_order','update_work_order',
 'list_tasks','get_task','create_task','update_task',
 'list_budgets','get_budget','create_budget','update_budget',
 'list_contracts','get_contract','create_contract','update_contract',
 'list_inventory','create_inventory','update_inventory',
].map(name=>'scale_'+name));
add('get_budget_pdf_metadata','GET','/api/agency/budgets/:id/pdf','budgets.manage',{metadata:'pdf',description:'Verifica acceso al presupuesto y devuelve URL fija de descarga autenticada. No devuelve base64 ni un enlace público ni ejecuta URLs elegidas por el modelo.'});
add('get_contract_pdf_metadata','GET','/api/agency/contracts/:id/versions/:version/pdf','contracts.view',{metadata:'pdf',description:'Verifica contrato y versión emitida visible para este actor, y devuelve URL fija de descarga con sesión Scale. No aplica firma digital ni expone bytes/token público.'});
add('get_inventory_photo_metadata','GET','/api/agency/inventory/:id/photo','inventory.view',{metadata:'image',description:'Verifica la ficha de inventario y devuelve sólo URL fija del recurso autenticado. No descarga URLs externas ni devuelve imágenes base64.'});

function publicDescriptor(d){
 const properties={...d.params,...d.query};
 const required=[...Object.keys(d.params),...(d.requiredQuery||[])];
 if(d.list){properties.limit={type:'integer',minimum:1,maximum:50,...(d.pageLimits?{enum:d.pageLimits}:{}) ,default:d.defaultLimit||20};properties.offset=integer(0,10000);}
 if(d.scope===write){properties.confirm={type:'boolean',const:true};properties.data=d.dataSchema;required.push('confirm','data');}
 const inputSchema=object(properties,required);
 const resolve=args=>{
  const path=d.path.replace(/:([A-Za-z][A-Za-z0-9_]*)/g,(_,key)=>encodeURIComponent(String(args[key])));
  const query={};for(const key of Object.keys(d.query||{}))if(args[key]!==undefined)query[key]=args[key];
  if(d.list){
   const prefix=d.listMode==='memory'?'_mcp_':'';
   query[prefix+'limit']=args.limit??d.defaultLimit??20;query[prefix+'offset']=args.offset??0;
  }
  return {path,query};
 };
 return {...d,inputSchema,resolve};
}
const publicDefinitions=operationsDefinitions.map(publicDescriptor);
export const mcpOperationsTools=publicDefinitions.filter(d=>!legacyNames.has(d.name));
export const mcpOperationsOverrides=publicDefinitions.filter(d=>legacyNames.has(d.name)).map(({name,inputSchema,resolve,description})=>({name,inputSchema,resolve,description}));

const matches=(template,path)=>new RegExp('^'+template.replace(/:[A-Za-z][A-Za-z0-9_]*/g,'[1-9][0-9]{0,18}')+'$').test(path);
// Presentation adapter only: authorization, tenancy, record locks, audit and all
// mutations are delegated to the canonical handlers. Memory paging is needed
// for older directory handlers that do not implement offset; it never silently
// presents the same first page for later offsets. PDF/image results deliberately
// contain a protected resource URL rather than arbitrary binary payloads.
async function boundedOperations(ctx){
 const d=operationsDefinitions.find(d=>d.method===ctx.req.method&&matches(d.path,ctx.url.pathname));
 if(!d)return false;
 const original=ctx.url,requested=ctx.url.pathname;
 const url=new URL(original);
 if(d.metadata){
  if(d.metadata==='image')url.pathname=requested.replace(/\/photo$/,'');
  else if(requested.includes('/versions/'))url.pathname=requested.replace(/\/[1-9][0-9]*\/pdf$/,'');
  else url.pathname=requested.replace(/\/pdf$/,'');
 }
 // Parameters are trusted resolver-generated values, rechecked here so direct
 // handler tests/dispatch cannot turn pagination into unbounded output.
 const limit=Number(url.searchParams.get('_mcp_limit')??20),offset=Number(url.searchParams.get('_mcp_offset')??0);
 if(d.list&&d.listMode==='memory'&&(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000))return ctx.send(ctx.res,400,{error:'Paginación MCP inválida'}),true;
 url.searchParams.delete('_mcp_limit');url.searchParams.delete('_mcp_offset');
 const send=(res,status,result,...headers)=>{
  if(status<400&&d.metadata){
   if(d.metadata==='pdf'&&requested.includes('/versions/')){
    const version=requested.match(/\/versions\/([1-9][0-9]*)\/pdf$/)?.[1];
    if(!result.versions?.some(row=>String(row.version)===version))return ctx.send(res,404,{error:'Versión emitida no encontrada'});
   }
   if(d.metadata==='image'&&!result.record?.photo_url)return ctx.send(res,404,{error:'Este equipo no tiene foto'});
   return ctx.send(res,status,{resource:{downloadUrl:'https://api.scaleparaguay.com'+requested,mediaType:d.metadata==='pdf'?'application/pdf':'image/*',requiresBrowserSession:true,authentication:'Sesión del navegador Scale. El token MCP no es una credencial REST general.'}});
  }
  if(status<400&&d.list&&d.listMode==='memory'&&Array.isArray(result?.[d.listKey])){
   const all=result[d.listKey];result={...result,[d.listKey]:all.slice(offset,offset+limit),mcpPage:{limit,offset,total:all.length,hasMore:all.length>offset+limit}};
  }
  return ctx.send(res,status,result,...headers);
 };
 for(const handler of canonicalOperationsHandlers)if(await handler({...ctx,url,send}))return true;
 return false;
}
export const mcpOperationsHandlers=[boundedOperations];
// Compatibility aliases for catalog/matrix tooling; integration uses mcp*.
export const operationsHandlers=mcpOperationsHandlers;
