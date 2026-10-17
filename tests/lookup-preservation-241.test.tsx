import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {Editor}=require('../app/operations') as typeof import('../app/operations');
const submit=(r:ReactTestRenderer)=>r.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});
const button=(r:ReactTestRenderer,label:string)=>r.root.findAllByType('button').find(n=>n.props.children===label)!;
const change=async(r:ReactTestRenderer,name:string,value:string)=>{await act(async()=>{await r.root.findAllByType('input').find(n=>n.props.name===name)!.props.onChange({type:'change',target:{name,value}});});};

test('late lookup results cannot overwrite manual data until explicit Apply; Discard preserves edits',async()=>{
 let resolve!:(value:Record<string,string>)=>void;const writes:Record<string,string>[]=[];let r!:ReactTestRenderer;
 await act(async()=>{r=create(<Editor fields={[{key:'tax_id',label:'RUC',lookup:{label:'Consultar',run:()=>new Promise(done=>{resolve=done;})}},{key:'legal_name',label:'Razón social'},{key:'locked',label:'No editable',disabled:true}]} defaults={{tax_id:'80012345',legal_name:'Manual inicial',locked:'Original'}} save={async v=>{writes.push(v);}}/>);});
 act(()=>button(r,'Consultar').props.onClick());await change(r,'legal_name','Edición mientras consulta');
 await act(async()=>{resolve({tax_id:'80012345-6',legal_name:'Proveedor',locked:'No autorizado',unknown:'No debe crear campo'});});
 await act(async()=>{await submit(r);});assert.equal(writes.at(-1)!.legal_name,'Edición mientras consulta');assert.equal(writes.at(-1)!.tax_id,'80012345');
 act(()=>button(r,'Descartar datos consultados').props.onClick());await act(async()=>{await submit(r);});assert.equal(writes.at(-1)!.legal_name,'Edición mientras consulta');
 act(()=>button(r,'Consultar').props.onClick());await act(async()=>{resolve({tax_id:'80012345-6',legal_name:'Proveedor',locked:'No autorizado',unknown:'No debe crear campo'});});
 act(()=>button(r,'Aplicar datos consultados').props.onClick());await act(async()=>{await submit(r);});
 assert.equal(writes.at(-1)!.legal_name,'Proveedor');assert.equal(writes.at(-1)!.tax_id,'80012345-6');assert.equal(writes.at(-1)!.locked,'Original');assert.equal('unknown' in writes.at(-1)!,false);
 act(()=>r.unmount());
});

test('lookup not-found and provider errors leave identifiers and manual data available',async()=>{
 for(const message of ['No encontramos una ficha publicada para ese RUC.','Proveedor temporalmente no disponible.']){
  let r!:ReactTestRenderer;const writes:Record<string,string>[]=[];
  await act(async()=>{r=create(<Editor fields={[{key:'tax_id',label:'RUC',lookup:{label:'Consultar',run:async()=>{throw new Error(message);}}},{key:'name',label:'Nombre'}]} defaults={{tax_id:'80012345',name:'Manual'}} save={async v=>{writes.push(v);}}/>);});
  await act(async()=>{button(r,'Consultar').props.onClick();});assert(JSON.stringify(r.toJSON()).includes(message));
  await act(async()=>{await submit(r);});assert.deepEqual(writes,[{tax_id:'80012345',name:'Manual'}]);assert.equal(button(r,'Aplicar datos consultados'),undefined);
  act(()=>r.unmount());
 }
});
