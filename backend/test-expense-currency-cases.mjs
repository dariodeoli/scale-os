import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {financeControls} from './finance-controls.js';
import {financeTreasury} from './finance-treasury.js';

export async function expenseCurrencyCases(db){
 const query=(sql,args=[])=>db.query(sql,args),one=async(sql,args)=>(await query(sql,args)).rows[0];
 const org=(await one("insert into organizations(slug,name) values('expense-cents','Expense currency fixture') returning id")).id,legacyOrg=(await one("insert into organizations(slug,name) values('expense-legacy','Legacy imported fixture') returning id")).id,otherOrg=(await one("insert into organizations(slug,name) values('expense-other','Other tenant') returning id")).id;
 const uid=(await one("insert into users(email,password_hash) values('expense-cents@example.invalid','unused') returning id")).id;
 for(const organization of [org,otherOrg])await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[organization,uid]);
 const owner={id:uid,organization_id:org,role:'owner'},otherOwner={...owner,organization_id:otherOrg},viewer={...owner,role:'viewer'},revoked={...owner,role:'finance',capabilities:{'expenses.manage':false}};
 const account=async(organization,currency)=>(await one("insert into bank_accounts(organization_id,name,account_type,currency,balance) values($1,$2,'bank',$2,500) returning id",[organization,currency])).id;
 const usd=await account(org,'USD'),pyg=await account(org,'PYG'),foreign=await account(otherOrg,'USD'),legacy=await account(legacyOrg,'USD');
 // Imported historical rows may use the full BIGINT range, beyond modern API
 // limits. Seed that historical edge only in this isolated fixture, without
 // rewriting a current account balance to accommodate an artificial old row.
 await query('alter table agency_expenses disable trigger agency_expense_sync');
 try{for(const amount of ['1','9007199254740993','9223372036854775807'])await query("insert into agency_expenses(organization_id,account_id,category,amount,currency,paid_on,reference,created_by_user_id) values($1,$2,'Legacy',$3,'USD','2000-01-01','Imported history preservation fixture',$4)",[legacyOrg,legacy,amount,uid]);}
 finally{await query('alter table agency_expenses enable trigger agency_expense_sync');}
 const history=async()=>(await query('select id::text,amount::numeric(22,2)::text as amount,reference from agency_expenses where organization_id=$1 order by id',[legacyOrg])).rows;
 const old=await history(),ledger=async()=>(await query('select movement_type,movement_id::text,amount::numeric(22,2)::text as amount from agency_cash_movements where organization_id=$1 order by movement_type,movement_id',[legacyOrg])).rows,oldLedger=await ledger();
 const triggers=async()=>(await query("select c.relname,t.tgname,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relname in ('agency_expenses','agency_expense_reversals','agency_payments','account_transfers') order by c.relname,t.tgname")).rows;
 const oldTriggers=await triggers();
 const dependencies=(await query("select distinct c.relname from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class c on c.oid=r.ev_class where d.refobjid='public.agency_expenses'::regclass and c.relkind in ('v','m') order by c.relname")).rows.map(row=>row.relname);
 assert.deepEqual(dependencies,['agency_cash_movements'],'the exact dependent application view is known before ALTER');
 const migration=await readFile(new URL('./migrations/20261017_expense_currency_precision.sql',import.meta.url),'utf8');
 assert(!/drop\s+view[^;]*cascade|disable\s+trigger|update\s+agency_expenses/i.test(migration),'migration never bypasses guards or rewrites financial history');
 for(let run=0;run<2;run++){await (db.exec?db.exec(migration):db.query(migration));assert.deepEqual(await history(),old,'every BIGINT digit is preserved');assert.deepEqual(await ledger(),oldLedger,'same historical canonical movements');assert.deepEqual(await triggers(),oldTriggers,'all guards and accounting triggers remain enabled');}
 const column=await one("select data_type,numeric_precision,numeric_scale from information_schema.columns where table_schema='public' and table_name='agency_expenses' and column_name='amount'");assert.equal(column.data_type,'numeric');assert.equal(Number(column.numeric_precision),22);assert.equal(Number(column.numeric_scale),2);
 const planned=await one("select data_type from information_schema.columns where table_schema='public' and table_name='agency_planned_expenses' and column_name='amount'");assert.equal(planned.data_type,'bigint','planned forecast inputs keep their existing whole-money contract');
 async function call(path,method='GET',input={},actor=owner){let response;const args={req:{method,socket:{remoteAddress:'fixture'}},res:{},url:new URL('https://fixture'+path),db,session:async()=>({...actor}),body:async()=>input,send:(_,status,data)=>response={status,...data}};for(const handler of [financeTreasury,financeControls])if(await handler(args))return response;throw Error('Unhandled '+path);}
 const on=(await one("select (now() at time zone 'America/Asuncion')::date::text as today")).today,month=on.slice(0,7),root='/api/agency',cash=async key=>(await one('select balance::text as balance from bank_accounts where id=$1',[key])).balance;
 const payload={accountId:usd,category:'Gasto real con centavos',kind:'variable',currency:'USD',amount:'100.25',paidOn:on,reference:'USD currency precision fixture',requestId:randomUUID()};
 assert.equal((await call(root+'/expenses','POST',payload,viewer)).status,403);assert.equal((await call(root+'/expenses','POST',payload,revoked)).status,403);assert.equal((await call(root+'/expenses','POST',{...payload,accountId:foreign,requestId:randomUUID()})).status,400);
 for(const amount of ['100.251','0.001','-1','0','1000000000000','999999999999.01','1e2',null,NaN,Infinity,true])assert.equal((await call(root+'/expenses','POST',{...payload,amount,requestId:randomUUID()})).status,400,'unsupported amount '+String(amount));
 assert.equal((await call(root+'/expenses','POST',{...payload,accountId:pyg,currency:'PYG',amount:'100.25',requestId:randomUUID()})).status,400,'PYG never gains fractional units');assert.equal(await cash(usd),'500.00');
 let result=await call(root+'/expenses','POST',payload);assert.equal(result.status,201,JSON.stringify(result));const expense=result.expense;assert.equal(String(expense.amount),'100.25');assert.equal(await cash(usd),'399.75');assert.equal((await call(root+'/expenses','POST',payload)).status,200);assert.equal(await cash(usd),'399.75','idempotency never debits twice');
 assert.equal((await call(root+'/expenses','POST',{...payload,amount:'100.26'})).status,409);
 assert.equal((await call(root+'/expenses/'+expense.id,'DELETE',{reason:'Other tenant cannot reverse cents'},otherOwner)).status,404);
 const list=await call(root+'/expenses?month='+month);assert.equal(String(list.expenses.find(row=>String(row.id)===String(expense.id)).amount),'100.25');
 const movement=(await one("select amount::text as amount from agency_cash_movements where organization_id=$1 and movement_type='expense' and movement_id=$2",[org,expense.id])).amount;assert.equal(movement,'-100.25');
 // The lower cent boundary is accepted without rounding; PYG accepts only an
 // integer, including an equivalent decimal spelling with a zero fraction.
 for(const [currency,accountId,amount,expected] of [['USD',usd,'0.01','0.01'],['PYG',pyg,'100.00','100.00']]){
  const entry=await call(root+'/expenses','POST',{...payload,accountId,currency,amount,requestId:randomUUID()});assert.equal(entry.status,201,JSON.stringify(entry));assert.equal(String(entry.expense.amount),expected);assert.equal((await call(root+'/expenses/'+entry.expense.id,'DELETE',{reason:'Return of precision boundary fixture',reversedOn:on})).status,201);
 }
 const period=root+'/finance/periods/'+month;result=await call(period+'/close','POST',{reason:'Precision test monthly close',expectedRevision:0});assert.equal(result.status,200,JSON.stringify(result));
 assert.equal((await call(root+'/expenses','POST',{...payload,requestId:randomUUID()})).status,409,'new cent expense cannot escape a closed period');assert.equal((await call(root+'/expenses/'+expense.id,'DELETE',{reason:'Closed period reversal is blocked',reversedOn:on})).status,409);assert.equal(await cash(usd),'399.75');
 assert.equal((await call(period+'/reopen','POST',{reason:'Owner reopens precision test period',expectedRevision:1})).status,200);
 result=await call(root+'/expenses/'+expense.id,'DELETE',{reason:'Return of original USD cent expense',reversedOn:on});assert.equal(result.status,201,JSON.stringify(result));assert.equal(await cash(usd),'500.00');assert.equal((await call(root+'/expenses/'+expense.id,'DELETE',{reason:'Safe retry of same reversal',reversedOn:on})).status,200);
 assert.equal((await one("select sum(amount)::text as amount from agency_cash_movements where organization_id=$1 and account_id=$2",[org,usd])).amount,'0.00','expense and reversal cents cancel exactly in the original ledger');assert.equal(await cash(pyg),'500.00');
 await assert.rejects(()=>query('update agency_expenses set amount=amount+0.01 where id=$1',[expense.id]),/immutable/);
 console.log('PASS expense currency precision: known view dependency, migration twice, full BIGINT history unchanged, numeric(22,2), all guards preserved, planned amounts stay bigint, exact USD100.25/0.01 create and reverse, PYG fractions rejected, input limits, tenant/role gates, idempotency and closed-period409');
}
