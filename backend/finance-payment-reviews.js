import {roleCan} from './permissions.js';
import {fail,id,text} from './suite-validation.js';
import {forecastMonth} from './forecast.js';
import {financeRetry,financeRemember} from './finance-idempotency.js';
import {financeError,lockFinanceMutation} from './finance-treasury.js';
import {visibleRecord} from './record-lifecycle.js';
import {mediaPhoto} from './agency-media.js';
export async function paymentReviews(c,org,month,clientId=null,limit=50,offset=0){
 const clients=(await c.query(`select cl.id::text as client_id,cl.name,cl.logo_url,cl.legal_name,cl.tax_id,cl.active,cl.relationship_started_on::text,
 case when r.status='reviewed' then 'reviewed' else 'pending_review' end as verification_status,$2::text as verification_month,
 coalesce(r.revision,0) as revision,coalesce(r.note,'') as note,r.reviewed_at,r.reviewed_by::text
 from agency_clients cl left join agency_client_payment_reviews r on r.organization_id=cl.organization_id and r.client_id=cl.id and r.month=($2||'-01')::date
 where cl.organization_id=$1 and ${visibleRecord('cl','clients')} and ($3::bigint is null or cl.id=$3) order by cl.name,cl.id limit $4 offset $5`,[org,month,clientId,clientId?1:limit+1,offset])).rows;
 for(const row of clients){
  row.logo_url=mediaPhoto('client',row.client_id,row.logo_url);
  const params=[org,row.client_id,month+'-01'];
  const [payments,debts,income,terms]=[
   await c.query(`select p.id::text,p.amount::text,a.currency,p.received_on::text,p.account_id::text,p.invoice_id::text,p.reference,r.id::text as reversal_id,r.reversed_on::text from agency_payments p join bank_accounts a on a.id=p.account_id and a.organization_id=p.organization_id left join agency_invoices i on i.organization_id=p.organization_id and i.id=p.invoice_id left join agency_payment_links l on l.organization_id=p.organization_id and l.payment_id=p.id left join agency_payment_reversals r on r.organization_id=p.organization_id and r.payment_id=p.id where p.organization_id=$1 and coalesce(i.client_id,l.client_id)=$2 and p.received_on>=$3::date and p.received_on<($3::date+interval '1 month') order by p.received_on,p.id`,params),
   await c.query('select id::text,amount::text,currency,period::text,due_on::text,expected_on::text,outstanding_amount::text from agency_opening_receivable_balances where organization_id=$1 and client_id=$2 order by due_on,id',params.slice(0,2)),
   await c.query('select id::text,kind,label,amount::text,currency,month::text from agency_client_monthly_income where organization_id=$1 and client_id=$2 and month=$3::date and deleted_at is null order by kind,id',params),
   await c.query('select client_id::text,plan_id::text,plan_name,currency,recurring_amount::text,starts_on::text,ends_on::text from agency_commercial_terms_for_month($1,$3::date) where client_id=$2',params),
  ];
  row.evidence={payments:payments.rows,opening_receivables:debts.rows,monthly_income:income.rows,commercial_terms:terms.rows};
  row.missing={relationship_started_on:!row.relationship_started_on,agreement:terms.rows.length===0&&income.rows.length===0,payment_evidence:payments.rows.filter(p=>!p.reversal_id).length===0};
 }
 return clients;
}
export async function financePaymentReviews({req,res,url,db,session,body,send}){
 const match=url.pathname.match(/^\/api\/agency\/finance\/payment-reviews(?:\/([1-9]\d*))?$/);if(!match)return false;let c;
 try{
  const user=await session(req);if(!user)fail('No autenticado',401);if(!roleCan(user,req.method==='GET'?'billing.view':'payments.manage'))fail('Tu rol no permite revisar cobros',403);
  if(req.method==='GET'){
   const month=forecastMonth(url.searchParams.get('month')),limit=Number(url.searchParams.get('limit')||50),offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(limit)||limit<1||limit>100||!Number.isSafeInteger(offset)||offset<0||offset>10000)fail('Paginación inválida');const clients=await paymentReviews(db,user.organization_id,month,match[1]||null,limit,offset);if(match[1]&&!clients.length)fail('Cliente no disponible',404);send(res,200,{month,clients:clients.slice(0,limit),hasMore:clients.length>limit,limit,offset,definition:'Revisión documental independiente del saldo. Revisado no acredita cobro ni elimina deuda; pagos reales conservan fecha, cuenta y trazabilidad.'});return true;
  }
  if(req.method!=='PATCH'||!match[1])fail('Método no permitido',405);
  const b=await body(req);if(!b||typeof b!=='object'||Array.isArray(b)||Object.keys(b).some(k=>!['month','status','note','expectedRevision','requestId'].includes(k)))fail('Campos de revisión inválidos');
  const month=forecastMonth(b.month),note=text(b.note,1000);if(!['pending','reviewed'].includes(b.status)||!Number.isSafeInteger(b.expectedRevision)||b.expectedRevision<0)fail('Estado o revisión inválida');if(note.length<5)fail('Explicá la revisión o los datos pendientes');
  c=await db.connect();await c.query('begin');await c.query("select set_config('app.current_user',$1,true),set_config('app.current_ip',$2,true)",[String(user.id),req.socket?.remoteAddress||'']);await lockFinanceMutation(c,user.organization_id);
  const retry=await financeRetry(c,user,`payment-review:${match[1]}`,b,{required:true});if(retry){await c.query('commit');send(res,200,retry.response);return true;}
  const cl=(await c.query(`select id from agency_clients cl where cl.organization_id=$1 and cl.id=$2 and ${visibleRecord('cl','clients')} for update`,[user.organization_id,id(match[1])])).rows[0];if(!cl)fail('Cliente no disponible',404);
  await c.query('select assert_agency_finance_period_open($1,$2::date)',[user.organization_id,month+'-01']);
  const old=(await c.query('select revision from agency_client_payment_reviews where organization_id=$1 and client_id=$2 and month=$3::date for update',[user.organization_id,cl.id,month+'-01'])).rows[0];if((old?.revision||0)!==b.expectedRevision)fail('La revisión cambió. Recargá antes de guardar.',409);
  const revision=(old?.revision||0)+1;
  await c.query(`insert into agency_client_payment_reviews(organization_id,client_id,month,status,note,revision,reviewed_by,reviewed_at) values($1,$2,$3::date,$4,$5,$6,$7,now()) on conflict(organization_id,client_id,month) do update set status=excluded.status,note=excluded.note,revision=excluded.revision,reviewed_by=excluded.reviewed_by,reviewed_at=excluded.reviewed_at`,[user.organization_id,cl.id,month+'-01',b.status,note,revision,user.id]);
  await c.query('insert into agency_client_payment_review_events(organization_id,client_id,month,status,note,revision,actor_user_id) values($1,$2,$3::date,$4,$5,$6,$7)',[user.organization_id,cl.id,month+'-01',b.status,note,revision,user.id]);
  const result={month,client:(await paymentReviews(c,user.organization_id,month,cl.id))[0]};await financeRemember(c,user,`payment-review:${match[1]}`,b,result,200);await c.query('commit');send(res,200,result);
 }catch(error){if(c)await c.query('rollback');const e=financeError(error)||error;send(res,e.status||500,{error:e.status?e.message:'No se pudo revisar la información del mes'});}finally{c?.release();}return true;
}
