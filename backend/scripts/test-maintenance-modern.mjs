import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export const modernTables=['agency_print_printers','agency_print_templates','agency_print_bridges','agency_print_jobs','agency_print_idempotency','agency_print_audit','agency_client_contacts','agency_company_legal_profiles','agency_contract_templates','agency_contracts','agency_contract_versions','agency_contract_audit','agency_internal_tasks','agency_internal_task_assignees','agency_internal_task_comments','agency_payment_links','agency_account_openings','agency_opening_receivables','agency_payment_applications','agency_payment_application_reversals','agency_payment_date_corrections','agency_finance_periods','agency_finance_period_events','agency_salary_history'];
// Test-only synthetic data: exercise FK ordering, immutable documents and closed periods.
export async function modernState(query,org,owner){
 const one=async(sql,args)=>(await query(sql,args)).rows[0];
 const insert=async(sql,args)=>(await one(sql+' returning id',args)).id;
 const client=(await one('select id from agency_clients where organization_id=$1 order by id limit 1',[org])).id;
 await query("insert into agency_client_contacts(organization_id,client_id,name,email) values($1,$2,'Contacto ficticio','contacto@example.invalid')",[org,client]);
 const project=(await one('select id from agency_projects where organization_id=$1 order by id limit 1',[org])).id;
 const account=(await one("select id from bank_accounts where organization_id=$1 and currency='PYG' order by id limit 1",[org])).id;
 const collaborator=await insert("insert into agency_collaborators(organization_id,full_name,compensation_type,compensation_amount,currency) values($1,'Persona ficticia historial','fixed',1000,'PYG')",[org]);
 await query("insert into agency_salary_month_overrides(organization_id,collaborator_id,month,amount,note) values($1,$2,date_trunc('month',current_date)::date,10,'Ajuste ficticio')",[org,collaborator]);
 await query("insert into agency_company_legal_profiles(organization_id,city,updated_by) values($1,'Ciudad ficticia',$2) on conflict(organization_id) do update set city=excluded.city",[org,owner]);
 const template=await insert("insert into agency_contract_templates(organization_id,name,body,created_by) values($1,'Plantilla ficticia','Servicio de ejemplo',$2)",[org,owner]);
 const contract=await insert("insert into agency_contracts(organization_id,template_id,title,body,client_id,bank_account_id,created_by) values($1,$2,'Documento ficticio','Servicio de ejemplo',$3,$4,$5)",[org,template,client,account,owner]);
 await query("insert into agency_contract_versions(organization_id,contract_id,version,title,body,rendered_text,variables,sources,template_id,template_revision,reviewed_by) values($1,$2,1,'Documento ficticio','Servicio de ejemplo','Servicio de ejemplo','{}','{}',$3,1,$4)",[org,contract,template,owner]);
 await query("insert into agency_contract_audit(organization_id,actor_user_id,entity_type,entity_id,action,revision) values($1,$2,'contract',$3,'issue',1)",[org,owner,String(contract)]);
 const task=await insert("insert into agency_internal_tasks(organization_id,title,project_id,client_id,created_by_user_id) values($1,'Tarea ficticia',$2,$3,$4)",[org,project,client,owner]);
 await query('insert into agency_internal_task_assignees(organization_id,task_id,user_id) values($1,$2,$3)',[org,task,owner]);
 await query("insert into agency_internal_task_comments(organization_id,task_id,author_user_id,body) values($1,$2,$3,'Comentario ficticio')",[org,task,owner]);
 const openingAccount=await insert("insert into bank_accounts(organization_id,name,account_type,currency) values($1,'Apertura ficticia','cash','PYG')",[org]);
 await query("insert into agency_account_openings(organization_id,account_id,amount,opened_on,reason,request_key,created_by) values($1,$2,1000,current_date,'Saldo inicial ficticio','opening-fixture',$3)",[org,openingAccount,owner]);
 const debt=await insert("insert into agency_opening_receivables(organization_id,client_id,amount,currency,period,due_on,reason,created_by) values($1,$2,500,'PYG',date_trunc('month',current_date)::date,current_date,'Deuda ficticia',$3)",[org,client,owner]);
 const payment=await insert("insert into agency_payments(organization_id,account_id,amount,received_by_user_id,reference) values($1,$2,200,$3,'Cobro ficticio sin factura')",[org,account,owner]);
 await query('insert into agency_payment_links(organization_id,payment_id,client_id,project_id,updated_by) values($1,$2,$3,$4,$5)',[org,payment,client,project,owner]);
 const applied=await insert('insert into agency_payment_applications(organization_id,payment_id,receivable_id,amount,created_by) values($1,$2,$3,100,$4)',[org,payment,debt,owner]);
 await query("insert into agency_payment_application_reversals(organization_id,application_id,reason,created_by) values($1,$2,'Reversión ficticia',$3)",[org,applied,owner]);
 const original=await insert("insert into agency_payments(organization_id,account_id,amount,received_on,received_by_user_id) values($1,$2,100,current_date-1,$3)",[org,account,owner]);
 await query("insert into agency_payment_reversals(organization_id,payment_id,reason,created_by_user_id) values($1,$2,'Fecha ficticia a corregir',$3)",[org,original,owner]);
 const replacement=await insert("insert into agency_payments(organization_id,account_id,amount,received_by_user_id) values($1,$2,100,$3)",[org,account,owner]);
 await query("insert into agency_payment_date_corrections(organization_id,original_payment_id,replacement_payment_id,previous_date,corrected_date,reason,request_key,created_by) values($1,$2,$3,current_date-1,current_date,'Corrección ficticia','date-fixture',$4)",[org,original,replacement,owner]);
 const expense=await insert("insert into agency_expenses(organization_id,account_id,category,amount,currency,created_by_user_id) values($1,$2,'Prueba',10,'PYG',$3)",[org,account,owner]);
 await query("insert into agency_expense_reversals(organization_id,expense_id,reason,created_by_user_id) values($1,$2,'Reversión ficticia',$3)",[org,expense,owner]);
 const printer=randomUUID(), printTemplate=randomUUID(), bridge=randomUUID(), job=randomUUID();
 await query("insert into agency_print_printers(id,organization_id,name,connection,destination) values($1,$2,'Térmica ficticia','cups','cups:FIXTURE')",[printer,org]);
 await query("insert into agency_print_templates(id,organization_id,name,kind,definition) values($1,$2,'Prueba ficticia','test','{}')",[printTemplate,org]);
 await query("insert into agency_print_bridges(id,organization_id,name,created_by,token_hash) values($1,$2,'Puente ficticio',$3,'fixture-'||($1::uuid)::text)",[bridge,org,owner]);
 await query("insert into agency_print_jobs(id,organization_id,branch_id,printer_id,template_id,template_version,kind,reference,copies,requested_by,idempotency_key,fingerprint,template_snapshot,document_snapshot,printer_snapshot,payload_base64,payload_bytes,bridge_id) values($1,$2,'main',$3,$4,1,'test','Ficticio',1,$5,'fixture-key','fixture-hash','{}','{}','{}','SGk=',2,$6)",[job,org,printer,printTemplate,owner,bridge]);
 await query("insert into agency_print_idempotency(organization_id,key,request_hash,job_id) values($1,'fixture-key','fixture-request',$2)",[org,job]);
 await query("insert into agency_print_audit(organization_id,actor_user_id,bridge_id,entity_id,action) values($1,$2,$3,$4,'fixture')",[org,owner,bridge,job]);
 // Close LAST; the cleanup must handle populated closed periods, not empty guards.
 await query("insert into agency_finance_periods(organization_id,month,status,reason,closed_at,updated_by,snapshot) values($1,date_trunc('month',current_date)::date,'closed','Cierre ficticio',now(),$2,'{}')",[org,owner]);
 await query("insert into agency_finance_period_events(organization_id,month,action,reason,actor_user_id,revision,snapshot) values($1,date_trunc('month',current_date)::date,'close','Cierre ficticio',$2,1,'{}')",[org,owner]);
 for(const table of modernTables)assert.ok((await one(`select count(*)::int as n from ${table} where organization_id=$1`,[org])).n,`modern fixture covers ${table}`);
 return{contract,payment,collaborator};
}
