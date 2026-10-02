import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// #145: el resumen de la ficha muestra UNA fecha de alta (día de Asunción, la
// misma del listado), la relación real aparte cuando difiere, y todos los
// montos con el formateador del sistema.
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const suitePath=require.resolve('../app/suite');
require.cache[suitePath]={id:suitePath,filename:suitePath,loaded:true,exports:{RecordEditor:()=>null}} as NodeModule;

const {ClientCommercialSummary}=require('../app/client-commercial-summary') as typeof import('../app/client-commercial-summary');
type Summary=import('../app/client-commercial-summary').ClientSummary;

const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const client={name:'Aurora Café',created_at:'2026-04-01T02:30:00Z',lifecycle_status:'active',active:true,tax_id:'80100000-1',legal_name:'Aurora Café S.A.'};
const terms={planName:'Inicio',recurringAmount:'3000000.00',currency:'PYG',cadence:'monthly',intervalMonths:null,invoiceRequired:true};
const summary=(relationshipStartedOn:string|null):Summary=>({relationshipStartedOn,terms});
let renderer!:ReactTestRenderer;
const mount=async(value:Summary)=>act(async()=>{renderer=create(<ClientCommercialSummary id="1" client={client} payStatus={null} summary={value} role="owner" reload={async()=>{}}/>);});

test('la ficha muestra una sola fecha de alta y los montos formateados (#145)',async()=>{
 await mount(summary('2026-03-15'));
 const copy=text(renderer.root);
 // Alta real: 01-abr 02:30 UTC es 31-mar en Asunción, el mismo día del listado.
 assert.match(copy,/Cliente desde/);
 assert.match(copy,/31 mar 26/,'la ficha usa el día de Asunción del alta');
 assert.equal(copy.includes('01 abr 26'),false,'no reaparece el día corrido por UTC');
 // Segunda fecha legítima, etiquetada distinto.
 assert.match(copy,/Inicio de relación/,'la fecha real de relación va etiquetada aparte');
 assert.match(copy,/15 mar 26/);
 // Montos del sistema, nunca el crudo del API.
 assert.match(copy,/Gs\.\u00a03\.000\.000/,'el monto recurrente sale formateado');
 assert.equal(copy.includes('3000000.00'),false,'ningún importe crudo en la ficha');
 act(()=>renderer.unmount());
});

test('si la relación coincide con el alta no se duplica la etiqueta (#145)',async()=>{
 await mount(summary('2026-03-31'));
 const copy=text(renderer.root);
 assert.match(copy,/Cliente desde/);
 assert.match(copy,/31 mar 26/);
 assert.equal(copy.includes('Inicio de relación'),false,'la misma fecha no se repite con otra etiqueta');
 act(()=>renderer.unmount());
});

test('sin fecha de relación la ficha queda solo con el alta (#145)',async()=>{
 await mount(summary(null));
 const copy=text(renderer.root);
 assert.match(copy,/Cliente desde/);
 assert.match(copy,/31 mar 26/);
 assert.equal(copy.includes('Inicio de relación'),false);
 act(()=>renderer.unmount());
});
