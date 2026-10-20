import {fail,id,text,option} from './suite-validation.js';
import {currencies} from './currencies.js';
import {forecastMonth,wholeMoney} from './forecast.js';
import {roleCan} from './permissions.js';
import {financeError,lockFinanceMutation} from './finance-treasury.js';
import {assertRecordAvailable} from './record-lifecycle.js';

const canManage=user=>roleCan(user,'commercial-terms.manage')||roleCan(user,'expenses.manage');
const money=value=>{const s=String(value);if(!['string','number'].includes(typeof value)||! /^(0|[1-9]\d*)$/.test(s)||!Number.isSafeInteger(Number(s)))fail('Ingresá un importe entero válido');return s;};
const revision=value=>{if(!['string','number'].includes(typeof value)||! /^(0|[1-9]\d{0,18})$/.test(String(value)))fail('La revisión es obligatoria');return String(value);};
const requestId=value=>{if(typeof value!=='string'||! /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value))fail('Identificador de operación inválido');return value.toLowerCase();};
const currentRevision=async(c,org,client)=>(await c.query('select coalesce(max(id),0)::text as revision from agency_client_monthly_income_events where organization_id=$1 and client_id=$2',[org,client])).rows[0].revision;
async function read(c,user,client,month){
 const entries=(await c.query(`select id::text,kind,label,amount::text,currency,month::text,version,created_at as "createdAt",updated_at as "updatedAt" from agency_client_monthly_income where organization_id=$1 and client_id=$2 and month=$3::date and deleted_at is null order by case when kind='base' then 0 else 1 end,created_at,id`,[user.organization_id,client,month+'-01'])).rows.map(row=>({...row,month:row.month.slice(0,7),amount:wholeMoney(row.amount)}));
 const totals=(await c.query('select currency,plan_base_amount::text as "planBaseAmount",manual_base_amount::text as "manualBaseAmount",base_amount::text as "baseAmount",extras_amount::text as "extrasAmount",contracted_amount::text as "totalAmount" from agency_client_income_for_month($1,$2::date) where client_id=$3 order by currency',[user.organization_id,month+'-01',client])).rows.map(row=>({...row,...Object.fromEntries(['planBaseAmount','manualBaseAmount','baseAmount','extrasAmount','totalAmount'].map(k=>[k,row[k]===null?null:wholeMoney(row[k])]))}));
 const flags=(await c.query("select exists(select 1 from agency_archived_records where organization_id=$1 and kind='clients' and record_id=$2) as archived,exists(select 1 from agency_finance_periods where organization_id=$1 and status='closed' and month>=$3::date) as closed",[user.organization_id,client,month+'-01'])).rows[0];
 return {clientId:String(client),month,revision:await currentRevision(c,user.organization_id,client),canManage:canManage(user)&&!flags.archived&&!flags.closed,archived:flags.archived,periodClosed:flags.closed,entries,totals};
}
export async function clientMonthlyIncome({req,res,url,db,session,body,send}){
 const route=url.pathname.match(/^\/api\/agency\/clients\/([1-9]\d*)\/monthly-income(?:\/([1-9]\d*))?$/);if(!route)return false;let c;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roleCan(user,'billing.view'))fail('Tu rol no permite consultar estos datos',403);
  const client=id(route[1]),entry=route[2]?id(route[2]):null,writing=req.method!=='GET';
  if(BigInt(client)>9223372036854775807n||entry&&BigInt(entry)>9223372036854775807n)fail('Registro no encontrado',404);
  if(writing&&!canManage(user))fail('Tu rol no permite editar importes del cliente',403);
  if(req.method==='GET'&&entry||!['GET','POST','PATCH','DELETE'].includes(req.method)||req.method==='POST'&&entry||['PATCH','DELETE'].includes(req.method)&&!entry)fail('Método no permitido',405);
  c=await db.connect();await c.query(writing?'begin':'begin isolation level repeatable read');
  if(writing)await lockFinanceMutation(c,user.organization_id);
  const customer=(await c.query(`select * from agency_clients where organization_id=$1 and id=$2${writing?' for update':''}`,[user.organization_id,client])).rows[0];if(!customer)fail('Cliente no encontrado',404);
  if(!writing){const result=await read(c,user,client,forecastMonth(url.searchParams.get('month')));await c.query('commit');send(res,200,result);return true;}
  await assertRecordAvailable(c,'agency_clients',customer);
  const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b))fail('Datos inválidos');
  const allowed=req.method==='DELETE'?['requestId','expectedRevision','reason']:['month','kind','label','amount','currency','requestId','expectedRevision','reason'];if(Object.keys(b).some(k=>!allowed.includes(k)))fail('Campos de ingreso mensual inválidos');
  const key=requestId(b.requestId),expected=revision(b.expectedRevision),reason=text(b.reason,1000);if(reason.length<5)fail('Indicá un motivo de 5 a 1000 caracteres');
  let values=null;if(req.method!=='DELETE'){if(typeof b.month!=='string')fail('Elegí el mes del servicio');const month=forecastMonth(b.month),kind=option(b.kind,['base','extra']),label=text(b.label,180),amount=money(b.amount),currency=option(b.currency,currencies);if(!label)fail('Describí el servicio');if(kind==='extra'&&amount==='0')fail('El extra debe ser mayor a cero');values={month,kind,label,amount,currency};}
  const request={method:req.method,clientId:String(client),entryId:entry?String(entry):null,reason,...values};
  const retry=(await c.query('select client_id::text,request_json,coalesce(after_state,before_state)->>\'month\' as month from agency_client_monthly_income_events where organization_id=$1 and request_key=$2::uuid',[user.organization_id,key])).rows[0];
  if(retry){if(retry.client_id!==String(client)||JSON.stringify(Object.entries(retry.request_json).sort())!==JSON.stringify(Object.entries(request).sort()))fail('El identificador ya pertenece a otra operación',409);const result=await read(c,user,client,(values?.month||retry.month).slice(0,7));await c.query('commit');send(res,200,{...result,alreadyRecorded:true});return true;}
  if(await currentRevision(c,user.organization_id,client)!==expected)fail('Los importes cambiaron. Recargá antes de guardar.',409);
  const before=entry?(await c.query('select * from agency_client_monthly_income where organization_id=$1 and client_id=$2 and id=$3 and deleted_at is null for update',[user.organization_id,client,entry])).rows[0]:null;if(entry&&!before)fail('Servicio no encontrado',404);
  await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket?.remoteAddress||'']);
  let after;
  if(req.method==='POST')after=(await c.query('insert into agency_client_monthly_income(organization_id,client_id,month,kind,label,amount,currency) values($1,$2,$3::date,$4,$5,$6,$7) returning *',[user.organization_id,client,values.month+'-01',values.kind,values.label,values.amount,values.currency])).rows[0];
  else if(req.method==='PATCH')after=(await c.query('update agency_client_monthly_income set month=$4::date,kind=$5,label=$6,amount=$7,currency=$8,version=version+1,updated_at=clock_timestamp() where organization_id=$1 and client_id=$2 and id=$3 returning *',[user.organization_id,client,entry,values.month+'-01',values.kind,values.label,values.amount,values.currency])).rows[0];
  else after=(await c.query('update agency_client_monthly_income set deleted_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() where organization_id=$1 and client_id=$2 and id=$3 returning *',[user.organization_id,client,entry])).rows[0];
  await c.query('insert into agency_client_monthly_income_events(organization_id,client_id,entry_id,action,request_key,request_json,before_state,after_state,actor_user_id,reason) values($1,$2,$3,$4,$5::uuid,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10)',[user.organization_id,client,after.id,req.method==='POST'?'create':req.method==='PATCH'?'update':'delete',key,JSON.stringify(request),before?JSON.stringify(before):null,JSON.stringify(after),user.id,reason]);
  const month=values?.month||String(before.month instanceof Date?before.month.toISOString().slice(0,10):before.month).slice(0,7);const result=await read(c,user,client,month);await c.query('commit');send(res,req.method==='POST'?201:200,result);
 }catch(error){if(c)await c.query('rollback');const e=financeError(error)||error;send(res,e.status|| (e.code==='23505'?409:500),{error:e.status?e.message:e.code==='23505'?'Ya hay una base manual para ese cliente, mes y moneda. Editá la existente.':'No se pudieron guardar los ingresos del cliente'});}finally{c?.release();}return true;
}
