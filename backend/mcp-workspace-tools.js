// Refs #330. Fixed business routes only; canonical handlers remain authoritative.
import {recordLifecycle} from './record-lifecycle.js';
import {CAPABILITIES,roleCan,roles} from './permissions.js';
import {clientPortal} from './client-portal.js';
import {contracts} from './contracts.js';
import {productivity} from './productivity.js';
import {agencyCore} from './agency-core.js';
import {suite} from './agency-suite.js';
import {operations} from './operations.js';
import {workspacePreferences} from './workspace-preferences.js';
import {notifications} from './notifications.js';
import {rolePermissions} from './permissions.js';
import {inviteLinks} from './invite-links.js';
import {agencyAnnouncements} from './platform-announcements.js';
const actorRoles=actor=>actor?.role==='owner'?[...roles]:actor?.role==='admin'?roles.filter(role=>role!=='owner'):actor?.role==='management'?roles.filter(role=>!['owner','admin','management'].includes(role)):[];
const assignableRoles=actor=>actorRoles(actor).filter(role=>CAPABILITIES.every(cap=>!roleCan({role},cap.id)||roleCan(actor,cap.id)));
const actorSchema=(schema,actor,{permissionRole=false}={})=>{const result=structuredClone(schema),data=result.properties.data?.properties;if(data?.role)data.role.enum=permissionRole?actorRoles(actor).filter(role=>role!=='owner'&&role!==actor.role):assignableRoles(actor);if(data?.expected_role)data.expected_role.enum=actorRoles(actor);if(data?.capability)data.capability.enum=CAPABILITIES.filter(cap=>roleCan(actor,cap.id)).map(cap=>cap.id);return result;};
const protectedAccess={roles:['owner','admin','management'],financial:true};
const read='scale:read',write='scale:write';
const string=(maxLength=160)=>({type:'string',maxLength});
const identifier={type:'string',pattern:'^[1-9][0-9]{0,18}$'};
const bool={type:'boolean'};
const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const confirm={type:'boolean',const:true,description:'Confirmación explícita de la operación solicitada.'};
function tool(name,method,path,cap=null,{properties={},required=[],data,description,resolve,...flags}={}){
 const writable=method!=='GET';
 return {name,method,path,cap,scope:writable?write:read,...flags,
  description:description||`${writable?'Actualizar':'Consultar'} ${name.replace(/^scale_/,'').replaceAll('_',' ')} en la empresa autorizada. Se conservan permisos y validaciones actuales.`,
  inputSchema:object({...properties,...(writable?{confirm,data:data||object({})}:{})},[...required,...(writable?['confirm','data']:[])]),
  resolve:resolve||(()=>({path}))};
}
const page={limit:{type:'integer',minimum:1,maximum:50},offset:{type:'integer',minimum:0,maximum:10000}};
const production=object({clientId:{type:'string',pattern:'^$|^[1-9][0-9]{0,18}$'},mine:bool,week:bool});
// Columns are a map in the canonical endpoint. Restrict both keys and values.
const columnNames={type:'array',maxItems:32,uniqueItems:true,items:{type:'string',pattern:'^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,63}$'}};
const columns={type:'object',maxProperties:100,propertyNames:{pattern:'^[a-z0-9:/_.-]{1,160}$'},additionalProperties:object({order:columnNames,hidden:columnNames},['order','hidden'])};
const settings=object({name:{type:'string',minLength:2,maxLength:160},legal_name:string(160),tax_id:string(60),address:string(400),phone:string(40),onboarding_completed:bool,default_currency:{type:'string',enum:['PYG','USD','EUR','BRL','ARS','MXN']},logo_url:string(2000)},[]);
const preferences=object({version:{type:'integer',const:1},startup:{type:'string',enum:['summary','production','my-day']},production,columns});
const notificationPreferences=object({email_enabled:bool,assignment:bool,comment:bool,due:bool});
const collaboratorProfile=object({full_name:{type:'string',minLength:2,maxLength:120},email:{type:['string','null'],maxLength:200},user_id:{anyOf:[identifier,{type:'null'}]},job_title:string(120),job_role_id:{anyOf:[identifier,{type:'null'}]},photo_url:{type:['string','null'],maxLength:2000},active:bool,started_on:{type:['string','null'],pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'},ended_on:{type:['string','null'],pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'},notes:string(2000),compensation_type:{type:'string',enum:['fixed','variable','hourly','per_project']},compensation_amount:{type:'number',minimum:0,maximum:999999999999},currency:{type:'string',enum:['PYG','USD','EUR','BRL','ARS','MXN']},monthly_salary_amount:{type:['integer','null'],minimum:1,maximum:999999999999},monthly_salary_currency:{type:['string','null'],enum:['PYG','USD','EUR','BRL','ARS','MXN',null]},payment_day:{type:['integer','null'],minimum:1,maximum:31},invoices_company:bool});
const salaryFields=['compensation_type','compensation_amount','currency','monthly_salary_amount','monthly_salary_currency','payment_day','invoices_company'];
export const mcpWorkspaceTools=[
 tool('scale_list_client_portal_access','GET','/api/agency/clients','portal-access.manage',{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/clients/${args.id}/client-portal-invites`})}),
 tool('scale_list_invitation_links','GET','/api/agency/invite-links','members.manage',{description:'Consultar metadatos de enlaces de invitación sin devolver URLs ni credenciales de acceso.'}),
 tool('scale_revoke_invitation_link','DELETE','/api/agency/invite-links','members.manage',{...protectedAccess,properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/invite-links/${args.id}`})}),
 tool('scale_invite_client_portal_user','POST','/api/agency/clients','portal-access.manage',{financial:true,properties:{id:identifier},required:['id'],data:object({email:{type:'string',format:'email',maxLength:200},expiresInDays:{type:'integer',minimum:1,maximum:30}},['email']),resolve:args=>({path:`/api/agency/clients/${args.id}/client-portal-invites`}),description:'Invitar por correo a un cliente al portal. Devuelve metadatos y el estado real de envío; nunca devuelve la credencial de acceso.'}),
 tool('scale_update_member_photo','PATCH','/api/agency/members','members.manage',{...protectedAccess,properties:{id:identifier},required:['id'],data:object({photo_url:string(2000)},['photo_url']),resolve:args=>({path:`/api/agency/members/${args.id}/photo`})}),
 tool('scale_list_collaborators','GET','/api/agency/collaborators',['members.manage','finance.view']),
 tool('scale_create_collaborator','POST','/api/agency/collaborators',['members.manage','finance.view'],{financial:true,data:{...collaboratorProfile,required:['full_name']},description:'Crear un perfil laboral. Si el actor está autorizado, el módulo canónico puede vincular o invitar acceso de lectura por correo; los permisos salariales se verifican por separado.'}),
 tool('scale_update_collaborator','PATCH','/api/agency/collaborators',['members.manage','finance.view'],{financial:true,properties:{id:identifier},required:['id'],data:collaboratorProfile,resolve:args=>({path:`/api/agency/collaborators/${args.id}`}),description:'Editar el perfil laboral con los permisos actuales. Gerencia no puede cambiar remuneraciones ni perfiles ligados a integrantes superiores. El módulo canónico conserva las reglas de vinculación de acceso.'}),
 tool('scale_invite_member','POST','/api/agency/members','members.manage',{...protectedAccess,allowedDataFields:['role','expected_role'],data:object({email:{type:'string',format:'email',maxLength:200},role:{type:'string',enum:roles}},['email','role'])}),
 tool('scale_update_member_access','PATCH','/api/agency/members','members.manage',{...protectedAccess,allowedDataFields:['role','expected_role'],properties:{id:identifier},required:['id'],data:object({role:{type:'string',enum:roles},active:bool,expected_role:{type:'string',enum:roles},expected_active:bool}),resolve:args=>({path:`/api/agency/members/${args.id}`})}),
 tool('scale_resend_member_invitation','POST','/api/agency/members','members.manage',{...protectedAccess,properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/members/${args.id}/resend`})}),
 tool('scale_remove_member_access','DELETE','/api/agency/members','members.manage',{...protectedAccess,properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/members/${args.id}`})}),
 tool('scale_decide_access_request','PATCH','/api/agency/access-requests','members.manage',{...protectedAccess,properties:{id:identifier},required:['id'],data:object({action:{type:'string',enum:['approve','reject']}},['action']),resolve:args=>({path:`/api/agency/access-requests/${args.id}`})}),
 tool('scale_update_role_permission','PATCH','/api/agency/permissions','permissions.manage',{...protectedAccess,allowedDataFields:['role','expected_role'],data:object({role:{type:'string',enum:roles.filter(role=>role!=='owner')},capability:{type:'string',enum:CAPABILITIES.map(cap=>cap.id)},allowed:{type:['boolean','null']}},['role','capability','allowed'])}),
 tool('scale_get_member_permissions','GET','/api/agency/members','permissions.manage',{roles:['owner','admin','management'],properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/members/${args.id}/permissions`})}),
 tool('scale_update_member_permission','PATCH','/api/agency/members','permissions.manage',{...protectedAccess,properties:{id:identifier},required:['id'],data:object({capability:{type:'string',enum:CAPABILITIES.map(cap=>cap.id)},allowed:{type:['boolean','null']}},['capability','allowed']),resolve:args=>({path:`/api/agency/members/${args.id}/permissions`})}),
 tool('scale_revoke_client_portal_invitation','POST','/api/agency/client-portal-invites','portal-access.manage',{financial:true,properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/client-portal-invites/${args.id}/revoke`})}),
 tool('scale_revoke_client_portal_grant','POST','/api/agency/clients','portal-access.manage',{financial:true,properties:{id:identifier,grantId:identifier},required:['id','grantId'],resolve:args=>({path:`/api/agency/clients/${args.id}/portal-access/grants/${args.grantId}/revoke`})}),
 tool('scale_get_my_profile','GET','/api/agency/productivity/profile'),
 tool('scale_get_company_legal_profile','GET','/api/agency/company-legal-profile','settings.manage'),
 tool('scale_update_company_legal_profile','PATCH','/api/agency/company-legal-profile','settings.manage',{data:object({expected_revision:{type:'integer',minimum:0},city:string(),department:string(),legal_representative_name:string(),legal_representative_document:string(60),legal_representative_role:string(),locality_id:{type:['string','null'],maxLength:160},locality_catalog_version:string(100)},['expected_revision'])}),
 tool('scale_get_summary','GET','/api/agency/summary'),
 tool('scale_get_company_settings','GET','/api/agency/settings','settings.manage'),
 tool('scale_update_company_settings','PATCH','/api/agency/settings','settings.manage',{data:settings}),
 tool('scale_list_team','GET','/api/agency/team',null,{description:'Consultar el equipo. El módulo canónico oculta salarios, contactos y accesos según los permisos actuales.'}),
 tool('scale_list_members','GET','/api/agency/members',['members.manage','permissions.manage']),
 tool('scale_list_job_titles','GET','/api/agency/job-roles','finance.view'),
 tool('scale_create_job_title','POST','/api/agency/job-roles','members.manage',{data:object({name:{type:'string',minLength:1,maxLength:120}},['name'])}),
 tool('scale_update_job_title','PATCH','/api/agency/job-roles','members.manage',{properties:{id:identifier},required:['id'],data:object({name:{type:'string',minLength:1,maxLength:120},active:bool},['name']),resolve:args=>({path:`/api/agency/job-roles/${args.id}`})}),
 tool('scale_get_workspace_preferences','GET','/api/agency/workspace-preferences'),
 tool('scale_update_workspace_preferences','PATCH','/api/agency/workspace-preferences',null,{data:preferences}),
 tool('scale_get_notification_preferences','GET','/api/agency/notifications/preferences'),
 tool('scale_update_notification_preferences','PATCH','/api/agency/notifications/preferences',null,{data:notificationPreferences}),
 tool('scale_list_notifications','GET','/api/agency/notifications',null,{properties:{status:{type:'string',enum:['all','unread','unresolved','resolved']},cursor:{type:'string',pattern:'^[0-9]{1,16}$'}},resolve:args=>({path:'/api/agency/notifications',query:{status:args.status??'all',cursor:args.cursor??'0'}})}),
 tool('scale_update_notification','PATCH','/api/agency/notifications',null,{properties:{id:identifier},required:['id'],data:object({resolved:bool}),resolve:args=>({path:`/api/agency/notifications/${args.id}`})}),
 tool('scale_mark_notifications_read','PATCH','/api/agency/notifications/read-all'),
 tool('scale_list_activity','GET','/api/agency/activity','activity.view',{properties:page,resolve:args=>({path:'/api/agency/activity',query:{limit:args.limit??20,offset:args.offset??0}})}),
 tool('scale_list_access_requests','GET','/api/agency/access-requests','members.manage'),
 tool('scale_get_permission_matrix','GET','/api/agency/permissions','permissions.manage',{roles:['owner','admin','management'],description:'Consultar permisos de roles inferiores autorizados; Gerencia no recibe valores de roles superiores ni capacidades protegidas.'}),
 tool('scale_get_active_announcement','GET','/api/agency/announcements/active'),
 tool('scale_dismiss_announcement','POST','/api/agency/announcements',null,{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/announcements/${args.id}/dismiss`})}),
];
for(const descriptor of mcpWorkspaceTools)if(descriptor.scope==='scale:write'&&['scale_invite_member','scale_update_member_access','scale_update_role_permission','scale_update_member_permission'].includes(descriptor.name))descriptor.inputSchemaForActor=actor=>actorSchema(descriptor.inputSchema,actor,{permissionRole:descriptor.name==='scale_update_role_permission'});

for(const descriptor of mcpWorkspaceTools)if(['scale_create_collaborator','scale_update_collaborator'].includes(descriptor.name))descriptor.inputSchemaForActor=actor=>{const schema=structuredClone(descriptor.inputSchema);if(!roleCan(actor,'salary.view'))for(const key of salaryFields)delete schema.properties.data.properties[key];return schema;};

// The scope header is a canonical stale-tab guard, never model-supplied context.
async function scopedWorkspacePreferences(ctx){
 if(ctx.url.pathname!=='/api/agency/workspace-preferences')return false;
 const actor=await ctx.session(ctx.req);
 const req={...ctx.req,headers:{...ctx.req.headers,'x-scale-preference-scope':`${actor?.id}:${actor?.organization_id}`}};
 return workspacePreferences({...ctx,req});
}
async function privateInvitationMetadata(ctx){
 if(ctx.url.pathname==='/api/agency/invite-links'&&ctx.req.method==='GET')return inviteLinks({...ctx,exposeInviteCredentials:false,send:(res,status,data)=>ctx.send(res,status,data?.links?{...data,links:data.links.map(({url,...link})=>link)}:data)});
 if(/^\/api\/agency\/clients\/\d+\/client-portal-invites$/.test(ctx.url.pathname)&&ctx.req.method==='POST'){
  if(typeof ctx.sendInvite!=='function')return ctx.send(ctx.res,503,{error:'El servicio de invitaciones del portal no está disponible.'});
  let emailSent=false;
  return clientPortal({...ctx,sendInvite:async(...args)=>{const sent=await ctx.sendInvite(...args);emailSent=sent===true;return sent;},send:(res,status,data)=>{const {url,...metadata}=data||{};return ctx.send(res,status,status<400?{...metadata,emailSent}:metadata);}});
 }
 return false;
}
async function protectedWorkspaceAccess(ctx){
 const member=ctx.url.pathname.match(/^\/api\/agency\/members\/(\d+)(?:\/(?:resend|permissions|photo))?$/);
 if(member&&ctx.req.method!=='GET'){const actor=await ctx.session(ctx.req);if(String(BigInt(member[1]))===String(actor.id))return ctx.send(ctx.res,403,{error:'No podés modificar tu propio acceso, permisos o identidad mediante esta conexión.'});}
 const collaborator=ctx.url.pathname.match(/^\/api\/agency\/collaborators(?:\/(\d+))?$/);
 if(collaborator&&ctx.req.method!=='GET'){
  const actor=await ctx.session(ctx.req),payload=await ctx.body(ctx.req);
  if(!roleCan(actor,'salary.view')&&salaryFields.some(key=>Object.hasOwn(payload,key)))return ctx.send(ctx.res,403,{error:'Tu rol no permite editar remuneraciones.'});
  if(Object.hasOwn(payload,'photo_url')){const linked=collaborator[1]?(await ctx.db.query('select user_id from agency_collaborators where organization_id=$1 and id=$2',[actor.organization_id,collaborator[1]])).rows[0]?.user_id:payload.user_id;if(String(linked)===String(actor.id)||String(payload.user_id)===String(actor.id))return ctx.send(ctx.res,403,{error:'Usá el editor humano para cambiar tu identidad personal.'});}
 }
 return false;
}
export const mcpWorkspaceHandlers=[protectedWorkspaceAccess,privateInvitationMetadata,scopedWorkspacePreferences,notifications,rolePermissions,inviteLinks,agencyAnnouncements,recordLifecycle,clientPortal,contracts,productivity,suite,operations,agencyCore];
