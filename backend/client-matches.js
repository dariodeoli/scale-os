import {roleCan} from './permissions.js';
import {email,phone,text,fail} from './suite-validation.js';
import {rucDigits} from './ruc-lookup.js';
import {visibleRecord} from './record-lifecycle.js';
import {mediaPhoto} from './agency-media.js';
import {throttle} from './request-guard.js';

export const CLIENT_MATCH_LIMIT=10;
export const CLIENT_MATCH_RATE=120;
const criteria={
 tax_id:{normalize:value=>rucDigits(text(value,60)),sql:"regexp_replace(coalesce(c.tax_id,''),'[^0-9]','','g')",secondary:'Mismo RUC'},
 email:{normalize:value=>email(text(value,254)),sql:"lower(trim(coalesce(c.email,'')))",secondary:'Mismo correo'},
 phone:{normalize:value=>phone(text(value,50))?.replace(/\D/g,''),sql:"regexp_replace(coalesce(c.phone,''),'[^0-9]','','g')",secondary:'Mismo teléfono'},
};

/** Authorized exact matches within the current tenant; no provider or business mutation. */
export async function clientMatches({req,res,url,db,session,body,send}){
 if(url.pathname!=='/api/agency/clients/matches')return false;
 try{
  if(req.method!=='POST')fail('Método no permitido',405);
  const user=await session(req);
  if(!user)fail('No autenticado',401);
  if(!user.organization_id||!roleCan(user,'clients.manage'))fail('Tu acceso no permite consultar fichas de clientes',403);
  const input=await body(req);
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(key=>!['kind','value'].includes(key)))fail('Consulta inválida');
  if(typeof input.kind!=='string'||!Object.hasOwn(criteria,input.kind))fail('Tipo de coincidencia inválido');
  const criterion=criteria[input.kind],value=criterion.normalize(input.value);
  if(!value)fail('Completá el identificador que querés buscar');
  if(!await throttle(db,`client-matches:${user.organization_id}:${user.id}`,CLIENT_MATCH_RATE))fail('Hiciste muchas búsquedas seguidas. Esperá unos minutos o continuá manualmente.',429);
  const rows=(await db.query(`select c.id::text as id,c.name,c.logo_url,c.active,to_jsonb(c)->>'lifecycle_status' as lifecycle_status
   from agency_clients c where c.organization_id=$1 and ${visibleRecord('c','clients')}
    and to_jsonb(c)->>'personal_data_blocked_at' is null and ${criterion.sql}=$2
   order by c.name,c.id limit ${CLIENT_MATCH_LIMIT}`,[user.organization_id,value])).rows;
  send(res,200,{matches:rows.map(row=>({id:row.id,name:row.name,logo_url:mediaPhoto('client',row.id,row.logo_url),secondary:criterion.secondary,state:row.lifecycle_status||(row.active?'active':'inactive')}))});
 }catch(error){send(res,error.status||500,{error:error.status?error.message:'No se pudieron buscar las fichas. Podés continuar manualmente.'});}
 return true;
}
