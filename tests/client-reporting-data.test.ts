import assert from 'node:assert/strict';
import {test} from 'node:test';
// Los módulos de datos importan operations (api/money); el env de test no tiene DOM ni CSS.
require.extensions['.css']=()=>{};
const {CUSTOMER_KINDS,CUSTOMER_KIND_CHOICES,completeTerms,isDate,isPositiveInput,isWholeTransport,reportingChanges,sameTerms,termsDraft,validTerms,validTermsResponse,validateRelationshipDate,validateTermsDraft}=require('../app/client-reporting-data') as typeof import('../app/client-reporting-data');
type ClientReportingRecord=import('../app/client-reporting-data').ClientReportingRecord;
type CommercialTerms=import('../app/client-reporting-data').CommercialTerms;
type TermsDraft=import('../app/client-reporting-data').TermsDraft;

const record=(overrides:Partial<ClientReportingRecord>={}):ClientReportingRecord=>({clientId:'7',customerKind:'company',servicePlanId:'3',relationshipStartedOn:'2024-02-29',version:'9',updatedAt:'2026-09-20T12:00:00Z',archived:false,...overrides});
const terms=(overrides:Partial<CommercialTerms>={}):CommercialTerms=>({clientId:'7',planId:'3',planName:'Mensual',recurringAmount:'1250000',currency:'PYG',startsOn:'2026-01-01',endsOn:null,invoiceRequired:true,commissionRecipientId:'9',commissionRecipientName:'Ana',commissionMode:'percentage',commissionValue:'10',updatedAt:'2026-09-20T12:00:00Z',...overrides});
const draft=(overrides:Partial<TermsDraft>={}):TermsDraft=>({planId:'3',recurringAmount:'1250000',currency:'PYG',startsOn:'2026-01-01',endsOn:'',invoiceRequired:'true',commissionRecipientId:'',commissionMode:'none',commissionValue:'',...overrides});

test('customer kinds mirror the API dictionary',()=>{
 assert.deepEqual(Object.keys(CUSTOMER_KINDS),['unknown','company','professional','individual','other']);
 assert.deepEqual(CUSTOMER_KIND_CHOICES[1],{value:'company',label:'Empresa'});
});

test('whole-amount transport validates strings and numbers like the API',()=>{
 assert.equal(isWholeTransport('0'),true);
 assert.equal(isWholeTransport('0',false),false,'positive-only rejects zero');
 assert.equal(isWholeTransport('001'),false,'leading zeros are not canonical');
 assert.equal(isWholeTransport('9007199254740993'),false,'beyond safe integer is rejected');
 assert.equal(isWholeTransport(Number.MAX_SAFE_INTEGER),true);
 assert.equal(isWholeTransport(-1),false);
 assert.equal(isPositiveInput('1250000'),true);
 assert.equal(isPositiveInput('12,5'),false);
});

test('isDate accepts only real YYYY-MM-DD values',()=>{
 assert.equal(isDate('2024-02-29'),true);
 assert.equal(isDate('2023-02-29'),false);
 assert.equal(isDate('17-09-2026'),false);
 assert.equal(isDate(''),false);
});

test('terms draft maps, compares and completes the canonical nine fields',()=>{
 const current=terms();
 assert.deepEqual(termsDraft(current,record()),{planId:'3',recurringAmount:'1250000',currency:'PYG',startsOn:'2026-01-01',endsOn:'',invoiceRequired:'true',commissionRecipientId:'9',commissionMode:'percentage',commissionValue:'10'});
 assert.deepEqual(termsDraft(null,record({servicePlanId:null,relationshipStartedOn:null})),{planId:'',recurringAmount:'',currency:'PYG',startsOn:'',endsOn:'',invoiceRequired:'',commissionRecipientId:'',commissionMode:'none',commissionValue:''});
 assert.equal(sameTerms(termsDraft(current,record()),current,record()),true);
 assert.equal(sameTerms({...termsDraft(current,record()),endsOn:'2026-12-31'},current,record()),false);
 assert.deepEqual(completeTerms(draft()),{planId:'3',recurringAmount:'1250000',currency:'PYG',startsOn:'2026-01-01',endsOn:null,invoiceRequired:true,commissionRecipientId:null,commissionMode:'none',commissionValue:null});
 assert.equal(completeTerms(draft({commissionMode:'percentage',commissionRecipientId:'9',commissionValue:'10'})).commissionRecipientId,'9');
});

test('reporting changes only include modified fields',()=>{
 const current=record();
 assert.deepEqual(reportingChanges({customerKind:'company',servicePlanId:'3',relationshipStartedOn:'2024-02-29'},current),{});
 assert.deepEqual(reportingChanges({customerKind:'individual',servicePlanId:'',relationshipStartedOn:''},current),{customerKind:'individual',servicePlanId:null,relationshipStartedOn:null});
});

test('relationship date validation rejects future and malformed values',()=>{
 assert.equal(validateRelationshipDate('', ),null);
 assert.equal(validateRelationshipDate('2024-02-29'),null);
 assert.equal(validateRelationshipDate('2026-09-23','2026-09-22'),'Ingresá una fecha real válida, no futura, o dejá el campo vacío.');
 assert.equal(validateRelationshipDate('1899-12-31'),'Ingresá una fecha real válida, no futura, o dejá el campo vacío.');
 assert.equal(validateRelationshipDate('17/09/2026'),'Ingresá una fecha real válida, no futura, o dejá el campo vacío.');
});

test('terms validation mirrors the API: positive amount, dates and commission rules',()=>{
 assert.equal(validateTermsDraft(draft()),null);
 assert.equal(validateTermsDraft(draft({planId:''})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({recurringAmount:'0'})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({startsOn:'2026-13-40'})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({endsOn:'2025-12-31'})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({invoiceRequired:''})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({commissionMode:'percentage',commissionRecipientId:'9',commissionValue:'101'})),'Completá plan, monto, inicio y factura con importes enteros positivos; si definís comisión, elegí destinatario y un valor de hasta 100%.');
 assert.equal(validateTermsDraft(draft({commissionMode:'fixed',commissionRecipientId:'9',commissionValue:'50000'})),null);
});

test('terms payload validation accepts the canonical response and rejects partial shapes',()=>{
 assert.equal(validTerms(terms()),true);
 assert.equal(validTerms(terms({commissionMode:'none',commissionRecipientId:null,commissionRecipientName:null,commissionValue:null})),true);
 assert.equal(validTerms(terms({commissionMode:'none'})),false,'none requires null recipient/value');
 assert.equal(validTerms(terms({recurringAmount:'0'})),false,'zero recurring amount is not valid');
 assert.equal(validTermsResponse({clientId:'7',archived:false,terms:terms(),plans:[],collaborators:[]},'7'),true);
 assert.equal(validTermsResponse({clientId:'8',archived:false,terms:terms(),plans:[],collaborators:[]},'7'),false);
 assert.equal(validTermsResponse({clientId:'7',archived:false,terms:null,plans:[],collaborators:[]},'7'),true);
});
