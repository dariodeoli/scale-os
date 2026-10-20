import {roleCan,loadActorPermissions} from './permissions.js';
import {fail,id,text,email,phone} from './suite-validation.js';
import {assertRecordAvailable} from './record-lifecycle.js';

const pattern=/^\/api\/agency\/clients\/(\d+)\/contacts(?:\/(\d+))?$/;
const fields=['name','role','email','phone'];
function validate(incoming,old={}){
 if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))fail('Contacto inválido');
 if(Object.keys(incoming).some(key=>!fields.includes(key)&&key!=='expected_version'))fail('Campo de contacto inválido');
 const values={...old,...incoming};
 const field=(key,read)=>{try{return read();}catch(error){error.fieldErrors={[key]:error.message};throw error;}};
 const name=field('name',()=>text(values.name??'',120)),role=field('role',()=>text(values.role??'',120));
 if(name.length<2)throw Object.assign(new Error('Ingresá el nombre del contacto'),{status:400,fieldErrors:{name:'Ingresá al menos dos caracteres.'}});
 if(/[\u0000-\u001f\u007f]/.test(name+role))fail('Nombre o rol inválido');
 return {name,role,email:field('email',()=>email(values.email)),phone:field('phone',()=>phone(values.phone))};
}
function expected(incoming,old){if(!Number.isSafeInteger(incoming?.expected_version)||incoming.expected_version!==old.version)fail('El contacto cambió. Conservá tu borrador y recargá la versión actual.',409);}
function pageValue(raw,fallback,max){if(raw===null)return fallback;if(!/^\d+$/.test(raw)||!Number.isSafeInteger(Number(raw))||Number(raw)>max)fail('Página inválida');return Number(raw);}
/** Contactos de una ficha autorizada: nunca copian ni modifican el principal. */
export async function clientContacts({req,res,url,db,session,body,send}){
 const match=url.pathname.match(pattern);if(!match)return false;
 let c,transaction=false;
 try{
  const actor=await session(req);if(!actor)fail('No autenticado',401);
  if(!['GET','POST','PATCH','DELETE'].includes(req.method)||req.method==='POST'&&Boolean(match[2])||['PATCH','DELETE'].includes(req.method)&&!match[2])fail('Método no permitido',405);
  const org=actor.organization_id,clientId=id(match[1]);
  c=await db.connect();await c.query('begin');transaction=true;
  // Revalidar acceso y permisos tras cualquier espera; bloquea revocación concurrente.
  const member=(await c.query('select m.role from organization_members m join organizations o on o.id=m.organization_id where m.organization_id=$1 and m.user_id=$2 and m.active=true and m.removed_at is null and o.active=true for share of m,o',[org,actor.id])).rows[0];
  if(!member)fail('Sin acceso activo a esta empresa',403);
  const live={...actor,role:member.role};live.capabilities=await loadActorPermissions(c,live);
  if(!roleCan(live,'clients.manage'))fail('Los contactos están reservados a quienes gestionan clientes',403);
  const parent=(await c.query(`select * from agency_clients where organization_id=$1 and id=$2 for ${req.method==='GET'?'share':'update'}`,[org,clientId])).rows[0];
  if(!parent)fail('Cliente no encontrado',404);
  await assertRecordAvailable(c,'agency_clients',parent);
  if(parent.personal_data_blocked_at)fail('Los datos personales de esta ficha están bloqueados',409);
  let result,status=200;
  if(req.method==='GET'&&match[2]){
   const contact=(await c.query('select id,name,role,email,phone,version,created_at,updated_at from agency_client_contacts where organization_id=$1 and client_id=$2 and id=$3',[org,clientId,id(match[2])])).rows[0];
   if(!contact)fail('Contacto no encontrado',404);result={contact};
  }else if(req.method==='GET'){
   const limit=pageValue(url.searchParams.get('limit'),50,100);if(!limit)fail('Página inválida');const offset=pageValue(url.searchParams.get('offset'),0,1000000);
   const rows=(await c.query('select id,name,role,email,phone,version,created_at,updated_at from agency_client_contacts where organization_id=$1 and client_id=$2 order by id limit $3 offset $4',[org,clientId,limit+1,offset])).rows;
   result={contacts:rows.slice(0,limit),page:{offset,limit,has_more:rows.length>limit}};
  }else{
   const incoming=await body(req);let old=null,contact=null;
   if(match[2]){
    old=(await c.query('select * from agency_client_contacts where organization_id=$1 and client_id=$2 and id=$3 for update',[org,clientId,id(match[2])])).rows[0];
    if(!old)fail('Contacto no encontrado',404);expected(incoming,old);
   }
   if(req.method==='DELETE'){
    if(Object.keys(incoming).some(key=>key!=='expected_version'))fail('Campo de contacto inválido');
    await c.query('delete from agency_client_contacts where organization_id=$1 and client_id=$2 and id=$3',[org,clientId,old.id]);result={ok:true};
   }else{
    const values=validate(incoming,old||{});
    if(old)contact=(await c.query('update agency_client_contacts set name=$1,role=$2,email=$3,phone=$4,version=version+1,updated_at=now(),updated_by_user_id=$5 where organization_id=$6 and client_id=$7 and id=$8 returning id,name,role,email,phone,version,created_at,updated_at',[values.name,values.role,values.email,values.phone,actor.id,org,clientId,old.id])).rows[0];
    else{contact=(await c.query('insert into agency_client_contacts(organization_id,client_id,name,role,email,phone,created_by_user_id,updated_by_user_id) values($1,$2,$3,$4,$5,$6,$7,$7) returning id,name,role,email,phone,version,created_at,updated_at',[org,clientId,values.name,values.role,values.email,values.phone,actor.id])).rows[0];status=201;}
    result={contact};
   }
   // Auditoría mínima: sólo IDs/revisión, nunca nombres ni canales de contacto.
   await c.query("insert into agency_operation_audit(organization_id,table_name,action,actor,before_state,after_state) values($1,'agency_client_contacts',$2,$3,$4::jsonb,$5::jsonb)",[org,req.method==='POST'?'INSERT':req.method==='PATCH'?'UPDATE':'DELETE',String(actor.id),old?JSON.stringify({client_id:clientId,contact_id:String(old.id),version:old.version}):null,contact?JSON.stringify({client_id:clientId,contact_id:String(contact.id),version:contact.version}):null]);
  }
  await c.query('commit');transaction=false;send(res,status,result);
 }catch(error){if(transaction)await c.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudieron guardar los contactos',...(error.status&&error.fieldErrors?{fieldErrors:error.fieldErrors}:{})});}finally{c?.release();}
 return true;
}
