import {fail} from './suite-validation.js';
// Call inside the same transaction as the canonical mutation. The advisory lock
// serializes identical requests; response persistence rolls back with the write.
export async function financeRetry(c,user,kind,body,{required=false}={}){
 if(!body||typeof body!=='object'||Array.isArray(body))fail('Datos de operación inválidos');
 const key=body.requestId;if((key===undefined||key===null||key==='')&&!required)return null;
 if(typeof key!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))fail('Identificador de operación UUID inválido');
 await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`finance-request:${user.organization_id}:${kind}:${key}`]);
 const payload={...body};delete payload.requestId;
 const old=(await c.query('select response,status,payload=$4::jsonb as matches from agency_finance_requests where organization_id=$1 and kind=$2 and request_key=$3::uuid',[user.organization_id,kind,key,JSON.stringify(payload)])).rows[0];
 if(old){if(!old.matches)fail('El identificador ya pertenece a otra operación',409);return {response:{...old.response,alreadyRecorded:true},status:200};}
 return null;
}
export async function financeRemember(c,user,kind,body,response,status=201){
 if(!body.requestId)return;const payload={...body};delete payload.requestId;
 await c.query('insert into agency_finance_requests(organization_id,kind,request_key,payload,response,status,created_by) values($1,$2,$3::uuid,$4::jsonb,$5::jsonb,$6,$7)',[user.organization_id,kind,body.requestId,JSON.stringify(payload),JSON.stringify(response),status,user.id]);
}
