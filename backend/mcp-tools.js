import crypto from 'node:crypto';
import {AjvJsonSchemaValidator} from '@modelcontextprotocol/sdk/validation/ajv-provider.js';
import {mcpFinanceTools,mcpFinanceHandlers,mcpFinanceOverrides} from './mcp-finance-tools.js';
import {mcpOperationsTools,mcpOperationsHandlers,mcpOperationsOverrides} from './mcp-operations-tools.js';
import {mcpWorkspaceTools,mcpWorkspaceHandlers} from './mcp-workspace-tools.js';
import {mcpClientIntakeTools,mcpClientIntakeHandlers} from './mcp-client-intake-tools.js';
import {roleCan} from './permissions.js';
import {mcpLiveActor} from './mcp-oauth.js';
import {agencyCore} from './agency-core.js';
import {suite} from './agency-suite.js';
import {operations} from './operations.js';
import {employeeTasks} from './employee-tasks.js';
import {reports} from './reports.js';
import {economicHistory} from './economic-history.js';
import {contracts} from './contracts.js';
import {financeTreasury} from './finance-treasury.js';
import {financeControls} from './finance-controls.js';
import {inventoryReservations} from './inventory-reservations.js';
import {maintenanceGate} from './platform-maintenance.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
const id=value=>{if(!/^[1-9]\d{0,18}$/.test(String(value||'')))fail('Identificador inválido');return String(value);};
const read='scale:read',write='scale:write';
const definitions=[];
let activeTools=0;const activeConnections=new Set();
function entity(name,path,{readCapability=null,createCapability,editCapability=createCapability,detail=true}={}){
 definitions.push({name:'scale_list_'+name,method:'GET',path,cap:readCapability,scope:read,list:true});
 if(detail)definitions.push({name:'scale_get_'+name.replace(/s$/,''),method:'GET',path,cap:readCapability,scope:read,key:true});
 if(createCapability)definitions.push({name:'scale_create_'+name.replace(/s$/,''),method:'POST',path,cap:createCapability,scope:write});
 if(editCapability)definitions.push({name:'scale_update_'+name.replace(/s$/,''),method:'PATCH',path,cap:editCapability,scope:write,key:true});
}
entity('clients','/api/agency/clients',{createCapability:'clients.manage'});
entity('plans','/api/agency/plans',{readCapability:'budgets.manage',createCapability:'budgets.manage',detail:false});
entity('projects','/api/agency/projects',{createCapability:'projects.manage',editCapability:'projects.edit'});
entity('work_orders','/api/agency/work-orders',{createCapability:'work-orders.edit',editCapability:'work-orders.edit'});
entity('tasks','/api/agency/productivity/internal-tasks',{readCapability:'tasks.view',createCapability:'tasks.edit'});
entity('budgets','/api/agency/budgets',{readCapability:'budgets.manage',createCapability:'budgets.manage'});
entity('contracts','/api/agency/contracts',{readCapability:'contracts.view',createCapability:'contracts.manage'});
entity('planned_expenses','/api/agency/planned-expenses',{readCapability:'finance.view',createCapability:'expenses.manage',detail:false});
definitions.push({name:'scale_get_client_monthly_income',method:'GET',path:'/api/agency/clients',suffix:'/monthly-income',scope:read,cap:'billing.view',key:true,month:true,monthlyIncome:true},{name:'scale_add_client_monthly_income',method:'POST',path:'/api/agency/clients',suffix:'/monthly-income',scope:write,cap:['commercial-terms.manage','expenses.manage'],key:true,monthlyIncome:true},{name:'scale_update_client_monthly_income',method:'PATCH',path:'/api/agency/clients',suffix:'/monthly-income',scope:write,cap:['commercial-terms.manage','expenses.manage'],key:true,entry:true,monthlyIncome:true});
definitions.push({name:'scale_list_receipts',method:'GET',path:'/api/agency/finance/receipts',scope:read,cap:'payments.manage',list:true},{name:'scale_receive_payment',method:'POST',path:'/api/agency/payments',scope:write,cap:'payments.manage',financial:true});
definitions.push({name:'scale_get_client_reporting',method:'GET',path:'/api/agency/clients',suffix:'/reporting',scope:read,cap:'billing.view',key:true},{name:'scale_get_client_plan_history',method:'GET',path:'/api/agency/clients',suffix:'/plan-history',scope:read,cap:'billing.view',key:true},{name:'scale_update_client_commercial_terms',method:'PATCH',path:'/api/agency/clients',suffix:'/commercial-terms',scope:write,cap:'commercial-terms.manage',key:true,commercial:true});
// Inventory canonical handler uses its own resource route; no financial balance SQL is exposed.
entity('inventory','/api/agency/inventory',{readCapability:'inventory.view',createCapability:'inventory.manage',detail:false});
// Domain registries contain only fixed canonical routes and typed arguments.
for(const patch of [...mcpFinanceOverrides,...mcpOperationsOverrides]){
 const target=definitions.find(definition=>definition.name===patch.name);
 if(!target)throw Error('Unknown MCP override: '+patch.name);
 for(const field of Object.keys(patch))if(!['name','inputSchema','resolve','description'].includes(field))throw Error('Unsafe MCP override field: '+field);
 Object.assign(target,patch,{handlerGroup:mcpFinanceOverrides.includes(patch)?'finance':'operations'});
}
for(const definition of [...mcpFinanceTools,...mcpOperationsTools,...mcpWorkspaceTools,...mcpClientIntakeTools]){
 if(definitions.some(existing=>existing.name===definition.name))throw Error('Duplicate MCP tool: '+definition.name);
 definitions.push({...definition,handlerGroup:mcpFinanceTools.includes(definition)?'finance':mcpOperationsTools.includes(definition)?'operations':mcpClientIntakeTools.includes(definition)?'clients':'workspace'});
}
for(const definition of definitions)if(definition.scope===write&&['scale_create_planned_expense','scale_update_planned_expense'].includes(definition.name))definition.financial=true;
const schemaProvider=new AjvJsonSchemaValidator(),schemaValidators=new Map();
function validateArguments(schema,args){const key=JSON.stringify(schema);let validate=schemaValidators.get(key);if(!validate){validate=schemaProvider.getValidator(schema);schemaValidators.set(key,validate);}if(!validate(args).valid)fail('Argumentos inválidos: revisá los campos y tipos de la herramienta');}
const allowedFor=(actor,d)=>permitted(actor,d.cap)&&(!d.roles||d.roles.includes(actor.role))&&(!d.allCaps||d.allCaps.every(cap=>roleCan(actor,cap)));
const labels={clients:'clientes',plans:'planes',projects:'proyectos',work_orders:'piezas',tasks:'tareas',budgets:'presupuestos',contracts:'contratos',planned_expenses:'gastos planificados',inventory:'inventario'};
const permitted=(actor,cap)=>!cap||(Array.isArray(cap)?cap.some(c=>roleCan(actor,c)):roleCan(actor,cap));
const textField={type:'string',maxLength:2000},identifier={type:'string',pattern:'^[1-9][0-9]{0,18}$'},currency={type:'string',enum:['PYG','USD','EUR','BRL','ARS','MXN']},civilDate={type:'string',pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'};
function mcpDataSchema(d){
 let properties={},required=[];
 if(d.path==='/api/agency/clients'&&!d.suffix){properties={name:{type:'string',minLength:2,maxLength:120},email:{type:'string'},phone:{type:'string'},tax_id:{type:'string'},legal_name:{type:'string'},notes:textField,address:textField,city:textField,department:textField,party_type:{enum:['person','company','']},document_type:{enum:['ci','ruc','passport','other','']},document_number:{type:'string'},legal_representative_name:{type:'string'},legal_representative_document:{type:'string'},legal_representative_role:{type:'string'},legal_representative_same_as_client:{type:'boolean'},lifecycle_status:{enum:['active','inactive']}};required=d.method==='POST'?['name']:[];}
 if(d.path==='/api/agency/plans'){properties={name:{type:'string',minLength:2,maxLength:160},currency,notes:textField,items:{type:'array',maxItems:100,items:{type:'object',properties:{description:{type:'string'},quantity:{type:'number',minimum:0},unitPrice:{type:'number',minimum:0}},required:['description'],additionalProperties:true}},active:{type:'boolean'}};required=d.method==='POST'?['name','items']:[];}
 if(d.path==='/api/agency/projects'){properties=d.method==='POST'?{name:{type:'string',minLength:2,maxLength:160},clientId:identifier,driveUrl:{type:['string','null']},urgency:{type:['string','null']}}:{name:{type:'string'},approval_levels:{type:'integer',enum:[1,2,3]},status:{enum:['active','paused','completed','cancelled']},start_date:civilDate,due_date:civilDate,drive_url:{type:['string','null']},active:{type:'boolean'}};required=d.method==='POST'?['name','clientId']:[];}
 if(d.monthlyIncome){properties={month:{type:'string',pattern:'^[0-9]{4}-(0[1-9]|1[0-2])$'},kind:{enum:['base','extra']},label:{type:'string',maxLength:160},amount:{anyOf:[{type:'integer',minimum:0,maximum:9007199254740991},{type:'string',pattern:'^(0|[1-9][0-9]*)$'}]},currency,requestId:{type:'string',format:'uuid'},expectedRevision:{type:'string',pattern:'^(0|[1-9][0-9]*)$'},reason:{type:'string',minLength:5,maxLength:1000}};required=['month','kind','label','amount','currency','requestId','expectedRevision','reason'];}
 if(d.commercial){properties={planId:identifier,recurringAmount:{type:'string',pattern:'^(0|[1-9][0-9]*)$'},currency,startsOn:civilDate,endsOn:{anyOf:[civilDate,{type:'null'}]},invoiceRequired:{type:'boolean'},commissionRecipientId:{anyOf:[identifier,{type:'null'}]},commissionMode:{enum:['none','fixed','percentage']},commissionValue:{anyOf:[{type:'string',pattern:'^(0|[1-9][0-9]*)$'},{type:'null'}]},cadence:{enum:['monthly','interval','once']},intervalMonths:{type:'integer',minimum:1,maximum:24},effectiveFrom:civilDate,reason:{type:'string',minLength:5,maxLength:1000},requestId:{type:'string',format:'uuid'},expectedRevision:{type:'string',pattern:'^(0|[1-9][0-9]*)$'}};required=['planId','recurringAmount','currency','startsOn','endsOn','invoiceRequired','commissionRecipientId','commissionMode','commissionValue','cadence','intervalMonths','effectiveFrom','reason','requestId','expectedRevision'];}
 return {properties,required,additionalProperties:true};
}
function toolShape(d,actor){
 if(d.inputSchema){const inputSchema=d.inputSchemaForActor?d.inputSchemaForActor(actor):d.inputSchema;return {name:d.name,description:(d.description||d.name)+ (d.financial?' Requiere inicio de sesión real y consentimiento OAuth de los últimos 15 minutos.':''),inputSchema,annotations:{readOnlyHint:d.scope===read,destructiveHint:d.scope===write,idempotentHint:d.scope===read,openWorldHint:false}};}
 const properties={};if(d.key)properties.id={type:'string',pattern:'^[1-9][0-9]{0,18}$',description:d.suffix?'ID del cliente':'ID del registro'};if(d.entry)properties.entryId={type:'string',pattern:'^[1-9][0-9]{0,18}$'};
 if(d.list){properties.limit={type:'integer',minimum:1,maximum:50,default:20};properties.offset={type:'integer',minimum:0,maximum:10000,default:0};}
 if(d.month||d.path.endsWith('/planned-expenses')&&d.method==='GET')properties.month={type:'string',pattern:'^[0-9]{4}-[0-9]{2}$'};
 if(d.scope===write){properties.confirm={type:'boolean',const:true,description:'Confirmación explícita del cambio solicitado por el usuario. No sustituye permisos ni consentimiento OAuth.'};properties.data={type:'object',description:'Cuerpo del editor REST canónico. Usa sus campos documentados; validación, revisiones e idempotencia se conservan.',additionalProperties:true};}
 if(d.scope===write){const schema=mcpDataSchema(d);properties.data={...properties.data,...schema};}
 const required=[...(d.key?['id']:[]),...(d.entry?['entryId']:[]),...(d.month||d.path.endsWith('/planned-expenses')&&d.method==='GET'?['month']:[]),...(d.scope===write?['confirm','data']:[])];
 return {name:d.name,description:`${d.method==='GET'?'Consultar':d.method==='POST'?'Crear':'Editar'} ${Object.entries(labels).find(([key])=>d.name.includes(key))?.[1]||d.name.replace('scale_','')}. Sólo en la empresa autorizada y con permisos actuales. ${d.financial?'Operación protegida: requiere inicio de sesión real y consentimiento OAuth otorgados en los últimos 15 minutos, además de confirmación explícita.':'Las acciones disponibles siguen las reglas del módulo canónico.'} ${d.scope===write?'Los campos y errores son los del formulario canónico.':'Las listas están limitadas y pueden requerir paginación.'}`,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:d.scope===read,destructiveHint:d.scope===write,idempotentHint:d.scope===read,openWorldHint:false}};
}
export function availableMcpTools(context){return definitions.filter(d=>context.scopes.includes(d.scope)&&allowedFor(context.actor,d)).map(d=>toolShape(d,context.actor));}
const hidden=key=>/password|secret|(^|_)token($|_)|cookie|private.?key|api.?key/i.test(key);
function cleanOutput(value,depth=0,limitations=[],path='$'){
 if(depth>14){limitations.push({path,reason:'depth_limit'});return '[Contenido anidado omitido]';}
 if(Array.isArray(value)){if(value.length>100)limitations.push({path,reason:'array_limit',returned:100,total:value.length});return value.slice(0,100).map((v,index)=>cleanOutput(v,depth+1,limitations,path+'['+index+']'));}
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!hidden(k)).map(([k,v])=>[k,cleanOutput(v,depth+1,limitations,path+'.'+k)]));
 if(typeof value==='string'&&value.length>12000){limitations.push({path,reason:'text_limit'});return value.slice(0,12000)+'… [Texto truncado]';}return value;
}
function validateData(data,depth=0,allowedFields=[]){if(depth>12)fail('Cuerpo demasiado anidado');if(Array.isArray(data)){if(data.length>500)fail('Demasiados elementos');for(const item of data)validateData(item,depth+1,allowedFields);return;}if(data&&typeof data==='object'){for(const [key,value] of Object.entries(data)){if(['__proto__','constructor','prototype','organization_id','organizationId','role','capabilities','headers','sql','session','url','method'].includes(key)&&!(depth===0&&allowedFields.includes(key)))fail('Campo de contexto no permitido');validateData(value,depth+1,allowedFields);}}}
// Canonical handlers use their own transactions while the OAuth actor lease
// stays locked. Bound cross-actor lock waits so concurrent access edits retry
// rather than keeping both requests and pool clients waiting indefinitely.
function canonicalDatabase(db){
 return {options:db.options,query:(...args)=>db.query(...args),async connect(){
  const client=await db.connect();return {release:(...args)=>client.release(...args),async query(...args){
   try{const result=await client.query(...args);if(typeof args[0]==='string'&&/^\s*begin\s*;?\s*$/i.test(args[0]))await client.query("set local lock_timeout = '3s'");return result;}
   catch(error){if(error.code==='55P03')throw Object.assign(Error('Otro usuario está actualizando estos datos. Volvé a consultar y reintentá.'),{status:409});throw error;}
  }};
 }};
}
async function executeMcpTool({db,context,name,args={},subscription,request,handlers,services={}}){
 const d=definitions.find(d=>d.name===name);if(!d)fail('Herramienta desconocida',404);
 const shape=toolShape(d,context.actor);
 if(d.inputSchema)validateArguments(shape.inputSchema,args);if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(shape.inputSchema.properties,k))||shape.inputSchema.required.some(k=>!Object.hasOwn(args,k)))fail('Argumentos de herramienta inválidos');
 if(d.scope===write&&(args.confirm!==true||!args.data||typeof args.data!=='object'||Array.isArray(args.data)))fail('Confirmá el cambio y completá sus datos');
 if(d.commercial&&mcpDataSchema(d).required.some(key=>!Object.hasOwn(args.data,key)))fail('Completá las condiciones, revisión, motivo e identificador de operación');
 if(d.commercial&&!/^[1-9][0-9]{0,18}$/.test(String(args.data.planId||'')))fail('Creá primero un plan personalizado con scale_create_plan y luego asigná su identificador positivo en planId');
 if(args.data){validateData(args.data,0,[...(d.allowedDataFields||[]),...(d.inputSchema?.properties?.data?.properties?.url?['url']:[])]);if(Buffer.byteLength(JSON.stringify(args.data))>60000)fail('Cuerpo demasiado grande',413);}
 const maxPool=Number(db.options?.max||10),concurrency=Math.min(2,Math.floor(maxPool/2));if(concurrency<1)return {content:[{type:'text',text:JSON.stringify({error:'MCP requiere un pool de al menos dos conexiones',status:503})}],isError:true};
 if(activeTools>=concurrency||activeConnections.has(context.connection.id))return {content:[{type:'text',text:JSON.stringify({error:'La conexión está ocupada; reintentá en un segundo',status:429,retryAfter:1})}],isError:true};
 activeTools++;activeConnections.add(context.connection.id);let lease,status=500;
 try{
  lease=await db.connect();
  await lease.query('begin');const connection=(await lease.query('select * from agency_mcp_connections where id=$1 and revoked_at is null for share',[context.connection.id])).rows[0];if(!connection)fail('La conexión fue revocada',401);
  const actor=await mcpLiveActor(lease,connection,{subscription,lock:true});if(!actor)fail('Tu acceso a la empresa dejó de estar activo',403);
  if(!connection.scopes.includes(d.scope)||!allowedFor(actor,d))fail('La conexión o tu rol no permite esta operación',403);
  if(d.inputSchemaForActor)validateArguments(toolShape(d,actor).inputSchema,args);
  if(d.financial&&(!connection.reauthenticated_at||Date.now()-new Date(connection.reauthenticated_at).getTime()>15*60000||Date.now()-new Date(connection.created_at).getTime()>15*60000))fail('Volvé a iniciar sesión y autorizar la conexión para realizar esta operación protegida',403);
  let path=d.path+(d.key?'/'+id(args.id):'')+(d.suffix||'')+(d.entry?'/'+id(args.entryId):'');
  const resolved=d.resolve?d.resolve(args):null;
  if(resolved){if(!resolved.path?.startsWith('/api/agency/')||resolved.path.includes('?')||resolved.path.includes('#')||resolved.path.includes('\\')||resolved.path.includes('..'))fail('Ruta de herramienta inválida');path=resolved.path;}
  const url=new URL(path,'https://api.scaleparaguay.com');
  if(resolved?.query)for(const [key,value] of Object.entries(resolved.query)){if(value!==undefined&&value!==null)url.searchParams.set(key,String(value));}
  if(d.list&&!d.resolve){const limit=args.limit??20,offset=args.offset??0;if(!Number.isInteger(limit)||limit<1||limit>50||!Number.isInteger(offset)||offset<0||offset>10000)fail('Paginación inválida');url.searchParams.set('limit',String(limit));url.searchParams.set('offset',String(offset));}
  if(args.month){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(args.month))fail('Mes inválido');url.searchParams.set('month',args.month);}
  const req={method:d.method,headers:{},socket:{remoteAddress:request?.socket?.remoteAddress||'mcp'}};let result;
  const send=(_,code,data)=>{status=code;result=data;return true;};
  const auditContext=(c,u,r)=>c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(u.id),r.socket.remoteAddress||'']);
  const auditedQuery=async(u,r,sql,params)=>{const c=await db.connect();try{await c.query('begin');await auditContext(c,u,r);const value=await c.query(sql,params);await c.query('commit');return value;}catch(e){await c.query('rollback');throw e;}finally{c.release();}};
  const ctx={...services,req,res:{},url,db:canonicalDatabase(db),session:async()=>actor,body:async()=>args.data||{},send,auditContext,auditedQuery,id:()=>crypto.randomBytes(32).toString('base64url'),sendInvitation:services.sendInvitation||asyncDeliveryUnavailable,sendAccessGranted:services.sendAccessGranted||asyncDeliveryUnavailable};
  if(await maintenanceGate(ctx)){if(status>=400)fail(result?.error||'La aplicación está en mantenimiento',status);}
  let routes=handlers||(d.handlerGroup==='operations'?mcpOperationsHandlers:d.handlerGroup==='finance'?mcpFinanceHandlers:d.handlerGroup==='workspace'?mcpWorkspaceHandlers:d.handlerGroup==='clients'?mcpClientIntakeHandlers:[economicHistory,employeeTasks,contracts,inventoryReservations,financeTreasury,financeControls,reports,suite,operations,agencyCore]);
  if(d.monthlyIncome){const {clientMonthlyIncome}=await import('./client-monthly-income.js');routes=[clientMonthlyIncome];}
  let handled=false;for(const handler of routes)if(await handler(ctx)){handled=true;break;}if(!handled)fail('El módulo todavía no está disponible en esta versión',503);
  if(status>=400)fail(result?.error||'La operación fue rechazada por el módulo',status);
  await lease.query('commit');await db.query('update agency_mcp_connections set last_used_at=now() where id=$1',[connection.id]);
  if(d.list&&!d.resolve&&Array.isArray(result?.contracts)){const all=result.contracts,limit=args.limit??20,offset=args.offset??0;result={...result,contracts:all.slice(offset,offset+limit),mcpPage:{limit,offset,hasMore:all.length>offset+limit}};}
  const limitations=[],output=cleanOutput(result,0,limitations);if(limitations.length&&output&&typeof output==='object'&&!Array.isArray(output))output._mcpOutput={complete:false,limitations,instruction:'Resultado parcial: consultá páginas adicionales o un registro individual antes de afirmar totales o cobertura completa.'};const serialized=JSON.stringify(output);if(Buffer.byteLength(serialized)>80000)return {content:[{type:'text',text:'La respuesta supera el límite. Consultá un registro o reducí la página.'}],isError:true};
  return {content:[{type:'text',text:serialized}],structuredContent:{result:output}};
 }catch(error){if(lease)await lease.query('rollback');status=error.status||500;return {content:[{type:'text',text:JSON.stringify({error:status<500?error.message:'No se pudo completar la operación',status})}],isError:true};}
 finally{lease?.release();activeTools--;activeConnections.delete(context.connection.id);await db.query('insert into agency_mcp_audit(organization_id,user_id,connection_id,action,tool_name,status) values($1,$2,$3,$4,$5,$6)',[context.connection.organization_id,context.connection.user_id,context.connection.id,d.scope===write?'tool.write':'tool.read',name,status]);}
}

export async function callMcpTool(options){
 try{return await executeMcpTool(options);}catch(error){return {content:[{type:'text',text:JSON.stringify({error:error.status?error.message:'No se pudo completar la operación',status:error.status||500})}],isError:true};}
}

async function asyncDeliveryUnavailable(){throw Object.assign(Error('El envío requiere el servicio de correo configurado de Scale'),{status:503});}
export function mcpToolCatalog(){return definitions.map(d=>({name:d.name,method:d.method,path:d.path,scope:d.scope,cap:d.cap??null,domain:d.domain||d.handlerGroup||(/finance|account|payment|receipt|salary|payout|expense|invoice|commission/.test(d.name)?'finance':/company|member|team|workspace|permission|notification|announcement/.test(d.name)?'workspace':'operations'),description:d.description||toolShape(d).description}));}
