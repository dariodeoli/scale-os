import crypto from 'node:crypto';
import {ensureConsent} from './personal-data.js';
import {roleCan,loadActorPermissions} from './permissions.js';
import {assertDemoEffectAllowed} from './demo-effects.js';
import {fail,id,text,email,phone,clientLegalProfile,clientLegalFields} from './suite-validation.js';
import {normalizeRuc,assertUniqueClientRuc} from './ruc-lookup.js';
import {requireClientBudget,throttle} from './request-guard.js';
import {assertRecordAvailable} from './record-lifecycle.js';

const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const basic=['name','legal_name','tax_id','email','phone','address','city','department'];
export const clientIntakeFields=[...new Set([...basic,...clientLegalFields])];
const complete=clientIntakeFields;
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
export function intakePayload(input,scope){
 if(!input||typeof input!=='object'||Array.isArray(input))fail('Formulario inválido');
 const fields=scope==='contract'?complete:basic;
 if(Object.keys(input).some(key=>!fields.includes(key)&&!['consent','website'].includes(key)))fail('Campo no permitido');
 if(input.website)fail('No se pudo enviar el formulario');
 if(input.consent!==true)fail('Confirmá la autorización para revisar estos datos');
 const result={name:text(input.name??'',120),legal_name:text(input.legal_name??'',160),tax_id:input.tax_id?normalizeRuc(input.tax_id):'',email:email(input.email),phone:phone(input.phone),...clientLegalProfile(Object.fromEntries(fields.filter(key=>clientLegalFields.includes(key)&&Object.hasOwn(input,key)).map(key=>[key,input[key]])))};
 if(result.name.length<2)fail('Completá tu nombre o el de la empresa');
 if(!result.email&&!result.phone)fail('Completá al menos un correo o teléfono');
 if(result.legal_representative_same_as_client)result.legal_representative_name=result.legal_name||result.name;
 return result;
}
export function clientCompleteness(client){
 const missing=(keys,source=client)=>keys.filter(key=>!String(source[key]??'').trim());
 // Mirror canonical contract autofill: effective identity is reused, never copied back.
 const effective={...client,legal_name:client.legal_name||client.ruc_legal_name||client.name,document_number:client.document_number||(!client.document_type||client.document_type==='ruc'?client.tax_id:''),document_type:client.document_type||(!client.document_number&&client.tax_id?'ruc':'')};
 return {clientId:String(client.id),basic:{missing:missing(['name','email','phone','tax_id','legal_name'])},contract:{reused:['legal_name','document_type','document_number'].filter(key=>!client[key]&&effective[key]),missing:missing(['legal_name','tax_id','address','city','department','party_type','document_type','document_number',...(client.party_type==='company'?['legal_representative_name','legal_representative_document','legal_representative_role']:[])],effective)}};
}
async function authorized(c,actor,write=false){
 // Take the uniqueness lock before shared membership/organization locks.
 if(write)await c.query('select id from organizations where id=$1 for update',[actor.organization_id]);
 const member=(await c.query('select m.role,o.slug as organization_slug,o.demo_owner_user_id,o.demo_source_id from organization_members m join organizations o on o.id=m.organization_id where m.organization_id=$1 and m.user_id=$2 and m.active=true and m.removed_at is null and o.active=true for share of m,o',[actor.organization_id,actor.id])).rows[0];
 if(!member)fail('Sin acceso activo a esta empresa',403);
 const current={...actor,...member};
 current.capabilities=await loadActorPermissions(c,current);
 if(!roleCan(current,'clients.manage'))fail('Sin permiso para gestionar clientes',403);
 return current;
}
async function clientRow(c,org,key){
 const row=(await c.query('select * from agency_clients where organization_id=$1 and id=$2 for update',[org,id(key)])).rows[0];
 if(!row)fail('Cliente no encontrado',404);await assertRecordAvailable(c,'agency_clients',row);
 if(row.personal_data_blocked_at)fail('Los datos de esta ficha están bloqueados',409);
 return row;
}
/** Public GET returns only the requested scope. A token never reads a client or creates a session. */
export async function clientIntake({req,res,url,db,session,body,send}){
 const publicMatch=url.pathname.match(/^\/api\/public\/client-intake\/([A-Za-z0-9_-]+)$/);
 const links=url.pathname.match(/^\/api\/agency\/client-intake-links(?:\/(\d+))?$/);
 const submissions=url.pathname.match(/^\/api\/agency\/client-intake-submissions(?:\/(\d+)\/review)?$/);
 const completeness=url.pathname.match(/^\/api\/agency\/clients\/(\d+)\/completeness$/);
 if(!publicMatch&&!links&&!submissions&&!completeness)return false;
 let c,tx=false;
 try{
  res.setHeader?.('Cache-Control','no-store');res.setHeader?.('Referrer-Policy','no-referrer');
  if(publicMatch){
   if(!['GET','POST'].includes(req.method))fail('Método no permitido',405);
   await requireClientBudget(db,req,'client-intake',30);
   if(!tokenPattern.test(publicMatch[1]))fail('Enlace no disponible',404);
   c=await db.connect();await c.query('begin');tx=true;
   let link=(await c.query('select l.* from agency_client_intake_links l join organizations o on o.id=l.organization_id where l.token_hash=$1 and o.active=true',[hash(publicMatch[1])])).rows[0];
   if(!link||link.revoked_at||new Date(link.expires_at)<=new Date())fail('Enlace vencido o no disponible. Pedí uno nuevo a la empresa.',404);
   if(link.consumed_at)fail('Este enlace ya recibió una solicitud para revisión.',409);
   // A suppressed/archived client's old link cannot collect fresh data.
   if(link.client_id)await clientRow(c,link.organization_id,link.client_id);
   // Parent-before-link agrees with canonical privacy suppression lock order.
   link=(await c.query('select l.* from agency_client_intake_links l join organizations o on o.id=l.organization_id where l.token_hash=$1 and o.active=true for update of l',[hash(publicMatch[1])])).rows[0];
   if(!link||link.revoked_at||new Date(link.expires_at)<=new Date())fail('Enlace vencido o no disponible. Pedí uno nuevo a la empresa.',404);
   if(link.consumed_at)fail('Este enlace ya recibió una solicitud para revisión.',409);
   if(req.method==='GET'){
    await c.query('commit');tx=false;send(res,200,{scope:link.scope,expires_at:link.expires_at});return true;
   }
   const payload=intakePayload(await body(req),link.scope);
   await c.query('insert into agency_client_intake_submissions(organization_id,link_id,payload) values($1,$2,$3::jsonb)',[link.organization_id,link.id,JSON.stringify(payload)]);
   await c.query('update agency_client_intake_links set consumed_at=now() where id=$1',[link.id]);
   await c.query('commit');tx=false;send(res,201,{received:true,message:'Datos recibidos para revisión. Todavía no se creó ni modificó ninguna ficha.'});return true;
  }
  const actor=await session(req);if(!actor)fail('No autenticado',401);
  c=await db.connect();await c.query('begin');tx=true;const liveActor=await authorized(c,actor,req.method!=='GET');
  const org=actor.organization_id;let result,status=200;
  await c.query("select set_config('app.current_user',$1,true)",[String(actor.id)]);
  if(completeness){
   if(req.method!=='GET')fail('Método no permitido',405);
   result=clientCompleteness(await clientRow(c,org,completeness[1]));
  }else if(links){
   if(req.method==='GET'&&!links[1]){
    const clientId=url.searchParams.get('client_id');if(clientId)await clientRow(c,org,clientId);
    result={links:(await c.query(`select id,client_id,scope,created_at,expires_at,revoked_at,consumed_at from agency_client_intake_links where organization_id=$1${clientId?' and client_id=$2':''} order by id desc limit 100`,clientId?[org,clientId]:[org])).rows};
   }else if(req.method==='POST'&&!links[1]){
    assertDemoEffectAllowed(actor,'external');
    assertDemoEffectAllowed(liveActor,'external');
    if(!await throttle(db,'client-intake-issue:'+org+':'+actor.id,40))fail('Esperá unos minutos antes de emitir más enlaces',429);
    const incoming=await body(req);if(Object.keys(incoming).some(key=>!['scope','client_id','expires_in_days'].includes(key)))fail('Campo no permitido');
    if(!['basic','contract'].includes(incoming.scope))fail('Elegí alta básica o contrato');
    const days=incoming.expires_in_days??7;if(!Number.isInteger(days)||days<1||days>30)fail('Vencimiento entre 1 y 30 días');
    const clientId=incoming.client_id?id(incoming.client_id):null;if(clientId)await clientRow(c,org,clientId);
    const token=crypto.randomBytes(32).toString('base64url');
    const link=(await c.query("insert into agency_client_intake_links(organization_id,client_id,scope,token_hash,created_by,expires_at) values($1,$2,$3,$4,$5,now()+($6::text||' days')::interval) returning id,client_id,scope,expires_at",[org,clientId,incoming.scope,hash(token),actor.id,days])).rows[0];
    result={link,path:'/adhesion/'+token};status=201;
   }else if(req.method==='DELETE'&&links[1]){
    const updated=await c.query('update agency_client_intake_links set revoked_at=coalesce(revoked_at,now()) where organization_id=$1 and id=$2 returning id',[org,id(links[1])]);if(!updated.rows.length)fail('Enlace no encontrado',404);result={revoked:true};
   }else fail('Método no permitido',405);
  }else if(submissions){
   if(req.method==='GET'&&!submissions[1]){
    const clientId=url.searchParams.get('client_id');if(clientId)await clientRow(c,org,clientId);
    result={submissions:(await c.query(`select s.id,s.payload,s.status,s.created_at,s.reviewed_at,s.client_id,l.client_id as intended_client_id,l.scope from agency_client_intake_submissions s join agency_client_intake_links l on l.id=s.link_id and l.organization_id=s.organization_id where s.organization_id=$1${clientId?' and l.client_id=$2':''} order by s.id desc limit 100`,clientId?[org,clientId]:[org])).rows};
   }else if(req.method==='POST'&&submissions[1]){
    const incoming=await body(req);
    if(Object.keys(incoming).some(key=>!['action','client_id','fields','expected_updated_at'].includes(key)))fail('Campo no permitido');
    if(!['create','link','reject'].includes(incoming.action))fail('Decisión inválida');
    const entry=(await c.query('select s.*,l.client_id as intended_client_id from agency_client_intake_submissions s join agency_client_intake_links l on l.id=s.link_id and l.organization_id=s.organization_id where s.organization_id=$1 and s.id=$2',[org,id(submissions[1])])).rows[0];
    if(!entry)fail('Solicitud no encontrada',404);
    if(incoming.action==='link')await clientRow(c,org,id(incoming.client_id));
    const latest=(await c.query('select status from agency_client_intake_submissions where organization_id=$1 and id=$2 for update',[org,entry.id])).rows[0];
    if(!latest)fail('Solicitud no encontrada',404);if(latest.status!=='pending')fail('Esta solicitud ya fue revisada',409);
    let clientId=null;
    if(incoming.action!=='reject'){
     const values=typeof entry.payload==='string'?JSON.parse(entry.payload):entry.payload;
     if(!Array.isArray(incoming.fields)||!incoming.fields.length||incoming.fields.some(key=>!complete.includes(key)||!Object.hasOwn(values,key))||new Set(incoming.fields).size!==incoming.fields.length)fail('Seleccioná los datos que revisaste');
     const selected=Object.fromEntries(incoming.fields.map(key=>[key,values[key]]));
     if(incoming.action==='create'){
      if(entry.intended_client_id)fail('La solicitud corresponde a una ficha existente',409);
      if(!selected.name)fail('Revisá el nombre para crear la ficha');
      await c.query('select id from organizations where id=$1 for update',[org]);
      if(selected.tax_id)await assertUniqueClientRuc(c,org,selected.tax_id);
      const keys=Object.keys(selected);clientId=(await c.query(`insert into agency_clients(organization_id,${keys.join(',')}) values($1,${keys.map((_,index)=>'$'+(index+2)).join(',')}) returning id`,[org,...Object.values(selected)])).rows[0].id;
     }else{
      clientId=id(incoming.client_id);if(entry.intended_client_id&&String(entry.intended_client_id)!==clientId)fail('La ficha no coincide con el enlace',409);
      const client=await clientRow(c,org,clientId);
      if(!incoming.expected_updated_at||new Date(client.updated_at).toISOString()!==incoming.expected_updated_at)fail('La ficha cambió. Revisá sus datos actuales antes de aplicar.',409);
      // No overwrites: reviewers may apply only missing fields, explicitly selected.
      for(const key of Object.keys(selected))if(client[key]!==null&&client[key]!==undefined&&String(client[key]).trim()!==''&&!(key==='legal_representative_same_as_client'&&client[key]===false))fail('El campo '+key+' ya contiene datos; editá la ficha para reemplazarlos.',409);
      await c.query('select id from organizations where id=$1 for update',[org]);
      if(selected.tax_id)await assertUniqueClientRuc(c,org,selected.tax_id,clientId);
      const keys=Object.keys(selected);await c.query(`update agency_clients set ${keys.map((key,index)=>key+'=$'+(index+3)).join(',')},updated_at=now() where organization_id=$1 and id=$2`,[org,clientId,...Object.values(selected)]);
     }
    }
    if(clientId)await ensureConsent(c,{organizationId:org,subjectKind:'client',subjectId:String(clientId),purpose:'service',source:'public_client_intake',basis:'consent',grantedByUserId:actor.id,noticeVersion:entry.notice_version,evidence:{submission_id:String(entry.id),consent_at:entry.consent_at,channel:'public_client_intake',reviewed_by:String(actor.id)}});
    await c.query('update agency_client_intake_submissions set status=$1,reviewed_at=now(),reviewed_by=$2,client_id=$3 where organization_id=$4 and id=$5',[incoming.action==='reject'?'rejected':'accepted',actor.id,clientId,org,entry.id]);
    result={reviewed:true,clientId:clientId?String(clientId):null};
   }else fail('Método no permitido',405);
  }
  if(req.method!=='GET')await c.query("insert into agency_operation_audit(organization_id,table_name,action,actor,after_state) values($1,'agency_client_intake',$2,$3,$4::jsonb)",[org,req.method==='DELETE'?'DELETE':'INSERT',String(actor.id),JSON.stringify({link_id:links?.[1]||result?.link?.id||null,submission_id:submissions?.[1]||null,client_id:result?.clientId||null})]);
  await c.query('commit');tx=false;send(res,status,result);
 }catch(error){if(tx)await c.query('rollback');send(res,error.status||500,{error:error.status?error.message:'No se pudo completar la solicitud'});}finally{c?.release();}
 return true;
}
