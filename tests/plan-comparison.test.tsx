import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const dialogId=require.resolve('../app/dialog');
require.cache[dialogId]={id:dialogId,filename:dialogId,loaded:true,exports:{Dialog:({children}:{children:React.ReactNode})=><section role="dialog">{children}</section>}} as NodeModule;
const composerId=require.resolve('../app/quote-composer');
require.cache[composerId]={id:composerId,filename:composerId,loaded:true,exports:{QuoteComposer:({record}:{record:{id:string}})=><output>{record.id}</output>}} as NodeModule;
const {PlanComparison,comparePlans,planAmount}=require('../app/plan-comparison') as typeof import('../app/plan-comparison');
const {CatalogWorkspace}=require('../app/suite') as typeof import('../app/suite');
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const fixture={id:'fixture',name:'Plan de prueba',currency:'USD',active:false,notes:'Condición completa\nFuente: documento de prueba. IVA a confirmar.',items:[
 {description:'Videos',quantity:2,unitPrice:'12.25'},
 {description:'Diseño',quantity:1.5,unit_price:'10.50'},
 {description:'Incluido',quantity:1,unitPrice:'0',unit_price:'999'},
 {description:'Revisión',quantity:1,unitPrice:'5'},
]};

test('preserves unified calculations, all items, legacy fields, zero, six currencies and invalid-data safety',()=>{
 assert.equal(comparePlans([fixture])[0].total,45.25);
 for(const currency of ['PYG','USD','EUR','BRL','ARS','MXN'])assert.notEqual(planAmount(45.25,currency),'No disponible');
 assert.equal(planAmount(45.25,'invalid'),'No disponible');
 for(const items of [[],undefined,[null],[{quantity:1}],[{quantity:'x',unitPrice:5}],[{quantity:0,unitPrice:1}],[{quantity:1,unitPrice:-1}],[{quantity:1,unitPrice:''}],[{quantity:1e308,unitPrice:1e308}],[{quantity:1,unitPrice:1e308},{quantity:1,unitPrice:1e308}]])assert.equal(comparePlans([{...fixture,items}])[0].total,null);
 assert.equal(comparePlans([{...fixture,items:[{quantity:1,unitPrice:'0'}]}])[0].total,0);
 const repeated=comparePlans([{...fixture,items:[fixture.items[0],fixture.items[0]]}])[0];
 assert.equal(repeated.items.length,2);assert.equal(repeated.total,49);
});

test('long package descriptions and full conditions are visible, without turning each deliverable into a priced item',()=>{
 const deliverables=Array.from({length:16},(_,i)=>`Entregable ${i+1}: descripción completa sin recortes`);
 const notes='Condiciones completas: '+('Alcance acordado y fuente documental. '.repeat(30));
 let renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<PlanComparison plans={[{...fixture,items:[{description:deliverables.join('; '),quantity:1,unitPrice:'1234.50'}],notes},{...fixture,id:'second',currency:'PYG'}]}/>);});
 const root=renderer.root,copy=text(root);
 for(const description of deliverables)assert(copy.includes(description));assert(copy.includes(notes));
 assert(copy.includes(planAmount(1234.5,'USD')));assert(copy.includes('Cantidad del ítem: 1'));
 assert.equal(root.findAllByType('details').length,0);assert.equal(root.findAllByProps({role:'dialog'}).length,0);
 assert.equal(root.findAllByType('button').length,0);assert.equal(root.findAllByProps({className:'plan-comparison-item'}).length,5);
 assert(copy.includes('Sin IVA'));assert(copy.includes('El IVA se define en el presupuesto'));
 assert(!/mensual|IVA incluido|NaN|Infinity/.test(copy));
 const scroll=root.findByProps({role:'region'});assert.equal(scroll.props.tabIndex,0);assert(scroll.props['aria-describedby']);
 assert.equal(root.findAllByProps({scope:'col'}).length,3);assert.equal(root.findAllByProps({scope:'row'}).length,3);
 const css=readFileSync(new URL('../app/plan-comparison.css',import.meta.url),'utf8');
 assert(css.includes('overflow-x:auto'));assert(css.includes(':focus-visible'));assert(css.includes('overflow-wrap:anywhere'));assert(css.includes('white-space:pre-wrap'));assert(css.includes('min-height:44px'));
 assert(!/line-clamp|text-overflow:ellipsis|display:none/.test(css));
 act(()=>renderer.unmount());
});

test('matches backend rounding of unit prices and each line before summing',()=>{
 const plan={...fixture,items:[{description:'Fracción A',quantity:.33,unitPrice:'.10'},{description:'Fracción B',quantity:.33,unit_price:'.10'}]};
 const result=comparePlans([plan])[0];
 assert.deepEqual(result.items.map(item=>item.subtotal),[.03,.03]);assert.equal(result.total,.06);
 assert.equal(comparePlans([{...fixture,items:[{description:'Normalización',quantity:2,unitPrice:'.105'}]}])[0].total,.22);
 let renderer!:ReactTestRenderer;
 act(()=>{renderer=create(<PlanComparison plans={[plan]}/>);});
 const row=renderer.root.findByProps({className:'plan-comparison-total'});
 assert(text(row).includes(planAmount(.06,'USD')));assert(!text(row).includes(planAmount(.07,'USD')));
 assert.equal(renderer.root.findAllByProps({className:'plan-comparison-item-price'}).filter(node=>text(node).includes(`Subtotal: ${planAmount(.03,'USD')}`)).length,2);
 act(()=>renderer.unmount());
});

test('catalog renders comparison without preview/read amplification and preserves eight-role edit controls',async t=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  assert.equal(String(input),'/core-api/api/agency/plans');assert.equal(init?.method,'GET');requests++;
  return Response.json({records:[fixture]});
 });
 for(const role of ['owner','admin','management','finance','sales','production','editor','viewer','colaborador']){
  let renderer!:ReactTestRenderer;
  await act(async()=>{renderer=create(<CatalogWorkspace kind="plans" role={role}/>);});
  const root=renderer.root,copy=text(root),editable=['owner','admin','management','finance','sales','production','colaborador'].includes(role);
  assert(copy.includes(planAmount(45.25,'USD')));assert(copy.includes('Archivado'));assert(copy.includes(fixture.notes));
  assert.equal(root.findAllByProps({className:'plan-comparison-item'}).length,4);
  assert.equal(root.findAllByProps({role:'dialog'}).length,0);
  const buttons=root.findAllByType('button');assert(!buttons.some(button=>text(button)==='Vista previa'));
  for(const label of ['Agregar','Editar'])assert.equal(buttons.some(button=>text(button)===label),editable,`${role}: ${label}`);
  assert.equal(buttons.some(button=>String(button.props['aria-label']||'').startsWith('Mover a la papelera')),editable,`${role}: papelera`);
  if(editable){act(()=>buttons.find(button=>text(button)==='Editar')!.props.onClick());assert.equal(text(root.findByType('output')),fixture.id);}
  act(()=>renderer.unmount());
 }
 assert.equal(requests,9,'one existing list read per mount, no comparison-specific queries');
});
