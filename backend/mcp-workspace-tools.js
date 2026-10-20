// Refs #330. Fixed business routes only; canonical handlers remain authoritative.
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
export const mcpWorkspaceTools=[
 tool('scale_list_client_portal_access','GET','/api/agency/clients','portal-access.manage',{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/clients/${args.id}/client-portal-invites`})}),
 tool('scale_get_my_profile','GET','/api/agency/productivity/profile'),
 tool('scale_get_company_legal_profile','GET','/api/agency/company-legal-profile','settings.manage'),
 tool('scale_update_company_legal_profile','PATCH','/api/agency/company-legal-profile','settings.manage',{data:object({expected_revision:{type:'integer',minimum:0},city:string(),department:string(),legal_representative_name:string(),legal_representative_document:string(60),legal_representative_role:string(),locality_id:{type:['string','null'],maxLength:160},locality_catalog_version:string(100)},['expected_revision'])}),
 tool('scale_get_summary','GET','/api/agency/summary'),
 tool('scale_get_company_settings','GET','/api/agency/settings','settings.manage'),
 tool('scale_update_company_settings','PATCH','/api/agency/settings','settings.manage',{data:settings}),
 tool('scale_list_team','GET','/api/agency/team',null,{description:'Consultar el equipo. El módulo canónico oculta salarios, contactos y accesos según los permisos actuales.'}),
 tool('scale_list_members','GET','/api/agency/members','members.manage'),
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
 tool('scale_get_permission_matrix','GET','/api/agency/permissions',null,{description:'Consultar la matriz de permisos de la empresa. El handler canónico limita la lectura a dueño y administrador.'}),
 tool('scale_get_active_announcement','GET','/api/agency/announcements/active'),
 tool('scale_dismiss_announcement','POST','/api/agency/announcements',null,{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/announcements/${args.id}/dismiss`})}),
];
// The scope header is a canonical stale-tab guard, never model-supplied context.
async function scopedWorkspacePreferences(ctx){
 if(ctx.url.pathname!=='/api/agency/workspace-preferences')return false;
 const actor=await ctx.session(ctx.req);
 const req={...ctx.req,headers:{...ctx.req.headers,'x-scale-preference-scope':`${actor?.id}:${actor?.organization_id}`}};
 return workspacePreferences({...ctx,req});
}
export const mcpWorkspaceHandlers=[scopedWorkspacePreferences,notifications,rolePermissions,inviteLinks,agencyAnnouncements,clientPortal,contracts,productivity,suite,operations,agencyCore];
