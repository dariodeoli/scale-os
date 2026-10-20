import {attributeActors} from './actor-identity.js';
import {mediaPhoto,mediaPeople} from './agency-media.js';
import {financeRetry,financeRemember} from './finance-idempotency.js';
import {financePaymentReviews} from './finance-payment-reviews.js';
import {fail,text,id,optId,amount,date,owned} from './suite-validation.js';
import {roleCan} from './permissions.js';
import {assertRecordAvailable,visibleRecord} from './record-lifecycle.js';
import {forecastMonth} from './forecast.js';
import {zoneTodaySql,civilDate} from './business-time.js';
import {currencies} from './currencies.js';

export const lockFinanceMutation=(c,org)=>c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`finance-periods:${org}`]);
export const financeError=error=>error.code==='P2290'?{status:409,message:error.message}:error.code==='P2280'?{status:409,message:error.message}:null;
const requestKey=value=>{if(value===undefined||value===null||value==='')return null;if(typeof value!=='string'||!/^[a-f0-9-]{36}$/.test(value))fail('Identificador de operación inválido');return value;};
const reason=value=>{const result=text(value,500);if(result.length<5)fail('Explicá el motivo (al menos 5 caracteres)');return result;};
const positive=value=>{const result=amount(value);if(!result)fail('El importe debe ser mayor a cero');return result;};
const guard=async(c,org,on)=>c.query('select assert_agency_finance_period_open($1,$2::date)',[org,on]);
const today=async c=>(await c.query(`select ${zoneTodaySql}::text as today`)).rows[0].today;
async function lockRequest(c,org,kind,key){if(key)await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[`${kind}:${org}:${key}`]);}
async function links(c,u,input,payment=null){
 const clientId=optId(input.clientId),projectId=optId(input.projectId),planId=optId(input.planId);
 let resolvedClient=clientId;
 if(clientId){const client=await owned(c,'agency_clients',clientId,u.organization_id);await assertRecordAvailable(c,'agency_clients',client);}
 if(projectId){const project=await owned(c,'agency_projects',projectId,u.organization_id);await assertRecordAvailable(c,'agency_projects',project);if(project.active===false)fail('El proyecto está inactivo',409);if(clientId&&String(project.client_id)!==clientId)fail('El proyecto debe corresponder al cliente',409);resolvedClient=String(project.client_id);const client=await owned(c,'agency_clients',resolvedClient,u.organization_id);}
 if(planId){const plan=await owned(c,'agency_plans',planId,u.organization_id);await assertRecordAvailable(c,'agency_plans',plan);if(!plan.active)fail('El plan está inactivo',409);}
 if(payment){
  if(payment.invoice_id){const invoice=await owned(c,'agency_invoices',payment.invoice_id,u.organization_id);if(resolvedClient&&String(invoice.client_id)!==resolvedClient)fail('La factura corresponde a otro cliente',409);resolvedClient=String(invoice.client_id);}
  const targets=(await c.query('select distinct coalesce(i.client_id,d.client_id)::text as client_id from agency_active_payment_applications a left join agency_invoices i on i.id=a.invoice_id left join agency_opening_receivables d on d.id=a.receivable_id where a.payment_id=$1 and a.organization_id=$2',[payment.id,u.organization_id])).rows;
  if(targets.length){if(resolvedClient&&targets.some(row=>row.client_id!==resolvedClient))fail('El cliente no coincide con las aplicaciones del cobro',409);resolvedClient=targets[0].client_id;}
 }
 return {clientId:resolvedClient,projectId,planId};
}
async function saveLinks(c,u,payment,input){
 const values=await links(c,u,input,payment);
 const current=(await c.query('select monthly_income_entry_id,period::text as period from agency_payment_links where payment_id=$1',[payment.id])).rows[0];
 const supplied=Object.hasOwn(input,'monthlyIncomeEntryId'),entryId=supplied?optId(input.monthlyIncomeEntryId):current?.monthly_income_entry_id||null;
 let period=Object.hasOwn(input,'period')?(input.period===null||input.period===''?null:forecastMonth(input.period)+'-01'):current?.period||null;
 if(entryId){const entry=(await c.query('select client_id,month::text as month,currency from agency_client_monthly_income where organization_id=$1 and id=$2 and deleted_at is null',[u.organization_id,entryId])).rows[0];if(!entry)fail('El extra o importe mensual no está disponible',404);if(values.clientId&&String(entry.client_id)!==String(values.clientId))fail('El ingreso mensual pertenece a otro cliente',409);if(!values.clientId)fail('Seleccioná el cliente antes de asociar un ingreso mensual');if(period&&period!==entry.month)fail('El ingreso mensual pertenece a otro mes',409);period=entry.month;const account=await owned(c,'bank_accounts',payment.account_id,u.organization_id);if(account.currency!==entry.currency)fail('La moneda del cobro debe coincidir con el ingreso mensual',409);}
 const saved= (await c.query('insert into agency_payment_links(organization_id,payment_id,client_id,project_id,plan_id,updated_by) values($1,$2,$3,$4,$5,$6) on conflict(payment_id) do update set client_id=excluded.client_id,project_id=excluded.project_id,plan_id=excluded.plan_id,revision=agency_payment_links.revision+1,updated_by=excluded.updated_by,updated_at=now() returning *',[u.organization_id,payment.id,values.clientId,values.projectId,values.planId,u.id])).rows[0];
 return (await c.query("update agency_payment_links set monthly_income_entry_id=$3,period=$4::date where organization_id=$1 and payment_id=$2 returning *,to_char(period,'YYYY-MM') as period",[u.organization_id,payment.id,entryId,period])).rows[0];
}
export async function createUnassignedReceipt(c,u,b){
 const cached=await financeRetry(c,u,'receipt-unassigned',b);if(cached)return cached.response;
 if(b.invoiceId)fail('Un cobro libre se aplica a una factura después de registrarlo');
 if(b.parts)fail('Registrá un cobro libre por cuenta de ingreso');
 const paid=positive(b.amount),on=date(b.receivedOn)||await today(c),key=requestKey(b.requestId),org=u.organization_id;
 if(on>await today(c))fail('La fecha del cobro no puede ser futura');
 await lockRequest(c,org,'agency_payments',key);
 if(key){const prior=(await c.query('select *,received_on::text as received_on from agency_payments where organization_id=$1 and request_key=$2',[org,key])).rows[0];if(prior){if(prior.invoice_id!==null||String(prior.account_id)!==id(b.accountId)||Number(prior.amount)!==paid||prior.received_on!==on)fail('El identificador ya fue usado para otro cobro',409);return {payment:prior,alreadyRecorded:true};}}
 await guard(c,org,on);
 const resolved=await links(c,u,b),account=await owned(c,'bank_accounts',b.accountId,org);
 if(!account.active)fail('La cuenta de ingreso debe estar activa',409);
 const receiver=optId(b.receivedByUserId)||String(u.id);
 if(!(await c.query('select 1 from organization_members where organization_id=$1 and user_id=$2 and active=true',[org,receiver])).rows.length)fail('La persona debe tener acceso activo a la empresa');
 const payment=(await c.query('insert into agency_payments(organization_id,invoice_id,account_id,amount,received_on,reference,received_by_user_id,request_key) values($1,null,$2,$3,$4,$5,$6,$7) returning *,received_on::text as received_on',[org,account.id,paid,on,text(b.reference||'',180),receiver,key])).rows[0];
 const linked=await saveLinks(c,u,payment,{...b,...resolved});const result={payment:{...payment,...{client_id:linked.client_id,project_id:linked.project_id,plan_id:linked.plan_id,monthly_income_entry_id:linked.monthly_income_entry_id,period:linked.period}}};await financeRemember(c,u,'receipt-unassigned',b,result,201);return result;
}
export async function treasurySnapshot(c,org,month){
 const accounts=(await c.query(`select a.id,a.name,a.account_type,a.currency,a.institution,a.custodian_user_id,a.active,custodian.name as custodian_name,custodian.photo_url as custodian_photo_url,
 a.balance::text as current_balance,
 (a.balance-coalesce(sum(m.amount) filter(where m.booked_on>=$2::date),0))::text as opening_balance,
 (a.balance-coalesce(sum(m.amount) filter(where m.booked_on>=($2::date+interval '1 month')::date),0))::text as closing_balance,
 coalesce(sum(m.amount) filter(where m.booked_on>=$2::date and m.booked_on<($2::date+interval '1 month')::date and m.amount>0),0)::text as inflows,
 coalesce(-sum(m.amount) filter(where m.booked_on>=$2::date and m.booked_on<($2::date+interval '1 month')::date and m.amount<0),0)::text as outflows
 from bank_accounts a left join lateral(select coalesce(nullif(trim(i.full_name),''),nullif(trim(c.full_name),''),u.email) as name,case when i.user_id is not null then i.photo_url else c.photo_url end as photo_url from users u left join organization_person_identity i on i.user_id=u.id and i.organization_id=a.organization_id left join agency_collaborators c on c.user_id=u.id and c.organization_id=a.organization_id where u.id=a.custodian_user_id order by c.id limit 1) custodian on true left join agency_cash_movements m on m.organization_id=a.organization_id and m.account_id=a.id
 where a.organization_id=$1 group by a.id,custodian.name,custodian.photo_url order by a.name,a.id`,[org,`${month}-01`])).rows;
 return {month,accounts};
}
async function receiptList(c,org,limit,offset=0){
 const rows=(await c.query(`select p.*,receiver.email as received_by_email,coalesce(nullif(trim(person.full_name),''),receiver.email) as received_by_name,person.photo_url as received_by_photo_url,coalesce(nullif(trim(person.full_name),''),receiver.email) as actor_name,person.photo_url as actor_photo_url,p.received_on::text as received_on,i.number as invoice_number,
 coalesce(i.client_id,l.client_id)::text as client_id,cl.name as client_name,cl.logo_url as client_logo_url,l.project_id,l.plan_id,l.monthly_income_entry_id,to_char(l.period,'YYYY-MM') as period,l.revision as links_revision,
 a.name as account_name,a.currency,a.account_type,a.institution as account_institution,a.custodian_user_id,custodian.full_name as custodian_name,custodian.photo_url as custodian_photo_url,(select x.replacement_payment_id from agency_payment_date_corrections x where x.original_payment_id=p.id) as corrected_payment_id,r.id as reversal_id,r.reason as reversal_reason,r.reversed_on::text as reversed_on,
 case when r.id is not null or p.invoice_id is not null then 0 else p.amount-coalesce((select sum(x.amount) from agency_active_payment_applications x where x.payment_id=p.id),0) end::text as available_amount
 from agency_payments p join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id
 left join agency_invoices i on i.id=p.invoice_id and i.organization_id=p.organization_id left join agency_payment_links l on l.payment_id=p.id
 left join agency_clients cl on cl.id=coalesce(i.client_id,l.client_id) and cl.organization_id=p.organization_id left join agency_payment_reversals r on r.payment_id=p.id
 left join users receiver on receiver.id=p.received_by_user_id left join lateral(select c.full_name,c.photo_url from agency_collaborators c where c.user_id=p.received_by_user_id and c.organization_id=p.organization_id order by c.id limit 1) person on true
 left join organization_person_identity custodian on custodian.organization_id=p.organization_id and custodian.user_id=a.custodian_user_id
 where p.organization_id=$1 order by p.received_on desc,p.id desc limit $2 offset $3`,[org,limit+1,offset])).rows;
 await attributeActors(c,org,[{rows,userId:'received_by_user_id',fallback:['received_by_name','received_by_email']}]);
 for(const row of rows){row.received_by_name=row.actor_name;row.received_by_photo_url=row.actor_photo_url;row.client_logo_url=mediaPhoto('client',row.client_id,row.client_logo_url);row.custodian_photo_url=mediaPhoto('person',row.custodian_user_id,row.custodian_photo_url);}
 return {payments:rows.slice(0,limit),receipts:rows.slice(0,limit),hasMore:rows.length>limit};
}
export async function financeTreasury({req,res,url,db,session,body,send}){
 if(await financePaymentReviews({req,res,url,db,session,body,send}))return true;
 const path=url.pathname,base='/api/agency/finance',payment=path.match(/^\/api\/agency\/payments\/(\d+)\/(links|applications|date-correction)(?:\/(\d+))?$/),listPayments=(path==='/api/agency/payments'||path===base+'/receipts')&&req.method==='GET';
 if(!path.startsWith(base+'/')&&!payment&&!listPayments)return false;
 if(path===base+'/balance')return false; // Separate read-only balance projection.
 let c,tx=false;
 try{
  const u=await session(req);if(!u)fail('No autenticado',401);
  const isMoney=payment||listPayments||path===base+'/opening-receivables'||path===base+'/context';
  if(!roleCan(u,path===base+'/account-openings'?'accounts.manage':isMoney?(path===base+'/opening-receivables'&&req.method==='GET'?'billing.view':'payments.manage'):'finance.view')&&!(path===base+'/opening-receivables'&&req.method==='GET'&&roleCan(u,'payments.manage')))fail('Sin permiso para este recurso financiero',403);
  c=await db.connect();await c.query('begin');tx=true;await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(u.id),req.socket.remoteAddress||'']);
  const org=u.organization_id;let result,status=200;
  if(listPayments){const rawLimit=url.searchParams.get('limit')||'20',rawOffset=url.searchParams.get('offset')||'0';if(rawLimit!=='all'&&!/^[1-9]\d{0,2}$/.test(rawLimit)||!/^\d{1,7}$/.test(rawOffset))fail('Ventana de cobros inválida');result=await receiptList(c,org,rawLimit==='all'?10000:Math.min(Number(rawLimit),100),Number(rawOffset));}
  else if(path===base+'/context'&&req.method==='GET'){
   const search='%'+text(url.searchParams.get('q')||'',120)+'%',clientKey=optId(url.searchParams.get('clientId')),limit=500,definitions={
    clients:`select r.id,r.name,r.logo_url,r.legal_name,r.tax_id,r.active from agency_clients r where r.organization_id=$1 and ${visibleRecord('r','clients')} and (r.name ilike $2 or r.id=$3::bigint) order by r.name limit 501`,
    projects:`select r.id,r.name,r.client_id from agency_projects r join agency_clients cl on cl.organization_id=r.organization_id and cl.id=r.client_id where r.organization_id=$1 and r.active=true and cl.active=true and ${visibleRecord('r','projects')} and ${visibleRecord('cl','clients')} and (($3::bigint is null and r.name ilike $2) or r.client_id=$3::bigint) order by r.name limit 501`,
    plans:`select r.id,r.name from agency_plans r where r.organization_id=$1 and r.active=true and ${visibleRecord('r','plans')} and r.name ilike $2 order by r.name limit 501`,
    accounts:`select r.id,r.name,r.currency,r.account_type,r.institution,r.custodian_user_id,i.full_name as custodian_name,i.photo_url as custodian_photo_url from bank_accounts r left join organization_person_identity i on i.organization_id=r.organization_id and i.user_id=r.custodian_user_id where r.organization_id=$1 and r.active=true and ${visibleRecord('r','accounts')} and r.name ilike $2 order by r.name limit 501`,
    receivers:`select i.user_id as id,coalesce(nullif(trim(i.full_name),''),i.email) as full_name,i.photo_url from organization_person_identity i where i.organization_id=$1 and (i.full_name ilike $2 or i.email ilike $2) order by i.full_name limit 501`,
    invoices:`select r.id,r.number,r.client_id,r.currency,r.total::text as total,r.paid_amount::text as paid_amount,r.status from agency_invoices r where r.organization_id=$1 and r.status not in ('draft','cancelled') and r.total>r.paid_amount and r.number ilike $2 order by r.due_on,r.id limit 501`,
   };
   result={capabilities:{payments_manage:true,periods_manage:u.role==='owner',finance_view:roleCan(u,'finance.view')},truncated:{}};
   for(const [key,sql] of Object.entries(definitions)){const rows=(await c.query(sql,['clients','projects'].includes(key)?[org,search,clientKey]:[org,search])).rows;result[key]=rows.slice(0,limit);result.truncated[key]=rows.length>limit;}
   result.receivers=mediaPeople(result.receivers);
   for(const row of result.clients)row.logo_url=mediaPhoto('client',row.id,row.logo_url);
   for(const row of result.accounts)row.custodian_photo_url=mediaPhoto('person',row.custodian_user_id,row.custodian_photo_url);
  }else if(payment){
   if(payment[2]==='date-correction')await lockFinanceMutation(c,org);
   const p=await owned(c,'agency_payments',payment[1],org);
   if(payment[2]==='date-correction'&&req.method==='POST'){
    const b=await body(req),on=date(b.receivedOn),why=reason(b.reason),key=requestKey(b.requestId);if(!on||!key)fail('Indicá la fecha real y el identificador de operación');if(on>await today(c))fail('La fecha del cobro no puede ser futura');
    await lockRequest(c,org,'payment-date-correction',key);
    const previous=(await c.query('select * from agency_payment_date_corrections where organization_id=$1 and (request_key=$2 or original_payment_id=$3)',[org,key,p.id])).rows[0];
    if(previous){if(previous.request_key!==key||String(previous.original_payment_id)!==String(p.id)||civilDate(previous.corrected_date)!==on)fail('El cobro ya tiene otra corrección de fecha',409);result={correction:previous,payment:await owned(c,'agency_payments',previous.replacement_payment_id,org),alreadyRecorded:true};}
    else{
     const oldDate=civilDate(p.received_on);if(oldDate===on)fail('El cobro ya tiene esa fecha');
     if((await c.query('select 1 from agency_payment_reversals where payment_id=$1',[p.id])).rows.length)fail('Un cobro revertido no se puede corregir',409);
     await guard(c,org,oldDate);await guard(c,org,on);
     const applications=(await c.query('select * from agency_active_payment_applications where payment_id=$1 order by id',[p.id])).rows;if(p.invoice_id)applications.push({invoice_id:p.invoice_id,receivable_id:null,amount:p.amount});
     const oldLinks=(await c.query('select * from agency_payment_links where payment_id=$1',[p.id])).rows[0];
     // Credit the replacement before reversing the original so a cash-neutral
     // date correction also works after part of the receipt has been spent.
     const replacement=(await c.query('insert into agency_payments(organization_id,invoice_id,account_id,amount,received_on,reference,received_by_user_id,request_key) values($1,$2,$3,$4,$5,$6,$7,$8) returning *,received_on::text as received_on',[org,null,p.account_id,p.amount,on,p.reference,p.received_by_user_id,key])).rows[0];
     if(!oldLinks&&p.invoice_id){const invoice=await owned(c,'agency_invoices',p.invoice_id,org);await saveLinks(c,u,replacement,{clientId:invoice.client_id});}
     if(oldLinks)await c.query('insert into agency_payment_links(organization_id,payment_id,client_id,project_id,plan_id,updated_by,monthly_income_entry_id,period) values($1,$2,$3,$4,$5,$6,$7,$8)',[org,replacement.id,oldLinks.client_id,oldLinks.project_id,oldLinks.plan_id,u.id,oldLinks.monthly_income_entry_id,civilDate(oldLinks.period)]);
     await c.query('insert into agency_payment_reversals(organization_id,payment_id,reason,reversed_on,created_by_user_id) values($1,$2,$3,$4,$5)',[org,p.id,'Corrección de fecha: '+why,oldDate,u.id]);
     for(const app of applications)await c.query('insert into agency_payment_applications(organization_id,payment_id,invoice_id,receivable_id,amount,created_by) values($1,$2,$3,$4,$5,$6)',[org,replacement.id,app.invoice_id,app.receivable_id,app.amount,u.id]);
     const correction=(await c.query('insert into agency_payment_date_corrections(organization_id,original_payment_id,replacement_payment_id,previous_date,corrected_date,reason,request_key,created_by) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',[org,p.id,replacement.id,oldDate,on,why,key,u.id])).rows[0];result={correction,payment:replacement};status=201;
    }
   }else if(payment[2]==='links'&&req.method==='PATCH'){

    const b=await body(req),old=(await c.query('select * from agency_payment_links where payment_id=$1',[p.id])).rows[0];
    if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision!==(old?.revision||0))fail('Las asociaciones cambiaron. Actualizá antes de guardar.',409);
    result={links:await saveLinks(c,u,p,b)};
   }else if(payment[2]==='applications'&&req.method==='GET'){
    const applications=(await c.query('select a.*,r.id as reversal_id,a.created_at as linked_at from agency_payment_applications a left join agency_payment_application_reversals r on r.application_id=a.id where a.payment_id=$1 and a.organization_id=$2 order by a.id',[p.id,org])).rows;
    const used=(await c.query('select coalesce(sum(amount),0)::text as amount from agency_active_payment_applications where payment_id=$1',[p.id])).rows[0].amount;
    const reversed=(await c.query('select 1 from agency_payment_reversals where payment_id=$1',[p.id])).rows.length>0;
    result={applications,available_amount:p.invoice_id||reversed?'0':(await c.query('select ($1::numeric-$2::numeric)::text as amount',[p.amount,used])).rows[0].amount};
   }else if(payment[2]==='applications'&&req.method==='POST'&&!payment[3]){
    const b=await body(req),key=requestKey(b.requestId),paid=positive(b.amount),invoice=optId(b.invoiceId),debt=optId(b.receivableId);if(Boolean(invoice)===Boolean(debt))fail('Elegí una factura o una mora inicial');
    await lockRequest(c,org,'payment-application',key);const prior=key?(await c.query('select * from agency_payment_applications where organization_id=$1 and request_key=$2',[org,key])).rows[0]:null;
    if(prior){if(String(prior.payment_id)!==String(p.id)||String(prior.invoice_id??'')!==String(invoice??'')||String(prior.receivable_id??'')!==String(debt??'')||Number(prior.amount)!==paid)fail('El identificador ya fue usado para otra aplicación',409);result={application:prior,alreadyRecorded:true};}
    else{const target=await owned(c,invoice?'agency_invoices':'agency_opening_receivables',invoice||debt,org);const old=(await c.query('select * from agency_payment_links where payment_id=$1',[p.id])).rows[0];
     await saveLinks(c,u,p,{clientId:old?.client_id||target.client_id,projectId:old?.project_id,planId:old?.plan_id});
     result={application:(await c.query('insert into agency_payment_applications(organization_id,payment_id,invoice_id,receivable_id,amount,request_key,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *',[org,p.id,invoice,debt,paid,key,u.id])).rows[0]};status=201;}
   }else if(payment[2]==='applications'&&req.method==='DELETE'&&payment[3]){
    const b=await body(req),why=reason(b.reason),app=await owned(c,'agency_payment_applications',payment[3],org);if(String(app.payment_id)!==String(p.id))fail('Aplicación no encontrada',404);
    const prior=(await c.query('select * from agency_payment_application_reversals where application_id=$1',[app.id])).rows[0];
    result={reversal:prior||(await c.query('insert into agency_payment_application_reversals(organization_id,application_id,reason,created_by) values($1,$2,$3,$4) returning *',[org,app.id,why,u.id])).rows[0],alreadyReversed:Boolean(prior)};
   }else fail('Método no permitido',405);
  }else if(path===base+'/opening-receivables'){
   if(req.method==='GET')result={receivables:(await c.query('select d.*,d.period::text as period,d.due_on::text as due_on,d.expected_on::text as expected_on,c.name as client_name from agency_opening_receivable_balances d join agency_clients c on c.organization_id=d.organization_id and c.id=d.client_id where d.organization_id=$1 order by d.due_on,d.id',[org])).rows};
   else if(req.method==='POST'){
    const b=await body(req),paid=positive(b.amount),currency=currencies.includes(b.currency)?b.currency:fail('Moneda inválida'),period=forecastMonth(b.period)+'-01',due=date(b.dueOn),why=reason(b.reason),key=requestKey(b.requestId);
    if(!due)fail('Indicá el vencimiento real de la deuda');if(typeof b.forecastIncluded!=='boolean')fail('Indicá si incluir la deuda en previsión');
    await lockRequest(c,org,'opening-receivable',key);const prior=key?(await c.query('select * from agency_opening_receivables where organization_id=$1 and request_key=$2',[org,key])).rows[0]:null;
    if(prior){if(String(prior.client_id)!==id(b.clientId)||Number(prior.amount)!==paid||prior.currency!==currency||civilDate(prior.period)!==period||civilDate(prior.due_on)!==due||civilDate(prior.expected_on)!==date(b.expectedOn)||prior.reason!==why||prior.forecast_included!==b.forecastIncluded)fail('El identificador ya fue usado para otra mora',409);result={receivable:prior,alreadyRecorded:true};}
    else{await guard(c,org,period);await links(c,u,{clientId:b.clientId});if(!b.clientId)fail('Seleccioná el cliente');result={receivable:(await c.query('insert into agency_opening_receivables(organization_id,client_id,amount,currency,period,due_on,reason,forecast_included,request_key,created_by,expected_on) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *,period::text as period,due_on::text as due_on,expected_on::text as expected_on',[org,id(b.clientId),paid,currency,period,due,why,b.forecastIncluded,key,u.id,date(b.expectedOn)])).rows[0]};status=201;}
   }else fail('Método no permitido',405);
  }else if(path===base+'/account-openings'&&req.method==='POST'){
   const b=await body(req),on=date(b.openedOn),paid=positive(b.amount),why=reason(b.reason),key=requestKey(b.requestId);if(!on||!key)fail('Indicá fecha de apertura e identificador de operación');if(on>await today(c))fail('La fecha de apertura no puede ser futura');
   await lockFinanceMutation(c,org);await lockRequest(c,org,'account-opening',key);
   const prior=(await c.query('select *,opened_on::text as opened_on from agency_account_openings where organization_id=$1 and request_key=$2',[org,key])).rows[0];
   if(prior){if(String(prior.account_id)!==id(b.accountId)||Number(prior.amount)!==paid||prior.opened_on!==on)fail('El identificador ya fue usado para otra apertura',409);result={opening:prior,alreadyRecorded:true};}
   else{await guard(c,org,on);await owned(c,'bank_accounts',b.accountId,org);result={opening:(await c.query('insert into agency_account_openings(organization_id,account_id,amount,opened_on,reason,request_key,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *,opened_on::text as opened_on',[org,id(b.accountId),paid,on,why,key,u.id])).rows[0]};status=201;}
  }else if(path===base+'/treasury'&&req.method==='GET'){
   const month=forecastMonth(url.searchParams.get('month')),snapshot=await treasurySnapshot(c,org,month);
   const period=(await c.query("select *,to_char(month,'YYYY-MM') as month from agency_finance_periods where organization_id=$1 and month=$2::date",[org,month+'-01'])).rows[0]||null;
   const movements=(await c.query(`select m.*,m.booked_on::text as booked_on,m.reference as reference from agency_cash_movements m where m.organization_id=$1 and m.booked_on>=$2::date and m.booked_on<($2::date+interval '1 month')::date and ($3 or m.movement_type<>'payout' or exists(select 1 from agency_payouts p where p.organization_id=m.organization_id and p.id=m.movement_id and p.commission_id is not null)) order by m.booked_on desc,m.account_id,m.movement_id`,[org,month+'-01',roleCan(u,'salary.view')])).rows;
   result={...snapshot,period,movements,restricted_movements:!roleCan(u,'salary.view')};
  }else if(path===base+'/periods'&&req.method==='GET')result={periods:(await c.query("select organization_id,to_char(month,'YYYY-MM') as month,status,revision,reason,closed_at,reopened_at,updated_by from agency_finance_periods where organization_id=$1 order by month desc",[org])).rows};
  else{
   const match=path.match(/^\/api\/agency\/finance\/periods\/(\d{4}-\d{2})\/(close|reopen)$/);if(!match||req.method!=='POST')fail('Ruta no encontrada',404);
   if(u.role!=='owner')fail('Solo el dueño puede cerrar o reabrir períodos',403);
   const month=forecastMonth(match[1]),action=match[2],b=await body(req),why=reason(b.reason),on=month+'-01';if(month>(await today(c)).slice(0,7))fail('No se puede cerrar un mes futuro');
   await c.query('select lock_agency_finance_period($1,$2::date)',[org,on]);
   const old=(await c.query('select * from agency_finance_periods where organization_id=$1 and month=$2::date for update',[org,on])).rows[0];
   if(!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision!==(old?.revision||0))fail('El cierre cambió. Actualizá antes de continuar.',409);
   if(action==='reopen'&&old?.status!=='closed'||action==='close'&&old?.status==='closed')fail('El período ya tiene ese estado',409);
   const snapshot=action==='close'?await treasurySnapshot(c,org,month):old.snapshot;
   const period=(await c.query(`insert into agency_finance_periods(organization_id,month,status,revision,reason,closed_at,reopened_at,updated_by,snapshot) values($1,$2,$3,$4,$5,case when $3='closed' then now() else null end,case when $3='open' then now() else null end,$6,$7::jsonb) on conflict(organization_id,month) do update set status=excluded.status,revision=excluded.revision,reason=excluded.reason,closed_at=case when excluded.status='closed' then now() else agency_finance_periods.closed_at end,reopened_at=excluded.reopened_at,updated_by=excluded.updated_by,snapshot=excluded.snapshot returning *,to_char(month,'YYYY-MM') as month`,[org,on,action==='close'?'closed':'open',(old?.revision||0)+1,why,u.id,JSON.stringify(snapshot)])).rows[0];
   await c.query('insert into agency_finance_period_events(organization_id,month,action,reason,actor_user_id,revision,snapshot) values($1,$2,$3,$4,$5,$6,$7::jsonb)',[org,on,action,why,u.id,period.revision,JSON.stringify(snapshot)]);result={period};
  }
  await c.query('commit');tx=false;send(res,status,result);
 }catch(error){if(tx)await c.query('rollback');const financial=financeError(error);send(res,error.status||financial?.status||(error.code==='23505'?409:500),{error:error.status?error.message:financial?.message||(error.code==='23505'?'La operación ya está registrada.':'No se pudo completar la operación financiera.')});}finally{c?.release();}
 return true;
}
