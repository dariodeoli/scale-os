import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {FINANCE_PURPOSES, FINANCE_RETENTION_POLICY, FINANCE_NEVER_DELETE, financeRetentionFor, financePersonalData, anonymizeFinanceSubject, anonymizeExpiredFinanceData} from './finance-privacy.js';

// Contrato de protección de datos del dominio Finanzas (Ley 7593/2025):
// inventario de finalidades/retención, export ARSOP de la parte financiera y
// anonimización que conserva los libros.

const pg=new PGlite();
await pg.exec(await fs.readFile(new URL('./schema.sql',import.meta.url),'utf8'));
const migrationFiles=['20260908_treasury_ledger.sql','20260908_people_commissions_comments.sql','20260908_operations_complete.sql','20260908_referral_discounts.sql','20260908_collaborator_profiles.sql','20260908_agency_suite.sql','20260908_daily_controls.sql','20260910_productivity.sql','20260910_client_lifecycle.sql','20260910_currencies.sql','20260910_company_currency.sql','20260914_client_commercial_lifecycle.sql','20260914_salary_forecast.sql','20260914_client_terms_and_planned_expenses.sql','20260915_optional_commission_terms.sql','20260915_billing_cadence_and_coupons.sql','20260915_salary_override_signed.sql','20260915_client_terms_end_date.sql','20260915_planned_expense_kind.sql','20260915_expenses.sql','20260920_currency_widening.sql'];
for(const name of migrationFiles)await pg.exec(await fs.readFile(new URL(`./migrations/${name}`,import.meta.url),'utf8'));
const query=(sql,args=[])=>pg.query(sql,args);
const one=async(sql,args)=>(await query(sql,args)).rows[0];
const db={query,connect:async()=>({query,release(){}})};

// 1. Inventario: cada dataset declara finalidad conocida, retención positiva y
//    una decisión de vencimiento; el borrado contable queda prohibido.
assert.deepEqual([...new Set(FINANCE_RETENTION_POLICY.map(entry=>entry.purpose))].sort(),[...FINANCE_PURPOSES].sort(),'every retention dataset maps to a declared purpose');
assert.equal(new Set(FINANCE_RETENTION_POLICY.map(entry=>entry.dataset)).size,FINANCE_RETENTION_POLICY.length,'datasets are unique');
for(const entry of FINANCE_RETENTION_POLICY){
 assert(FINANCE_PURPOSES.includes(entry.purpose),`${entry.dataset} declares a known purpose`);
 assert(Number.isInteger(entry.retentionYears)&&entry.retentionYears>=5,`${entry.dataset} declares a fiscal/accounting retention window`);
 assert(['anonymize','keep'].includes(entry.onExpiry),`${entry.dataset} declares what happens on expiry`);
 assert(!('delete' in entry)&&!('purge' in entry),`${entry.dataset} never schedules a destructive purge`);
 assert(Array.isArray(entry.keepFields)&&entry.keepFields.length>0,`${entry.dataset} keeps the fields that hold the books together`);
 assert.equal(typeof entry.legalBasis,'string');
}
assert.equal(financeRetentionFor('agency_payouts').onExpiry,'anonymize');
assert.equal(financeRetentionFor('agency_planned_expenses').onExpiry,'keep');
assert.equal(financeRetentionFor('agency_payments').onExpiry,'keep','immutable receipts keep the accounting record with restricted access');
assert.equal(financeRetentionFor('agency_expenses').onExpiry,'keep','immutable expenses keep the accounting record with restricted access');
assert.equal(financeRetentionFor('agency_unknown'),null);
for(const table of ['agency_invoices','agency_payments','agency_payouts','agency_commissions','agency_expenses','agency_statement_lines','account_transfers'])assert(FINANCE_NEVER_DELETE.some(entry=>entry.dataset===table),`${table} can never be deleted by a retention job`);

