import assert from 'node:assert/strict';
import {test} from 'node:test';
require.extensions['.css']=()=>{};
const {validForecast}=require('../app/forecast-data') as typeof import('../app/forecast-data');
const base={month:'2032-03',time_zone:'America/Asuncion',records:[],personnel:{records:[]},definition:{},contracted_recurring:{records:[]},invoiced:{records:[]},collected_actual:{records:[]},commission_forecast:{records:[]},planned_expenses:{records:[]}};
test('manual prior receivables preserve exact source amounts and optional older-server compatibility',()=>{
 assert.equal(validForecast(base),true);
 const opening={month:'2032-03',months:2,records:[{month:'2032-03',currency:'USD',receivable_count:1,amount:'9007199254740993.10'}],undated_records:[{currency:'PYG',receivable_count:'1',amount:'500.00'}]};
 assert.equal(validForecast({...base,opening_receivables:opening}),true);
 for(const amount of [NaN,Infinity,10,'NaN','-1','1e3','1.234'])assert.equal(validForecast({...base,opening_receivables:{...opening,records:[{...opening.records[0],amount}]}}),false,`reject invalid source amount ${amount}`);
 assert.equal(validForecast({...base,opening_receivables:{...opening,records:[{...opening.records[0],currency:'GBP'}]}}),false);
 assert.equal(validForecast({...base,opening_receivables:{...opening,months:13}}),false);
});
