import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
import {Button,IconButton} from '../app/ui/button';

test('native ref, form association, type omission and handlers survive the facade',async()=>{
 const node={focus(){}};const ref=React.createRef<HTMLButtonElement>();let clicks=0;
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<Button ref={ref} form="external" formAction="/save" name="action" value="publish" className="consumer-class" data-record-id="42" onClick={()=>clicks++}>Publicar</Button>,{createNodeMock:element=>element.type==='button'?node:null});});
 const button=renderer!.root.findByType('button');
 assert.equal(ref.current,node);assert.equal(button.props.type,undefined);
 for(const [key,value] of Object.entries({form:'external',formAction:'/save',name:'action',value:'publish',className:'consumer-class','data-record-id':'42'}))assert.equal(button.props[key],value);
 button.props.onClick();assert.equal(clicks,1);
 await act(async()=>{renderer!.unmount();});assert.equal(ref.current,null);
});

test('loading disables native interaction without removing the accessible label',()=>{
 const html=renderToStaticMarkup(<Button loading icon={<svg/>}>Guardar</Button>);
 assert.match(html,/disabled=""/);assert.match(html,/aria-busy="true"/);
 assert.match(html,/data-ui-button-spinner="" aria-hidden="true"/);
 assert.match(html,/>Guardar<\/span>/);assert.doesNotMatch(html,/<svg/);
 assert.doesNotMatch(renderToStaticMarkup(<Button disabled>Cerrar</Button>),/aria-busy/);
 assert.match(renderToStaticMarkup(<Button aria-busy="true">Actualizar</Button>),/aria-busy="true"/);
});

test('explicit types, semantic variants and icon order remain independent',()=>{
 const html=renderToStaticMarkup(<Button type="button" variant="danger" size="compact" fullWidth icon={<svg/>} iconPosition="end">Eliminar</Button>);
 assert.match(html,/type="button"/);assert.match(html,/data-ui-color="danger"/);
 assert.match(html,/data-ui-size="compact"/);assert.match(html,/data-ui-full-width="true"/);
 assert(html.indexOf('data-ui-button-label')<html.indexOf('data-ui-button-icon'));
 assert.match(renderToStaticMarkup(<Button variant="outline" color="warning" type="reset">Restablecer</Button>),/data-ui-color="warning"/);
});

test('icon action keeps its label, ref and native type even while loading',async()=>{
 const ref=React.createRef<HTMLButtonElement>();const node={};let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<IconButton ref={ref} label="Abrir calendario" icon={<svg/>} type="button" loading/>,{createNodeMock:element=>element.type==='button'?node:null});});
 const button=renderer!.root.findByType('button');assert.equal(ref.current,node);
 assert.equal(button.props['aria-label'],'Abrir calendario');assert.equal(button.props.type,'button');
 assert.equal(button.props['data-ui-icon-button'],'');assert.equal(button.props['data-ui-variant'],'ghost');
 assert.equal(button.props.disabled,true);
 await act(async()=>{renderer!.unmount();});
});