// 2. Fixtures: una empresa con titular colaborador y cliente, y otra empresa
//    con datos homónimos para probar el aislamiento por tenant.
const org=(await one("select id from organizations where slug='scale'")).id;
const other=(await one("insert into organizations(slug,name) values('finance-privacy-other','Otra') returning id")).id;
const uid=(await one("insert into users(email,password_hash) values('fin-privacy@example.invalid','unused') returning id")).id;
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[org,uid]);
const account=(await one("insert into bank_accounts(organization_id,name,account_type,currency,balance,institution,account_number,holder_name,custodian_user_id) values($1,'Cuenta Operativa','bank','PYG',9000000,'Banco Familiar','310056630007','Ana Titular',$2) returning id",[org,uid])).id;
const collaborator=(await one(`insert into agency_collaborators(organization_id,full_name,email,photo_url,job_title,compensation_type,compensation_amount,currency,monthly_salary_amount,monthly_salary_currency,payment_day,invoices_company,notes)
 values($1,'Ana Titular','ana@example.invalid','https://media.invalid/ana.jpg','Diseñadora','fixed',5000000,'PYG',5000000,'PYG',15,true,'Nota personal de Ana') returning id`,[org])).id;
await query("insert into agency_salary_month_overrides(organization_id,collaborator_id,month,amount,note) values($1,$2,'2026-09-01',250000,'Bono de Ana por campaña')",[org,collaborator]);
const client=(await one("insert into agency_clients(organization_id,name,email) values($1,'Cliente Titular','titular@example.invalid') returning id",[org])).id;
const otherClient=(await one("insert into agency_clients(organization_id,name) values($1,'Cliente Sin Mora') returning id",[org])).id;
const invoice=(await one("insert into agency_invoices(organization_id,client_id,number,currency,total,issued_on,notes) values($1,$2,'FIN-116','PYG','1000000','2026-09-01','Factura de Cliente Titular') returning id",[org,client])).id;
const payment=(await one("insert into agency_payments(organization_id,invoice_id,account_id,amount,received_on,reference) values($1,$2,$3,'400000','2026-09-10','Transferencia de Cliente Titular') returning id",[org,invoice,account])).id;
await query("insert into agency_payment_reversals(organization_id,payment_id,reason,reversed_on,created_by_user_id) values($1,$2,'Monto duplicado','2026-09-11',$3)",[org,payment,uid]);
const commission=(await one("insert into agency_commissions(organization_id,invoice_id,collaborator_id,kind,beneficiary_name,amount,currency,status,notes) values($1,$2,$3,'sales','Ana Titular','50000','PYG','approved','Comisión de Ana') returning id",[org,invoice,collaborator])).id;
const payout=(await one("insert into agency_payouts(organization_id,collaborator_id,commission_id,account_id,amount,paid_on,reference,created_by_user_id) values($1,$2,$3,$4,'50000','2026-09-12','Pago a Ana',$5) returning id",[org,collaborator,commission,account,uid])).id;
await query("insert into agency_statement_lines(organization_id,account_id,external_id,booked_on,amount,reference,created_by_user_id) values($1,$2,'EXT-1','2026-09-10','400000','Depósito de Cliente Titular',$3)",[org,account,uid]);
await query("insert into agency_expenses(organization_id,account_id,category,kind,amount,currency,paid_on,reference,created_by_user_id) values($1,$2,'Servicios','variable',100000,'PYG','2026-09-05','Pago a proveedor externo',$3)",[org,account,uid]);
const plan=(await one("insert into agency_plans(organization_id,name,currency,items) values($1,'Plan FIN','PYG','[]'::jsonb) returning id",[org])).id;
await query(`insert into agency_client_commercial_terms(organization_id,client_id,plan_id,recurring_amount,currency,starts_on,invoice_required,commission_recipient_id,commission_mode,commission_value)
 values($1,$2,$3,700000,'PYG','2026-01-01',true,$4,'percentage',10)`,[org,client,plan,collaborator]);
