import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestInstance,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('Network forbidden: local component test only');};
const CloseContext=React.createContext<(()=>void)|undefined>(undefined);
const pendingStates:boolean[]=[];
const dialogPath=require.resolve('../app/dialog');
require.cache[dialogPath]={id:dialogPath,filename:dialogPath,loaded:true,exports:{
 FormActions:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDialogClose:()=>React.useContext(CloseContext),
 useDialogPending:(pending:boolean)=>{pendingStates.push(pending);},
}} as NodeModule;
const writes:{path:string;body:unknown;method:string}[]=[];
let rejectWrite=false,releaseWrite:(()=>void)|undefined;
const operationsPath=require.resolve('../app/operations');
require.cache[operationsPath]={id:operationsPath,filename:operationsPath,loaded:true,exports:{
 money:(value:number,currency:string)=>`${currency} ${value}`,
 api:async(path:string,body?:unknown,method='POST')=>{
  if(body===undefined)return path.endsWith('/clients')?{clients:[{id:'10',name:'Cliente de prueba'}]}:{records:[]};
  writes.push({path,body,method});await new Promise<void>(resolve=>{releaseWrite=resolve;});
  if(rejectWrite)throw new Error('No se pudo guardar la propuesta');
  return {};
 },
}} as NodeModule;
const controlsPath=require.resolve('../app/profile-controls');
require.cache[controlsPath]={id:controlsPath,filename:controlsPath,loaded:true,exports:{
 SelectCustom:({label,value,choices,onChange}:{label:string;value:string;choices:{value:string;label:string}[];onChange:(value:string)=>void})=><label>{label}<select value={value} onChange={e=>onChange(e.target.value)}>{choices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>,
 AmountInput:({value,onChange}:{value:string;onChange:(value:string)=>void})=><input value={value} onChange={e=>onChange(e.target.value)}/>,
}} as NodeModule;
const dndPath=require.resolve('@dnd-kit/core');
require.cache[dndPath]={id:dndPath,filename:dndPath,loaded:true,exports:{
 DndContext:({children}:{children:React.ReactNode})=><div>{children}</div>,
 useDraggable:()=>({setNodeRef(){},attributes:{},listeners:{},isDragging:false}),
 useDroppable:()=>({setNodeRef(){},isOver:false}),useSensor:()=>({}),useSensors:()=>[],PointerSensor(){},KeyboardSensor(){},
}} as NodeModule;
const {QuoteComposer}=require('../app/quote-composer') as typeof import('../app/quote-composer');
let renderer!:ReactTestRenderer;
function text(node:ReactTestInstance|string):string{return typeof node==='string'?node:node.children.map(text).join('');}
const button=(label:string)=>renderer.root.findAllByType('button').find(node=>text(node)===label)!;
const record={id:'20',title:'Propuesta de prueba',name:'Plan de prueba',client_id:'10',currency:'PYG',items:[{description:'Producción de prueba',quantity:1,unitPrice:'100000'}]};
async function run(){
 try{
  for(const mode of ['create','budget','plan'] as const){
   let closed=0,done=0,releaseDone:(()=>void)|undefined;
   await act(async()=>{renderer=create(<CloseContext.Provider value={()=>{closed++;}}><QuoteComposer mode={mode} record={record} done={async()=>{done++;await new Promise<void>(resolve=>{releaseDone=resolve;});}}/></CloseContext.Provider>);});
   assert.equal(button('Cancelar').props.type,'button');assert.equal(button('Cancelar').props.disabled,false);assert.equal(pendingStates.at(-1),false);
   let saving!:Promise<void>;
   await act(async()=>{saving=renderer.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
   assert.equal(pendingStates.at(-1),true);assert.equal(button('Guardando…').props.disabled,true);assert.equal(button('Cancelar').props.disabled,true);
   act(()=>button('Cancelar').props.onClick());assert.equal(closed,0,'cannot dismiss while saving');
   rejectWrite=true;
   await act(async()=>{releaseWrite!();await saving;});rejectWrite=false;
   assert.equal(done,0);assert.equal(pendingStates.at(-1),false);assert.equal(button('Cancelar').props.disabled,false);
   assert.match(text(renderer.root.findByProps({role:'alert'})),/No se pudo guardar la propuesta/);
   const titleInput=renderer.root.findAllByType('input').find(input=>input.props.name==='title')!;
   assert(titleInput,'failed submission retains the editable draft');
   await act(async()=>{saving=renderer.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
   await act(async()=>{releaseWrite!();});
   assert.equal(done,1);assert.equal(pendingStates.at(-1),true,'pending includes completion/refresh callback');
   assert.equal(button('Cancelar').props.disabled,true);
   await act(async()=>{releaseDone!();await saving;});
   assert.equal(pendingStates.at(-1),false);assert.equal(renderer.root.findAllByProps({role:'alert'}).length,0);
   const write=writes.at(-1)!;
   assert.equal(write.path,mode==='plan'?'/api/agency/plans/20':mode==='budget'?'/api/agency/budgets/20':'/api/agency/budgets');
   assert.equal(write.method,mode==='create'?'POST':'PATCH');
   assert.equal((write.body as {currency:string}).currency,'PYG');
   act(()=>button('Cancelar').props.onClick());assert.equal(closed,1);act(()=>renderer.unmount());
  }
  // A missing prerequisite produces a local error, not an indefinitely locked dialog.
  let closed=0;const before=writes.length;
  await act(async()=>{renderer=create(<CloseContext.Provider value={()=>{closed++;}}><QuoteComposer mode="create" record={{...record,client_id:''}} done={()=>assert.fail('invalid form completed')}/></CloseContext.Provider>);});
  await act(async()=>{await renderer.root.findByType('form').props.onSubmit({preventDefault(){},persist(){}});});
  assert.equal(writes.length,before);assert.match(text(renderer.root.findByProps({role:'alert'})),/Elegí un cliente/);
  assert.equal(pendingStates.at(-1),false);assert.equal(button('Cancelar').props.disabled,false);
  act(()=>button('Cancelar').props.onClick());assert.equal(closed,1);act(()=>renderer.unmount());
  console.log('PASS: QuoteComposer create/budget/plan real form validation and SaveActions; pending through API + completion, disabled cancellation, retained save error/draft, retry, idle missing-client dismissal. API, drag/portal controls mocked; no HTTP/browser.');
 }finally{globalThis.fetch=originalFetch;act(()=>renderer?.unmount());}
}
void run();
