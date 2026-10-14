import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// Popups (#183): tamaños de Dialog, ConfirmDialog único y secciones del Editor.
// Componentes reales; solo se doblan el portal y el DOM que Dialog toca al montar.
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const reactDOM=require('react-dom');
reactDOM.createPortal=(children:React.ReactNode)=>children;
const listeners=new Map<string,Set<unknown>>();
const hostDocument={body:{style:{overflow:''}},activeElement:null as unknown,addEventListener(name:string,fn:unknown){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(fn);},removeEventListener(name:string,fn:unknown){listeners.get(name)?.delete(fn);}};
Object.defineProperty(globalThis,'document',{configurable:true,value:hostDocument});
const hostNode=()=>({tagName:'DIV',tabIndex:-1,isConnected:true,querySelectorAll:()=>[],querySelector:()=>null,closest:()=>null,contains:()=>true,focus(){hostDocument.activeElement=this;}});
const {Dialog,ConfirmDialog,dialogSize}=require('../app/dialog') as typeof import('../app/dialog');
const {Editor}=require('../app/operations') as typeof import('../app/operations');

let renderer:ReactTestRenderer|undefined;
async function mount(element:React.ReactElement){await act(async()=>{renderer=create(element,{createNodeMock:hostNode});});return renderer!.root;}
async function unmount(){await act(async()=>renderer?.unmount());renderer=undefined;}
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const button=(root:ReactTestInstance,label:string)=>root.findAllByType('button').find(entry=>text(entry)===label)!;

test('Dialog: tamaños nombrados y alias heredados mapean a la misma clase de tamaño',async()=>{
 const expected:[Parameters<typeof dialogSize>[0],string][]=[[undefined,'default'],['default','default'],['corto','corto'],['compact','corto'],['amplio','amplio'],['wide','amplio'],['drawer','drawer']];
 for(const [requested,size] of expected){
  const root=await mount(<Dialog title="Prueba" close={()=>{}} size={requested}><p>Cuerpo</p></Dialog>);
  const section=root.findByProps({role:'dialog'});
  assert.equal(section.props['data-dialog-size'],size,`size=${String(requested)} -> ${size}`);
  const overlay=renderer!.toJSON() as unknown as {props:{className:string}};
  assert.equal(overlay.props.className.includes('detail-drawer-overlay'),size==='drawer','solo drawer usa la ficha lateral');
  await unmount();
 }
 const drawer=await mount(<Dialog title="Ficha" close={()=>{}} variant="drawer"><p>x</p></Dialog>);
 assert.equal((renderer!.toJSON() as unknown as {props:{className:string}}).props.className.includes('detail-drawer-overlay'),true,'variant=drawer sigue funcionando');
 assert.equal(drawer.findByProps({role:'dialog'}).props['data-dialog-size'],'default');
 await unmount();
});