const discount=(await one("insert into agency_referral_discounts(organization_id,invoice_id,referrer,amount,reason,created_by_user_id) values($1,$2,'Pedro Referidor','5000','Acuerdo con Pedro',$3) returning id",[org,invoice,uid])).id;
const otherCollaborator=(await one(`insert into agency_collaborators(organization_id,full_name,email,compensation_type,compensation_amount,notes)
 values($1,'Beto Otro','beto@other.invalid','fixed',3000000,'Nota de Beto') returning id`,[other])).id;
await query("insert into agency_salary_month_overrides(organization_id,collaborator_id,month,amount,note) values($1,$2,'2026-09-01',999999,'Bono de Beto')",[other,otherCollaborator]);
// Fixtures vencidos para el barrido por antigüedad (los asientos no cambian).
const oldInvoice=(await one("insert into agency_invoices(organization_id,client_id,number,currency,total,issued_on,notes) values($1,$2,'FIN-OLD','PYG','200000','2010-06-01','Factura vieja de un tercero') returning id",[org,otherClient])).id;
const oldCommission=(await one("insert into agency_commissions(organization_id,invoice_id,kind,beneficiary_name,amount,currency,status,notes,created_at) values($1,$2,'referral','Referidor Externo','10000','PYG','paid','Comisión vieja','2010-07-01T12:00:00Z') returning id",[org,oldInvoice])).id;
const oldDiscount=(await one("insert into agency_referral_discounts(organization_id,invoice_id,referrer,amount,reason,created_by_user_id,created_at) values($1,$2,'Pedro Viejo','1000','Acuerdo viejo',$3,'2010-08-01T12:00:00Z') returning id",[org,oldInvoice,uid])).id;
const oldStatement=(await one("insert into agency_statement_lines(organization_id,account_id,external_id,booked_on,amount,reference,created_by_user_id) values($1,$2,'EXT-OLD','2018-01-15','50000','Depósito viejo de un tercero',$3) returning id",[org,account,uid])).id;
const retired=(await one(`insert into agency_collaborators(organization_id,full_name,email,compensation_type,compensation_amount,active,ended_on,notes)
 values($1,'Carla Antigua','carla@example.invalid','fixed',1000000,false,'2011-12-31','Nota de Carla') returning id`,[org])).id;
await query("insert into agency_salary_month_overrides(organization_id,collaborator_id,month,amount,note) values($1,$2,'2010-05-01',100000,'Bono viejo de Carla')",[org,retired]);

// 3. Export ARSOP: la parte financiera del colaborador incluye perfil, ajustes,
//    comisiones y egresos; nunca los datos de la otra empresa.
const exported=await financePersonalData(db,{organizationId:org,subjectType:'collaborator',subjectId:collaborator});
assert.equal(exported.subject.type,'collaborator');
assert.deepEqual(exported.purposes,['payroll','commissions','payments']);
assert.equal(exported.profile.full_name,'Ana Titular');
assert.equal(Number(exported.profile.compensationAmount),5000000);
assert.equal(Number(exported.profile.monthlySalaryAmount),5000000);
assert.equal(exported.profile.paymentDay,15);
assert.equal(exported.profile.invoicesCompany,true);
assert.equal(exported.salaryOverrides.length,1);
assert.equal(exported.salaryOverrides[0].note,'Bono de Ana por campaña');
assert.equal(Number(exported.salaryOverrides[0].amount),250000);
assert.equal(exported.commissions.length,1);
assert.equal(exported.commissions[0].beneficiaryName,'Ana Titular');
assert.equal(exported.payouts.length,1);
assert.equal(exported.payouts[0].reference,'Pago a Ana');
assert.equal(exported.payouts[0].accountName,'Cuenta Operativa');
assert.equal((await financePersonalData(db,{organizationId:org,subjectType:'collaborator',subjectId:otherCollaborator})),null,'another tenant collaborator is not visible');

