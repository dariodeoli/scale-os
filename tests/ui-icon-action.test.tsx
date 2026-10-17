import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import {IconAction} from '../app/ui/icon-action';

test('all nine locally observed icon names render through the canonical button',()=>{
 for(const icon of ['check','clock','close','edit','eye','package','refresh','sliders','trash']){
  const html=renderToStaticMarkup(<IconAction icon={icon} label="Acción"/>);
  assert.match(html,/data-ui-icon-button=""/);assert.match(html,/<svg/);assert.match(html,/aria-label="Acción"/);assert.match(html,/type="button"/);
 }
 assert.throws(()=>renderToStaticMarkup(<IconAction icon="unknown" label="Acción"/>),/desconocido/);
});

test('tone, aria name, title, native ref and callback identity survive the adapter',async()=>{
 let calls=0;const click=()=>{calls++;};const ref=React.createRef<HTMLButtonElement>();const node={};let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<IconAction ref={ref} icon="trash" tone="bad" label="Quitar" ariaLabel="Quitar equipo" title="Archivo" disabled onClick={click} form="save" name="action" value="archive" type="submit"/>,{createNodeMock:e=>e.type==='button'?node:null});});
 const b=renderer!.root.findByType('button');assert.equal(ref.current,node);assert.equal(b.props.onClick,click);assert.equal(calls,0);
 for(const [key,value] of Object.entries({'data-ui-color':'danger','aria-label':'Quitar equipo',title:'Archivo',disabled:true,form:'save',name:'action',value:'archive',type:'submit'}))assert.equal(b.props[key],value);
 await act(async()=>renderer!.unmount());
 for(const [tone,color] of Object.entries({fono:'brand',ok:'success',warn:'warning',bad:'danger'}))assert.match(renderToStaticMarkup(<IconAction icon="eye" tone={tone as 'fono'} label="Ver"/>),new RegExp(`data-ui-color="${color}"`));
});
