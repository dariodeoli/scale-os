import assert from 'node:assert/strict';
import {test} from 'node:test';
const {SECTION_TYPE_LABELS,TAX_RATE_CHOICES,initialQuoteSections,normalizeQuoteItems,quoteRequest,quoteSchema,quoteTotals}=require('../app/quote-composer-data') as typeof import('../app/quote-composer-data');

const values=(overrides:Record<string,unknown>={})=>({title:'Campaña anual',clientId:'7',currency:'PYG' as const,tax_rate:'.1',notes:'',valid_until:'2026-10-31',sections:initialQuoteSections(),items:[{description:'Video institucional',quantity:'2',unitPrice:'1000'}],...overrides});
const parse=(overrides:Record<string,unknown>={})=>quoteSchema.safeParse(values(overrides));

test('quote schema mirrors the API limits',()=>{
 assert.equal(parse().success,true);
 assert.equal(parse({title:'x'}).success,false,'title min 2');
 assert.equal(parse({title:'x'.repeat(121)}).success,false,'title max 120');
 assert.equal(parse({notes:'x'.repeat(2001)}).success,false,'notes max 2000');
 assert.equal(parse({items:[]}).success,false,'at least one item');
 assert.equal(parse({items:Array.from({length:101},()=>({description:'Item',quantity:'1',unitPrice:'1'}))}).success,false,'max 100 items');
 assert.equal(parse({items:[{description:'A',quantity:'0',unitPrice:'1'}]}).success,false,'quantity must be positive');
 assert.equal(parse({items:[{description:'A',quantity:'1',unitPrice:''}]}).success,false,'price cannot be empty');
 assert.equal(parse({sections:[{type:'items',title:'',body:'',enabled:true}]}).success,false,'min 2 sections');
 assert.equal(parse({sections:Array.from({length:25},()=>({type:'text',title:'',body:'',enabled:true}))}).success,false,'max 24 sections');
 assert.equal(parse({tax_rate:'0.15'}).success,true,'the API revalidates the rate; the schema keeps it as text');
});

test('item normalization accepts legacy unit_price and defaults',()=>{
 assert.deepEqual(normalizeQuoteItems([{description:'Videos',quantity:2,unitPrice:'12.25'},{description:'Diseño',quantity:1.5,unit_price:'10.50'}]),[{description:'Videos',quantity:'2',unitPrice:'12.25'},{description:'Diseño',quantity:'1.5',unitPrice:'10.50'}]);
 assert.deepEqual(normalizeQuoteItems(undefined),[{description:'',quantity:'1',unitPrice:'0'}]);
 assert.deepEqual(normalizeQuoteItems('invalid'),[{description:'',quantity:'1',unitPrice:'0'}]);
});

test('totals keep the domain rounding of items and tax',()=>{
 assert.deepEqual(quoteTotals([{description:'A',quantity:'2',unitPrice:'1000'},{description:'B',quantity:'1',unitPrice:'500'}],'.1'),{subtotal:2500,total:2750});
 assert.deepEqual(quoteTotals([],'.05'),{subtotal:0,total:0});
 assert.deepEqual(quoteTotals([{description:'A',quantity:'1,5',unitPrice:'10'}],'.1'),{subtotal:0,total:0},'invalid quantities never NaN the total');
});

test('requests per mode match the API contract',()=>{
 const v=values();
 assert.deepEqual(quoteRequest('plan',null,v),{path:'/api/agency/plans',method:'POST',body:{name:'Campaña anual',currency:'PYG',notes:'',items:v.items}});
 assert.deepEqual(quoteRequest('plan','7',v),{path:'/api/agency/plans/7',method:'PATCH',body:{name:'Campaña anual',currency:'PYG',notes:'',items:v.items}});
 assert.deepEqual(quoteRequest('create',null,v),{path:'/api/agency/budgets',method:'POST',body:{...v,validUntil:'2026-10-31'}});
 assert.deepEqual(quoteRequest('budget','9',v),{path:'/api/agency/budgets/9',method:'PATCH',body:v});
});

test('section labels and tax choices are the canonical ones',()=>{
 assert.deepEqual(Object.keys(SECTION_TYPE_LABELS),['meta','items','totals','notes','text']);
 assert.deepEqual(TAX_RATE_CHOICES.map(choice=>choice.value),['0','0.05','0.1']);
 assert.deepEqual(initialQuoteSections().map(section=>section.type),['meta','items','totals','notes']);
 assert.equal(initialQuoteSections().every(section=>section.enabled),true);
});