const clientExport=await financePersonalData(db,{organizationId:org,subjectType:'client',subjectId:client});
assert.deepEqual(clientExport.purposes,['billing','treasury','commissions']);
assert.equal(clientExport.invoices.length,1);
assert.equal(clientExport.invoices[0].number,'FIN-116');
assert.equal(Number(clientExport.invoices[0].total),1000000);
assert.equal(clientExport.payments.length,1);
assert.equal(clientExport.payments[0].reference,'Transferencia de Cliente Titular');
assert.equal(clientExport.payments[0].reversalReason,'Monto duplicado');
assert.equal(clientExport.terms.commissionMode,'percentage');
assert.equal(Number(clientExport.terms.commissionValue),10);
assert.equal(clientExport.referralDiscounts.length,1);
assert.equal('referrer' in clientExport.referralDiscounts[0],false,'the third party who referred is never exported as client data');
assert.equal(await financePersonalData(db,{organizationId:org,subjectType:'client',subjectId:999999}),null);
assert.equal(await financePersonalData(db,{organizationId:other,subjectType:'client',subjectId:client}),null,'tenant isolation');
await assert.rejects(financePersonalData(db,{organizationId:org,subjectType:'visitor',subjectId:client}),/Tipo de titular inválido/);
await assert.rejects(financePersonalData(db,{organizationId:'0',subjectType:'client',subjectId:client}),/Empresa inválido/);

// 4. Anonimización del colaborador: identificadores fuera, libros intactos y
//    ejecución repetible sin efectos nuevos.
const first=await anonymizeFinanceSubject(db,{organizationId:org,subjectType:'collaborator',subjectId:collaborator});
assert.equal(first.counts.collaborator,1);
assert.equal(first.counts.salaryOverrideNotes,1);
assert.equal(first.counts.commissions,1);
assert.equal(first.counts.payoutReferences,1);
const scrubbed=await one('select full_name,email,photo_url,notes,compensation_amount::text as amount from agency_collaborators where id=$1',[collaborator]);
assert.deepEqual({...scrubbed,amount:Number(scrubbed.amount)},{full_name:'Colaborador anonimizado',email:null,photo_url:null,notes:null,amount:5000000});
assert.equal((await one('select count(*)::int as n from agency_salary_month_overrides where collaborator_id=$1 and note is null',[collaborator])).n,1);
assert.equal(Number((await one('select amount::text as amount from agency_salary_month_overrides where collaborator_id=$1',[collaborator])).amount),250000);
const scrubbedCommission=await one('select beneficiary_name,notes,amount::text as amount from agency_commissions where id=$1',[commission]);
assert.deepEqual({...scrubbedCommission,amount:Number(scrubbedCommission.amount)},{beneficiary_name:'Beneficiario anonimizado',notes:null,amount:50000});
assert.equal((await one('select reference from agency_payouts where id=$1',[payout])).reference,'');
assert.equal((await one('select full_name,email,notes from agency_collaborators where id=$1',[otherCollaborator])).full_name,'Beto Otro','another tenant keeps its data');
const second=await anonymizeFinanceSubject(db,{organizationId:org,subjectType:'collaborator',subjectId:collaborator});
assert.equal(second.counts.collaborator,1,'a repeated run still finds the row');
assert.equal(second.counts.salaryOverrideNotes,0,'a repeated run does not rewrite the override note');
assert.equal(second.counts.commissions,0);
assert.equal(second.counts.payoutReferences,0);
const afterSecond=await one('select full_name,email,photo_url,notes,compensation_amount::text as amount from agency_collaborators where id=$1',[collaborator]);
assert.deepEqual(afterSecond,scrubbed,'anonimizar dos veces no cambia el resultado');

