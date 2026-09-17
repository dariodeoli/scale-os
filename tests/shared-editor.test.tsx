import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
let insideDialog=true,closes=0,pending=false;
const close=()=>{assert.equal(pending,false,'do not close before the save settles');closes++;};
function Actions({children}:{children:React.ReactNode}){return <div>{children}</div>;}
function SelectStub(props:Record<string,unknown>){return <button type="button" disabled={Boolean(props.disabled)} aria-invalid={props.invalid?true:undefined} aria-describedby={String(props.describedBy||'')}>{String(props.label)}</button>;}
function AmountStub(props:Record<string,unknown>){return <input id={String(props.id)} disabled={Boolean(props.disabled)} aria-invalid={props.invalid?true:undefined} aria-describedby={String(props.describedBy||'')}/>;}
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
mock('../app/dialog',{Dialog:Actions,FormActions:Actions,useDialogClose:()=>insideDialog?close:undefined,useDialogPending:(value:boolean)=>{pending=value;}});
mock('../app/profile-controls',{SelectCustom:SelectStub,AmountInput:AmountStub});
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const event=()=>({preventDefault(){},persist(){}});
const submit=(r:ReactTestRenderer)=>r.root.findByType('form').props.onSubmit(event());
const buttons=(r:ReactTestRenderer)=>r.root.findAllByType('button');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

