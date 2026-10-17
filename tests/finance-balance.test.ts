import assert from 'node:assert/strict';
import {test} from 'node:test';
import {balanceCurrencyRows,sumMoney,financePermission,type TreasuryBalance} from '../app/finance-balance-data';
import type {ForecastData} from '../app/forecast-data';
test('cash arithmetic remains exact above JS integer range and across fractional legacy entries',()=>{
 assert.equal(sumMoney(['9007199254740993.01','0.09','-2.10']),'9007199254740991');
 assert.equal(sumMoney(['-0.01','-0.02']),'-0.03');
 assert.throws(()=>sumMoney(['NaN']));assert.throws(()=>sumMoney(['1.234']));
});
test('cash/contract/invoice and payroll stay separate and currencies never merge',()=>{
 const treasury:TreasuryBalance={month:'2026-10',period:null,movements:[...['payment','expense','payout','transfer_in','transfer_out'].map((movement_type,index)=>({account_id:'1',movement_type,movement_id:String(index),booked_on:'2026-10-01',reference:'',amount:['100','-10','-20','999','-999'][index]}))],accounts:[{id:'1',name:'Banco',account_type:'bank',currency:'PYG',current_balance:'100',opening_balance:'40',closing_balance:'80',inflows:'60',outflows:'20'},{id:'2',name:'Caja USD',account_type:'cash',currency:'USD',current_balance:'2',opening_balance:'1',closing_balance:'2',inflows:'1',outflows:'0'}]};
 const forecast={contracted_recurring:{records:[{currency:'PYG',amount:'900'}]},invoiced:{records:[{currency:'PYG',amount:'600'}]},collected_actual:{records:[{currency:'PYG',amount:'60'}]},planned_expenses:{records:[{currency:'PYG',amount:'30'}]},personnel:{records:[{currency:'PYG',expected_end_of_month_expense:'50'}]}} as ForecastData;
 const rows=balanceCurrencyRows(treasury,forecast,true);const pyg=rows.find(row=>row.currency==='PYG')!;
 assert.equal(rows.length,2);assert.equal(pyg.current,'100');assert.equal(pyg.actualIncome,'100');assert.equal(pyg.actualExpenses,'-10');assert.equal(pyg.payrollPaid,'-20');assert.equal(pyg.net,'70');assert.equal(pyg.closing,'80');assert.equal(pyg.contracted,'900');assert.equal(pyg.invoiced,'600');assert.equal(pyg.collected,'60');assert.equal(pyg.salary,'50');assert.equal(pyg.plannedExpenses,'30');
 assert.equal(balanceCurrencyRows(treasury,forecast,false).find(row=>row.currency==='PYG')!.salary,null);
 assert.equal(rows.find(row=>row.currency==='USD')!.current,'2');
});
test('effective capability override hides finance writes or salary data without hiding owner access',()=>{
 assert.equal(financePermission({role:'finance',capabilities:{'salary.view':false}},'salary.view',true),false);
 assert.equal(financePermission({role:'viewer',capabilities:{'payments.manage':true}},'payments.manage',false),true);
 assert.equal(financePermission({role:'owner',capabilities:{'salary.view':false}},'salary.view',false),true);
});

test('planning-only currencies remain visible without a bank account, invoice or contract',()=>{
 const treasury:TreasuryBalance={month:'2026-10',period:null,movements:[],accounts:[]};
 const month='2026-10';
 const forecast:ForecastData={month,time_zone:'America/Asuncion',records:[],contracted_recurring:{month,records:[]},invoiced:{month,records:[]},commission_forecast:{month,records:[]},collected_actual:{month,records:[{currency:'EUR',amount:'-40'}]},planned_expenses:{month,records:[{currency:'PYG',amount:'120',expense_count:1,fixed_count:1,variable_count:0}]},personnel:{month,included_headcount:1,records:[{currency:'USD',expected_end_of_month_expense:'50',included_headcount:1,base_count:1,base_amount:50,override_count:0,override_amount:0,members:[]}]},opening_receivables:{month,months:1,records:[{month,currency:'BRL',receivable_count:1,amount:'80'},{month:'2026-11',currency:'MXN',receivable_count:1,amount:'100'}],undated_records:[{currency:'ARS',receivable_count:1,amount:'90'}]},definition:{issued:'',accepted_uninvoiced:'',exclusions:'',contracted_recurring:'',invoiced:'',collected_actual:'',personnel:'',commission_forecast:'',planned_expenses:''}};
 const rows=balanceCurrencyRows(treasury,forecast,true);assert.deepEqual(rows.map(row=>row.currency),['ARS','BRL','EUR','PYG','USD']);
 assert.equal(rows.find(row=>row.currency==='PYG')!.plannedExpenses,'120');assert.equal(rows.find(row=>row.currency==='USD')!.salary,'50');assert.equal(rows.find(row=>row.currency==='EUR')!.collected,'-40');assert.equal(rows.find(row=>row.currency==='BRL')!.priorScheduled,'80');assert.equal(rows.find(row=>row.currency==='ARS')!.priorUndated,'90');assert(rows.every(row=>row.current==='0'),'planned or prior receivables never create current cash');
 assert(!balanceCurrencyRows(treasury,forecast,false).some(row=>row.currency==='USD'),'salary-only currency respects salary visibility');
});
