import assert from 'node:assert/strict';
import {test} from 'node:test';
import {balanceDetails,financeHistory,type BalanceDetails} from '../app/finance-detail-data';
const fixture:BalanceDetails={month:'2026-10',clients:{records:[{client_id:'1',client_name:'Cliente',client_active:true,client_logo_url:null,plan_id:'2',plan_name:'Plan',currency:'USD',contracted_amount:'1000',invoice_required:false,received_in_month:'200.10',applied_to_month_invoices:'0',unallocated_received_in_month:'0',registered_outstanding:'1300'}]},personnel:{records:[{collaborator_id:'3',name:'Persona',photo_url:null,currency:'USD',base_amount:null,override_amount:null,expected_amount:null,paid_in_month:null,outstanding_amount:null,history_known:false,salary_source:'fixed',salary_editable:true,salary_revision:'1'}]},totals:[{currency:'USD',contracted_amount:'1000',received_in_month:'200.10',registered_outstanding:'1300',expected_receipts:'500'}]};
test('received cash, applied invoices and debt keep their independent server semantics',()=>{
 const parsed=balanceDetails(fixture)!;assert(parsed);
 assert.equal(parsed.clients.records[0].received_in_month,'200.10');assert.equal(parsed.clients.records[0].applied_to_month_invoices,'0');assert.equal(parsed.totals[0].registered_outstanding,'1300');assert.equal(parsed.personnel.records[0].base_amount,null);
 const adjusted=structuredClone(fixture);adjusted.clients.records[0].received_in_month='-0.10';adjusted.totals[0].received_in_month='-0.10';assert(balanceDetails(adjusted),'net reversals can be negative without clamping');
 adjusted.totals[0].contracted_amount='-1';assert.equal(balanceDetails(adjusted),null,'contracted cannot be a negative net-cash correction');
});
test('the contract rejects malformed precision and preserves unknown invoice requirements',()=>{
 const data=structuredClone(fixture);data.clients.records[0].invoice_required=null;assert(balanceDetails(data));
 data.clients.records[0].received_in_month='1.234';assert.equal(balanceDetails(data),null);
 data.clients.records[0].received_in_month='1';data.clients.records[0].currency='PYG';data.clients.records[0].contracted_amount='100.25';assert.equal(balanceDetails(data),null,'PYG stays integral');
});
test('a legacy baseline does not fabricate an author, previous amount or effective date',()=>{
 const baseline={id:'1',created_at:'2026-10-17T12:00:00Z',effective_from:null,actor_name:null,actor_photo_url:null,reason:'Valor importado',before_amount:null,after_amount:'9007199254740993.25',before_currency:null,currency:'USD',source:'legacy-baseline',history_known:false};
 const parsed=financeHistory({revision:'1',records:[baseline]})!;assert(parsed);assert.equal(parsed.records[0].after_amount,'9007199254740993.25');assert.equal(parsed.records[0].effective_from,null);assert.equal(parsed.records[0].actor_name,null);
 assert.equal(financeHistory({revision:'1',records:[{...baseline,after_amount:'NaN'}]}),null);
});

test('client status is explicit and old API payloads stay visible as unknown without fabricating activity',()=>{
 const value=structuredClone(fixture);value.clients.records[0].client_active=false;
 assert.equal(balanceDetails(value)!.clients.records[0].client_active,false);
 const legacy=structuredClone(value) as any;delete legacy.clients.records[0].client_active;
 assert.equal(balanceDetails(legacy)!.clients.records[0].client_active,null);
 legacy.clients.records[0].client_active='false';assert.equal(balanceDetails(legacy),null);
});
