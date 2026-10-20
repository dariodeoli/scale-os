import {fail,text,id,option,date} from './suite-validation.js';
import {roleCan} from './permissions.js';
import {currencies} from './currencies.js';
import {attributeActors} from './actor-identity.js';
import {mediaPhoto} from './agency-media.js';
import {forecastMonth} from './forecast.js';
import {financeError,lockFinanceMutation} from './finance-treasury.js';
import {visibleRecord,assertRecordAvailable} from './record-lifecycle.js';
import {logPersonalDataAccess} from './personal-data.js';

export function economicMoney(value,currency){
 if(value===null||value===undefined)return null;
 const match=String(value).match(/^(-?)(\d+)(?:\.(\d+))?$/);if(!match)throw Error('Importe económico inválido');
 const decimals=currency==='PYG'?0:2,scale=10n**BigInt(decimals),fraction=match[3]||'';
 let units=BigInt(match[2])*scale+BigInt(fraction.slice(0,decimals).padEnd(decimals,'0')||'0');
 if((fraction[decimals]||'0')>='5')units++;
 const prefix=match[1]&&units!==0n?'-':'';
 return decimals?`${prefix}${units/scale}.${String(units%scale).padStart(decimals,'0')}`:`${prefix}${units}`;
}
const projectHistory=rows=>rows.map(row=>({...row,before_amount:economicMoney(row.before_amount,row.before_currency??row.currency),after_amount:economicMoney(row.after_amount,row.currency)}));
export async function salaryHistory(c,org,person){
 const rows=(await c.query(`select id::text,effective_from::text,created_at,reason,source,actor_user_id,
 case when before_state is null then null when before_state->>'monthly_salary_amount' is not null then before_state->>'monthly_salary_amount' when before_state->>'compensation_type'='fixed' then before_state->>'amount' else '0' end as before_amount,case when after_state->>'monthly_salary_amount' is not null then after_state->>'monthly_salary_amount' when after_state->>'compensation_type'='fixed' then after_state->>'amount' else '0' end as after_amount,
 coalesce(before_state->>'monthly_salary_currency',before_state->>'currency') as before_currency,coalesce(after_state->>'monthly_salary_currency',after_state->>'currency') as currency,
 after_state->>'compensation_type' as compensation_type,case when after_state->>'monthly_salary_amount' is not null then 'monthly' else 'compensation' end as salary_basis,(effective_from is not null) as history_known
 from agency_salary_history h where organization_id=$1 and collaborator_id=$2 order by h.id desc`,[org,person])).rows;
 const revision=rows[0]?.id||'0';
 // The existing operation audit knows when a change was observed, but carries
 // no salary-effective date. Present it as such instead of inventing vigency.
 const legacy=(await c.query(`select 'audit-'||a.id::text as id,null::text as effective_from,a.created_at,
 'Cambio observado en la ficha; vigencia y motivo originales no registrados' as reason,'operation-audit'::text as source,a.actor as actor_user_id,
 a.before_state->>'compensation_amount' as before_amount,a.after_state->>'compensation_amount' as after_amount,
 a.before_state->>'currency' as before_currency,a.after_state->>'currency' as currency,
 a.after_state->>'compensation_type' as compensation_type,false as history_known,'compensation'::text as salary_basis
 from agency_operation_audit a where a.organization_id=$1 and a.table_name='agency_collaborators'
 and a.after_state->>'id'=$2::text and a.action='UPDATE'
 and (a.before_state->'compensation_amount',a.before_state->'currency',a.before_state->'compensation_type') is distinct from (a.after_state->'compensation_amount',a.after_state->'currency',a.after_state->'compensation_type')
 and a.created_at<(select min(created_at) from agency_salary_history where organization_id=$1 and collaborator_id=$2::bigint)
 order by a.id desc limit 200`,[org,String(person)])).rows;
 const records=[...rows,...legacy].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
 await attributeActors(c,org,[{rows:records,userId:'actor_user_id'}]);
 return {records:projectHistory(records),revision};
}
export async function planHistory(c,org,client){
 const rows=(await c.query(`with terms as (
 select t.*,coalesce(t.plan_name,p.name) as snapshot_plan_name,
 coalesce(t.recurring_amount,case t.discount_type when 'percent' then t.monthly_price*(1-t.discount_value/100) when 'fixed' then greatest(t.monthly_price-t.discount_value,0) else t.monthly_price end) as net_amount
 from agency_client_commercial_terms t left join agency_plans p on p.organization_id=t.organization_id and p.id=t.plan_id
 where t.organization_id=$1 and t.client_id=$2), sequenced as (
 select *,lag(net_amount) over w as previous_amount,lag(currency) over w as previous_currency,
 lag(plan_id) over w as previous_plan_id,lag(snapshot_plan_name) over w as previous_plan_name
 from terms window w as (order by coalesce(effective_from,starts_on),id))
 select id::text,coalesce(effective_from,starts_on)::text as effective_from,created_at,
 coalesce(change_reason,'Acuerdo existente; motivo del cambio no registrado') as reason,
 case when change_reason is null then 'existing-agreement' else 'commercial-change' end as source,
 changed_by_user_id as actor_user_id,previous_amount::text as before_amount,net_amount::text as after_amount,
 previous_currency as before_currency,currency,previous_plan_id::text as before_plan_id,plan_id::text as after_plan_id,
 previous_plan_name as before_plan_name,snapshot_plan_name as after_plan_name,(plan_name is not null) as history_known,cadence
 from sequenced order by sequenced.id desc`,[org,client])).rows;
 await attributeActors(c,org,[{rows,userId:'actor_user_id'}]);
 return {records:projectHistory(rows),revision:rows[0]?.id||'0'};
}
const minor=value=>{const raw=String(value),negative=raw.startsWith('-'),[whole,fraction='']=(negative?raw.slice(1):raw).split('.');const result=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return negative?-result:result;};
const requestKey=value=>{if(typeof value!=='string'||! /^[a-f0-9-]{36}$/i.test(value))fail('Identificador de operación inválido');return value;};
const revision=value=>{if(!/^(0|[1-9]\d{0,18})$/.test(String(value)))fail('La revisión es obligatoria');return String(value);};
function salaryAmount(value,currency){
 const raw=String(value);if(!['string','number'].includes(typeof value)||!/^\d+(?:\.\d{1,2})?$/.test(raw))fail('Importe salarial inválido');
 const [whole,fraction='']=raw.split('.'),minor=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(minor>99999999999900n||(currency==='PYG'&&minor%100n))fail('Importe salarial inválido para la moneda');return raw;
}
export async function economicHistory({req,res,url,db,session,body,send}){
 const salary=url.pathname.match(/^\/api\/agency\/collaborators\/([1-9]\d*)\/salary-history$/),plan=url.pathname.match(/^\/api\/agency\/clients\/([1-9]\d*)\/plan-history$/),balance=url.pathname==='/api/agency/finance/balance-details';
 if(!salary&&!plan&&!balance)return false;let c;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);
  if(!roleCan(user,salary?'salary.view':balance?'finance.balance.view':'billing.view'))fail('Tu rol no permite consultar estos datos',403);
  c=await db.connect();await c.query(req.method==='GET'?'begin isolation level repeatable read':'begin');
  if(balance){if(req.method!=='GET')fail('Método no permitido',405);const result=await balanceDetails(c,user,forecastMonth(url.searchParams.get('month')));if(roleCan(user,'salary.view'))await logPersonalDataAccess(c,{organizationId:user.organization_id,actorUserId:user.id,action:'salary.view',context:'balance-details',details:{month:result.month}});await c.query('commit');send(res,200,result);return true;}
  const key=id((salary||plan)[1]),table=salary?'agency_collaborators':'agency_clients';
  if(req.method!=='GET')await lockFinanceMutation(c,user.organization_id);
  const existing=(await c.query(`select * from ${table} where organization_id=$1 and id=$2${req.method==='GET'?'':' for update'}`,[user.organization_id,key])).rows[0];if(!existing)fail('Registro no encontrado',404);
  const read=salary?salaryHistory:planHistory;
  if(req.method==='GET'){const result=await read(c,user.organization_id,key);if(salary)await logPersonalDataAccess(c,{organizationId:user.organization_id,actorUserId:user.id,action:'salary.view',context:'salary-history',subjectKind:existing.user_id?'user':null,subjectId:existing.user_id?String(existing.user_id):null,details:{collaborator_id:String(key)}});await c.query('commit');send(res,200,result);return true;}
  if(!salary||req.method!=='POST')fail('Método no permitido',405);
  if(!roleCan(user,'finance.view')&&!roleCan(user,'members.manage'))fail('Tu rol no permite editar salarios',403);
  await assertRecordAvailable(c,table,existing);
  const b=await body(req),keyRequest=requestKey(b.requestId),expected=revision(b.expectedRevision),currency=option(b.currency,currencies),amount=salaryAmount(b.amount,currency);
  const effective=date(b.effectiveFrom);if(!effective||!effective.endsWith('-01'))fail('La vigencia debe ser el primer día del mes');
  const reason=text(b.reason,1000);if(reason.length<5)fail('Indicá el motivo del cambio salarial');
  const retry=(await c.query('select collaborator_id::text,after_state,effective_from::text,reason from agency_salary_history where organization_id=$1 and request_key=$2',[user.organization_id,keyRequest])).rows[0];
  if(retry){if(retry.collaborator_id!==String(key)||(retry.after_state.monthly_salary_currency??retry.after_state.currency)!==currency||minor(retry.after_state.monthly_salary_amount??retry.after_state.amount)!==minor(amount)||retry.effective_from!==effective||retry.reason!==reason)fail('El identificador ya pertenece a otro cambio',409);const result=await read(c,user.organization_id,key);await c.query('commit');send(res,200,{...result,alreadyRecorded:true});return true;}
  const current=await read(c,user.organization_id,key);if(current.revision!==expected)fail('El salario cambió. Recargá antes de guardar.',409);
  await c.query('select assert_agency_finance_period_open($1,$2::date)',[user.organization_id,effective]);
  await c.query("select set_config('app.current_user',$1,true),set_config('app.salary_effective_from',$2,true),set_config('app.salary_reason',$3,true),set_config('app.salary_request_key',$4,true)",[String(user.id),effective,reason,keyRequest]);
  if(minor(existing.monthly_salary_amount??(existing.compensation_type==='fixed'?existing.compensation_amount:0))===minor(amount)&&(existing.monthly_salary_currency??existing.currency)===currency)fail('El salario informado ya está vigente');
  await c.query('update agency_collaborators set monthly_salary_amount=$3,monthly_salary_currency=$4,compensation_amount=case when compensation_type=\'fixed\' then $3::numeric else compensation_amount end,currency=case when compensation_type=\'fixed\' then $4 else currency end,updated_at=clock_timestamp() where organization_id=$1 and id=$2',[user.organization_id,key,amount,currency]);
  const result=await read(c,user.organization_id,key);await c.query('commit');send(res,201,result);
 }catch(error){if(c)await c.query('rollback');const e=financeError(error)||error;send(res,e.status||500,{error:e.status?e.message:'No se pudo consultar el historial económico'});}finally{c?.release();}return true;
}

