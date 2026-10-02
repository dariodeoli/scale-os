import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const {OrderForm}=require('../app/workspace-forms') as typeof import('../app/workspace-forms');
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');

// #137 C: «Nueva orden» elige el proyecto con buscador y muestra el resto del
// formulario recién al elegir (antes listaba ~20 proyectos como botones).
const projects=[
 {id:'1',name:'Campaña otoño',client_name:'Árbol Studio'},
 {id:'2',name:'Reels mensuales',client_name:'Norte'},
] as Parameters<typeof OrderForm>[0]['projects'];

test('Nueva orden elige el proyecto en un combobox y recién ahí muestra el resto',async()=>{
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<OrderForm projects={projects} request={async <T,>()=>({} as T)} done={()=>{}}/>);});
 const root=()=>renderer!.root;
 const combos=root().findAllByType(SelectCustom);
 assert.equal(combos.length,1,'sin proyecto sólo se ofrece el combobox');
 assert.equal(combos[0]!.props.label,'Proyecto');
 assert.deepEqual(combos[0]!.props.choices,[
  {value:'1',label:'Árbol Studio · Campaña otoño'},
  {value:'2',label:'Norte · Reels mensuales'},
 ],'cada opción nombra cliente y proyecto');
 assert.equal(root().findAllByType('fieldset').length,0,'el estado inicial no se muestra antes de elegir');
 assert.equal(root().findAllByType('textarea').length,0,'las notas no se muestran antes de elegir');
 assert.equal(root().findAllByType('input').length,0,'no hay campos de la orden antes de elegir');
 assert.equal(root().findAllByProps({placeholder:'https://drive.google.com/...'}).length,0);
 assert.equal(root().findAllByType('button').some(button=>button.children.join('').includes('Crear orden')),false,'no hay envío sin proyecto');

 await act(async()=>combos[0]!.props.onChange('1'));
 const title=root().findAllByProps({name:'title'});
 assert.equal(title.length,1,'elegido el proyecto aparece el resto del formulario');
 assert.equal(title[0]!.props.autoFocus,true,'el foco arranca en la orden de trabajo');
 assert.equal(root().findAllByType('fieldset').length,1);
 assert.equal(root().findAllByType('textarea').length,1);
 const tipos=root().findAllByType(SelectCustom);
 assert.equal(tipos.length,2,'además del proyecto se ofrece el tipo de trabajo');
 const change=root().findAllByType('button').find(button=>button.children.join('').includes('Cambiar'));
 assert.ok(change,'el proyecto elegido se puede cambiar');
 await act(async()=>change!.props.onClick());
 assert.equal(root().findAllByType('textarea').length,0,'cambiar proyecto vuelve al paso 1');
 assert.equal(root().findAllByType(SelectCustom).length,1);
 await act(async()=>renderer!.unmount());
});
