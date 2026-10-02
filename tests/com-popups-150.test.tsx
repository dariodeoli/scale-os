import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

// Ronda de popups #150 (Presupuestos/Oportunidades): consulta antes de editar,
// guardado bloqueado con errores inline, condiciones del enlace público y el
// aviso legal de la oportunidad detrás de una ayuda desplegable.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
  Dialog:({title,children}:{title?:string;children:React.ReactNode})=><section role="dialog" aria-label={title}>{children}</section>,
  FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
  useDialogClose:()=>undefined,
  useDialogPending:()=>{},
  useOverlay:()=>({requestClose:()=>{}}),
}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
  DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
  useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
  useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
  pointerWithin:()=>[],rectIntersection:()=>[],
}} as NodeModule;

const {BudgetActions}=require('../app/suite') as typeof import('../app/suite');
const {QuoteComposer}=require('../app/quote-composer') as typeof import('../app/quote-composer');

type Pending={url:string;init:RequestInit;resolve:(response:Response)=>void};
let requests:Pending[]=[];
globalThis.fetch=(input,init={})=>new Promise<Response>(resolve=>{requests.push({url:String(input),init,resolve});});
const pending=()=>requests.shift()!;
const text=(node:ReactTestInstance|string):string=>typeof node==='string'?node:node.children.map(text).join('');
const buttonExact=(renderer:ReactTestRenderer,label:string)=>renderer.root.findAllByType('button').find(candidate=>text(candidate)===label)!;
const flush=async(data:unknown,status=200)=>{const request=pending();await act(async()=>{request.resolve(new Response(JSON.stringify(data),{status}));});};

const budget={id:'9',number:'P-2026-009',title:'Propuesta integral',client_name:'Cliente de prueba',status:'draft',currency:'PYG',subtotal:'1000000',total:'1100000',tax_rate:'0.1',valid_until:'2026-10-31',notes:'Incluye una ronda de cambios.',items:[{id:'1',description:'Video institucional',quantity:1,unit_price:'1000000',total:'1000000'}]};

test('presupuesto: consulta antes de editar y condiciones del enlace antes de habilitarlo',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<BudgetActions id="9" role="owner" refresh={async()=>{}}/>);});
 act(()=>{buttonExact(renderer,'Abrir presupuesto').props.onClick();});
 await flush({budget,items:budget.items});

 // 1) Primero se consulta: ítems y totales, sin editor completo montado.
 const consult=text(renderer.root);
 assert.match(consult,/Video institucional/,'la consulta muestra los ítems guardados');
 assert.match(consult,/Total · IVA incl\./,'la consulta muestra el total');
 assert.match(consult,/1\.000\.000/,'los montos salen del contrato real');
 const titleInputs=()=>renderer.root.findAll(node=>node.type==='input'&&node.props.name==='title');
 assert.equal(titleInputs().length,0,'abrir no monta el editor completo');
 assert.ok(buttonExact(renderer,'Editar presupuesto'),'la edición completa es una acción explícita');

 // 2) Enlace público: primero las condiciones (alcance, vencimiento y revocación).
 act(()=>{buttonExact(renderer,'Habilitar enlace público').props.onClick();});
 const terms=text(renderer.root);
 assert.match(terms,/Alcance\./,'explica el alcance antes de habilitar');
 assert.match(terms,/Vencimiento\./,'explica el vencimiento antes de habilitar');
 assert.match(terms,/Revocación\./,'explica la revocación antes de habilitar');
 assert.match(terms,/hasta el \d{2}-\w{3}/,'la vigencia sale del presupuesto');
 assert.equal(requests.filter(request=>request.url.endsWith('/share')).length,0,'no se habilita sin confirmar');
 await act(async()=>{buttonExact(renderer,'Habilitar enlace').props.onClick();});
 const share=pending();
 assert.equal(share.url,'/core-api/api/agency/budgets/9/share');
 assert.equal(share.init.method,'POST');
 await act(async()=>{share.resolve(new Response(JSON.stringify({url:'https://app.scaleparaguay.com/p/token-de-prueba-123456'}),{status:200}));});
 assert.match(text(renderer.root),/token-de-prueba-123456/,'el enlace queda visible al habilitarlo');

 // 3) La edición completa se monta recién con su acción y conserva los datos.
 act(()=>{buttonExact(renderer,'Editar presupuesto').props.onClick();});
 await act(async()=>{});
 assert.equal(requests.length,2,'el editor pide clientes y planes solo al abrirse');
 await flush({clients:[{id:'10',name:'Cliente de prueba'}]});
 await flush({records:[]});
 const title=titleInputs();
 assert.equal(title.length,1,'editar monta el compositor completo');
 assert.match(text(renderer.root),/Propuesta integral/,'el editor parte del presupuesto consultado');
 assert.match(text(renderer.root),/Opciones del documento/,'IVA, vigencia y secciones viven en el plegable');
 act(()=>renderer.unmount());
});

test('presupuesto vacío: guardado bloqueado, campos obligatorios y errores inline',async()=>{
 requests=[];let renderer!:ReactTestRenderer;
 await act(async()=>{renderer=create(<QuoteComposer mode="create" record={null} done={()=>{}}/>);});
 const copy=text(renderer.root);
 assert.match(copy,/Obligatorio/,'los campos requeridos se declaran');
 assert.match(copy,/Opciones del documento/,'las opciones del documento están plegadas');
 const save=buttonExact(renderer,'Guardar');
 assert.equal(save.props.disabled,true,'un presupuesto vacío no se puede guardar');
 assert.match(text(renderer.root.findByProps({role:'status'})),/Completá el título, el cliente y los ítems/,'el pie dice qué falta');
 const before=requests.length;
 await act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){}});});
 const alerts=renderer.root.findAllByProps({role:'alert'});
 assert.ok(alerts.length>=1,'el intento deja el error inline');
 assert.match(text(alerts[0]),/título/i);
 assert.equal(requests.length,before,'sin campos obligatorios no se escribe nada');
 act(()=>renderer.unmount());
});

test('oportunidad: los campos van antes del aviso y el detalle legal es desplegable',()=>{
 const pipeline=read('app/sections/pipeline.tsx');
 const editor=pipeline.indexOf('<Editor columns');
 const privacy=pipeline.indexOf('<AvisoPrivacidad');
 assert.ok(editor>=0&&privacy>editor,'los campos se priorizan sobre el aviso legal');
 assert.match(pipeline,/<details className="ops-profile-section">[\s\S]*Finalidad y tus derechos/,'el detalle legal vive en una ayuda desplegable');
 assert.match(pipeline,/href=\{PRIVACY_POLICY_URL\}[^>]*>Privacidad</,'el resumen de una línea enlaza la política');
 assert.match(pipeline,/PRIVACY_LEAD_FINALITY/,'la finalidad compartida sigue declarada');
 const suite=read('app/suite.tsx');
 assert.match(suite,/Alcance\./,'el enlace público declara el alcance');
 assert.match(suite,/Vencimiento\./,'el enlace público declara el vencimiento');
 assert.match(suite,/Revocación\./,'el enlace público declara la revocación');
});