export async function balanceDetails(c,user,month){
 const org=user.organization_id,from=month+'-01';
 const clients=(await c.query(`with bounds as (select $2::date as start_on,($2::date+interval '1 month')::date as end_on),
 term as (
 select distinct on(t.client_id) t.*,coalesce(t.plan_name,p.name) as snapshot_plan_name,
 case when t.cadence='monthly' then coalesce(t.recurring_amount,case t.discount_type when 'percent' then t.monthly_price*(1-t.discount_value/100) when 'fixed' then greatest(t.monthly_price-t.discount_value,0) else t.monthly_price end) else 0 end as contracted
 from agency_client_commercial_terms t left join agency_plans p on p.organization_id=t.organization_id and p.id=t.plan_id cross join bounds d
 where t.organization_id=$1 and coalesce(t.effective_from,t.starts_on)<d.end_on and (coalesce(t.effective_until,t.ends_on) is null or coalesce(t.effective_until,t.ends_on)>=d.start_on)
 order by t.client_id,coalesce(t.effective_from,t.starts_on) desc,t.id desc),
 applications as (
 select p.id as payment_id,i.client_id,p.amount from agency_payments p join agency_invoices i on i.id=p.invoice_id and i.organization_id=p.organization_id where p.organization_id=$1
 union all select a.payment_id,coalesce(i.client_id,r.client_id),a.amount from agency_active_payment_applications a left join agency_invoices i on i.id=a.invoice_id and i.organization_id=a.organization_id left join agency_opening_receivables r on r.id=a.receivable_id and r.organization_id=a.organization_id where a.organization_id=$1),
 attribution as (
 select p.id,p.received_on,p.amount,p.reference,p.invoice_id,a.currency,coalesce(i.client_id,l.client_id,case when count(distinct ap.client_id)=1 then min(ap.client_id) end) as client_id,
 greatest(p.amount-coalesce(sum(ap.amount),0),0) as unallocated
 from agency_payments p join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id
 left join agency_invoices i on i.id=p.invoice_id and i.organization_id=p.organization_id left join agency_payment_links l on l.payment_id=p.id and l.organization_id=p.organization_id
 left join applications ap on ap.payment_id=p.id where p.organization_id=$1 group by p.id,a.currency,i.client_id,l.client_id),
 received as (
 select x.client_id,x.currency,sum(x.amount) as amount,sum(x.unallocated) as unallocated,jsonb_agg(jsonb_build_object('id',x.id::text,'amount',x.amount::text,'received_on',x.booked_on::text,'reference',x.reference,'kind',x.kind,'invoice_id',x.invoice_id::text) order by x.booked_on,x.id) as payments from (
 select a.client_id,a.currency,a.amount,a.unallocated,a.id,a.received_on as booked_on,a.reference,'payment'::text as kind,a.invoice_id from attribution a cross join bounds d where a.received_on>=d.start_on and a.received_on<d.end_on
 union all select a.client_id,a.currency,-a.amount,-a.unallocated,a.id,r.reversed_on,r.reason,'reversal',a.invoice_id from attribution a join agency_payment_reversals r on r.payment_id=a.id and r.organization_id=$1 cross join bounds d where r.reversed_on>=d.start_on and r.reversed_on<d.end_on
 ) x group by x.client_id,x.currency),
 applied as (
 select i.client_id,i.currency,sum(i.paid_amount) as amount from agency_invoices i cross join bounds d where i.organization_id=$1 and i.status not in ('draft','cancelled') and i.issued_on>=d.start_on and i.issued_on<d.end_on group by i.client_id,i.currency),
 outstanding as (
 select client_id,currency,sum(amount) as amount from (
 select client_id,currency,greatest(total-paid_amount,0) as amount from agency_invoices where organization_id=$1 and status not in ('draft','cancelled')
 union all select client_id,currency,outstanding_amount from agency_opening_receivable_balances where organization_id=$1
 ) x group by client_id,currency),
 expected as (select client_id,currency,sum(amount) as amount from (select client_id,currency,outstanding_amount as amount from agency_opening_receivable_balances cross join bounds d where organization_id=$1 and forecast_included and expected_on>=d.start_on and expected_on<d.end_on union all select client_id,currency,greatest(total-paid_amount,0) from agency_invoices cross join bounds d where organization_id=$1 and status not in ('draft','cancelled') and due_on>=d.start_on and due_on<d.end_on) e group by client_id,currency),
 income as (select * from agency_client_income_for_month($1,$2::date)),
 keys as (select client_id,currency from income union select client_id,currency from term union select client_id,currency from received where client_id is not null union select client_id,currency from outstanding union select client_id,currency from applied union select c.id,coalesce(s.default_currency,'PYG') from agency_clients c left join agency_settings s on s.organization_id=c.organization_id where c.organization_id=$1 and c.active and not exists(select 1 from income n where n.client_id=c.id) and not exists(select 1 from term t where t.client_id=c.id) and not exists(select 1 from received r where r.client_id=c.id) and not exists(select 1 from outstanding o where o.client_id=c.id) and not exists(select 1 from applied a where a.client_id=c.id))
 select c.id::text as client_id,c.name as client_name,c.active as client_active,c.logo_url as client_logo_url,k.currency,t.plan_id::text, t.snapshot_plan_name as plan_name,
 coalesce(n.base_amount,0)::text as base_amount,coalesce(n.extras_amount,0)::text as extras_amount,coalesce(n.contracted_amount,0)::text as contracted_amount,t.invoice_required as invoice_required,
 coalesce(r.amount,0)::text as received_in_month,coalesce(r.payments,'[]'::jsonb) as payments,coalesce(r.unallocated,0)::text as unallocated_received_in_month,
 coalesce(a.amount,0)::text as applied_to_month_invoices,coalesce(o.amount,0)::text as registered_outstanding,coalesce(e.amount,0)::text as expected_receipts
 from keys k join agency_clients c on c.id=k.client_id and c.organization_id=$1
 left join term t on t.client_id=k.client_id and t.currency=k.currency left join income n on n.client_id=k.client_id and n.currency=k.currency left join received r on r.client_id=k.client_id and r.currency=k.currency
 left join applied a on a.client_id=k.client_id and a.currency=k.currency left join outstanding o on o.client_id=k.client_id and o.currency=k.currency
 left join expected e on e.client_id=k.client_id and e.currency=k.currency
 where ${visibleRecord('c','clients')} order by c.name,k.currency`,[org,from])).rows;
 for(const row of clients){row.client_logo_url=mediaPhoto('client',row.client_id,row.client_logo_url);for(const key of ['base_amount','extras_amount','contracted_amount','received_in_month','applied_to_month_invoices','unallocated_received_in_month','registered_outstanding','expected_receipts'])row[key]=economicMoney(row[key],row.currency);for(const payment of row.payments)payment.amount=economicMoney(payment.amount,row.currency);}
 const personnel=(await c.query(`with salaries as (
 select c.id,c.user_id,c.full_name as name,coalesce(c.photo_url,p.photo_url) as photo_url,
 agency_salary_at(c.organization_id,c.id,($2::date+interval '1 month -1 day')::date) as salary,c.organization_id
 from agency_collaborators c left join agency_user_profiles p on p.organization_id=c.organization_id and p.user_id=c.user_id
 where c.organization_id=$1 and ${visibleRecord('c','collaborators')} and (c.started_on is null or c.started_on<($2::date+interval '1 month')::date) and (c.ended_on is null or c.ended_on>=$2::date)),
 expected as (select *,salary->>'currency' as currency,
 case when salary->>'compensation_type'='fixed' or salary->>'monthly_salary_amount' is not null then coalesce((salary->>'amount')::numeric,0) else 0 end as base_amount,
 coalesce((select amount from agency_salary_month_overrides o where o.organization_id=s.organization_id and o.collaborator_id=s.id and o.month=$2::date),0) as override_amount from salaries s),
 paid as (select p.collaborator_id,a.currency,sum(p.amount) as amount,jsonb_agg(jsonb_build_object('id',p.id::text,'amount',p.amount::text,'paid_on',p.paid_on::text,'reference',p.reference) order by p.paid_on,p.id) as payments from agency_payouts p join bank_accounts a on a.organization_id=p.organization_id and a.id=p.account_id where p.organization_id=$1 and p.collaborator_id is not null and p.commission_id is null and p.paid_on>=$2::date and p.paid_on<($2::date+interval '1 month')::date group by p.collaborator_id,a.currency),
 keys as (select id,currency from expected where currency is not null union select collaborator_id,currency from paid)
 select k.id::text as collaborator_id,s.user_id::text,s.name,s.photo_url,k.currency,
 coalesce(e.base_amount,0)::text as base_amount,coalesce(e.override_amount,0)::text as override_amount,
 coalesce(e.base_amount+e.override_amount,0)::text as expected_amount,coalesce(p.amount,0)::text as paid_in_month,coalesce(p.payments,'[]'::jsonb) as payments,
 greatest(coalesce(e.base_amount+e.override_amount,0)-coalesce(p.amount,0),0)::text as outstanding_amount,
 coalesce((s.salary->>'history_known')::boolean,false) as history_known,(select coalesce(max(h.id),0)::text from agency_salary_history h where h.organization_id=$1 and h.collaborator_id=k.id) as salary_revision,(e.currency is not null) as salary_editable,case when s.salary->>'monthly_salary_amount' is not null then 'monthly' when s.salary->>'compensation_type'='fixed' then 'fixed' else 'none' end as salary_source
 from keys k join salaries s on s.id=k.id left join expected e on e.id=k.id and e.currency=k.currency left join paid p on p.collaborator_id=k.id and p.currency=k.currency order by s.name,k.currency`,[org,from])).rows;
 const sensitive=['base_amount','override_amount','expected_amount','paid_in_month','outstanding_amount'];
 for(const row of personnel){for(const key of sensitive)row[key]=economicMoney(row[key],row.currency);for(const payment of row.payments)payment.amount=economicMoney(payment.amount,row.currency);row.photo_url=mediaPhoto(row.user_id?'person':'collaborator',row.user_id||row.collaborator_id,row.photo_url);if(!roleCan(user,'salary.view')){for(const key of sensitive)row[key]=null;row.payments=[];row.salary_revision=null;}}
 const totals=(await c.query(`with contracted as (
 select n.* from agency_client_income_for_month($1,$2::date) n join agency_clients c on c.organization_id=$1 and c.id=n.client_id where c.active and ${visibleRecord('c','clients')}),
 entries as (
 select currency,contracted_amount as contracted,0::numeric as received,0::numeric as outstanding,0::numeric as expected from contracted
 union all select a.currency,0,sum(m.amount),0,0 from agency_cash_movements m join bank_accounts a on a.organization_id=m.organization_id and a.id=m.account_id where m.organization_id=$1 and m.movement_type in ('payment','reversal') and m.booked_on>=$2::date and m.booked_on<($2::date+interval '1 month')::date group by a.currency
 union all select currency,0,0,greatest(total-paid_amount,0),0 from agency_invoices where organization_id=$1 and status not in ('draft','cancelled')
 union all select currency,0,0,outstanding_amount,case when forecast_included and expected_on>=$2::date and expected_on<($2::date+interval '1 month')::date then outstanding_amount else 0 end from agency_opening_receivable_balances where organization_id=$1
 union all select currency,0,0,0,greatest(total-paid_amount,0) from agency_invoices where organization_id=$1 and status not in ('draft','cancelled') and due_on>=$2::date and due_on<($2::date+interval '1 month')::date
 ) select currency,(select coalesce(sum(n.base_amount),0)::text from contracted n where n.currency=entries.currency) as base_amount,(select coalesce(sum(n.extras_amount),0)::text from contracted n where n.currency=entries.currency) as extras_amount,sum(contracted)::text as contracted_amount,sum(received)::text as received_in_month,sum(outstanding)::text as registered_outstanding,sum(expected)::text as expected_receipts from entries group by currency order by currency`,[org,from])).rows;
 const unassigned=(await c.query(`with receipts as (
 select p.id,p.organization_id,p.received_on,p.amount,a.currency from agency_payments p
 join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id
 left join agency_payment_links l on l.payment_id=p.id and l.organization_id=p.organization_id
 where p.organization_id=$1 and p.invoice_id is null and l.client_id is null
 and not exists(select 1 from agency_active_payment_applications ap where ap.organization_id=p.organization_id and ap.payment_id=p.id)
 ), movements as (
 select currency,amount,received_on as booked_on from receipts
 union all select p.currency,-p.amount,r.reversed_on from receipts p join agency_payment_reversals r on r.payment_id=p.id and r.organization_id=p.organization_id
 ) select currency,sum(amount)::text as amount from movements where booked_on>=$2::date and booked_on<($2::date+interval '1 month')::date group by currency`,[org,from])).rows;
 for(const row of totals){for(const key of ['base_amount','extras_amount','contracted_amount','received_in_month','registered_outstanding','expected_receipts'])row[key]=economicMoney(row[key],row.currency);row.received_unassigned=economicMoney(unassigned.find(x=>x.currency===row.currency)?.amount||'0',row.currency);}
 return {month,clients:{records:clients},personnel:{records:personnel},totals,definition:{base_amount:'Base del acuerdo mensual o importe manual que lo sustituye únicamente en el mes/moneda seleccionado.',extras_amount:'Servicios adicionales acordados para el mes. No generan facturas ni cobros automáticamente.',contracted_amount:'Base mensual más extras acordados. Acuerdos vigentes en el mes de clientes actualmente activos. El estado actual no acredita la fecha histórica de baja; los acuerdos de inactivos se conservan para revisión.',received_in_month:'Cobros netos por fecha real de cobro/reversión del mes; pueden corresponder a otros períodos. Incluye cobros libres.',applied_to_month_invoices:'Pagado acumulado y aplicado a facturas emitidas en el mes; no incluye cobros libres.',registered_outstanding:'Saldo pendiente actual de facturas emitidas y deuda previa registrada. No se deduce del contrato ni se compensa con cobros libres.',expected_receipts:'Deuda registrada con vencimiento o fecha de previsión explícita dentro del mes; no se suma de nuevo a cobros reales.',personnel:'Salario acordado vigente al cierre del mes más ajustes del mes. Los pagos se muestran por fecha real; no acreditan un período salarial específico. Baselines legacy no acreditan vigencias pasadas.'}};
}
