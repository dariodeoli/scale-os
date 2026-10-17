import assert from 'node:assert/strict';
import {test} from 'node:test';
require.extensions['.css']=()=>{};
const {validForecast,forecastAggregates,amountFor,financialCurrencies}=require('../app/forecast-data') as typeof import('../app/forecast-data');
const base={month:'2032-03',time_zone:'America/Asuncion',records:[],personnel:{records:[]},definition:{},contracted_recurring:{records:[]},invoiced:{records:[]},collected_actual:{records:[]},commission_forecast:{records:[]},planned_expenses:{records:[]}};
test('manual prior receivables preserve exact source amounts and optional older-server compatibility',()=>{
 assert.equal(validForecast(base),true);
 const opening={month:'2032-03',months:2,records:[{month:'2032-03',currency:'USD',receivable_count:1,amount:'9007199254740993.10'}],undated_records:[{currency:'PYG',receivable_count:'1',amount:'500.00'}]};
 assert.equal(validForecast({...base,opening_receivables:opening}),true);
 for(const amount of [NaN,Infinity,10,'NaN','-1','1e3','1.234'])assert.equal(validForecast({...base,opening_receivables:{...opening,records:[{...opening.records[0],amount}]}}),false,`reject invalid source amount ${amount}`);
 assert.equal(validForecast({...base,opening_receivables:{...opening,records:[{...opening.records[0],currency:'GBP'}]}}),false);
 assert.equal(validForecast({...base,opening_receivables:{...opening,months:13}}),false);
});

test('negative net collections survive parsing and aggregation without relaxing planned revenue or expenses',()=>{
 const negative={...base,collected_actual:{month:'2032-04',records:[{currency:'USD',amount:'-400'}]},projection:{months:1,records:[{month:'2032-04',currency:'USD',projected_cash:250,projected_result:0,collected:-400,expected:0,personnel:0,planned_expenses:0,commission_forecast:0}]}};
 assert.equal(validForecast(negative),true);
 assert.equal(amountFor(forecastAggregates(negative as any).collected,'USD'),'-400');
 assert.deepEqual(financialCurrencies(negative as any),['USD'],'a currency with only reversed collections stays visible');
 for(const group of ['contracted_recurring','invoiced','commission_forecast','planned_expenses'])assert.equal(validForecast({...base,[group]:{records:[{currency:'USD',amount:'-400'}]}}),false,`${group} remains nonnegative`);
 for(const amount of ['-1.5','NaN',Infinity,Number.MAX_SAFE_INTEGER+1])assert.equal(validForecast({...base,collected_actual:{records:[{currency:'USD',amount}]}}),false);
});
