// Refs #335. Typed fixed routes; canonical handler owns tenancy, live permissions,
// validation, replay guards and writes. No model-provided URL, token or session.
import {clientIntake,clientIntakeFields} from './client-intake.js';
const identifier={type:'string',pattern:'^[1-9][0-9]{0,18}$'};
const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const confirm={type:'boolean',const:true,description:'Confirmación explícita del cambio solicitado por la persona.'};
function descriptor(name,method,path,description,{properties={},required=[],data=object({}),resolve=()=>({path})}={}){
 const write=method!=='GET';
 return {name,method,path,cap:'clients.manage',scope:write?'scale:write':'scale:read',domain:'clients',description,
  inputSchema:object({...properties,...(write?{confirm,data}:{})},[...required,...(write?['confirm','data']:[])]),resolve};
}
const query=args=>args.client_id?{client_id:args.client_id}:{};
const fields={type:'array',uniqueItems:true,maxItems:clientIntakeFields.length,items:{type:'string',enum:clientIntakeFields}};
const revision={type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$'};
const review=object({action:{type:'string',enum:['create','link','reject']},fields,client_id:identifier,expected_updated_at:revision},['action']);
review.allOf=[
 {if:{properties:{action:{const:'create'}},required:['action']},then:{required:['fields'],properties:{fields:{...fields,minItems:1}}}},
 {if:{properties:{action:{const:'link'}},required:['action']},then:{required:['fields','client_id','expected_updated_at'],properties:{fields:{...fields,minItems:1}}}},
];
export const mcpClientIntakeTools=[
 descriptor('scale_get_client_completeness','GET','/api/agency/clients/:id/completeness','Consultar nombres de campos pendientes de un cliente y los que reutiliza el autofill contractual. No inventa datos, pagos ni revisión mensual.',{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/clients/${args.id}/completeness`})}),
 descriptor('scale_list_client_intake_links','GET','/api/agency/client-intake-links','Listar últimos 100 enlaces de registro de la empresa o de una ficha: alcance, expiración, revocación y consumo. Nunca devuelve tokens, hashes ni enlaces portadores existentes.',{properties:{client_id:identifier},resolve:args=>({path:'/api/agency/client-intake-links',query:query(args)})}),
 descriptor('scale_create_client_intake_link','POST','/api/agency/client-intake-links','Emitir un enlace básico o completo para compartir explícitamente con el cliente. Devuelve el path portador una sola vez; tratarlo como enlace privado. No enviar mensajes automáticamente. Ante respuesta ambigua no reintentar: revisar enlaces emitidos y, si hace falta, revocar y emitir otro con confirmación.',{data:object({scope:{type:'string',enum:['basic','contract']},client_id:identifier,expires_in_days:{type:'integer',minimum:1,maximum:30}},['scope'])}),
 descriptor('scale_revoke_client_intake_link','DELETE','/api/agency/client-intake-links/:id','Revocar un enlace de registro de la empresa. Es idempotente y no borra fichas ni solicitudes ya recibidas.',{properties:{id:identifier},required:['id'],resolve:args=>({path:`/api/agency/client-intake-links/${args.id}`})}),
 descriptor('scale_list_client_intake_submissions','GET','/api/agency/client-intake-submissions','Consultar últimas 100 solicitudes para revisión autorizada, con los datos personales que el cliente envió. No vincula ni sobrescribe fichas; divulgar únicamente lo necesario para la solicitud del usuario.',{properties:{client_id:identifier},resolve:args=>({path:'/api/agency/client-intake-submissions',query:query(args)})}),
 descriptor('scale_review_client_intake_submission','POST','/api/agency/client-intake-submissions/:id/review','Confirmar revisión humana: crear ficha, completar sólo campos vacíos expresamente seleccionados de una ficha o rechazar. Primero consultar solicitud y ficha actual; link requiere updated_at ISO exacto. Nunca reemplaza datos existentes ni registra pagos. Revisión repetida devuelve conflicto, sin duplicación.',{properties:{id:identifier},required:['id'],data:review,resolve:args=>({path:`/api/agency/client-intake-submissions/${args.id}/review`})}),
];
export const mcpClientIntakeHandlers=[clientIntake];
