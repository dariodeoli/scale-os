import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {economicHistory} from './economic-history.js';
import {reports} from './reports.js';
import {operations} from './operations.js';
import {financialForecast} from './forecast.js';
import {financeTreasury} from './finance-treasury.js';
import {financeControls} from './finance-controls.js';
export async function economicHistoryCases(db){
 const q=(s,a=[])=>db.query(s,a),one=async(s,a)=>(await q(s,a)).rows[0];
 const org=(await one("insert into organizations(slug,name) values('history-fixture','History') returning id")).id;
 const other=(await one("insert into organizations(slug,name) values('history-other','Other') returning id")).id;
 const uid=(await one("insert into users(email,password_hash) values('history@example.invalid','unused') returning id")).id;
 await q("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
 const actor={id:uid,organization_id:org,role:'owner'};
 async function call(path,method='GET',payload={},as=actor){let result;const args={req:{method,socket:{remoteAddress:'fixture'}},res:{},url:new URL('https://fixture.invalid/api/agency'+path),db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>result={status,...data}};for(const f of [economicHistory,reports,operations,financialForecast,financeTreasury,financeControls])if(await f(args))return result;throw Error('Unhandled '+path);}
 await q("select set_config('app.salary_effective_from','2026-07-01',false)");
 const person=(await one("insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency,started_on) values($1,'Persona','fixed',500,'USD','2026-07-01') returning id",[org])).id;
 await q("select set_config('app.salary_effective_from','',false)");
 const customer=(await one("insert into agency_clients(organization_id,name) values($1,'Cliente') returning id",[org])).id;
 const foreign=(await one("insert into agency_clients(organization_id,name) values($1,'Ajeno') returning id",[other])).id;
 const plan=(await one("insert into agency_plans(organization_id,name,currency,items) values($1,'Plan A','USD','[]') returning id",[org])).id;
 const planB=(await one("insert into agency_plans(organization_id,name,currency,items) values($1,'Plan B','USD','[]') returning id",[org])).id;
 const salary='/collaborators/'+person+'/salary-history',commercial='/clients/'+customer+'/commercial-terms',history='/clients/'+customer+'/plan-history';
 let r=await call(salary);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.records[0].after_amount,'500.00');assert.equal(r.records[0].effective_from,'2026-07-01');
 const change=async(amount,effective)=>{const h=await call(salary);return {amount,currency:'USD',compensationType:'fixed',effectiveFrom:effective,reason:'Cambio salarial acordado',requestId:randomUUID(),expectedRevision:h.revision};};
 const august=await change('600','2026-08-01');r=await call(salary,'POST',august);assert.equal(r.status,201,JSON.stringify(r));
 assert.equal((await call(salary,'POST',august)).alreadyRecorded,true);
 assert.equal((await call(salary,'POST',{...august,amount:601})).status,409);
 const september=await change('750','2026-09-01');assert.equal((await call(salary,'POST',september)).status,201);
 assert.equal((await call(salary,'POST',{...september,requestId:randomUUID()})).status,409,'optimistic revision');
 const salaryAt=async(month)=>(await one("select agency_salary_at($1,$2,$3::date)->>'amount' as amount",[org,person,month])).amount;
 assert.equal(await salaryAt('2026-07-31'),'500.00');assert.equal(await salaryAt('2026-08-31'),'600.00');assert.equal(await salaryAt('2026-09-30'),'750.00');
 const terms=(price,from,revision,which=plan)=>({planId:String(which),recurringAmount:String(price),currency:'USD',startsOn:'2026-07-01',endsOn:null,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none',commissionValue:null,cadence:'monthly',intervalMonths:1,effectiveFrom:from,reason:'Cambio comercial acordado',requestId:randomUUID(),expectedRevision:revision});
 let t=terms(1000,'2026-07-01','0');r=await call(commercial,'PATCH',t);assert.equal(r.status,200,JSON.stringify(r));
 let h=await call(history);assert.equal(h.records.length,1,JSON.stringify(h));t=terms(1200,'2026-08-01',h.revision,planB);r=await call(commercial,'PATCH',t);assert.equal(r.status,200,JSON.stringify(r));
 assert.equal((await call(commercial,'PATCH',t)).alreadyRecorded,true);h=await call(history);t=terms(1500,'2026-09-01',h.revision);assert.equal((await call(commercial,'PATCH',t)).status,200);
 h=await call(history);assert.equal(h.records.length,3);assert.equal(h.records[0].before_amount,'1200.00');assert.equal(h.records[0].after_amount,'1500.00');assert.equal(h.records[0].before_plan_name,'Plan B');
 const correction=terms(1600,'2026-09-01',h.revision,planB);r=await call(commercial,'PATCH',correction);assert.equal(r.status,200,JSON.stringify(r));
 const sameMonth=await call(history);assert.equal(sameMonth.records.length,4);assert.equal(sameMonth.records[0].before_amount,'1500.00');assert.equal(sameMonth.records[0].after_amount,'1600.00');
 // IDs are numeric revisions, even once the timeline crosses 9 -> 10.
 for(const price of [1601,1602,1603,1604,1605,1606,1600]){
  const current=await call(history);r=await call(commercial,'PATCH',terms(price,'2026-09-01',current.revision,planB));assert.equal(r.status,200,JSON.stringify(r));
 }
 const numericPlanHistory=await call(history),maxPlan=await one('select max(id)::text as revision from agency_client_commercial_terms where organization_id=$1 and client_id=$2',[org,customer]);
 assert.equal(numericPlanHistory.revision,maxPlan.revision);assert.equal(numericPlanHistory.records[0].id,maxPlan.revision);
 assert.equal(Number((await one("select sum(recurring_amount) as amount from agency_commercial_terms_for_month($1,'2026-09-01') where client_id=$2",[org,customer])).amount),1600,'canonical month selects one revision');
 assert.equal(Number((await one("select sum(recurring_amount) as amount from agency_commercial_terms_on($1,'2026-09-01') where client_id=$2",[org,customer])).amount),1600,'canonical day selects one revision');
 for(const [month,base,contracted] of [['2026-07','500.00','1000'],['2026-08','600.00','1200'],['2026-09','750.00','1600']]){
  r=await call('/finance/balance-details?month='+month);assert.equal(r.status,200,JSON.stringify(r));assert.equal(r.personnel.records[0].base_amount,base);assert.equal(Number(r.clients.records[0].contracted_amount),Number(contracted));
  const forecast=await call('/forecast?month='+month);assert.equal(forecast.status,200,JSON.stringify(forecast));assert.equal(forecast.personnel.records[0].base_amount,Number(base));assert.equal(forecast.contracted_recurring.records[0].amount,Number(contracted));
 }
 // Both editors must agree for a fixed salary. Each write is one event,
 // and current-month changes leave the two preceding agreements untouched.
 const observedNow=(await one("select to_char(clock_timestamp() at time zone 'America/Asuncion','YYYY-MM') as month")).month;
 const fixedRow=async()=>{const result=await call('/collaborators');assert.equal(result.status,200);return result.collaborators.find(x=>String(x.id)===String(person));};
 let fixed=await fixedRow();assert.equal(String(fixed.compensation_amount),'750.00');assert.equal(String(fixed.monthly_salary_amount),'750.00');assert.equal(fixed.currency,fixed.monthly_salary_currency);
 const currentHistory=await call(salary),eventsBeforeContact=currentHistory.records.length;
 r=await call('/collaborators/'+person,'PATCH',{notes:'Sólo datos de contacto'});assert.equal(r.status,200,JSON.stringify(r));assert.equal((await call(salary)).records.length,eventsBeforeContact,'contact-only patch cannot add salary history');
 r=await call('/collaborators/'+person,'PATCH',{compensation_amount:'800.25',currency:'USD'});assert.equal(r.status,200,JSON.stringify(r));
 fixed=await fixedRow();assert.equal(String(fixed.compensation_amount),'800.25');assert.equal(String(fixed.monthly_salary_amount),'800.25');assert.equal((await call(salary)).records.length,eventsBeforeContact+1);
 let currentBalance=(await call('/finance/balance-details?month='+observedNow)).personnel.records.find(x=>x.collaborator_id===String(person));assert.equal(currentBalance.base_amount,'800.25');assert.equal(currentBalance.currency,'USD');
 r=await call('/collaborators/'+person,'PATCH',{compensation_amount:'900',currency:'PYG'});assert.equal(r.status,200,JSON.stringify(r));
 fixed=await fixedRow();assert.equal(String(fixed.compensation_amount),'900.00');assert.equal(String(fixed.monthly_salary_amount),'900.00');assert.equal(fixed.currency,'PYG');assert.equal(fixed.monthly_salary_currency,'PYG');
 assert.equal((await call('/collaborators/'+person,'PATCH',{compensation_amount:'900.25',currency:'PYG'})).status,400,'fixed monthly sync rejects fractional guaranies');
 const beforeBalanceEdit=await call(salary),balanceEdit={amount:'1000.25',currency:'USD',effectiveFrom:observedNow+'-01',reason:'Cambio fijo desde Balance',requestId:randomUUID(),expectedRevision:beforeBalanceEdit.revision};
 r=await call(salary,'POST',balanceEdit);assert.equal(r.status,201,JSON.stringify(r));assert.equal(r.records.length,beforeBalanceEdit.records.length+1);assert.equal((await call(salary,'POST',balanceEdit)).alreadyRecorded,true);
 fixed=await fixedRow();assert.equal(String(fixed.compensation_amount),'1000.25');assert.equal(String(fixed.monthly_salary_amount),'1000.25');assert.equal(fixed.currency,'USD');assert.equal(fixed.monthly_salary_currency,'USD');
 assert.equal((await call(salary,'POST',{...balanceEdit,requestId:randomUUID()})).status,409);
 assert.equal(await salaryAt('2026-07-31'),'500.00');assert.equal(await salaryAt('2026-08-31'),'600.00');assert.equal(await salaryAt('2026-09-30'),'750.00');
 for(const mode of ['hourly','per_project']){
  const feePerson=(await one(`insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency) values($1,$2,$3,50,'USD') returning id`,[org,'Fee '+mode,mode])).id;
  const feePath='/collaborators/'+feePerson+'/salary-history',feeHistory=await call(feePath);
  r=await call(feePath,'POST',{amount:'1200',currency:'PYG',effectiveFrom:observedNow+'-01',reason:'Mensual separado de honorario',requestId:randomUUID(),expectedRevision:feeHistory.revision});assert.equal(r.status,201,JSON.stringify(r));
  const fee=(await call('/collaborators')).collaborators.find(x=>String(x.id)===String(feePerson));assert.equal(fee.compensation_type,mode);assert.equal(String(fee.compensation_amount),'50.00');assert.equal(fee.currency,'USD');assert.equal(String(fee.monthly_salary_amount),'1200.00');assert.equal(fee.monthly_salary_currency,'PYG');
  r=await call('/collaborators/'+feePerson,'PATCH',{compensation_amount:'75',currency:'USD'});assert.equal(r.status,200,JSON.stringify(r));assert.equal(String(r.collaborator.monthly_salary_amount),'1200.00');assert.equal(r.collaborator.monthly_salary_currency,'PYG');
 }
 const account=(await one("insert into bank_accounts(organization_id,name,account_type,currency) values($1,'Caja','cash','USD') returning id",[org])).id;
 const old=(await one("insert into agency_invoices(organization_id,client_id,number,currency,total,status,issued_on,due_on) values($1,$2,'F-OLD','USD',500,'issued','2026-08-01','2026-08-10') returning id",[org,customer])).id;
 const current=(await one("insert into agency_invoices(organization_id,client_id,number,currency,total,status,issued_on,due_on) values($1,$2,'F-NOW','USD',1000,'issued','2026-09-01','2026-09-10') returning id",[org,customer])).id;
 const receive=async(amount,clientId=customer)=>(await call('/payments','POST',{mode:'unassigned',amount,accountId:account,clientId,receivedOn:'2026-09-10',reference:'Cobro real',requestId:randomUUID()}));
 r=await receive(200);assert.equal(r.status,201,JSON.stringify(r));const pay=r.payment;
 r=await call('/payments/'+pay.id+'/applications','POST',{invoiceId:old,amount:200,requestId:randomUUID()});assert.equal(r.status,201,JSON.stringify(r));
 assert.equal((await receive(50)).status,201);
 assert.equal((await receive(25,null)).status,201);
 let details=await call('/finance/balance-details?month=2026-09');assert.equal(details.status,200,JSON.stringify(details));let row=details.clients.records[0];
 assert.equal(Number(row.received_in_month),250);assert.equal(Number(row.applied_to_month_invoices),0);assert.equal(Number(row.unallocated_received_in_month),50);assert.equal(Number(row.registered_outstanding),1300);assert.equal(Number(details.totals[0].received_in_month),275);
 r=await receive(100);assert.equal(r.status,201);assert.equal((await call('/payments/'+r.payment.id+'/applications','POST',{invoiceId:current,amount:100,requestId:randomUUID()})).status,201);
 details=await call('/finance/balance-details?month=2026-09');row=details.clients.records[0];assert.equal(Number(row.received_in_month),350);assert.equal(Number(row.applied_to_month_invoices),100);assert.equal(Number(row.registered_outstanding),1200);
 const restricted={...actor,role:'sales',capabilities:{'finance.view':true,'salary.view':false}};
 assert.equal((await call(salary,'GET',{},restricted)).status,403);assert.equal((await call(salary,'POST',september,restricted)).status,403);
 details=await call('/finance/balance-details?month=2026-09','GET',{},restricted);for(const field of ['base_amount','override_amount','expected_amount','paid_in_month','outstanding_amount'])assert.equal(details.personnel.records.find(x=>x.collaborator_id===String(person))[field],null);
 assert.equal((await call('/clients/'+foreign+'/plan-history')).status,404);
 assert.equal((await call('/finance/balance-details','GET',{},null)).status,401);
 assert.equal((await call('/finance/balance-details','GET',{}, {...actor,role:'viewer'})).status,403);
 // Lifecycle discounts retain their original precision; public money follows
 // the currency instead of leaking an arbitrary numeric division scale.
 const discounted=(await one("insert into agency_clients(organization_id,name) values($1,'ZZ Descuento USD') returning id",[org])).id;
 await q("insert into agency_client_commercial_terms(organization_id,client_id,activation_date,effective_from,starts_on,plan_name,plan_version,monthly_price,currency,discount_type,discount_value,invoice_required,commission_mode) values($1,$2,'2026-07-01','2026-07-01','2026-07-01','Descuento','fixture',100.25,'USD','percent',7,false,'none')",[org,discounted]);
 let discountHistory=await call('/clients/'+discounted+'/plan-history');assert.equal(discountHistory.records[0].after_amount,'93.23');
 let discountBalance=await call('/finance/balance-details?month=2026-09');assert.equal(discountBalance.clients.records.find(x=>x.client_id===String(discounted)).contracted_amount,'93.23');
 const storedPrice=await one('select monthly_price::text as amount from agency_client_commercial_terms where organization_id=$1 and client_id=$2',[org,discounted]);assert.equal(storedPrice.amount,'100.25');
 // Explicit monthly pay is independent of a variable/hourly fee and its currency.
 await q("select set_config('app.salary_effective_from','2026-07-01',false)");
 const variable=(await one("insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency,monthly_salary_amount,monthly_salary_currency,started_on) values($1,'Variable mensual','variable',50,'USD',1000,'PYG','2001-01-01') returning id",[org])).id;
 await q("select set_config('app.salary_effective_from','',false)");
 const variablePath='/collaborators/'+variable+'/salary-history',variableHistory=await call(variablePath);
 assert.equal(variableHistory.records[0].after_amount,'1000');assert.equal(variableHistory.records[0].currency,'PYG');
 r=await call(variablePath,'POST',{amount:1200,currency:'PYG',effectiveFrom:'2026-08-01',reason:'Mensual explícito acordado',requestId:randomUUID(),expectedRevision:variableHistory.revision});assert.equal(r.status,201,JSON.stringify(r));
 const rawVariable=await one('select compensation_type,compensation_amount::text,currency,monthly_salary_amount::text,monthly_salary_currency from agency_collaborators where id=$1',[variable]);
 assert.deepEqual(rawVariable,{compensation_type:'variable',compensation_amount:'50.00',currency:'USD',monthly_salary_amount:'1200.00',monthly_salary_currency:'PYG'});
 await q("insert into agency_payouts(organization_id,collaborator_id,account_id,amount,paid_on,reference,created_by_user_id) values($1,$2,$3,100,'2026-09-12','Pago de fee variable',$4)",[org,variable,account,uid]);
 details=await call('/finance/balance-details?month=2026-09');
 const monthly=details.personnel.records.find(x=>x.collaborator_id===String(variable)&&x.currency==='PYG'),feePaid=details.personnel.records.find(x=>x.collaborator_id===String(variable)&&x.currency==='USD');
 assert.equal(monthly.base_amount,'1200');assert.equal(monthly.salary_editable,true);assert.equal(monthly.salary_source,'monthly');assert.equal(feePaid.salary_editable,false);assert.equal(Number(feePaid.paid_in_month),100);
 const julyVariable=(await call('/finance/balance-details?month=2026-07')).personnel.records.find(x=>x.collaborator_id===String(variable));assert.equal(julyVariable.base_amount,'1000');
 const forecastVariable=await call('/forecast?month=2026-09');assert.equal(forecastVariable.personnel.records.find(x=>x.currency==='PYG').base_amount,1200);
 assert.equal(Number(details.clients.records[0].expected_receipts),Number(details.totals.find(x=>x.currency==='USD').expected_receipts));
 // New profiles with an old employment date record only the observed month,
 // never a made-up salary agreement starting in 2001.
 const observed=(await one("insert into agency_collaborators(organization_id,full_name,compensation_amount,currency,started_on) values($1,'Observado hoy',123,'USD','2001-01-01') returning id",[org])).id;
 const observedHistory=await call('/collaborators/'+observed+'/salary-history');assert.notEqual(observedHistory.records[0].effective_from,'2001-01-01');
 const observedMonth=(await one("select date_trunc('month',clock_timestamp() at time zone 'America/Asuncion')::date::text as month")).month;assert.equal(observedHistory.records[0].effective_from,observedMonth);
 // Economic snapshots cannot be rewritten through a direct source UPDATE.
 await assert.rejects(q('update agency_salary_history set reason=reason where organization_id=$1',[org]),/append-only/);
 await assert.rejects(q('update agency_client_commercial_terms set recurring_amount=recurring_amount+1 where organization_id=$1 and client_id=$2',[org,customer]),/immutable/);
 const auditBefore=await one('select (select count(*) from agency_invoices where organization_id=$1) as invoices,(select sum(balance) from bank_accounts where organization_id=$1) as cash,(select count(*) from agency_payouts where organization_id=$1) as payouts',[org]);
 await call(salary,'POST',await change('800','2026-10-01'));
 const newestSalary=await call(salary),maxSalary=await one('select max(id)::text as revision from agency_salary_history where organization_id=$1 and collaborator_id=$2',[org,person]);assert.equal(newestSalary.revision,maxSalary.revision);assert.equal(newestSalary.records[0].id,maxSalary.revision);
 const auditAfter=await one('select (select count(*) from agency_invoices where organization_id=$1) as invoices,(select sum(balance) from bank_accounts where organization_id=$1) as cash,(select count(*) from agency_payouts where organization_id=$1) as payouts',[org]);assert.deepEqual(auditBefore,auditAfter);
 r=await call('/finance/periods/2026-09/close','POST',{reason:'Cierre para probar vigencia protegida',expectedRevision:0});assert.equal(r.status,200,JSON.stringify(r));
 const blocked=await change('900','2026-09-01');assert.equal((await call(salary,'POST',blocked)).status,409);
 h=await call(history);assert.equal((await call(commercial,'PATCH',terms(1800,'2026-09-15',h.revision))).status,409);
 // Profile removal anonymizes identity and retains immutable accounting history.
 const beforeHistory=await one('select count(*) as n from agency_salary_history where organization_id=$1 and collaborator_id=$2',[org,person]);
 await q("update agency_collaborators set full_name='Persona suprimida',email=null,photo_url=null,notes='',active=false where organization_id=$1 and id=$2",[org,person]);
 await q("update organization_members set active=false,removed_at=clock_timestamp() where organization_id=$1 and user_id=$2",[org,uid]);
 assert.deepEqual(await one('select count(*) as n from agency_salary_history where organization_id=$1 and collaborator_id=$2',[org,person]),beforeHistory);
 // Notes can be scrubbed after close without rewriting an amount or opening money.
 await q("update agency_salary_month_overrides set note=null where organization_id=$1",[org]);
 // The actual observed month is still open; an explicitly backdated insert must fail.
 await q("select set_config('app.salary_effective_from','2026-09-01',false)");
 await assert.rejects(q("insert into agency_collaborators(organization_id,full_name,compensation_amount) values($1,'Vigencia cerrada',1)",[org]),/cerrado/);
 await q("select set_config('app.salary_effective_from','',false)");
 await q("update organization_members set active=true,removed_at=null where organization_id=$1 and user_id=$2",[org,uid]);
 console.log('PASS economic history: two dated salary/plan changes preserve prior months; exact client receipts vs invoice applications vs unallocated cash; no ledger changes; salary redaction, tenant, revisions, retries, closed-period guards');
 return {actor,person,customer,call};
}
export async function economicHistorySchema(db){
 const exec=db.exec||((sql)=>db.query(sql)),read=file=>readFile(new URL(file,import.meta.url),'utf8');
 await exec(await read('schema.sql'));
 for(const file of migrationOrder)if(!['20261018_economic_history.sql','20261018_commercial_same_month_revisions.sql'].includes(file))await exec(await read('migrations/'+file));
 const org=(await db.query("insert into organizations(slug,name) values('history-legacy','Legacy') returning id")).rows[0].id;
 const person=(await db.query("insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency,started_on) values($1,'Legacy','fixed',123,'USD','2020-01-01') returning id",[org])).rows[0].id;
 await exec(await read('migrations/20261018_economic_history.sql'));await exec(await read('migrations/20261018_economic_history.sql'));
 await exec(await read('migrations/20261018_commercial_same_month_revisions.sql'));await exec(await read('migrations/20261018_commercial_same_month_revisions.sql'));
 const baseline=(await db.query("select effective_from,source,after_state from agency_salary_history where organization_id=$1 and collaborator_id=$2",[org,person])).rows;
 assert.equal(baseline.length,1);assert.equal(baseline[0].effective_from,null);assert.equal(baseline[0].source,'legacy-baseline');assert.equal(baseline[0].after_state.amount,'123.00');
 const legacy=(await db.query("select agency_salary_at($1,$2,'2020-03-31') as salary",[org,person])).rows[0].salary;assert.equal(legacy.history_known,false);assert.equal(legacy.effective_from,null);
 console.log('PASS migration twice, existing legacy baseline keeps unknown effective date');
}
if(process.argv[1]===new URL(import.meta.url).pathname){const pg=new PGlite(),query=(s,a=[])=>pg.query(s,a),db={query,exec:sql=>pg.exec(sql),connect:async()=>({query,release(){}})};try{await economicHistorySchema(db);await economicHistoryCases(db);}finally{await pg.close();}}
