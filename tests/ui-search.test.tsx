import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {SearchField}=require('../app/search-field') as typeof import('../app/search-field');

test('search keeps native input ref and raw controlled value; clear restores focus',async()=>{
 const seen:string[]=[],ref=React.createRef<HTMLInputElement>();let focused=0;
 const node={focus(){focused++;}};let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<SearchField ref={ref} label="Buscar cliente" value="  Acmé " onChange={value=>seen.push(value)} hideLabel/>,{createNodeMock:element=>element.type==='input'?node:null});});
 const input=renderer.root.findByType('input'),label=renderer.root.findByType('label');
 assert.equal(ref.current,node);assert.equal(input.props.type,'search');
 assert.equal(input.props.value,'  Acmé ');assert.equal(label.props.htmlFor,input.props.id);
 input.props.onChange({target:{value:'  Acmé ñ'}});assert.deepEqual(seen,['  Acmé ñ']);
 const clear=renderer.root.findByType('button');assert.equal(clear.props.type,'button');
 assert.equal(clear.props['aria-label'],'Limpiar buscar cliente');
 clear.props.onClick();assert.deepEqual(seen,['  Acmé ñ','']);assert.equal(focused,1);
 await act(async()=>renderer.unmount());assert.equal(ref.current,null);
});
test('pending locks both input and clear, and errors retain the same controlled value',async()=>{
 let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<SearchField label="Buscar" value="draft" onChange={()=>{}} pending invalid describedBy="search-error"/>);});
 const input=renderer.root.findByType('input');assert.equal(input.props.disabled,true);
 assert.equal(input.props['aria-invalid'],true);assert.equal(input.props['aria-describedby'],'search-error');
 assert.equal(renderer.root.findByType('button').props.disabled,true);
 await act(async()=>{renderer.update(<SearchField label="Buscar" value="draft" onChange={()=>{}} invalid describedBy="search-error"/>);});
 assert.equal(renderer.root.findByType('input'),input);assert.equal(input.props.value,'draft');assert.equal(input.props.disabled,false);
 await act(async()=>renderer.unmount());
});
