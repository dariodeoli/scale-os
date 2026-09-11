import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=(module:NodeModule)=>{module.exports={toggle:'toggle'};};
Object.assign(globalThis,{React});
const {ViewToggle}=require('../app/view-toggle') as typeof import('../app/view-toggle');
test('collection toggle is icon-only with accessible names and working selection',async()=>{
 let renderer:ReactTestRenderer;let selected='grid';
 await act(async()=>{renderer=create(<ViewToggle value="grid" label="Vista de proyectos" onChange={v=>{selected=v;}}/>);});
 const buttons=renderer!.root.findAllByType('button');
 assert.equal(buttons.length,2);
 assert.deepEqual(buttons.map(b=>b.props['aria-label']),['Ver como cuadrícula','Ver como lista']);
 for(const button of buttons){assert.equal(button.props.title,button.props['aria-label']);assert.equal(button.findAllByType('span').length,0);assert.equal(button.findAllByType('svg').length,1);}
 assert.equal(buttons[0].props['aria-pressed'],true);
 await act(async()=>buttons[1].props.onClick());assert.equal(selected,'list');
 await act(async()=>renderer!.unmount());
});
