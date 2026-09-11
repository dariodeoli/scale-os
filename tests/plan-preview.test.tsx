import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 Dialog:({children}:{children:React.ReactNode})=><div role="dialog">{children}</div>,
}} as NodeModule;
const composerPath=require.resolve('../app/quote-composer');
require.cache[composerPath]={id:composerPath,filename:composerPath,loaded:true,exports:{
 QuoteComposer:({record}:{record:{id:string}})=><output>{record.id}</output>,
}} as NodeModule;
const {CatalogWorkspace}=require('../app/suite') as typeof import('../app/suite');
const {PlanComparison}=require('../app/plan-comparison') as typeof import('../app/plan-comparison');
const {money}=require('../app/operations') as typeof import('../app/operations');
const {CompanyCurrencyProvider}=require('../app/currency-provider') as typeof import('../app/currency-provider');
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const fixture={id:'plan-1',name:'Contenido',currency:'USD',active:false,notes:'Entrega coordinada\nSin permanencia',items:[
 {description:'Videos',quantity:2,unitPrice:'12.25'},
 {description:'Diseño',quantity:1.5,unit_price:'10.50'},
 {description:'Incluido',quantity:1,unitPrice:'0',unit_price:'999'},
 {description:'Revisión',quantity:1,unitPrice:'5'},
]};
let renderer:ReactTestRenderer;
const originalFetch=globalThis.fetch;
const requests:{url:string;method:string}[]=[];
globalThis.fetch=async(input,init)=>{
 requests.push({url:String(input),method:init?.method||'GET'});
 assert.equal(String(input),'/core-api/api/agency/plans');
 assert.equal(init?.method,'GET','preview never writes');
 return new Response(JSON.stringify({records:[fixture]}));
};
async function run(){
 try{
  for(const role of ['viewer','editor','production','owner','admin','management','finance','sales']){
   await act(async()=>{renderer=create(<CompanyCurrencyProvider organizationId="test" defaultCurrency="PYG"><CatalogWorkspace kind="plans" role={role}/></CompanyCurrencyProvider>);});
   const preview=renderer!.root.findByProps({className:'plan-comparison'});
   assert.match(text(preview),/Videos/);
   assert.match(text(preview),/Cantidad del ítem: 1,5/);
   assert(text(preview).includes(`Precio unitario: ${money(12.25,'USD')}`));
   assert(text(preview).includes(`Subtotal: ${money(24.5,'USD')}`));
   assert(text(preview).includes(money(45.25,'USD')),'total includes all visible items and uses the unified money formatter');
   assert.match(text(preview),/sin IVA/i);
   assert.doesNotMatch(text(preview),/mensual|999/);
   assert.equal(preview.findAllByType('li').length,4);
   assert.equal(preview.findAllByType('details').length,0,'replacement comparison keeps every item visible');
   assert.equal(preview.findAllByType('summary').length,0);
   assert.match(text(preview),/Revisión/,'fourth item is displayed without expansion');
   assert.match(text(renderer!.root),/Archivado/);
   assert.equal(renderer!.root.findAllByProps({role:'dialog'}).length,0,'preview is inline without opening editor');
   const editable=['owner','admin','management','finance','sales'].includes(role);
   const buttons=renderer!.root.findAllByType('button');
   for(const label of ['Agregar','Editar','Eliminar'])assert.equal(buttons.some(button=>text(button)===label),editable,`${role}: ${label}`);
   if(editable){
    act(()=>buttons.find(button=>text(button)==='Editar')!.props.onClick());
    assert.equal(text(renderer!.root.findByType('output')),fixture.id,'existing edit selects the same plan');
   }
   act(()=>renderer!.unmount());
  }
  assert.equal(requests.length,8,'only the existing catalog read per mount');
  for(const currency of ['PYG','USD','EUR','BRL','ARS','MXN']){
   act(()=>{renderer=create(<PlanComparison plans={[{...fixture,currency}]}/>);});
   assert(text(renderer!.root).includes(money(45.25,currency)));
   act(()=>renderer!.unmount());
  }
  for(const items of [[],undefined,[{description:'Incompleto',quantity:1}],[{description:'Inválido',quantity:'x',unitPrice:5}],[null]]){
   act(()=>{renderer=create(<PlanComparison plans={[{...fixture,items}]}/>);});
   assert.match(text(renderer!.root.findByProps({className:'plan-comparison-total'})),/No disponible/);
   assert.doesNotMatch(text(renderer!.root),/NaN|Infinity/);
   act(()=>renderer!.unmount());
  }
  act(()=>{renderer=create(<PlanComparison plans={[{...fixture,items:[{description:'Incluido',quantity:1,unitPrice:'0'}]}]}/>);});
  assert(text(renderer!.root.findByProps({className:'plan-comparison-total'})).includes(money(0,'USD')),'zero is a valid price');
  act(()=>renderer!.unmount());
  console.log('PASS: full comparison retains unified monetary format, quantities, all-item prices, six currencies, legacy fields, zero/incomplete data, archived state, eight roles, edit selection and read-only requests. No hidden items, browser or external requests.');
 }finally{globalThis.fetch=originalFetch;}
}
void run();