// 5. Barrido por antigüedad: solo se anonimizan los campos editables cuya
//    ventana venció; los asientos siguen enteros y una segunda pasada no
//    vuelve a escribir.
const sweep=await anonymizeExpiredFinanceData(db,{asOf:new Date('2026-09-30T12:00:00Z')});
assert.deepEqual(sweep.cutoffs,{financial:'2016-09-30',support:'2021-09-30'});
assert.equal(sweep.counts.salaryOverrideNotes,1,'the 2010 override note expires');
assert.equal(sweep.counts.commissionNames,1,'the 2010 commission payee expires');
assert.equal(sweep.counts.invoiceNotes,1,'the 2010 invoice note expires');
assert.equal(sweep.counts.referralDiscounts,1,'the 2010 referral expires');
assert.equal(sweep.counts.statementReferences,1,'the 2018 statement reference expires');
assert.equal((await one('select note from agency_salary_month_overrides where collaborator_id=$1 and month=$2::date',[retired,'2010-05-01'])).note,null);
assert.equal((await one('select beneficiary_name,notes from agency_commissions where id=$1',[oldCommission])).beneficiary_name,'Beneficiario anonimizado');
assert.equal((await one('select notes from agency_invoices where id=$1',[oldInvoice])).notes,null);
assert.equal((await one('select referrer,reason from agency_referral_discounts where id=$1',[oldDiscount])).referrer,'Referido anonimizado');
assert.equal((await one('select reference from agency_statement_lines where id=$1',[oldStatement])).reference,'');
assert.equal((await one('select full_name,notes from agency_collaborators where id=$1',[retired])).full_name,'Carla Antigua','the age sweep never rewrites a person row');
assert.equal((await one('select note from agency_salary_month_overrides where collaborator_id=$1 and month=$2::date',[collaborator,'2026-09-01'])).note,null,'the recent note was already scrubbed by the subject request');
const sweepAgain=await anonymizeExpiredFinanceData(db,{asOf:new Date('2026-09-30T12:00:00Z')});
assert.deepEqual(sweepAgain.counts,{salaryOverrideNotes:0,commissionNames:0,invoiceNotes:0,referralDiscounts:0,statementReferences:0},'the scheduled sweep is idempotent');
await assert.rejects(anonymizeExpiredFinanceData(db,{asOf:'nope'}),/Fecha inválida/);

// 6. Anonimización del cliente: notas y referidos del titular fuera; los
//    cobros inmutables conservan su asiento con acceso restringido y el resto
//    de los clientes no se toca.
const clientResult=await anonymizeFinanceSubject(db,{organizationId:org,subjectType:'client',subjectId:client});
assert.equal(clientResult.counts.invoiceNotes,1);
assert.equal(clientResult.counts.referralDiscounts,1);
assert.equal('paymentReferences' in clientResult.counts,false,'immutable receipts are never edited');
const scrubbedInvoice=await one('select notes,total::text as total,status,issued_on::text as issued_on from agency_invoices where id=$1',[invoice]);
assert.deepEqual({...scrubbedInvoice,total:Number(scrubbedInvoice.total)},{notes:null,total:1000000,status:'issued',issued_on:'2026-09-01'});
assert.equal((await one('select reference from agency_payments where id=$1',[payment])).reference,'Transferencia de Cliente Titular','the immutable receipt keeps its accounting record');
const scrubbedDiscount=await one('select referrer,reason,amount::text as amount,status from agency_referral_discounts where id=$1',[discount]);
assert.deepEqual({...scrubbedDiscount,amount:Number(scrubbedDiscount.amount)},{referrer:'Referido anonimizado',reason:'Motivo anonimizado',amount:5000,status:'applied'});
assert.equal((await one('select name from agency_clients where id=$1',[otherClient])).name,'Cliente Sin Mora','el cliente sin retención vencida no se toca');
const clientAgain=await anonymizeFinanceSubject(db,{organizationId:org,subjectType:'client',subjectId:client});
assert.equal(clientAgain.counts.invoiceNotes,0);
assert.equal(clientAgain.counts.referralDiscounts,0);
await assert.rejects(anonymizeFinanceSubject(db,{organizationId:org,subjectType:'visitor',subjectId:client}),/Tipo de titular inválido/);

console.log('PASS finance-privacy: purpose/retention inventory, ARSOP finance export, tenant isolation and non-destructive anonymization');
