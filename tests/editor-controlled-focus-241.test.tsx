import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer,type ReactTestInstance} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
function mock(path:string,exports:unknown){const id=require.resolve(path);require.cache[id]={id,filename:id,loaded:true,exports} as NodeModule;}
const Container=({children}:{children:React.ReactNode})=><div>{children}</div>;
const Money=(p:Record<string,any>)=><input value={p.value} disabled={p.disabled} aria-invalid={p.invalid||undefined} onChange={e=>p.onChange(e.target.value)}/>;
const Select=(p:Record<string,any>)=><button type="button" disabled={p.disabled} aria-invalid={p.invalid||undefined} onClick={()=>p.onChange('chosen')}>{p.label}</button>;
mock('../app/profile-controls',{AmountInput:Money,SelectCustom:Select});
mock('../app/dialog',{Dialog:Container,FormActions:Container,useDialogClose:()=>undefined,useDialogPending:()=>{}});
const {Editor}=require('../app/operations') as typeof import('../app/operations');
import type {Field} from '../app/operations';
import {PhoneField} from '../app/phone-field';
import {EmailField} from '../app/email-field';
const submit=(r:ReactTestRenderer)=>r.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});

async function main(){
 for(const type of ['phone','email','money','select'] as const){
  let r!:ReactTestRenderer;const focused:string[]=[];let writes=0;
  const controls=new Map<ReactTestInstance,any>();
  const nativeNode=(instance:ReactTestInstance,key:string)=>{
   if(!controls.has(instance))controls.set(instance,{
    getAttribute:(attribute:string)=>instance.props[attribute]===undefined?null:String(instance.props[attribute]),
    hasAttribute:(attribute:string)=>Boolean(instance.props[attribute]),
    focus:()=>{
     const section=r.root.findAllByType('details').find(node=>node.props.children?.[0]?.props.children?.[0]==='Contacto');
     if(key==='controlled')assert.equal(section?.props.open,true,'section is committed open before focus');
     assert.equal(instance.props.disabled,undefined===instance.props.disabled?undefined:false,'pending controls are enabled before focusing');
     focused.push(`${key}:${instance.type}`);
    },
    closest:()=>null,
   });
   return controls.get(instance);
  };
  const formNode={querySelectorAll:()=>r.root.findAll(node=>typeof node.props['data-field']==='string').map(wrapper=>({
   getAttribute:()=>wrapper.props['data-field'],
   querySelectorAll:()=>wrapper.findAll(node=>['input','select','textarea','button'].includes(String(node.type))).map(node=>nativeNode(node,wrapper.props['data-field'])),
  }))};
  const fields:Field[]=[{key:'intro',label:'Referencia',optional:true,section:'Datos'},{key:'controlled',label:'Contacto',section:'Contacto',...(type==='select'?{choices:[{value:'chosen',label:'Elegido'}]}:{type})},{key:'later',label:'Otro requerido',section:'Contacto'}];
  const initial=type==='phone'?'123':type==='email'?'invalid':'';
  await act(async()=>{r=create(<Editor collapseSections fields={fields} defaults={{intro:'Sin tocar',controlled:initial,later:''}} save={async()=>{writes++;}}/>,{createNodeMock:element=>element.type==='form'?formNode:null});});
  const wrapper=()=>r.root.findByProps({'data-field':'controlled'});
  const originalWrapper=wrapper();
  assert.equal(r!.root.findAllByType('details')[1].props.open,false,'invalid controlled field starts in collapsed section');
  await act(async()=>{await submit(r!);});
  assert.deepEqual(focused,[`controlled:${type==='select'?'button':'input'}`],`${type} invalid submit must focus controlled field before later registered native input`);
  assert.equal(writes,0);assert.equal(wrapper(),originalWrapper,'focus/reveal never remounts field');
  assert(wrapper().findAllByProps({role:'alert'}).length>0);
  await act(async()=>{await submit(r!);});
  assert.equal(focused.length,2,'same invalid submit focuses again');
  const before=focused.length;
  await act(async()=>{await r.root.findAllByType('input').find(node=>node.props.name==='intro')!.props.onChange({type:'change',target:{name:'intro',value:'Otra referencia'}});});
  assert.equal(focused.length,before,'unrelated registered edits never steal focus');
  await act(async()=>{
   if(type==='phone')r.root.findByType(PhoneField).props.onChange('+595 981123456');
   else if(type==='email')r.root.findByType(EmailField).props.onChange('ana@example.com');
   else if(type==='money')r.root.findByType(Money).props.onChange('15');
   else r.root.findByType(Select).props.onChange('chosen');
  });
  assert.equal(focused.length,before,'value/error changes alone never steal focus');
  assert.equal(wrapper(),originalWrapper);
  assert.equal(r.root.findByProps({'data-field':'intro'}).props['data-field'],'intro');
  await act(async()=>r.unmount());
 }
 // First failing field may be disabled and uncorrectable; select next editable field.
 let r!:ReactTestRenderer;const focused:string[]=[];
 const formNode={querySelectorAll:()=>['locked','editable'].map(key=>({getAttribute:()=>key,querySelectorAll:()=>[{getAttribute:(name:string)=>name==='aria-invalid'?'true':null,hasAttribute:()=>false,closest:()=>null,focus:()=>focused.push(key)}]}))};
 await act(async()=>{r=create(<Editor fields={[{key:'locked',label:'Reservado',type:'email',disabled:true},{key:'editable',label:'Correo',type:'email'}]} defaults={{locked:'invalid',editable:'invalid'}} save={async()=>assert.fail('must not save')}/>,{createNodeMock:element=>element.type==='form'?formNode:null});});
 await act(async()=>{await submit(r!);});assert.deepEqual(focused,['editable']);
 await act(async()=>r.unmount());
 console.log('PASS: controlled Editor focus #241 — phone/email/money/select, repeat submit, committed section, disabled skip, stable draft and no focus stealing on edits (fake DOM)');
}
void main();