test('ConfirmDialog: variante danger, a11y de Dialog y bloqueo busy',async()=>{
 let confirmed=0,cancelled=0;
 const root=await mount(<ConfirmDialog variant="danger" title="Eliminar del equipo" description="Se quita el acceso." confirmLabel="Eliminar del equipo" error="No se pudo" onCancel={()=>{cancelled++;}} onConfirm={()=>{confirmed++;}}/>);
 const dialog=root.findByProps({role:'dialog'}),heading=root.findByType('h2');
 assert.equal(dialog.props['aria-labelledby'],heading.props.id);assert.equal(text(heading),'Eliminar del equipo');
 assert.equal(dialog.props['data-dialog-size'],'corto');
 assert.equal(root.findByType('form').props['data-variant'],'danger');
 const confirm=button(root,'Eliminar del equipo');
 assert.match(confirm.props.className,/danger/);assert.equal(confirm.props.type,'submit');assert.equal(confirm.props.disabled,false);
 assert.equal(root.findByProps({role:'alert'}).children.join(''),'No se pudo');
 await act(async()=>root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(confirmed,1);
 await act(async()=>button(root,'Cancelar').props.onClick());assert.equal(cancelled,1);
 await unmount();
 const busy=await mount(<ConfirmDialog variant="danger" busy title="Eliminar" confirmLabel="Eliminar" onCancel={()=>{cancelled++;}} onConfirm={()=>{confirmed++;}}/>);
 assert.equal(busy.findByProps({role:'dialog'})['props']['aria-busy'],true);
 assert.equal(button(busy,'Procesando…').props.disabled,true);assert.equal(button(busy,'Cancelar').props.disabled,true);
 assert.equal(busy.findByProps({title:'Cerrar'}).props.disabled,true,'busy bloquea también el cierre');
 await act(async()=>busy.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(confirmed,1,'busy no reenvía la confirmación');
 await unmount();
 await mount(<ConfirmDialog open={false} title="Cerrado" onCancel={()=>{}} onConfirm={()=>{}}/>);
 assert.equal(renderer!.toJSON(),null,'open=false no dibuja nada');
 await unmount();
});

test('ConfirmDialog: requireText bloquea la confirmación hasta tipear la palabra exacta',async()=>{
 let confirmed=0;
 const root=await mount(<ConfirmDialog variant="danger" title="Revertir cobro" confirmLabel="Revertir cobro" requireText="REVERTIR" onCancel={()=>{}} onConfirm={()=>{confirmed++;}}/>);
 const input=()=>root.findByType('input');
 assert.match(text(root.findByType('label')),/Escribí REVERTIR para confirmar/);
 assert.equal(button(root,'Revertir cobro').props.disabled,true);
 await act(async()=>root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(confirmed,0,'Enter sin la palabra no confirma');
 await act(async()=>input().props.onChange({target:{value:'revertir'}}));
 assert.equal(button(root,'Revertir cobro').props.disabled,true,'la palabra distingue mayúsculas');
 await act(async()=>input().props.onChange({target:{value:'REVERTIR'}}));
 assert.equal(button(root,'Revertir cobro').props.disabled,false);
 await act(async()=>root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(confirmed,1);
 await unmount();
});

const sectionFields=[
 {key:'a',label:'Nombre',section:'Datos'},
 {key:'b',label:'Correo de pagos',section:'Pagos'},
 {key:'c',label:'Notas internas',section:'Extras'},
];
const submit=async(root:ReactTestInstance)=>{await act(async()=>{await root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});};
const sections=(root:ReactTestInstance)=>root.findAllByType('details');

test('Editor: sección con error se abre sola y el resumen role=alert lista las secciones afectadas',async()=>{
 const root=await mount(<Editor fields={sectionFields} defaults={{a:'Ana',b:'',c:''}} collapseSections save={async()=>{}} cancelLabel={false}/>);
 assert.deepEqual(sections(root).map(entry=>entry.props.open),[true,false,false],'colapsado: solo la primera abierta');
 assert.equal(root.findAllByProps({role:'alert'}).length,0,'sin envío no hay resumen');
 await submit(root);
 assert.deepEqual(sections(root).map(entry=>entry.props.open),[true,true,false],'se abre la primera sección con error');
 const summary=root.findAllByProps({role:'alert'}).find(entry=>entry.props.className?.includes('form-error-summary'))!;
 assert.match(text(summary),/Revisá estas secciones/);assert.match(text(summary),/Pagos \(1\)/);assert.match(text(summary),/Extras \(1\)/);
 assert.doesNotMatch(text(summary),/Datos/);
 assert.match(text(sections(root)[1].findByType('summary')),/1 con error/);
 await act(async()=>button(summary,'Extras (1)').props.onClick());
 assert.equal(sections(root)[2].props.open,true,'el resumen lleva a la sección');
 await unmount();
});

test('Editor: compatibilidad, sin collapseSections todo queda abierto y sin section no hay resumen ni pasos',async()=>{
 const root=await mount(<Editor fields={sectionFields} defaults={{a:'',b:'',c:''}} save={async()=>{}} cancelLabel={false}/>);
 assert.deepEqual(sections(root).map(entry=>entry.props.open),[true,true,true],'uso heredado: secciones abiertas');
 assert.equal(root.findAllByProps({role:'group','aria-label':'Pasos del formulario'}).length,0);
 await unmount();
 const plain=await mount(<Editor fields={[{key:'a',label:'Nombre'}]} defaults={{a:''}} save={async()=>{}} cancelLabel={false}/>);
 await submit(plain);
 assert.equal(plain.findAllByType('details').length,0);
 assert.equal(plain.findAllByProps({role:'alert'}).filter(entry=>entry.type==='div').length,0,'sin secciones no hay resumen de secciones');
 await unmount();
});

test('Editor: en móvil con 3 o más secciones se muestran como pasos Anterior/Siguiente',async()=>{
 const win={matchMedia:(query:string)=>({matches:query.includes('540'),addEventListener(){},removeEventListener(){}})};
 Object.defineProperty(globalThis,'window',{configurable:true,value:win});
 try{
  const root=await mount(<Editor fields={sectionFields} defaults={{a:'Ana',b:'',c:''}} save={async()=>{}} cancelLabel={false}/>);
  const nav=root.findByProps({role:'group','aria-label':'Pasos del formulario'});
  assert.match(text(nav),/Paso 1 de 3/);
  assert.deepEqual(sections(root).map(entry=>Boolean(entry.props.hidden)),[false,true,true],'solo el paso activo es visible');
  assert.equal(button(nav,'Anterior').props.disabled,true);
  await act(async()=>button(nav,'Siguiente').props.onClick());
  assert.match(text(root.findByProps({role:'group','aria-label':'Pasos del formulario'})),/Paso 2 de 3/);
  assert.deepEqual(sections(root).map(entry=>Boolean(entry.props.hidden)),[true,false,true]);
  await act(async()=>button(root.findByProps({'aria-label':'Pasos del formulario'}),'Anterior').props.onClick());
  await submit(root);
  assert.match(text(root.findByProps({'aria-label':'Pasos del formulario'})),/Paso 2 de 3/,'un error salta al paso de la primera sección con error');
  await unmount();
  const two=await mount(<Editor fields={sectionFields.slice(0,2)} defaults={{a:'',b:''}} save={async()=>{}} cancelLabel={false}/>);
  assert.equal(two.findAllByProps({'aria-label':'Pasos del formulario'}).length,0,'con menos de 3 secciones no hay pasos');
  await unmount();
 }finally{Reflect.deleteProperty(globalThis,'window');}
});