async function main(){
 let r:ReactTestRenderer;const writes:Record<string,string>[]=[];
 await act(async()=>{r=create(<Editor fields={[{key:'name',label:'Nombre',help:'Usá el nombre completo'},{key:'notes',label:'Notas',optional:true,type:'textarea'}]} defaults={{name:'',notes:''}} save={async v=>{writes.push(v);}}/>);});
 const input=r!.root.findByType('input');
 assert(input.props.id);assert.equal(r!.root.findAllByType('label')[0].props.htmlFor,input.props.id);
 assert(input.props['aria-describedby'].endsWith('-help'));assert(JSON.stringify(r!.toJSON()).includes('Opcional'));
 await act(async()=>{await submit(r!);});
 assert.equal(writes.length,0);assert.equal(closes,0);assert.equal(input.props['aria-invalid'],true);
 const error=r!.root.findAllByProps({role:'alert'})[0];assert(input.props['aria-describedby'].includes(error.props.id));
 await act(async()=>{r!.unmount();});

 let rejectSave:(e:Error)=>void=()=>{},resolveSave:()=>void=()=>{},calls=0;
 const save=()=>{calls++;return new Promise<void>((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;});};
 await act(async()=>{r=create(<Editor closeOnSave fields={[{key:'name',label:'Nombre'},{key:'role',label:'Permiso',choices:[{value:'viewer',label:'Solo lectura'}]},{key:'amount',label:'Importe',type:'money'}]} defaults={{name:'Ana',role:'viewer',amount:'10'}} save={save}/>);});
 let first:Promise<void>,second:Promise<void>;
 await act(async()=>{first=submit(r!);second=submit(r!);await tick();});
 assert.equal(calls,1);assert.equal(pending,true);assert.equal(closes,0);
 assert(buttons(r!).every(b=>b.props.disabled));assert(r!.root.findAllByType('input').every(i=>i.props.disabled));
 await act(async()=>{rejectSave(new Error('No se pudo guardar'));await Promise.all([first!,second!]);});
 assert.equal(pending,false);assert.equal(closes,0);assert(JSON.stringify(r!.toJSON()).includes('No se pudo guardar'));
 assert(r!.root.findByType('form').props['aria-busy']===false);
 // The values used for the retry are preserved, not reset by failure.
 const captured:Record<string,string>[]=[];
 await act(async()=>{r!.update(<Editor closeOnSave fields={[{key:'name',label:'Nombre'}]} defaults={{name:'No reiniciar'}} save={async v=>{captured.push(v);}}/>);});
 await act(async()=>{await submit(r!);});
 assert.equal(captured[0].name,'Ana');assert.equal(closes,1);
 await act(async()=>{r!.unmount();});

 // Detail drawers can save inline without forcing the parent to disappear.
 await act(async()=>{r=create(<Editor fields={[{key:'name',label:'Nombre'}]} defaults={{name:'Detalle'}} save={async()=>{}}/>);});
 await act(async()=>{await submit(r!);});
 assert.equal(closes,1);const cancel=buttons(r!).find(b=>b.props.children==='Cancelar');assert(cancel);assert.equal(cancel.props.type,'button');
 await act(async()=>{cancel.props.onClick();});assert.equal(closes,2);
 await act(async()=>{r!.unmount();});
 // Comment-style inline forms clear only after a successful publication.
 let shouldFail=true;
 await act(async()=>{r=create(<Editor resetOnSave cancelLabel={false} fields={[{key:'body',label:'Comentario',type:'textarea'}]} defaults={{body:''}} save={async()=>{if(shouldFail)throw Error('No publicado');}}/>);});
 await act(async()=>{await r!.root.findByType('textarea').props.onChange({target:{name:'body',value:'Comentario nuevo'},type:'change'});});
 await act(async()=>{await submit(r!);});
 assert(JSON.stringify(r!.toJSON()).includes('No publicado'));
 const published:Record<string,string>[]=[];shouldFail=false;
 await act(async()=>{r!.update(<Editor resetOnSave cancelLabel={false} fields={[{key:'body',label:'Comentario',type:'textarea'}]} defaults={{body:''}} save={async values=>{published.push(values);}}/>);});
 await act(async()=>{await submit(r!);});
 assert.equal(published[0].body,'Comentario nuevo');
 await act(async()=>{await submit(r!);});
 assert.equal(published.length,1,'empty reset comment must fail required validation');assert.equal(closes,2);
 await act(async()=>{r!.unmount();});
  insideDialog=false;
  await act(async()=>{r=create(<Editor fields={[{key:'name',label:'Nombre'}]} defaults={{name:'Ajustes'}} save={async()=>{}}/>);});
  assert.equal(buttons(r!).length,1,'inline page settings must not get a dialog cancel button');
  await act(async()=>r!.unmount());
  // Inline lookups query with the current field value and apply returned values.
  const lookups:string[]=[];const lookupSaved:Record<string,string>[]=[];
  await act(async()=>{r=create(<Editor fields={[{key:'tax_id',label:'RUC',lookup:{label:'Buscar datos por RUC',run:async value=>{lookups.push(value);return {legal_name:'RAZON S.A.',tax_id:'80012345-6'};}}},{key:'legal_name',label:'Razón social'}]} defaults={{tax_id:'',legal_name:''}} save={async v=>{lookupSaved.push(v);}}/>);});
  await act(async()=>{r!.root.findAllByType('input')[0].props.onChange({target:{name:'tax_id',value:'80012345'}});});
  const lookupButton=r!.root.findAllByType('button').find(node=>String(node.props.children).includes('Buscar'))!;
  await act(async()=>{await lookupButton.props.onClick();});
  await act(async()=>{});
  assert.deepEqual(lookups,['80012345'],'the lookup receives the typed value');
  await act(async()=>{await submit(r!);});
  assert.equal(lookupSaved.at(-1)!.legal_name,'RAZON S.A.','returned fields land in the form');
  assert.equal(lookupSaved.at(-1)!.tax_id,'80012345-6','the canonical RUC replaces the typed value');
  await act(async()=>r!.unmount());
  await act(async()=>{r=create(<Editor fields={[{key:'tax_id',label:'RUC',lookup:{label:'Buscar datos por RUC',run:async()=>({})}}]} defaults={{tax_id:''}} save={async()=>{}}/>);});
  const beforeEmpty=lookups.length;
  await act(async()=>{await r!.root.findAllByType('button').find(node=>String(node.props.children).includes('Buscar'))!.props.onClick();});
  await act(async()=>{});
  assert.equal(lookups.length,beforeEmpty,'an empty value never reaches the provider');
  assert(JSON.stringify(r!.toJSON()).includes('Escribí RUC primero'),'the form explains why nothing was queried');
  await act(async()=>r!.unmount());
  // Phone fields share the country code control, normalize typed values and validate digits.
  const phoneWrites:Record<string,string>[]=[];
  await act(async()=>{r=create(<Editor fields={[{key:'phone',label:'Teléfono',type:'phone',optional:true,help:'Elegí el país'}]} defaults={{phone:''}} save={async v=>{phoneWrites.push(v);}}/>);});
  const telInput=(()=>r!.root.findAllByType('input').find(node=>node.props.inputMode==='tel'))();
  assert(telInput,'the phone field renders a tel input');
  assert.equal(r!.root.findByType('select').props['aria-label'],'Código de país');
  await act(async()=>{telInput!.props.onChange({target:{value:'0981 123 456'}});});
  await act(async()=>{await submit(r!);});
  assert.equal(phoneWrites.at(-1)!.phone,'+595 981123456','typed phone keeps the country code and strips the trunk zero');
  await act(async()=>{r!.root.findAllByType('input').find(node=>node.props.inputMode==='tel')!.props.onChange({target:{value:'123'}});});
  await act(async()=>{await submit(r!);});
  assert.equal(phoneWrites.length,1,'an incomplete phone never reaches the save');
  assert(JSON.stringify(r!.toJSON()).includes('Ingresá un teléfono válido'));
  await act(async()=>r!.unmount());
  // Integer number fields request the numeric keypad and reject decimals.
  const numberWrites:Record<string,string>[]=[];
  await act(async()=>{r=create(<Editor fields={[{key:'probability',label:'Probabilidad (%)',type:'number',integer:true,optional:true}]} defaults={{probability:'10'}} save={async v=>{numberWrites.push(v);}}/>);});
  const numberInput=r!.root.findByType('input');
  assert.equal(numberInput.props.inputMode,'numeric');
  assert.equal(numberInput.props.step,'1');
  await act(async()=>{numberInput.props.onChange({target:{name:'probability',value:'10.5'},type:'change'});});
  await act(async()=>{await submit(r!);});
  assert.equal(numberWrites.length,0,'decimals never reach an integer save');
  assert(JSON.stringify(r!.toJSON()).includes('Ingresá un número entero'));
  await act(async()=>{r!.root.findByType('input').props.onChange({target:{name:'probability',value:'70'},type:'change'});});
  await act(async()=>{await submit(r!);});
  assert.equal(numberWrites.at(-1)!.probability,'70');
  await act(async()=>r!.unmount());
  console.log('PASS shared editor: linked labels/help/errors, optional fields, required validation, single-flight save, disabled controls, error retry/draft preservation, deferred close only on success, cancel and inline detail opt-out, inline lookups that query and apply returned values, phone fields that normalize and validate, integer fields that keep the numeric keypad');
}
test('Shared editor validation and complete save/cancel lifecycle',main);
