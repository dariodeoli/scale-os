import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {LookupField,LookupReview,type LookupState} from '../app/ui/smart-field';
Object.assign(globalThis,{React});

test('LookupField compone controles canónicos, conserva valor crudo y delega permiso/consulta',async()=>{
 let r:ReactTestRenderer,calls=0,raw='';
 await act(async()=>{r=create(<LookupField id="ruc" label="Identificador" value="80.168.807-8" onChange={event=>{raw=event.target.value;}} lookupLabel="Buscar" onLookup={()=>{calls++;}} help="Carga manual permitida" policy={{allowed:false,reason:'Consulta no disponible'}}/>);});
 const input=r!.root.findByType('input'),button=r!.root.findByType('button');
 assert.equal(input.props.value,'80.168.807-8');assert.equal(input.props.disabled,false);assert.equal(button.props.disabled,true);assert.equal(button.props.type,'button');
 assert.equal(input.props['aria-describedby'],'ruc-help ruc-lookup');
 await act(async()=>input.props.onChange({target:{value:'nuevo valor manual'}}));assert.equal(raw,'nuevo valor manual');assert.equal(calls,0);
 await act(async()=>r!.update(<LookupField id="ruc" label="Identificador" value={raw} onChange={()=>{}} lookupLabel="Buscar" onLookup={()=>{calls++;}} state="loading"/>));
 assert.equal(r!.root.findByType('button').props.disabled,true);assert.equal(r!.root.findByType('input').props.disabled,false,'consultar no bloquea edición que cancela la consulta');
 for(const state of ['found','not-found','error','conflict'] as LookupState[]){
  await act(async()=>r!.update(<LookupField id="ruc" label="Identificador" value={raw} onChange={()=>{}} lookupLabel="Buscar" onLookup={()=>{calls++;}} state={state} message="Revisá los datos"/>));
  assert.equal(r!.root.findByProps({role:'status'}).props['data-lookup-state'],state);assert.equal(r!.root.findByType('input').props.value,raw);
 }
 await act(async()=>r!.root.findByType('button').props.onClick());assert.equal(calls,1);
 await act(async()=>r!.unmount());
});

test('LookupReview sólo confirma acciones explícitas y no muta datos al montar',async()=>{
 let r:ReactTestRenderer,applied=0,discarded=0;
 await act(async()=>{r=create(<LookupReview label="Revisar evidencia" heading="Resultado" onApply={()=>{applied++;}} onDiscard={()=>{discarded++;}}><p>Datos aportados por el consumidor</p></LookupReview>);});
 assert.equal(applied,0);assert.equal(discarded,0);assert(r!.root.findAllByType('button').every(button=>button.props.type==='button'));
 await act(async()=>r!.root.findAllByType('button')[1].props.onClick());assert.equal(discarded,1);assert.equal(applied,0);
 await act(async()=>r!.root.findAllByType('button')[0].props.onClick());assert.equal(applied,1);
 await act(async()=>r!.unmount());
});
