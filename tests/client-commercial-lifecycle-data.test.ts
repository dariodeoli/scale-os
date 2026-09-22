import assert from 'node:assert/strict';
import {test} from 'node:test';
// El módulo de datos importa operations (money); el env de test no tiene DOM ni CSS.
require.extensions['.css']=()=>{};
const {AMENDMENT_MIN_DATE,DISCOUNT_LABELS,amendmentLabel,amendmentPayload,freshAmendmentDraft,validClientId,validLifecycleResponse,validPastDate,validateAmendmentDraft}=require('../app/client-commercial-lifecycle-data') as typeof import('../app/client-commercial-lifecycle-data');
type CommercialAmendmentDraft=import('../app/client-commercial-lifecycle-data').CommercialAmendmentDraft;
type CommercialAmendment=import('../app/client-commercial-lifecycle-data').CommercialAmendment;

const draft=(overrides:Partial<CommercialAmendmentDraft>={}):CommercialAmendmentDraft=>({effectiveOn:'2026-09-14',activationDate:'2024-02-29',planName:'Contenido mensual',planVersionSnapshot:'v3.2',monthlyPrice:'1250000',currency:'PYG',discountType:'none',discountValue:'',discountTerms:'',extrasDeliverables:'',...overrides});
const amendment=(overrides:Partial<CommercialAmendment>={}):CommercialAmendment=>({id:'501',effectiveOn:'2026-09-01',activationDate:'2024-02-29',planName:'Contenido mensual',planVersionSnapshot:'v3.2',monthlyPrice:'1250000',currency:'PYG',discountType:'none',discountValue:null,discountTerms:null,extrasDeliverables:null,createdAt:'2026-09-01T12:00:00Z',...overrides});

test('client ids and past dates follow the API contract',()=>{
 assert.equal(validClientId('1'),true);
 assert.equal(validClientId('9007199254740993'),true,'bigint ids travel as strings');
 assert.equal(validClientId('0'),false);
 assert.equal(validClientId('../2'),false);
 assert.equal(validClientId(''),false);
 assert.equal(validPastDate('2026-09-14','2026-09-14'),true);
 assert.equal(validPastDate('2026-09-15','2026-09-14'),false,'future is rejected');
 assert.equal(validPastDate('1899-12-31','2026-09-14'),false);
 assert.equal(validPastDate('2026-02-29','2026-09-14'),false,'invalid calendar day is rejected');
 assert.equal(AMENDMENT_MIN_DATE,'1900-01-01');
});

test('fresh draft starts at the Asunción day with sane defaults',()=>{
 assert.deepEqual(freshAmendmentDraft('2026-09-22'),{effectiveOn:'2026-09-22',activationDate:'',planName:'',planVersionSnapshot:'',monthlyPrice:'',currency:'PYG',discountType:'none',discountValue:'',discountTerms:'',extrasDeliverables:''});
});

test('amendment label translates discounts without inventing values',()=>{
 assert.equal(amendmentLabel(amendment()),'Sin descuento');
 assert.equal(amendmentLabel(amendment({discountType:'percent',discountValue:'10'})),'Porcentaje · 10%');
 assert.equal(amendmentLabel(amendment({discountType:'fixed',discountValue:'50000',currency:'PYG'})),'Importe fijo · Gs.\u00a050.000');
 assert.deepEqual(Object.keys(DISCOUNT_LABELS),['none','percent','fixed']);
});

test('amendment draft validation mirrors the API rules',()=>{
 assert.equal(validateAmendmentDraft(draft(),'2026-09-22'),null);
 assert.equal(validateAmendmentDraft(draft({effectiveOn:''}),'2026-09-22'),'Ingresá fechas reales válidas, no futuras.');
 assert.equal(validateAmendmentDraft(draft({activationDate:'2026-10-01'}),'2026-09-22'),'Ingresá fechas reales válidas, no futuras.');
 assert.equal(validateAmendmentDraft(draft({planName:'  '}),'2026-09-22'),'Indicá el nombre y la versión del plan contratados.');
 assert.equal(validateAmendmentDraft(draft({monthlyPrice:'0'}),'2026-09-22'),'El precio mensual debe ser mayor a cero.');
 assert.equal(validateAmendmentDraft(draft({monthlyPrice:''}),'2026-09-22'),'El precio mensual debe ser mayor a cero.');
 assert.equal(validateAmendmentDraft(draft({currency:'XXX'}),'2026-09-22'),'Elegí una moneda válida.');
 assert.equal(validateAmendmentDraft(draft({discountType:'percent',discountValue:'101'}),'2026-09-22'),'El descuento porcentual debe ser mayor a 0 y hasta 100.');
 assert.equal(validateAmendmentDraft(draft({discountType:'fixed',discountValue:'0'}),'2026-09-22'),'Ingresá un descuento válido mayor a 0.');
 assert.equal(validateAmendmentDraft(draft({discountType:'percent',discountValue:'15'}),'2026-09-22'),null);
});

test('amendment payload matches the POST contract exactly',()=>{
 assert.deepEqual(amendmentPayload(draft()),{effectiveOn:'2026-09-14',activationDate:'2024-02-29',planName:'Contenido mensual',planVersionSnapshot:'v3.2',monthlyPrice:'1250000',currency:'PYG',discountType:'none',discountValue:null,discountTerms:null,extrasDeliverables:null});
 assert.deepEqual(amendmentPayload(draft({activationDate:'',planName:' Plan ',discountType:'fixed',discountValue:'50000',discountTerms:' Retención ',extrasDeliverables:' Dos reels '})),{effectiveOn:'2026-09-14',activationDate:null,planName:'Plan',planVersionSnapshot:'v3.2',monthlyPrice:'1250000',currency:'PYG',discountType:'fixed',discountValue:'50000',discountTerms:'Retención',extrasDeliverables:'Dos reels'});
});

test('lifecycle responses validate clientId, version and amendments',()=>{
 const ok={commercial:{clientId:'7',version:'12',archived:false,amendments:[amendment()]}};
 assert.equal(validLifecycleResponse(ok,'7'),true);
 assert.equal(validLifecycleResponse(ok,'8'),false);
 assert.equal(validLifecycleResponse({commercial:{clientId:'7',version:12,archived:false,amendments:[]}},'7'),false,'version is a string');
 assert.equal(validLifecycleResponse({commercial:{clientId:'7',version:'12',archived:false,amendments:null}},'7'),false);
 assert.equal(validLifecycleResponse(null,'7'),false);
});
